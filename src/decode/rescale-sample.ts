/**
 * @since 2019-12-28 02:32
 * @author vivaxy
 */
export default function rescaleSample(channel: number, depth: number) {
  if (depth === 8) {
    return channel;
  }
  const maxInSample = 2 ** depth - 1;
  const maxOutSample = 0xff;
  return Math.round((channel * maxOutSample) / maxInSample);
}
