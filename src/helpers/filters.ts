/**
 * @since 2019-12-27 01:29
 * @author vivaxy
 */
import paeth from './paeth';

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
      if (i < bytePerPixel) {
        unfiltered[i] = data[i];
      } else {
        unfiltered[i] = unfiltered[i - bytePerPixel] + data[i];
      }
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
      if (prevUnfilteredLine[i] === undefined) {
        throw new Error('Unexpected previous unfiltered line item');
      }
      unfilteredLine[i] = prevUnfilteredLine[i] + data[i];
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
      const left = i < bytePerPixel ? 0 : unfilteredLine[i - bytePerPixel];
      const above =
        prevUnfilteredLine[i] === undefined ? 0 : prevUnfilteredLine[i];
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
      if (prevUnfilteredLine[i] === undefined) {
        throw new Error('Unexpected previous unfiltered line item at: ' + i);
      }
      const left = i < bytePerPixel ? 0 : unfilteredLine[i - bytePerPixel];
      const above = prevUnfilteredLine[i];
      const upperLeft =
        i < bytePerPixel ? 0 : prevUnfilteredLine[i - bytePerPixel];
      const p = paeth(left, above, upperLeft);
      unfilteredLine[i] = data[i] + p;
    }
    return unfilteredLine;
  },
};

export const filters: {
  [filterType in FILTER_TYPES]: (
    data: Uint8Array,
  ) => {
    sum: number;
    filtered: Uint8Array;
  };
} = {
  [FILTER_TYPES.NONE](data: Uint8Array) {
    return {
      sum: data.length,
      filtered: data,
    };
  },
  [FILTER_TYPES.SUB](data: Uint8Array) {
    return {
      sum: Infinity,
      filtered: data,
    };
  },
  [FILTER_TYPES.UP](data: Uint8Array) {
    return {
      sum: Infinity,
      filtered: data,
    };
  },
  [FILTER_TYPES.AVERAGE](data: Uint8Array) {
    return {
      sum: Infinity,
      filtered: data,
    };
  },
  [FILTER_TYPES.PAETH](data: Uint8Array) {
    return {
      sum: Infinity,
      filtered: data,
    };
  },
};
