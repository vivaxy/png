/**
 * @since 2019-10-30 03:00
 * @author vivaxy
 */
import * as pako from 'pako';
import crc32 from '../helpers/crc32';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
enum COLOR_TYPES {
  GRAYSCALE = 0,
  TRUE_COLOR = 2,
  PALETTE = 3,
  GRAYSCALE_WITH_APLHA = 4 & GRAYSCALE,
  TRUE_COLOR_WITH_APLHA = 4 & TRUE_COLOR,
}
const COLOR_TYPE_TO_CHANNEL: {
  [colorType in COLOR_TYPES]: number;
} = {
  [COLOR_TYPES.GRAYSCALE]: 1,
  [COLOR_TYPES.TRUE_COLOR]: 3,
  [COLOR_TYPES.PALETTE]: 1,
  [COLOR_TYPES.GRAYSCALE_WITH_APLHA]: 2,
  [COLOR_TYPES.TRUE_COLOR_WITH_APLHA]: 4,
};
const FILTER_LENGTH = 1;
enum FILTER_TYPES {
  NONE = 0,
  SUB = 1,
  UP = 2,
  AVERAGE = 3,
  PAETH = 4,
}
const unfilters: {
  [filterType in FILTER_TYPES]?: (data: Uint8Array) => Uint8Array;
} = {
  [FILTER_TYPES.NONE](data: Uint8Array) {
    return data;
  },
};

function channelBuilder(unfilteredLine: Uint8Array, depth: number): number[] {
  const channels = [];
  if (depth === 1) {
    for (let i = 0; i < unfilteredLine.length; i++) {
      const uint8 = unfilteredLine[i];
      channels.push(
        (uint8 >> 7) & 1,
        (uint8 >> 6) & 1,
        (uint8 >> 5) & 1,
        (uint8 >> 4) & 1,
        (uint8 >> 3) & 1,
        (uint8 >> 2) & 1,
        (uint8 >> 1) & 1,
        uint8 & 1,
      );
    }
  } else if (depth === 2) {
    for (let i = 0; i < unfilteredLine.length; i++) {
      const uint8 = unfilteredLine[i];
      channels.push(
        (uint8 >> 6) & 3,
        (uint8 >> 4) & 3,
        (uint8 >> 2) & 3,
        uint8 & 3,
      );
    }
  } else if (depth === 4) {
    for (let i = 0; i < unfilteredLine.length; i++) {
      const uint8 = unfilteredLine[i];
      channels.push((uint8 >> 4) & 15, uint8 & 15);
    }
  } else if (depth === 8) {
    return Array.from(unfilteredLine);
  } else if (depth === 16) {
    throw new Error('Unsupported depth: ' + depth);
  } else {
    throw new Error('Unsupported depth: ' + depth);
  }

  return channels;
}

function concatUint8Array(a: Uint8Array, b: Uint8Array): Uint8Array {
  const concated = new Uint8Array(a.length + b.length);
  concated.set(a);
  concated.set(b, a.length);
  return concated;
}

