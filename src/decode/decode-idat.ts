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
import { typedArrayToChannels } from '../helpers/channels';
import { buildImages, getPixelIndex } from '../helpers/interlace';

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
  const bitPerPixel = channelPerPixel * depth;
  const bytePerPixel = bitPerPixel >> 3 || 1;

  let dataIndex = 0;
  let prevUnfilteredLine = new Uint8Array();
  for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
    const { passWidth, passHeight, passIndex } = images[imageIndex];

    for (let heightIndex = 0; heightIndex < passHeight; heightIndex++) {
      // scanline
      // const scanlineWidth = Math.ceil(metadata.width * channel * metadata.depth / 8) + FILTER_LENGTH;
      const scanlineWidth =
        ((passWidth * bitPerPixel + 7) >> 3) + FILTER_LENGTH;

      // unfilter
      const filterType = inflatedData[dataIndex];
      if (!(filterType in FILTER_TYPES)) {
        throw new Error('Unsupported filter type: ' + filterType);
      }
      const unfilter = unfilters[filterType as FILTER_TYPES];
      const unfilteredLine = unfilter(
        inflatedData.slice(dataIndex + 1, dataIndex + scanlineWidth),
        bytePerPixel,
        prevUnfilteredLine,
      );
      prevUnfilteredLine = unfilteredLine;

      // to channels
      let channelIndex = 0;
      const channels = typedArrayToChannels(unfilteredLine, depth);

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
          passIndex,
          widthIndex,
          heightIndex,
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
