/**
 * @since 2019-10-30 03:00
 * @author vivaxy
 */
const CHUNK_TYPES = {
  TYPE_IHDR: 0x49484452,
  TYPE_IEND: 0x49454e44,
  TYPE_IDAT: 0x49444154,
  TYPE_PLTE: 0x504c5445,
  TYPE_tRNS: 0x74524e53,
  TYPE_gAMA: 0x67414d41,
};
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export default function decode(arrayBuffer: ArrayBuffer) {
  const typedArray = new Uint8Array(arrayBuffer);

  // Helpers
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

  let index = 0;
  // 1. Signature
  for (; index < PNG_SIGNATURE.length; index++) {
    if (typedArray[index] !== PNG_SIGNATURE[index]) {
      throw new Error(
        `Invalid file signature, at position ${index}: ${typedArray[index]} !== ${PNG_SIGNATURE[index]}`,
      );
    }
  }

  // 2. Chunks
  let hasIHDR = false;
  let hasIEND = false;
  const chunkHandlers = {
    [CHUNK_TYPES.TYPE_IHDR]: handleIHDR,
    [CHUNK_TYPES.TYPE_IDAT]: handleIDAT,
  };

  function handleIHDR(length: number) {
    const width = readUInt32BE();
    const height = readUInt32BE();
    const depth = readUInt8();
    const colorType = readUInt8(); // bits: 1 palette, 2 color, 4 alpha
    const compr = readUInt8();
    const filter = readUInt8();
    const interlace = readUInt8();

    parseChunkEnd();
  }

  function handleIDAT() {}

  function parseChunkBegin() {
    const length = readUInt32BE();
    const type = readUInt32BE();
    if (chunkHandlers[type]) {
      return chunkHandlers[type](length);
    }
    throw new Error('Unexpected chunk type: ' + type + ', index: ' + index);
  }

  function parseChunkEnd() {
    readUInt32BE();
    parseChunkBegin();
  }

  parseChunkBegin();
}
