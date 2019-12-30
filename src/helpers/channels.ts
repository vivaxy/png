/**
 * @since 2019-12-30 02:36
 * @author vivaxy
 */
export function typedArrayToChannel(
  typedArray: Uint8Array,
  depth: number,
): number[] {
  const channels: number[] = [];
  let typedArrayIndex = 0;
  while (typedArrayIndex < typedArray.length) {
    if (depth === 1) {
      const uint8 = typedArray[typedArrayIndex++];
      channels.push(
        (uint8 >> 7) & 1,
        (uint8 >> 6) & 1,
        (uint8 >> 5) & 1,
        (uint8 >> 4) & 1,
        (uint8 >> 3) & 1,
        (uint8 >> 2) & 1,
        (uint8 >> 1) & 1,
        uint8 & 1,
      );
    } else if (depth === 2) {
      const uint8 = typedArray[typedArrayIndex++];
      channels.push(
        (uint8 >> 6) & 3,
        (uint8 >> 4) & 3,
        (uint8 >> 2) & 3,
        uint8 & 3,
      );
    } else if (depth === 4) {
      const uint8 = typedArray[typedArrayIndex++];
      channels.push((uint8 >> 4) & 15, uint8 & 15);
    } else if (depth === 8) {
      const uint8 = typedArray[typedArrayIndex++];
      channels.push(uint8);
    } else if (depth === 16) {
      channels.push(
        (typedArray[typedArrayIndex++] << 8) | typedArray[typedArrayIndex++],
      );
    } else {
      throw new Error('Unsupported depth: ' + depth);
    }
  }
  return channels;
}

export function channelToTypedArray(
  channels: number[],
  depth: number,
  scanlineWidth: number,
) {
  const typedArray = new Uint8Array(scanlineWidth);
  let typedArrayIndex = 0;
  for (let i = 0; i < channels.length; i++) {
    if (depth === 1) {
      typedArray[typedArrayIndex++] =
        ((channels[i++] & 1) << 7) |
        ((channels[i++] & 1) << 6) |
        ((channels[i++] & 1) << 5) |
        ((channels[i++] & 1) << 4) |
        ((channels[i++] & 1) << 3) |
        ((channels[i++] & 1) << 2) |
        ((channels[i++] & 1) << 1) |
        (channels[i++] & 1);
    } else if (depth === 2) {
      typedArray[typedArrayIndex++] =
        ((channels[i++] & 3) << 6) |
        ((channels[i++] & 3) << 4) |
        ((channels[i++] & 3) << 2) |
        (channels[i++] & 3);
    } else if (depth === 4) {
    } else if (depth === 8) {
    } else if (depth === 16) {
    } else {
      throw new Error('Unsupported depth: ' + depth);
    }
  }
  return typedArray;
}
