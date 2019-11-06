/**
 * @since 2019-10-30 05:14
 * @author vivaxy
 */
const crcTable: number[] = [];

for (let i = 0; i < 256; i++) {
  let currentCrc = i;
  for (let j = 0; j < 8; j++) {
    if (currentCrc & 1) {
      currentCrc = 0xedb88320 ^ (currentCrc >>> 1);
    } else {
      currentCrc = currentCrc >>> 1;
    }
  }
  crcTable[i] = currentCrc;
}

export default function crc32(buf: Uint8Array) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
}
