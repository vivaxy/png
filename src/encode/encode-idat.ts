/**
 * @since 2019-12-30 01:47
 * @author vivaxy
 */
import * as pako from 'pako';
import rescaleSample from '../helpers/rescale-sample';
import { concatUInt8Array } from '../helpers/typed-array';
import { channelsToTypedArray } from '../helpers/channels';
import { buildImages, getPixelIndex } from '../helpers/interlace';
import { filters, FILTER_TYPES, FILTER_LENGTH } from '../helpers/filters';
import {
  COLOR_TYPES,
  COLOR_TYPES_TO_CHANNEL_PER_PIXEL,
} from '../helpers/color-types';

export default function encodeIDAT(
  data: number[],
  width: number,
  height: number,
  colorType: COLOR_TYPES,
  depth: number,
  interlace: number,
  palette?: [number, number, number, number][],
) {
  let typedArray = new Uint8Array();
  const channelPerPixel = COLOR_TYPES_TO_CHANNEL_PER_PIXEL[colorType];
  const bitPerPixel = channelPerPixel * depth;
  const bytePerPixel = bitPerPixel >> 3 || 1;

  const images = buildImages(interlace, width, height);

  for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
    let prevUnfilteredLine = new Uint8Array();

    const { passWidth, passHeight, passIndex } = images[imageIndex];
    const scanlineWidth =
      ((passWidth * channelPerPixel * depth + 7) >> 3) + FILTER_LENGTH;

    for (let heightIndex = 0; heightIndex < passHeight; heightIndex++) {
      // each line
      const channels: number[] = [];
      for (let widthIndex = 0; widthIndex < passWidth; widthIndex++) {
        // each pixel
        const pixelIndex = getPixelIndex(
          interlace,
          width,
          passIndex,
          widthIndex,
          heightIndex,
        );
        const pixel = data.slice(pixelIndex, pixelIndex + 4);

        // channels
        if (colorType === COLOR_TYPES.GRAYSCALE) {
          channels.push(rescaleSample(pixel[0], 8, depth));
        } else if (colorType === COLOR_TYPES.TRUE_COLOR) {
          channels.push(
            rescaleSample(pixel[0], 8, depth),
            rescaleSample(pixel[1], 8, depth),
            rescaleSample(pixel[2], 8, depth),
          );
        } else if (colorType === COLOR_TYPES.PALETTE) {
          if (!palette) {
            throw new Error('Palette is required');
          }
          let paletteIndex = -1;
          for (let i = 0; i < palette.length; i++) {
            const paletteColor = palette[i];
            if (
              paletteColor[0] === pixel[0] &&
              paletteColor[1] === pixel[1] &&
              paletteColor[2] == pixel[2] &&
              paletteColor[3] === pixel[3]
            ) {
              paletteIndex = i;
            }
          }
          if (paletteIndex === -1) {
            throw new Error(
              'Invalid palette. Color (' +
                pixel.join(', ') +
                ') is not in palette',
            );
          }
          channels.push(paletteIndex);
        } else if (colorType === COLOR_TYPES.GRAYSCALE_WITH_ALPHA) {
          channels.push(
            rescaleSample(pixel[0], 8, depth),
            rescaleSample(pixel[3], 8, depth),
          );
        } else if (colorType === COLOR_TYPES.TRUE_COLOR_WITH_ALPHA) {
          channels.push(
            rescaleSample(pixel[0], 8, depth),
            rescaleSample(pixel[1], 8, depth),
            rescaleSample(pixel[2], 8, depth),
            rescaleSample(pixel[3], 8, depth),
          );
        }
      }

      const unfilteredLine = channelsToTypedArray(
        channels,
        depth,
        scanlineWidth - FILTER_LENGTH,
      );

      // filter line
      let minFilterSum = Infinity;
      let filteredLine = new Uint8Array();
      let filterType = 0;
      const filterTypes: FILTER_TYPES[] = [
        FILTER_TYPES.NONE,
        FILTER_TYPES.SUB,
        FILTER_TYPES.UP,
        FILTER_TYPES.AVERAGE,
        FILTER_TYPES.PAETH,
      ];
      for (
        let filterIndex = 0;
        filterIndex < filterTypes.length;
        filterIndex++
      ) {
        const currentFilterType = filterTypes[filterIndex];
        const { sum, filtered } = filters[currentFilterType](
          unfilteredLine,
          bytePerPixel,
          prevUnfilteredLine,
        );
        if (sum < minFilterSum) {
          minFilterSum = sum;
          filteredLine = filtered;
          filterType = currentFilterType;
        }
      }

      prevUnfilteredLine = unfilteredLine;

      typedArray = concatUInt8Array(
        typedArray,
        concatUInt8Array(new Uint8Array([filterType]), filteredLine),
      );
    } // end of each line
  }

  return pako.deflate(typedArray);
}
