/**
 * @since 2019-10-30 03:00
 * @author vivaxy
 */
import * as pako from 'pako';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
type COLOR_TYPES = 0 | 2 | 3 | 4 | 6;
const COLOR_TYPE_TO_CHANNEL = {
  0: 1,
  2: 3,
  3: 1,
  4: 2,
  6: 4,
};

export default function decode(arrayBuffer: ArrayBuffer) {
  const typedArray = new Uint8Array(arrayBuffer);

  const metadata: {
    width: number;
    height: number;
    depth: number;
    colorType: COLOR_TYPES;
    compression: number;
    interlace: number;
    filter: number;
    palette: [number, number, number, number][];
  } = {
    width: 0,
    height: 0,
    depth: 0,
    colorType: 0,
    compression: 0,
    interlace: 0,
    filter: 0,
    palette: [],
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
      throw new Error('Unsupported color type');
    }
    metadata.colorType = colorType as COLOR_TYPES;
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
        0xff,
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

    const scanlineWidth =
      Math.ceil(
        (metadata.width * COLOR_TYPE_TO_CHANNEL[metadata.colorType]) /
          (8 / metadata.depth),
      ) + 1;

    let i = 0;
    while (i < data.length) {
      const scanline = data.slice(i, i + scanlineWidth);
      i += scanlineWidth;
      console.log('scanline', scanline);
    }

    // unfilter
    const filter = {
      0(data: number) {
        return data;
      },
    };
    const type = data[0];
    // return filter[type](data[1]);

    console.log('metadata', metadata);
  }

  function parseChunkBegin() {
    const length = readUInt32BE();
    const type = readChunkType();

    console.log(
      'type',
      type,
      'length',
      length,
      'data',
      typedArray.slice(index, index + length),
      'index',
      index,
    );

    if (chunkHandlers[type]) {
      return chunkHandlers[type](length);
    }

    const ancillary = Boolean(type.charCodeAt(0) & 0x20); // or critical
    if (!ancillary) {
      throw new Error('Unsupported critical chunk type ' + type);
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
}
