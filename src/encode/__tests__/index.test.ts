/**
 * @since 20180911 17:16
 * @author vivaxy
 */
import * as path from 'path';
import * as fse from 'fs-extra';
import encode from '..';

// @ts-ignore
test.each(global.testcases)('encode %s', async function(
  testcaseName,
  fixturePath,
) {
  const metadata = require(path.join(fixturePath, 'input.json'));
  const imageBinaryData = encode(metadata);
  expect(imageBinaryData).toMatchSnapshot();
  await fse.outputFile(path.join(fixturePath, 'output.png'), imageBinaryData);
});
