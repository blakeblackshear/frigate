"use strict";

const os = require("os");
const path = require("path");
const url = require("url");
const util = require("util");
const fs = require("graceful-fs");
const ipaddr = require("ipaddr.js");
const { validate } = require("schema-utils");
const schema = require("./options.json");

/** @typedef {import("schema-utils/declarations/validate").Schema} Schema */
/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").MultiCompiler} MultiCompiler */
/** @typedef {import("webpack").Configuration} WebpackConfiguration */
/** @typedef {import("webpack").StatsOptions} StatsOptions */
/** @typedef {import("webpack").StatsCompilation} StatsCompilation */
/** @typedef {import("webpack").Stats} Stats */
/** @typedef {import("webpack").MultiStats} MultiStats */
/** @typedef {import("os").NetworkInterfaceInfo} NetworkInterfaceInfo */
/** @typedef {import("chokidar").WatchOptions} WatchOptions */
/** @typedef {import("chokidar").FSWatcher} FSWatcher */
/** @typedef {import("connect-history-api-fallback").Options} ConnectHistoryApiFallbackOptions */
/** @typedef {import("bonjour-service").Bonjour} Bonjour */
/** @typedef {import("bonjour-service").Service} BonjourOptions */
/** @typedef {import("http-proxy-middleware").RequestHandler} RequestHandler */
/** @typedef {import("http-proxy-middleware").Options} HttpProxyMiddlewareOptions */
/** @typedef {import("http-proxy-middleware").Filter} HttpProxyMiddlewareOptionsFilter */
/** @typedef {import("serve-index").Options} ServeIndexOptions */
/** @typedef {import("serve-static").ServeStaticOptions} ServeStaticOptions */
/** @typedef {import("ipaddr.js").IPv4} IPv4 */
/** @typedef {import("ipaddr.js").IPv6} IPv6 */
/** @typedef {import("net").Socket} Socket */
/** @typedef {import("http").Server} HTTPServer*/
/** @typedef {import("http").IncomingMessage} IncomingMessage */
/** @typedef {import("http").ServerResponse} ServerResponse */
/** @typedef {import("open").Options} OpenOptions */
/** @typedef {import("express").Application} ExpressApplication */
/** @typedef {import("express").RequestHandler} ExpressRequestHandler */
/** @typedef {import("express").ErrorRequestHandler} ExpressErrorRequestHandler */
/** @typedef {import("express").Request} ExpressRequest */
/** @typedef {import("express").Response} ExpressResponse */

/** @typedef {(err?: any) => void} NextFunction */
/** @typedef {(req: IncomingMessage, res: ServerResponse) => void} SimpleHandleFunction */
/** @typedef {(req: IncomingMessage, res: ServerResponse, next: NextFunction) => void} NextHandleFunction */
/** @typedef {(err: any, req: IncomingMessage, res: ServerResponse, next: NextFunction) => void} ErrorHandleFunction */
/** @typedef {SimpleHandleFunction | NextHandleFunction | ErrorHandleFunction} HandleFunction */

/** @typedef {import("https").ServerOptions & { spdy?: { plain?: boolean | undefined, ssl?: boolean | undefined, 'x-forwarded-for'?: string | undefined, protocol?: string | undefined, protocols?: string[] | undefined }}} ServerOptions */

/**
 * @template {BasicApplication} [T=ExpressApplication]
 * @typedef {T extends ExpressApplication ? ExpressRequest : IncomingMessage} Request
 */
/**
 * @template {BasicApplication} [T=ExpressApplication]
 * @typedef {T extends ExpressApplication ? ExpressResponse : ServerResponse} Response
 */

/**
 * @template {Request} T
 * @template {Response} U
 * @typedef {import("webpack-dev-middleware").Options<T, U>} DevMiddlewareOptions
 */

/**
 * @template {Request} T
 * @template {Response} U
 * @typedef {import("webpack-dev-middleware").Context<T, U>} DevMiddlewareContext
 */

/**
 * @typedef {"local-ip" | "local-ipv4" | "local-ipv6" | string} Host
 */

/**
 * @typedef {number | string | "auto"} Port
 */

/**
 * @typedef {Object} WatchFiles
 * @property {string | string[]} paths
 * @property {WatchOptions & { aggregateTimeout?: number, ignored?: WatchOptions["ignored"], poll?: number | boolean }} [options]
 */

/**
 * @typedef {Object} Static
 * @property {string} [directory]
 * @property {string | string[]} [publicPath]
 * @property {boolean | ServeIndexOptions} [serveIndex]
 * @property {ServeStaticOptions} [staticOptions]
 * @property {boolean | WatchOptions & { aggregateTimeout?: number, ignored?: WatchOptions["ignored"], poll?: number | boolean }} [watch]
 */

/**
 * @typedef {Object} NormalizedStatic
 * @property {string} directory
 * @property {string[]} publicPath
 * @property {false | ServeIndexOptions} serveIndex
 * @property {ServeStaticOptions} staticOptions
 * @property {false | WatchOptions} watch
 */

/**
 * @template {BasicApplication} [A=ExpressApplication]
 * @template {BasicServer} [S=import("http").Server]
 * @typedef {"http" | "https" | "spdy" | "http2" | string | function(ServerOptions, A): S} ServerType
 */

/**
 * @template {BasicApplication} [A=ExpressApplication]
 * @template {BasicServer} [S=import("http").Server]
 * @typedef {Object} ServerConfiguration
 * @property {ServerType<A, S>} [type]
 * @property {ServerOptions} [options]
 */

/**
 * @typedef {Object} WebSocketServerConfiguration
 * @property {"sockjs" | "ws" | string | Function} [type]
 * @property {Record<string, any>} [options]
 */

/**
 * @typedef {(import("ws").WebSocket | import("sockjs").Connection & { send: import("ws").WebSocket["send"], terminate: import("ws").WebSocket["terminate"], ping: import("ws").WebSocket["ping"] }) & { isAlive?: boolean }} ClientConnection
 */

/**
 * @typedef {import("ws").WebSocketServer | import("sockjs").Server & { close: import("ws").WebSocketServer["close"] }} WebSocketServer
 */

/**
 * @typedef {{ implementation: WebSocketServer, clients: ClientConnection[] }} WebSocketServerImplementation
 */

/**
 * @callback ByPass
 * @param {Request} req
 * @param {Response} res
 * @param {ProxyConfigArrayItem} proxyConfig
 */

/**
 * @typedef {{ path?: HttpProxyMiddlewareOptionsFilter | undefined, context?: HttpProxyMiddlewareOptionsFilter | undefined } & { bypass?: ByPass } & HttpProxyMiddlewareOptions } ProxyConfigArrayItem
 */

/**
 * @typedef {(ProxyConfigArrayItem | ((req?: Request | undefined, res?: Response | undefined, next?: NextFunction | undefined) => ProxyConfigArrayItem))[]} ProxyConfigArray
 */

/**
 * @typedef {Object} OpenApp
 * @property {string} [name]
 * @property {string[]} [arguments]
 */

/**
 * @typedef {Object} Open
 * @property {string | string[] | OpenApp} [app]
 * @property {string | string[]} [target]
 */

/**
 * @typedef {Object} NormalizedOpen
 * @property {string} target
 * @property {import("open").Options} options
 */

/**
 * @typedef {Object} WebSocketURL
 * @property {string} [hostname]
 * @property {string} [password]
 * @property {string} [pathname]
 * @property {number | string} [port]
 * @property {string} [protocol]
 * @property {string} [username]
 */

/**
 * @typedef {boolean | ((error: Error) => void)} OverlayMessageOptions
 */

/**
 * @typedef {Object} ClientConfiguration
 * @property {"log" | "info" | "warn" | "error" | "none" | "verbose"} [logging]
 * @property {boolean  | { warnings?: OverlayMessageOptions, errors?: OverlayMessageOptions, runtimeErrors?: OverlayMessageOptions }} [overlay]
 * @property {boolean} [progress]
 * @property {boolean | number} [reconnect]
 * @property {"ws" | "sockjs" | string} [webSocketTransport]
 * @property {string | WebSocketURL} [webSocketURL]
 */

/**
 * @typedef {Array<{ key: string; value: string }> | Record<string, string | string[]>} Headers
 */

/**
 * @template {BasicApplication} [T=ExpressApplication]
 * @typedef {T extends ExpressApplication ? ExpressRequestHandler | ExpressErrorRequestHandler : HandleFunction} MiddlewareHandler
 */

/**
 * @typedef {{ name?: string, path?: string, middleware: MiddlewareHandler }} MiddlewareObject
 */

/**
 * @typedef {MiddlewareObject | MiddlewareHandler } Middleware
 */

/** @typedef {import("net").Server | import("tls").Server} BasicServer */

/**
 * @template {BasicApplication} [A=ExpressApplication]
 * @template {BasicServer} [S=import("http").Server]
 * @typedef {Object} Configuration
 * @property {boolean | string} [ipc]
 * @property {Host} [host]
 * @property {Port} [port]
 * @property {boolean | "only"} [hot]
 * @property {boolean} [liveReload]
 * @property {DevMiddlewareOptions<Request, Response>} [devMiddleware]
 * @property {boolean} [compress]
 * @property {"auto" | "all" | string | string[]} [allowedHosts]
 * @property {boolean | ConnectHistoryApiFallbackOptions} [historyApiFallback]
 * @property {boolean | Record<string, never> | BonjourOptions} [bonjour]
 * @property {string | string[] | WatchFiles | Array<string | WatchFiles>} [watchFiles]
 * @property {boolean | string | Static | Array<string | Static>} [static]
 * @property {ServerType<A, S> | ServerConfiguration<A, S>} [server]
 * @property {() => Promise<A>} [app]
 * @property {boolean | "sockjs" | "ws" | string | WebSocketServerConfiguration} [webSocketServer]
 * @property {ProxyConfigArray} [proxy]
 * @property {boolean | string | Open | Array<string | Open>} [open]
 * @property {boolean} [setupExitSignals]
 * @property {boolean | ClientConfiguration} [client]
 * @property {Headers | ((req: Request, res: Response, context: DevMiddlewareContext<Request, Response> | undefined) => Headers)} [headers]
 * @property {(devServer: Server<A, S>) => void} [onListening]
 * @property {(middlewares: Middleware[], devServer: Server<A, S>) => Middleware[]} [setupMiddlewares]
 */

if (!process.env.WEBPACK_SERVE) {
  process.env.WEBPACK_SERVE = "true";
}

/**
 * @template T
 * @param fn {(function(): any) | undefined}
 * @returns {function(): T}
 */
const memoize = (fn) => {
  let cache = false;
  /** @type {T} */
  let result;

  return () => {
    if (cache) {
      return result;
    }

    result = /** @type {function(): any} */ (fn)();
    cache = true;
    // Allow to clean up memory for fn
    // and all dependent resources
    // eslint-disable-next-line no-undefined
    fn = undefined;

    return result;
  };
};

const getExpress = memoize(() => require("express"));

/**
 *
 * @param {OverlayMessageOptions} [setting]
 * @returns
 */
const encodeOverlaySettings = (setting) =>
  typeof setting === "function"
    ? encodeURIComponent(setting.toString())
    : setting;

// Working for overload, because typescript doesn't support this yes
/**
 * @overload
 * @param {NextHandleFunction} fn
 * @returns {BasicApplication}
 */
/**
 * @overload
 * @param {HandleFunction} fn
 * @returns {BasicApplication}
 */
/**
 * @overload
 * @param {string} route
 * @param {NextHandleFunction} fn
 * @returns {BasicApplication}
 */
/**
 * @param {string} route
 * @param {HandleFunction} fn
 * @returns {BasicApplication}
 */
// eslint-disable-next-line no-unused-vars
function useFn(route, fn) {
  return /** @type {BasicApplication} */ ({});
}

