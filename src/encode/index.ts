/**
 * @since 2019-10-30 03:01
 * @author vivaxy
 */
import crc32 from '../helpers/crc32';
import Metadata from '../helpers/metadata';
import PNG_SIGNATURE from '../helpers/signature';
import { concatUInt8Array } from '../helpers/typed-array';

export default function encode(metadata: Metadata) {
  // Signature
  let typedArray = new Uint8Array(PNG_SIGNATURE);

  // Helpers
  function packUInt32BE(value: number) {
    return new Uint8Array([
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    ]);
  }

  function packUInt8(value: number) {
    return new Uint8Array([value & 0xff]);
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
    PLTE: packPLTE,
    IDAT: packIDAT,
    IEND: packIEND,
  };

  function packIHDR() {
    let data = new Uint8Array();
    data = concatUInt8Array(data, packUInt32BE(metadata.width));
    data = concatUInt8Array(data, packUInt32BE(metadata.height));
    data = concatUInt8Array(data, packUInt32BE(metadata.height));
    data = concatUInt8Array(data, packUInt8(metadata.depth));
    data = concatUInt8Array(data, packUInt8(metadata.colorType));
    data = concatUInt8Array(data, packUInt8(metadata.compression));
    data = concatUInt8Array(data, packUInt8(metadata.filter));
    data = concatUInt8Array(data, packUInt8(metadata.interlace));
    return data;
  }

  function packPLTE() {
    let data = new Uint8Array();
    return data;
  }

  function packIDAT() {
    let data = new Uint8Array();
    return data;
  }

  function packIEND() {
    let data = new Uint8Array();
    return data;
  }

  Object.keys(chunkPackers).forEach(function(chunkName) {
    const nameData = packChunkName(chunkName);
    const data = chunkPackers[chunkName]();
    const lengthData = packUInt32BE(data.length);
    const lengthAndData = concatUInt8Array(lengthData, data);
    const calculatedCrc32 = crc32(lengthAndData);
    const endData = packUInt32BE(calculatedCrc32);

    const chunkData = concatUInt8Array(
      concatUInt8Array(nameData, lengthAndData),
      endData,
    );
    typedArray = concatUInt8Array(typedArray, chunkData);
  });

  return typedArray;
}
