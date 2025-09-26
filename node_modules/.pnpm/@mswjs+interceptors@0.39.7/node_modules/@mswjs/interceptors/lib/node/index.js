"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _chunkR6JVCM7Xjs = require('./chunk-R6JVCM7X.js');



var _chunkLK6DILFKjs = require('./chunk-LK6DILFK.js');


var _chunk73NOP3T5js = require('./chunk-73NOP3T5.js');








var _chunkA7U44ARPjs = require('./chunk-A7U44ARP.js');


var _chunkSMXZPJEAjs = require('./chunk-SMXZPJEA.js');

// src/utils/getCleanUrl.ts
function getCleanUrl(url, isAbsolute = true) {
  return [isAbsolute && url.origin, url.pathname].filter(Boolean).join("");
}














exports.BatchInterceptor = _chunkR6JVCM7Xjs.BatchInterceptor; exports.FetchResponse = _chunkA7U44ARPjs.FetchResponse; exports.INTERNAL_REQUEST_ID_HEADER_NAME = _chunkA7U44ARPjs.INTERNAL_REQUEST_ID_HEADER_NAME; exports.IS_PATCHED_MODULE = _chunk73NOP3T5js.IS_PATCHED_MODULE; exports.Interceptor = _chunkA7U44ARPjs.Interceptor; exports.InterceptorReadyState = _chunkA7U44ARPjs.InterceptorReadyState; exports.createRequestId = _chunkA7U44ARPjs.createRequestId; exports.decodeBuffer = _chunkLK6DILFKjs.decodeBuffer; exports.deleteGlobalSymbol = _chunkA7U44ARPjs.deleteGlobalSymbol; exports.encodeBuffer = _chunkLK6DILFKjs.encodeBuffer; exports.getCleanUrl = getCleanUrl; exports.getGlobalSymbol = _chunkA7U44ARPjs.getGlobalSymbol; exports.getRawRequest = _chunkSMXZPJEAjs.getRawRequest;
//# sourceMappingURL=index.js.map