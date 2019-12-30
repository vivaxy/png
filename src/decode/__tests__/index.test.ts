/**
 * @since 20180911 17:16
 * @author vivaxy
 */
import * as path from 'path';
import * as assert from 'assert';
import * as fse from 'fs-extra';
import * as glob from 'fast-glob';

import decode from '..';

jest.setTimeout(10e3);
const fixturesPath = path.join(__dirname, '..', '..', '__tests__', 'fixtures');

test('decode', async function() {
  const testcaseNames = await glob('*', {
    cwd: fixturesPath,
    onlyDirectories: true,
  });
  // const testcaseNames = ['bit-depth-01'];

  await Promise.all(
    testcaseNames.map(async function(testcaseName) {
      const imagePath = path.join(fixturesPath, testcaseName, 'png.png');
      const expectedOutputPath = path.join(
        fixturesPath,
        testcaseName,
        'metadata.json',
      );
      const actualOutputPath = path.join(
        fixturesPath,
        testcaseName,
        'decode.json',
      );
      const imageBinaryData = await fse.readFile(imagePath);
      const expectedOutputData = await fse.readJson(expectedOutputPath);
      let decodedData = null;
      try {
        decodedData = decode(imageBinaryData);
      } catch (ex) {
        console.error(testcaseName + ' failed with error: ' + ex.stack);
        expect(false).toBe(true);
      }
      try {
        assert.deepStrictEqual(decodedData, expectedOutputData);
        await fse.remove(actualOutputPath);
        expect(true).toBe(true);
      } catch (e) {
        await fse.outputFile(
          actualOutputPath,
          JSON.stringify(decodedData, null, 2),
        );
        console.error(testcaseName + ' failed');
        expect(false).toBe(true);
      }
    }),
  );
});