const DEFAULT_ALLOWED_PROTOCOLS = /^(file|.+-extension):/i;

/**
 * @typedef {Object} BasicApplication
 * @property {typeof useFn} use
 */

/**
 * @template {BasicApplication} [A=ExpressApplication]
 * @template {BasicServer} [S=HTTPServer]
 */
class Server {
  /**
   * @param {Configuration<A, S>} options
   * @param {Compiler | MultiCompiler} compiler
   */
  constructor(options = {}, compiler) {
    validate(/** @type {Schema} */ (schema), options, {
      name: "Dev Server",
      baseDataPath: "options",
    });

    this.compiler = compiler;
    /**
     * @type {ReturnType<Compiler["getInfrastructureLogger"]>}
     * */
    this.logger = this.compiler.getInfrastructureLogger("webpack-dev-server");
    this.options = options;
    /**
     * @type {FSWatcher[]}
     */
    this.staticWatchers = [];
    /**
     * @private
     * @type {{ name: string | symbol, listener: (...args: any[]) => void}[] }}
     */
    this.listeners = [];
    // Keep track of websocket proxies for external websocket upgrade.
    /**
     * @private
     * @type {RequestHandler[]}
     */
    this.webSocketProxies = [];
    /**
     * @type {Socket[]}
     */
    this.sockets = [];
    /**
     * @private
     * @type {string | undefined}
     */
    // eslint-disable-next-line no-undefined
    this.currentHash = undefined;
  }

  static get schema() {
    return schema;
  }

  /**
   * @private
   * @returns {StatsOptions}
   * @constructor
   */
  static get DEFAULT_STATS() {
    return {
      all: false,
      hash: true,
      warnings: true,
      errors: true,
      errorDetails: false,
    };
  }

  /**
   * @param {string} URL
   * @returns {boolean}
   */
  static isAbsoluteURL(URL) {
    // Don't match Windows paths `c:\`
    if (/^[a-zA-Z]:\\/.test(URL)) {
      return false;
    }

    // Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
    // Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
    return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(URL);
  }

  /**
   * @param {string} gatewayOrFamily or family
   * @param {boolean} [isInternal] ip should be internal
   * @returns {string | undefined}
   */
  static findIp(gatewayOrFamily, isInternal) {
    if (gatewayOrFamily === "v4" || gatewayOrFamily === "v6") {
      let host;

      const networks = Object.values(os.networkInterfaces())
        // eslint-disable-next-line no-shadow
        .flatMap((networks) => networks ?? [])
        .filter((network) => {
          if (!network || !network.address) {
            return false;
          }

          if (network.family !== `IP${gatewayOrFamily}`) {
            return false;
          }

          if (
            typeof isInternal !== "undefined" &&
            network.internal !== isInternal
          ) {
            return false;
          }

          if (gatewayOrFamily === "v6") {
            const range = ipaddr.parse(network.address).range();

            if (
              range !== "ipv4Mapped" &&
              range !== "uniqueLocal" &&
              range !== "loopback"
            ) {
              return false;
            }
          }

          return network.address;
        });

      if (networks.length > 0) {
        // Take the first network found
        host = networks[0].address;

        if (host.includes(":")) {
          host = `[${host}]`;
        }
      }

      return host;
    }

    const gatewayIp = ipaddr.parse(gatewayOrFamily);

    // Look for the matching interface in all local interfaces.
    for (const addresses of Object.values(os.networkInterfaces())) {
      for (const { cidr } of /** @type {NetworkInterfaceInfo[]} */ (
        addresses
      )) {
        const net = ipaddr.parseCIDR(/** @type {string} */ (cidr));

        if (
          net[0] &&
          net[0].kind() === gatewayIp.kind() &&
          gatewayIp.match(net)
        ) {
          return net[0].toString();
        }
      }
    }
  }

  // TODO remove me in the next major release, we have `findIp`
  /**
   * @param {"v4" | "v6"} family
   * @returns {Promise<string | undefined>}
   */
  static async internalIP(family) {
    return Server.findIp(family, false);
  }

  // TODO remove me in the next major release, we have `findIp`
  /**
   * @param {"v4" | "v6"} family
   * @returns {string | undefined}
   */
  static internalIPSync(family) {
    return Server.findIp(family, false);
  }

  /**
   * @param {Host} hostname
   * @returns {Promise<string>}
   */
  static async getHostname(hostname) {
    if (hostname === "local-ip") {
      return (
        Server.findIp("v4", false) || Server.findIp("v6", false) || "0.0.0.0"
      );
    } else if (hostname === "local-ipv4") {
      return Server.findIp("v4", false) || "0.0.0.0";
    } else if (hostname === "local-ipv6") {
      return Server.findIp("v6", false) || "::";
    }

    return hostname;
  }

  /**
   * @param {Port} port
   * @param {string} host
   * @returns {Promise<number | string>}
   */
  static async getFreePort(port, host) {
    if (typeof port !== "undefined" && port !== null && port !== "auto") {
      return port;
    }

    const pRetry = (await import("p-retry")).default;
    const getPort = require("./getPort");
    const basePort =
      typeof process.env.WEBPACK_DEV_SERVER_BASE_PORT !== "undefined"
        ? parseInt(process.env.WEBPACK_DEV_SERVER_BASE_PORT, 10)
        : 8080;

    // Try to find unused port and listen on it for 3 times,
    // if port is not specified in options.
    const defaultPortRetry =
      typeof process.env.WEBPACK_DEV_SERVER_PORT_RETRY !== "undefined"
        ? parseInt(process.env.WEBPACK_DEV_SERVER_PORT_RETRY, 10)
        : 3;

    return pRetry(() => getPort(basePort, host), {
      retries: defaultPortRetry,
    });
  }

  /**
   * @returns {string}
   */
  static findCacheDir() {
    const cwd = process.cwd();

    /**
     * @type {string | undefined}
     */
    let dir = cwd;

    for (;;) {
      try {
        if (fs.statSync(path.join(dir, "package.json")).isFile()) break;
        // eslint-disable-next-line no-empty
      } catch (e) {}

      const parent = path.dirname(dir);

      if (dir === parent) {
        // eslint-disable-next-line no-undefined
        dir = undefined;
        break;
      }

      dir = parent;
    }

    if (!dir) {
      return path.resolve(cwd, ".cache/webpack-dev-server");
    } else if (process.versions.pnp === "1") {
      return path.resolve(dir, ".pnp/.cache/webpack-dev-server");
    } else if (process.versions.pnp === "3") {
      return path.resolve(dir, ".yarn/.cache/webpack-dev-server");
    }

    return path.resolve(dir, "node_modules/.cache/webpack-dev-server");
  }

  /**
   * @private
   * @param {Compiler} compiler
   * @returns bool
   */
  static isWebTarget(compiler) {
    if (compiler.platform && compiler.platform.web) {
      return compiler.platform.web;
    }

    // TODO improve for the next major version and keep only `webTargets` to fallback for old versions
    if (
      compiler.options.externalsPresets &&
      compiler.options.externalsPresets.web
    ) {
      return true;
    }

    if (
      compiler.options.resolve.conditionNames &&
      compiler.options.resolve.conditionNames.includes("browser")
    ) {
      return true;
    }

    const webTargets = [
      "web",
      "webworker",
      "electron-preload",
      "electron-renderer",
      "nwjs",
      "node-webkit",
      // eslint-disable-next-line no-undefined
      undefined,
      null,
    ];

    if (Array.isArray(compiler.options.target)) {
      return compiler.options.target.some((r) => webTargets.includes(r));
    }

    return webTargets.includes(/** @type {string} */ (compiler.options.target));
  }

  /**
   * @private
   * @param {Compiler} compiler
   */
  addAdditionalEntries(compiler) {
    /**
     * @type {string[]}
     */
    const additionalEntries = [];
    const isWebTarget = Server.isWebTarget(compiler);

    // TODO maybe empty client
    if (this.options.client && isWebTarget) {
      let webSocketURLStr = "";

      if (this.options.webSocketServer) {
        const webSocketURL =
          /** @type {WebSocketURL} */
          (
            /** @type {ClientConfiguration} */
            (this.options.client).webSocketURL
          );
        const webSocketServer =
          /** @type {{ type: WebSocketServerConfiguration["type"], options: NonNullable<WebSocketServerConfiguration["options"]> }} */
          (this.options.webSocketServer);
        const searchParams = new URLSearchParams();

        /** @type {string} */
        let protocol;

        // We are proxying dev server and need to specify custom `hostname`
        if (typeof webSocketURL.protocol !== "undefined") {
          protocol = webSocketURL.protocol;
        } else {
          protocol = this.isTlsServer ? "wss:" : "ws:";
        }

        searchParams.set("protocol", protocol);

        if (typeof webSocketURL.username !== "undefined") {
          searchParams.set("username", webSocketURL.username);
        }

        if (typeof webSocketURL.password !== "undefined") {
          searchParams.set("password", webSocketURL.password);
        }

        /** @type {string} */
        let hostname;

        // SockJS is not supported server mode, so `hostname` and `port` can't specified, let's ignore them
        const isSockJSType = webSocketServer.type === "sockjs";
        const isWebSocketServerHostDefined =
          typeof webSocketServer.options.host !== "undefined";
        const isWebSocketServerPortDefined =
          typeof webSocketServer.options.port !== "undefined";

        if (
          isSockJSType &&
          (isWebSocketServerHostDefined || isWebSocketServerPortDefined)
        ) {
          this.logger.warn(
            "SockJS only supports client mode and does not support custom hostname and port options. Please consider using 'ws' if you need to customize these options.",
          );
        }

        // We are proxying dev server and need to specify custom `hostname`
        if (typeof webSocketURL.hostname !== "undefined") {
          hostname = webSocketURL.hostname;
        }
        // Web socket server works on custom `hostname`, only for `ws` because `sock-js` is not support custom `hostname`
        else if (isWebSocketServerHostDefined && !isSockJSType) {
          hostname = webSocketServer.options.host;
        }
        // The `host` option is specified
        else if (typeof this.options.host !== "undefined") {
          hostname = this.options.host;
        }
        // The `port` option is not specified
        else {
          hostname = "0.0.0.0";
        }

        searchParams.set("hostname", hostname);

        /** @type {number | string} */
        let port;

        // We are proxying dev server and need to specify custom `port`
        if (typeof webSocketURL.port !== "undefined") {
          port = webSocketURL.port;
        }
        // Web socket server works on custom `port`, only for `ws` because `sock-js` is not support custom `port`
        else if (isWebSocketServerPortDefined && !isSockJSType) {
          port = webSocketServer.options.port;
        }
        // The `port` option is specified
        else if (typeof this.options.port === "number") {
          port = this.options.port;
        }
        // The `port` option is specified using `string`
        else if (
          typeof this.options.port === "string" &&
          this.options.port !== "auto"
        ) {
          port = Number(this.options.port);
        }
        // The `port` option is not specified or set to `auto`
        else {
          port = "0";
        }

        searchParams.set("port", String(port));

        /** @type {string} */
        let pathname = "";

        // We are proxying dev server and need to specify custom `pathname`
        if (typeof webSocketURL.pathname !== "undefined") {
          pathname = webSocketURL.pathname;
        }
        // Web socket server works on custom `path`
        else if (
          typeof webSocketServer.options.prefix !== "undefined" ||
          typeof webSocketServer.options.path !== "undefined"
        ) {
          pathname =
            webSocketServer.options.prefix || webSocketServer.options.path;
        }

        searchParams.set("pathname", pathname);

        const client = /** @type {ClientConfiguration} */ (this.options.client);

        if (typeof client.logging !== "undefined") {
          searchParams.set("logging", client.logging);
        }

        if (typeof client.progress !== "undefined") {
          searchParams.set("progress", String(client.progress));
        }

        if (typeof client.overlay !== "undefined") {
          const overlayString =
            typeof client.overlay === "boolean"
              ? String(client.overlay)
              : JSON.stringify({
                  ...client.overlay,
                  errors: encodeOverlaySettings(client.overlay.errors),
                  warnings: encodeOverlaySettings(client.overlay.warnings),
                  runtimeErrors: encodeOverlaySettings(
                    client.overlay.runtimeErrors,
                  ),
                });

          searchParams.set("overlay", overlayString);
        }

        if (typeof client.reconnect !== "undefined") {
          searchParams.set(
            "reconnect",
            typeof client.reconnect === "number"
              ? String(client.reconnect)
              : "10",
          );
        }

        if (typeof this.options.hot !== "undefined") {
          searchParams.set("hot", String(this.options.hot));
        }

        if (typeof this.options.liveReload !== "undefined") {
          searchParams.set("live-reload", String(this.options.liveReload));
        }

        webSocketURLStr = searchParams.toString();
      }

      additionalEntries.push(`${this.getClientEntry()}?${webSocketURLStr}`);
    }

    const clientHotEntry = this.getClientHotEntry();
    if (clientHotEntry) {
      additionalEntries.push(clientHotEntry);
    }

    const webpack = compiler.webpack || require("webpack");

    // use a hook to add entries if available
    for (const additionalEntry of additionalEntries) {
      new webpack.EntryPlugin(compiler.context, additionalEntry, {
        // eslint-disable-next-line no-undefined
        name: undefined,
      }).apply(compiler);
    }
  }

