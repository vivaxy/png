/**
 * @since 2019-12-27 01:29
 * @author vivaxy
 */
export const FILTER_LENGTH = 1;
export enum FILTER_TYPES {
  NONE = 0,
  SUB = 1,
  UP = 2,
  AVERAGE = 3,
  PAETH = 4,
}

export const unfilters: {
  [filterType in FILTER_TYPES]: (
    data: Uint8Array,
    bytePerPixel: number,
    prevUnfilteredLine: Uint8Array,
  ) => Uint8Array;
} = {
  [FILTER_TYPES.NONE](data: Uint8Array) {
    return data;
  },
  [FILTER_TYPES.SUB](data: Uint8Array, bytePerPixel: number) {
    const unfiltered = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const left = unfiltered[i - bytePerPixel] || 0;
      unfiltered[i] = data[i] + left;
    }
    return unfiltered;
  },
  [FILTER_TYPES.UP](
    data: Uint8Array,
    bytePerPixel: number,
    prevUnfilteredLine: Uint8Array,
  ) {
    const unfilteredLine = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const up = prevUnfilteredLine[i] || 0;
      unfilteredLine[i] = up + data[i];
    }
    return unfilteredLine;
  },
  [FILTER_TYPES.AVERAGE](
    data: Uint8Array,
    bytePerPixel: number,
    prevUnfilteredLine: Uint8Array,
  ) {
    const unfilteredLine = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const left = unfilteredLine[i - bytePerPixel] || 0;
      const above = prevUnfilteredLine[i] || 0;
      const avg = (left + above) >> 1;
      unfilteredLine[i] = data[i] + avg;
    }
    return unfilteredLine;
  },
  [FILTER_TYPES.PAETH](
    data: Uint8Array,
    bytePerPixel: number,
    prevUnfilteredLine: Uint8Array,
  ) {
    const unfilteredLine = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const left = unfilteredLine[i - bytePerPixel] || 0;
      const above = prevUnfilteredLine[i];
      const upperLeft = prevUnfilteredLine[i - bytePerPixel] || 0;
      const p = paeth(left, above, upperLeft);
      unfilteredLine[i] = data[i] + p;
    }
    return unfilteredLine;
  },
};

export const filters: {
  [filterType in FILTER_TYPES]: (
    data: Uint8Array,
    bytePerPixel: number,
    prevUnfilteredLine: Uint8Array,
  ) => {
    sum: number;
    filtered: Uint8Array;
  };
} = {
  [FILTER_TYPES.NONE](data: Uint8Array) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return {
      sum,
      filtered: data,
    };
  },
  [FILTER_TYPES.SUB](data: Uint8Array, bytePerPixel: number) {
    let sum = 0;
    const filtered = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const left = data[i - bytePerPixel] || 0;
      filtered[i] = data[i] - left;
      sum += filtered[i];
    }
    return {
      sum,
      filtered,
    };
  },
  [FILTER_TYPES.UP](
    data: Uint8Array,
    bytePerPixel: number,
    prevUnfilteredLine: Uint8Array,
  ) {
    let sum = 0;
    const filtered = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const up = prevUnfilteredLine[i] || 0;
      filtered[i] = data[i] - up;
      sum += filtered[i];
    }
    return {
      sum,
      filtered,
    };
  },
  [FILTER_TYPES.AVERAGE](
    data: Uint8Array,
    bytePerPixel: number,
    prevUnfilteredLine: Uint8Array,
  ) {
    let sum = 0;
    const filtered = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const left = data[i - bytePerPixel] || 0;
      const above = prevUnfilteredLine[i] || 0;
      const avg = (left + above) >> 1;
      filtered[i] = data[i] - avg;
      sum += filtered[i];
    }
    return {
      sum,
      filtered,
    };
  },
  [FILTER_TYPES.PAETH](
    data: Uint8Array,
    bytePerPixel: number,
    prevUnfilteredLine: Uint8Array,
  ) {
    let sum = 0;
    const filtered = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const left = data[i - bytePerPixel] || 0;
      const above = prevUnfilteredLine[i] || 0;
      const upperLeft = prevUnfilteredLine[i - bytePerPixel] || 0;
      const p = paeth(left, above, upperLeft);
      filtered[i] = data[i] - p;
      sum += filtered[i];
    }
    return {
      sum,
      filtered,
    };
  },
};

function paeth(left: number, above: number, upperLeft: number) {
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
