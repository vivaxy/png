/**
 * @since 2019-12-27 01:31
 * @author vivaxy
 */
export function concatUInt8Array(a: Uint8Array, b: Uint8Array): Uint8Array {
  const concated = new Uint8Array(a.length + b.length);
  concated.set(a);
  concated.set(b, a.length);
  return concated;
}