  /**
   * @private
   * @returns {Compiler["options"]}
   */
  getCompilerOptions() {
    if (
      typeof (/** @type {MultiCompiler} */ (this.compiler).compilers) !==
      "undefined"
    ) {
      if (/** @type {MultiCompiler} */ (this.compiler).compilers.length === 1) {
        return (
          /** @type {MultiCompiler} */
          (this.compiler).compilers[0].options
        );
      }

      // Configuration with the `devServer` options
      const compilerWithDevServer =
        /** @type {MultiCompiler} */
        (this.compiler).compilers.find((config) => config.options.devServer);

      if (compilerWithDevServer) {
        return compilerWithDevServer.options;
      }

      // Configuration with `web` preset
      const compilerWithWebPreset =
        /** @type {MultiCompiler} */
        (this.compiler).compilers.find(
          (config) =>
            (config.options.externalsPresets &&
              config.options.externalsPresets.web) ||
            [
              "web",
              "webworker",
              "electron-preload",
              "electron-renderer",
              "node-webkit",
              // eslint-disable-next-line no-undefined
              undefined,
              null,
            ].includes(/** @type {string} */ (config.options.target)),
        );

      if (compilerWithWebPreset) {
        return compilerWithWebPreset.options;
      }

      // Fallback
      return /** @type {MultiCompiler} */ (this.compiler).compilers[0].options;
    }

    return /** @type {Compiler} */ (this.compiler).options;
  }

