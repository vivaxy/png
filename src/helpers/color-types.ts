/**
 * @since 2019-12-27 01:25
 * @author vivaxy
 */
export enum COLOR_TYPES {
  GRAYSCALE = 0,
  TRUE_COLOR = 2,
  PALETTE = 3,
  GRAYSCALE_WITH_APLHA = 4 | GRAYSCALE,
  TRUE_COLOR_WITH_APLHA = 4 | TRUE_COLOR,
}

export const COLOR_TYPES_TO_CHANNEL_PER_PIXEL = {
  [COLOR_TYPES.GRAYSCALE]: 1,
  [COLOR_TYPES.TRUE_COLOR]: 3,
  [COLOR_TYPES.PALETTE]: 1,
  [COLOR_TYPES.GRAYSCALE_WITH_APLHA]: 2,
  [COLOR_TYPES.TRUE_COLOR_WITH_APLHA]: 4,
};
