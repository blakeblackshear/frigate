"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetWebSockets = exports.sharedWebSockets = void 0;
exports.sharedWebSockets = {};
var resetWebSockets = function (url) {
    if (url && exports.sharedWebSockets.hasOwnProperty(url)) {
        delete exports.sharedWebSockets[url];
    }
    else {
        for (var url_1 in exports.sharedWebSockets) {
            if (exports.sharedWebSockets.hasOwnProperty(url_1)) {
                delete exports.sharedWebSockets[url_1];
            }
        }
    }
};
exports.resetWebSockets = resetWebSockets;
//# sourceMappingURL=globals.js.map