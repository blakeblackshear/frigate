// src/native/index.ts
import { FetchInterceptor } from "@mswjs/interceptors/fetch";
import { XMLHttpRequestInterceptor } from "@mswjs/interceptors/XMLHttpRequest";

// src/node/SetupServerCommonApi.ts
import { invariant } from "outvariant";
import {
  BatchInterceptor,
  InterceptorReadyState
} from "@mswjs/interceptors";
import { SetupApi } from '../core/SetupApi.mjs';
import { handleRequest } from '../core/utils/handleRequest.mjs';
import { mergeRight } from '../core/utils/internal/mergeRight.mjs';
import { InternalError, devUtils } from '../core/utils/internal/devUtils.mjs';
import { handleWebSocketEvent } from '../core/ws/handleWebSocketEvent.mjs';
import { webSocketInterceptor } from '../core/ws/webSocketInterceptor.mjs';
import { isHandlerKind } from '../core/utils/internal/isHandlerKind.mjs';
var DEFAULT_LISTEN_OPTIONS = {
  onUnhandledRequest: "warn"
};
var SetupServerCommonApi = class extends SetupApi {
  interceptor;
  resolvedOptions;
  constructor(interceptors, handlers) {
    super(...handlers);
    this.interceptor = new BatchInterceptor({
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
        const response = await handleRequest(
          request,
          requestId,
          this.handlersController.currentHandlers().filter(isHandlerKind("RequestHandler")),
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
      if (error instanceof InternalError) {
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
    handleWebSocketEvent({
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
    this.resolvedOptions = mergeRight(
      DEFAULT_LISTEN_OPTIONS,
      options
    );
    this.interceptor.apply();
    this.init();
    this.subscriptions.push(() => this.interceptor.dispose());
    webSocketInterceptor.apply();
    this.subscriptions.push(() => webSocketInterceptor.dispose());
    invariant(
      [InterceptorReadyState.APPLYING, InterceptorReadyState.APPLIED].includes(
        this.interceptor.readyState
      ),
      devUtils.formatMessage(
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
    [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
    handlers
  );
}
export {
  setupServer
};
//# sourceMappingURL=index.mjs.map