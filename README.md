# png

> 🖼A browser compatible PNG decoder and encoder.

[![Build Status][travis-image]][travis-url]
[![NPM Version][npm-version-image]][npm-url]
[![NPM Downloads][npm-downloads-image]][npm-url]
[![MIT License][license-image]][license-url]
[![Standard Version][standard-version-image]][standard-version-url]
[![Codecov][codecov-image]][codecov-url]

# Supports

- Environments: Browsers and Node.js
- Chunks: IHDR, PLTE, IDAT, IEND, tRNS, cHRM, gAMA, iCCP, sBIT, sRGB, tEXt, zTXt, iTXt, bKGD, hIST, pHYs, sPLT, tIME
- Color Types: Greyscale, Truecolour, Indexed-colour (Palette), Greyscale with alpha, Truecolour with alpha
- Bit Depths: 1, 2, 4, 8, 16
- Filters: None, Sub, Up, Average, Paeth

# Install

`yarn add @vivaxy/png` or `npm i @vivaxy/png`

# Usage

```js
import png from '@vivaxy/png';

const metadata = png.decode(imageBuffer);
const imageBuffer = png.encode(metadata);
```

See `metadata` type definition in [metadata.ts](src/helpers/metadata.ts).

#

_Project created by [create-n](https://github.com/vivaxy/create-n)._

[travis-image]: https://img.shields.io/travis/vivaxy/png.svg?style=flat-square
[travis-url]: https://travis-ci.org/vivaxy/png
[npm-version-image]: https://img.shields.io/npm/v/@vivaxy/png.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@vivaxy/png
[npm-downloads-image]: https://img.shields.io/npm/dt/@vivaxy/png.svg?style=flat-square
[license-image]: https://img.shields.io/npm/l/@vivaxy/png.svg?style=flat-square
[license-url]: LICENSE
[standard-version-image]: https://img.shields.io/badge/release-standard%20version-brightgreen.svg?style=flat-square
[standard-version-url]: https://github.com/conventional-changelog/standard-version
[codecov-image]: https://img.shields.io/codecov/c/github/vivaxy/png.svg?style=flat-square
[codecov-url]: https://codecov.io/gh/vivaxy/png
