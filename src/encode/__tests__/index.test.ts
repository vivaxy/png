/**
 * @since 20180911 17:16
 * @author vivaxy
 *
 * @todo chunk-IEND
 * @todo chunk-IHDR
 * @todo chunk-iTXt
 * @todo chunk-PLTE
 * @todo chunk-zTXt
 */
import * as path from 'path';
import * as fse from 'fs-extra';
import encode from '..';
import decode from '../../decode';

// @ts-ignore
test.each(global.testcases)('encode %s', async function(
  testcaseName,
  fixturePath,
) {
  const metadata = require(path.join(fixturePath, 'input.json'));
  const imageBinaryData = encode(metadata);
  expect(imageBinaryData).toMatchSnapshot();
  await fse.outputFile(path.join(fixturePath, 'output.png'), imageBinaryData);
  await fse.outputFile(
    path.join(fixturePath, 'decode.json'),
    JSON.stringify(decode(imageBinaryData), null, 2),
  );
});
