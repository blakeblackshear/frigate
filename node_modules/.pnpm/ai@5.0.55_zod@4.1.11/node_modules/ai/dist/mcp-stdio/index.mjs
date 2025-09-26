// src/tool/mcp/json-rpc-message.ts
import { z as z2 } from "zod/v4";

// src/tool/mcp/types.ts
import { z } from "zod/v4";
var ClientOrServerImplementationSchema = z.looseObject({
  name: z.string(),
  version: z.string()
});
var BaseParamsSchema = z.looseObject({
  _meta: z.optional(z.object({}).loose())
});
var ResultSchema = BaseParamsSchema;
var RequestSchema = z.object({
  method: z.string(),
  params: z.optional(BaseParamsSchema)
});
var ServerCapabilitiesSchema = z.looseObject({
  experimental: z.optional(z.object({}).loose()),
  logging: z.optional(z.object({}).loose()),
  prompts: z.optional(
    z.looseObject({
      listChanged: z.optional(z.boolean())
    })
  ),
  resources: z.optional(
    z.looseObject({
      subscribe: z.optional(z.boolean()),
      listChanged: z.optional(z.boolean())
    })
  ),
  tools: z.optional(
    z.looseObject({
      listChanged: z.optional(z.boolean())
    })
  )
});
var InitializeResultSchema = ResultSchema.extend({
  protocolVersion: z.string(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ClientOrServerImplementationSchema,
  instructions: z.optional(z.string())
});
var PaginatedResultSchema = ResultSchema.extend({
  nextCursor: z.optional(z.string())
});
var ToolSchema = z.object({
  name: z.string(),
  description: z.optional(z.string()),
  inputSchema: z.object({
    type: z.literal("object"),
    properties: z.optional(z.object({}).loose())
  }).loose()
}).loose();
var ListToolsResultSchema = PaginatedResultSchema.extend({
  tools: z.array(ToolSchema)
});
var TextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string()
}).loose();
var ImageContentSchema = z.object({
  type: z.literal("image"),
  data: z.base64(),
  mimeType: z.string()
}).loose();
var ResourceContentsSchema = z.object({
  /**
   * The URI of this resource.
   */
  uri: z.string(),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: z.optional(z.string())
}).loose();
var TextResourceContentsSchema = ResourceContentsSchema.extend({
  text: z.string()
});
var BlobResourceContentsSchema = ResourceContentsSchema.extend({
  blob: z.base64()
});
var EmbeddedResourceSchema = z.object({
  type: z.literal("resource"),
  resource: z.union([TextResourceContentsSchema, BlobResourceContentsSchema])
}).loose();
var CallToolResultSchema = ResultSchema.extend({
  content: z.array(
    z.union([TextContentSchema, ImageContentSchema, EmbeddedResourceSchema])
  ),
  isError: z.boolean().default(false).optional()
}).or(
  ResultSchema.extend({
    toolResult: z.unknown()
  })
);

// src/tool/mcp/json-rpc-message.ts
var JSONRPC_VERSION = "2.0";
var JSONRPCRequestSchema = z2.object({
  jsonrpc: z2.literal(JSONRPC_VERSION),
  id: z2.union([z2.string(), z2.number().int()])
}).merge(RequestSchema).strict();
var JSONRPCResponseSchema = z2.object({
  jsonrpc: z2.literal(JSONRPC_VERSION),
  id: z2.union([z2.string(), z2.number().int()]),
  result: ResultSchema
}).strict();
var JSONRPCErrorSchema = z2.object({
  jsonrpc: z2.literal(JSONRPC_VERSION),
  id: z2.union([z2.string(), z2.number().int()]),
  error: z2.object({
    code: z2.number().int(),
    message: z2.string(),
    data: z2.optional(z2.unknown())
  })
}).strict();
var JSONRPCNotificationSchema = z2.object({
  jsonrpc: z2.literal(JSONRPC_VERSION)
}).merge(
  z2.object({
    method: z2.string(),
    params: z2.optional(BaseParamsSchema)
  })
).strict();
var JSONRPCMessageSchema = z2.union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResponseSchema,
  JSONRPCErrorSchema
]);

// src/error/mcp-client-error.ts
import { AISDKError } from "@ai-sdk/provider";
var name = "AI_MCPClientError";
var marker = `vercel.ai.error.${name}`;
var symbol = Symbol.for(marker);
var _a;
var MCPClientError = class extends AISDKError {
  constructor({
    name: name2 = "MCPClientError",
    message,
    cause
  }) {
    super({ name: name2, message, cause });
    this[_a] = true;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker);
  }
};
_a = symbol;

// mcp-stdio/create-child-process.ts
import { spawn } from "child_process";

