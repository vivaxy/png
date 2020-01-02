/**
 * @since 2019-10-30 03:00
 * @author vivaxy
 */
import * as pako from 'pako';

import crc32 from '../helpers/crc32';
import decodeIDAT from './decode-idat';
import Metadata from '../helpers/metadata';
import PNG_SIGNATURE from '../helpers/signature';
import { GAMMA_DIVISION } from '../helpers/gamma';
import { COLOR_TYPES } from '../helpers/color-types';
import rescaleSample from '../helpers/rescale-sample';
import { decode as decodeUTF8 } from '../helpers/utf8';
import { concatUInt8Array } from '../helpers/typed-array';
import { CHROMATICITIES_DIVISION } from '../helpers/chromaticities';

export default function decode(arrayBuffer: ArrayBuffer) {
  const typedArray = new Uint8Array(arrayBuffer);
  let idatUint8Array = new Uint8Array();

  const metadata: Metadata = {
    width: 0,
    height: 0,
    depth: 0,
    colorType: 0,
    compression: 0,
    interlace: 0,
    filter: 0,
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

  function readUInt16BE() {
    return (typedArray[index++] << 8) | typedArray[index++];
  }

  function readUInt8() {
    return typedArray[index++];
  }

  function readBytesBeforeNull() {
    const results = [];
    let byte: number = 0;
    while ((byte = typedArray[index++]) !== 0) {
      results.push(byte);
    }
    return new Uint8Array(results);
  }

  function readStringBeforeNull(maxLength: number) {
    const maxIndex = index + maxLength;
    let result = '';
    while (index < maxIndex) {
      const byte = readUInt8();
      if (byte === 0) {
        break;
      }
      result += String.fromCharCode(byte);
    }
    return result;
  }

  function readStringBeforeEnd(endIndex: number) {
    let result = '';
    while (index < endIndex) {
      const byte = readUInt8();
      result += String.fromCharCode(byte);
    }
    return result;
  }

  function readCompressedData(endIndex: number) {
    const compressedData = typedArray.slice(index, endIndex);
    index = endIndex;
    return pako.inflate(compressedData);
  }

  function readChunkType() {
    let name = '';
    for (const end = index + 4; index < end; index++) {
      name += String.fromCharCode(typedArray[index]);
    }
    return name;
  }

  // Signature
  for (; index < PNG_SIGNATURE.length; index++) {
    if (typedArray[index] !== PNG_SIGNATURE[index]) {
      throw new Error(
        `Invalid file signature, at position ${index}: ${typedArray[index]} !== ${PNG_SIGNATURE[index]}`,
      );
    }
  }

  // Chunks
  const chunkHandlers: {
    [key: string]: (length: number) => void;
  } = {
    IHDR: parseIHDR,
    PLTE: parsePLTE,
    IDAT: parseIDAT,
    IEND: parseIEND,
    tRNS: parseTRNS,
    cHRM: parseCHRM,
    gAMA: parseGAMA,
    iCCP: parseICCP,
    sBIT: parseSBIT,
    sRGB: parseSRGB,
    tEXt: parseTEXT,
    zTXt: parseZTXT,
    iTXt: parseITXT,
    bKGD: parseBKGD,
    hIST: parseHIST,
    pHYs: parsePHYS,
    sPLT: parseSPLT,
    tIME: parseTIME,
  };

  function parseIHDR() {
    metadata.width = readUInt32BE();
    metadata.height = readUInt32BE();
    metadata.depth = readUInt8();
    const colorType = readUInt8(); // bits: 1 palette, 2 color, 4 alpha
    if (!(colorType in COLOR_TYPES)) {
      throw new Error('Unsupported color type: ' + colorType);
    }
    metadata.colorType = colorType;
    metadata.compression = readUInt8();
    metadata.filter = readUInt8();
    metadata.interlace = readUInt8();
  }

  function parsePLTE(length: number) {
    const palette: [number, number, number, number][] = [];
    for (let i = 0; i < length; i += 3) {
      palette.push([
        typedArray[index++],
        typedArray[index++],
        typedArray[index++],
        0xff, // default to opaque
      ]);
    }
    metadata.palette = palette;
  }

  function parseIDAT(length: number) {
    // save data, decode later
    idatUint8Array = concatUInt8Array(
      idatUint8Array,
      typedArray.slice(index, index + length),
    );
    index += length;
  }

  function parseIEND(length: number) {
    index += length;
  }

  function parseTRNS(length: number) {
    if (metadata.colorType === COLOR_TYPES.GRAYSCALE) {
      const color = rescaleSample(
        (typedArray[index++] << 8) | typedArray[index++],
        metadata.depth,
        8,
      );
      metadata.transparent = [color, color, color, 0xff];
    } else if (metadata.colorType === COLOR_TYPES.TRUE_COLOR) {
      metadata.transparent = [
        rescaleSample(
          (typedArray[index++] << 8) | typedArray[index++],
          metadata.depth,
          8,
        ),
        rescaleSample(
          (typedArray[index++] << 8) | typedArray[index++],
          metadata.depth,
          8,
        ),
        rescaleSample(
          (typedArray[index++] << 8) | typedArray[index++],
          metadata.depth,
          8,
        ),
        0xff,
      ];
    } else if (metadata.colorType === COLOR_TYPES.PALETTE) {
      if (!metadata.palette) {
        throw new Error('Missing chunk: PLTE');
      }
      for (let i = 0; i < length; i++) {
        metadata.palette[i][3] = typedArray[index++];
      }
    } else {
      // throw new Error('Prohibited tRNS for colorType ' + metadata.colorType);
    }
  }

  function parseCHRM() {
    metadata.chromaticities = {
      white: {
        x: readUInt32BE() / CHROMATICITIES_DIVISION,
        y: readUInt32BE() / CHROMATICITIES_DIVISION,
      },
      red: {
        x: readUInt32BE() / CHROMATICITIES_DIVISION,
        y: readUInt32BE() / CHROMATICITIES_DIVISION,
      },
      green: {
        x: readUInt32BE() / CHROMATICITIES_DIVISION,
        y: readUInt32BE() / CHROMATICITIES_DIVISION,
      },
      blue: {
        x: readUInt32BE() / CHROMATICITIES_DIVISION,
        y: readUInt32BE() / CHROMATICITIES_DIVISION,
      },
    };
  }

  function parseGAMA() {
    metadata.gamma = readUInt32BE() / GAMMA_DIVISION;
  }

  function parseICCP(length: number) {
    const endIndex = index + length;
    const profileName = readStringBeforeNull(80);
    const compressionMethod = readUInt8();
    if (compressionMethod !== 0) {
      // throw new Error(
      //   'Unsupported iCCP compression method: ' + compressionMethod,
      // );
    }
    const profile = readCompressedData(endIndex);
    metadata.icc = {
      name: profileName,
      profile: Array.from(profile),
    };
  }

  function parseSBIT() {
    if (metadata.colorType === COLOR_TYPES.GRAYSCALE) {
      const sBit = readUInt8();
      metadata.significantBits = [sBit, sBit, sBit, metadata.depth];
    } else if (
      metadata.colorType === COLOR_TYPES.TRUE_COLOR ||
      metadata.colorType === COLOR_TYPES.PALETTE
    ) {
      metadata.significantBits = [
        readUInt8(),
        readUInt8(),
        readUInt8(),
        metadata.depth,
      ];
    } else if (metadata.colorType === COLOR_TYPES.GRAYSCALE_WITH_ALPHA) {
      const sBit = readUInt8();
      metadata.significantBits = [sBit, sBit, sBit, readUInt8()];
    } else if (metadata.colorType === COLOR_TYPES.TRUE_COLOR_WITH_ALPHA) {
      metadata.significantBits = [
        readUInt8(),
        readUInt8(),
        readUInt8(),
        readUInt8(),
      ];
    }
  }

  function parseSRGB() {
    metadata.sRGB = readUInt8();
  }

  function parseTEXT(length: number) {
    const endIndex = index + length;
    const keyword = readStringBeforeNull(80);
    const value = readStringBeforeEnd(endIndex);
    if (!metadata.text) {
      metadata.text = {};
    }
    metadata.text[keyword] = value;
  }

  function parseZTXT(length: number) {
    const endIndex = index + length;
    const keyword = readStringBeforeNull(80);
    const compressionMethod = readUInt8();
    if (compressionMethod !== 0) {
      // throw new Error(
      //   'Unsupported zTXt compression method: ' + compressionMethod,
      // );
    }
    const data = readCompressedData(endIndex);
    let value = '';
    for (let i = 0; i < data.length; i++) {
      value += String.fromCharCode(data[i]);
    }
    if (!metadata.compressedText) {
      metadata.compressedText = {};
    }
    metadata.compressedText[keyword] = value;
  }

  function parseITXT(length: number) {
    const endIndex = index + length;
    const keyword = readStringBeforeNull(80);
    const compressionFlag = readUInt8();
    const compressionMethod = readUInt8();
    const languageTag = readStringBeforeNull(Infinity);
    const translatedKeyword = decodeUTF8(readBytesBeforeNull());
    let text = '';
    if (compressionFlag === 0) {
      text = decodeUTF8(typedArray.slice(index, endIndex));
      index = endIndex;
    } else {
      if (compressionMethod !== 0) {
        // throw new Error(
        //   'Unsupported iTXt compression method: ' + compressionMethod,
        // );
      }
      const data = readCompressedData(endIndex);
      text = decodeUTF8(data);
    }
    if (!metadata.internationalText) {
      metadata.internationalText = {};
    }
    metadata.internationalText[keyword] = {
      languageTag,
      translatedKeyword,
      text,
    };
  }

  function parseBKGD() {
    if ((metadata.colorType & 3) === COLOR_TYPES.GRAYSCALE) {
      const color = rescaleSample(
        (typedArray[index++] << 8) | typedArray[index++],
        metadata.depth,
        8,
      );
      metadata.background = [color, color, color, 0xff];
    } else if ((metadata.colorType & 3) === COLOR_TYPES.TRUE_COLOR) {
      metadata.background = [
        rescaleSample(
          (typedArray[index++] << 8) | typedArray[index++],
          metadata.depth,
          8,
        ),
        rescaleSample(
          (typedArray[index++] << 8) | typedArray[index++],
          metadata.depth,
          8,
        ),
        rescaleSample(
          (typedArray[index++] << 8) | typedArray[index++],
          metadata.depth,
          8,
        ),
        0xff,
      ];
    } else if (metadata.colorType === COLOR_TYPES.PALETTE) {
      if (!metadata.palette) {
        throw new Error('Missing chunk: PLTE');
      }
      metadata.background = metadata.palette[typedArray[index++]];
    }
  }

  function parseHIST(length: number) {
    const endIndex = index + length;
    const histogram = [];
    while (index < endIndex) {
      histogram.push(readUInt16BE());
    }
    metadata.histogram = histogram;
  }

  function parsePHYS() {
    const pixelPerUnitX = readUInt32BE();
    const pixelPerUnitY = readUInt32BE();
    const unit = readUInt8();
    metadata.physicalDimensions = {
      pixelPerUnitX,
      pixelPerUnitY,
      unit,
    };
  }

  function parseSPLT(length: number) {
    const endIndex = index + length;
    const name = readStringBeforeNull(80);
    const depth = readUInt8();
    const palette: [number, number, number, number, number][] = [];
    if (depth === 8) {
      while (index < endIndex) {
        palette.push([
          readUInt8(),
          readUInt8(),
          readUInt8(),
          readUInt8(),
          readUInt16BE(),
        ]);
      }
    } else if (depth === 16) {
      while (index < endIndex) {
        palette.push([
          readUInt16BE(),
          readUInt16BE(),
          readUInt16BE(),
          readUInt16BE(),
          readUInt16BE(),
        ]);
      }
    } else {
      // throw new Error('Unsupported sPLT depth: ' + depth);
    }
    metadata.suggestedPalette = {
      name,
      depth,
      palette: palette,
    };
  }

  function parseTIME() {
    const year = readUInt16BE();
    const month = readUInt8();
    const day = readUInt8();
    const hour = readUInt8();
    const minute = readUInt8();
    const second = readUInt8();
    metadata.lastModificationTime = Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
    );
  }

  function parseChunkBegin() {
    const startIndex = index;
    const length = readUInt32BE();
    const type = readChunkType();

    if (chunkHandlers[type]) {
      chunkHandlers[type](length);
    } else {
      const ancillary = Boolean(type.charCodeAt(0) & 0x20); // or critical
      if (!ancillary) {
        // throw new Error('Unsupported critical chunk type: ' + type);
      }
      // Skip chunk
      index += length;
    }

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

  // Decode all IDAT
  metadata.data = decodeIDAT(
    idatUint8Array,
    metadata.interlace,
    metadata.colorType,
    metadata.width,
    metadata.height,
    metadata.depth,
    metadata.palette,
    metadata.transparent,
  );

  return metadata;
}
