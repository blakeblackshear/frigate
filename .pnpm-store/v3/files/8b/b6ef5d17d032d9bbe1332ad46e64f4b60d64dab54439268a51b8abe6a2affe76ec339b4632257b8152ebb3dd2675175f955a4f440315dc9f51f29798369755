'use strict';

// lib/types/utils.ts
new TextDecoder();
var getView = (input, offset) => new DataView(input.buffer, input.byteOffset + offset);
var readUInt16LE = (input, offset = 0) => getView(input, offset).getUint16(0, true);

// lib/types/tga.ts
var TGA = {
  validate(input) {
    return readUInt16LE(input, 0) === 0 && readUInt16LE(input, 4) === 0;
  },
  calculate(input) {
    return {
      height: readUInt16LE(input, 14),
      width: readUInt16LE(input, 12)
    };
  }
};

exports.TGA = TGA;