// mcp-stdio/get-environment.ts
function getEnvironment(customEnv) {
  const DEFAULT_INHERITED_ENV_VARS = globalThis.process.platform === "win32" ? [
    "APPDATA",
    "HOMEDRIVE",
    "HOMEPATH",
    "LOCALAPPDATA",
    "PATH",
    "PROCESSOR_ARCHITECTURE",
    "SYSTEMDRIVE",
    "SYSTEMROOT",
    "TEMP",
    "USERNAME",
    "USERPROFILE"
  ] : ["HOME", "LOGNAME", "PATH", "SHELL", "TERM", "USER"];
  const env = customEnv ? { ...customEnv } : {};
  for (const key of DEFAULT_INHERITED_ENV_VARS) {
    const value = globalThis.process.env[key];
    if (value === void 0) {
      continue;
    }
    if (value.startsWith("()")) {
      continue;
    }
    env[key] = value;
  }
  return env;
}

// mcp-stdio/create-child-process.ts
function createChildProcess(config, signal) {
  var _a2, _b;
  return spawn(config.command, (_a2 = config.args) != null ? _a2 : [], {
    env: getEnvironment(config.env),
    stdio: ["pipe", "pipe", (_b = config.stderr) != null ? _b : "inherit"],
    shell: false,
    signal,
    windowsHide: globalThis.process.platform === "win32" && isElectron(),
    cwd: config.cwd
  });
}
function isElectron() {
  return "type" in globalThis.process;
}

// mcp-stdio/mcp-stdio-transport.ts
var StdioMCPTransport = class {
  constructor(server) {
    this.abortController = new AbortController();
    this.readBuffer = new ReadBuffer();
    this.serverParams = server;
  }
  async start() {
    if (this.process) {
      throw new MCPClientError({
        message: "StdioMCPTransport already started."
      });
    }
    return new Promise((resolve, reject) => {
      var _a2, _b, _c, _d;
      try {
        const process = createChildProcess(
          this.serverParams,
          this.abortController.signal
        );
        this.process = process;
        this.process.on("error", (error) => {
          var _a3, _b2;
          if (error.name === "AbortError") {
            (_a3 = this.onclose) == null ? void 0 : _a3.call(this);
            return;
          }
          reject(error);
          (_b2 = this.onerror) == null ? void 0 : _b2.call(this, error);
        });
        this.process.on("spawn", () => {
          resolve();
        });
        this.process.on("close", (_code) => {
          var _a3;
          this.process = void 0;
          (_a3 = this.onclose) == null ? void 0 : _a3.call(this);
        });
        (_a2 = this.process.stdin) == null ? void 0 : _a2.on("error", (error) => {
          var _a3;
          (_a3 = this.onerror) == null ? void 0 : _a3.call(this, error);
        });
        (_b = this.process.stdout) == null ? void 0 : _b.on("data", (chunk) => {
          this.readBuffer.append(chunk);
          this.processReadBuffer();
        });
        (_c = this.process.stdout) == null ? void 0 : _c.on("error", (error) => {
          var _a3;
          (_a3 = this.onerror) == null ? void 0 : _a3.call(this, error);
        });
      } catch (error) {
        reject(error);
        (_d = this.onerror) == null ? void 0 : _d.call(this, error);
      }
    });
  }
  processReadBuffer() {
    var _a2, _b;
    while (true) {
      try {
        const message = this.readBuffer.readMessage();
        if (message === null) {
          break;
        }
        (_a2 = this.onmessage) == null ? void 0 : _a2.call(this, message);
      } catch (error) {
        (_b = this.onerror) == null ? void 0 : _b.call(this, error);
      }
    }
  }
  async close() {
    this.abortController.abort();
    this.process = void 0;
    this.readBuffer.clear();
  }
  send(message) {
    return new Promise((resolve) => {
      var _a2;
      if (!((_a2 = this.process) == null ? void 0 : _a2.stdin)) {
        throw new MCPClientError({
          message: "StdioClientTransport not connected"
        });
      }
      const json = serializeMessage(message);
      if (this.process.stdin.write(json)) {
        resolve();
      } else {
        this.process.stdin.once("drain", resolve);
      }
    });
  }
};
var ReadBuffer = class {
  append(chunk) {
    this.buffer = this.buffer ? Buffer.concat([this.buffer, chunk]) : chunk;
  }
  readMessage() {
    if (!this.buffer)
      return null;
    const index = this.buffer.indexOf("\n");
    if (index === -1) {
      return null;
    }
    const line = this.buffer.toString("utf8", 0, index);
    this.buffer = this.buffer.subarray(index + 1);
    return deserializeMessage(line);
  }
  clear() {
    this.buffer = void 0;
  }
};
function serializeMessage(message) {
  return JSON.stringify(message) + "\n";
}
function deserializeMessage(line) {
  return JSONRPCMessageSchema.parse(JSON.parse(line));
}
export {
  StdioMCPTransport as Experimental_StdioMCPTransport
};
//# sourceMappingURL=index.mjs.map