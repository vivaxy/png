/**
 * @since 2019-12-28 12:35
 * @author vivaxy
 */
export default function paeth(left: number, above: number, upperLeft: number) {
  const p = left + above - upperLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - above);
  const pc = Math.abs(p - upperLeft);
  if (pa <= pb && pa <= pc) {
    return left;
  } else if (pb <= pc) {
    return above;
  } else {
    return upperLeft;
  }
}
