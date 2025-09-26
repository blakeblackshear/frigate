"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.heartbeat = heartbeat;
var constants_1 = require("./constants");
function getLastMessageTime(lastMessageTime) {
    if (Array.isArray(lastMessageTime)) {
        return lastMessageTime.reduce(function (p, c) { return (p.current > c.current) ? p : c; }).current;
    }
    return lastMessageTime.current;
}
function heartbeat(ws, lastMessageTime, options) {
    var _a = options || {}, _b = _a.interval, interval = _b === void 0 ? constants_1.DEFAULT_HEARTBEAT.interval : _b, _c = _a.timeout, timeout = _c === void 0 ? constants_1.DEFAULT_HEARTBEAT.timeout : _c, _d = _a.message, message = _d === void 0 ? constants_1.DEFAULT_HEARTBEAT.message : _d;
    // how often check interval between ping messages
    // minimum is 100ms
    // maximum is ${interval / 10}ms
    var intervalCheck = Math.max(100, interval / 10);
    var lastPingSentAt = Date.now();
    var heartbeatInterval = setInterval(function () {
        var timeNow = Date.now();
        var lastMessageReceivedAt = getLastMessageTime(lastMessageTime);
        if (lastMessageReceivedAt + timeout <= timeNow) {
            console.warn("Heartbeat timed out, closing connection, last message received ".concat(timeNow - lastMessageReceivedAt, "ms ago, last ping sent ").concat(timeNow - lastPingSentAt, "ms ago"));
            ws.close();
        }
        else {
            if (lastMessageReceivedAt + interval <= timeNow && lastPingSentAt + interval <= timeNow) {
                try {
                    if (typeof message === 'function') {
                        ws.send(message());
                    }
                    else {
                        ws.send(message);
                    }
                    lastPingSentAt = timeNow;
                }
                catch (err) {
                    console.error("Heartbeat failed, closing connection", err instanceof Error ? err.message : err);
                    ws.close();
                }
            }
        }
    }, intervalCheck);
    ws.addEventListener("close", function () {
        clearInterval(heartbeatInterval);
    });
    return function () { };
}
//# sourceMappingURL=heartbeat.js.map