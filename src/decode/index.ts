/**
 * @since 2019-10-30 03:00
 * @author vivaxy
 */
import * as pako from 'pako';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
type ColorTypes = 0 | 2 | 3 | 4 | 6;
const COLOR_TYPE_TO_CHANNEL = {
  0: 1,
  2: 3,
  3: 1,
  4: 2,
  6: 4,
};
const FILTER_LENGTH = 1;
type FilterTypes = 0 | 1 | 2 | 3 | 4;
const unfilters: {
  [filterType in FilterTypes]?: (data: Uint8Array) => Uint8Array;
} = {
  0(data: Uint8Array) {
    return data;
  },
};

function channelBuilder(unfilteredLine: Uint8Array, depth: number): number[] {
  if (depth === 2) {
    const channels = [];
    for (let i = 0; i < unfilteredLine.length; i++) {
      const uint8 = unfilteredLine[i];
      channels.push(
        (uint8 >> 6) & 3,
        (uint8 >> 4) & 3,
        (uint8 >> 2) & 3,
        uint8 & 3,
      );
    }
    return channels;
  }
  throw new Error('Unsupported depth: ' + depth);
}

export default function decode(arrayBuffer: ArrayBuffer) {
  const typedArray = new Uint8Array(arrayBuffer);

  const metadata: {
    width: number;
    height: number;
    depth: number;
    colorType: ColorTypes;
    compression: number;
    interlace: number;
    filter: number;
    palette: [number, number, number, number][];
    data: number[];
  } = {
    width: 0,
    height: 0,
    depth: 0,
    colorType: 0,
    compression: 0,
    interlace: 0,
    filter: 0,
    palette: [],
    data: [],
  };

  // Helpers
  let index = 0;
  function readUInt32BE() {
    return (
      (typedArray[index++] << 24) |
      (typedArray[index++] << 16) |
      (typedArray[index++] << 8) |
      typedArray[index++]
    );
  }

  function readUInt8() {
    return typedArray[index++];
  }

  function readChunkType() {
    let name = '';
    for (const end = index + 4; index < end; index++) {
      name += String.fromCharCode(typedArray[index]);
    }
    return name;
  }

  // 1. Signature
  for (; index < PNG_SIGNATURE.length; index++) {
    if (typedArray[index] !== PNG_SIGNATURE[index]) {
      throw new Error(
        `Invalid file signature, at position ${index}: ${typedArray[index]} !== ${PNG_SIGNATURE[index]}`,
      );
    }
  }

  // 2. Chunks
  const chunkHandlers: { [key: string]: (l: number) => void } = {
    IHDR: parseIHDR,
    PLTE: parsePLTE,
    IDAT: parseIDAT,
    tRNS: parseTRNS,
  };

  function parseIHDR() {
    metadata.width = readUInt32BE();
    metadata.height = readUInt32BE();
    metadata.depth = readUInt8();
    const colorType = readUInt8(); // bits: 1 palette, 2 color, 4 alpha
    if (!(colorType in COLOR_TYPE_TO_CHANNEL)) {
      throw new Error('Unsupported color type: ' + colorType);
    }
    metadata.colorType = colorType as ColorTypes;
    metadata.compression = readUInt8();
    metadata.filter = readUInt8();
    metadata.interlace = readUInt8();

    parseChunkEnd();
  }

  function parsePLTE(length: number) {
    for (let i = 0; i < length; i += 3) {
      metadata.palette.push([
        typedArray[index++],
        typedArray[index++],
        typedArray[index++],
        0xff, // default to intransparent
      ]);
    }

    parseChunkEnd();
  }

  function parseTRNS(length: number) {
    for (let i = 0; i < length; i++) {
      metadata.palette[i][3] = typedArray[index];
      index++;
    }

    parseChunkEnd();
  }

  function parseIDAT(length: number) {
    // inflate
    const data = pako.inflate(typedArray.slice(index, index + length));
    index += length;

    // scanline
    const channel = COLOR_TYPE_TO_CHANNEL[metadata.colorType];
    const scanlineWidth =
      Math.ceil((metadata.width * channel * metadata.depth) / 8) +
      FILTER_LENGTH;

    let rowIndex = 0;
    while (rowIndex < data.length) {
      const scanline = data.slice(rowIndex, rowIndex + scanlineWidth);
      rowIndex += scanlineWidth;

      // unfilter
      const filterType = scanline[0] as FilterTypes;
      if (!(filterType in unfilters)) {
        throw new Error('Unsupported filter type: ' + filterType);
      }
      const unfilter = unfilters[filterType];
      const unfilteredLine = unfilter!(scanline.slice(1));

      // to channel
      const channels = channelBuilder(unfilteredLine, metadata.depth);
      let channelIndex = 0;

      for (let pixelIndex = 0; pixelIndex < metadata.width; pixelIndex++) {
        // to pixel
        const pixel = channels.slice(
          channelIndex,
          channelIndex + COLOR_TYPE_TO_CHANNEL[metadata.colorType],
        );
        channelIndex += COLOR_TYPE_TO_CHANNEL[metadata.colorType];

        // to imageData
        if (metadata.colorType === 3) {
          metadata.data = metadata.data.concat(metadata.palette[pixel[0]]);
        } else {
          throw new Error('Unsupported color type: ' + metadata.colorType);
        }
      }
    }
  }

  function parseChunkBegin() {
    const length = readUInt32BE();
    const type = readChunkType();

    if (chunkHandlers[type]) {
      return chunkHandlers[type](length);
    }

    const ancillary = Boolean(type.charCodeAt(0) & 0x20); // or critical
    if (!ancillary) {
      throw new Error('Unsupported critical chunk type: ' + type);
    }
    // Skip chunk
    index += length;
    parseChunkEnd();
  }

  function parseChunkEnd() {
    index += 4;
    parseChunkBegin();
  }

  parseChunkBegin();

  return metadata;
}
