"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertIsWebSocket = assertIsWebSocket;
exports.resetGlobalState = resetGlobalState;
var globals_1 = require("./globals");
var manage_subscribers_1 = require("./manage-subscribers");
function assertIsWebSocket(webSocketInstance, skip) {
    if (!skip && webSocketInstance instanceof WebSocket === false)
        throw new Error('');
}
;
function resetGlobalState(url) {
    (0, manage_subscribers_1.resetSubscribers)(url);
    (0, globals_1.resetWebSockets)(url);
}
;
//# sourceMappingURL=util.js.map