  /**
   * @private
   * @returns {Promise<void>}
   */
  async normalizeOptions() {
    const { options } = this;
    const compilerOptions = this.getCompilerOptions();
    const compilerWatchOptions = compilerOptions.watchOptions;
    /**
     * @param {WatchOptions & { aggregateTimeout?: number, ignored?: WatchOptions["ignored"], poll?: number | boolean }} watchOptions
     * @returns {WatchOptions}
     */
    const getWatchOptions = (watchOptions = {}) => {
      const getPolling = () => {
        if (typeof watchOptions.usePolling !== "undefined") {
          return watchOptions.usePolling;
        }

        if (typeof watchOptions.poll !== "undefined") {
          return Boolean(watchOptions.poll);
        }

        if (typeof compilerWatchOptions.poll !== "undefined") {
          return Boolean(compilerWatchOptions.poll);
        }

        return false;
      };
      const getInterval = () => {
        if (typeof watchOptions.interval !== "undefined") {
          return watchOptions.interval;
        }

        if (typeof watchOptions.poll === "number") {
          return watchOptions.poll;
        }

        if (typeof compilerWatchOptions.poll === "number") {
          return compilerWatchOptions.poll;
        }
      };

      const usePolling = getPolling();
      const interval = getInterval();
      const { poll, ...rest } = watchOptions;

      return {
        ignoreInitial: true,
        persistent: true,
        followSymlinks: false,
        atomic: false,
        alwaysStat: true,
        ignorePermissionErrors: true,
        // Respect options from compiler watchOptions
        usePolling,
        interval,
        ignored: watchOptions.ignored,
        // TODO: we respect these options for all watch options and allow developers to pass them to chokidar, but chokidar doesn't have these options maybe we need revisit that in future
        ...rest,
      };
    };
    /**
     * @param {string | Static | undefined} [optionsForStatic]
     * @returns {NormalizedStatic}
     */
    const getStaticItem = (optionsForStatic) => {
      const getDefaultStaticOptions = () => {
        return {
          directory: path.join(process.cwd(), "public"),
          staticOptions: {},
          publicPath: ["/"],
          serveIndex: { icons: true },
          watch: getWatchOptions(),
        };
      };

      /** @type {NormalizedStatic} */
      let item;

      if (typeof optionsForStatic === "undefined") {
        item = getDefaultStaticOptions();
      } else if (typeof optionsForStatic === "string") {
        item = {
          ...getDefaultStaticOptions(),
          directory: optionsForStatic,
        };
      } else {
        const def = getDefaultStaticOptions();

        item = {
          directory:
            typeof optionsForStatic.directory !== "undefined"
              ? optionsForStatic.directory
              : def.directory,
          staticOptions:
            typeof optionsForStatic.staticOptions !== "undefined"
              ? { ...def.staticOptions, ...optionsForStatic.staticOptions }
              : def.staticOptions,
          publicPath:
            // eslint-disable-next-line no-nested-ternary
            typeof optionsForStatic.publicPath !== "undefined"
              ? Array.isArray(optionsForStatic.publicPath)
                ? optionsForStatic.publicPath
                : [optionsForStatic.publicPath]
              : def.publicPath,
          serveIndex:
            // Check if 'serveIndex' property is defined in 'optionsForStatic'
            // If 'serveIndex' is a boolean and true, use default 'serveIndex'
            // If 'serveIndex' is an object, merge its properties with default 'serveIndex'
            // If 'serveIndex' is neither a boolean true nor an object, use it as-is
            // If 'serveIndex' is not defined in 'optionsForStatic', use default 'serveIndex'
            // eslint-disable-next-line no-nested-ternary
            typeof optionsForStatic.serveIndex !== "undefined"
              ? // eslint-disable-next-line no-nested-ternary
                typeof optionsForStatic.serveIndex === "boolean" &&
                optionsForStatic.serveIndex
                ? def.serveIndex
                : typeof optionsForStatic.serveIndex === "object"
                  ? { ...def.serveIndex, ...optionsForStatic.serveIndex }
                  : optionsForStatic.serveIndex
              : def.serveIndex,
          watch:
            // eslint-disable-next-line no-nested-ternary
            typeof optionsForStatic.watch !== "undefined"
              ? // eslint-disable-next-line no-nested-ternary
                typeof optionsForStatic.watch === "boolean"
                ? optionsForStatic.watch
                  ? def.watch
                  : false
                : getWatchOptions(optionsForStatic.watch)
              : def.watch,
        };
      }

      if (Server.isAbsoluteURL(item.directory)) {
        throw new Error("Using a URL as static.directory is not supported");
      }

      return item;
    };

    if (typeof options.allowedHosts === "undefined") {
      // AllowedHosts allows some default hosts picked from `options.host` or `webSocketURL.hostname` and `localhost`
      options.allowedHosts = "auto";
    }
    // We store allowedHosts as array when supplied as string
    else if (
      typeof options.allowedHosts === "string" &&
      options.allowedHosts !== "auto" &&
      options.allowedHosts !== "all"
    ) {
      options.allowedHosts = [options.allowedHosts];
    }
    // CLI pass options as array, we should normalize them
    else if (
      Array.isArray(options.allowedHosts) &&
      options.allowedHosts.includes("all")
    ) {
      options.allowedHosts = "all";
    }

    if (typeof options.bonjour === "undefined") {
      options.bonjour = false;
    } else if (typeof options.bonjour === "boolean") {
      options.bonjour = options.bonjour ? {} : false;
    }

    if (
      typeof options.client === "undefined" ||
      (typeof options.client === "object" && options.client !== null)
    ) {
      if (!options.client) {
        options.client = {};
      }

      if (typeof options.client.webSocketURL === "undefined") {
        options.client.webSocketURL = {};
      } else if (typeof options.client.webSocketURL === "string") {
        const parsedURL = new URL(options.client.webSocketURL);

        options.client.webSocketURL = {
          protocol: parsedURL.protocol,
          hostname: parsedURL.hostname,
          port: parsedURL.port.length > 0 ? Number(parsedURL.port) : "",
          pathname: parsedURL.pathname,
          username: parsedURL.username,
          password: parsedURL.password,
        };
      } else if (typeof options.client.webSocketURL.port === "string") {
        options.client.webSocketURL.port = Number(
          options.client.webSocketURL.port,
        );
      }

      // Enable client overlay by default
      if (typeof options.client.overlay === "undefined") {
        options.client.overlay = true;
      } else if (typeof options.client.overlay !== "boolean") {
        options.client.overlay = {
          errors: true,
          warnings: true,
          ...options.client.overlay,
        };
      }

      if (typeof options.client.reconnect === "undefined") {
        options.client.reconnect = 10;
      } else if (options.client.reconnect === true) {
        options.client.reconnect = Infinity;
      } else if (options.client.reconnect === false) {
        options.client.reconnect = 0;
      }

      // Respect infrastructureLogging.level
      if (typeof options.client.logging === "undefined") {
        options.client.logging = compilerOptions.infrastructureLogging
          ? compilerOptions.infrastructureLogging.level
          : "info";
      }
    }

    if (typeof options.compress === "undefined") {
      options.compress = true;
    }

    if (typeof options.devMiddleware === "undefined") {
      options.devMiddleware = {};
    }

    // No need to normalize `headers`

    if (typeof options.historyApiFallback === "undefined") {
      options.historyApiFallback = false;
    } else if (
      typeof options.historyApiFallback === "boolean" &&
      options.historyApiFallback
    ) {
      options.historyApiFallback = {};
    }

    // No need to normalize `host`

    options.hot =
      typeof options.hot === "boolean" || options.hot === "only"
        ? options.hot
        : true;

    if (
      typeof options.server === "function" ||
      typeof options.server === "string"
    ) {
      options.server = {
        type: options.server,
        options: {},
      };
    } else {
      const serverOptions =
        /** @type {ServerConfiguration<A, S>} */
        (options.server || {});

      options.server = {
        type: serverOptions.type || "http",
        options: { ...serverOptions.options },
      };
    }

    const serverOptions = /** @type {ServerOptions} */ (options.server.options);

    if (
      options.server.type === "spdy" &&
      typeof serverOptions.spdy === "undefined"
    ) {
      serverOptions.spdy = { protocols: ["h2", "http/1.1"] };
    }

    if (
      options.server.type === "https" ||
      options.server.type === "http2" ||
      options.server.type === "spdy"
    ) {
      if (typeof serverOptions.requestCert === "undefined") {
        serverOptions.requestCert = false;
      }

      const httpsProperties =
        /** @type {Array<keyof ServerOptions>} */
        (["ca", "cert", "crl", "key", "pfx"]);

      for (const property of httpsProperties) {
        if (typeof serverOptions[property] === "undefined") {
          // eslint-disable-next-line no-continue
          continue;
        }

        /** @type {any} */
        const value = serverOptions[property];
        /**
         * @param {string | Buffer | undefined} item
         * @returns {string | Buffer | undefined}
         */
        const readFile = (item) => {
          if (
            Buffer.isBuffer(item) ||
            (typeof item === "object" && item !== null && !Array.isArray(item))
          ) {
            return item;
          }

          if (item) {
            let stats = null;

            try {
              stats = fs.lstatSync(fs.realpathSync(item)).isFile();
            } catch (error) {
              // Ignore error
            }

            // It is a file
            return stats ? fs.readFileSync(item) : item;
          }
        };

        /** @type {any} */
        (serverOptions)[property] = Array.isArray(value)
          ? value.map((item) => readFile(item))
          : readFile(value);
      }

      let fakeCert;

      if (!serverOptions.key || !serverOptions.cert) {
        const certificateDir = Server.findCacheDir();
        const certificatePath = path.join(certificateDir, "server.pem");
        let certificateExists;

        try {
          const certificate = await fs.promises.stat(certificatePath);
          certificateExists = certificate.isFile();
        } catch {
          certificateExists = false;
        }

        if (certificateExists) {
          const certificateTtl = 1000 * 60 * 60 * 24;
          const certificateStat = await fs.promises.stat(certificatePath);
          const now = Number(new Date());

          // cert is more than 30 days old, kill it with fire
          if ((now - Number(certificateStat.ctime)) / certificateTtl > 30) {
            this.logger.info(
              "SSL certificate is more than 30 days old. Removing...",
            );

            await fs.promises.rm(certificatePath, { recursive: true });

            certificateExists = false;
          }
        }

        if (!certificateExists) {
          this.logger.info("Generating SSL certificate...");

          const selfsigned = require("selfsigned");
          const attributes = [{ name: "commonName", value: "localhost" }];
          const pems = selfsigned.generate(attributes, {
            algorithm: "sha256",
            days: 30,
            keySize: 2048,
            extensions: [
              {
                name: "basicConstraints",
                cA: true,
              },
              {
                name: "keyUsage",
                keyCertSign: true,
                digitalSignature: true,
                nonRepudiation: true,
                keyEncipherment: true,
                dataEncipherment: true,
              },
              {
                name: "extKeyUsage",
                serverAuth: true,
                clientAuth: true,
                codeSigning: true,
                timeStamping: true,
              },
              {
                name: "subjectAltName",
                altNames: [
                  {
                    // type 2 is DNS
                    type: 2,
                    value: "localhost",
                  },
                  {
                    type: 2,
                    value: "localhost.localdomain",
                  },
                  {
                    type: 2,
                    value: "lvh.me",
                  },
                  {
                    type: 2,
                    value: "*.lvh.me",
                  },
                  {
                    type: 2,
                    value: "[::1]",
                  },
                  {
                    // type 7 is IP
                    type: 7,
                    ip: "127.0.0.1",
                  },
                  {
                    type: 7,
                    ip: "fe80::1",
                  },
                ],
              },
            ],
          });

          await fs.promises.mkdir(certificateDir, { recursive: true });

          await fs.promises.writeFile(
            certificatePath,
            pems.private + pems.cert,
            {
              encoding: "utf8",
            },
          );
        }

        fakeCert = await fs.promises.readFile(certificatePath);

        this.logger.info(`SSL certificate: ${certificatePath}`);
      }

      serverOptions.key = serverOptions.key || fakeCert;
      serverOptions.cert = serverOptions.cert || fakeCert;
    }

    if (typeof options.ipc === "boolean") {
      const isWindows = process.platform === "win32";
      const pipePrefix = isWindows ? "\\\\.\\pipe\\" : os.tmpdir();
      const pipeName = "webpack-dev-server.sock";

      options.ipc = path.join(pipePrefix, pipeName);
    }

    options.liveReload =
      typeof options.liveReload !== "undefined" ? options.liveReload : true;

    // https://github.com/webpack/webpack-dev-server/issues/1990
    const defaultOpenOptions = { wait: false };
    /**
     * @param {any} target
     * @returns {NormalizedOpen[]}
     */
    const getOpenItemsFromObject = ({ target, ...rest }) => {
      const normalizedOptions = { ...defaultOpenOptions, ...rest };

      if (typeof normalizedOptions.app === "string") {
        normalizedOptions.app = {
          name: normalizedOptions.app,
        };
      }

      const normalizedTarget = typeof target === "undefined" ? "<url>" : target;

      if (Array.isArray(normalizedTarget)) {
        return normalizedTarget.map((singleTarget) => {
          return { target: singleTarget, options: normalizedOptions };
        });
      }

      return [{ target: normalizedTarget, options: normalizedOptions }];
    };

    if (typeof options.open === "undefined") {
      /** @type {NormalizedOpen[]} */
      (options.open) = [];
    } else if (typeof options.open === "boolean") {
      /** @type {NormalizedOpen[]} */
      (options.open) = options.open
        ? [
            {
              target: "<url>",
              options: /** @type {OpenOptions} */ (defaultOpenOptions),
            },
          ]
        : [];
    } else if (typeof options.open === "string") {
      /** @type {NormalizedOpen[]} */
      (options.open) = [{ target: options.open, options: defaultOpenOptions }];
    } else if (Array.isArray(options.open)) {
      /**
       * @type {NormalizedOpen[]}
       */
      const result = [];

      for (const item of options.open) {
        if (typeof item === "string") {
          result.push({ target: item, options: defaultOpenOptions });
          // eslint-disable-next-line no-continue
          continue;
        }

        result.push(...getOpenItemsFromObject(item));
      }

      /** @type {NormalizedOpen[]} */
      (options.open) = result;
    } else {
      /** @type {NormalizedOpen[]} */
      (options.open) = [...getOpenItemsFromObject(options.open)];
    }

    if (typeof options.port === "string" && options.port !== "auto") {
      options.port = Number(options.port);
    }

    /**
     * Assume a proxy configuration specified as:
     * proxy: {
     *   'context': { options }
     * }
     * OR
     * proxy: {
     *   'context': 'target'
     * }
     */
    if (typeof options.proxy !== "undefined") {
      options.proxy = options.proxy.map((item) => {
        if (typeof item === "function") {
          return item;
        }

        /**
         * @param {"info" | "warn" | "error" | "debug" | "silent" | undefined | "none" | "log" | "verbose"} level
         * @returns {"info" | "warn" | "error" | "debug" | "silent" | undefined}
         */
        const getLogLevelForProxy = (level) => {
          if (level === "none") {
            return "silent";
          }

          if (level === "log") {
            return "info";
          }

          if (level === "verbose") {
            return "debug";
          }

          return level;
        };

        if (typeof item.logLevel === "undefined") {
          item.logLevel = getLogLevelForProxy(
            compilerOptions.infrastructureLogging
              ? compilerOptions.infrastructureLogging.level
              : "info",
          );
        }

        if (typeof item.logProvider === "undefined") {
          item.logProvider = () => this.logger;
        }

        return item;
      });
    }

    if (typeof options.setupExitSignals === "undefined") {
      options.setupExitSignals = true;
    }

    if (typeof options.static === "undefined") {
      options.static = [getStaticItem()];
    } else if (typeof options.static === "boolean") {
      options.static = options.static ? [getStaticItem()] : false;
    } else if (typeof options.static === "string") {
      options.static = [getStaticItem(options.static)];
    } else if (Array.isArray(options.static)) {
      options.static = options.static.map((item) => getStaticItem(item));
    } else {
      options.static = [getStaticItem(options.static)];
    }

    if (typeof options.watchFiles === "string") {
      options.watchFiles = [
        { paths: options.watchFiles, options: getWatchOptions() },
      ];
    } else if (
      typeof options.watchFiles === "object" &&
      options.watchFiles !== null &&
      !Array.isArray(options.watchFiles)
    ) {
      options.watchFiles = [
        {
          paths: options.watchFiles.paths,
          options: getWatchOptions(options.watchFiles.options || {}),
        },
      ];
    } else if (Array.isArray(options.watchFiles)) {
      options.watchFiles = options.watchFiles.map((item) => {
        if (typeof item === "string") {
          return { paths: item, options: getWatchOptions() };
        }

        return {
          paths: item.paths,
          options: getWatchOptions(item.options || {}),
        };
      });
    } else {
      options.watchFiles = [];
    }

    const defaultWebSocketServerType = "ws";
    const defaultWebSocketServerOptions = { path: "/ws" };

    if (typeof options.webSocketServer === "undefined") {
      options.webSocketServer = {
        type: defaultWebSocketServerType,
        options: defaultWebSocketServerOptions,
      };
    } else if (
      typeof options.webSocketServer === "boolean" &&
      !options.webSocketServer
    ) {
      options.webSocketServer = false;
    } else if (
      typeof options.webSocketServer === "string" ||
      typeof options.webSocketServer === "function"
    ) {
      options.webSocketServer = {
        type: options.webSocketServer,
        options: defaultWebSocketServerOptions,
      };
    } else {
      options.webSocketServer = {
        type:
          /** @type {WebSocketServerConfiguration} */
          (options.webSocketServer).type || defaultWebSocketServerType,
        options: {
          ...defaultWebSocketServerOptions,
          .../** @type {WebSocketServerConfiguration} */
          (options.webSocketServer).options,
        },
      };

      const webSocketServer =
        /** @type {{ type: WebSocketServerConfiguration["type"], options: NonNullable<WebSocketServerConfiguration["options"]> }} */
        (options.webSocketServer);

      if (typeof webSocketServer.options.port === "string") {
        webSocketServer.options.port = Number(webSocketServer.options.port);
      }
    }
  }

  /**
   * @private
   * @returns {string}
   */
  getClientTransport() {
    let clientImplementation;
    let clientImplementationFound = true;

    const isKnownWebSocketServerImplementation =
      this.options.webSocketServer &&
      typeof (
        /** @type {WebSocketServerConfiguration} */
        (this.options.webSocketServer).type
      ) === "string" &&
      // @ts-ignore
      (this.options.webSocketServer.type === "ws" ||
        /** @type {WebSocketServerConfiguration} */
        (this.options.webSocketServer).type === "sockjs");

    let clientTransport;

    if (this.options.client) {
      if (
        typeof (
          /** @type {ClientConfiguration} */
          (this.options.client).webSocketTransport
        ) !== "undefined"
      ) {
        clientTransport =
          /** @type {ClientConfiguration} */
          (this.options.client).webSocketTransport;
      } else if (isKnownWebSocketServerImplementation) {
        clientTransport =
          /** @type {WebSocketServerConfiguration} */
          (this.options.webSocketServer).type;
      } else {
        clientTransport = "ws";
      }
    } else {
      clientTransport = "ws";
    }

    switch (typeof clientTransport) {
      case "string":
        // could be 'sockjs', 'ws', or a path that should be required
        if (clientTransport === "sockjs") {
          clientImplementation = require.resolve(
            "../client/clients/SockJSClient",
          );
        } else if (clientTransport === "ws") {
          clientImplementation = require.resolve(
            "../client/clients/WebSocketClient",
          );
        } else {
          try {
            clientImplementation = require.resolve(clientTransport);
          } catch (e) {
            clientImplementationFound = false;
          }
        }
        break;
      default:
        clientImplementationFound = false;
    }

    if (!clientImplementationFound) {
      throw new Error(
        `${
          !isKnownWebSocketServerImplementation
            ? "When you use custom web socket implementation you must explicitly specify client.webSocketTransport. "
            : ""
        }client.webSocketTransport must be a string denoting a default implementation (e.g. 'sockjs', 'ws') or a full path to a JS file via require.resolve(...) which exports a class `,
      );
    }

    return /** @type {string} */ (clientImplementation);
  }

