/**
 * @since 20180911 17:16
 * @author vivaxy
 */
import * as path from 'path';
import * as fse from 'fs-extra';
import decode from '..';

// @ts-ignore
test.each(global.testcases)('decode %s', async function(
  testcaseName,
  fixturePath,
) {
  const imageBinaryData = await fse.readFile(
    path.join(fixturePath, 'input.png'),
  );
  const metadata = decode(imageBinaryData);
  expect(metadata).toMatchSnapshot();
  await fse.outputFile(
    path.join(fixturePath, 'output.json'),
    JSON.stringify(metadata, null, 2),
  );
});
