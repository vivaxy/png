/**
 * @since 2019-12-26 07:30
 * @author vivaxy
 */
import * as pako from 'pako';
import {
  COLOR_TYPES,
  COLOR_TYPES_TO_CHANNEL_PER_PIXEL,
} from '../helpers/color-types';
import { FILTER_TYPES, FILTER_LENGTH, unfilters } from '../helpers/filters';
import rescaleSample from '../helpers/rescale-sample';
import { typedArrayToChannel } from '../helpers/channels';

const ADAM7_PASSES = [
  {
    x: [0],
    y: [0],
  },
  {
    x: [4],
    y: [0],
  },
  {
    x: [0, 4],
    y: [4],
  },
  {
    x: [2, 6],
    y: [0, 4],
  },
  {
    x: [0, 2, 4, 6],
    y: [2, 6],
  },
  {
    x: [1, 3, 5, 7],
    y: [0, 2, 4, 6],
  },
  {
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

export default function decodeIDAT(
  deflatedData: Uint8Array,
  interlace: number,
  colorType: COLOR_TYPES,
  width: number,
  height: number,
  depth: number,
  palette?: [number, number, number, number][],
  transparent?: [number, number, number, number],
) {
  let pixels: number[] = [];
  // inflate
  const inflatedData = pako.inflate(deflatedData);
  const images = buildImages(interlace, width, height);
  const channelPerPixel = COLOR_TYPES_TO_CHANNEL_PER_PIXEL[colorType];
  const bpp = channelPerPixel * depth;

  let dataIndex = 0;
  let prevUnfilteredLine = new Uint8Array();
  for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
    const { passWidth, passHeight, passIndex } = images[imageIndex];

    for (let heightIndex = 0; heightIndex < passHeight; heightIndex++) {
      // scanline
      // const scanlineWidth = Math.ceil(metadata.width * channel * metadata.depth / 8) + FILTER_LENGTH;
      const scanlineWidth = ((passWidth * bpp + 7) >> 3) + FILTER_LENGTH;

      // unfilter
      const filterType = inflatedData[dataIndex + 0];
      if (!(filterType in FILTER_TYPES)) {
        throw new Error('Unsupported filter type: ' + filterType);
      }
      const unfilter = unfilters[filterType as FILTER_TYPES];
      const unfilteredLine = unfilter(
        inflatedData.slice(dataIndex + 1, dataIndex + scanlineWidth),
        bpp >> 3,
        prevUnfilteredLine,
      );
      prevUnfilteredLine = unfilteredLine;

      // to channels
      let channelIndex = 0;
      const channels = typedArrayToChannel(unfilteredLine, depth);

      function getPixelFromChannels() {
        if (colorType === COLOR_TYPES.GRAYSCALE) {
          const color = rescaleSample(channels[channelIndex++], depth, 8);
          return [color, color, color, 0xff];
        }
        if (colorType === COLOR_TYPES.TRUE_COLOR) {
          return [
            rescaleSample(channels[channelIndex++], depth, 8),
            rescaleSample(channels[channelIndex++], depth, 8),
            rescaleSample(channels[channelIndex++], depth, 8),
            0xff,
          ];
        }
        if (colorType === COLOR_TYPES.PALETTE) {
          const paletteIndex = channels[channelIndex++];
          if (!palette) {
            throw new Error('Mising chunk: PLTE');
          }
          return palette[paletteIndex];
        }
        if (colorType === COLOR_TYPES.GRAYSCALE_WITH_ALPHA) {
          const color = rescaleSample(channels[channelIndex++], depth, 8);
          return [
            color,
            color,
            color,
            rescaleSample(channels[channelIndex++], depth, 8),
          ];
        }
        if (colorType === COLOR_TYPES.TRUE_COLOR_WITH_ALPHA) {
          return [
            rescaleSample(channels[channelIndex++], depth, 8),
            rescaleSample(channels[channelIndex++], depth, 8),
            rescaleSample(channels[channelIndex++], depth, 8),
            rescaleSample(channels[channelIndex++], depth, 8),
          ];
        }
        throw new Error('Unsupported color type: ' + colorType);
      }

      for (let widthIndex = 0; widthIndex < passWidth; widthIndex++) {
        // to pixel
        const pixel = getPixelFromChannels();
        // process transparent color when available
        if (
          transparent &&
          pixel[0] === transparent[0] &&
          pixel[1] === transparent[1] &&
          pixel[2] === transparent[2]
        ) {
          pixel[3] = 0;
        }
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

      dataIndex += scanlineWidth;
    }
  }
  return pixels;
}
