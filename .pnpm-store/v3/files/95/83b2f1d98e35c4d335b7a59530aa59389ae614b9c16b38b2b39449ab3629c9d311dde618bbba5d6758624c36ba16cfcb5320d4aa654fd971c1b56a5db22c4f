"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEventSourceSupported = exports.isReactNative = exports.ReadyState = exports.DEFAULT_HEARTBEAT = exports.UNPARSABLE_JSON_OBJECT = exports.DEFAULT_RECONNECT_INTERVAL_MS = exports.DEFAULT_RECONNECT_LIMIT = exports.SOCKET_IO_PING_CODE = exports.SOCKET_IO_PATH = exports.SOCKET_IO_PING_INTERVAL = exports.DEFAULT_EVENT_SOURCE_OPTIONS = exports.EMPTY_EVENT_HANDLERS = exports.DEFAULT_OPTIONS = void 0;
var MILLISECONDS = 1;
var SECONDS = 1000 * MILLISECONDS;
exports.DEFAULT_OPTIONS = {};
exports.EMPTY_EVENT_HANDLERS = {};
exports.DEFAULT_EVENT_SOURCE_OPTIONS = {
    withCredentials: false,
    events: exports.EMPTY_EVENT_HANDLERS,
};
exports.SOCKET_IO_PING_INTERVAL = 25 * SECONDS;
exports.SOCKET_IO_PATH = '/socket.io/?EIO=3&transport=websocket';
exports.SOCKET_IO_PING_CODE = '2';
exports.DEFAULT_RECONNECT_LIMIT = 20;
exports.DEFAULT_RECONNECT_INTERVAL_MS = 5000;
exports.UNPARSABLE_JSON_OBJECT = {};
exports.DEFAULT_HEARTBEAT = {
    message: 'ping',
    timeout: 60000,
    interval: 25000,
};
var ReadyState;
(function (ReadyState) {
    ReadyState[ReadyState["UNINSTANTIATED"] = -1] = "UNINSTANTIATED";
    ReadyState[ReadyState["CONNECTING"] = 0] = "CONNECTING";
    ReadyState[ReadyState["OPEN"] = 1] = "OPEN";
    ReadyState[ReadyState["CLOSING"] = 2] = "CLOSING";
    ReadyState[ReadyState["CLOSED"] = 3] = "CLOSED";
})(ReadyState || (exports.ReadyState = ReadyState = {}));
var eventSourceSupported = function () {
    try {
        return 'EventSource' in globalThis;
    }
    catch (e) {
        return false;
    }
};
exports.isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
exports.isEventSourceSupported = !exports.isReactNative && eventSourceSupported();
//# sourceMappingURL=constants.js.map