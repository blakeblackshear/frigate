// src/node/SetupServerApi.ts
import { AsyncLocalStorage } from "node:async_hooks";
import { ClientRequestInterceptor } from "@mswjs/interceptors/ClientRequest";
import { XMLHttpRequestInterceptor } from "@mswjs/interceptors/XMLHttpRequest";
import { FetchInterceptor } from "@mswjs/interceptors/fetch";

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

// src/node/SetupServerApi.ts
var store = new AsyncLocalStorage();
var AsyncHandlersController = class {
  rootContext;
  constructor(initialHandlers) {
    this.rootContext = { initialHandlers, handlers: [] };
  }
  get context() {
    return store.getStore() || this.rootContext;
  }
  prepend(runtimeHandlers) {
    this.context.handlers.unshift(...runtimeHandlers);
  }
  reset(nextHandlers) {
    const context = this.context;
    context.handlers = [];
    context.initialHandlers = nextHandlers.length > 0 ? nextHandlers : context.initialHandlers;
  }
  currentHandlers() {
    const { initialHandlers, handlers } = this.context;
    return handlers.concat(initialHandlers);
  }
};
var SetupServerApi = class extends SetupServerCommonApi {
  constructor(handlers, interceptors = [
    new ClientRequestInterceptor(),
    new XMLHttpRequestInterceptor(),
    new FetchInterceptor()
  ]) {
    super(interceptors, handlers);
    this.handlersController = new AsyncHandlersController(handlers);
  }
  boundary(callback) {
    return (...args) => {
      return store.run(
        {
          initialHandlers: this.handlersController.currentHandlers(),
          handlers: []
        },
        callback,
        ...args
      );
    };
  }
  close() {
    super.close();
    store.disable();
  }
};

// src/node/setupServer.ts
var setupServer = (...handlers) => {
  return new SetupServerApi(handlers);
};
export {
  SetupServerApi,
  setupServer
};
//# sourceMappingURL=index.mjs.map