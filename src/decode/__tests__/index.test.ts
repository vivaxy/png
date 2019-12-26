/**
 * @since 20180911 17:16
 * @author vivaxy
 */
import * as path from 'path';
import * as fse from 'fs-extra';
import * as glob from 'fast-glob';

import decode from '..';

const fixturesPath = path.join(__dirname, 'fixtures');

test('decode', async function() {
  const testcaseNames = await glob('*', {
    cwd: fixturesPath,
    onlyDirectories: true,
  });
  await Promise.all(
    testcaseNames.map(async function(testcaseName) {
      const imagePath = path.join(fixturesPath, testcaseName, 'input.png');
      const expectedOutputPath = path.join(
        fixturesPath,
        testcaseName,
        'output.json',
      );
      const imageBinaryData = await fse.readFile(imagePath);
      const expectedOutputData = await fse.readJson(expectedOutputPath);
      expect(decode(imageBinaryData)).toStrictEqual(expectedOutputData);
    }),
  );
});
