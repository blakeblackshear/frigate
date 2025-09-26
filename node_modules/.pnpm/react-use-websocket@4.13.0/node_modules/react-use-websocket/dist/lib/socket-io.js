"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUpSocketIOPing = exports.appendQueryParams = exports.parseSocketIOUrl = void 0;
var constants_1 = require("./constants");
var parseSocketIOUrl = function (url) {
    if (url) {
        var isSecure = /^https|wss/.test(url);
        var strippedProtocol = url.replace(/^(https?|wss?)(:\/\/)?/, '');
        var removedFinalBackSlack = strippedProtocol.replace(/\/$/, '');
        var protocol = isSecure ? 'wss' : 'ws';
        return "".concat(protocol, "://").concat(removedFinalBackSlack).concat(constants_1.SOCKET_IO_PATH);
    }
    else if (url === '') {
        var isSecure = /^https/.test(window.location.protocol);
        var protocol = isSecure ? 'wss' : 'ws';
        var port = window.location.port ? ":".concat(window.location.port) : '';
        return "".concat(protocol, "://").concat(window.location.hostname).concat(port).concat(constants_1.SOCKET_IO_PATH);
    }
    return url;
};
exports.parseSocketIOUrl = parseSocketIOUrl;
var appendQueryParams = function (url, params) {
    if (params === void 0) { params = {}; }
    var hasParamsRegex = /\?([\w]+=[\w]+)/;
    var alreadyHasParams = hasParamsRegex.test(url);
    var stringified = "".concat(Object.entries(params).reduce(function (next, _a) {
        var key = _a[0], value = _a[1];
        return next + "".concat(key, "=").concat(value, "&");
    }, '').slice(0, -1));
    return "".concat(url).concat(alreadyHasParams ? '&' : '?').concat(stringified);
};
exports.appendQueryParams = appendQueryParams;
var setUpSocketIOPing = function (sendMessage, interval) {
    if (interval === void 0) { interval = constants_1.SOCKET_IO_PING_INTERVAL; }
    var ping = function () { return sendMessage(constants_1.SOCKET_IO_PING_CODE); };
    return window.setInterval(ping, interval);
};
exports.setUpSocketIOPing = setUpSocketIOPing;
//# sourceMappingURL=socket-io.js.map