  /**
   * @template T
   * @private
   * @returns {T}
   */
  getServerTransport() {
    let implementation;
    let implementationFound = true;

    switch (
      typeof (
        /** @type {WebSocketServerConfiguration} */
        (this.options.webSocketServer).type
      )
    ) {
      case "string":
        // Could be 'sockjs', in the future 'ws', or a path that should be required
        if (
          /** @type {WebSocketServerConfiguration} */ (
            this.options.webSocketServer
          ).type === "sockjs"
        ) {
          implementation = require("./servers/SockJSServer");
        } else if (
          /** @type {WebSocketServerConfiguration} */ (
            this.options.webSocketServer
          ).type === "ws"
        ) {
          implementation = require("./servers/WebsocketServer");
        } else {
          try {
            // eslint-disable-next-line import/no-dynamic-require
            implementation = require(
              /** @type {WebSocketServerConfiguration} */
              (this.options.webSocketServer).type,
            );
          } catch (error) {
            implementationFound = false;
          }
        }
        break;
      case "function":
        implementation =
          /** @type {WebSocketServerConfiguration} */
          (this.options.webSocketServer).type;
        break;
      default:
        implementationFound = false;
    }

    if (!implementationFound) {
      throw new Error(
        "webSocketServer (webSocketServer.type) must be a string denoting a default implementation (e.g. 'ws', 'sockjs'), a full path to " +
          "a JS file which exports a class extending BaseServer (webpack-dev-server/lib/servers/BaseServer.js) " +
          "via require.resolve(...), or the class itself which extends BaseServer",
      );
    }

    return implementation;
  }

  /**
   * @returns {string}
   */
  // eslint-disable-next-line class-methods-use-this
  getClientEntry() {
    return require.resolve("../client/index.js");
  }

  /**
   * @returns {string | void}
   */
  getClientHotEntry() {
    if (this.options.hot === "only") {
      return require.resolve("webpack/hot/only-dev-server");
    } else if (this.options.hot) {
      return require.resolve("webpack/hot/dev-server");
    }
  }

  /**
   * @private
   * @returns {void}
   */
  setupProgressPlugin() {
    const { ProgressPlugin } =
      /** @type {MultiCompiler}*/
      (this.compiler).compilers
        ? /** @type {MultiCompiler}*/ (this.compiler).compilers[0].webpack
        : /** @type {Compiler}*/ (this.compiler).webpack;

    new ProgressPlugin(
      /**
       * @param {number} percent
       * @param {string} msg
       * @param {string} addInfo
       * @param {string} pluginName
       */
      (percent, msg, addInfo, pluginName) => {
        percent = Math.floor(percent * 100);

        if (percent === 100) {
          msg = "Compilation completed";
        }

        if (addInfo) {
          msg = `${msg} (${addInfo})`;
        }

        if (this.webSocketServer) {
          this.sendMessage(this.webSocketServer.clients, "progress-update", {
            percent,
            msg,
            pluginName,
          });
        }

        if (this.server) {
          this.server.emit("progress-update", { percent, msg, pluginName });
        }
      },
    ).apply(this.compiler);
  }

  /**
   * @private
   * @returns {Promise<void>}
   */
  async initialize() {
    this.setupHooks();

    await this.setupApp();
    await this.createServer();

    if (this.options.webSocketServer) {
      const compilers =
        /** @type {MultiCompiler} */
        (this.compiler).compilers || [this.compiler];

      for (const compiler of compilers) {
        if (compiler.options.devServer === false) {
          // eslint-disable-next-line no-continue
          continue;
        }

        this.addAdditionalEntries(compiler);

        const webpack = compiler.webpack || require("webpack");

        new webpack.ProvidePlugin({
          __webpack_dev_server_client__: this.getClientTransport(),
        }).apply(compiler);

        if (this.options.hot) {
          const HMRPluginExists = compiler.options.plugins.find(
            (p) => p && p.constructor === webpack.HotModuleReplacementPlugin,
          );

          if (HMRPluginExists) {
            this.logger.warn(
              `"hot: true" automatically applies HMR plugin, you don't have to add it manually to your webpack configuration.`,
            );
          } else {
            // Apply the HMR plugin
            const plugin = new webpack.HotModuleReplacementPlugin();

            plugin.apply(compiler);
          }
        }
      }

      if (
        this.options.client &&
        /** @type {ClientConfiguration} */ (this.options.client).progress
      ) {
        this.setupProgressPlugin();
      }
    }

    this.setupWatchFiles();
    this.setupWatchStaticFiles();
    this.setupMiddlewares();

    if (this.options.setupExitSignals) {
      const signals = ["SIGINT", "SIGTERM"];

      let needForceShutdown = false;

      signals.forEach((signal) => {
        const listener = () => {
          if (needForceShutdown) {
            process.exit();
          }

          this.logger.info(
            "Gracefully shutting down. To force exit, press ^C again. Please wait...",
          );

          needForceShutdown = true;

          this.stopCallback(() => {
            if (typeof this.compiler.close === "function") {
              this.compiler.close(() => {
                process.exit();
              });
            } else {
              process.exit();
            }
          });
        };

        this.listeners.push({ name: signal, listener });

        process.on(signal, listener);
      });
    }

    // Proxy WebSocket without the initial http request
    // https://github.com/chimurai/http-proxy-middleware#external-websocket-upgrade
    const webSocketProxies =
      /** @type {RequestHandler[]} */
      (this.webSocketProxies);

    for (const webSocketProxy of webSocketProxies) {
      /** @type {S} */
      (this.server).on(
        "upgrade",
        /** @type {RequestHandler & { upgrade: NonNullable<RequestHandler["upgrade"]> }} */
        (webSocketProxy).upgrade,
      );
    }
  }

  /**
   * @private
   * @returns {Promise<void>}
   */
  async setupApp() {
    /** @type {A | undefined}*/
    this.app =
      typeof this.options.app === "function"
        ? await this.options.app()
        : getExpress()();
  }

  /**
   * @private
   * @param {Stats | MultiStats} statsObj
   * @returns {StatsCompilation}
   */
  getStats(statsObj) {
    const stats = Server.DEFAULT_STATS;
    const compilerOptions = this.getCompilerOptions();

    // @ts-ignore
    if (compilerOptions.stats && compilerOptions.stats.warningsFilter) {
      // @ts-ignore
      stats.warningsFilter = compilerOptions.stats.warningsFilter;
    }

    return statsObj.toJson(stats);
  }

  /**
   * @private
   * @returns {void}
   */
  setupHooks() {
    this.compiler.hooks.invalid.tap("webpack-dev-server", () => {
      if (this.webSocketServer) {
        this.sendMessage(this.webSocketServer.clients, "invalid");
      }
    });
    this.compiler.hooks.done.tap(
      "webpack-dev-server",
      /**
       * @param {Stats | MultiStats} stats
       */
      (stats) => {
        if (this.webSocketServer) {
          this.sendStats(this.webSocketServer.clients, this.getStats(stats));
        }

        /**
         * @private
         * @type {Stats | MultiStats}
         */
        this.stats = stats;
      },
    );
  }

  /**
   * @private
   * @returns {void}
   */
  setupWatchStaticFiles() {
    const watchFiles = /** @type {NormalizedStatic[]} */ (this.options.static);

    if (watchFiles.length > 0) {
      for (const item of watchFiles) {
        if (item.watch) {
          this.watchFiles(item.directory, item.watch);
        }
      }
    }
  }

  /**
   * @private
   * @returns {void}
   */
  setupWatchFiles() {
    const watchFiles = /** @type {WatchFiles[]} */ (this.options.watchFiles);

    if (watchFiles.length > 0) {
      for (const item of watchFiles) {
        this.watchFiles(item.paths, item.options);
      }
    }
  }

  /**
   * @private
   * @returns {void}
   */
  setupMiddlewares() {
    /**
     * @type {Array<Middleware>}
     */
    let middlewares = [];

    // Register setup host header check for security
    middlewares.push({
      name: "host-header-check",
      /**
       * @param {Request} req
       * @param {Response} res
       * @param {NextFunction} next
       * @returns {void}
       */
      middleware: (req, res, next) => {
        const headers =
          /** @type {{ [key: string]: string | undefined }} */
          (req.headers);
        const headerName = headers[":authority"] ? ":authority" : "host";

        if (this.isValidHost(headers, headerName)) {
          next();
          return;
        }

        res.statusCode = 403;
        res.end("Invalid Host header");
      },
    });

    // Register setup cross origin request check for security
    middlewares.push({
      name: "cross-origin-header-check",
      /**
       * @param {Request} req
       * @param {Response} res
       * @param {NextFunction} next
       * @returns {void}
       */
      middleware: (req, res, next) => {
        const headers =
          /** @type {{ [key: string]: string | undefined }} */
          (req.headers);
        const headerName = headers[":authority"] ? ":authority" : "host";

        if (this.isValidHost(headers, headerName, false)) {
          next();
          return;
        }

        if (
          headers["sec-fetch-mode"] === "no-cors" &&
          headers["sec-fetch-site"] === "cross-site"
        ) {
          res.statusCode = 403;
          res.end("Cross-Origin request blocked");
          return;
        }

        next();
      },
    });

    const isHTTP2 =
      /** @type {ServerConfiguration<A, S>} */ (this.options.server).type ===
      "http2";

    if (isHTTP2) {
      // TODO patch for https://github.com/pillarjs/finalhandler/pull/45, need remove then will be resolved
      middlewares.push({
        name: "http2-status-message-patch",
        middleware:
          /** @type {NextHandleFunction} */
          (_req, res, next) => {
            Object.defineProperty(res, "statusMessage", {
              get() {
                return "";
              },
              set() {},
            });

            next();
          },
      });
    }

    // compress is placed last and uses unshift so that it will be the first middleware used
    if (this.options.compress && !isHTTP2) {
      const compression = require("compression");

      middlewares.push({ name: "compression", middleware: compression() });
    }

    if (typeof this.options.headers !== "undefined") {
      middlewares.push({
        name: "set-headers",
        middleware: this.setHeaders.bind(this),
      });
    }

    middlewares.push({
      name: "webpack-dev-middleware",
      middleware: /** @type {MiddlewareHandler} */ (this.middleware),
    });

    // Should be after `webpack-dev-middleware`, otherwise other middlewares might rewrite response
    middlewares.push({
      name: "webpack-dev-server-sockjs-bundle",
      path: "/__webpack_dev_server__/sockjs.bundle.js",
      /**
       * @param {Request} req
       * @param {Response} res
       * @param {NextFunction} next
       * @returns {void}
       */
      middleware: (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          next();
          return;
        }

        const clientPath = path.join(
          __dirname,
          "..",
          "client/modules/sockjs-client/index.js",
        );

        // Express send Etag and other headers by default, so let's keep them for compatibility reasons
        if (typeof res.sendFile === "function") {
          res.sendFile(clientPath);
          return;
        }

        let stats;

        try {
          // TODO implement `inputFileSystem.createReadStream` in webpack
          stats = fs.statSync(clientPath);
        } catch (err) {
          next();
          return;
        }

        res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
        res.setHeader("Content-Length", stats.size);

        if (req.method === "HEAD") {
          res.end();
          return;
        }

        fs.createReadStream(clientPath).pipe(res);
      },
    });

