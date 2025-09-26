import {
  BatchInterceptor
} from "./chunk-RC2XPCC4.mjs";
import {
  decodeBuffer,
  encodeBuffer
} from "./chunk-6HYIRFX2.mjs";
import {
  IS_PATCHED_MODULE
} from "./chunk-6YM4PLBI.mjs";
import {
  FetchResponse,
  INTERNAL_REQUEST_ID_HEADER_NAME,
  Interceptor,
  InterceptorReadyState,
  createRequestId,
  deleteGlobalSymbol,
  getGlobalSymbol
} from "./chunk-IHJSPMYM.mjs";
import {
  getRawRequest
} from "./chunk-3GJB4JDF.mjs";

// src/utils/getCleanUrl.ts
function getCleanUrl(url, isAbsolute = true) {
  return [isAbsolute && url.origin, url.pathname].filter(Boolean).join("");
}
export {
  BatchInterceptor,
  FetchResponse,
  INTERNAL_REQUEST_ID_HEADER_NAME,
  IS_PATCHED_MODULE,
  Interceptor,
  InterceptorReadyState,
  createRequestId,
  decodeBuffer,
  deleteGlobalSymbol,
  encodeBuffer,
  getCleanUrl,
  getGlobalSymbol,
  getRawRequest
};
//# sourceMappingURL=index.mjs.map