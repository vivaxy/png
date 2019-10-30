/**
 * @since 2019-10-30 05:20
 * @author vivaxy
 */
import { readInt32BE } from '..';

test('readInt32BE', function() {
  const arrayBuffer = new ArrayBuffer(4);
  const typedArray = new Uint8Array(arrayBuffer);
  typedArray[0] = -0x12;
  typedArray[1] = 0x34;
  typedArray[2] = 0x56;
  typedArray[3] = 0x78;
  expect(readInt32BE(typedArray.buffer, 0)).toBe(
    Buffer.from(typedArray.buffer).readInt32BE(0),
  );
});
