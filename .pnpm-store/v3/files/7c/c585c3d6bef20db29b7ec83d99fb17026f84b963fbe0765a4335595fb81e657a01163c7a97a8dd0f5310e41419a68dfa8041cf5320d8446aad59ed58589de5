import { base64Decode } from './numeric-encoding-utils';
import { strToUtf8array } from './utf8-utils';

function getKeyIdBytes(str: string): Uint8Array<ArrayBuffer> {
  const keyIdbytes = strToUtf8array(str).subarray(0, 16);
  const paddedkeyIdbytes = new Uint8Array(16);
  paddedkeyIdbytes.set(keyIdbytes, 16 - keyIdbytes.length);
  return paddedkeyIdbytes;
}

export function changeEndianness(keyId: Uint8Array) {
  const swap = function (array: Uint8Array, from: number, to: number) {
    const cur = array[from];
    array[from] = array[to];
    array[to] = cur;
  };

  swap(keyId, 0, 3);
  swap(keyId, 1, 2);
  swap(keyId, 4, 5);
  swap(keyId, 6, 7);
}

export function convertDataUriToArrayBytes(
  uri: string,
): Uint8Array<ArrayBuffer> | null {
  // data:[<media type][;attribute=value][;base64],<data>
  const colonsplit = uri.split(':');
  let keydata: Uint8Array<ArrayBuffer> | null = null;
  if (colonsplit[0] === 'data' && colonsplit.length === 2) {
    const semicolonsplit = colonsplit[1].split(';');
    const commasplit = semicolonsplit[semicolonsplit.length - 1].split(',');
    if (commasplit.length === 2) {
      const isbase64 = commasplit[0] === 'base64';
      const data = commasplit[1];
      if (isbase64) {
        semicolonsplit.splice(-1, 1); // remove from processing
        keydata = base64Decode(data);
      } else {
        keydata = getKeyIdBytes(data);
      }
    }
  }
  return keydata;
}
