"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetGlobalState = exports.useEventSource = exports.ReadyState = exports.useSocketIO = exports.default = void 0;
var use_websocket_1 = require("./lib/use-websocket");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return use_websocket_1.useWebSocket; } });
var use_socket_io_1 = require("./lib/use-socket-io");
Object.defineProperty(exports, "useSocketIO", { enumerable: true, get: function () { return use_socket_io_1.useSocketIO; } });
var constants_1 = require("./lib/constants");
Object.defineProperty(exports, "ReadyState", { enumerable: true, get: function () { return constants_1.ReadyState; } });
var use_event_source_1 = require("./lib/use-event-source");
Object.defineProperty(exports, "useEventSource", { enumerable: true, get: function () { return use_event_source_1.useEventSource; } });
var util_1 = require("./lib/util");
Object.defineProperty(exports, "resetGlobalState", { enumerable: true, get: function () { return util_1.resetGlobalState; } });
//# sourceMappingURL=index.js.map