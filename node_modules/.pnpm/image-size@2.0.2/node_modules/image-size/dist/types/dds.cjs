'use strict';

// lib/types/utils.ts
new TextDecoder();
var getView = (input, offset) => new DataView(input.buffer, input.byteOffset + offset);
var readUInt32LE = (input, offset = 0) => getView(input, offset).getUint32(0, true);

// lib/types/dds.ts
var DDS = {
  validate: (input) => readUInt32LE(input, 0) === 542327876,
  calculate: (input) => ({
    height: readUInt32LE(input, 12),
    width: readUInt32LE(input, 16)
  })
};

exports.DDS = DDS;
