function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_with_holes(arr) {
    if (Array.isArray(arr)) return arr;
}
function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
function _instanceof(left, right) {
    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else {
        return left instanceof right;
    }
}
function _iterable_to_array_limit(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];
    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;
    var _s, _e;
    try {
        for(_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true){
            _arr.push(_s.value);
            if (i && _arr.length === i) break;
        }
    } catch (err) {
        _d = true;
        _e = err;
    } finally{
        try {
            if (!_n && _i["return"] != null) _i["return"]();
        } finally{
            if (_d) throw _e;
        }
    }
    return _arr;
}
function _non_iterable_rest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _sliced_to_array(arr, i) {
    return _array_with_holes(arr) || _iterable_to_array_limit(arr, i) || _unsupported_iterable_to_array(arr, i) || _non_iterable_rest();
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
function _ts_generator(thisArg, body) {
    var f, y, t, g, _ = {
        label: 0,
        sent: function() {
            if (t[0] & 1) throw t[1];
            return t[1];
        },
        trys: [],
        ops: []
    };
    return g = {
        next: verb(0),
        "throw": verb(1),
        "return": verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;
    function verb(n) {
        return function(v) {
            return step([
                n,
                v
            ]);
        };
    }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while(_)try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [
                op[0] & 2,
                t.value
            ];
            switch(op[0]){
                case 0:
                case 1:
                    t = op;
                    break;
                case 4:
                    _.label++;
                    return {
                        value: op[1],
                        done: false
                    };
                case 5:
                    _.label++;
                    y = op[1];
                    op = [
                        0
                    ];
                    continue;
                case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                        _ = 0;
                        continue;
                    }
                    if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                        _.label = op[1];
                        break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                        _.label = t[1];
                        t = op;
                        break;
                    }
                    if (t && _.label < t[2]) {
                        _.label = t[2];
                        _.ops.push(op);
                        break;
                    }
                    if (t[2]) _.ops.pop();
                    _.trys.pop();
                    continue;
            }
            op = body.call(thisArg, _);
        } catch (e) {
            op = [
                6,
                e
            ];
            y = 0;
        } finally{
            f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
}
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = function(cb, mod) {
    return function __require() {
        return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = {
            exports: {}
        }).exports, mod), mod.exports;
    };
};
var __export = function(target, all) {
    for(var name in all)__defProp(target, name, {
        get: all[name],
        enumerable: true
    });
};
var __copyProps = function(to, from, except, desc) {
    if (from && typeof from === "object" || typeof from === "function") {
        var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
        try {
            var _loop = function() {
                var key = _step.value;
                if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
                    get: function() {
                        return from[key];
                    },
                    enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
                });
            };
            for(var _iterator = __getOwnPropNames(from)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true)_loop();
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally{
            try {
                if (!_iteratorNormalCompletion && _iterator.return != null) {
                    _iterator.return();
                }
            } finally{
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }
    }
    return to;
};
var __toESM = function(mod, isNodeMode, target) {
    return target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(// If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
        value: mod,
        enumerable: true
    }) : target, mod);
};
var __toCommonJS = function(mod) {
    return __copyProps(__defProp({}, "__esModule", {
        value: true
    }), mod);
};
// node_modules/set-cookie-parser/lib/set-cookie.js
var require_set_cookie = __commonJS({
    "node_modules/set-cookie-parser/lib/set-cookie.js": function(exports, module2) {
        "use strict";
        var isNonEmptyString = function isNonEmptyString(str) {
            return typeof str === "string" && !!str.trim();
        };
        var parseString = function parseString(setCookieValue, options) {
            var parts = setCookieValue.split(";").filter(isNonEmptyString);
            var nameValuePairStr = parts.shift();
            var parsed = parseNameValuePair(nameValuePairStr);
            var name = parsed.name;
            var value = parsed.value;
            options = options ? Object.assign({}, defaultParseOptions, options) : defaultParseOptions;
            try {
                value = options.decodeValues ? decodeURIComponent(value) : value;
            } catch (e) {
                console.error("set-cookie-parser encountered an error while decoding a cookie with value '" + value + "'. Set options.decodeValues to false to disable this feature.", e);
            }
            var cookie = {
                name: name,
                value: value
            };
            parts.forEach(function(part) {
                var sides = part.split("=");
                var key = sides.shift().trimLeft().toLowerCase();
                var value2 = sides.join("=");
                if (key === "expires") {
                    cookie.expires = new Date(value2);
                } else if (key === "max-age") {
                    cookie.maxAge = parseInt(value2, 10);
                } else if (key === "secure") {
                    cookie.secure = true;
                } else if (key === "httponly") {
                    cookie.httpOnly = true;
                } else if (key === "samesite") {
                    cookie.sameSite = value2;
                } else {
                    cookie[key] = value2;
                }
            });
            return cookie;
        };
        var parseNameValuePair = function parseNameValuePair(nameValuePairStr) {
            var name = "";
            var value = "";
            var nameValueArr = nameValuePairStr.split("=");
            if (nameValueArr.length > 1) {
                name = nameValueArr.shift();
                value = nameValueArr.join("=");
            } else {
                value = nameValuePairStr;
            }
            return {
                name: name,
                value: value
            };
        };
        var parse = function parse(input, options) {
            options = options ? Object.assign({}, defaultParseOptions, options) : defaultParseOptions;
            if (!input) {
                if (!options.map) {
                    return [];
                } else {
                    return {};
                }
            }
            if (input.headers) {
                if (typeof input.headers.getSetCookie === "function") {
                    input = input.headers.getSetCookie();
                } else if (input.headers["set-cookie"]) {
                    input = input.headers["set-cookie"];
                } else {
                    var sch = input.headers[Object.keys(input.headers).find(function(key) {
                        return key.toLowerCase() === "set-cookie";
                    })];
                    if (!sch && input.headers.cookie && !options.silent) {
                        console.warn("Warning: set-cookie-parser appears to have been called on a request object. It is designed to parse Set-Cookie headers from responses, not Cookie headers from requests. Set the option {silent: true} to suppress this warning.");
                    }
                    input = sch;
                }
            }
            if (!Array.isArray(input)) {
                input = [
                    input
                ];
            }
            options = options ? Object.assign({}, defaultParseOptions, options) : defaultParseOptions;
            if (!options.map) {
                return input.filter(isNonEmptyString).map(function(str) {
                    return parseString(str, options);
                });
            } else {
                var cookies = {};
                return input.filter(isNonEmptyString).reduce(function(cookies2, str) {
                    var cookie = parseString(str, options);
                    cookies2[cookie.name] = cookie;
                    return cookies2;
                }, cookies);
            }
        };
        var splitCookiesString2 = function splitCookiesString2(cookiesString) {
            if (Array.isArray(cookiesString)) {
                return cookiesString;
            }
            if (typeof cookiesString !== "string") {
                return [];
            }
            var cookiesStrings = [];
            var pos = 0;
            var start;
            var ch;
            var lastComma;
            var nextStart;
            var cookiesSeparatorFound;
            function skipWhitespace() {
                while(pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))){
                    pos += 1;
                }
                return pos < cookiesString.length;
            }
            function notSpecialChar() {
                ch = cookiesString.charAt(pos);
                return ch !== "=" && ch !== ";" && ch !== ",";
            }
            while(pos < cookiesString.length){
                start = pos;
                cookiesSeparatorFound = false;
                while(skipWhitespace()){
                    ch = cookiesString.charAt(pos);
                    if (ch === ",") {
                        lastComma = pos;
                        pos += 1;
                        skipWhitespace();
                        nextStart = pos;
                        while(pos < cookiesString.length && notSpecialChar()){
                            pos += 1;
                        }
                        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
                            cookiesSeparatorFound = true;
                            pos = nextStart;
                            cookiesStrings.push(cookiesString.substring(start, lastComma));
                            start = pos;
                        } else {
                            pos = lastComma + 1;
                        }
                    } else {
                        pos += 1;
                    }
                }
                if (!cookiesSeparatorFound || pos >= cookiesString.length) {
                    cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
                }
            }
            return cookiesStrings;
        };
        var defaultParseOptions = {
            decodeValues: true,
            map: false,
            silent: false
        };
        module2.exports = parse;
        module2.exports.parse = parse;
        module2.exports.parseString = parseString;
        module2.exports.splitCookiesString = splitCookiesString2;
    }
});
// src/index.ts
var src_exports = {};
__export(src_exports, {
    Headers: function() {
        return Headers;
    },
    flattenHeadersList: function() {
        return flattenHeadersList;
    },
    flattenHeadersObject: function() {
        return flattenHeadersObject;
    },
    getRawHeaders: function() {
        return getRawHeaders;
    },
    headersToList: function() {
        return headersToList;
    },
    headersToObject: function() {
        return headersToObject;
    },
    headersToString: function() {
        return headersToString;
    },
    listToHeaders: function() {
        return listToHeaders;
    },
    objectToHeaders: function() {
        return objectToHeaders;
    },
    reduceHeadersObject: function() {
        return reduceHeadersObject;
    },
    stringToHeaders: function() {
        return stringToHeaders;
    }
});
module.exports = __toCommonJS(src_exports);
// src/Headers.ts
var import_set_cookie_parser = __toESM(require_set_cookie());
// src/utils/normalizeHeaderName.ts
var HEADERS_INVALID_CHARACTERS = /[^a-z0-9\-#$%&'*+.^_`|~]/i;
function normalizeHeaderName(name) {
    if (HEADERS_INVALID_CHARACTERS.test(name) || name.trim() === "") {
        throw new TypeError("Invalid character in header field name");
    }
    return name.trim().toLowerCase();
}
// src/utils/normalizeHeaderValue.ts
var charCodesToRemove = [
    String.fromCharCode(10),
    String.fromCharCode(13),
    String.fromCharCode(9),
    String.fromCharCode(32)
];
var HEADER_VALUE_REMOVE_REGEXP = new RegExp("(^[".concat(charCodesToRemove.join(""), "]|$[").concat(charCodesToRemove.join(""), "])"), "g");
function normalizeHeaderValue(value) {
    var nextValue = value.replace(HEADER_VALUE_REMOVE_REGEXP, "");
    return nextValue;
}
// src/utils/isValidHeaderName.ts
function isValidHeaderName(value) {
    if (typeof value !== "string") {
        return false;
    }
    if (value.length === 0) {
        return false;
    }
    for(var i = 0; i < value.length; i++){
        var character = value.charCodeAt(i);
        if (character > 127 || !isToken(character)) {
            return false;
        }
    }
    return true;
}
function isToken(value) {
    return ![
        127,
        32,
        "(",
        ")",
        "<",
        ">",
        "@",
        ",",
        ";",
        ":",
        "\\",
        '"',
        "/",
        "[",
        "]",
        "?",
        "=",
        "{",
        "}"
    ].includes(value);
}
// src/utils/isValidHeaderValue.ts
function isValidHeaderValue(value) {
    if (typeof value !== "string") {
        return false;
    }
    if (value.trim() !== value) {
        return false;
    }
    for(var i = 0; i < value.length; i++){
        var character = value.charCodeAt(i);
        if (// NUL.
        character === 0 || // HTTP newline bytes.
        character === 10 || character === 13) {
            return false;
        }
    }
    return true;
}
// src/Headers.ts
var NORMALIZED_HEADERS = Symbol("normalizedHeaders");
var RAW_HEADER_NAMES = Symbol("rawHeaderNames");
var HEADER_VALUE_DELIMITER = ", ";
var _a, _b, _c;
var Headers = /*#__PURE__*/ function() {
    "use strict";
    function _Headers(init) {
        var _this = this;
        _class_call_check(this, _Headers);
        var _init;
        // Normalized header {"name":"a, b"} storage.
        this[_a] = {};
        // Keeps the mapping between the raw header name
        // and the normalized header name to ease the lookup.
        this[_b] = /* @__PURE__ */ new Map();
        this[_c] = "Headers";
        if ([
            "Headers",
            "HeadersPolyfill"
        ].includes((_init = init) === null || _init === void 0 ? void 0 : _init.constructor.name) || _instanceof(init, _Headers) || typeof globalThis.Headers !== "undefined" && _instanceof(init, globalThis.Headers)) {
            var initialHeaders = init;
            initialHeaders.forEach(function(value, name) {
                _this.append(name, value);
            }, this);
        } else if (Array.isArray(init)) {
            init.forEach(function(param) {
                var _param = _sliced_to_array(param, 2), name = _param[0], value = _param[1];
                _this.append(name, Array.isArray(value) ? value.join(HEADER_VALUE_DELIMITER) : value);
            });
        } else if (init) {
            Object.getOwnPropertyNames(init).forEach(function(name) {
                var value = init[name];
                _this.append(name, Array.isArray(value) ? value.join(HEADER_VALUE_DELIMITER) : value);
            });
        }
    }
    _create_class(_Headers, [
        {
            key: (_a = NORMALIZED_HEADERS, _b = RAW_HEADER_NAMES, _c = Symbol.toStringTag, Symbol.iterator),
            value: function value() {
                return this.entries();
            }
        },
        {
            key: "keys",
            value: function keys() {
                var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, _step_value, name, err;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                            _state.label = 1;
                        case 1:
                            _state.trys.push([
                                1,
                                6,
                                7,
                                8
                            ]);
                            _iterator = this.entries()[Symbol.iterator]();
                            _state.label = 2;
                        case 2:
                            if (!!(_iteratorNormalCompletion = (_step = _iterator.next()).done)) return [
                                3,
                                5
                            ];
                            _step_value = _sliced_to_array(_step.value, 1), name = _step_value[0];
                            return [
                                4,
                                name
                            ];
                        case 3:
                            _state.sent();
                            _state.label = 4;
                        case 4:
                            _iteratorNormalCompletion = true;
                            return [
                                3,
                                2
                            ];
                        case 5:
                            return [
                                3,
                                8
                            ];
                        case 6:
                            err = _state.sent();
                            _didIteratorError = true;
                            _iteratorError = err;
                            return [
                                3,
                                8
                            ];
                        case 7:
                            try {
                                if (!_iteratorNormalCompletion && _iterator.return != null) {
                                    _iterator.return();
                                }
                            } finally{
                                if (_didIteratorError) {
                                    throw _iteratorError;
                                }
                            }
                            return [
                                7
                            ];
                        case 8:
                            return [
                                2
                            ];
                    }
                });
            }
        },
        {
            key: "values",
            value: function values() {
                var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, _step_value, value, err;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                            _state.label = 1;
                        case 1:
                            _state.trys.push([
                                1,
                                6,
                                7,
                                8
                            ]);
                            _iterator = this.entries()[Symbol.iterator]();
                            _state.label = 2;
                        case 2:
                            if (!!(_iteratorNormalCompletion = (_step = _iterator.next()).done)) return [
                                3,
                                5
                            ];
                            _step_value = _sliced_to_array(_step.value, 2), value = _step_value[1];
                            return [
                                4,
                                value
                            ];
                        case 3:
                            _state.sent();
                            _state.label = 4;
                        case 4:
                            _iteratorNormalCompletion = true;
                            return [
                                3,
                                2
                            ];
                        case 5:
                            return [
                                3,
                                8
                            ];
                        case 6:
                            err = _state.sent();
                            _didIteratorError = true;
                            _iteratorError = err;
                            return [
                                3,
                                8
                            ];
                        case 7:
                            try {
                                if (!_iteratorNormalCompletion && _iterator.return != null) {
                                    _iterator.return();
                                }
                            } finally{
                                if (_didIteratorError) {
                                    throw _iteratorError;
                                }
                            }
                            return [
                                7
                            ];
                        case 8:
                            return [
                                2
                            ];
                    }
                });
            }
        },
        {
            key: "entries",
            value: function entries() {
                var sortedKeys, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, name, _iteratorNormalCompletion1, _didIteratorError1, _iteratorError1, _iterator1, _step1, value, err, err;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            sortedKeys = Object.keys(this[NORMALIZED_HEADERS]).sort(function(a, b) {
                                return a.localeCompare(b);
                            });
                            _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                            _state.label = 1;
                        case 1:
                            _state.trys.push([
                                1,
                                15,
                                16,
                                17
                            ]);
                            _iterator = sortedKeys[Symbol.iterator]();
                            _state.label = 2;
                        case 2:
                            if (!!(_iteratorNormalCompletion = (_step = _iterator.next()).done)) return [
                                3,
                                14
                            ];
                            name = _step.value;
                            if (!(name === "set-cookie")) return [
                                3,
                                11
                            ];
                            _iteratorNormalCompletion1 = true, _didIteratorError1 = false, _iteratorError1 = undefined;
                            _state.label = 3;
                        case 3:
                            _state.trys.push([
                                3,
                                8,
                                9,
                                10
                            ]);
                            _iterator1 = this.getSetCookie()[Symbol.iterator]();
                            _state.label = 4;
                        case 4:
                            if (!!(_iteratorNormalCompletion1 = (_step1 = _iterator1.next()).done)) return [
                                3,
                                7
                            ];
                            value = _step1.value;
                            return [
                                4,
                                [
                                    name,
                                    value
                                ]
                            ];
                        case 5:
                            _state.sent();
                            _state.label = 6;
                        case 6:
                            _iteratorNormalCompletion1 = true;
                            return [
                                3,
                                4
                            ];
                        case 7:
                            return [
                                3,
                                10
                            ];
                        case 8:
                            err = _state.sent();
                            _didIteratorError1 = true;
                            _iteratorError1 = err;
                            return [
                                3,
                                10
                            ];
                        case 9:
                            try {
                                if (!_iteratorNormalCompletion1 && _iterator1.return != null) {
                                    _iterator1.return();
                                }
                            } finally{
                                if (_didIteratorError1) {
                                    throw _iteratorError1;
                                }
                            }
                            return [
                                7
                            ];
                        case 10:
                            return [
                                3,
                                13
                            ];
                        case 11:
                            return [
                                4,
                                [
                                    name,
                                    this.get(name)
                                ]
                            ];
                        case 12:
                            _state.sent();
                            _state.label = 13;
                        case 13:
                            _iteratorNormalCompletion = true;
                            return [
                                3,
                                2
                            ];
                        case 14:
                            return [
                                3,
                                17
                            ];
                        case 15:
                            err = _state.sent();
                            _didIteratorError = true;
                            _iteratorError = err;
                            return [
                                3,
                                17
                            ];
                        case 16:
                            try {
                                if (!_iteratorNormalCompletion && _iterator.return != null) {
                                    _iterator.return();
                                }
                            } finally{
                                if (_didIteratorError) {
                                    throw _iteratorError;
                                }
                            }
                            return [
                                7
                            ];
                        case 17:
                            return [
                                2
                            ];
                    }
                });
            }
        },
        {
            /**
   * Returns a boolean stating whether a `Headers` object contains a certain header.
   */ key: "has",
            value: function has(name) {
                if (!isValidHeaderName(name)) {
                    throw new TypeError('Invalid header name "'.concat(name, '"'));
                }
                return this[NORMALIZED_HEADERS].hasOwnProperty(normalizeHeaderName(name));
            }
        },
        {
            /**
   * Returns a `ByteString` sequence of all the values of a header with a given name.
   */ key: "get",
            value: function get(name) {
                if (!isValidHeaderName(name)) {
                    throw TypeError('Invalid header name "'.concat(name, '"'));
                }
                var _this_NORMALIZED_HEADERS_normalizeHeaderName;
                return (_this_NORMALIZED_HEADERS_normalizeHeaderName = this[NORMALIZED_HEADERS][normalizeHeaderName(name)]) !== null && _this_NORMALIZED_HEADERS_normalizeHeaderName !== void 0 ? _this_NORMALIZED_HEADERS_normalizeHeaderName : null;
            }
        },
        {
            /**
   * Sets a new value for an existing header inside a `Headers` object, or adds the header if it does not already exist.
   */ key: "set",
            value: function set(name, value) {
                if (!isValidHeaderName(name) || !isValidHeaderValue(value)) {
                    return;
                }
                var normalizedName = normalizeHeaderName(name);
                var normalizedValue = normalizeHeaderValue(value);
                this[NORMALIZED_HEADERS][normalizedName] = normalizeHeaderValue(normalizedValue);
                this[RAW_HEADER_NAMES].set(normalizedName, name);
            }
        },
        {
            /**
   * Appends a new value onto an existing header inside a `Headers` object, or adds the header if it does not already exist.
   */ key: "append",
            value: function append(name, value) {
                if (!isValidHeaderName(name) || !isValidHeaderValue(value)) {
                    return;
                }
                var normalizedName = normalizeHeaderName(name);
                var normalizedValue = normalizeHeaderValue(value);
                var resolvedValue = this.has(normalizedName) ? "".concat(this.get(normalizedName), ", ").concat(normalizedValue) : normalizedValue;
                this.set(name, resolvedValue);
            }
        },
        {
            /**
   * Deletes a header from the `Headers` object.
   */ key: "delete",
            value: function _delete(name) {
                if (!isValidHeaderName(name)) {
                    return;
                }
                if (!this.has(name)) {
                    return;
                }
                var normalizedName = normalizeHeaderName(name);
                delete this[NORMALIZED_HEADERS][normalizedName];
                this[RAW_HEADER_NAMES].delete(normalizedName);
            }
        },
        {
            /**
   * Traverses the `Headers` object,
   * calling the given callback for each header.
   */ key: "forEach",
            value: function forEach(callback, thisArg) {
                var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                try {
                    for(var _iterator = this.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                        var _step_value = _sliced_to_array(_step.value, 2), name = _step_value[0], value = _step_value[1];
                        callback.call(thisArg, value, name, this);
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally{
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return != null) {
                            _iterator.return();
                        }
                    } finally{
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            }
        },
        {
            /**
   * Returns an array containing the values
   * of all Set-Cookie headers associated
   * with a response
   */ key: "getSetCookie",
            value: function getSetCookie() {
                var setCookieHeader = this.get("set-cookie");
                if (setCookieHeader === null) {
                    return [];
                }
                if (setCookieHeader === "") {
                    return [
                        ""
                    ];
                }
                return (0, import_set_cookie_parser.splitCookiesString)(setCookieHeader);
            }
        }
    ]);
    return _Headers;
}();
// src/getRawHeaders.ts
function getRawHeaders(headers) {
    var rawHeaders = {};
    var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
    try {
        for(var _iterator = headers.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
            var _step_value = _sliced_to_array(_step.value, 2), name = _step_value[0], value = _step_value[1];
            rawHeaders[headers[RAW_HEADER_NAMES].get(name)] = value;
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally{
        try {
            if (!_iteratorNormalCompletion && _iterator.return != null) {
                _iterator.return();
            }
        } finally{
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }
    return rawHeaders;
}
// src/transformers/headersToList.ts
function headersToList(headers) {
    var headersList = [];
    headers.forEach(function(value, name) {
        var resolvedValue = value.includes(",") ? value.split(",").map(function(value2) {
            return value2.trim();
        }) : value;
        headersList.push([
            name,
            resolvedValue
        ]);
    });
    return headersList;
}
// src/transformers/headersToString.ts
function headersToString(headers) {
    var list = headersToList(headers);
    var lines = list.map(function(param) {
        var _param = _sliced_to_array(param, 2), name = _param[0], value = _param[1];
        var values = [].concat(value);
        return "".concat(name, ": ").concat(values.join(", "));
    });
    return lines.join("\r\n");
}
// src/transformers/headersToObject.ts
var singleValueHeaders = [
    "user-agent"
];
function headersToObject(headers) {
    var headersObject = {};
    headers.forEach(function(value, name) {
        var isMultiValue = !singleValueHeaders.includes(name.toLowerCase()) && value.includes(",");
        headersObject[name] = isMultiValue ? value.split(",").map(function(s) {
            return s.trim();
        }) : value;
    });
    return headersObject;
}
// src/transformers/stringToHeaders.ts
function stringToHeaders(str) {
    var lines = str.trim().split(/[\r\n]+/);
    return lines.reduce(function(headers, line) {
        if (line.trim() === "") {
            return headers;
        }
        var parts = line.split(": ");
        var name = parts.shift();
        var value = parts.join(": ");
        headers.append(name, value);
        return headers;
    }, new Headers());
}
// src/transformers/listToHeaders.ts
function listToHeaders(list) {
    var headers = new Headers();
    list.forEach(function(param) {
        var _param = _sliced_to_array(param, 2), name = _param[0], value = _param[1];
        var values = [].concat(value);
        values.forEach(function(value2) {
            headers.append(name, value2);
        });
    });
    return headers;
}
// src/transformers/reduceHeadersObject.ts
function reduceHeadersObject(headers, reducer, initialState) {
    return Object.keys(headers).reduce(function(nextHeaders, name) {
        return reducer(nextHeaders, name, headers[name]);
    }, initialState);
}
// src/transformers/objectToHeaders.ts
function objectToHeaders(headersObject) {
    return reduceHeadersObject(headersObject, function(headers, name, value) {
        var values = [].concat(value).filter(Boolean);
        values.forEach(function(value2) {
            headers.append(name, value2);
        });
        return headers;
    }, new Headers());
}
// src/transformers/flattenHeadersList.ts
function flattenHeadersList(list) {
    return list.map(function(param) {
        var _param = _sliced_to_array(param, 2), name = _param[0], values = _param[1];
        return [
            name,
            [].concat(values).join(", ")
        ];
    });
}
// src/transformers/flattenHeadersObject.ts
function flattenHeadersObject(headersObject) {
    return reduceHeadersObject(headersObject, function(headers, name, value) {
        headers[name] = [].concat(value).join(", ");
        return headers;
    }, {});
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
    Headers: Headers,
    flattenHeadersList: flattenHeadersList,
    flattenHeadersObject: flattenHeadersObject,
    getRawHeaders: getRawHeaders,
    headersToList: headersToList,
    headersToObject: headersToObject,
    headersToString: headersToString,
    listToHeaders: listToHeaders,
    objectToHeaders: objectToHeaders,
    reduceHeadersObject: reduceHeadersObject,
    stringToHeaders: stringToHeaders
});
//# sourceMappingURL=index.js.map