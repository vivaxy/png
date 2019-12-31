/**
 * @since 20180911 17:16
 * @author vivaxy
 * @input input.json
 * @todo filter-1
 * @todo filter-2
 * @todo filter-3
 * @todo filter-4
 * @todo bit-depth-04
 * @todo bit-depth-08
 * @todo bit-depth-16
 * @todo chunk-bKGD
 * @todo chunk-cHRM
 * @todo chunk-gMMA
 * @todo chunk-hIST
 * @todo chunk-IDAT-multiple
 * @todo chunk-IDAT-single
 * @todo chunk-IEND
 * @todo chunk-IHDR
 * @todo chunk-iTXt
 * @todo chunk-pHYs
 * @todo chunk-PLTE
 * @todo chunk-sBIT
 * @todo chunk-sPLT
 * @todo chunk-sRGB
 * @todo chunk-tEXt
 * @todo chunk-tIME
 * @todo chunk-tRNS-color-type-0
 * @todo chunk-tRNS-color-type-2
 * @todo chunk-tRNS-color-type-3
 * @todo chunk-zTXt
 * @todo color-type-0
 * @todo color-type-2
 * @todo color-type-3
 * @todo color-type-4
 * @todo color-type-6
 * @todo interlace-8x-size
 * @todo interlace-odd-size
 */
import encode from '..';

// @ts-ignore
test.each(global.testcases)('decode %s', async function(
  testcaseName,
  metadataPath,
) {
  const metadata = require(metadataPath);
  expect(encode(metadata)).toMatchSnapshot();
});
