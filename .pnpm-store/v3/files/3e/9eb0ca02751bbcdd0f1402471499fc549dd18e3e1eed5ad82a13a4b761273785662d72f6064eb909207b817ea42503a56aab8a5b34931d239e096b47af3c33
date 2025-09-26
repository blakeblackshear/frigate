'use strict';

// lib/types/utils.ts
var decoder = new TextDecoder();
var toUTF8String = (input, start = 0, end = input.length) => decoder.decode(input.slice(start, end));
var getView = (input, offset) => new DataView(input.buffer, input.byteOffset + offset);
var readInt32LE = (input, offset = 0) => getView(input, offset).getInt32(0, true);
var readUInt32LE = (input, offset = 0) => getView(input, offset).getUint32(0, true);

// lib/types/bmp.ts
var BMP = {
  validate: (input) => toUTF8String(input, 0, 2) === "BM",
  calculate: (input) => ({
    height: Math.abs(readInt32LE(input, 22)),
    width: readUInt32LE(input, 18)
  })
};

exports.BMP = BMP;
