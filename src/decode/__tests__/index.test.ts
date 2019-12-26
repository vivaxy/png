/**
 * @since 20180911 17:16
 * @author vivaxy
 */
import * as path from 'path';
import * as assert from 'assert';
import * as fse from 'fs-extra';
import * as glob from 'fast-glob';

import decode from '..';

const fixturesPath = path.join(__dirname, 'fixtures');

test('decode', async function() {
  const testcaseNames = await glob('*', {
    cwd: fixturesPath,
    onlyDirectories: true,
  });
  // const testcaseNames = ['color-type-2'];

  await Promise.all(
    testcaseNames.map(async function(testcaseName) {
      const imagePath = path.join(fixturesPath, testcaseName, 'input.png');
      const expectedOutputPath = path.join(
        fixturesPath,
        testcaseName,
        'output.json',
      );
      const actualOutputPath = path.join(
        fixturesPath,
        testcaseName,
        'actual.json',
      );
      const imageBinaryData = await fse.readFile(imagePath);
      const expectedOutputData = await fse.readJson(expectedOutputPath);
      const decodedData = decode(imageBinaryData);
      try {
        assert.deepStrictEqual(decodedData, expectedOutputData);
        await fse.remove(actualOutputPath);
        expect(true).toBe(true);
      } catch (e) {
        await fse.outputFile(
          actualOutputPath,
          JSON.stringify(decodedData, null, 2),
        );
        expect(false).toBe(true);
      }
    }),
  );
});
