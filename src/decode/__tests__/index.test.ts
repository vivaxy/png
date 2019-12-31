/**
 * @since 20180911 17:16
 * @author vivaxy
 * @input input.png
 */
import * as fse from 'fs-extra';
import decode from '..';

// @ts-ignore
test.each(global.testcases)('decode %s', async function(
  testcaseName,
  imagePath,
) {
  const imageBinaryData = await fse.readFile(imagePath);
  expect(decode(imageBinaryData)).toMatchSnapshot();
});
