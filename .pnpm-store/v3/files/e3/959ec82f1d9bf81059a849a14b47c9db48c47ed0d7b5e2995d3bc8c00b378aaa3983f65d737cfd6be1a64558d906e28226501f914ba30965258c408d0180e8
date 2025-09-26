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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWebSocket = void 0;
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var constants_1 = require("./constants");
var create_or_join_1 = require("./create-or-join");
var get_url_1 = require("./get-url");
var proxy_1 = __importDefault(require("./proxy"));
var util_1 = require("./util");
var useWebSocket = function (url, options, connect) {
    if (options === void 0) { options = constants_1.DEFAULT_OPTIONS; }
    if (connect === void 0) { connect = true; }
    var _a = (0, react_1.useState)(null), lastMessage = _a[0], setLastMessage = _a[1];
    var _b = (0, react_1.useState)({}), readyState = _b[0], setReadyState = _b[1];
    var lastJsonMessage = (0, react_1.useMemo)(function () {
        if (!options.disableJson && lastMessage) {
            try {
                return JSON.parse(lastMessage.data);
            }
            catch (e) {
                return constants_1.UNPARSABLE_JSON_OBJECT;
            }
        }
        return null;
    }, [lastMessage, options.disableJson]);
    var convertedUrl = (0, react_1.useRef)(null);
    var webSocketRef = (0, react_1.useRef)(null);
    var startRef = (0, react_1.useRef)(function () { return void 0; });
    var reconnectCount = (0, react_1.useRef)(0);
    var lastMessageTime = (0, react_1.useRef)(Date.now());
    var messageQueue = (0, react_1.useRef)([]);
    var webSocketProxy = (0, react_1.useRef)(null);
    var optionsCache = (0, react_1.useRef)(options);
    optionsCache.current = options;
    var readyStateFromUrl = convertedUrl.current && readyState[convertedUrl.current] !== undefined ?
        readyState[convertedUrl.current] :
        url !== null && connect === true ?
            constants_1.ReadyState.CONNECTING :
            constants_1.ReadyState.UNINSTANTIATED;
    var stringifiedQueryParams = options.queryParams ? JSON.stringify(options.queryParams) : null;
    var sendMessage = (0, react_1.useCallback)(function (message, keep) {
        var _a;
        if (keep === void 0) { keep = true; }
        if (constants_1.isEventSourceSupported && webSocketRef.current instanceof EventSource) {
            console.warn('Unable to send a message from an eventSource');
            return;
        }
        if (((_a = webSocketRef.current) === null || _a === void 0 ? void 0 : _a.readyState) === constants_1.ReadyState.OPEN) {
            (0, util_1.assertIsWebSocket)(webSocketRef.current, optionsCache.current.skipAssert);
            webSocketRef.current.send(message);
        }
        else if (keep) {
            messageQueue.current.push(message);
        }
    }, []);
    var sendJsonMessage = (0, react_1.useCallback)(function (message, keep) {
        if (keep === void 0) { keep = true; }
        sendMessage(JSON.stringify(message), keep);
    }, [sendMessage]);
    var getWebSocket = (0, react_1.useCallback)(function () {
        if (optionsCache.current.share !== true || (constants_1.isEventSourceSupported && webSocketRef.current instanceof EventSource)) {
            return webSocketRef.current;
        }
        if (webSocketProxy.current === null && webSocketRef.current) {
            (0, util_1.assertIsWebSocket)(webSocketRef.current, optionsCache.current.skipAssert);
            webSocketProxy.current = (0, proxy_1.default)(webSocketRef.current, startRef);
        }
        return webSocketProxy.current;
    }, []);
    (0, react_1.useEffect)(function () {
        if (url !== null && connect === true) {
            var removeListeners_1;
            var expectClose_1 = false;
            var createOrJoin_1 = true;
            var start_1 = function () { return __awaiter(void 0, void 0, void 0, function () {
                var _a, protectedSetLastMessage, protectedSetReadyState;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = convertedUrl;
                            return [4 /*yield*/, (0, get_url_1.getUrl)(url, optionsCache)];
                        case 1:
                            _a.current = _b.sent();
                            if (convertedUrl.current === null) {
                                console.error('Failed to get a valid URL. WebSocket connection aborted.');
                                convertedUrl.current = 'ABORTED';
                                (0, react_dom_1.flushSync)(function () { return setReadyState(function (prev) { return (__assign(__assign({}, prev), { ABORTED: constants_1.ReadyState.CLOSED })); }); });
                                return [2 /*return*/];
                            }
                            protectedSetLastMessage = function (message) {
                                if (!expectClose_1) {
                                    (0, react_dom_1.flushSync)(function () { return setLastMessage(message); });
                                }
                            };
                            protectedSetReadyState = function (state) {
                                if (!expectClose_1) {
                                    (0, react_dom_1.flushSync)(function () { return setReadyState(function (prev) {
                                        var _a;
                                        return (__assign(__assign({}, prev), (convertedUrl.current && (_a = {}, _a[convertedUrl.current] = state, _a))));
                                    }); });
                                }
                            };
                            if (createOrJoin_1) {
                                removeListeners_1 = (0, create_or_join_1.createOrJoinSocket)(webSocketRef, convertedUrl.current, protectedSetReadyState, optionsCache, protectedSetLastMessage, startRef, reconnectCount, lastMessageTime, sendMessage);
                            }
                            return [2 /*return*/];
                    }
                });
            }); };
            startRef.current = function () {
                if (!expectClose_1) {
                    if (webSocketProxy.current)
                        webSocketProxy.current = null;
                    removeListeners_1 === null || removeListeners_1 === void 0 ? void 0 : removeListeners_1();
                    start_1();
                }
            };
            start_1();
            return function () {
                expectClose_1 = true;
                createOrJoin_1 = false;
                if (webSocketProxy.current)
                    webSocketProxy.current = null;
                removeListeners_1 === null || removeListeners_1 === void 0 ? void 0 : removeListeners_1();
                setLastMessage(null);
            };
        }
        else if (url === null || connect === false) {
            reconnectCount.current = 0; // reset reconnection attempts
            setReadyState(function (prev) {
                var _a;
                return (__assign(__assign({}, prev), (convertedUrl.current && (_a = {}, _a[convertedUrl.current] = constants_1.ReadyState.CLOSED, _a))));
            });
        }
    }, [url, connect, stringifiedQueryParams, sendMessage]);
    (0, react_1.useEffect)(function () {
        if (readyStateFromUrl === constants_1.ReadyState.OPEN) {
            messageQueue.current.splice(0).forEach(function (message) {
                sendMessage(message);
            });
        }
    }, [readyStateFromUrl]);
    return {
        sendMessage: sendMessage,
        sendJsonMessage: sendJsonMessage,
        lastMessage: lastMessage,
        lastJsonMessage: lastJsonMessage,
        readyState: readyStateFromUrl,
        getWebSocket: getWebSocket,
    };
};
exports.useWebSocket = useWebSocket;
//# sourceMappingURL=use-websocket.js.map