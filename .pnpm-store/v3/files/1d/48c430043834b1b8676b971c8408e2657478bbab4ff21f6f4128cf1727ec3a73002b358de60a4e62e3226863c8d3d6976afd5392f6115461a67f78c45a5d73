"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrJoinSocket = void 0;
var globals_1 = require("./globals");
var constants_1 = require("./constants");
var attach_listener_1 = require("./attach-listener");
var attach_shared_listeners_1 = require("./attach-shared-listeners");
var manage_subscribers_1 = require("./manage-subscribers");
//TODO ensure that all onClose callbacks are called
var cleanSubscribers = function (url, subscriber, optionsRef, setReadyState, clearSocketIoPingInterval) {
    return function () {
        (0, manage_subscribers_1.removeSubscriber)(url, subscriber);
        if (!(0, manage_subscribers_1.hasSubscribers)(url)) {
            try {
                var socketLike = globals_1.sharedWebSockets[url];
                if (socketLike instanceof WebSocket) {
                    socketLike.onclose = function (event) {
                        if (optionsRef.current.onClose) {
                            optionsRef.current.onClose(event);
                        }
                        setReadyState(constants_1.ReadyState.CLOSED);
                    };
                }
                socketLike.close();
            }
            catch (e) {
            }
            if (clearSocketIoPingInterval)
                clearSocketIoPingInterval();
            delete globals_1.sharedWebSockets[url];
        }
    };
};
var createOrJoinSocket = function (webSocketRef, url, setReadyState, optionsRef, setLastMessage, startRef, reconnectCount, lastMessageTime, sendMessage) {
    if (!constants_1.isEventSourceSupported && optionsRef.current.eventSourceOptions) {
        if (constants_1.isReactNative) {
            throw new Error('EventSource is not supported in ReactNative');
        }
        else {
            throw new Error('EventSource is not supported');
        }
    }
    if (optionsRef.current.share) {
        var clearSocketIoPingInterval = null;
        if (globals_1.sharedWebSockets[url] === undefined) {
            globals_1.sharedWebSockets[url] = optionsRef.current.eventSourceOptions ?
                new EventSource(url, optionsRef.current.eventSourceOptions) :
                new WebSocket(url, optionsRef.current.protocols);
            webSocketRef.current = globals_1.sharedWebSockets[url];
            setReadyState(constants_1.ReadyState.CONNECTING);
            clearSocketIoPingInterval = (0, attach_shared_listeners_1.attachSharedListeners)(globals_1.sharedWebSockets[url], url, optionsRef, sendMessage);
        }
        else {
            webSocketRef.current = globals_1.sharedWebSockets[url];
            setReadyState(globals_1.sharedWebSockets[url].readyState);
        }
        var subscriber = {
            setLastMessage: setLastMessage,
            setReadyState: setReadyState,
            optionsRef: optionsRef,
            reconnectCount: reconnectCount,
            lastMessageTime: lastMessageTime,
            reconnect: startRef,
        };
        (0, manage_subscribers_1.addSubscriber)(url, subscriber);
        return cleanSubscribers(url, subscriber, optionsRef, setReadyState, clearSocketIoPingInterval);
    }
    else {
        webSocketRef.current = optionsRef.current.eventSourceOptions ?
            new EventSource(url, optionsRef.current.eventSourceOptions) :
            new WebSocket(url, optionsRef.current.protocols);
        setReadyState(constants_1.ReadyState.CONNECTING);
        if (!webSocketRef.current) {
            throw new Error('WebSocket failed to be created');
        }
        return (0, attach_listener_1.attachListeners)(webSocketRef.current, {
            setLastMessage: setLastMessage,
            setReadyState: setReadyState
        }, optionsRef, startRef.current, reconnectCount, lastMessageTime, sendMessage);
    }
};
exports.createOrJoinSocket = createOrJoinSocket;
//# sourceMappingURL=create-or-join.js.map