/**
 * @since 20180911 17:16
 * @author vivaxy
 */
import * as path from 'path';
import * as assert from 'assert';
import * as fse from 'fs-extra';
import * as glob from 'fast-glob';

import encode from '..';

jest.setTimeout(10e3);
const fixturesPath = path.join(__dirname, '..', '..', '__tests__', 'fixtures');

test('encode', async function() {
  // const testcaseNames = (await glob('*', {
  //   cwd: fixturesPath,
  //   onlyDirectories: true,
  // })).filter(function (testcaseName) {
  //   return ![
  //     'bit-depth-16',
  //     'chunk-bKGD',
  //     'chunk-cHRM',
  //     'chunk-gMMA',
  //     'chunk-hIST',
  //     'chunk-IDAT-multiple',
  //     'chunk-IDAT-single',
  //     'chunk-IEND',
  //     'chunk-IHDR',
  //     'chunk-iTXt',
  //     'chunk-pHYs',
  //     'chunk-PLTE',
  //     'chunk-sBIT',
  //     'chunk-sPLT',
  //     'chunk-sRGB',
  //     'chunk-tEXt',
  //     'chunk-tIME',
  //     'chunk-tRNS-color-type-0',
  //     'chunk-tRNS-color-type-2',
  //     'chunk-tRNS-color-type-3',
  //     'chunk-zTXt',
  //     'color-type-0',
  //     'color-type-2',
  //     'color-type-3',
  //     'color-type-4',
  //     'color-type-6',
  //     'filter-0',
  //     'filter-1',
  //     'filter-2',
  //     'filter-3',
  //     'filter-4',
  //     'interlace-8x-size',
  //     'interlace-odd-size'
  //   ].includes(testcaseName);
  // });
  const testcaseNames = ['bit-depth-04'];

  await Promise.all(
    testcaseNames.map(async function(testcaseName) {
      const metadataPath = path.join(
        fixturesPath,
        testcaseName,
        'metadata.json',
      );
      const expectedOutputPath = path.join(
        fixturesPath,
        testcaseName,
        'png.png',
      );
      const actualOutputPath = path.join(
        fixturesPath,
        testcaseName,
        'encode.png',
      );
      const actualBinaryPath = path.join(
        fixturesPath,
        testcaseName,
        'actual.json',
      );
      const expectedBinaryPath = path.join(
        fixturesPath,
        testcaseName,
        'expected.json',
      );
      const metadata = require(metadataPath);
      const expectedBuffer = new Uint8Array(
        await fse.readFile(expectedOutputPath),
      );
      let encodedBuffer = new Uint8Array();
      try {
        encodedBuffer = encode(metadata);
      } catch (ex) {
        console.error(
          testcaseName + ' failed with error: ' + (ex.stack || ex.message),
        );
        expect(false).toBe(true);
      }
      try {
        assert.deepStrictEqual(encodedBuffer, expectedBuffer);
        await fse.remove(actualOutputPath);
        await fse.remove(actualBinaryPath);
        await fse.remove(expectedBinaryPath);
        expect(true).toBe(true);
      } catch (e) {
        await fse.outputFile(
          actualBinaryPath,
          JSON.stringify(Array.from(encodedBuffer)),
        );
        await fse.outputFile(
          expectedBinaryPath,
          JSON.stringify(Array.from(expectedBuffer)),
        );
        await fse.outputFile(actualOutputPath, encodedBuffer);
        console.error(testcaseName + ' failed');
        expect(false).toBe(true);
      }
    }),
  );
});
