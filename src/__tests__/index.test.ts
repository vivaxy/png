/**
 * @since 2020-01-02 10:29
 * @author vivaxy
 */
import * as png from '../index';

test('entry', function() {
  expect(typeof png.decode).toBe('function');
  expect(typeof png.encode).toBe('function');
});
