/**
 * @since 2019-12-30 02:36
 * @author vivaxy
 */
export function typedArrayToChannels(
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

export function channelsToTypedArray(
  channels: number[],
  depth: number,
  dataLength: number,
) {
  const typedArray = new Uint8Array(dataLength);
  let typedArrayIndex = 0;
  let channelIndex = 0;
  while (channelIndex < channels.length) {
    if (depth === 1) {
      typedArray[typedArrayIndex++] =
        ((channels[channelIndex++] & 1) << 7) |
        ((channels[channelIndex++] & 1) << 6) |
        ((channels[channelIndex++] & 1) << 5) |
        ((channels[channelIndex++] & 1) << 4) |
        ((channels[channelIndex++] & 1) << 3) |
        ((channels[channelIndex++] & 1) << 2) |
        ((channels[channelIndex++] & 1) << 1) |
        (channels[channelIndex++] & 1);
    } else if (depth === 2) {
      typedArray[typedArrayIndex++] =
        ((channels[channelIndex++] & 3) << 6) |
        ((channels[channelIndex++] & 3) << 4) |
        ((channels[channelIndex++] & 3) << 2) |
        (channels[channelIndex++] & 3);
    } else if (depth === 4) {
      typedArray[typedArrayIndex++] =
        ((channels[channelIndex++] & 15) << 4) |
        (channels[channelIndex++] & 15);
    } else if (depth === 8) {
      typedArray[typedArrayIndex++] = channels[channelIndex++];
    } else if (depth === 16) {
      const channel = channels[channelIndex++];
      typedArray[typedArrayIndex++] = (channel >> 8) & 0xff;
      typedArray[typedArrayIndex++] = channel & 0xff;
    } else {
      throw new Error('Unsupported depth: ' + depth);
    }
  }
  return typedArray;
}
