/**
 * @since 2019-12-26 07:30
 * @author vivaxy
 */
export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
export enum COLOR_TYPES {
  GRAYSCALE = 0,
  TRUE_COLOR = 2,
  PALETTE = 3,
  GRAYSCALE_WITH_APLHA = 4 | GRAYSCALE,
  TRUE_COLOR_WITH_APLHA = 4 | TRUE_COLOR,
}
export const COLOR_TYPE_TO_CHANNEL: {
  [colorType in COLOR_TYPES]: number;
} = {
  [COLOR_TYPES.GRAYSCALE]: 1,
  [COLOR_TYPES.TRUE_COLOR]: 3,
  [COLOR_TYPES.PALETTE]: 1,
  [COLOR_TYPES.GRAYSCALE_WITH_APLHA]: 2,
  [COLOR_TYPES.TRUE_COLOR_WITH_APLHA]: 4,
};
export const FILTER_LENGTH = 1;
export enum FILTER_TYPES {
  NONE = 0,
  SUB = 1,
  UP = 2,
  AVERAGE = 3,
  PAETH = 4,
}
export const unfilters: {
  [filterType in FILTER_TYPES]: (data: Uint8Array) => Uint8Array;
} = {
  [FILTER_TYPES.NONE](data: Uint8Array) {
    return data;
  },
  [FILTER_TYPES.SUB](data: Uint8Array) {
    return data;
  },
  [FILTER_TYPES.UP](data: Uint8Array) {
    return data;
  },
  [FILTER_TYPES.AVERAGE](data: Uint8Array) {
    return data;
  },
  [FILTER_TYPES.PAETH](data: Uint8Array) {
    return data;
  },
};

export function buildChannels(
  unfilteredLine: Uint8Array,
  depth: number,
): number[] {
  const channels = [];
  if (depth === 1) {
    for (let i = 0; i < unfilteredLine.length; i++) {
      const uint8 = unfilteredLine[i];
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
    }
  } else if (depth === 2) {
    for (let i = 0; i < unfilteredLine.length; i++) {
      const uint8 = unfilteredLine[i];
      channels.push(
        (uint8 >> 6) & 3,
        (uint8 >> 4) & 3,
        (uint8 >> 2) & 3,
        uint8 & 3,
      );
    }
  } else if (depth === 4) {
    for (let i = 0; i < unfilteredLine.length; i++) {
      const uint8 = unfilteredLine[i];
      channels.push((uint8 >> 4) & 15, uint8 & 15);
    }
  } else if (depth === 8) {
    return Array.from(unfilteredLine);
  } else if (depth === 16) {
    throw new Error('Unsupported depth: ' + depth);
  } else {
    throw new Error('Unsupported depth: ' + depth);
  }

  return channels;
}

export function concatUint8Array(a: Uint8Array, b: Uint8Array): Uint8Array {
  const concated = new Uint8Array(a.length + b.length);
  concated.set(a);
  concated.set(b, a.length);
  return concated;
}
