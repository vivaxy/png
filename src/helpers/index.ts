/**
 * @since 2019-10-30 05:14
 * @author vivaxy
 */
export function readInt32BE(arrayBuffer: ArrayBuffer, offset: number) {
  const int8Array = new Int8Array(arrayBuffer.slice(offset, offset + 4));
  return (
    (int8Array[0] << 24) |
    (int8Array[1] << 16) |
    (int8Array[2] << 8) |
    int8Array[3]
  );
}
