/**
 * @since 2019-12-28 02:32
 * @author vivaxy
 */
export default function rescaleSample(
  value: number,
  depthIn: number,
  depthOut: number,
) {
  if (depthIn === depthOut) {
    return value;
  }
  const maxSampleIn = 2 ** depthIn - 1;
  const maxSampleOut = 2 ** depthOut - 1;
  return Math.round((value * maxSampleOut) / maxSampleIn);
}
