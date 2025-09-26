// breaking up those two types in order to clarify what is happening in the decoding path.
type DecodedFrame<T> = { key: string; data: T; info?: any };
export type Frame = DecodedFrame<ArrayBuffer | string>;
// http://stackoverflow.com/questions/8936984/uint8array-to-string-in-javascript/22373197
// http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt
/* utf.js - UTF-8 <=> UTF-16 convertion
 *
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */

export function strToUtf8array(str: string) {
  return Uint8Array.from(unescape(encodeURIComponent(str)), (c) =>
    c.charCodeAt(0),
  );
}
