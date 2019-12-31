/**
 * @since 2019-10-30 03:01
 * @author vivaxy
 */
import crc32 from '../helpers/crc32';
import encodeIDAT from './encode-idat';
import Metadata from '../helpers/metadata';
import PNG_SIGNATURE from '../helpers/signature';
import { GAMMA_DIVISION } from '../helpers/gamma';
import { COLOR_TYPES } from '../helpers/color-types';
import { concatUInt8Array } from '../helpers/typed-array';

export default function encode(metadata: Metadata) {
  // Signature
  let typedArray = new Uint8Array(PNG_SIGNATURE);

  // Helpers
  function packUInt32BE(value: number) {
    return new Uint8Array([
      (value >> 24) & 0xff,
      (value >> 16) & 0xff,
      (value >> 8) & 0xff,
      value & 0xff,
    ]);
  }

  function packUInt16BE(value: number) {
    return new Uint8Array([(value >> 8) & 0xff, value & 0xff]);
  }

  function packUInt8(value: number) {
    return new Uint8Array([value]);
  }

  function packChunkName(name: string) {
    const data = new Uint8Array(name.length);
    for (let i = 0; i < name.length; i++) {
      data[i] = name.charCodeAt(i);
    }
    return data;
  }

  // Chunks
  const chunkPackers: {
    [chunkName: string]: () => Uint8Array;
  } = {
    IHDR: packIHDR,
    tIME: packTIME,
    zTXt: packZTXT,
    tEXt: packTEXT,
    iTXt: packITXT,
    sRGB: packSRGB,
    pHYs: packPHYS,
    sPLT: packSPLT,
    iCCP: packICCP,
    sBIT: packSBIT,
    gAMA: packGAMA,
    cHRM: packCHRM,
    PLTE: packPLTE,
    tRNS: packTRNS,
    hIST: packHIST,
    bKGD: packBKGD,
    IDAT: packIDAT,
    IEND: packIEND,
  };

  function packIHDR() {
    let data = new Uint8Array();
    data = concatUInt8Array(data, packUInt32BE(metadata.width));
    data = concatUInt8Array(data, packUInt32BE(metadata.height));
    data = concatUInt8Array(data, packUInt8(metadata.depth));
    data = concatUInt8Array(data, packUInt8(metadata.colorType));
    data = concatUInt8Array(data, packUInt8(metadata.compression));
    data = concatUInt8Array(data, packUInt8(metadata.filter));
    data = concatUInt8Array(data, packUInt8(metadata.interlace));
    return data;
  }

  function packPLTE() {
    const data = [];
    if (metadata.palette) {
      for (let i = 0; i < metadata.palette.length; i++) {
        const palette = metadata.palette[i];
        data.push(palette[0], palette[1], palette[2]);
      }
    }
    return new Uint8Array(data);
  }

  function packIDAT() {
    return encodeIDAT(
      metadata.data,
      metadata.width,
      metadata.height,
      metadata.colorType,
      metadata.depth,
      metadata.interlace,
      metadata.palette,
    );
  }

  function packIEND() {
    return new Uint8Array();
  }

  function packTRNS() {
    const data = [];
    if (metadata.colorType === COLOR_TYPES.PALETTE) {
      if (!metadata.palette) {
        throw new Error('Palette is required');
      }
      const { palette } = metadata;
      let transparent = false;
      for (let i = 0; i < palette.length; i++) {
        data.push(palette[i][3]);
        if (palette[i][3] !== 0xff) {
          transparent = true;
        }
      }
      if (!transparent) {
        return new Uint8Array();
      }
    }
    return new Uint8Array(data);
  }

  function packCHRM() {
    return new Uint8Array();
  }

  function packGAMA() {
    if (metadata.gamma !== undefined) {
      return packUInt32BE(metadata.gamma * GAMMA_DIVISION);
    }
    return new Uint8Array();
  }

  function packICCP() {
    return new Uint8Array();
  }

  function packSBIT() {
    if (metadata.significantBits) {
      if (metadata.colorType === COLOR_TYPES.GRAYSCALE) {
        return packUInt8(metadata.significantBits[0]);
      }
      if (
        metadata.colorType === COLOR_TYPES.TRUE_COLOR ||
        metadata.colorType === COLOR_TYPES.PALETTE
      ) {
        const data = new Uint8Array(3);
        for (let i = 0; i < 3; i++) {
          data[i] = metadata.significantBits[i];
        }
        return data;
      }
      if (metadata.colorType === COLOR_TYPES.GRAYSCALE_WITH_ALPHA) {
        return concatUInt8Array(
          packUInt8(metadata.significantBits[0]),
          packUInt8(metadata.significantBits[1]),
        );
      }
      if (metadata.colorType === COLOR_TYPES.TRUE_COLOR_WITH_ALPHA) {
        const data = new Uint8Array(4);
        for (let i = 0; i < 4; i++) {
          data[i] = metadata.significantBits[i];
        }
        return data;
      }
    }
    return new Uint8Array();
  }

  function packSRGB() {
    if (metadata.sRGB !== undefined) {
      return packUInt8(metadata.sRGB);
    }
    return new Uint8Array();
  }

  function packTEXT() {
    return new Uint8Array();
  }

  function packZTXT() {
    return new Uint8Array();
  }

  function packITXT() {
    return new Uint8Array();
  }
  function packBKGD() {
    return new Uint8Array();
  }
  function packHIST() {
    return new Uint8Array();
  }
  function packPHYS() {
    let data = new Uint8Array();
    if (metadata.physicalDimensions) {
      data = concatUInt8Array(
        data,
        packUInt32BE(metadata.physicalDimensions.pixelPerUnitX),
      );
      data = concatUInt8Array(
        data,
        packUInt32BE(metadata.physicalDimensions.pixelPerUnitY),
      );
      data = concatUInt8Array(
        data,
        packUInt8(metadata.physicalDimensions.unit),
      );
    }
    return data;
  }
  function packSPLT() {
    return new Uint8Array();
  }
  function packTIME() {
    if (!metadata.lastModificationTime) {
      return new Uint8Array();
    }
    const data = new Uint8Array(7);
    const date = new Date(metadata.lastModificationTime);
    const year = date.getUTCFullYear();
    data[0] = (year >> 8) & 0xff;
    data[1] = year & 0xff;
    data[2] = date.getUTCMonth() + 1;
    data[3] = date.getUTCDate();
    data[4] = date.getUTCHours();
    data[5] = date.getUTCMinutes();
    data[6] = date.getUTCSeconds();
    return data;
  }

  Object.keys(chunkPackers).forEach(function(chunkName) {
    const data = chunkPackers[chunkName]();
    if (data.length > 0 || chunkName === 'IEND') {
      const nameData = packChunkName(chunkName);
      const lengthData = packUInt32BE(data.length);
      const typeAndData = concatUInt8Array(nameData, data);
      const calculatedCrc32 = crc32(typeAndData);
      const endData = packUInt32BE(calculatedCrc32);

      const chunkData = concatUInt8Array(
        concatUInt8Array(lengthData, typeAndData),
        endData,
      );
      typedArray = concatUInt8Array(typedArray, chunkData);
    }
  });

  return typedArray;
}
