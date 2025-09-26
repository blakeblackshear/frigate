"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.msgPackExtStart = exports.msgPackUriStart = exports.binUriStart = void 0;
exports.binUriStart = 'data:application/octet-stream;base64,';
const msgPackUriHeader = 'data:application/msgpack;base64';
exports.msgPackUriStart = msgPackUriHeader + ',';
exports.msgPackExtStart = msgPackUriHeader + ';ext=';
//# sourceMappingURL=constants.js.map