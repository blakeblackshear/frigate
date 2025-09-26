import statuses from "@bundled-es-modules/statuses";
import { Headers as HeadersPolyfill } from "headers-polyfill";
const { message } = statuses;
const kSetCookie = Symbol("kSetCookie");
function normalizeResponseInit(init = {}) {
  const status = init?.status || 200;
  const statusText = init?.statusText || message[status] || "";
  const headers = new Headers(init?.headers);
  return {
    ...init,
    headers,
    status,
    statusText
  };
}
function decorateResponse(response, init) {
  if (init.type) {
    Object.defineProperty(response, "type", {
      value: init.type,
      enumerable: true,
      writable: false
    });
  }
  const responseCookies = init.headers.get("set-cookie");
  if (responseCookies) {
    Object.defineProperty(response, kSetCookie, {
      value: responseCookies,
      enumerable: false,
      writable: false
    });
    if (typeof document !== "undefined") {
      const responseCookiePairs = HeadersPolyfill.prototype.getSetCookie.call(
        init.headers
      );
      for (const cookieString of responseCookiePairs) {
        document.cookie = cookieString;
      }
    }
  }
  return response;
}
export {
  decorateResponse,
  kSetCookie,
  normalizeResponseInit
};
//# sourceMappingURL=decorators.mjs.map