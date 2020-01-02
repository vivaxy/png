/**
 * @since 2019-12-29 11:05
 * @author vivaxy
 */
import { COLOR_TYPES } from './color-types';

type Metadata = {
  width: number; // Image width
  height: number; // Image height
  depth: number; // Bit depth; depth per channel
  colorType: COLOR_TYPES; // Color type as grayscale, true color, palette or with alpha
  compression: number; // Compression method; always be 0
  interlace: number; // Interlaced
  filter: number; // Filter method; always be 0
  palette?: [number, number, number, number][]; // Palette if presented
  transparent?: [number, number, number, number]; // Transparent color if presented
  chromaticities?: {
    // Primary chromaticities
    white: {
      x: number;
      y: number;
    };
    red: {
      x: number;
      y: number;
    };
    green: {
      x: number;
      y: number;
    };
    blue: {
      x: number;
      y: number;
    };
  };
  gamma?: number; // Image gamma
  icc?: {
    // Embedded ICC profile
    name: string;
    profile: number[];
  };
  significantBits?: [number, number, number, number]; // Significant bits
  sRGB?: number; // Standard RGB color space rendering intent
  text?: {
    // Keywords and text strings
    [keyword: string]: string;
  };
  compressedText?: {
    // Compressed textual data
    [keyword: string]: string;
  };
  internationalText?: {
    // International textual data
    [keyword: string]: {
      languageTag: string;
      translatedKeyword: string;
      text: string;
    };
  };
  background?: [number, number, number, number]; // Background color if presented
  histogram?: number[]; // Image histogram
  physicalDimensions?: {
    // Physical pixel dimensions
    pixelPerUnitX: number;
    pixelPerUnitY: number;
    unit: number;
  };
  suggestedPalette?: {
    // Suggested palette
    name: string;
    depth: number;
    palette: [number, number, number, number, number][];
  };
  lastModificationTime?: number; // Image last-modification time (UTC)
  data: number[]; // ImageData
};

export default Metadata;