export default function decode(arrayBuffer: ArrayBuffer) {
  const typedArray = new Uint8Array(arrayBuffer);
  let idatUint8Array = new Uint8Array([]);

  const metadata: {
    width: number;
    height: number;
    depth: number;
    colorType: COLOR_TYPES;
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
  const chunkHandlers: {
    [key: string]: (startIndex: number, length: number) => void;
  } = {
    IHDR: parseIHDR,
    PLTE: parsePLTE,
    IDAT: parseIDAT,
    IEND: parseIEND,
    tRNS: parseTRNS,
  };

  function parseIHDR(startIndex: number, length: number) {
    metadata.width = readUInt32BE();
    metadata.height = readUInt32BE();
    metadata.depth = readUInt8();
    const colorType = readUInt8(); // bits: 1 palette, 2 color, 4 alpha
    if (!(colorType in COLOR_TYPE_TO_CHANNEL)) {
      throw new Error('Unsupported color type: ' + colorType);
    }
    metadata.colorType = colorType as COLOR_TYPES;
    metadata.compression = readUInt8();
    metadata.filter = readUInt8();
    metadata.interlace = readUInt8();

    parseChunkEnd(startIndex, length);
  }

  function parsePLTE(startIndex: number, length: number) {
    for (let i = 0; i < length; i += 3) {
      metadata.palette.push([
        typedArray[index++],
        typedArray[index++],
        typedArray[index++],
        0xff, // default to intransparent
      ]);
    }

    parseChunkEnd(startIndex, length);
  }

  function parseIDAT(startIndex: number, length: number) {
    // save data, decode later
    idatUint8Array = concatUint8Array(
      idatUint8Array,
      typedArray.slice(index, index + length),
    );
    index += length;
    parseChunkEnd(startIndex, length);
  }

  function parseIEND(startIndex: number, length: number) {
    index += length;
    parseChunkEnd(startIndex, length);
  }

  function parseTRNS(startIndex: number, length: number) {
    for (let i = 0; i < length; i++) {
      metadata.palette[i][3] = typedArray[index];
      index++;
    }

    parseChunkEnd(startIndex, length);
  }

  function parseChunkBegin() {
    const startIndex = index;
    const length = readUInt32BE();
    const type = readChunkType();

    if (chunkHandlers[type]) {
      return chunkHandlers[type](startIndex, length);
    }

    const ancillary = Boolean(type.charCodeAt(0) & 0x20); // or critical
    if (!ancillary) {
      throw new Error('Unsupported critical chunk type: ' + type);
    }
    // Skip chunk
    index += length;
    parseChunkEnd(startIndex, length);
  }

  function parseChunkEnd(startIndex: number, length: number) {
    const fileCrc32 = readUInt32BE();
    const calculatedCrc32 = crc32(
      typedArray.slice(startIndex + 4, startIndex + 8 + length),
    );
    if (fileCrc32 !== calculatedCrc32) {
      throw new Error(
        'Crc32 error: calculated ' +
          calculatedCrc32 +
          ', expected ' +
          fileCrc32,
      );
    }
    if (index < typedArray.length) {
      parseChunkBegin();
    }
  }

  parseChunkBegin();

  // 3. Decode all IDAT
  // inflate
  const data = pako.inflate(idatUint8Array);

  // scanline
  const channel = COLOR_TYPE_TO_CHANNEL[metadata.colorType];
  const scanlineWidth =
    Math.ceil((metadata.width * channel * metadata.depth) / 8) + FILTER_LENGTH;

  let rowIndex = 0;
  while (rowIndex < data.length) {
    const scanline = data.slice(rowIndex, rowIndex + scanlineWidth);
    rowIndex += scanlineWidth;

    // unfilter
    const filterType = scanline[0] as FILTER_TYPES;
    if (!(filterType in unfilters)) {
      throw new Error('Unsupported filter type: ' + filterType);
    }
    const unfilter = unfilters[filterType];
    const unfilteredLine = unfilter!(scanline.slice(1));

    // to channel
    const channels = channelBuilder(unfilteredLine, metadata.depth);
    let channelIndex = 0;

    for (let pixelIndex = 0; pixelIndex < metadata.width; pixelIndex++) {
      const channelPerPixel = COLOR_TYPE_TO_CHANNEL[metadata.colorType];
      // to pixel
      const pixel = channels.slice(
        channelIndex,
        (channelIndex += channelPerPixel),
      );

      // to imageData
      if (metadata.colorType === COLOR_TYPES.TRUE_COLOR) {
        metadata.data = metadata.data.concat(pixel.concat(255));
      } else if (metadata.colorType === COLOR_TYPES.PALETTE) {
        metadata.data = metadata.data.concat(metadata.palette[pixel[0]]);
      } else {
        throw new Error('Unsupported color type: ' + metadata.colorType);
      }
    }
  }

  return {
    width: metadata.width,
    height: metadata.height,
    data: metadata.data,
  };
}
