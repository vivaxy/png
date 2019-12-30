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
  // const testcaseNames = await glob('*', {
  //   cwd: fixturesPath,
  //   onlyDirectories: true,
  // });
  const testcaseNames = ['bit-depth-01'];

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
        'actual.png',
      );
      const metadata = require(metadataPath);
      const expectedOutputBuffer = await fse.readFile(expectedOutputPath);
      let encodedBuffer = new Uint8Array();
      try {
        encodedBuffer = encode(metadata);
      } catch (ex) {
        console.error(testcaseName + ' failed with error: ' + ex.stack);
        expect(false).toBe(true);
      }
      try {
        assert.deepStrictEqual(encodedBuffer, expectedOutputBuffer);
        await fse.remove(actualOutputPath);
        expect(true).toBe(true);
      } catch (e) {
        await fse.outputFile(actualOutputPath, encodedBuffer);
        console.error(testcaseName + ' failed');
        expect(false).toBe(true);
      }
    }),
  );
});
