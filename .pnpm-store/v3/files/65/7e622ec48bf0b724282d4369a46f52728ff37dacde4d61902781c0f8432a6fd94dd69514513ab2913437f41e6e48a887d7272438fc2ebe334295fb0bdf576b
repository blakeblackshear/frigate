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
exports.attachSharedListeners = void 0;
var globals_1 = require("./globals");
var constants_1 = require("./constants");
var manage_subscribers_1 = require("./manage-subscribers");
var socket_io_1 = require("./socket-io");
var heartbeat_1 = require("./heartbeat");
var bindMessageHandler = function (webSocketInstance, url, heartbeatOptions) {
    webSocketInstance.onmessage = function (message) {
        (0, manage_subscribers_1.getSubscribers)(url).forEach(function (subscriber) {
            var _a;
            if (subscriber.optionsRef.current.onMessage) {
                subscriber.optionsRef.current.onMessage(message);
            }
            if (typeof ((_a = subscriber === null || subscriber === void 0 ? void 0 : subscriber.lastMessageTime) === null || _a === void 0 ? void 0 : _a.current) === 'number') {
                subscriber.lastMessageTime.current = Date.now();
            }
            if (typeof subscriber.optionsRef.current.filter === 'function' &&
                subscriber.optionsRef.current.filter(message) !== true) {
                return;
            }
            if (heartbeatOptions &&
                typeof heartbeatOptions !== "boolean" &&
                (heartbeatOptions === null || heartbeatOptions === void 0 ? void 0 : heartbeatOptions.returnMessage) === message.data)
                return;
            subscriber.setLastMessage(message);
        });
    };
};
var bindOpenHandler = function (webSocketInstance, url, heartbeatOptions) {
    webSocketInstance.onopen = function (event) {
        var subscribers = (0, manage_subscribers_1.getSubscribers)(url);
        subscribers.forEach(function (subscriber) {
            subscriber.reconnectCount.current = 0;
            if (subscriber.optionsRef.current.onOpen) {
                subscriber.optionsRef.current.onOpen(event);
            }
            subscriber.setReadyState(constants_1.ReadyState.OPEN);
            var onMessageCb;
            if (heartbeatOptions && webSocketInstance instanceof WebSocket) {
                subscriber.lastMessageTime.current = Date.now();
            }
        });
        if (heartbeatOptions && webSocketInstance instanceof WebSocket) {
            (0, heartbeat_1.heartbeat)(webSocketInstance, subscribers.map(function (subscriber) { return subscriber.lastMessageTime; }), typeof heartbeatOptions === 'boolean' ? undefined : heartbeatOptions);
        }
    };
};
var bindCloseHandler = function (webSocketInstance, url) {
    if (webSocketInstance instanceof WebSocket) {
        webSocketInstance.onclose = function (event) {
            (0, manage_subscribers_1.getSubscribers)(url).forEach(function (subscriber) {
                if (subscriber.optionsRef.current.onClose) {
                    subscriber.optionsRef.current.onClose(event);
                }
                subscriber.setReadyState(constants_1.ReadyState.CLOSED);
            });
            delete globals_1.sharedWebSockets[url];
            (0, manage_subscribers_1.getSubscribers)(url).forEach(function (subscriber) {
                var _a;
                if (subscriber.optionsRef.current.shouldReconnect &&
                    subscriber.optionsRef.current.shouldReconnect(event)) {
                    var reconnectAttempts = (_a = subscriber.optionsRef.current.reconnectAttempts) !== null && _a !== void 0 ? _a : constants_1.DEFAULT_RECONNECT_LIMIT;
                    if (subscriber.reconnectCount.current < reconnectAttempts) {
                        var nextReconnectInterval = typeof subscriber.optionsRef.current.reconnectInterval === 'function' ?
                            subscriber.optionsRef.current.reconnectInterval(subscriber.reconnectCount.current) :
                            subscriber.optionsRef.current.reconnectInterval;
                        setTimeout(function () {
                            subscriber.reconnectCount.current++;
                            subscriber.reconnect.current();
                        }, nextReconnectInterval !== null && nextReconnectInterval !== void 0 ? nextReconnectInterval : constants_1.DEFAULT_RECONNECT_INTERVAL_MS);
                    }
                    else {
                        subscriber.optionsRef.current.onReconnectStop && subscriber.optionsRef.current.onReconnectStop(subscriber.optionsRef.current.reconnectAttempts);
                        console.warn("Max reconnect attempts of ".concat(reconnectAttempts, " exceeded"));
                    }
                }
            });
        };
    }
};
var bindErrorHandler = function (webSocketInstance, url) {
    webSocketInstance.onerror = function (error) {
        (0, manage_subscribers_1.getSubscribers)(url).forEach(function (subscriber) {
            if (subscriber.optionsRef.current.onError) {
                subscriber.optionsRef.current.onError(error);
            }
            if (constants_1.isEventSourceSupported && webSocketInstance instanceof EventSource) {
                subscriber.optionsRef.current.onClose && subscriber.optionsRef.current.onClose(__assign(__assign({}, error), { code: 1006, reason: "An error occurred with the EventSource: ".concat(error), wasClean: false }));
                subscriber.setReadyState(constants_1.ReadyState.CLOSED);
            }
        });
        if (constants_1.isEventSourceSupported && webSocketInstance instanceof EventSource) {
            webSocketInstance.close();
        }
    };
};
var attachSharedListeners = function (webSocketInstance, url, optionsRef, sendMessage) {
    var interval;
    if (optionsRef.current.fromSocketIO) {
        interval = (0, socket_io_1.setUpSocketIOPing)(sendMessage);
    }
    bindMessageHandler(webSocketInstance, url, optionsRef.current.heartbeat);
    bindCloseHandler(webSocketInstance, url);
    bindOpenHandler(webSocketInstance, url, optionsRef.current.heartbeat);
    bindErrorHandler(webSocketInstance, url);
    return function () {
        if (interval)
            clearInterval(interval);
    };
};
exports.attachSharedListeners = attachSharedListeners;
//# sourceMappingURL=attach-shared-listeners.js.map