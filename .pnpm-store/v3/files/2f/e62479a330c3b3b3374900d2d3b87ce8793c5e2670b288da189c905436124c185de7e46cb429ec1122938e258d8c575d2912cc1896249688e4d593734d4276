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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEventSource = void 0;
var react_1 = require("react");
var use_websocket_1 = require("./use-websocket");
var constants_1 = require("./constants");
var useEventSource = function (url, _a, connect) {
    if (_a === void 0) { _a = constants_1.DEFAULT_EVENT_SOURCE_OPTIONS; }
    var withCredentials = _a.withCredentials, events = _a.events, options = __rest(_a, ["withCredentials", "events"]);
    if (connect === void 0) { connect = true; }
    var optionsWithEventSource = __assign(__assign({}, options), { eventSourceOptions: {
            withCredentials: withCredentials,
        } });
    var eventsRef = (0, react_1.useRef)(constants_1.EMPTY_EVENT_HANDLERS);
    if (events) {
        eventsRef.current = events;
    }
    var _b = (0, use_websocket_1.useWebSocket)(url, optionsWithEventSource, connect), lastMessage = _b.lastMessage, readyState = _b.readyState, getWebSocket = _b.getWebSocket;
    (0, react_1.useEffect)(function () {
        if (lastMessage === null || lastMessage === void 0 ? void 0 : lastMessage.type) {
            Object.entries(eventsRef.current).forEach(function (_a) {
                var type = _a[0], handler = _a[1];
                if (type === lastMessage.type) {
                    handler(lastMessage);
                }
            });
        }
    }, [lastMessage]);
    return {
        lastEvent: lastMessage,
        readyState: readyState,
        getEventSource: getWebSocket,
    };
};
exports.useEventSource = useEventSource;
//# sourceMappingURL=use-event-source.js.map