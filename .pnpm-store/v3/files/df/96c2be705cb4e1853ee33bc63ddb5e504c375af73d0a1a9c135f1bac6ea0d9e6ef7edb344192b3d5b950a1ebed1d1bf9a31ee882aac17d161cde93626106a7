"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachListeners = void 0;
var socket_io_1 = require("./socket-io");
var heartbeat_1 = require("./heartbeat");
var constants_1 = require("./constants");
var util_1 = require("./util");
var bindMessageHandler = function (webSocketInstance, optionsRef, setLastMessage, lastMessageTime) {
    webSocketInstance.onmessage = function (message) {
        var _a;
        optionsRef.current.onMessage && optionsRef.current.onMessage(message);
        if (typeof (lastMessageTime === null || lastMessageTime === void 0 ? void 0 : lastMessageTime.current) === 'number') {
            lastMessageTime.current = Date.now();
        }
        if (typeof optionsRef.current.filter === 'function' && optionsRef.current.filter(message) !== true) {
            return;
        }
        if (optionsRef.current.heartbeat &&
            typeof optionsRef.current.heartbeat !== "boolean" &&
            ((_a = optionsRef.current.heartbeat) === null || _a === void 0 ? void 0 : _a.returnMessage) === message.data) {
            return;
        }
        setLastMessage(message);
    };
};
var bindOpenHandler = function (webSocketInstance, optionsRef, setReadyState, reconnectCount, lastMessageTime) {
    webSocketInstance.onopen = function (event) {
        optionsRef.current.onOpen && optionsRef.current.onOpen(event);
        reconnectCount.current = 0;
        setReadyState(constants_1.ReadyState.OPEN);
        //start heart beat here
        if (optionsRef.current.heartbeat && webSocketInstance instanceof WebSocket) {
            var heartbeatOptions = typeof optionsRef.current.heartbeat === "boolean"
                ? undefined
                : optionsRef.current.heartbeat;
            lastMessageTime.current = Date.now();
            (0, heartbeat_1.heartbeat)(webSocketInstance, lastMessageTime, heartbeatOptions);
        }
    };
};
var bindCloseHandler = function (webSocketInstance, optionsRef, setReadyState, reconnect, reconnectCount) {
    if (constants_1.isEventSourceSupported && webSocketInstance instanceof EventSource) {
        return function () { };
    }
    (0, util_1.assertIsWebSocket)(webSocketInstance, optionsRef.current.skipAssert);
    var reconnectTimeout;
    webSocketInstance.onclose = function (event) {
        var _a;
        optionsRef.current.onClose && optionsRef.current.onClose(event);
        setReadyState(constants_1.ReadyState.CLOSED);
        if (optionsRef.current.shouldReconnect && optionsRef.current.shouldReconnect(event)) {
            var reconnectAttempts = (_a = optionsRef.current.reconnectAttempts) !== null && _a !== void 0 ? _a : constants_1.DEFAULT_RECONNECT_LIMIT;
            if (reconnectCount.current < reconnectAttempts) {
                var nextReconnectInterval = typeof optionsRef.current.reconnectInterval === 'function' ?
                    optionsRef.current.reconnectInterval(reconnectCount.current) :
                    optionsRef.current.reconnectInterval;
                reconnectTimeout = window.setTimeout(function () {
                    reconnectCount.current++;
                    reconnect();
                }, nextReconnectInterval !== null && nextReconnectInterval !== void 0 ? nextReconnectInterval : constants_1.DEFAULT_RECONNECT_INTERVAL_MS);
            }
            else {
                optionsRef.current.onReconnectStop && optionsRef.current.onReconnectStop(reconnectAttempts);
                console.warn("Max reconnect attempts of ".concat(reconnectAttempts, " exceeded"));
            }
        }
    };
    return function () { return reconnectTimeout && window.clearTimeout(reconnectTimeout); };
};
var bindErrorHandler = function (webSocketInstance, optionsRef, setReadyState, reconnect, reconnectCount) {
    var reconnectTimeout;
    webSocketInstance.onerror = function (error) {
        var _a;
        optionsRef.current.onError && optionsRef.current.onError(error);
        if (constants_1.isEventSourceSupported && webSocketInstance instanceof EventSource) {
            optionsRef.current.onClose && optionsRef.current.onClose(__assign(__assign({}, error), { code: 1006, reason: "An error occurred with the EventSource: ".concat(error), wasClean: false }));
            setReadyState(constants_1.ReadyState.CLOSED);
            webSocketInstance.close();
        }
        if (optionsRef.current.retryOnError) {
            if (reconnectCount.current < ((_a = optionsRef.current.reconnectAttempts) !== null && _a !== void 0 ? _a : constants_1.DEFAULT_RECONNECT_LIMIT)) {
                var nextReconnectInterval = typeof optionsRef.current.reconnectInterval === 'function' ?
                    optionsRef.current.reconnectInterval(reconnectCount.current) :
                    optionsRef.current.reconnectInterval;
                reconnectTimeout = window.setTimeout(function () {
                    reconnectCount.current++;
                    reconnect();
                }, nextReconnectInterval !== null && nextReconnectInterval !== void 0 ? nextReconnectInterval : constants_1.DEFAULT_RECONNECT_INTERVAL_MS);
            }
            else {
                optionsRef.current.onReconnectStop && optionsRef.current.onReconnectStop(optionsRef.current.reconnectAttempts);
                console.warn("Max reconnect attempts of ".concat(optionsRef.current.reconnectAttempts, " exceeded"));
            }
        }
    };
    return function () { return reconnectTimeout && window.clearTimeout(reconnectTimeout); };
};
var attachListeners = function (webSocketInstance, setters, optionsRef, reconnect, reconnectCount, lastMessageTime, sendMessage) {
    var setLastMessage = setters.setLastMessage, setReadyState = setters.setReadyState;
    var interval;
    var cancelReconnectOnClose;
    var cancelReconnectOnError;
    if (optionsRef.current.fromSocketIO) {
        interval = (0, socket_io_1.setUpSocketIOPing)(sendMessage);
    }
    bindMessageHandler(webSocketInstance, optionsRef, setLastMessage, lastMessageTime);
    bindOpenHandler(webSocketInstance, optionsRef, setReadyState, reconnectCount, lastMessageTime);
    cancelReconnectOnClose = bindCloseHandler(webSocketInstance, optionsRef, setReadyState, reconnect, reconnectCount);
    cancelReconnectOnError = bindErrorHandler(webSocketInstance, optionsRef, setReadyState, reconnect, reconnectCount);
    return function () {
        setReadyState(constants_1.ReadyState.CLOSING);
        cancelReconnectOnClose();
        cancelReconnectOnError();
        webSocketInstance.close();
        if (interval)
            clearInterval(interval);
    };
};
exports.attachListeners = attachListeners;
//# sourceMappingURL=attach-listener.js.map