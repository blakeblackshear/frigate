"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketWrapper = void 0;
var websocketWrapper = function (webSocket, start) {
    return new Proxy(webSocket, {
        get: function (obj, key) {
            var val = obj[key];
            if (key === 'reconnect')
                return start;
            if (typeof val === 'function') {
                console.error('Calling methods directly on the websocket is not supported at this moment. You must use the methods returned by useWebSocket.');
                //Prevent error thrown by invoking a non-function
                return function () { };
            }
            else {
                return val;
            }
        },
        set: function (obj, key, val) {
            if (/^on/.test(key)) {
                console.warn('The websocket\'s event handlers should be defined through the options object passed into useWebSocket.');
                return false;
            }
            else {
                obj[key] = val;
                return true;
            }
        },
    });
};
exports.websocketWrapper = websocketWrapper;
exports.default = exports.websocketWrapper;
//# sourceMappingURL=proxy.js.map