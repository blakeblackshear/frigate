'use strict';

// lib/types/utils.ts
var decoder = new TextDecoder();
var toUTF8String = (input, start = 0, end = input.length) => decoder.decode(input.slice(start, end));
var getView = (input, offset) => new DataView(input.buffer, input.byteOffset + offset);
var readUInt16LE = (input, offset = 0) => getView(input, offset).getUint16(0, true);

// lib/types/gif.ts
var gifRegexp = /^GIF8[79]a/;
var GIF = {
  validate: (input) => gifRegexp.test(toUTF8String(input, 0, 6)),
  calculate: (input) => ({
    height: readUInt16LE(input, 8),
    width: readUInt16LE(input, 6)
  })
};

exports.GIF = GIF;
