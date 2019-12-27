/**
 * @since 2019-12-26 07:30
 * @author vivaxy
 */
import * as pako from 'pako';
import {
  COLOR_TYPES,
  COLOR_TYPES_TO_CHANNEL_PER_PIXEL,
} from '../helpers/color-types';
import { FILTER_TYPES, FILTER_LENGTH } from '../helpers/filters';

const unfilters = {
  [FILTER_TYPES.NONE](data: Uint8Array) {
    return data;
  },
  [FILTER_TYPES.SUB](data: Uint8Array) {
    throw new Error('Unsupported filter type: ' + FILTER_TYPES.SUB);
  },
  [FILTER_TYPES.UP](data: Uint8Array) {
    throw new Error('Unsupported filter type: ' + FILTER_TYPES.UP);
  },
  [FILTER_TYPES.AVERAGE](data: Uint8Array) {
    throw new Error('Unsupported filter type: ' + FILTER_TYPES.AVERAGE);
  },
  [FILTER_TYPES.PAETH](data: Uint8Array) {
    throw new Error('Unsupported filter type: ' + FILTER_TYPES.PAETH);
  },
};

function buildChannels(unfilteredLine: Uint8Array, depth: number): number[] {
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

const ADAM7_PASSES = [
  {
    // pass 1 - 1px
    x: [0],
    y: [0],
  },
  {
    // pass 2 - 1px
    x: [4],
    y: [0],
  },
  {
    // pass 3 - 2px
    x: [0, 4],
    y: [4],
  },
  {
    // pass 4 - 4px
    x: [2, 6],
    y: [0, 4],
  },
  {
    // pass 5 - 8px
    x: [0, 2, 4, 6],
    y: [2, 6],
  },
  {
    // pass 6 - 16px
    x: [1, 3, 5, 7],
    y: [0, 2, 4, 6],
  },
  {
    // pass 7 - 32px
    x: [0, 1, 2, 3, 4, 5, 6, 7],
    y: [1, 3, 5, 7],
  },
];

type Image = {
  passWidth: number;
  passHeight: number;
  passIndex: number;
};

function buildImages(
  interlace: number,
  width: number,
  height: number,
): Image[] {
  if (!interlace) {
    return [
      {
        passWidth: width,
        passHeight: height,
        passIndex: 0,
      },
    ];
  }
  const images: Image[] = [];
  ADAM7_PASSES.forEach(function({ x, y }, passIndex) {
    const remainingX = width % 8;
    const remainingY = height % 8;
    const repeatX = (width - remainingX) >> 3;
    const repeatY = (height - remainingY) >> 3;
    let passWidth = repeatX * x.length;
    for (let i = 0; i < x.length; i++) {
      if (x[i] < remainingX) {
        passWidth++;
      } else {
        break;
      }
    }
    let passHeight = repeatY * y.length;
    for (let i = 0; i < y.length; i++) {
      if (y[i] < remainingY) {
        passHeight++;
      } else {
        break;
      }
    }
    if (passWidth && passHeight) {
      images.push({
        passWidth: passWidth,
        passHeight: passHeight,
        passIndex: passIndex,
      });
    }
  });
  return images;
}

function getPixelIndex(
  interlace: number,
  width: number,
  widthIndex: number,
  heightIndex: number,
  passIndex: number,
): number {
  if (!interlace) {
    return (width * heightIndex + widthIndex) << 2;
  }
  const pass = ADAM7_PASSES[passIndex];
  const remainingX = widthIndex % pass.x.length;
  const remainingY = heightIndex % pass.y.length;
  const repeatX = (widthIndex - remainingX) / pass.x.length;
  const repeatY = (heightIndex - remainingY) / pass.y.length;
  const offsetX = pass.x[remainingX];
  const offsetY = pass.y[remainingY];
  return (width * ((repeatY << 3) + offsetY) + (repeatX << 3) + offsetX) << 2;
}

export function decodeIDAT(
  idatUint8Array: Uint8Array,
  interlace: number,
  colorType: COLOR_TYPES,
  width: number,
  height: number,
  depth: number,
  palette: [number, number, number, number][],
) {
  let pixels: number[] = [];
  // inflate
  const inflatedData = pako.inflate(idatUint8Array);
  const images = buildImages(interlace, width, height);
  const channelPerPixel = COLOR_TYPES_TO_CHANNEL_PER_PIXEL[colorType];

  let index = 0;
  for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
    const { passWidth, passHeight, passIndex } = images[imageIndex];

    for (let heightIndex = 0; heightIndex < passHeight; heightIndex++) {
      // scanline
      // const scanlineWidth = Math.ceil(metadata.width * channel * metadata.depth / 8) + FILTER_LENGTH;
      const scanlineWidth =
        ((passWidth * channelPerPixel * depth + 7) >> 3) + FILTER_LENGTH;

      // unfilter
      const filterType = inflatedData[index + 0];
      if (!(filterType in FILTER_TYPES)) {
        throw new Error('Unsupported filter type: ' + filterType);
      }
      const unfilter = unfilters[filterType as FILTER_TYPES];
      const unfilteredLine = unfilter(
        inflatedData.slice(index + 1, index + scanlineWidth),
      );
      // to channels
      let channelIndex = 0;
      const channels = buildChannels(unfilteredLine, depth);

      function getPixelFromChannels() {
        if (colorType === COLOR_TYPES.GRAYSCALE) {
          const color = channels[channelIndex++];
          return [color, color, color, 0xff];
        }
        if (colorType === COLOR_TYPES.TRUE_COLOR) {
          return [
            channels[channelIndex++],
            channels[channelIndex++],
            channels[channelIndex++],
            0xff,
          ];
        }
        if (colorType === COLOR_TYPES.PALETTE) {
          const paletteIndex = channels[channelIndex++];
          return palette[paletteIndex];
        }
        if (colorType === COLOR_TYPES.TRUE_COLOR_WITH_APLHA) {
          return [
            channels[channelIndex++],
            channels[channelIndex++],
            channels[channelIndex++],
            channels[channelIndex++],
          ];
        }
        throw new Error('Unsupported color type: ' + colorType);
      }

      for (let widthIndex = 0; widthIndex < passWidth; widthIndex++) {
        // to pixel
        const pixel = getPixelFromChannels();
        const pixelIndex = getPixelIndex(
          interlace,
          width,
          widthIndex,
          heightIndex,
          passIndex,
        );
        for (let i = 0; i < pixel.length; i++) {
          pixels[pixelIndex + i] = pixel[i];
        }
      }

      index += scanlineWidth;
    }
  }
  return pixels;
}