    middlewares.push({
      name: "webpack-dev-server-invalidate",
      path: "/webpack-dev-server/invalidate",
      /**
       * @param {Request} req
       * @param {Response} res
       * @param {NextFunction} next
       * @returns {void}
       */
      middleware: (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          next();
          return;
        }

        this.invalidate();

        res.end();
      },
    });

    middlewares.push({
      name: "webpack-dev-server-open-editor",
      path: "/webpack-dev-server/open-editor",
      /**
       * @param {Request} req
       * @param {Response} res
       * @param {NextFunction} next
       * @returns {void}
       */
      middleware: (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          next();
          return;
        }

        if (!req.url) {
          next();
          return;
        }

        const resolveUrl = new URL(req.url, `http://${req.headers.host}`);
        const params = new URLSearchParams(resolveUrl.search);
        const fileName = params.get("fileName");

        if (typeof fileName === "string") {
          // @ts-ignore
          const launchEditor = require("launch-editor");

          launchEditor(fileName);
        }

        res.end();
      },
    });

    middlewares.push({
      name: "webpack-dev-server-assets",
      path: "/webpack-dev-server",
      /**
       * @param {Request} req
       * @param {Response} res
       * @param {NextFunction} next
       * @returns {void}
       */
      middleware: (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          next();
          return;
        }

        if (!this.middleware) {
          next();
          return;
        }

        this.middleware.waitUntilValid((stats) => {
          res.setHeader("Content-Type", "text/html; charset=utf-8");

          // HEAD requests should not return body content
          if (req.method === "HEAD") {
            res.end();
            return;
          }

          res.write(
            '<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>',
          );

          /**
           * @type {StatsCompilation[]}
           */
          const statsForPrint =
            typeof (/** @type {MultiStats} */ (stats).stats) !== "undefined"
              ? /** @type {NonNullable<StatsCompilation["children"]>} */
                (/** @type {MultiStats} */ (stats).toJson().children)
              : [/** @type {Stats} */ (stats).toJson()];

          res.write(`<h1>Assets Report:</h1>`);

          for (const [index, item] of statsForPrint.entries()) {
            res.write("<div>");

            const name =
              // eslint-disable-next-line no-nested-ternary
              typeof item.name !== "undefined"
                ? item.name
                : /** @type {MultiStats} */ (stats).stats
                  ? `unnamed[${index}]`
                  : "unnamed";

            res.write(`<h2>Compilation: ${name}</h2>`);
            res.write("<ul>");

            const publicPath =
              item.publicPath === "auto" ? "" : item.publicPath;
            const assets =
              /** @type {NonNullable<StatsCompilation["assets"]>} */
              (item.assets);

            for (const asset of assets) {
              const assetName = asset.name;
              const assetURL = `${publicPath}${assetName}`;

              res.write(
                `<li>
              <strong><a href="${assetURL}" target="_blank">${assetName}</a></strong>
            </li>`,
              );
            }

            res.write("</ul>");
            res.write("</div>");
          }

          res.end("</body></html>");
        });
      },
    });

    if (this.options.proxy) {
      const { createProxyMiddleware } = require("http-proxy-middleware");

      /**
       * @param {ProxyConfigArrayItem} proxyConfig
       * @returns {RequestHandler | undefined}
       */
      const getProxyMiddleware = (proxyConfig) => {
        // It is possible to use the `bypass` method without a `target` or `router`.
        // However, the proxy middleware has no use in this case, and will fail to instantiate.
        if (proxyConfig.target) {
          const context = proxyConfig.context || proxyConfig.path;

          return createProxyMiddleware(
            /** @type {string} */ (context),
            proxyConfig,
          );
        }

        if (proxyConfig.router) {
          return createProxyMiddleware(proxyConfig);
        }

        // TODO improve me after drop `bypass` to always generate error when configuration is bad
        if (!proxyConfig.bypass) {
          util.deprecate(
            () => {},
            `Invalid proxy configuration:\n\n${JSON.stringify(proxyConfig, null, 2)}\n\nThe use of proxy object notation as proxy routes has been removed.\nPlease use the 'router' or 'context' options. Read more at https://github.com/chimurai/http-proxy-middleware/tree/v2.0.6#http-proxy-middleware-options`,
            "DEP_WEBPACK_DEV_SERVER_PROXY_ROUTES_ARGUMENT",
          )();
        }
      };

      /**
       * Assume a proxy configuration specified as:
       * proxy: [
       *   {
       *     context: "value",
       *     ...options,
       *   },
       *   // or:
       *   function() {
       *     return {
       *       context: "context",
       *       ...options,
       *     };
       *   }
       * ]
       */
      this.options.proxy.forEach((proxyConfigOrCallback) => {
        /**
         * @type {RequestHandler}
         */
        let proxyMiddleware;

        let proxyConfig =
          typeof proxyConfigOrCallback === "function"
            ? proxyConfigOrCallback()
            : proxyConfigOrCallback;

        proxyMiddleware =
          /** @type {RequestHandler} */
          (getProxyMiddleware(proxyConfig));

        if (proxyConfig.ws) {
          this.webSocketProxies.push(proxyMiddleware);
        }

        /**
         * @param {Request} req
         * @param {Response} res
         * @param {NextFunction} next
         * @returns {Promise<void>}
         */
        const handler = async (req, res, next) => {
          if (typeof proxyConfigOrCallback === "function") {
            const newProxyConfig = proxyConfigOrCallback(req, res, next);

            if (newProxyConfig !== proxyConfig) {
              proxyConfig = newProxyConfig;

              const socket = req.socket != null ? req.socket : req.connection;
              // @ts-ignore
              const server = socket != null ? socket.server : null;

              if (server) {
                server.removeAllListeners("close");
              }

              proxyMiddleware =
                /** @type {RequestHandler} */
                (getProxyMiddleware(proxyConfig));
            }
          }

          // - Check if we have a bypass function defined
          // - In case the bypass function is defined we'll retrieve the
          // bypassUrl from it otherwise bypassUrl would be null
          // TODO remove in the next major in favor `context` and `router` options
          const isByPassFuncDefined = typeof proxyConfig.bypass === "function";
          if (isByPassFuncDefined) {
            util.deprecate(
              () => {},
              "Using the 'bypass' option is deprecated. Please use the 'router' or 'context' options. Read more at https://github.com/chimurai/http-proxy-middleware/tree/v2.0.6#http-proxy-middleware-options",
              "DEP_WEBPACK_DEV_SERVER_PROXY_BYPASS_ARGUMENT",
            )();
          }
          const bypassUrl = isByPassFuncDefined
            ? await /** @type {ByPass} */ (proxyConfig.bypass)(
                req,
                res,
                proxyConfig,
              )
            : null;

          if (typeof bypassUrl === "boolean") {
            // skip the proxy
            res.statusCode = 404;
            req.url = "";
            next();
          } else if (typeof bypassUrl === "string") {
            // byPass to that url
            req.url = bypassUrl;
            next();
          } else if (proxyMiddleware) {
            return proxyMiddleware(req, res, next);
          } else {
            next();
          }
        };

        middlewares.push({
          name: "http-proxy-middleware",
          middleware: handler,
        });

        // Also forward error requests to the proxy so it can handle them.
        middlewares.push({
          name: "http-proxy-middleware-error-handler",
          middleware:
            /**
             * @param {Error} error
             * @param {Request} req
             * @param {Response} res
             * @param {NextFunction} next
             * @returns {any}
             */
            (error, req, res, next) => handler(req, res, next),
        });
      });

      middlewares.push({
        name: "webpack-dev-middleware",
        middleware: /** @type {MiddlewareHandler} */ (this.middleware),
      });
    }

    const staticOptions =
      /** @type {NormalizedStatic[]} */
      (this.options.static);

    if (staticOptions.length > 0) {
      for (const staticOption of staticOptions) {
        for (const publicPath of staticOption.publicPath) {
          middlewares.push({
            name: "express-static",
            path: publicPath,
            middleware: getExpress().static(
              staticOption.directory,
              staticOption.staticOptions,
            ),
          });
        }
      }
    }

    if (this.options.historyApiFallback) {
      const connectHistoryApiFallback = require("connect-history-api-fallback");
      const { historyApiFallback } = this.options;

      if (
        typeof (
          /** @type {ConnectHistoryApiFallbackOptions} */
          (historyApiFallback).logger
        ) === "undefined" &&
        !(
          /** @type {ConnectHistoryApiFallbackOptions} */
          (historyApiFallback).verbose
        )
      ) {
        // @ts-ignore
        historyApiFallback.logger = this.logger.log.bind(
          this.logger,
          "[connect-history-api-fallback]",
        );
      }

      // Fall back to /index.html if nothing else matches.
      middlewares.push({
        name: "connect-history-api-fallback",
        middleware: connectHistoryApiFallback(
          /** @type {ConnectHistoryApiFallbackOptions} */
          (historyApiFallback),
        ),
      });

      // include our middleware to ensure
      // it is able to handle '/index.html' request after redirect
      middlewares.push({
        name: "webpack-dev-middleware",
        middleware: /** @type {MiddlewareHandler} */ (this.middleware),
      });

      if (staticOptions.length > 0) {
        for (const staticOption of staticOptions) {
          for (const publicPath of staticOption.publicPath) {
            middlewares.push({
              name: "express-static",
              path: publicPath,
              middleware: getExpress().static(
                staticOption.directory,
                staticOption.staticOptions,
              ),
            });
          }
        }
      }
    }

    if (staticOptions.length > 0) {
      const serveIndex = require("serve-index");

      for (const staticOption of staticOptions) {
        for (const publicPath of staticOption.publicPath) {
          if (staticOption.serveIndex) {
            middlewares.push({
              name: "serve-index",
              path: publicPath,
              /**
               * @param {Request} req
               * @param {Response} res
               * @param {NextFunction} next
               * @returns {void}
               */
              middleware: (req, res, next) => {
                // serve-index doesn't fallthrough non-get/head request to next middleware
                if (req.method !== "GET" && req.method !== "HEAD") {
                  return next();
                }

                serveIndex(
                  staticOption.directory,
                  /** @type {ServeIndexOptions} */
                  (staticOption.serveIndex),
                )(req, res, next);
              },
            });
          }
        }
      }
    }

    // Register this middleware always as the last one so that it's only used as a
    // fallback when no other middleware responses.
    middlewares.push({
      name: "options-middleware",
      /**
       * @param {Request} req
       * @param {Response} res
       * @param {NextFunction} next
       * @returns {void}
       */
      middleware: (req, res, next) => {
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.setHeader("Content-Length", "0");
          res.end();
          return;
        }
        next();
      },
    });

    if (typeof this.options.setupMiddlewares === "function") {
      middlewares = this.options.setupMiddlewares(middlewares, this);
    }

    // Lazy init webpack dev middleware
    const lazyInitDevMiddleware = () => {
      if (!this.middleware) {
        const webpackDevMiddleware = require("webpack-dev-middleware");

        // middleware for serving webpack bundle
        /** @type {import("webpack-dev-middleware").API<Request, Response>} */
        this.middleware = webpackDevMiddleware(
          this.compiler,
          this.options.devMiddleware,
        );
      }

      return this.middleware;
    };

    for (const i of middlewares) {
      if (i.name === "webpack-dev-middleware") {
        const item = /** @type {MiddlewareObject} */ (i);

        if (typeof item.middleware === "undefined") {
          item.middleware = lazyInitDevMiddleware();
        }
      }
    }

    for (const middleware of middlewares) {
      if (typeof middleware === "function") {
        /** @type {A} */
        (this.app).use(
          /** @type {NextHandleFunction | HandleFunction} */
          (middleware),
        );
      } else if (typeof middleware.path !== "undefined") {
        /** @type {A} */
        (this.app).use(
          middleware.path,
          /** @type {SimpleHandleFunction | NextHandleFunction} */
          (middleware.middleware),
        );
      } else {
        /** @type {A} */
        (this.app).use(
          /** @type {NextHandleFunction | HandleFunction} */
          (middleware.middleware),
        );
      }
    }
  }

  /**
   * @private
   * @returns {Promise<void>}
   */
  async createServer() {
    const { type, options } =
      /** @type {ServerConfiguration<A, S>} */
      (this.options.server);

    if (typeof type === "function") {
      /** @type {S | undefined}*/
      this.server = await type(
        /** @type {ServerOptions} */
        (options),
        /** @type {A} */
        (this.app),
      );
    } else {
      // eslint-disable-next-line import/no-dynamic-require
      const serverType = require(/** @type {string} */ (type));

      /** @type {S | undefined}*/
      this.server =
        type === "http2"
          ? serverType.createSecureServer(
              { ...options, allowHTTP1: true },
              this.app,
            )
          : serverType.createServer(options, this.app);
    }

    this.isTlsServer =
      typeof (
        /** @type {import("tls").Server} */ (this.server).setSecureContext
      ) !== "undefined";

    /** @type {S} */
    (this.server).on(
      "connection",
      /**
       * @param {Socket} socket
       */
      (socket) => {
        // Add socket to list
        this.sockets.push(socket);

        socket.once("close", () => {
          // Remove socket from list
          this.sockets.splice(this.sockets.indexOf(socket), 1);
        });
      },
    );

    /** @type {S} */
    (this.server).on(
      "error",
      /**
       * @param {Error} error
       */
      (error) => {
        throw error;
      },
    );
  }

  /**
   * @private
   * @returns {void}
   */
  createWebSocketServer() {
    /** @type {WebSocketServerImplementation | undefined | null} */
    this.webSocketServer = new (this.getServerTransport())(this);

    /** @type {WebSocketServerImplementation} */
    (this.webSocketServer).implementation.on(
      "connection",
      /**
       * @param {ClientConnection} client
       * @param {IncomingMessage} request
       */
      (client, request) => {
        /** @type {{ [key: string]: string | undefined } | undefined} */
        const headers =
          // eslint-disable-next-line no-nested-ternary
          typeof request !== "undefined"
            ? /** @type {{ [key: string]: string | undefined }} */
              (request.headers)
            : typeof (
                  /** @type {import("sockjs").Connection} */ (client).headers
                ) !== "undefined"
              ? /** @type {import("sockjs").Connection} */ (client).headers
              : // eslint-disable-next-line no-undefined
                undefined;

        if (!headers) {
          this.logger.warn(
            'webSocketServer implementation must pass headers for the "connection" event',
          );
        }

        if (
          !headers ||
          !this.isValidHost(headers, "host") ||
          !this.isValidHost(headers, "origin") ||
          !this.isSameOrigin(headers)
        ) {
          this.sendMessage([client], "error", "Invalid Host/Origin header");

          // With https enabled, the sendMessage above is encrypted asynchronously so not yet sent
          // Terminate would prevent it sending, so use close to allow it to be sent
          client.close();

          return;
        }

        if (this.options.hot === true || this.options.hot === "only") {
          this.sendMessage([client], "hot");
        }

        if (this.options.liveReload) {
          this.sendMessage([client], "liveReload");
        }

        if (
          this.options.client &&
          /** @type {ClientConfiguration} */
          (this.options.client).progress
        ) {
          this.sendMessage(
            [client],
            "progress",
            /** @type {ClientConfiguration} */
            (this.options.client).progress,
          );
        }

        if (
          this.options.client &&
          /** @type {ClientConfiguration} */
          (this.options.client).reconnect
        ) {
          this.sendMessage(
            [client],
            "reconnect",
            /** @type {ClientConfiguration} */
            (this.options.client).reconnect,
          );
        }

        if (
          this.options.client &&
          /** @type {ClientConfiguration} */
          (this.options.client).overlay
        ) {
          const overlayConfig =
            /** @type {ClientConfiguration} */
            (this.options.client).overlay;

          this.sendMessage(
            [client],
            "overlay",
            typeof overlayConfig === "object"
              ? {
                  ...overlayConfig,
                  errors:
                    overlayConfig.errors &&
                    encodeOverlaySettings(overlayConfig.errors),
                  warnings:
                    overlayConfig.warnings &&
                    encodeOverlaySettings(overlayConfig.warnings),
                  runtimeErrors:
                    overlayConfig.runtimeErrors &&
                    encodeOverlaySettings(overlayConfig.runtimeErrors),
                }
              : overlayConfig,
          );
        }

        if (!this.stats) {
          return;
        }

        this.sendStats([client], this.getStats(this.stats), true);
      },
    );
  }

  /**
   * @private
   * @param {string} defaultOpenTarget
   * @returns {Promise<void>}
   */
  async openBrowser(defaultOpenTarget) {
    const open = (await import("open")).default;

    Promise.all(
      /** @type {NormalizedOpen[]} */
      (this.options.open).map((item) => {
        /**
         * @type {string}
         */
        let openTarget;

        if (item.target === "<url>") {
          openTarget = defaultOpenTarget;
        } else {
          openTarget = Server.isAbsoluteURL(item.target)
            ? item.target
            : new URL(item.target, defaultOpenTarget).toString();
        }

        return open(openTarget, item.options).catch(() => {
          this.logger.warn(
            `Unable to open "${openTarget}" page${
              item.options.app
                ? ` in "${
                    /** @type {import("open").App} */
                    (item.options.app).name
                  }" app${
                    /** @type {import("open").App} */
                    (item.options.app).arguments
                      ? ` with "${
                          /** @type {import("open").App} */
                          (item.options.app).arguments.join(" ")
                        }" arguments`
                      : ""
                  }`
                : ""
            }. If you are running in a headless environment, please do not use the "open" option or related flags like "--open", "--open-target", and "--open-app-name".`,
          );
        });
      }),
    );
  }

  /**
   * @private
   * @returns {void}
   */
  runBonjour() {
    const { Bonjour } = require("bonjour-service");
    const type = this.isTlsServer ? "https" : "http";

    /**
     * @private
     * @type {Bonjour | undefined}
     */
    this.bonjour = new Bonjour();
    this.bonjour.publish({
      name: `Webpack Dev Server ${os.hostname()}:${this.options.port}`,
      port: /** @type {number} */ (this.options.port),
      type,
      subtypes: ["webpack"],
      .../** @type {Partial<BonjourOptions>} */ (this.options.bonjour),
    });
  }

  /**
   * @private
   * @returns {void}
   */
  stopBonjour(callback = () => {}) {
    /** @type {Bonjour} */
    (this.bonjour).unpublishAll(() => {
      /** @type {Bonjour} */
      (this.bonjour).destroy();

      if (callback) {
        callback();
      }
    });
  }

  /**
   * @private
   * @returns {Promise<void>}
   */
  async logStatus() {
    const { isColorSupported, cyan, red } = require("colorette");

    /**
     * @param {Compiler["options"]} compilerOptions
     * @returns {boolean}
     */
    const getColorsOption = (compilerOptions) => {
      /**
       * @type {boolean}
       */
      let colorsEnabled;

      if (
        compilerOptions.stats &&
        typeof (/** @type {StatsOptions} */ (compilerOptions.stats).colors) !==
          "undefined"
      ) {
        colorsEnabled =
          /** @type {boolean} */
          (/** @type {StatsOptions} */ (compilerOptions.stats).colors);
      } else {
        colorsEnabled = isColorSupported;
      }

      return colorsEnabled;
    };

    const colors = {
      /**
       * @param {boolean} useColor
       * @param {string} msg
       * @returns {string}
       */
      info(useColor, msg) {
        if (useColor) {
          return cyan(msg);
        }

        return msg;
      },
      /**
       * @param {boolean} useColor
       * @param {string} msg
       * @returns {string}
       */
      error(useColor, msg) {
        if (useColor) {
          return red(msg);
        }

        return msg;
      },
    };
    const useColor = getColorsOption(this.getCompilerOptions());

    const server = /** @type {S} */ (this.server);

    if (this.options.ipc) {
      this.logger.info(`Project is running at: "${server.address()}"`);
    } else {
      const protocol = this.isTlsServer ? "https" : "http";
      const { address, port } =
        /** @type {import("net").AddressInfo} */
        (server.address());
      /**
       * @param {string} newHostname
       * @returns {string}
       */
      const prettyPrintURL = (newHostname) =>
        url.format({ protocol, hostname: newHostname, port, pathname: "/" });

      let host;
      let localhost;
      let loopbackIPv4;
      let loopbackIPv6;
      let networkUrlIPv4;
      let networkUrlIPv6;

      if (this.options.host) {
        if (this.options.host === "localhost") {
          localhost = prettyPrintURL("localhost");
        } else {
          let isIP;

          try {
            isIP = ipaddr.parse(this.options.host);
          } catch (error) {
            // Ignore
          }

          if (!isIP) {
            host = prettyPrintURL(this.options.host);
          }
        }
      }

      const parsedIP = ipaddr.parse(address);

      if (parsedIP.range() === "unspecified") {
        localhost = prettyPrintURL("localhost");
        loopbackIPv6 = prettyPrintURL("::1");

        const networkIPv4 = Server.findIp("v4", false);

        if (networkIPv4) {
          networkUrlIPv4 = prettyPrintURL(networkIPv4);
        }

        const networkIPv6 = Server.findIp("v6", false);

        if (networkIPv6) {
          networkUrlIPv6 = prettyPrintURL(networkIPv6);
        }
      } else if (parsedIP.range() === "loopback") {
        if (parsedIP.kind() === "ipv4") {
          loopbackIPv4 = prettyPrintURL(parsedIP.toString());
        } else if (parsedIP.kind() === "ipv6") {
          loopbackIPv6 = prettyPrintURL(parsedIP.toString());
        }
      } else {
        networkUrlIPv4 =
          parsedIP.kind() === "ipv6" &&
          /** @type {IPv6} */
          (parsedIP).isIPv4MappedAddress()
            ? prettyPrintURL(
                /** @type {IPv6} */
                (parsedIP).toIPv4Address().toString(),
              )
            : prettyPrintURL(address);

        if (parsedIP.kind() === "ipv6") {
          networkUrlIPv6 = prettyPrintURL(address);
        }
      }

      this.logger.info("Project is running at:");

      if (host) {
        this.logger.info(`Server: ${colors.info(useColor, host)}`);
      }

      if (localhost || loopbackIPv4 || loopbackIPv6) {
        const loopbacks = [];

        if (localhost) {
          loopbacks.push([colors.info(useColor, localhost)]);
        }

        if (loopbackIPv4) {
          loopbacks.push([colors.info(useColor, loopbackIPv4)]);
        }

        if (loopbackIPv6) {
          loopbacks.push([colors.info(useColor, loopbackIPv6)]);
        }

        this.logger.info(`Loopback: ${loopbacks.join(", ")}`);
      }

      if (networkUrlIPv4) {
        this.logger.info(
          `On Your Network (IPv4): ${colors.info(useColor, networkUrlIPv4)}`,
        );
      }

      if (networkUrlIPv6) {
        this.logger.info(
          `On Your Network (IPv6): ${colors.info(useColor, networkUrlIPv6)}`,
        );
      }

      if (/** @type {NormalizedOpen[]} */ (this.options.open).length > 0) {
        const openTarget = prettyPrintURL(
          !this.options.host ||
            this.options.host === "0.0.0.0" ||
            this.options.host === "::"
            ? "localhost"
            : this.options.host,
        );

        await this.openBrowser(openTarget);
      }
    }

    if (/** @type {NormalizedStatic[]} */ (this.options.static).length > 0) {
      this.logger.info(
        `Content not from webpack is served from '${colors.info(
          useColor,
          /** @type {NormalizedStatic[]} */
          (this.options.static)
            .map((staticOption) => staticOption.directory)
            .join(", "),
        )}' directory`,
      );
    }

    if (this.options.historyApiFallback) {
      this.logger.info(
        `404s will fallback to '${colors.info(
          useColor,
          /** @type {ConnectHistoryApiFallbackOptions} */ (
            this.options.historyApiFallback
          ).index || "/index.html",
        )}'`,
      );
    }

    if (this.options.bonjour) {
      const bonjourProtocol =
        /** @type {BonjourOptions} */
        (this.options.bonjour).type || this.isTlsServer ? "https" : "http";

      this.logger.info(
        `Broadcasting "${bonjourProtocol}" with subtype of "webpack" via ZeroConf DNS (Bonjour)`,
      );
    }
  }

  /**
   * @private
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  setHeaders(req, res, next) {
    let { headers } = this.options;

    if (headers) {
      if (typeof headers === "function") {
        headers = headers(
          req,
          res,
          // eslint-disable-next-line no-undefined
          this.middleware ? this.middleware.context : undefined,
        );
      }

      /**
       * @type {{key: string, value: string}[]}
       */
      const allHeaders = [];

      if (!Array.isArray(headers)) {
        // eslint-disable-next-line guard-for-in
        for (const name in headers) {
          // @ts-ignore
          allHeaders.push({ key: name, value: headers[name] });
        }

        headers = allHeaders;
      }

      for (const { key, value } of headers) {
        res.setHeader(key, value);
      }
    }

    next();
  }

  /**
   * @private
   * @param {string} value
   * @returns {boolean}
   */
  isHostAllowed(value) {
    const { allowedHosts } = this.options;

    // allow user to opt out of this security check, at their own risk
    // by explicitly enabling allowedHosts
    if (allowedHosts === "all") {
      return true;
    }

    // always allow localhost host, for convenience
    // allow if value is in allowedHosts
    if (Array.isArray(allowedHosts) && allowedHosts.length > 0) {
      for (const allowedHost of allowedHosts) {
        if (allowedHost === value) {
          return true;
        }

        // support "." as a subdomain wildcard
        // e.g. ".example.com" will allow "example.com", "www.example.com", "subdomain.example.com", etc
        if (allowedHost.startsWith(".")) {
          // "example.com"  (value === allowedHost.substring(1))
          // "*.example.com"  (value.endsWith(allowedHost))
          if (
            value === allowedHost.substring(1) ||
            /** @type {string} */
            (value).endsWith(allowedHost)
          ) {
            return true;
          }
        }
      }
    }

    // Also allow if `client.webSocketURL.hostname` provided
    if (
      this.options.client &&
      typeof (
        /** @type {ClientConfiguration} */
        (this.options.client).webSocketURL
      ) !== "undefined"
    ) {
      return (
        /** @type {WebSocketURL} */
        (/** @type {ClientConfiguration} */ (this.options.client).webSocketURL)
          .hostname === value
      );
    }

    return false;
  }

  /**
   * @private
   * @param {{ [key: string]: string | undefined }} headers
   * @param {string} headerToCheck
   * @param {boolean} validateHost
   * @returns {boolean}
   */
  isValidHost(headers, headerToCheck, validateHost = true) {
    if (this.options.allowedHosts === "all") {
      return true;
    }

    // get the Host header and extract hostname
    // we don't care about port not matching
    const header = headers[headerToCheck];

    if (!header) {
      return false;
    }

    if (DEFAULT_ALLOWED_PROTOCOLS.test(header)) {
      return true;
    }

    // use the node url-parser to retrieve the hostname from the host-header.
    const hostname = url.parse(
      // if header doesn't have scheme, add // for parsing.
      /^(.+:)?\/\//.test(header) ? header : `//${header}`,
      false,
      true,
    ).hostname;

    if (hostname === null) {
      return false;
    }

    if (this.isHostAllowed(hostname)) {
      return true;
    }

    // always allow requests with explicit IPv4 or IPv6-address.
    // A note on IPv6 addresses:
    // header will always contain the brackets denoting
    // an IPv6-address in URLs,
    // these are removed from the hostname in url.parse(),
    // so we have the pure IPv6-address in hostname.
    // For convenience, always allow localhost (hostname === 'localhost')
    // and its subdomains (hostname.endsWith(".localhost")).
    // allow hostname of listening address  (hostname === this.options.host)
    const isValidHostname = validateHost
      ? ipaddr.IPv4.isValid(hostname) ||
        ipaddr.IPv6.isValid(hostname) ||
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname === this.options.host
      : false;

    return isValidHostname;
  }

  /**
   * @private
   * @param {{ [key: string]: string | undefined }} headers
   * @returns {boolean}
   */
  isSameOrigin(headers) {
    if (this.options.allowedHosts === "all") {
      return true;
    }

    const originHeader = headers.origin;

    if (!originHeader) {
      return this.options.allowedHosts === "all";
    }

    if (DEFAULT_ALLOWED_PROTOCOLS.test(originHeader)) {
      return true;
    }

    const origin = url.parse(originHeader, false, true).hostname;

    if (origin === null) {
      return false;
    }

    if (this.isHostAllowed(origin)) {
      return true;
    }

    const hostHeader = headers.host;

    if (!hostHeader) {
      return this.options.allowedHosts === "all";
    }

    if (DEFAULT_ALLOWED_PROTOCOLS.test(hostHeader)) {
      return true;
    }

    const host = url.parse(
      // if hostHeader doesn't have scheme, add // for parsing.
      /^(.+:)?\/\//.test(hostHeader) ? hostHeader : `//${hostHeader}`,
      false,
      true,
    ).hostname;

    if (host === null) {
      return false;
    }

    if (this.isHostAllowed(host)) {
      return true;
    }

    return origin === host;
  }

  /**
   * @param {ClientConnection[]} clients
   * @param {string} type
   * @param {any} [data]
   * @param {any} [params]
   */
  // eslint-disable-next-line class-methods-use-this
  sendMessage(clients, type, data, params) {
    for (const client of clients) {
      // `sockjs` uses `1` to indicate client is ready to accept data
      // `ws` uses `WebSocket.OPEN`, but it is mean `1` too
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type, data, params }));
      }
    }
  }

  // Send stats to a socket or multiple sockets
  /**
   * @private
   * @param {ClientConnection[]} clients
   * @param {StatsCompilation} stats
   * @param {boolean} [force]
   */
  sendStats(clients, stats, force) {
    const shouldEmit =
      !force &&
      stats &&
      (!stats.errors || stats.errors.length === 0) &&
      (!stats.warnings || stats.warnings.length === 0) &&
      this.currentHash === stats.hash;

    if (shouldEmit) {
      this.sendMessage(clients, "still-ok");

      return;
    }

    this.currentHash = stats.hash;
    this.sendMessage(clients, "hash", stats.hash);

    if (
      /** @type {NonNullable<StatsCompilation["errors"]>} */
      (stats.errors).length > 0 ||
      /** @type {NonNullable<StatsCompilation["warnings"]>} */
      (stats.warnings).length > 0
    ) {
      const hasErrors =
        /** @type {NonNullable<StatsCompilation["errors"]>} */
        (stats.errors).length > 0;

      if (
        /** @type {NonNullable<StatsCompilation["warnings"]>} */
        (stats.warnings).length > 0
      ) {
        let params;

        if (hasErrors) {
          params = { preventReloading: true };
        }

        this.sendMessage(clients, "warnings", stats.warnings, params);
      }

      if (
        /** @type {NonNullable<StatsCompilation["errors"]>} */ (stats.errors)
          .length > 0
      ) {
        this.sendMessage(clients, "errors", stats.errors);
      }
    } else {
      this.sendMessage(clients, "ok");
    }
  }

  /**
   * @param {string | string[]} watchPath
   * @param {WatchOptions} [watchOptions]
   */
  watchFiles(watchPath, watchOptions) {
    const chokidar = require("chokidar");
    const watcher = chokidar.watch(watchPath, watchOptions);

    // disabling refreshing on changing the content
    if (this.options.liveReload) {
      watcher.on("change", (item) => {
        if (this.webSocketServer) {
          this.sendMessage(
            this.webSocketServer.clients,
            "static-changed",
            item,
          );
        }
      });
    }

    this.staticWatchers.push(watcher);
  }

  /**
   * @param {import("webpack-dev-middleware").Callback} [callback]
   */
  invalidate(callback = () => {}) {
    if (this.middleware) {
      this.middleware.invalidate(callback);
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async start() {
    await this.normalizeOptions();

    if (this.options.ipc) {
      await /** @type {Promise<void>} */ (
        new Promise((resolve, reject) => {
          const net = require("net");
          const socket = new net.Socket();

          socket.on(
            "error",
            /**
             * @param {Error & { code?: string }} error
             */
            (error) => {
              if (error.code === "ECONNREFUSED") {
                // No other server listening on this socket, so it can be safely removed
                fs.unlinkSync(/** @type {string} */ (this.options.ipc));

                resolve();

                return;
              } else if (error.code === "ENOENT") {
                resolve();

                return;
              }

              reject(error);
            },
          );

          socket.connect(
            { path: /** @type {string} */ (this.options.ipc) },
            () => {
              throw new Error(`IPC "${this.options.ipc}" is already used`);
            },
          );
        })
      );
    } else {
      this.options.host = await Server.getHostname(
        /** @type {Host} */ (this.options.host),
      );
      this.options.port = await Server.getFreePort(
        /** @type {Port} */ (this.options.port),
        this.options.host,
      );
    }

    await this.initialize();

    const listenOptions = this.options.ipc
      ? { path: this.options.ipc }
      : { host: this.options.host, port: this.options.port };

    await /** @type {Promise<void>} */ (
      new Promise((resolve) => {
        /** @type {S} */
        (this.server).listen(listenOptions, () => {
          resolve();
        });
      })
    );

    if (this.options.ipc) {
      // chmod 666 (rw rw rw)
      const READ_WRITE = 438;

      await fs.promises.chmod(
        /** @type {string} */ (this.options.ipc),
        READ_WRITE,
      );
    }

    if (this.options.webSocketServer) {
      this.createWebSocketServer();
    }

    if (this.options.bonjour) {
      this.runBonjour();
    }

    await this.logStatus();

    if (typeof this.options.onListening === "function") {
      this.options.onListening(this);
    }
  }

  /**
   * @param {(err?: Error) => void} [callback]
   */
  startCallback(callback = () => {}) {
    this.start()
      .then(() => callback(), callback)
      .catch(callback);
  }

  /**
   * @returns {Promise<void>}
   */
  async stop() {
    if (this.bonjour) {
      await /** @type {Promise<void>} */ (
        new Promise((resolve) => {
          this.stopBonjour(() => {
            resolve();
          });
        })
      );
    }

    this.webSocketProxies = [];

    await Promise.all(this.staticWatchers.map((watcher) => watcher.close()));

    this.staticWatchers = [];

    if (this.webSocketServer) {
      await /** @type {Promise<void>} */ (
        new Promise((resolve) => {
          /** @type {WebSocketServerImplementation} */
          (this.webSocketServer).implementation.close(() => {
            this.webSocketServer = null;

            resolve();
          });

          for (const client of /** @type {WebSocketServerImplementation} */ (
            this.webSocketServer
          ).clients) {
            client.terminate();
          }

          /** @type {WebSocketServerImplementation} */
          (this.webSocketServer).clients = [];
        })
      );
    }

    if (this.server) {
      await /** @type {Promise<void>} */ (
        new Promise((resolve) => {
          /** @type {S} */
          (this.server).close(() => {
            // eslint-disable-next-line no-undefined
            this.server = undefined;
            resolve();
          });

          for (const socket of this.sockets) {
            socket.destroy();
          }

          this.sockets = [];
        })
      );

      if (this.middleware) {
        await /** @type {Promise<void>} */ (
          new Promise((resolve, reject) => {
            /** @type {import("webpack-dev-middleware").API<Request, Response>}*/
            (this.middleware).close((error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            });
          })
        );

        // eslint-disable-next-line no-undefined
        this.middleware = undefined;
      }
    }

    // We add listeners to signals when creating a new Server instance
    // So ensure they are removed to prevent EventEmitter memory leak warnings
    for (const item of this.listeners) {
      process.removeListener(item.name, item.listener);
    }
  }

  /**
   * @param {(err?: Error) => void} [callback]
   */
  stopCallback(callback = () => {}) {
    this.stop()
      .then(() => callback(), callback)
      .catch(callback);
  }
}

module.exports = Server;
