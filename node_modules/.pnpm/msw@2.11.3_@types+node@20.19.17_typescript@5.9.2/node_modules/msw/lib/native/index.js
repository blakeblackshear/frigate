"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/native/index.ts
var index_exports = {};
__export(index_exports, {
  setupServer: () => setupServer
});
module.exports = __toCommonJS(index_exports);
var import_fetch = require("@mswjs/interceptors/fetch");
var import_XMLHttpRequest = require("@mswjs/interceptors/XMLHttpRequest");

// src/node/SetupServerCommonApi.ts
var import_outvariant = require("outvariant");
var import_interceptors = require("@mswjs/interceptors");
var import_SetupApi = require("../core/SetupApi");
var import_handleRequest = require("../core/utils/handleRequest");
var import_mergeRight = require("../core/utils/internal/mergeRight");
var import_devUtils = require("../core/utils/internal/devUtils");
var import_handleWebSocketEvent = require("../core/ws/handleWebSocketEvent");
var import_webSocketInterceptor = require("../core/ws/webSocketInterceptor");
var import_isHandlerKind = require("../core/utils/internal/isHandlerKind");
var DEFAULT_LISTEN_OPTIONS = {
  onUnhandledRequest: "warn"
};
var SetupServerCommonApi = class extends import_SetupApi.SetupApi {
  interceptor;
  resolvedOptions;
  constructor(interceptors, handlers) {
    super(...handlers);
    this.interceptor = new import_interceptors.BatchInterceptor({
      name: "setup-server",
      interceptors
    });
    this.resolvedOptions = {};
  }
  /**
   * Subscribe to all requests that are using the interceptor object
   */
  init() {
    this.interceptor.on(
      "request",
      async ({ request, requestId, controller }) => {
        const response = await (0, import_handleRequest.handleRequest)(
          request,
          requestId,
          this.handlersController.currentHandlers().filter((0, import_isHandlerKind.isHandlerKind)("RequestHandler")),
          this.resolvedOptions,
          this.emitter,
          {
            onPassthroughResponse(request2) {
              const acceptHeader = request2.headers.get("accept");
              if (acceptHeader) {
                const nextAcceptHeader = acceptHeader.replace(
                  /(,\s+)?msw\/passthrough/,
                  ""
                );
                if (nextAcceptHeader) {
                  request2.headers.set("accept", nextAcceptHeader);
                } else {
                  request2.headers.delete("accept");
                }
              }
            }
          }
        );
        if (response) {
          controller.respondWith(response);
        }
        return;
      }
    );
    this.interceptor.on("unhandledException", ({ error }) => {
      if (error instanceof import_devUtils.InternalError) {
        throw error;
      }
    });
    this.interceptor.on(
      "response",
      ({ response, isMockedResponse, request, requestId }) => {
        this.emitter.emit(
          isMockedResponse ? "response:mocked" : "response:bypass",
          {
            response,
            request,
            requestId
          }
        );
      }
    );
    (0, import_handleWebSocketEvent.handleWebSocketEvent)({
      getUnhandledRequestStrategy: () => {
        return this.resolvedOptions.onUnhandledRequest;
      },
      getHandlers: () => {
        return this.handlersController.currentHandlers();
      },
      onMockedConnection: () => {
      },
      onPassthroughConnection: () => {
      }
    });
  }
  listen(options = {}) {
    this.resolvedOptions = (0, import_mergeRight.mergeRight)(
      DEFAULT_LISTEN_OPTIONS,
      options
    );
    this.interceptor.apply();
    this.init();
    this.subscriptions.push(() => this.interceptor.dispose());
    import_webSocketInterceptor.webSocketInterceptor.apply();
    this.subscriptions.push(() => import_webSocketInterceptor.webSocketInterceptor.dispose());
    (0, import_outvariant.invariant)(
      [import_interceptors.InterceptorReadyState.APPLYING, import_interceptors.InterceptorReadyState.APPLIED].includes(
        this.interceptor.readyState
      ),
      import_devUtils.devUtils.formatMessage(
        'Failed to start "setupServer": the interceptor failed to apply. This is likely an issue with the library and you should report it at "%s".'
      ),
      "https://github.com/mswjs/msw/issues/new/choose"
    );
  }
  close() {
    this.dispose();
  }
};

// src/native/index.ts
function setupServer(...handlers) {
  return new SetupServerCommonApi(
    [new import_fetch.FetchInterceptor(), new import_XMLHttpRequest.XMLHttpRequestInterceptor()],
    handlers
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  setupServer
});
//# sourceMappingURL=index.js.map