/**
 * @since 2019-10-30 03:00
 * @author vivaxy
 */
export default function decode(arrayBuffer: ArrayBuffer) {
  const typedArray = new Uint8Array(arrayBuffer);
  let i = 0;
  // 1. Signature
  const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (; i < PNG_SIGNATURE.length; i++) {
    if (typedArray[i] !== PNG_SIGNATURE[i]) {
      throw new Error(
        `Invalid file signature, at position ${i}: ${typedArray[i]} !== ${PNG_SIGNATURE[i]}`,
      );
    }
  }

  // 2.
}
