// src/test/convert-array-to-async-iterable.ts
function convertArrayToAsyncIterable(values) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const value of values) {
        yield value;
      }
    }
  };
}

// src/test/convert-array-to-readable-stream.ts
function convertArrayToReadableStream(values) {
  return new ReadableStream({
    start(controller) {
      try {
        for (const value of values) {
          controller.enqueue(value);
        }
      } finally {
        controller.close();
      }
    }
  });
}

// src/test/convert-async-iterable-to-array.ts
async function convertAsyncIterableToArray(iterable) {
  const result = [];
  for await (const item of iterable) {
    result.push(item);
  }
  return result;
}

// src/test/convert-readable-stream-to-array.ts
async function convertReadableStreamToArray(stream) {
  const reader = stream.getReader();
  const result = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done)
      break;
    result.push(value);
  }
  return result;
}

// src/test/convert-response-stream-to-array.ts
async function convertResponseStreamToArray(response) {
  return convertReadableStreamToArray(
    response.body.pipeThrough(new TextDecoderStream())
  );
}

// src/test/is-node-version.ts
function isNodeVersion(version) {
  const nodeMajorVersion = parseInt(process.version.slice(1).split(".")[0], 10);
  return nodeMajorVersion === version;
}

// src/test/mock-id.ts
function mockId({
  prefix = "id"
} = {}) {
  let counter = 0;
  return () => `${prefix}-${counter++}`;
}

// src/test/test-server.ts
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { beforeAll, beforeEach, afterAll } from "vitest";
var TestServerCall = class {
  constructor(request) {
    this.request = request;
  }
  get requestBodyJson() {
    return this.request.text().then(JSON.parse);
  }
  get requestBodyMultipart() {
    return this.request.headers.get("content-type")?.startsWith(
      "multipart/form-data"
    ) ? (
      // For multipart/form-data, return the form data entries as an object
      this.request.formData().then((formData) => {
        const entries = {};
        formData.forEach((value, key) => {
          entries[key] = value;
        });
        return entries;
      })
    ) : null;
  }
  get requestCredentials() {
    return this.request.credentials;
  }
  get requestHeaders() {
    const requestHeaders = this.request.headers;
    const headersObject = {};
    requestHeaders.forEach((value, key) => {
      if (key.toLowerCase() === "user-agent")
        return;
      headersObject[key] = value;
    });
    return headersObject;
  }
  get requestUserAgent() {
    return this.request.headers.get("user-agent") ?? void 0;
  }
  get requestUrlSearchParams() {
    return new URL(this.request.url).searchParams;
  }
  get requestUrl() {
    return this.request.url;
  }
  get requestMethod() {
    return this.request.method;
  }
};
function createTestServer(routes) {
  const originalRoutes = structuredClone(routes);
  const mswServer = setupServer(
    ...Object.entries(routes).map(([url, handler]) => {
      return http.all(url, ({ request }) => {
        const callNumber = calls.length;
        calls.push(new TestServerCall(request));
        const response = typeof handler.response === "function" ? handler.response({ callNumber }) : Array.isArray(handler.response) ? handler.response[callNumber] : handler.response;
        if (response === void 0) {
          return HttpResponse.json({ error: "Not Found" }, { status: 404 });
        }
        const handlerType = response.type;
        switch (handlerType) {
          case "json-value":
            return HttpResponse.json(response.body, {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                ...response.headers
              }
            });
          case "stream-chunks":
            return new HttpResponse(
              convertArrayToReadableStream(response.chunks).pipeThrough(
                new TextEncoderStream()
              ),
              {
                status: 200,
                headers: {
                  "Content-Type": "text/event-stream",
                  "Cache-Control": "no-cache",
                  Connection: "keep-alive",
                  ...response.headers
                }
              }
            );
          case "controlled-stream": {
            if (request.signal) {
              request.signal.addEventListener("abort", () => {
                response.controller.error(
                  new DOMException("Aborted", "AbortError")
                );
              });
            }
            return new HttpResponse(
              response.controller.stream.pipeThrough(new TextEncoderStream()),
              {
                status: 200,
                headers: {
                  "Content-Type": "text/event-stream",
                  "Cache-Control": "no-cache",
                  Connection: "keep-alive",
                  ...response.headers
                }
              }
            );
          }
          case "binary": {
            return HttpResponse.arrayBuffer(response.body, {
              status: 200,
              headers: response.headers
            });
          }
          case "error":
            return HttpResponse.text(response.body ?? "Error", {
              status: response.status ?? 500,
              headers: response.headers
            });
          case "empty":
            return new HttpResponse(null, {
              status: response.status ?? 200
            });
          default: {
            const _exhaustiveCheck = handlerType;
            throw new Error(`Unknown response type: ${_exhaustiveCheck}`);
          }
        }
      });
    })
  );
  let calls = [];
  beforeAll(() => {
    mswServer.listen();
  });
  beforeEach(() => {
    mswServer.resetHandlers();
    Object.entries(originalRoutes).forEach(([url, handler]) => {
      routes[url].response = handler.response;
    });
    calls = [];
  });
  afterAll(() => {
    mswServer.close();
  });
  return {
    urls: routes,
    get calls() {
      return calls;
    }
  };
}
var TestResponseController = class {
  constructor() {
    this.transformStream = new TransformStream();
    this.writer = this.transformStream.writable.getWriter();
  }
  get stream() {
    return this.transformStream.readable;
  }
  async write(chunk) {
    await this.writer.write(chunk);
  }
  async error(error) {
    await this.writer.abort(error);
  }
  async close() {
    await this.writer.close();
  }
};
export {
  TestResponseController,
  convertArrayToAsyncIterable,
  convertArrayToReadableStream,
  convertAsyncIterableToArray,
  convertReadableStreamToArray,
  convertResponseStreamToArray,
  createTestServer,
  isNodeVersion,
  mockId
};
//# sourceMappingURL=index.mjs.map