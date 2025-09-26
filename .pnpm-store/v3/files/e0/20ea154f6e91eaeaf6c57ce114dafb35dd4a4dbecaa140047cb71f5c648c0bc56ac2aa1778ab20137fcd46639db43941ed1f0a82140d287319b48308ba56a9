"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUrl = void 0;
var socket_io_1 = require("./socket-io");
var constants_1 = require("./constants");
var waitFor = function (duration) { return new Promise(function (resolve) { return window.setTimeout(resolve, duration); }); };
var getUrl = function (url_1, optionsRef_1) {
    var args_1 = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args_1[_i - 2] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([url_1, optionsRef_1], args_1, true), void 0, function (url, optionsRef, retriedAttempts) {
        var convertedUrl, e_1, reconnectLimit, nextReconnectInterval, parsedUrl, parsedWithQueryParams;
        var _a, _b, _c;
        if (retriedAttempts === void 0) { retriedAttempts = 0; }
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!(typeof url === 'function')) return [3 /*break*/, 10];
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 3, , 9]);
                    return [4 /*yield*/, url()];
                case 2:
                    convertedUrl = _d.sent();
                    return [3 /*break*/, 9];
                case 3:
                    e_1 = _d.sent();
                    if (!optionsRef.current.retryOnError) return [3 /*break*/, 7];
                    reconnectLimit = (_a = optionsRef.current.reconnectAttempts) !== null && _a !== void 0 ? _a : constants_1.DEFAULT_RECONNECT_LIMIT;
                    if (!(retriedAttempts < reconnectLimit)) return [3 /*break*/, 5];
                    nextReconnectInterval = typeof optionsRef.current.reconnectInterval === 'function' ?
                        optionsRef.current.reconnectInterval(retriedAttempts) :
                        optionsRef.current.reconnectInterval;
                    return [4 /*yield*/, waitFor(nextReconnectInterval !== null && nextReconnectInterval !== void 0 ? nextReconnectInterval : constants_1.DEFAULT_RECONNECT_INTERVAL_MS)];
                case 4:
                    _d.sent();
                    return [2 /*return*/, (0, exports.getUrl)(url, optionsRef, retriedAttempts + 1)];
                case 5:
                    (_c = (_b = optionsRef.current).onReconnectStop) === null || _c === void 0 ? void 0 : _c.call(_b, retriedAttempts);
                    return [2 /*return*/, null];
                case 6: return [3 /*break*/, 8];
                case 7: return [2 /*return*/, null];
                case 8: return [3 /*break*/, 9];
                case 9: return [3 /*break*/, 11];
                case 10:
                    convertedUrl = url;
                    _d.label = 11;
                case 11:
                    parsedUrl = optionsRef.current.fromSocketIO ?
                        (0, socket_io_1.parseSocketIOUrl)(convertedUrl) :
                        convertedUrl;
                    parsedWithQueryParams = optionsRef.current.queryParams ?
                        (0, socket_io_1.appendQueryParams)(parsedUrl, optionsRef.current.queryParams) :
                        parsedUrl;
                    return [2 /*return*/, parsedWithQueryParams];
            }
        });
    });
};
exports.getUrl = getUrl;
//# sourceMappingURL=get-url.js.map