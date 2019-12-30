/**
 * @since 2019-10-30 03:01
 * @author vivaxy
 */
import Metadata from '../helpers/metadata';
import PNG_SIGNATURE from '../helpers/signature';
import { concatUint8Array } from '../helpers/typed-array';

export default function encode(metadata: Metadata) {
  // Signature
  let typedArray = new Uint8Array(PNG_SIGNATURE);

  // Chunks
  const chunkPackers: {
    [chunkName: string]: () => void;
  } = {
    IHDR: packIHDR,
    PLTE: packPLTE,
    IDAT: packIDAT,
    IEND: packIEND,
  };

  function packIHDR() {}

  function packPLTE() {}

  function packIDAT() {}

  function packIEND() {}

  Object.keys(chunkPackers).forEach(function(chunkName) {
    chunkPackers[chunkName]();
  });
}
