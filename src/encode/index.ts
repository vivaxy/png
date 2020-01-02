/**
 * @since 2019-10-30 03:01
 * @author vivaxy
 */
import * as pako from 'pako';
import crc32 from '../helpers/crc32';
import encodeIDAT from './encode-idat';
import Metadata from '../helpers/metadata';
import PNG_SIGNATURE from '../helpers/signature';
import { GAMMA_DIVISION } from '../helpers/gamma';
import { COLOR_TYPES } from '../helpers/color-types';
import rescaleSample from '../helpers/rescale-sample';
import { encode as encodeUTF8 } from '../helpers/utf8';
import { concatUInt8Array } from '../helpers/typed-array';
import { CHROMATICITIES_DIVISION } from '../helpers/chromaticities';

const NULL_SEPARATOR = 0;
const COMPRESSION_METHOD = 0;

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
    return new Uint8Array([value & 0xff]);
  }

  function packString(name: string) {
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
    if (metadata.colorType === COLOR_TYPES.GRAYSCALE) {
      if (metadata.transparent) {
        const color = rescaleSample(metadata.transparent[0], 8, metadata.depth);
        data.push((color >> 8) & 0xff, color & 0xff);
      }
    } else if (metadata.colorType === COLOR_TYPES.TRUE_COLOR) {
      if (metadata.transparent) {
        for (let i = 0; i < 3; i++) {
          const color = rescaleSample(
            metadata.transparent[i],
            8,
            metadata.depth,
          );
          data.push((color >> 8) & 0xff, color & 0xff);
        }
      }
    } else if (metadata.colorType === COLOR_TYPES.PALETTE) {
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
    if (!metadata.chromaticities) {
      return new Uint8Array();
    }
    const { chromaticities } = metadata;
    let data = new Uint8Array();
    ([
      'white',
      'red',
      'green',
      'blue',
    ] as (keyof typeof chromaticities)[]).forEach(function(color) {
      (['x', 'y'] as (keyof typeof chromaticities[typeof color])[]).forEach(
        function(axis) {
          data = concatUInt8Array(
            data,
            packUInt32BE(
              chromaticities[color]![axis] * CHROMATICITIES_DIVISION,
            ),
          );
        },
      );
    });
    return data;
  }

  function packGAMA() {
    if (metadata.gamma !== undefined) {
      return packUInt32BE(metadata.gamma * GAMMA_DIVISION);
    }
    return new Uint8Array();
  }

  function packICCP() {
    if (!metadata.icc) {
      return new Uint8Array();
    }
    let data = packString(metadata.icc.name);
    data = concatUInt8Array(data, packUInt8(NULL_SEPARATOR));
    data = concatUInt8Array(data, packUInt8(COMPRESSION_METHOD));
    data = concatUInt8Array(data, pako.deflate(metadata.icc.profile));
    return data;
  }

  function packSBIT() {
    if (!metadata.significantBits) {
      return new Uint8Array();
    }
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
        packUInt8(metadata.significantBits[3]),
      );
    }
    if (metadata.colorType === COLOR_TYPES.TRUE_COLOR_WITH_ALPHA) {
      const data = new Uint8Array(4);
      for (let i = 0; i < 4; i++) {
        data[i] = metadata.significantBits[i];
      }
      return data;
    }
    return new Uint8Array();
  }

  function packSRGB() {
    if (metadata.sRGB !== undefined) {
      return packUInt8(metadata.sRGB);
    }
    return new Uint8Array();
  }

  function packBKGD() {
    if (!metadata.background) {
      return new Uint8Array();
    }
    if ((metadata.colorType & 3) === COLOR_TYPES.GRAYSCALE) {
      const color = rescaleSample(metadata.background[0], 8, metadata.depth);
      return packUInt16BE(color);
    }
    if ((metadata.colorType & 3) === COLOR_TYPES.TRUE_COLOR) {
      const data = new Uint8Array(6);
      for (let i = 0; i < 3; i++) {
        const color = rescaleSample(metadata.background[i], 8, metadata.depth);
        data[i * 2] = (color >> 8) & 0xff;
        data[i * 2 + 1] = color & 0xff;
      }
      return data;
    } else if (metadata.colorType === COLOR_TYPES.PALETTE) {
      if (!metadata.palette) {
        throw new Error('Missing chunk: PLTE');
      }
      let index = -1;
      for (
        let paletteIndex = 0;
        paletteIndex < metadata.palette.length;
        paletteIndex++
      ) {
        for (let i = 0; i < 4; i++) {
          if (metadata.palette[paletteIndex][i] === metadata.background[i]) {
            index = paletteIndex;
            break;
          }
        }
      }
      if (index === -1) {
        throw new Error('Background not in palette');
      }
      return packUInt8(index);
    }

    return new Uint8Array();
  }

  function packHIST() {
    const data = [];
    if (metadata.histogram) {
      metadata.histogram.forEach(function(value) {
        data.push((value >> 8) & 0xff, value & 0xff);
      });
    }
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
    if (!metadata.suggestedPalette) {
      return new Uint8Array();
    }
    let data = concatUInt8Array(
      packString(metadata.suggestedPalette.name),
      packUInt8(NULL_SEPARATOR),
    );
    data = concatUInt8Array(data, packUInt8(metadata.suggestedPalette.depth));
    for (let i = 0; i < metadata.suggestedPalette.palette.length; i++) {
      const palette = metadata.suggestedPalette.palette[i];
      if (metadata.suggestedPalette.depth === 8) {
        const paletteData = new Uint8Array([
          palette[0],
          palette[1],
          palette[2],
          palette[3],
          (palette[4] >> 8) & 0xff,
          palette[4] & 0xff,
        ]);
        data = concatUInt8Array(data, paletteData);
      } else if (metadata.suggestedPalette.depth === 16) {
        const paletteData = new Uint8Array(10);
        for (let i = 0; i < 5; i++) {
          paletteData[i * 2] = (palette[i] >> 8) & 0xff;
          paletteData[i * 2 + 1] = palette[i] & 0xff;
        }
        data = concatUInt8Array(data, paletteData);
      } else {
        // throw new Error('Unsupported sPLT depth: ' + depth);
      }
    }
    return data;
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

  function addChunk(chunkName: string, data: Uint8Array) {
    const nameData = packString(chunkName);
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

  // tEXt
  if (metadata.text) {
    Object.keys(metadata.text).forEach(function(keyword) {
      let data = concatUInt8Array(
        packString(keyword),
        packUInt8(NULL_SEPARATOR),
      );
      data = concatUInt8Array(data, packString(metadata.text![keyword]));
      addChunk('tEXt', data);
    });
  }

  // zTXt
  if (metadata.compressedText) {
    Object.keys(metadata.compressedText).forEach(function(keyword) {
      let data = concatUInt8Array(
        packString(keyword),
        packUInt8(NULL_SEPARATOR),
      );
      data = concatUInt8Array(data, packUInt8(COMPRESSION_METHOD));
      data = concatUInt8Array(
        data,
        pako.deflate(packString(metadata.compressedText![keyword])),
      );
      addChunk('zTXt', data);
    });
  }

  // iTXt
  if (metadata.internationalText) {
    Object.keys(metadata.internationalText).forEach(function(keyword) {
      const {
        languageTag,
        translatedKeyword,
        text,
      } = metadata.internationalText![keyword];

      const textData = encodeUTF8(text);
      const compressedTextData = pako.deflate(textData);
      const compressionFlag =
        compressedTextData.length < textData.length ? 1 : 0;

      let data = concatUInt8Array(
        packString(keyword),
        packUInt8(NULL_SEPARATOR),
      );
      data = concatUInt8Array(data, packUInt8(compressionFlag));
      data = concatUInt8Array(data, packUInt8(COMPRESSION_METHOD));
      data = concatUInt8Array(data, packString(languageTag));
      data = concatUInt8Array(data, packUInt8(NULL_SEPARATOR));
      data = concatUInt8Array(data, encodeUTF8(translatedKeyword));
      data = concatUInt8Array(data, packUInt8(NULL_SEPARATOR));
      data = concatUInt8Array(
        data,
        compressionFlag ? compressedTextData : textData,
      );

      addChunk('iTXt', data);
    });
  }

  // Other Chunks
  Object.keys(chunkPackers).forEach(function(chunkName) {
    const data = chunkPackers[chunkName]();
    if (data.length > 0 || chunkName === 'IEND') {
      addChunk(chunkName, data);
    }
  });

  return typedArray;
}
