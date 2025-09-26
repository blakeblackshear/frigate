(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.RTKQ = {}));
})(this, (function (exports) { 'use strict';

    var __extends = (undefined && undefined.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            if (typeof b !== "function" && b !== null)
                throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
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
    var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from) {
        for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
            to[j] = from[i];
        return to;
    };
    var __defProp = Object.defineProperty;
    var __defProps = Object.defineProperties;
    var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
    var __getOwnPropSymbols = Object.getOwnPropertySymbols;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __propIsEnum = Object.prototype.propertyIsEnumerable;
    var __defNormalProp = function (obj, key, value) { return key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value: value }) : obj[key] = value; };
    var __spreadValues = function (a2, b2) {
        for (var prop in b2 || (b2 = {}))
            if (__hasOwnProp.call(b2, prop))
                __defNormalProp(a2, prop, b2[prop]);
        if (__getOwnPropSymbols)
            for (var _j = 0, _k = __getOwnPropSymbols(b2); _j < _k.length; _j++) {
                var prop = _k[_j];
                if (__propIsEnum.call(b2, prop))
                    __defNormalProp(a2, prop, b2[prop]);
            }
        return a2;
    };
    var __spreadProps = function (a2, b2) { return __defProps(a2, __getOwnPropDescs(b2)); };
    var __objRest = function (source, exclude) {
        var target = {};
        for (var prop in source)
            if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
                target[prop] = source[prop];
        if (source != null && __getOwnPropSymbols)
            for (var _j = 0, _k = __getOwnPropSymbols(source); _j < _k.length; _j++) {
                var prop = _k[_j];
                if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
                    target[prop] = source[prop];
            }
        return target;
    };
    var __async = function (__this, __arguments, generator) {
        return new Promise(function (resolve, reject) {
            var fulfilled = function (value) {
                try {
                    step(generator.next(value));
                }
                catch (e2) {
                    reject(e2);
                }
            };
            var rejected = function (value) {
                try {
                    step(generator.throw(value));
                }
                catch (e2) {
                    reject(e2);
                }
            };
            var step = function (x2) { return x2.done ? resolve(x2.value) : Promise.resolve(x2.value).then(fulfilled, rejected); };
            step((generator = generator.apply(__this, __arguments)).next());
        });
    };
    // src/query/core/apiState.ts
    exports.QueryStatus = void 0;
    (function (QueryStatus2) {
        QueryStatus2["uninitialized"] = "uninitialized";
        QueryStatus2["pending"] = "pending";
        QueryStatus2["fulfilled"] = "fulfilled";
        QueryStatus2["rejected"] = "rejected";
    })(exports.QueryStatus || (exports.QueryStatus = {}));
    function getRequestStatusFlags(status) {
        return {
            status: status,
            isUninitialized: status === exports.QueryStatus.uninitialized,
            isLoading: status === exports.QueryStatus.pending,
            isSuccess: status === exports.QueryStatus.fulfilled,
            isError: status === exports.QueryStatus.rejected
        };
    }
    // src/query/utils/isAbsoluteUrl.ts
    function isAbsoluteUrl(url) {
        return new RegExp("(^|:)//").test(url);
    }
    // src/query/utils/joinUrls.ts
    var withoutTrailingSlash = function (url) { return url.replace(/\/$/, ""); };
    var withoutLeadingSlash = function (url) { return url.replace(/^\//, ""); };
    function joinUrls(base, url) {
        if (!base) {
            return url;
        }
        if (!url) {
            return base;
        }
        if (isAbsoluteUrl(url)) {
            return url;
        }
        var delimiter = base.endsWith("/") || !url.startsWith("?") ? "/" : "";
        base = withoutTrailingSlash(base);
        url = withoutLeadingSlash(url);
        return "" + base + delimiter + url;
    }
    // src/query/utils/flatten.ts
    var flatten = function (arr) { return [].concat.apply([], arr); };
    // src/query/utils/isOnline.ts
    function isOnline() {
        return typeof navigator === "undefined" ? true : navigator.onLine === void 0 ? true : navigator.onLine;
    }
    // src/query/utils/isDocumentVisible.ts
    function isDocumentVisible() {
        if (typeof document === "undefined") {
            return true;
        }
        return document.visibilityState !== "hidden";
    }
    // ../../node_modules/immer/dist/immer.esm.mjs
    function n(n2) {
        for (var r2 = arguments.length, t2 = Array(r2 > 1 ? r2 - 1 : 0), e2 = 1; e2 < r2; e2++)
            t2[e2 - 1] = arguments[e2];
        {
            var i2 = Y[n2], o2 = i2 ? typeof i2 == "function" ? i2.apply(null, t2) : i2 : "unknown error nr: " + n2;
            throw Error("[Immer] " + o2);
        }
    }
    function r(n2) {
        return !!n2 && !!n2[Q];
    }
    function t(n2) {
        var r2;
        return !!n2 && (function (n3) {
            if (!n3 || typeof n3 != "object")
                return false;
            var r3 = Object.getPrototypeOf(n3);
            if (r3 === null)
                return true;
            var t2 = Object.hasOwnProperty.call(r3, "constructor") && r3.constructor;
            return t2 === Object || typeof t2 == "function" && Function.toString.call(t2) === Z;
        }(n2) || Array.isArray(n2) || !!n2[L] || !!((r2 = n2.constructor) === null || r2 === void 0 ? void 0 : r2[L]) || s(n2) || v(n2));
    }
    function e(t2) {
        return r(t2) || n(23, t2), t2[Q].t;
    }
    function i(n2, r2, t2) {
        t2 === void 0 && (t2 = false), o(n2) === 0 ? (t2 ? Object.keys : nn)(n2).forEach(function (e2) {
            t2 && typeof e2 == "symbol" || r2(e2, n2[e2], n2);
        }) : n2.forEach(function (t3, e2) {
            return r2(e2, t3, n2);
        });
    }
    function o(n2) {
        var r2 = n2[Q];
        return r2 ? r2.i > 3 ? r2.i - 4 : r2.i : Array.isArray(n2) ? 1 : s(n2) ? 2 : v(n2) ? 3 : 0;
    }
    function u(n2, r2) {
        return o(n2) === 2 ? n2.has(r2) : Object.prototype.hasOwnProperty.call(n2, r2);
    }
    function a(n2, r2) {
        return o(n2) === 2 ? n2.get(r2) : n2[r2];
    }
    function f(n2, r2, t2) {
        var e2 = o(n2);
        e2 === 2 ? n2.set(r2, t2) : e2 === 3 ? n2.add(t2) : n2[r2] = t2;
    }
    function c(n2, r2) {
        return n2 === r2 ? n2 !== 0 || 1 / n2 == 1 / r2 : n2 != n2 && r2 != r2;
    }
    function s(n2) {
        return X && n2 instanceof Map;
    }
    function v(n2) {
        return q && n2 instanceof Set;
    }
    function p(n2) {
        return n2.o || n2.t;
    }
    function l(n2) {
        if (Array.isArray(n2))
            return Array.prototype.slice.call(n2);
        var r2 = rn(n2);
        delete r2[Q];
        for (var t2 = nn(r2), e2 = 0; e2 < t2.length; e2++) {
            var i2 = t2[e2], o2 = r2[i2];
            o2.writable === false && (o2.writable = true, o2.configurable = true), (o2.get || o2.set) && (r2[i2] = { configurable: true, writable: true, enumerable: o2.enumerable, value: n2[i2] });
        }
        return Object.create(Object.getPrototypeOf(n2), r2);
    }
    function d(n2, e2) {
        return e2 === void 0 && (e2 = false), y(n2) || r(n2) || !t(n2) || (o(n2) > 1 && (n2.set = n2.add = n2.clear = n2.delete = h), Object.freeze(n2), e2 && i(n2, function (n3, r2) {
            return d(r2, true);
        }, true)), n2;
    }
    function h() {
        n(2);
    }
    function y(n2) {
        return n2 == null || typeof n2 != "object" || Object.isFrozen(n2);
    }
    function b(r2) {
        var t2 = tn[r2];
        return t2 || n(18, r2), t2;
    }
    function m(n2, r2) {
        tn[n2] || (tn[n2] = r2);
    }
    function _() {
        return U || n(0), U;
    }
    function j(n2, r2) {
        r2 && (b("Patches"), n2.u = [], n2.s = [], n2.v = r2);
    }
    function g(n2) {
        O(n2), n2.p.forEach(S), n2.p = null;
    }
    function O(n2) {
        n2 === U && (U = n2.l);
    }
    function w(n2) {
        return U = { p: [], l: U, h: n2, m: true, _: 0 };
    }
    function S(n2) {
        var r2 = n2[Q];
        r2.i === 0 || r2.i === 1 ? r2.j() : r2.g = true;
    }
    function P(r2, e2) {
        e2._ = e2.p.length;
        var i2 = e2.p[0], o2 = r2 !== void 0 && r2 !== i2;
        return e2.h.O || b("ES5").S(e2, r2, o2), o2 ? (i2[Q].P && (g(e2), n(4)), t(r2) && (r2 = M(e2, r2), e2.l || x(e2, r2)), e2.u && b("Patches").M(i2[Q].t, r2, e2.u, e2.s)) : r2 = M(e2, i2, []), g(e2), e2.u && e2.v(e2.u, e2.s), r2 !== H ? r2 : void 0;
    }
    function M(n2, r2, t2) {
        if (y(r2))
            return r2;
        var e2 = r2[Q];
        if (!e2)
            return i(r2, function (i2, o3) {
                return A(n2, e2, r2, i2, o3, t2);
            }, true), r2;
        if (e2.A !== n2)
            return r2;
        if (!e2.P)
            return x(n2, e2.t, true), e2.t;
        if (!e2.I) {
            e2.I = true, e2.A._--;
            var o2 = e2.i === 4 || e2.i === 5 ? e2.o = l(e2.k) : e2.o, u2 = o2, a2 = false;
            e2.i === 3 && (u2 = new Set(o2), o2.clear(), a2 = true), i(u2, function (r3, i2) {
                return A(n2, e2, o2, r3, i2, t2, a2);
            }), x(n2, o2, false), t2 && n2.u && b("Patches").N(e2, t2, n2.u, n2.s);
        }
        return e2.o;
    }
    function A(e2, i2, o2, a2, c2, s2, v2) {
        if (c2 === o2 && n(5), r(c2)) {
            var p2 = M(e2, c2, s2 && i2 && i2.i !== 3 && !u(i2.R, a2) ? s2.concat(a2) : void 0);
            if (f(o2, a2, p2), !r(p2))
                return;
            e2.m = false;
        }
        else
            v2 && o2.add(c2);
        if (t(c2) && !y(c2)) {
            if (!e2.h.D && e2._ < 1)
                return;
            M(e2, c2), i2 && i2.A.l || x(e2, c2);
        }
    }
    function x(n2, r2, t2) {
        t2 === void 0 && (t2 = false), !n2.l && n2.h.D && n2.m && d(r2, t2);
    }
    function z(n2, r2) {
        var t2 = n2[Q];
        return (t2 ? p(t2) : n2)[r2];
    }
    function I(n2, r2) {
        if (r2 in n2)
            for (var t2 = Object.getPrototypeOf(n2); t2;) {
                var e2 = Object.getOwnPropertyDescriptor(t2, r2);
                if (e2)
                    return e2;
                t2 = Object.getPrototypeOf(t2);
            }
    }
    function k(n2) {
        n2.P || (n2.P = true, n2.l && k(n2.l));
    }
    function E(n2) {
        n2.o || (n2.o = l(n2.t));
    }
    function N(n2, r2, t2) {
        var e2 = s(r2) ? b("MapSet").F(r2, t2) : v(r2) ? b("MapSet").T(r2, t2) : n2.O ? function (n3, r3) {
            var t3 = Array.isArray(n3), e3 = { i: t3 ? 1 : 0, A: r3 ? r3.A : _(), P: false, I: false, R: {}, l: r3, t: n3, k: null, o: null, j: null, C: false }, i2 = e3, o2 = en;
            t3 && (i2 = [e3], o2 = on);
            var u2 = Proxy.revocable(i2, o2), a2 = u2.revoke, f2 = u2.proxy;
            return e3.k = f2, e3.j = a2, f2;
        }(r2, t2) : b("ES5").J(r2, t2);
        return (t2 ? t2.A : _()).p.push(e2), e2;
    }
    function R(e2) {
        return r(e2) || n(22, e2), function n2(r2) {
            if (!t(r2))
                return r2;
            var e3, u2 = r2[Q], c2 = o(r2);
            if (u2) {
                if (!u2.P && (u2.i < 4 || !b("ES5").K(u2)))
                    return u2.t;
                u2.I = true, e3 = D(r2, c2), u2.I = false;
            }
            else
                e3 = D(r2, c2);
            return i(e3, function (r3, t2) {
                u2 && a(u2.t, r3) === t2 || f(e3, r3, n2(t2));
            }), c2 === 3 ? new Set(e3) : e3;
        }(e2);
    }
    function D(n2, r2) {
        switch (r2) {
            case 2:
                return new Map(n2);
            case 3:
                return Array.from(n2);
        }
        return l(n2);
    }
    function F() {
        function t2(n2, r2) {
            var t3 = s2[n2];
            return t3 ? t3.enumerable = r2 : s2[n2] = t3 = { configurable: true, enumerable: r2, get: function () {
                    var r3 = this[Q];
                    return f2(r3), en.get(r3, n2);
                }, set: function (r3) {
                    var t4 = this[Q];
                    f2(t4), en.set(t4, n2, r3);
                } }, t3;
        }
        function e2(n2) {
            for (var r2 = n2.length - 1; r2 >= 0; r2--) {
                var t3 = n2[r2][Q];
                if (!t3.P)
                    switch (t3.i) {
                        case 5:
                            a2(t3) && k(t3);
                            break;
                        case 4:
                            o2(t3) && k(t3);
                    }
            }
        }
        function o2(n2) {
            for (var r2 = n2.t, t3 = n2.k, e3 = nn(t3), i2 = e3.length - 1; i2 >= 0; i2--) {
                var o3 = e3[i2];
                if (o3 !== Q) {
                    var a3 = r2[o3];
                    if (a3 === void 0 && !u(r2, o3))
                        return true;
                    var f3 = t3[o3], s3 = f3 && f3[Q];
                    if (s3 ? s3.t !== a3 : !c(f3, a3))
                        return true;
                }
            }
            var v2 = !!r2[Q];
            return e3.length !== nn(r2).length + (v2 ? 0 : 1);
        }
        function a2(n2) {
            var r2 = n2.k;
            if (r2.length !== n2.t.length)
                return true;
            var t3 = Object.getOwnPropertyDescriptor(r2, r2.length - 1);
            if (t3 && !t3.get)
                return true;
            for (var e3 = 0; e3 < r2.length; e3++)
                if (!r2.hasOwnProperty(e3))
                    return true;
            return false;
        }
        function f2(r2) {
            r2.g && n(3, JSON.stringify(p(r2)));
        }
        var s2 = {};
        m("ES5", { J: function (n2, r2) {
                var e3 = Array.isArray(n2), i2 = function (n3, r3) {
                    if (n3) {
                        for (var e4 = Array(r3.length), i3 = 0; i3 < r3.length; i3++)
                            Object.defineProperty(e4, "" + i3, t2(i3, true));
                        return e4;
                    }
                    var o4 = rn(r3);
                    delete o4[Q];
                    for (var u2 = nn(o4), a3 = 0; a3 < u2.length; a3++) {
                        var f3 = u2[a3];
                        o4[f3] = t2(f3, n3 || !!o4[f3].enumerable);
                    }
                    return Object.create(Object.getPrototypeOf(r3), o4);
                }(e3, n2), o3 = { i: e3 ? 5 : 4, A: r2 ? r2.A : _(), P: false, I: false, R: {}, l: r2, t: n2, k: i2, o: null, g: false, C: false };
                return Object.defineProperty(i2, Q, { value: o3, writable: true }), i2;
            }, S: function (n2, t3, o3) {
                o3 ? r(t3) && t3[Q].A === n2 && e2(n2.p) : (n2.u && function n3(r2) {
                    if (r2 && typeof r2 == "object") {
                        var t4 = r2[Q];
                        if (t4) {
                            var e3 = t4.t, o4 = t4.k, f3 = t4.R, c2 = t4.i;
                            if (c2 === 4)
                                i(o4, function (r3) {
                                    r3 !== Q && (e3[r3] !== void 0 || u(e3, r3) ? f3[r3] || n3(o4[r3]) : (f3[r3] = true, k(t4)));
                                }), i(e3, function (n4) {
                                    o4[n4] !== void 0 || u(o4, n4) || (f3[n4] = false, k(t4));
                                });
                            else if (c2 === 5) {
                                if (a2(t4) && (k(t4), f3.length = true), o4.length < e3.length)
                                    for (var s3 = o4.length; s3 < e3.length; s3++)
                                        f3[s3] = false;
                                else
                                    for (var v2 = e3.length; v2 < o4.length; v2++)
                                        f3[v2] = true;
                                for (var p2 = Math.min(o4.length, e3.length), l2 = 0; l2 < p2; l2++)
                                    o4.hasOwnProperty(l2) || (f3[l2] = true), f3[l2] === void 0 && n3(o4[l2]);
                            }
                        }
                    }
                }(n2.p[0]), e2(n2.p));
            }, K: function (n2) {
                return n2.i === 4 ? o2(n2) : a2(n2);
            } });
    }
    function T() {
        function e2(n2) {
            if (!t(n2))
                return n2;
            if (Array.isArray(n2))
                return n2.map(e2);
            if (s(n2))
                return new Map(Array.from(n2.entries()).map(function (n3) {
                    return [n3[0], e2(n3[1])];
                }));
            if (v(n2))
                return new Set(Array.from(n2).map(e2));
            var r2 = Object.create(Object.getPrototypeOf(n2));
            for (var i2 in n2)
                r2[i2] = e2(n2[i2]);
            return u(n2, L) && (r2[L] = n2[L]), r2;
        }
        function f2(n2) {
            return r(n2) ? e2(n2) : n2;
        }
        var c2 = "add";
        m("Patches", { $: function (r2, t2) {
                return t2.forEach(function (t3) {
                    for (var i2 = t3.path, u2 = t3.op, f3 = r2, s2 = 0; s2 < i2.length - 1; s2++) {
                        var v2 = o(f3), p2 = i2[s2];
                        typeof p2 != "string" && typeof p2 != "number" && (p2 = "" + p2), v2 !== 0 && v2 !== 1 || p2 !== "__proto__" && p2 !== "constructor" || n(24), typeof f3 == "function" && p2 === "prototype" && n(24), typeof (f3 = a(f3, p2)) != "object" && n(15, i2.join("/"));
                    }
                    var l2 = o(f3), d2 = e2(t3.value), h2 = i2[i2.length - 1];
                    switch (u2) {
                        case "replace":
                            switch (l2) {
                                case 2:
                                    return f3.set(h2, d2);
                                case 3:
                                    n(16);
                                default:
                                    return f3[h2] = d2;
                            }
                        case c2:
                            switch (l2) {
                                case 1:
                                    return h2 === "-" ? f3.push(d2) : f3.splice(h2, 0, d2);
                                case 2:
                                    return f3.set(h2, d2);
                                case 3:
                                    return f3.add(d2);
                                default:
                                    return f3[h2] = d2;
                            }
                        case "remove":
                            switch (l2) {
                                case 1:
                                    return f3.splice(h2, 1);
                                case 2:
                                    return f3.delete(h2);
                                case 3:
                                    return f3.delete(t3.value);
                                default:
                                    return delete f3[h2];
                            }
                        default:
                            n(17, u2);
                    }
                }), r2;
            }, N: function (n2, r2, t2, e3) {
                switch (n2.i) {
                    case 0:
                    case 4:
                    case 2:
                        return function (n3, r3, t3, e4) {
                            var o2 = n3.t, s2 = n3.o;
                            i(n3.R, function (n4, i2) {
                                var v2 = a(o2, n4), p2 = a(s2, n4), l2 = i2 ? u(o2, n4) ? "replace" : c2 : "remove";
                                if (v2 !== p2 || l2 !== "replace") {
                                    var d2 = r3.concat(n4);
                                    t3.push(l2 === "remove" ? { op: l2, path: d2 } : { op: l2, path: d2, value: p2 }), e4.push(l2 === c2 ? { op: "remove", path: d2 } : l2 === "remove" ? { op: c2, path: d2, value: f2(v2) } : { op: "replace", path: d2, value: f2(v2) });
                                }
                            });
                        }(n2, r2, t2, e3);
                    case 5:
                    case 1:
                        return function (n3, r3, t3, e4) {
                            var i2 = n3.t, o2 = n3.R, u2 = n3.o;
                            if (u2.length < i2.length) {
                                var a2 = [u2, i2];
                                i2 = a2[0], u2 = a2[1];
                                var s2 = [e4, t3];
                                t3 = s2[0], e4 = s2[1];
                            }
                            for (var v2 = 0; v2 < i2.length; v2++)
                                if (o2[v2] && u2[v2] !== i2[v2]) {
                                    var p2 = r3.concat([v2]);
                                    t3.push({ op: "replace", path: p2, value: f2(u2[v2]) }), e4.push({ op: "replace", path: p2, value: f2(i2[v2]) });
                                }
                            for (var l2 = i2.length; l2 < u2.length; l2++) {
                                var d2 = r3.concat([l2]);
                                t3.push({ op: c2, path: d2, value: f2(u2[l2]) });
                            }
                            i2.length < u2.length && e4.push({ op: "replace", path: r3.concat(["length"]), value: i2.length });
                        }(n2, r2, t2, e3);
                    case 3:
                        return function (n3, r3, t3, e4) {
                            var i2 = n3.t, o2 = n3.o, u2 = 0;
                            i2.forEach(function (n4) {
                                if (!o2.has(n4)) {
                                    var i3 = r3.concat([u2]);
                                    t3.push({ op: "remove", path: i3, value: n4 }), e4.unshift({ op: c2, path: i3, value: n4 });
                                }
                                u2++;
                            }), u2 = 0, o2.forEach(function (n4) {
                                if (!i2.has(n4)) {
                                    var o3 = r3.concat([u2]);
                                    t3.push({ op: c2, path: o3, value: n4 }), e4.unshift({ op: "remove", path: o3, value: n4 });
                                }
                                u2++;
                            });
                        }(n2, r2, t2, e3);
                }
            }, M: function (n2, r2, t2, e3) {
                t2.push({ op: "replace", path: [], value: r2 === H ? void 0 : r2 }), e3.push({ op: "replace", path: [], value: n2 });
            } });
    }
    var G;
    var U;
    var W = typeof Symbol != "undefined" && typeof Symbol("x") == "symbol";
    var X = typeof Map != "undefined";
    var q = typeof Set != "undefined";
    var B = typeof Proxy != "undefined" && Proxy.revocable !== void 0 && typeof Reflect != "undefined";
    var H = W ? Symbol.for("immer-nothing") : ((G = {})["immer-nothing"] = true, G);
    var L = W ? Symbol.for("immer-draftable") : "__$immer_draftable";
    var Q = W ? Symbol.for("immer-state") : "__$immer_state";
    var Y = { 0: "Illegal state", 1: "Immer drafts cannot have computed properties", 2: "This object has been frozen and should not be mutated", 3: function (n2) {
            return "Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + n2;
        }, 4: "An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.", 5: "Immer forbids circular references", 6: "The first or second argument to `produce` must be a function", 7: "The third argument to `produce` must be a function or undefined", 8: "First argument to `createDraft` must be a plain object, an array, or an immerable object", 9: "First argument to `finishDraft` must be a draft returned by `createDraft`", 10: "The given draft is already finalized", 11: "Object.defineProperty() cannot be used on an Immer draft", 12: "Object.setPrototypeOf() cannot be used on an Immer draft", 13: "Immer only supports deleting array indices", 14: "Immer only supports setting array indices and the 'length' property", 15: function (n2) {
            return "Cannot apply patch, path doesn't resolve: " + n2;
        }, 16: 'Sets cannot have "replace" patches.', 17: function (n2) {
            return "Unsupported patch operation: " + n2;
        }, 18: function (n2) {
            return "The plugin for '" + n2 + "' has not been loaded into Immer. To enable the plugin, import and call `enable" + n2 + "()` when initializing your application.";
        }, 20: "Cannot use proxies if Proxy, Proxy.revocable or Reflect are not available", 21: function (n2) {
            return "produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '" + n2 + "'";
        }, 22: function (n2) {
            return "'current' expects a draft, got: " + n2;
        }, 23: function (n2) {
            return "'original' expects a draft, got: " + n2;
        }, 24: "Patching reserved attributes like __proto__, prototype and constructor is not allowed" };
    var Z = "" + Object.prototype.constructor;
    var nn = typeof Reflect != "undefined" && Reflect.ownKeys ? Reflect.ownKeys : Object.getOwnPropertySymbols !== void 0 ? function (n2) {
        return Object.getOwnPropertyNames(n2).concat(Object.getOwnPropertySymbols(n2));
    } : Object.getOwnPropertyNames;
    var rn = Object.getOwnPropertyDescriptors || function (n2) {
        var r2 = {};
        return nn(n2).forEach(function (t2) {
            r2[t2] = Object.getOwnPropertyDescriptor(n2, t2);
        }), r2;
    };
    var tn = {};
    var en = { get: function (n2, r2) {
            if (r2 === Q)
                return n2;
            var e2 = p(n2);
            if (!u(e2, r2))
                return function (n3, r3, t2) {
                    var e3, i3 = I(r3, t2);
                    return i3 ? "value" in i3 ? i3.value : (e3 = i3.get) === null || e3 === void 0 ? void 0 : e3.call(n3.k) : void 0;
                }(n2, e2, r2);
            var i2 = e2[r2];
            return n2.I || !t(i2) ? i2 : i2 === z(n2.t, r2) ? (E(n2), n2.o[r2] = N(n2.A.h, i2, n2)) : i2;
        }, has: function (n2, r2) {
            return r2 in p(n2);
        }, ownKeys: function (n2) {
            return Reflect.ownKeys(p(n2));
        }, set: function (n2, r2, t2) {
            var e2 = I(p(n2), r2);
            if (e2 == null ? void 0 : e2.set)
                return e2.set.call(n2.k, t2), true;
            if (!n2.P) {
                var i2 = z(p(n2), r2), o2 = i2 == null ? void 0 : i2[Q];
                if (o2 && o2.t === t2)
                    return n2.o[r2] = t2, n2.R[r2] = false, true;
                if (c(t2, i2) && (t2 !== void 0 || u(n2.t, r2)))
                    return true;
                E(n2), k(n2);
            }
            return n2.o[r2] === t2 && (t2 !== void 0 || r2 in n2.o) || Number.isNaN(t2) && Number.isNaN(n2.o[r2]) || (n2.o[r2] = t2, n2.R[r2] = true), true;
        }, deleteProperty: function (n2, r2) {
            return z(n2.t, r2) !== void 0 || r2 in n2.t ? (n2.R[r2] = false, E(n2), k(n2)) : delete n2.R[r2], n2.o && delete n2.o[r2], true;
        }, getOwnPropertyDescriptor: function (n2, r2) {
            var t2 = p(n2), e2 = Reflect.getOwnPropertyDescriptor(t2, r2);
            return e2 ? { writable: true, configurable: n2.i !== 1 || r2 !== "length", enumerable: e2.enumerable, value: t2[r2] } : e2;
        }, defineProperty: function () {
            n(11);
        }, getPrototypeOf: function (n2) {
            return Object.getPrototypeOf(n2.t);
        }, setPrototypeOf: function () {
            n(12);
        } };
    var on = {};
    i(en, function (n2, r2) {
        on[n2] = function () {
            return arguments[0] = arguments[0][0], r2.apply(this, arguments);
        };
    }), on.deleteProperty = function (r2, t2) {
        return isNaN(parseInt(t2)) && n(13), on.set.call(this, r2, t2, void 0);
    }, on.set = function (r2, t2, e2) {
        return t2 !== "length" && isNaN(parseInt(t2)) && n(14), en.set.call(this, r2[0], t2, e2, r2[0]);
    };
    var un = function () {
        function e2(r2) {
            var e3 = this;
            this.O = B, this.D = true, this.produce = function (r3, i3, o2) {
                if (typeof r3 == "function" && typeof i3 != "function") {
                    var u2 = i3;
                    i3 = r3;
                    var a2 = e3;
                    return function (n2) {
                        var r4 = this;
                        n2 === void 0 && (n2 = u2);
                        for (var t2 = arguments.length, e4 = Array(t2 > 1 ? t2 - 1 : 0), o3 = 1; o3 < t2; o3++)
                            e4[o3 - 1] = arguments[o3];
                        return a2.produce(n2, function (n3) {
                            var t3;
                            return (t3 = i3).call.apply(t3, [r4, n3].concat(e4));
                        });
                    };
                }
                var f2;
                if (typeof i3 != "function" && n(6), o2 !== void 0 && typeof o2 != "function" && n(7), t(r3)) {
                    var c2 = w(e3), s2 = N(e3, r3, void 0), v2 = true;
                    try {
                        f2 = i3(s2), v2 = false;
                    }
                    finally {
                        v2 ? g(c2) : O(c2);
                    }
                    return typeof Promise != "undefined" && f2 instanceof Promise ? f2.then(function (n2) {
                        return j(c2, o2), P(n2, c2);
                    }, function (n2) {
                        throw g(c2), n2;
                    }) : (j(c2, o2), P(f2, c2));
                }
                if (!r3 || typeof r3 != "object") {
                    if ((f2 = i3(r3)) === void 0 && (f2 = r3), f2 === H && (f2 = void 0), e3.D && d(f2, true), o2) {
                        var p2 = [], l2 = [];
                        b("Patches").M(r3, f2, p2, l2), o2(p2, l2);
                    }
                    return f2;
                }
                n(21, r3);
            }, this.produceWithPatches = function (n2, r3) {
                if (typeof n2 == "function")
                    return function (r4) {
                        for (var t3 = arguments.length, i4 = Array(t3 > 1 ? t3 - 1 : 0), o3 = 1; o3 < t3; o3++)
                            i4[o3 - 1] = arguments[o3];
                        return e3.produceWithPatches(r4, function (r5) {
                            return n2.apply(void 0, [r5].concat(i4));
                        });
                    };
                var t2, i3, o2 = e3.produce(n2, r3, function (n3, r4) {
                    t2 = n3, i3 = r4;
                });
                return typeof Promise != "undefined" && o2 instanceof Promise ? o2.then(function (n3) {
                    return [n3, t2, i3];
                }) : [o2, t2, i3];
            }, typeof (r2 == null ? void 0 : r2.useProxies) == "boolean" && this.setUseProxies(r2.useProxies), typeof (r2 == null ? void 0 : r2.autoFreeze) == "boolean" && this.setAutoFreeze(r2.autoFreeze);
        }
        var i2 = e2.prototype;
        return i2.createDraft = function (e3) {
            t(e3) || n(8), r(e3) && (e3 = R(e3));
            var i3 = w(this), o2 = N(this, e3, void 0);
            return o2[Q].C = true, O(i3), o2;
        }, i2.finishDraft = function (r2, t2) {
            var e3 = r2 && r2[Q];
            e3 && e3.C || n(9), e3.I && n(10);
            var i3 = e3.A;
            return j(i3, t2), P(void 0, i3);
        }, i2.setAutoFreeze = function (n2) {
            this.D = n2;
        }, i2.setUseProxies = function (r2) {
            r2 && !B && n(20), this.O = r2;
        }, i2.applyPatches = function (n2, t2) {
            var e3;
            for (e3 = t2.length - 1; e3 >= 0; e3--) {
                var i3 = t2[e3];
                if (i3.path.length === 0 && i3.op === "replace") {
                    n2 = i3.value;
                    break;
                }
            }
            e3 > -1 && (t2 = t2.slice(e3 + 1));
            var o2 = b("Patches").$;
            return r(n2) ? o2(n2, t2) : this.produce(n2, function (n3) {
                return o2(n3, t2);
            });
        }, e2;
    }();
    var an = new un();
    var fn = an.produce;
    var cn = an.produceWithPatches.bind(an);
    an.setAutoFreeze.bind(an);
    an.setUseProxies.bind(an);
    var pn = an.applyPatches.bind(an);
    an.createDraft.bind(an);
    an.finishDraft.bind(an);
    var immer_esm_default = fn;
    var randomString = function randomString2() {
        return Math.random().toString(36).substring(7).split("").join(".");
    };
    var ActionTypes = {
        INIT: "@@redux/INIT" + randomString(),
        REPLACE: "@@redux/REPLACE" + randomString(),
        PROBE_UNKNOWN_ACTION: function PROBE_UNKNOWN_ACTION() {
            return "@@redux/PROBE_UNKNOWN_ACTION" + randomString();
        }
    };
    function isPlainObject(obj) {
        if (typeof obj !== "object" || obj === null)
            return false;
        var proto = obj;
        while (Object.getPrototypeOf(proto) !== null) {
            proto = Object.getPrototypeOf(proto);
        }
        return Object.getPrototypeOf(obj) === proto;
    }
    function miniKindOf(val) {
        if (val === void 0)
            return "undefined";
        if (val === null)
            return "null";
        var type = typeof val;
        switch (type) {
            case "boolean":
            case "string":
            case "number":
            case "symbol":
            case "function": {
                return type;
            }
        }
        if (Array.isArray(val))
            return "array";
        if (isDate(val))
            return "date";
        if (isError(val))
            return "error";
        var constructorName = ctorName(val);
        switch (constructorName) {
            case "Symbol":
            case "Promise":
            case "WeakMap":
            case "WeakSet":
            case "Map":
            case "Set":
                return constructorName;
        }
        return type.slice(8, -1).toLowerCase().replace(/\s/g, "");
    }
    function ctorName(val) {
        return typeof val.constructor === "function" ? val.constructor.name : null;
    }
    function isError(val) {
        return val instanceof Error || typeof val.message === "string" && val.constructor && typeof val.constructor.stackTraceLimit === "number";
    }
    function isDate(val) {
        if (val instanceof Date)
            return true;
        return typeof val.toDateString === "function" && typeof val.getDate === "function" && typeof val.setDate === "function";
    }
    function kindOf(val) {
        var typeOfVal = typeof val;
        {
            typeOfVal = miniKindOf(val);
        }
        return typeOfVal;
    }
    function warning(message) {
        if (typeof console !== "undefined" && typeof console.error === "function") {
            console.error(message);
        }
        try {
            throw new Error(message);
        }
        catch (e2) {
        }
    }
    function getUnexpectedStateShapeWarningMessage(inputState, reducers, action, unexpectedKeyCache) {
        var reducerKeys = Object.keys(reducers);
        var argumentName = action && action.type === ActionTypes.INIT ? "preloadedState argument passed to createStore" : "previous state received by the reducer";
        if (reducerKeys.length === 0) {
            return "Store does not have a valid reducer. Make sure the argument passed to combineReducers is an object whose values are reducers.";
        }
        if (!isPlainObject(inputState)) {
            return "The " + argumentName + ' has unexpected type of "' + kindOf(inputState) + '". Expected argument to be an object with the following ' + ('keys: "' + reducerKeys.join('", "') + '"');
        }
        var unexpectedKeys = Object.keys(inputState).filter(function (key) {
            return !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key];
        });
        unexpectedKeys.forEach(function (key) {
            unexpectedKeyCache[key] = true;
        });
        if (action && action.type === ActionTypes.REPLACE)
            return;
        if (unexpectedKeys.length > 0) {
            return "Unexpected " + (unexpectedKeys.length > 1 ? "keys" : "key") + " " + ('"' + unexpectedKeys.join('", "') + '" found in ' + argumentName + ". ") + "Expected to find one of the known reducer keys instead: " + ('"' + reducerKeys.join('", "') + '". Unexpected keys will be ignored.');
        }
    }
    function assertReducerShape(reducers) {
        Object.keys(reducers).forEach(function (key) {
            var reducer = reducers[key];
            var initialState2 = reducer(void 0, {
                type: ActionTypes.INIT
            });
            if (typeof initialState2 === "undefined") {
                throw new Error('The slice reducer for key "' + key + "\" returned undefined during initialization. If the state passed to the reducer is undefined, you must explicitly return the initial state. The initial state may not be undefined. If you don't want to set a value for this reducer, you can use null instead of undefined.");
            }
            if (typeof reducer(void 0, {
                type: ActionTypes.PROBE_UNKNOWN_ACTION()
            }) === "undefined") {
                throw new Error('The slice reducer for key "' + key + '" returned undefined when probed with a random type. ' + ("Don't try to handle '" + ActionTypes.INIT + "' or other actions in \"redux/*\" ") + "namespace. They are considered private. Instead, you must return the current state for any unknown actions, unless it is undefined, in which case you must return the initial state, regardless of the action type. The initial state may not be undefined, but can be null.");
            }
        });
    }
    function combineReducers(reducers) {
        var reducerKeys = Object.keys(reducers);
        var finalReducers = {};
        for (var i2 = 0; i2 < reducerKeys.length; i2++) {
            var key = reducerKeys[i2];
            {
                if (typeof reducers[key] === "undefined") {
                    warning('No reducer provided for key "' + key + '"');
                }
            }
            if (typeof reducers[key] === "function") {
                finalReducers[key] = reducers[key];
            }
        }
        var finalReducerKeys = Object.keys(finalReducers);
        var unexpectedKeyCache;
        {
            unexpectedKeyCache = {};
        }
        var shapeAssertionError;
        try {
            assertReducerShape(finalReducers);
        }
        catch (e2) {
            shapeAssertionError = e2;
        }
        return function combination(state, action) {
            if (state === void 0) {
                state = {};
            }
            if (shapeAssertionError) {
                throw shapeAssertionError;
            }
            {
                var warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache);
                if (warningMessage) {
                    warning(warningMessage);
                }
            }
            var hasChanged = false;
            var nextState = {};
            for (var _i = 0; _i < finalReducerKeys.length; _i++) {
                var _key = finalReducerKeys[_i];
                var reducer = finalReducers[_key];
                var previousStateForKey = state[_key];
                var nextStateForKey = reducer(previousStateForKey, action);
                if (typeof nextStateForKey === "undefined") {
                    var actionType = action && action.type;
                    throw new Error("When called with an action of type " + (actionType ? '"' + String(actionType) + '"' : "(unknown type)") + ', the slice reducer for key "' + _key + '" returned undefined. To ignore an action, you must explicitly return the previous state. If you want this reducer to hold no value, you can return null instead of undefined.');
                }
                nextState[_key] = nextStateForKey;
                hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
            }
            hasChanged = hasChanged || finalReducerKeys.length !== Object.keys(state).length;
            return hasChanged ? nextState : state;
        };
    }
    // ../../node_modules/reselect/es/defaultMemoize.js
    var NOT_FOUND = "NOT_FOUND";
    function createSingletonCache(equals) {
        var entry;
        return {
            get: function get(key) {
                if (entry && equals(entry.key, key)) {
                    return entry.value;
                }
                return NOT_FOUND;
            },
            put: function put(key, value) {
                entry = {
                    key: key,
                    value: value
                };
            },
            getEntries: function getEntries() {
                return entry ? [entry] : [];
            },
            clear: function clear() {
                entry = void 0;
            }
        };
    }
    function createLruCache(maxSize, equals) {
        var entries = [];
        function get(key) {
            var cacheIndex = entries.findIndex(function (entry2) {
                return equals(key, entry2.key);
            });
            if (cacheIndex > -1) {
                var entry = entries[cacheIndex];
                if (cacheIndex > 0) {
                    entries.splice(cacheIndex, 1);
                    entries.unshift(entry);
                }
                return entry.value;
            }
            return NOT_FOUND;
        }
        function put(key, value) {
            if (get(key) === NOT_FOUND) {
                entries.unshift({
                    key: key,
                    value: value
                });
                if (entries.length > maxSize) {
                    entries.pop();
                }
            }
        }
        function getEntries() {
            return entries;
        }
        function clear() {
            entries = [];
        }
        return {
            get: get,
            put: put,
            getEntries: getEntries,
            clear: clear
        };
    }
    var defaultEqualityCheck = function defaultEqualityCheck2(a2, b2) {
        return a2 === b2;
    };
    function createCacheKeyComparator(equalityCheck) {
        return function areArgumentsShallowlyEqual(prev, next) {
            if (prev === null || next === null || prev.length !== next.length) {
                return false;
            }
            var length = prev.length;
            for (var i2 = 0; i2 < length; i2++) {
                if (!equalityCheck(prev[i2], next[i2])) {
                    return false;
                }
            }
            return true;
        };
    }
    function defaultMemoize(func, equalityCheckOrOptions) {
        var providedOptions = typeof equalityCheckOrOptions === "object" ? equalityCheckOrOptions : {
            equalityCheck: equalityCheckOrOptions
        };
        var _providedOptions$equa = providedOptions.equalityCheck, equalityCheck = _providedOptions$equa === void 0 ? defaultEqualityCheck : _providedOptions$equa, _providedOptions$maxS = providedOptions.maxSize, maxSize = _providedOptions$maxS === void 0 ? 1 : _providedOptions$maxS, resultEqualityCheck = providedOptions.resultEqualityCheck;
        var comparator = createCacheKeyComparator(equalityCheck);
        var cache2 = maxSize === 1 ? createSingletonCache(comparator) : createLruCache(maxSize, comparator);
        function memoized() {
            var value = cache2.get(arguments);
            if (value === NOT_FOUND) {
                value = func.apply(null, arguments);
                if (resultEqualityCheck) {
                    var entries = cache2.getEntries();
                    var matchingEntry = entries.find(function (entry) {
                        return resultEqualityCheck(entry.value, value);
                    });
                    if (matchingEntry) {
                        value = matchingEntry.value;
                    }
                }
                cache2.put(arguments, value);
            }
            return value;
        }
        memoized.clearCache = function () {
            return cache2.clear();
        };
        return memoized;
    }
    // ../../node_modules/reselect/es/index.js
    function getDependencies(funcs) {
        var dependencies = Array.isArray(funcs[0]) ? funcs[0] : funcs;
        if (!dependencies.every(function (dep) {
            return typeof dep === "function";
        })) {
            var dependencyTypes = dependencies.map(function (dep) {
                return typeof dep === "function" ? "function " + (dep.name || "unnamed") + "()" : typeof dep;
            }).join(", ");
            throw new Error("createSelector expects all input-selectors to be functions, but received the following types: [" + dependencyTypes + "]");
        }
        return dependencies;
    }
    function createSelectorCreator(memoize) {
        for (var _len = arguments.length, memoizeOptionsFromArgs = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            memoizeOptionsFromArgs[_key - 1] = arguments[_key];
        }
        var createSelector2 = function createSelector3() {
            for (var _len2 = arguments.length, funcs = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                funcs[_key2] = arguments[_key2];
            }
            var _recomputations = 0;
            var _lastResult;
            var directlyPassedOptions = {
                memoizeOptions: void 0
            };
            var resultFunc = funcs.pop();
            if (typeof resultFunc === "object") {
                directlyPassedOptions = resultFunc;
                resultFunc = funcs.pop();
            }
            if (typeof resultFunc !== "function") {
                throw new Error("createSelector expects an output function after the inputs, but received: [" + typeof resultFunc + "]");
            }
            var _directlyPassedOption = directlyPassedOptions, _directlyPassedOption2 = _directlyPassedOption.memoizeOptions, memoizeOptions = _directlyPassedOption2 === void 0 ? memoizeOptionsFromArgs : _directlyPassedOption2;
            var finalMemoizeOptions = Array.isArray(memoizeOptions) ? memoizeOptions : [memoizeOptions];
            var dependencies = getDependencies(funcs);
            var memoizedResultFunc = memoize.apply(void 0, [function recomputationWrapper() {
                    _recomputations++;
                    return resultFunc.apply(null, arguments);
                }].concat(finalMemoizeOptions));
            var selector = memoize(function dependenciesChecker() {
                var params = [];
                var length = dependencies.length;
                for (var i2 = 0; i2 < length; i2++) {
                    params.push(dependencies[i2].apply(null, arguments));
                }
                _lastResult = memoizedResultFunc.apply(null, params);
                return _lastResult;
            });
            Object.assign(selector, {
                resultFunc: resultFunc,
                memoizedResultFunc: memoizedResultFunc,
                dependencies: dependencies,
                lastResult: function lastResult() {
                    return _lastResult;
                },
                recomputations: function recomputations() {
                    return _recomputations;
                },
                resetRecomputations: function resetRecomputations() {
                    return _recomputations = 0;
                }
            });
            return selector;
        };
        return createSelector2;
    }
    var createSelector = /* @__PURE__ */ createSelectorCreator(defaultMemoize);
    // src/isPlainObject.ts
    function isPlainObject2(value) {
        if (typeof value !== "object" || value === null)
            return false;
        var proto = Object.getPrototypeOf(value);
        if (proto === null)
            return true;
        var baseProto = proto;
        while (Object.getPrototypeOf(baseProto) !== null) {
            baseProto = Object.getPrototypeOf(baseProto);
        }
        return proto === baseProto;
    }
    // src/tsHelpers.ts
    var hasMatchFunction = function (v2) {
        return v2 && typeof v2.match === "function";
    };
    // src/createAction.ts
    function createAction(type, prepareAction) {
        function actionCreator() {
            var args = [];
            for (var _j = 0; _j < arguments.length; _j++) {
                args[_j] = arguments[_j];
            }
            if (prepareAction) {
                var prepared = prepareAction.apply(void 0, args);
                if (!prepared) {
                    throw new Error("prepareAction did not return an object");
                }
                return __spreadValues(__spreadValues({
                    type: type,
                    payload: prepared.payload
                }, "meta" in prepared && { meta: prepared.meta }), "error" in prepared && { error: prepared.error });
            }
            return { type: type, payload: args[0] };
        }
        actionCreator.toString = function () { return "" + type; };
        actionCreator.type = type;
        actionCreator.match = function (action) { return action.type === type; };
        return actionCreator;
    }
    // src/utils.ts
    /** @class */ ((function (_super) {
        __extends(MiddlewareArray, _super);
        function MiddlewareArray() {
            var args = [];
            for (var _j = 0; _j < arguments.length; _j++) {
                args[_j] = arguments[_j];
            }
            var _this = _super.apply(this, args) || this;
            Object.setPrototypeOf(_this, MiddlewareArray.prototype);
            return _this;
        }
        Object.defineProperty(MiddlewareArray, Symbol.species, {
            get: function () {
                return MiddlewareArray;
            },
            enumerable: false,
            configurable: true
        });
        MiddlewareArray.prototype.concat = function () {
            var arr = [];
            for (var _j = 0; _j < arguments.length; _j++) {
                arr[_j] = arguments[_j];
            }
            return _super.prototype.concat.apply(this, arr);
        };
        MiddlewareArray.prototype.prepend = function () {
            var arr = [];
            for (var _j = 0; _j < arguments.length; _j++) {
                arr[_j] = arguments[_j];
            }
            if (arr.length === 1 && Array.isArray(arr[0])) {
                return new (MiddlewareArray.bind.apply(MiddlewareArray, __spreadArray([void 0], arr[0].concat(this))))();
            }
            return new (MiddlewareArray.bind.apply(MiddlewareArray, __spreadArray([void 0], arr.concat(this))))();
        };
        return MiddlewareArray;
    })(Array));
    /** @class */ ((function (_super) {
        __extends(EnhancerArray, _super);
        function EnhancerArray() {
            var args = [];
            for (var _j = 0; _j < arguments.length; _j++) {
                args[_j] = arguments[_j];
            }
            var _this = _super.apply(this, args) || this;
            Object.setPrototypeOf(_this, EnhancerArray.prototype);
            return _this;
        }
        Object.defineProperty(EnhancerArray, Symbol.species, {
            get: function () {
                return EnhancerArray;
            },
            enumerable: false,
            configurable: true
        });
        EnhancerArray.prototype.concat = function () {
            var arr = [];
            for (var _j = 0; _j < arguments.length; _j++) {
                arr[_j] = arguments[_j];
            }
            return _super.prototype.concat.apply(this, arr);
        };
        EnhancerArray.prototype.prepend = function () {
            var arr = [];
            for (var _j = 0; _j < arguments.length; _j++) {
                arr[_j] = arguments[_j];
            }
            if (arr.length === 1 && Array.isArray(arr[0])) {
                return new (EnhancerArray.bind.apply(EnhancerArray, __spreadArray([void 0], arr[0].concat(this))))();
            }
            return new (EnhancerArray.bind.apply(EnhancerArray, __spreadArray([void 0], arr.concat(this))))();
        };
        return EnhancerArray;
    })(Array));
    function freezeDraftable(val) {
        return t(val) ? immer_esm_default(val, function () {
        }) : val;
    }
    // src/mapBuilders.ts
    function executeReducerBuilderCallback(builderCallback) {
        var actionsMap = {};
        var actionMatchers = [];
        var defaultCaseReducer;
        var builder = {
            addCase: function (typeOrActionCreator, reducer) {
                {
                    if (actionMatchers.length > 0) {
                        throw new Error("`builder.addCase` should only be called before calling `builder.addMatcher`");
                    }
                    if (defaultCaseReducer) {
                        throw new Error("`builder.addCase` should only be called before calling `builder.addDefaultCase`");
                    }
                }
                var type = typeof typeOrActionCreator === "string" ? typeOrActionCreator : typeOrActionCreator.type;
                if (!type) {
                    throw new Error("`builder.addCase` cannot be called with an empty action type");
                }
                if (type in actionsMap) {
                    throw new Error("`builder.addCase` cannot be called with two reducers for the same action type");
                }
                actionsMap[type] = reducer;
                return builder;
            },
            addMatcher: function (matcher, reducer) {
                {
                    if (defaultCaseReducer) {
                        throw new Error("`builder.addMatcher` should only be called before calling `builder.addDefaultCase`");
                    }
                }
                actionMatchers.push({ matcher: matcher, reducer: reducer });
                return builder;
            },
            addDefaultCase: function (reducer) {
                {
                    if (defaultCaseReducer) {
                        throw new Error("`builder.addDefaultCase` can only be called once");
                    }
                }
                defaultCaseReducer = reducer;
                return builder;
            }
        };
        builderCallback(builder);
        return [actionsMap, actionMatchers, defaultCaseReducer];
    }
    // src/createReducer.ts
    function isStateFunction(x2) {
        return typeof x2 === "function";
    }
    var hasWarnedAboutObjectNotation = false;
    function createReducer(initialState2, mapOrBuilderCallback, actionMatchers, defaultCaseReducer) {
        if (actionMatchers === void 0) { actionMatchers = []; }
        {
            if (typeof mapOrBuilderCallback === "object") {
                if (!hasWarnedAboutObjectNotation) {
                    hasWarnedAboutObjectNotation = true;
                    console.warn("The object notation for `createReducer` is deprecated, and will be removed in RTK 2.0. Please use the 'builder callback' notation instead: https://redux-toolkit.js.org/api/createReducer");
                }
            }
        }
        var _j = typeof mapOrBuilderCallback === "function" ? executeReducerBuilderCallback(mapOrBuilderCallback) : [mapOrBuilderCallback, actionMatchers, defaultCaseReducer], actionsMap = _j[0], finalActionMatchers = _j[1], finalDefaultCaseReducer = _j[2];
        var getInitialState;
        if (isStateFunction(initialState2)) {
            getInitialState = function () { return freezeDraftable(initialState2()); };
        }
        else {
            var frozenInitialState_1 = freezeDraftable(initialState2);
            getInitialState = function () { return frozenInitialState_1; };
        }
        function reducer(state, action) {
            if (state === void 0) { state = getInitialState(); }
            var caseReducers = __spreadArray([
                actionsMap[action.type]
            ], finalActionMatchers.filter(function (_j) {
                var matcher = _j.matcher;
                return matcher(action);
            }).map(function (_j) {
                var reducer2 = _j.reducer;
                return reducer2;
            }));
            if (caseReducers.filter(function (cr) { return !!cr; }).length === 0) {
                caseReducers = [finalDefaultCaseReducer];
            }
            return caseReducers.reduce(function (previousState, caseReducer) {
                if (caseReducer) {
                    if (r(previousState)) {
                        var draft = previousState;
                        var result = caseReducer(draft, action);
                        if (result === void 0) {
                            return previousState;
                        }
                        return result;
                    }
                    else if (!t(previousState)) {
                        var result = caseReducer(previousState, action);
                        if (result === void 0) {
                            if (previousState === null) {
                                return previousState;
                            }
                            throw Error("A case reducer on a non-draftable value must not return undefined");
                        }
                        return result;
                    }
                    else {
                        return immer_esm_default(previousState, function (draft) {
                            return caseReducer(draft, action);
                        });
                    }
                }
                return previousState;
            }, state);
        }
        reducer.getInitialState = getInitialState;
        return reducer;
    }
    // src/createSlice.ts
    var hasWarnedAboutObjectNotation2 = false;
    function getType(slice, actionKey) {
        return slice + "/" + actionKey;
    }
    function createSlice(options) {
        var name = options.name;
        if (!name) {
            throw new Error("`name` is a required option for createSlice");
        }
        if (typeof process !== "undefined" && true) {
            if (options.initialState === void 0) {
                console.error("You must provide an `initialState` value that is not `undefined`. You may have misspelled `initialState`");
            }
        }
        var initialState2 = typeof options.initialState == "function" ? options.initialState : freezeDraftable(options.initialState);
        var reducers = options.reducers || {};
        var reducerNames = Object.keys(reducers);
        var sliceCaseReducersByName = {};
        var sliceCaseReducersByType = {};
        var actionCreators = {};
        reducerNames.forEach(function (reducerName) {
            var maybeReducerWithPrepare = reducers[reducerName];
            var type = getType(name, reducerName);
            var caseReducer;
            var prepareCallback;
            if ("reducer" in maybeReducerWithPrepare) {
                caseReducer = maybeReducerWithPrepare.reducer;
                prepareCallback = maybeReducerWithPrepare.prepare;
            }
            else {
                caseReducer = maybeReducerWithPrepare;
            }
            sliceCaseReducersByName[reducerName] = caseReducer;
            sliceCaseReducersByType[type] = caseReducer;
            actionCreators[reducerName] = prepareCallback ? createAction(type, prepareCallback) : createAction(type);
        });
        function buildReducer() {
            {
                if (typeof options.extraReducers === "object") {
                    if (!hasWarnedAboutObjectNotation2) {
                        hasWarnedAboutObjectNotation2 = true;
                        console.warn("The object notation for `createSlice.extraReducers` is deprecated, and will be removed in RTK 2.0. Please use the 'builder callback' notation instead: https://redux-toolkit.js.org/api/createSlice");
                    }
                }
            }
            var _j = typeof options.extraReducers === "function" ? executeReducerBuilderCallback(options.extraReducers) : [options.extraReducers], _k = _j[0], extraReducers = _k === void 0 ? {} : _k, _l = _j[1], actionMatchers = _l === void 0 ? [] : _l, _m = _j[2], defaultCaseReducer = _m === void 0 ? void 0 : _m;
            var finalCaseReducers = __spreadValues(__spreadValues({}, extraReducers), sliceCaseReducersByType);
            return createReducer(initialState2, function (builder) {
                for (var key in finalCaseReducers) {
                    builder.addCase(key, finalCaseReducers[key]);
                }
                for (var _j = 0, actionMatchers_1 = actionMatchers; _j < actionMatchers_1.length; _j++) {
                    var m2 = actionMatchers_1[_j];
                    builder.addMatcher(m2.matcher, m2.reducer);
                }
                if (defaultCaseReducer) {
                    builder.addDefaultCase(defaultCaseReducer);
                }
            });
        }
        var _reducer;
        return {
            name: name,
            reducer: function (state, action) {
                if (!_reducer)
                    _reducer = buildReducer();
                return _reducer(state, action);
            },
            actions: actionCreators,
            caseReducers: sliceCaseReducersByName,
            getInitialState: function () {
                if (!_reducer)
                    _reducer = buildReducer();
                return _reducer.getInitialState();
            }
        };
    }
    // src/nanoid.ts
    var urlAlphabet = "ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW";
    var nanoid = function (size) {
        if (size === void 0) { size = 21; }
        var id = "";
        var i2 = size;
        while (i2--) {
            id += urlAlphabet[Math.random() * 64 | 0];
        }
        return id;
    };
    // src/createAsyncThunk.ts
    var commonProperties = [
        "name",
        "message",
        "stack",
        "code"
    ];
    var RejectWithValue = /** @class */ (function () {
        function RejectWithValue(payload, meta) {
            this.payload = payload;
            this.meta = meta;
        }
        return RejectWithValue;
    }());
    var FulfillWithMeta = /** @class */ (function () {
        function FulfillWithMeta(payload, meta) {
            this.payload = payload;
            this.meta = meta;
        }
        return FulfillWithMeta;
    }());
    var miniSerializeError = function (value) {
        if (typeof value === "object" && value !== null) {
            var simpleError = {};
            for (var _j = 0, commonProperties_1 = commonProperties; _j < commonProperties_1.length; _j++) {
                var property = commonProperties_1[_j];
                if (typeof value[property] === "string") {
                    simpleError[property] = value[property];
                }
            }
            return simpleError;
        }
        return { message: String(value) };
    };
    var createAsyncThunk = (function () {
        function createAsyncThunk2(typePrefix, payloadCreator, options) {
            var fulfilled = createAction(typePrefix + "/fulfilled", function (payload, requestId, arg, meta) { return ({
                payload: payload,
                meta: __spreadProps(__spreadValues({}, meta || {}), {
                    arg: arg,
                    requestId: requestId,
                    requestStatus: "fulfilled"
                })
            }); });
            var pending = createAction(typePrefix + "/pending", function (requestId, arg, meta) { return ({
                payload: void 0,
                meta: __spreadProps(__spreadValues({}, meta || {}), {
                    arg: arg,
                    requestId: requestId,
                    requestStatus: "pending"
                })
            }); });
            var rejected = createAction(typePrefix + "/rejected", function (error, requestId, arg, payload, meta) { return ({
                payload: payload,
                error: (options && options.serializeError || miniSerializeError)(error || "Rejected"),
                meta: __spreadProps(__spreadValues({}, meta || {}), {
                    arg: arg,
                    requestId: requestId,
                    rejectedWithValue: !!payload,
                    requestStatus: "rejected",
                    aborted: (error == null ? void 0 : error.name) === "AbortError",
                    condition: (error == null ? void 0 : error.name) === "ConditionError"
                })
            }); });
            var displayedWarning = false;
            var AC = typeof AbortController !== "undefined" ? AbortController : /** @class */ (function () {
                function class_1() {
                    this.signal = {
                        aborted: false,
                        addEventListener: function () {
                        },
                        dispatchEvent: function () {
                            return false;
                        },
                        onabort: function () {
                        },
                        removeEventListener: function () {
                        },
                        reason: void 0,
                        throwIfAborted: function () {
                        }
                    };
                }
                class_1.prototype.abort = function () {
                    {
                        if (!displayedWarning) {
                            displayedWarning = true;
                            console.info("This platform does not implement AbortController. \nIf you want to use the AbortController to react to `abort` events, please consider importing a polyfill like 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only'.");
                        }
                    }
                };
                return class_1;
            }());
            function actionCreator(arg) {
                return function (dispatch, getState, extra) {
                    var requestId = (options == null ? void 0 : options.idGenerator) ? options.idGenerator(arg) : nanoid();
                    var abortController = new AC();
                    var abortReason;
                    function abort(reason) {
                        abortReason = reason;
                        abortController.abort();
                    }
                    var promise3 = function () {
                        return __async(this, null, function () {
                            var _a, _b, finalAction, conditionResult, abortedPromise, err_1, skipDispatch;
                            return __generator(this, function (_j) {
                                switch (_j.label) {
                                    case 0:
                                        _j.trys.push([0, 4, , 5]);
                                        conditionResult = (_a = options == null ? void 0 : options.condition) == null ? void 0 : _a.call(options, arg, { getState: getState, extra: extra });
                                        if (!isThenable(conditionResult)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, conditionResult];
                                    case 1:
                                        conditionResult = _j.sent();
                                        _j.label = 2;
                                    case 2:
                                        if (conditionResult === false || abortController.signal.aborted) {
                                            throw {
                                                name: "ConditionError",
                                                message: "Aborted due to condition callback returning false."
                                            };
                                        }
                                        abortedPromise = new Promise(function (_2, reject) { return abortController.signal.addEventListener("abort", function () { return reject({
                                            name: "AbortError",
                                            message: abortReason || "Aborted"
                                        }); }); });
                                        dispatch(pending(requestId, arg, (_b = options == null ? void 0 : options.getPendingMeta) == null ? void 0 : _b.call(options, { requestId: requestId, arg: arg }, { getState: getState, extra: extra })));
                                        return [4 /*yield*/, Promise.race([
                                                abortedPromise,
                                                Promise.resolve(payloadCreator(arg, {
                                                    dispatch: dispatch,
                                                    getState: getState,
                                                    extra: extra,
                                                    requestId: requestId,
                                                    signal: abortController.signal,
                                                    abort: abort,
                                                    rejectWithValue: function (value, meta) {
                                                        return new RejectWithValue(value, meta);
                                                    },
                                                    fulfillWithValue: function (value, meta) {
                                                        return new FulfillWithMeta(value, meta);
                                                    }
                                                })).then(function (result) {
                                                    if (result instanceof RejectWithValue) {
                                                        throw result;
                                                    }
                                                    if (result instanceof FulfillWithMeta) {
                                                        return fulfilled(result.payload, requestId, arg, result.meta);
                                                    }
                                                    return fulfilled(result, requestId, arg);
                                                })
                                            ])];
                                    case 3:
                                        finalAction = _j.sent();
                                        return [3 /*break*/, 5];
                                    case 4:
                                        err_1 = _j.sent();
                                        finalAction = err_1 instanceof RejectWithValue ? rejected(null, requestId, arg, err_1.payload, err_1.meta) : rejected(err_1, requestId, arg);
                                        return [3 /*break*/, 5];
                                    case 5:
                                        skipDispatch = options && !options.dispatchConditionRejection && rejected.match(finalAction) && finalAction.meta.condition;
                                        if (!skipDispatch) {
                                            dispatch(finalAction);
                                        }
                                        return [2 /*return*/, finalAction];
                                }
                            });
                        });
                    }();
                    return Object.assign(promise3, {
                        abort: abort,
                        requestId: requestId,
                        arg: arg,
                        unwrap: function () {
                            return promise3.then(unwrapResult);
                        }
                    });
                };
            }
            return Object.assign(actionCreator, {
                pending: pending,
                rejected: rejected,
                fulfilled: fulfilled,
                typePrefix: typePrefix
            });
        }
        createAsyncThunk2.withTypes = function () { return createAsyncThunk2; };
        return createAsyncThunk2;
    })();
    function unwrapResult(action) {
        if (action.meta && action.meta.rejectedWithValue) {
            throw action.payload;
        }
        if (action.error) {
            throw action.error;
        }
        return action.payload;
    }
    function isThenable(value) {
        return value !== null && typeof value === "object" && typeof value.then === "function";
    }
    // src/matchers.ts
    var matches = function (matcher, action) {
        if (hasMatchFunction(matcher)) {
            return matcher.match(action);
        }
        else {
            return matcher(action);
        }
    };
    function isAnyOf() {
        var matchers = [];
        for (var _j = 0; _j < arguments.length; _j++) {
            matchers[_j] = arguments[_j];
        }
        return function (action) {
            return matchers.some(function (matcher) { return matches(matcher, action); });
        };
    }
    function isAllOf() {
        var matchers = [];
        for (var _j = 0; _j < arguments.length; _j++) {
            matchers[_j] = arguments[_j];
        }
        return function (action) {
            return matchers.every(function (matcher) { return matches(matcher, action); });
        };
    }
    function hasExpectedRequestMetadata(action, validStatus) {
        if (!action || !action.meta)
            return false;
        var hasValidRequestId = typeof action.meta.requestId === "string";
        var hasValidRequestStatus = validStatus.indexOf(action.meta.requestStatus) > -1;
        return hasValidRequestId && hasValidRequestStatus;
    }
    function isAsyncThunkArray(a2) {
        return typeof a2[0] === "function" && "pending" in a2[0] && "fulfilled" in a2[0] && "rejected" in a2[0];
    }
    function isPending() {
        var asyncThunks = [];
        for (var _j = 0; _j < arguments.length; _j++) {
            asyncThunks[_j] = arguments[_j];
        }
        if (asyncThunks.length === 0) {
            return function (action) { return hasExpectedRequestMetadata(action, ["pending"]); };
        }
        if (!isAsyncThunkArray(asyncThunks)) {
            return isPending()(asyncThunks[0]);
        }
        return function (action) {
            var matchers = asyncThunks.map(function (asyncThunk) { return asyncThunk.pending; });
            var combinedMatcher = isAnyOf.apply(void 0, matchers);
            return combinedMatcher(action);
        };
    }
    function isRejected() {
        var asyncThunks = [];
        for (var _j = 0; _j < arguments.length; _j++) {
            asyncThunks[_j] = arguments[_j];
        }
        if (asyncThunks.length === 0) {
            return function (action) { return hasExpectedRequestMetadata(action, ["rejected"]); };
        }
        if (!isAsyncThunkArray(asyncThunks)) {
            return isRejected()(asyncThunks[0]);
        }
        return function (action) {
            var matchers = asyncThunks.map(function (asyncThunk) { return asyncThunk.rejected; });
            var combinedMatcher = isAnyOf.apply(void 0, matchers);
            return combinedMatcher(action);
        };
    }
    function isRejectedWithValue() {
        var asyncThunks = [];
        for (var _j = 0; _j < arguments.length; _j++) {
            asyncThunks[_j] = arguments[_j];
        }
        var hasFlag = function (action) {
            return action && action.meta && action.meta.rejectedWithValue;
        };
        if (asyncThunks.length === 0) {
            return function (action) {
                var combinedMatcher = isAllOf(isRejected.apply(void 0, asyncThunks), hasFlag);
                return combinedMatcher(action);
            };
        }
        if (!isAsyncThunkArray(asyncThunks)) {
            return isRejectedWithValue()(asyncThunks[0]);
        }
        return function (action) {
            var combinedMatcher = isAllOf(isRejected.apply(void 0, asyncThunks), hasFlag);
            return combinedMatcher(action);
        };
    }
    function isFulfilled() {
        var asyncThunks = [];
        for (var _j = 0; _j < arguments.length; _j++) {
            asyncThunks[_j] = arguments[_j];
        }
        if (asyncThunks.length === 0) {
            return function (action) { return hasExpectedRequestMetadata(action, ["fulfilled"]); };
        }
        if (!isAsyncThunkArray(asyncThunks)) {
            return isFulfilled()(asyncThunks[0]);
        }
        return function (action) {
            var matchers = asyncThunks.map(function (asyncThunk) { return asyncThunk.fulfilled; });
            var combinedMatcher = isAnyOf.apply(void 0, matchers);
            return combinedMatcher(action);
        };
    }
    function isAsyncThunkAction() {
        var asyncThunks = [];
        for (var _j = 0; _j < arguments.length; _j++) {
            asyncThunks[_j] = arguments[_j];
        }
        if (asyncThunks.length === 0) {
            return function (action) { return hasExpectedRequestMetadata(action, ["pending", "fulfilled", "rejected"]); };
        }
        if (!isAsyncThunkArray(asyncThunks)) {
            return isAsyncThunkAction()(asyncThunks[0]);
        }
        return function (action) {
            var matchers = [];
            for (var _j = 0, asyncThunks_1 = asyncThunks; _j < asyncThunks_1.length; _j++) {
                var asyncThunk = asyncThunks_1[_j];
                matchers.push(asyncThunk.pending, asyncThunk.rejected, asyncThunk.fulfilled);
            }
            var combinedMatcher = isAnyOf.apply(void 0, matchers);
            return combinedMatcher(action);
        };
    }
    // src/autoBatchEnhancer.ts
    var SHOULD_AUTOBATCH = "RTK_autoBatch";
    var prepareAutoBatched = function () { return function (payload) {
        var _j;
        return ({
            payload: payload,
            meta: (_j = {}, _j[SHOULD_AUTOBATCH] = true, _j)
        });
    }; };
    var promise;
    typeof queueMicrotask === "function" ? queueMicrotask.bind(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : globalThis) : function (cb) { return (promise || (promise = Promise.resolve())).then(cb).catch(function (err) { return setTimeout(function () {
        throw err;
    }, 0); }); };
    // src/index.ts
    F();
    // src/query/utils/copyWithStructuralSharing.ts
    var isPlainObject3 = isPlainObject2;
    function copyWithStructuralSharing(oldObj, newObj) {
        if (oldObj === newObj || !(isPlainObject3(oldObj) && isPlainObject3(newObj) || Array.isArray(oldObj) && Array.isArray(newObj))) {
            return newObj;
        }
        var newKeys = Object.keys(newObj);
        var oldKeys = Object.keys(oldObj);
        var isSameObject = newKeys.length === oldKeys.length;
        var mergeObj = Array.isArray(newObj) ? [] : {};
        for (var _j = 0, newKeys_1 = newKeys; _j < newKeys_1.length; _j++) {
            var key = newKeys_1[_j];
            mergeObj[key] = copyWithStructuralSharing(oldObj[key], newObj[key]);
            if (isSameObject)
                isSameObject = oldObj[key] === mergeObj[key];
        }
        return isSameObject ? oldObj : mergeObj;
    }
    // src/query/fetchBaseQuery.ts
    var defaultFetchFn = function () {
        var args = [];
        for (var _j = 0; _j < arguments.length; _j++) {
            args[_j] = arguments[_j];
        }
        return fetch.apply(void 0, args);
    };
    var defaultValidateStatus = function (response) { return response.status >= 200 && response.status <= 299; };
    var defaultIsJsonContentType = function (headers) { return /ion\/(vnd\.api\+)?json/.test(headers.get("content-type") || ""); };
    function stripUndefined(obj) {
        if (!isPlainObject2(obj)) {
            return obj;
        }
        var copy = __spreadValues({}, obj);
        for (var _j = 0, _k = Object.entries(copy); _j < _k.length; _j++) {
            var _l = _k[_j], k2 = _l[0], v2 = _l[1];
            if (v2 === void 0)
                delete copy[k2];
        }
        return copy;
    }
    function fetchBaseQuery(_a) {
        var _this = this;
        if (_a === void 0) { _a = {}; }
        var _b = _a, baseUrl = _b.baseUrl, _j = _b.prepareHeaders, prepareHeaders = _j === void 0 ? function (x2) { return x2; } : _j, _k = _b.fetchFn, fetchFn = _k === void 0 ? defaultFetchFn : _k, paramsSerializer = _b.paramsSerializer, _l = _b.isJsonContentType, isJsonContentType = _l === void 0 ? defaultIsJsonContentType : _l, _m = _b.jsonContentType, jsonContentType = _m === void 0 ? "application/json" : _m, jsonReplacer = _b.jsonReplacer, defaultTimeout = _b.timeout, globalResponseHandler = _b.responseHandler, globalValidateStatus = _b.validateStatus, baseFetchOptions = __objRest(_b, [
            "baseUrl",
            "prepareHeaders",
            "fetchFn",
            "paramsSerializer",
            "isJsonContentType",
            "jsonContentType",
            "jsonReplacer",
            "timeout",
            "responseHandler",
            "validateStatus"
        ]);
        if (typeof fetch === "undefined" && fetchFn === defaultFetchFn) {
            console.warn("Warning: `fetch` is not available. Please supply a custom `fetchFn` property to use `fetchBaseQuery` on SSR environments.");
        }
        return function (arg, api) { return __async(_this, null, function () {
            var signal, getState, extra, endpoint, forced, type, meta, _a2, url, _j, headers, _k, params, _l, responseHandler, _m, validateStatus, _o, timeout, rest, config, _p, isJsonifiable, divider, query, request, requestClone, response, timedOut, timeoutId, e2_1, responseClone, resultData, responseText, handleResponseError_1, e2_2;
            return __generator(this, function (_q) {
                switch (_q.label) {
                    case 0:
                        signal = api.signal, getState = api.getState, extra = api.extra, endpoint = api.endpoint, forced = api.forced, type = api.type;
                        _a2 = typeof arg == "string" ? { url: arg } : arg, url = _a2.url, _j = _a2.headers, headers = _j === void 0 ? new Headers(baseFetchOptions.headers) : _j, _k = _a2.params, params = _k === void 0 ? void 0 : _k, _l = _a2.responseHandler, responseHandler = _l === void 0 ? globalResponseHandler != null ? globalResponseHandler : "json" : _l, _m = _a2.validateStatus, validateStatus = _m === void 0 ? globalValidateStatus != null ? globalValidateStatus : defaultValidateStatus : _m, _o = _a2.timeout, timeout = _o === void 0 ? defaultTimeout : _o, rest = __objRest(_a2, [
                            "url",
                            "headers",
                            "params",
                            "responseHandler",
                            "validateStatus",
                            "timeout"
                        ]);
                        config = __spreadValues(__spreadProps(__spreadValues({}, baseFetchOptions), {
                            signal: signal
                        }), rest);
                        headers = new Headers(stripUndefined(headers));
                        _p = config;
                        return [4 /*yield*/, prepareHeaders(headers, {
                                getState: getState,
                                extra: extra,
                                endpoint: endpoint,
                                forced: forced,
                                type: type
                            })];
                    case 1:
                        _p.headers = (_q.sent()) || headers;
                        isJsonifiable = function (body) { return typeof body === "object" && (isPlainObject2(body) || Array.isArray(body) || typeof body.toJSON === "function"); };
                        if (!config.headers.has("content-type") && isJsonifiable(config.body)) {
                            config.headers.set("content-type", jsonContentType);
                        }
                        if (isJsonifiable(config.body) && isJsonContentType(config.headers)) {
                            config.body = JSON.stringify(config.body, jsonReplacer);
                        }
                        if (params) {
                            divider = ~url.indexOf("?") ? "&" : "?";
                            query = paramsSerializer ? paramsSerializer(params) : new URLSearchParams(stripUndefined(params));
                            url += divider + query;
                        }
                        url = joinUrls(baseUrl, url);
                        request = new Request(url, config);
                        requestClone = new Request(url, config);
                        meta = { request: requestClone };
                        timedOut = false, timeoutId = timeout && setTimeout(function () {
                            timedOut = true;
                            api.abort();
                        }, timeout);
                        _q.label = 2;
                    case 2:
                        _q.trys.push([2, 4, 5, 6]);
                        return [4 /*yield*/, fetchFn(request)];
                    case 3:
                        response = _q.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        e2_1 = _q.sent();
                        return [2 /*return*/, {
                                error: {
                                    status: timedOut ? "TIMEOUT_ERROR" : "FETCH_ERROR",
                                    error: String(e2_1)
                                },
                                meta: meta
                            }];
                    case 5:
                        if (timeoutId)
                            clearTimeout(timeoutId);
                        return [7 /*endfinally*/];
                    case 6:
                        responseClone = response.clone();
                        meta.response = responseClone;
                        responseText = "";
                        _q.label = 7;
                    case 7:
                        _q.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, Promise.all([
                                handleResponse(response, responseHandler).then(function (r2) { return resultData = r2; }, function (e2) { return handleResponseError_1 = e2; }),
                                responseClone.text().then(function (r2) { return responseText = r2; }, function () {
                                })
                            ])];
                    case 8:
                        _q.sent();
                        if (handleResponseError_1)
                            throw handleResponseError_1;
                        return [3 /*break*/, 10];
                    case 9:
                        e2_2 = _q.sent();
                        return [2 /*return*/, {
                                error: {
                                    status: "PARSING_ERROR",
                                    originalStatus: response.status,
                                    data: responseText,
                                    error: String(e2_2)
                                },
                                meta: meta
                            }];
                    case 10: return [2 /*return*/, validateStatus(response, resultData) ? {
                            data: resultData,
                            meta: meta
                        } : {
                            error: {
                                status: response.status,
                                data: resultData
                            },
                            meta: meta
                        }];
                }
            });
        }); };
        function handleResponse(response, responseHandler) {
            return __async(this, null, function () {
                var text;
                return __generator(this, function (_j) {
                    switch (_j.label) {
                        case 0:
                            if (typeof responseHandler === "function") {
                                return [2 /*return*/, responseHandler(response)];
                            }
                            if (responseHandler === "content-type") {
                                responseHandler = isJsonContentType(response.headers) ? "json" : "text";
                            }
                            if (!(responseHandler === "json")) return [3 /*break*/, 2];
                            return [4 /*yield*/, response.text()];
                        case 1:
                            text = _j.sent();
                            return [2 /*return*/, text.length ? JSON.parse(text) : null];
                        case 2: return [2 /*return*/, response.text()];
                    }
                });
            });
        }
    }
    // src/query/HandledError.ts
    var HandledError = /** @class */ (function () {
        function HandledError(value, meta) {
            if (meta === void 0) { meta = void 0; }
            this.value = value;
            this.meta = meta;
        }
        return HandledError;
    }());
    // src/query/retry.ts
    function defaultBackoff(attempt, maxRetries) {
        if (attempt === void 0) { attempt = 0; }
        if (maxRetries === void 0) { maxRetries = 5; }
        return __async(this, null, function () {
            var attempts, timeout;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        attempts = Math.min(attempt, maxRetries);
                        timeout = ~~((Math.random() + 0.4) * (300 << attempts));
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(function (res) { return resolve(res); }, timeout); })];
                    case 1:
                        _j.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    function fail(e2) {
        throw Object.assign(new HandledError({ error: e2 }), {
            throwImmediately: true
        });
    }
    var EMPTY_OPTIONS = {};
    var retryWithBackoff = function (baseQuery, defaultOptions) { return function (args, api, extraOptions) { return __async(void 0, null, function () {
        var possibleMaxRetries, maxRetries, defaultRetryCondition, options, retry2, result, e2_3;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    possibleMaxRetries = [
                        5,
                        (defaultOptions || EMPTY_OPTIONS).maxRetries,
                        (extraOptions || EMPTY_OPTIONS).maxRetries
                    ].filter(function (x2) { return x2 !== void 0; });
                    maxRetries = possibleMaxRetries.slice(-1)[0];
                    defaultRetryCondition = function (_2, __, _j) {
                        var attempt = _j.attempt;
                        return attempt <= maxRetries;
                    };
                    options = __spreadValues(__spreadValues({
                        maxRetries: maxRetries,
                        backoff: defaultBackoff,
                        retryCondition: defaultRetryCondition
                    }, defaultOptions), extraOptions);
                    retry2 = 0;
                    _j.label = 1;
                case 1:
                    _j.label = 2;
                case 2:
                    _j.trys.push([2, 4, , 6]);
                    return [4 /*yield*/, baseQuery(args, api, extraOptions)];
                case 3:
                    result = _j.sent();
                    if (result.error) {
                        throw new HandledError(result);
                    }
                    return [2 /*return*/, result];
                case 4:
                    e2_3 = _j.sent();
                    retry2++;
                    if (e2_3.throwImmediately) {
                        if (e2_3 instanceof HandledError) {
                            return [2 /*return*/, e2_3.value];
                        }
                        throw e2_3;
                    }
                    if (e2_3 instanceof HandledError && !options.retryCondition(e2_3.value.error, args, {
                        attempt: retry2,
                        baseQueryApi: api,
                        extraOptions: extraOptions
                    })) {
                        return [2 /*return*/, e2_3.value];
                    }
                    return [4 /*yield*/, options.backoff(retry2, options.maxRetries)];
                case 5:
                    _j.sent();
                    return [3 /*break*/, 6];
                case 6: return [3 /*break*/, 1];
                case 7: return [2 /*return*/];
            }
        });
    }); }; };
    var retry = /* @__PURE__ */ Object.assign(retryWithBackoff, { fail: fail });
    // src/query/core/setupListeners.ts
    var onFocus = /* @__PURE__ */ createAction("__rtkq/focused");
    var onFocusLost = /* @__PURE__ */ createAction("__rtkq/unfocused");
    var onOnline = /* @__PURE__ */ createAction("__rtkq/online");
    var onOffline = /* @__PURE__ */ createAction("__rtkq/offline");
    var initialized = false;
    function setupListeners(dispatch, customHandler) {
        function defaultHandler() {
            var handleFocus = function () { return dispatch(onFocus()); };
            var handleFocusLost = function () { return dispatch(onFocusLost()); };
            var handleOnline = function () { return dispatch(onOnline()); };
            var handleOffline = function () { return dispatch(onOffline()); };
            var handleVisibilityChange = function () {
                if (window.document.visibilityState === "visible") {
                    handleFocus();
                }
                else {
                    handleFocusLost();
                }
            };
            if (!initialized) {
                if (typeof window !== "undefined" && window.addEventListener) {
                    window.addEventListener("visibilitychange", handleVisibilityChange, false);
                    window.addEventListener("focus", handleFocus, false);
                    window.addEventListener("online", handleOnline, false);
                    window.addEventListener("offline", handleOffline, false);
                    initialized = true;
                }
            }
            var unsubscribe = function () {
                window.removeEventListener("focus", handleFocus);
                window.removeEventListener("visibilitychange", handleVisibilityChange);
                window.removeEventListener("online", handleOnline);
                window.removeEventListener("offline", handleOffline);
                initialized = false;
            };
            return unsubscribe;
        }
        return customHandler ? customHandler(dispatch, { onFocus: onFocus, onFocusLost: onFocusLost, onOffline: onOffline, onOnline: onOnline }) : defaultHandler();
    }
    // src/query/endpointDefinitions.ts
    var DefinitionType;
    (function (DefinitionType2) {
        DefinitionType2["query"] = "query";
        DefinitionType2["mutation"] = "mutation";
    })(DefinitionType || (DefinitionType = {}));
    function isQueryDefinition(e2) {
        return e2.type === DefinitionType.query;
    }
    function isMutationDefinition(e2) {
        return e2.type === DefinitionType.mutation;
    }
    function calculateProvidedBy(description, result, error, queryArg, meta, assertTagTypes) {
        if (isFunction(description)) {
            return description(result, error, queryArg, meta).map(expandTagDescription).map(assertTagTypes);
        }
        if (Array.isArray(description)) {
            return description.map(expandTagDescription).map(assertTagTypes);
        }
        return [];
    }
    function isFunction(t2) {
        return typeof t2 === "function";
    }
    function expandTagDescription(description) {
        return typeof description === "string" ? { type: description } : description;
    }
    // src/query/utils/isNotNullish.ts
    function isNotNullish(v2) {
        return v2 != null;
    }
    // src/query/core/buildInitiate.ts
    var forceQueryFnSymbol = Symbol("forceQueryFn");
    var isUpsertQuery = function (arg) { return typeof arg[forceQueryFnSymbol] === "function"; };
    function buildInitiate(_j) {
        var serializeQueryArgs = _j.serializeQueryArgs, queryThunk = _j.queryThunk, mutationThunk = _j.mutationThunk, api = _j.api, context = _j.context;
        var runningQueries = new Map();
        var runningMutations = new Map();
        var _k = api.internalActions, unsubscribeQueryResult = _k.unsubscribeQueryResult, removeMutationResult = _k.removeMutationResult, updateSubscriptionOptions = _k.updateSubscriptionOptions;
        return {
            buildInitiateQuery: buildInitiateQuery,
            buildInitiateMutation: buildInitiateMutation,
            getRunningQueryThunk: getRunningQueryThunk,
            getRunningMutationThunk: getRunningMutationThunk,
            getRunningQueriesThunk: getRunningQueriesThunk,
            getRunningMutationsThunk: getRunningMutationsThunk,
            getRunningOperationPromises: getRunningOperationPromises,
            removalWarning: removalWarning
        };
        function removalWarning() {
            throw new Error("This method had to be removed due to a conceptual bug in RTK.\n       Please see https://github.com/reduxjs/redux-toolkit/pull/2481 for details.\n       See https://redux-toolkit.js.org/rtk-query/usage/server-side-rendering for new guidance on SSR.");
        }
        function getRunningOperationPromises() {
            if (typeof process !== "undefined" && true) {
                removalWarning();
            }
            else {
                var extract = function (v2) { return Array.from(v2.values()).flatMap(function (queriesForStore) { return queriesForStore ? Object.values(queriesForStore) : []; }); };
                return __spreadArray(__spreadArray([], extract(runningQueries)), extract(runningMutations)).filter(isNotNullish);
            }
        }
        function getRunningQueryThunk(endpointName, queryArgs) {
            return function (dispatch) {
                var _a;
                var endpointDefinition = context.endpointDefinitions[endpointName];
                var queryCacheKey = serializeQueryArgs({
                    queryArgs: queryArgs,
                    endpointDefinition: endpointDefinition,
                    endpointName: endpointName
                });
                return (_a = runningQueries.get(dispatch)) == null ? void 0 : _a[queryCacheKey];
            };
        }
        function getRunningMutationThunk(_endpointName, fixedCacheKeyOrRequestId) {
            return function (dispatch) {
                var _a;
                return (_a = runningMutations.get(dispatch)) == null ? void 0 : _a[fixedCacheKeyOrRequestId];
            };
        }
        function getRunningQueriesThunk() {
            return function (dispatch) { return Object.values(runningQueries.get(dispatch) || {}).filter(isNotNullish); };
        }
        function getRunningMutationsThunk() {
            return function (dispatch) { return Object.values(runningMutations.get(dispatch) || {}).filter(isNotNullish); };
        }
        function middlewareWarning(dispatch) {
            {
                if (middlewareWarning.triggered)
                    return;
                var registered = dispatch(api.internalActions.internal_probeSubscription({
                    queryCacheKey: "DOES_NOT_EXIST",
                    requestId: "DUMMY_REQUEST_ID"
                }));
                middlewareWarning.triggered = true;
                if (typeof registered !== "boolean") {
                    throw new Error("Warning: Middleware for RTK-Query API at reducerPath \"" + api.reducerPath + "\" has not been added to the store.\nYou must add the middleware for RTK-Query to function correctly!");
                }
            }
        }
        function buildInitiateQuery(endpointName, endpointDefinition) {
            var queryAction = function (arg, _j) {
                var _k = _j === void 0 ? {} : _j, _l = _k.subscribe, subscribe = _l === void 0 ? true : _l, forceRefetch = _k.forceRefetch, subscriptionOptions = _k.subscriptionOptions, _m = forceQueryFnSymbol, forceQueryFn = _k[_m];
                return function (dispatch, getState) {
                    var _j;
                    var _a;
                    var queryCacheKey = serializeQueryArgs({
                        queryArgs: arg,
                        endpointDefinition: endpointDefinition,
                        endpointName: endpointName
                    });
                    var thunk = queryThunk((_j = {
                            type: "query",
                            subscribe: subscribe,
                            forceRefetch: forceRefetch,
                            subscriptionOptions: subscriptionOptions,
                            endpointName: endpointName,
                            originalArgs: arg,
                            queryCacheKey: queryCacheKey
                        },
                        _j[forceQueryFnSymbol] = forceQueryFn,
                        _j));
                    var selector = api.endpoints[endpointName].select(arg);
                    var thunkResult = dispatch(thunk);
                    var stateAfter = selector(getState());
                    middlewareWarning(dispatch);
                    var requestId = thunkResult.requestId, abort = thunkResult.abort;
                    var skippedSynchronously = stateAfter.requestId !== requestId;
                    var runningQuery = (_a = runningQueries.get(dispatch)) == null ? void 0 : _a[queryCacheKey];
                    var selectFromState = function () { return selector(getState()); };
                    var statePromise = Object.assign(forceQueryFn ? thunkResult.then(selectFromState) : skippedSynchronously && !runningQuery ? Promise.resolve(stateAfter) : Promise.all([runningQuery, thunkResult]).then(selectFromState), {
                        arg: arg,
                        requestId: requestId,
                        subscriptionOptions: subscriptionOptions,
                        queryCacheKey: queryCacheKey,
                        abort: abort,
                        unwrap: function () {
                            return __async(this, null, function () {
                                var result;
                                return __generator(this, function (_j) {
                                    switch (_j.label) {
                                        case 0: return [4 /*yield*/, statePromise];
                                        case 1:
                                            result = _j.sent();
                                            if (result.isError) {
                                                throw result.error;
                                            }
                                            return [2 /*return*/, result.data];
                                    }
                                });
                            });
                        },
                        refetch: function () { return dispatch(queryAction(arg, { subscribe: false, forceRefetch: true })); },
                        unsubscribe: function () {
                            if (subscribe)
                                dispatch(unsubscribeQueryResult({
                                    queryCacheKey: queryCacheKey,
                                    requestId: requestId
                                }));
                        },
                        updateSubscriptionOptions: function (options) {
                            statePromise.subscriptionOptions = options;
                            dispatch(updateSubscriptionOptions({
                                endpointName: endpointName,
                                requestId: requestId,
                                queryCacheKey: queryCacheKey,
                                options: options
                            }));
                        }
                    });
                    if (!runningQuery && !skippedSynchronously && !forceQueryFn) {
                        var running_1 = runningQueries.get(dispatch) || {};
                        running_1[queryCacheKey] = statePromise;
                        runningQueries.set(dispatch, running_1);
                        statePromise.then(function () {
                            delete running_1[queryCacheKey];
                            if (!Object.keys(running_1).length) {
                                runningQueries.delete(dispatch);
                            }
                        });
                    }
                    return statePromise;
                };
            };
            return queryAction;
        }
        function buildInitiateMutation(endpointName) {
            return function (arg, _j) {
                var _k = _j === void 0 ? {} : _j, _l = _k.track, track = _l === void 0 ? true : _l, fixedCacheKey = _k.fixedCacheKey;
                return function (dispatch, getState) {
                    var thunk = mutationThunk({
                        type: "mutation",
                        endpointName: endpointName,
                        originalArgs: arg,
                        track: track,
                        fixedCacheKey: fixedCacheKey
                    });
                    var thunkResult = dispatch(thunk);
                    middlewareWarning(dispatch);
                    var requestId = thunkResult.requestId, abort = thunkResult.abort, unwrap = thunkResult.unwrap;
                    var returnValuePromise = thunkResult.unwrap().then(function (data) { return ({ data: data }); }).catch(function (error) { return ({ error: error }); });
                    var reset = function () {
                        dispatch(removeMutationResult({ requestId: requestId, fixedCacheKey: fixedCacheKey }));
                    };
                    var ret = Object.assign(returnValuePromise, {
                        arg: thunkResult.arg,
                        requestId: requestId,
                        abort: abort,
                        unwrap: unwrap,
                        unsubscribe: reset,
                        reset: reset
                    });
                    var running = runningMutations.get(dispatch) || {};
                    runningMutations.set(dispatch, running);
                    running[requestId] = ret;
                    ret.then(function () {
                        delete running[requestId];
                        if (!Object.keys(running).length) {
                            runningMutations.delete(dispatch);
                        }
                    });
                    if (fixedCacheKey) {
                        running[fixedCacheKey] = ret;
                        ret.then(function () {
                            if (running[fixedCacheKey] === ret) {
                                delete running[fixedCacheKey];
                                if (!Object.keys(running).length) {
                                    runningMutations.delete(dispatch);
                                }
                            }
                        });
                    }
                    return ret;
                };
            };
        }
    }
    // src/query/core/buildThunks.ts
    function defaultTransformResponse(baseQueryReturnValue) {
        return baseQueryReturnValue;
    }
    function buildThunks(_j) {
        var _this = this;
        var reducerPath = _j.reducerPath, baseQuery = _j.baseQuery, endpointDefinitions = _j.context.endpointDefinitions, serializeQueryArgs = _j.serializeQueryArgs, api = _j.api, assertTagType = _j.assertTagType;
        var patchQueryData = function (endpointName, args, patches, updateProvided) { return function (dispatch, getState) {
            var endpointDefinition = endpointDefinitions[endpointName];
            var queryCacheKey = serializeQueryArgs({
                queryArgs: args,
                endpointDefinition: endpointDefinition,
                endpointName: endpointName
            });
            dispatch(api.internalActions.queryResultPatched({ queryCacheKey: queryCacheKey, patches: patches }));
            if (!updateProvided) {
                return;
            }
            var newValue = api.endpoints[endpointName].select(args)(getState());
            var providedTags = calculateProvidedBy(endpointDefinition.providesTags, newValue.data, void 0, args, {}, assertTagType);
            dispatch(api.internalActions.updateProvidedBy({ queryCacheKey: queryCacheKey, providedTags: providedTags }));
        }; };
        var updateQueryData = function (endpointName, args, updateRecipe, updateProvided) {
            if (updateProvided === void 0) { updateProvided = true; }
            return function (dispatch, getState) {
                var _j, _k;
                var endpointDefinition = api.endpoints[endpointName];
                var currentState = endpointDefinition.select(args)(getState());
                var ret = {
                    patches: [],
                    inversePatches: [],
                    undo: function () { return dispatch(api.util.patchQueryData(endpointName, args, ret.inversePatches, updateProvided)); }
                };
                if (currentState.status === exports.QueryStatus.uninitialized) {
                    return ret;
                }
                var newValue;
                if ("data" in currentState) {
                    if (t(currentState.data)) {
                        var _l = cn(currentState.data, updateRecipe), value = _l[0], patches = _l[1], inversePatches = _l[2];
                        (_j = ret.patches).push.apply(_j, patches);
                        (_k = ret.inversePatches).push.apply(_k, inversePatches);
                        newValue = value;
                    }
                    else {
                        newValue = updateRecipe(currentState.data);
                        ret.patches.push({ op: "replace", path: [], value: newValue });
                        ret.inversePatches.push({
                            op: "replace",
                            path: [],
                            value: currentState.data
                        });
                    }
                }
                dispatch(api.util.patchQueryData(endpointName, args, ret.patches, updateProvided));
                return ret;
            };
        };
        var upsertQueryData = function (endpointName, args, value) { return function (dispatch) {
            var _j;
            return dispatch(api.endpoints[endpointName].initiate(args, (_j = {
                    subscribe: false,
                    forceRefetch: true
                },
                _j[forceQueryFnSymbol] = function () { return ({
                    data: value
                }); },
                _j)));
        }; };
        var executeEndpoint = function (_0, _1) { return __async(_this, [_0, _1], function (arg, _j) {
            var endpointDefinition, transformResponse, result, baseQueryApi_1, forceQueryFn, what, err, _k, _l, key, _m, error_1, catchedError, transformErrorResponse, _o, e2_4;
            var _p, _q;
            var signal = _j.signal, abort = _j.abort, rejectWithValue = _j.rejectWithValue, fulfillWithValue = _j.fulfillWithValue, dispatch = _j.dispatch, getState = _j.getState, extra = _j.extra;
            return __generator(this, function (_r) {
                switch (_r.label) {
                    case 0:
                        endpointDefinition = endpointDefinitions[arg.endpointName];
                        _r.label = 1;
                    case 1:
                        _r.trys.push([1, 8, , 13]);
                        transformResponse = defaultTransformResponse;
                        result = void 0;
                        baseQueryApi_1 = {
                            signal: signal,
                            abort: abort,
                            dispatch: dispatch,
                            getState: getState,
                            extra: extra,
                            endpoint: arg.endpointName,
                            type: arg.type,
                            forced: arg.type === "query" ? isForcedQuery(arg, getState()) : void 0
                        };
                        forceQueryFn = arg.type === "query" ? arg[forceQueryFnSymbol] : void 0;
                        if (!forceQueryFn) return [3 /*break*/, 2];
                        result = forceQueryFn();
                        return [3 /*break*/, 6];
                    case 2:
                        if (!endpointDefinition.query) return [3 /*break*/, 4];
                        return [4 /*yield*/, baseQuery(endpointDefinition.query(arg.originalArgs), baseQueryApi_1, endpointDefinition.extraOptions)];
                    case 3:
                        result = _r.sent();
                        if (endpointDefinition.transformResponse) {
                            transformResponse = endpointDefinition.transformResponse;
                        }
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, endpointDefinition.queryFn(arg.originalArgs, baseQueryApi_1, endpointDefinition.extraOptions, function (arg2) { return baseQuery(arg2, baseQueryApi_1, endpointDefinition.extraOptions); })];
                    case 5:
                        result = _r.sent();
                        _r.label = 6;
                    case 6:
                        if (typeof process !== "undefined" && true) {
                            what = endpointDefinition.query ? "`baseQuery`" : "`queryFn`";
                            err = void 0;
                            if (!result) {
                                err = what + " did not return anything.";
                            }
                            else if (typeof result !== "object") {
                                err = what + " did not return an object.";
                            }
                            else if (result.error && result.data) {
                                err = what + " returned an object containing both `error` and `result`.";
                            }
                            else if (result.error === void 0 && result.data === void 0) {
                                err = what + " returned an object containing neither a valid `error` and `result`. At least one of them should not be `undefined`";
                            }
                            else {
                                for (_k = 0, _l = Object.keys(result); _k < _l.length; _k++) {
                                    key = _l[_k];
                                    if (key !== "error" && key !== "data" && key !== "meta") {
                                        err = "The object returned by " + what + " has the unknown property " + key + ".";
                                        break;
                                    }
                                }
                            }
                            if (err) {
                                console.error("Error encountered handling the endpoint " + arg.endpointName + ".\n              " + err + "\n              It needs to return an object with either the shape `{ data: <value> }` or `{ error: <value> }` that may contain an optional `meta` property.\n              Object returned was:", result);
                            }
                        }
                        if (result.error)
                            throw new HandledError(result.error, result.meta);
                        _m = fulfillWithValue;
                        return [4 /*yield*/, transformResponse(result.data, result.meta, arg.originalArgs)];
                    case 7: return [2 /*return*/, _m.apply(void 0, [_r.sent(), (_p = {
                                    fulfilledTimeStamp: Date.now(),
                                    baseQueryMeta: result.meta
                                },
                                _p[SHOULD_AUTOBATCH] = true,
                                _p)])];
                    case 8:
                        error_1 = _r.sent();
                        catchedError = error_1;
                        if (!(catchedError instanceof HandledError)) return [3 /*break*/, 12];
                        transformErrorResponse = defaultTransformResponse;
                        if (endpointDefinition.query && endpointDefinition.transformErrorResponse) {
                            transformErrorResponse = endpointDefinition.transformErrorResponse;
                        }
                        _r.label = 9;
                    case 9:
                        _r.trys.push([9, 11, , 12]);
                        _o = rejectWithValue;
                        return [4 /*yield*/, transformErrorResponse(catchedError.value, catchedError.meta, arg.originalArgs)];
                    case 10: return [2 /*return*/, _o.apply(void 0, [_r.sent(), (_q = { baseQueryMeta: catchedError.meta }, _q[SHOULD_AUTOBATCH] = true, _q)])];
                    case 11:
                        e2_4 = _r.sent();
                        catchedError = e2_4;
                        return [3 /*break*/, 12];
                    case 12:
                        if (typeof process !== "undefined" && true) {
                            console.error("An unhandled error occurred processing a request for the endpoint \"" + arg.endpointName + "\".\nIn the case of an unhandled error, no tags will be \"provided\" or \"invalidated\".", catchedError);
                        }
                        else {
                            console.error(catchedError);
                        }
                        throw catchedError;
                    case 13: return [2 /*return*/];
                }
            });
        }); };
        function isForcedQuery(arg, state) {
            var _a, _b, _c, _d;
            var requestState = (_b = (_a = state[reducerPath]) == null ? void 0 : _a.queries) == null ? void 0 : _b[arg.queryCacheKey];
            var baseFetchOnMountOrArgChange = (_c = state[reducerPath]) == null ? void 0 : _c.config.refetchOnMountOrArgChange;
            var fulfilledVal = requestState == null ? void 0 : requestState.fulfilledTimeStamp;
            var refetchVal = (_d = arg.forceRefetch) != null ? _d : arg.subscribe && baseFetchOnMountOrArgChange;
            if (refetchVal) {
                return refetchVal === true || (Number(new Date()) - Number(fulfilledVal)) / 1e3 >= refetchVal;
            }
            return false;
        }
        var queryThunk = createAsyncThunk(reducerPath + "/executeQuery", executeEndpoint, {
            getPendingMeta: function () {
                var _j;
                return _j = { startedTimeStamp: Date.now() }, _j[SHOULD_AUTOBATCH] = true, _j;
            },
            condition: function (queryThunkArgs, _j) {
                var getState = _j.getState;
                var _a, _b, _c;
                var state = getState();
                var requestState = (_b = (_a = state[reducerPath]) == null ? void 0 : _a.queries) == null ? void 0 : _b[queryThunkArgs.queryCacheKey];
                var fulfilledVal = requestState == null ? void 0 : requestState.fulfilledTimeStamp;
                var currentArg = queryThunkArgs.originalArgs;
                var previousArg = requestState == null ? void 0 : requestState.originalArgs;
                var endpointDefinition = endpointDefinitions[queryThunkArgs.endpointName];
                if (isUpsertQuery(queryThunkArgs)) {
                    return true;
                }
                if ((requestState == null ? void 0 : requestState.status) === "pending") {
                    return false;
                }
                if (isForcedQuery(queryThunkArgs, state)) {
                    return true;
                }
                if (isQueryDefinition(endpointDefinition) && ((_c = endpointDefinition == null ? void 0 : endpointDefinition.forceRefetch) == null ? void 0 : _c.call(endpointDefinition, {
                    currentArg: currentArg,
                    previousArg: previousArg,
                    endpointState: requestState,
                    state: state
                }))) {
                    return true;
                }
                if (fulfilledVal) {
                    return false;
                }
                return true;
            },
            dispatchConditionRejection: true
        });
        var mutationThunk = createAsyncThunk(reducerPath + "/executeMutation", executeEndpoint, {
            getPendingMeta: function () {
                var _j;
                return _j = { startedTimeStamp: Date.now() }, _j[SHOULD_AUTOBATCH] = true, _j;
            }
        });
        var hasTheForce = function (options) { return "force" in options; };
        var hasMaxAge = function (options) { return "ifOlderThan" in options; };
        var prefetch = function (endpointName, arg, options) { return function (dispatch, getState) {
            var force = hasTheForce(options) && options.force;
            var maxAge = hasMaxAge(options) && options.ifOlderThan;
            var queryAction = function (force2) {
                if (force2 === void 0) { force2 = true; }
                return api.endpoints[endpointName].initiate(arg, { forceRefetch: force2 });
            };
            var latestStateValue = api.endpoints[endpointName].select(arg)(getState());
            if (force) {
                dispatch(queryAction());
            }
            else if (maxAge) {
                var lastFulfilledTs = latestStateValue == null ? void 0 : latestStateValue.fulfilledTimeStamp;
                if (!lastFulfilledTs) {
                    dispatch(queryAction());
                    return;
                }
                var shouldRetrigger = (Number(new Date()) - Number(new Date(lastFulfilledTs))) / 1e3 >= maxAge;
                if (shouldRetrigger) {
                    dispatch(queryAction());
                }
            }
            else {
                dispatch(queryAction(false));
            }
        }; };
        function matchesEndpoint(endpointName) {
            return function (action) {
                var _a, _b;
                return ((_b = (_a = action == null ? void 0 : action.meta) == null ? void 0 : _a.arg) == null ? void 0 : _b.endpointName) === endpointName;
            };
        }
        function buildMatchThunkActions(thunk, endpointName) {
            return {
                matchPending: isAllOf(isPending(thunk), matchesEndpoint(endpointName)),
                matchFulfilled: isAllOf(isFulfilled(thunk), matchesEndpoint(endpointName)),
                matchRejected: isAllOf(isRejected(thunk), matchesEndpoint(endpointName))
            };
        }
        return {
            queryThunk: queryThunk,
            mutationThunk: mutationThunk,
            prefetch: prefetch,
            updateQueryData: updateQueryData,
            upsertQueryData: upsertQueryData,
            patchQueryData: patchQueryData,
            buildMatchThunkActions: buildMatchThunkActions
        };
    }
    function calculateProvidedByThunk(action, type, endpointDefinitions, assertTagType) {
        return calculateProvidedBy(endpointDefinitions[action.meta.arg.endpointName][type], isFulfilled(action) ? action.payload : void 0, isRejectedWithValue(action) ? action.payload : void 0, action.meta.arg.originalArgs, "baseQueryMeta" in action.meta ? action.meta.baseQueryMeta : void 0, assertTagType);
    }
    // src/query/core/buildSlice.ts
    function updateQuerySubstateIfExists(state, queryCacheKey, update) {
        var substate = state[queryCacheKey];
        if (substate) {
            update(substate);
        }
    }
    function getMutationCacheKey(id) {
        var _a;
        return (_a = "arg" in id ? id.arg.fixedCacheKey : id.fixedCacheKey) != null ? _a : id.requestId;
    }
    function updateMutationSubstateIfExists(state, id, update) {
        var substate = state[getMutationCacheKey(id)];
        if (substate) {
            update(substate);
        }
    }
    var initialState = {};
    function buildSlice(_j) {
        var reducerPath = _j.reducerPath, queryThunk = _j.queryThunk, mutationThunk = _j.mutationThunk, _k = _j.context, definitions = _k.endpointDefinitions, apiUid = _k.apiUid, extractRehydrationInfo = _k.extractRehydrationInfo, hasRehydrationInfo = _k.hasRehydrationInfo, assertTagType = _j.assertTagType, config = _j.config;
        var resetApiState = createAction(reducerPath + "/resetApiState");
        var querySlice = createSlice({
            name: reducerPath + "/queries",
            initialState: initialState,
            reducers: {
                removeQueryResult: {
                    reducer: function (draft, _j) {
                        var queryCacheKey = _j.payload.queryCacheKey;
                        delete draft[queryCacheKey];
                    },
                    prepare: prepareAutoBatched()
                },
                queryResultPatched: {
                    reducer: function (draft, _j) {
                        var _k = _j.payload, queryCacheKey = _k.queryCacheKey, patches = _k.patches;
                        updateQuerySubstateIfExists(draft, queryCacheKey, function (substate) {
                            substate.data = pn(substate.data, patches.concat());
                        });
                    },
                    prepare: prepareAutoBatched()
                }
            },
            extraReducers: function (builder) {
                builder.addCase(queryThunk.pending, function (draft, _j) {
                    var meta = _j.meta, arg = _j.meta.arg;
                    var _a, _b;
                    var upserting = isUpsertQuery(arg);
                    if (arg.subscribe || upserting) {
                        (_b = draft[_a = arg.queryCacheKey]) != null ? _b : draft[_a] = {
                            status: exports.QueryStatus.uninitialized,
                            endpointName: arg.endpointName
                        };
                    }
                    updateQuerySubstateIfExists(draft, arg.queryCacheKey, function (substate) {
                        substate.status = exports.QueryStatus.pending;
                        substate.requestId = upserting && substate.requestId ? substate.requestId : meta.requestId;
                        if (arg.originalArgs !== void 0) {
                            substate.originalArgs = arg.originalArgs;
                        }
                        substate.startedTimeStamp = meta.startedTimeStamp;
                    });
                }).addCase(queryThunk.fulfilled, function (draft, _j) {
                    var meta = _j.meta, payload = _j.payload;
                    updateQuerySubstateIfExists(draft, meta.arg.queryCacheKey, function (substate) {
                        var _a;
                        if (substate.requestId !== meta.requestId && !isUpsertQuery(meta.arg))
                            return;
                        var merge = definitions[meta.arg.endpointName].merge;
                        substate.status = exports.QueryStatus.fulfilled;
                        if (merge) {
                            if (substate.data !== void 0) {
                                var fulfilledTimeStamp_1 = meta.fulfilledTimeStamp, arg_1 = meta.arg, baseQueryMeta_1 = meta.baseQueryMeta, requestId_1 = meta.requestId;
                                var newData = immer_esm_default(substate.data, function (draftSubstateData) {
                                    return merge(draftSubstateData, payload, {
                                        arg: arg_1.originalArgs,
                                        baseQueryMeta: baseQueryMeta_1,
                                        fulfilledTimeStamp: fulfilledTimeStamp_1,
                                        requestId: requestId_1
                                    });
                                });
                                substate.data = newData;
                            }
                            else {
                                substate.data = payload;
                            }
                        }
                        else {
                            substate.data = ((_a = definitions[meta.arg.endpointName].structuralSharing) != null ? _a : true) ? copyWithStructuralSharing(r(substate.data) ? e(substate.data) : substate.data, payload) : payload;
                        }
                        delete substate.error;
                        substate.fulfilledTimeStamp = meta.fulfilledTimeStamp;
                    });
                }).addCase(queryThunk.rejected, function (draft, _j) {
                    var _k = _j.meta, condition = _k.condition, arg = _k.arg, requestId = _k.requestId, error = _j.error, payload = _j.payload;
                    updateQuerySubstateIfExists(draft, arg.queryCacheKey, function (substate) {
                        if (condition) ;
                        else {
                            if (substate.requestId !== requestId)
                                return;
                            substate.status = exports.QueryStatus.rejected;
                            substate.error = payload != null ? payload : error;
                        }
                    });
                }).addMatcher(hasRehydrationInfo, function (draft, action) {
                    var queries = extractRehydrationInfo(action).queries;
                    for (var _j = 0, _k = Object.entries(queries); _j < _k.length; _j++) {
                        var _l = _k[_j], key = _l[0], entry = _l[1];
                        if ((entry == null ? void 0 : entry.status) === exports.QueryStatus.fulfilled || (entry == null ? void 0 : entry.status) === exports.QueryStatus.rejected) {
                            draft[key] = entry;
                        }
                    }
                });
            }
        });
        var mutationSlice = createSlice({
            name: reducerPath + "/mutations",
            initialState: initialState,
            reducers: {
                removeMutationResult: {
                    reducer: function (draft, _j) {
                        var payload = _j.payload;
                        var cacheKey = getMutationCacheKey(payload);
                        if (cacheKey in draft) {
                            delete draft[cacheKey];
                        }
                    },
                    prepare: prepareAutoBatched()
                }
            },
            extraReducers: function (builder) {
                builder.addCase(mutationThunk.pending, function (draft, _j) {
                    var meta = _j.meta, _k = _j.meta, requestId = _k.requestId, arg = _k.arg, startedTimeStamp = _k.startedTimeStamp;
                    if (!arg.track)
                        return;
                    draft[getMutationCacheKey(meta)] = {
                        requestId: requestId,
                        status: exports.QueryStatus.pending,
                        endpointName: arg.endpointName,
                        startedTimeStamp: startedTimeStamp
                    };
                }).addCase(mutationThunk.fulfilled, function (draft, _j) {
                    var payload = _j.payload, meta = _j.meta;
                    if (!meta.arg.track)
                        return;
                    updateMutationSubstateIfExists(draft, meta, function (substate) {
                        if (substate.requestId !== meta.requestId)
                            return;
                        substate.status = exports.QueryStatus.fulfilled;
                        substate.data = payload;
                        substate.fulfilledTimeStamp = meta.fulfilledTimeStamp;
                    });
                }).addCase(mutationThunk.rejected, function (draft, _j) {
                    var payload = _j.payload, error = _j.error, meta = _j.meta;
                    if (!meta.arg.track)
                        return;
                    updateMutationSubstateIfExists(draft, meta, function (substate) {
                        if (substate.requestId !== meta.requestId)
                            return;
                        substate.status = exports.QueryStatus.rejected;
                        substate.error = payload != null ? payload : error;
                    });
                }).addMatcher(hasRehydrationInfo, function (draft, action) {
                    var mutations = extractRehydrationInfo(action).mutations;
                    for (var _j = 0, _k = Object.entries(mutations); _j < _k.length; _j++) {
                        var _l = _k[_j], key = _l[0], entry = _l[1];
                        if (((entry == null ? void 0 : entry.status) === exports.QueryStatus.fulfilled || (entry == null ? void 0 : entry.status) === exports.QueryStatus.rejected) && key !== (entry == null ? void 0 : entry.requestId)) {
                            draft[key] = entry;
                        }
                    }
                });
            }
        });
        var invalidationSlice = createSlice({
            name: reducerPath + "/invalidation",
            initialState: initialState,
            reducers: {
                updateProvidedBy: {
                    reducer: function (draft, action) {
                        var _a, _b, _c, _d;
                        var _j = action.payload, queryCacheKey = _j.queryCacheKey, providedTags = _j.providedTags;
                        for (var _k = 0, _l = Object.values(draft); _k < _l.length; _k++) {
                            var tagTypeSubscriptions = _l[_k];
                            for (var _m = 0, _o = Object.values(tagTypeSubscriptions); _m < _o.length; _m++) {
                                var idSubscriptions = _o[_m];
                                var foundAt = idSubscriptions.indexOf(queryCacheKey);
                                if (foundAt !== -1) {
                                    idSubscriptions.splice(foundAt, 1);
                                }
                            }
                        }
                        for (var _p = 0, providedTags_1 = providedTags; _p < providedTags_1.length; _p++) {
                            var _q = providedTags_1[_p], type = _q.type, id = _q.id;
                            var subscribedQueries = (_d = (_b = (_a = draft[type]) != null ? _a : draft[type] = {})[_c = id || "__internal_without_id"]) != null ? _d : _b[_c] = [];
                            var alreadySubscribed = subscribedQueries.includes(queryCacheKey);
                            if (!alreadySubscribed) {
                                subscribedQueries.push(queryCacheKey);
                            }
                        }
                    },
                    prepare: prepareAutoBatched()
                }
            },
            extraReducers: function (builder) {
                builder.addCase(querySlice.actions.removeQueryResult, function (draft, _j) {
                    var queryCacheKey = _j.payload.queryCacheKey;
                    for (var _k = 0, _l = Object.values(draft); _k < _l.length; _k++) {
                        var tagTypeSubscriptions = _l[_k];
                        for (var _m = 0, _o = Object.values(tagTypeSubscriptions); _m < _o.length; _m++) {
                            var idSubscriptions = _o[_m];
                            var foundAt = idSubscriptions.indexOf(queryCacheKey);
                            if (foundAt !== -1) {
                                idSubscriptions.splice(foundAt, 1);
                            }
                        }
                    }
                }).addMatcher(hasRehydrationInfo, function (draft, action) {
                    var _a, _b, _c, _d;
                    var provided = extractRehydrationInfo(action).provided;
                    for (var _j = 0, _k = Object.entries(provided); _j < _k.length; _j++) {
                        var _l = _k[_j], type = _l[0], incomingTags = _l[1];
                        for (var _m = 0, _o = Object.entries(incomingTags); _m < _o.length; _m++) {
                            var _p = _o[_m], id = _p[0], cacheKeys = _p[1];
                            var subscribedQueries = (_d = (_b = (_a = draft[type]) != null ? _a : draft[type] = {})[_c = id || "__internal_without_id"]) != null ? _d : _b[_c] = [];
                            for (var _q = 0, cacheKeys_1 = cacheKeys; _q < cacheKeys_1.length; _q++) {
                                var queryCacheKey = cacheKeys_1[_q];
                                var alreadySubscribed = subscribedQueries.includes(queryCacheKey);
                                if (!alreadySubscribed) {
                                    subscribedQueries.push(queryCacheKey);
                                }
                            }
                        }
                    }
                }).addMatcher(isAnyOf(isFulfilled(queryThunk), isRejectedWithValue(queryThunk)), function (draft, action) {
                    var providedTags = calculateProvidedByThunk(action, "providesTags", definitions, assertTagType);
                    var queryCacheKey = action.meta.arg.queryCacheKey;
                    invalidationSlice.caseReducers.updateProvidedBy(draft, invalidationSlice.actions.updateProvidedBy({
                        queryCacheKey: queryCacheKey,
                        providedTags: providedTags
                    }));
                });
            }
        });
        var subscriptionSlice = createSlice({
            name: reducerPath + "/subscriptions",
            initialState: initialState,
            reducers: {
                updateSubscriptionOptions: function (d2, a2) {
                },
                unsubscribeQueryResult: function (d2, a2) {
                },
                internal_probeSubscription: function (d2, a2) {
                }
            }
        });
        var internalSubscriptionsSlice = createSlice({
            name: reducerPath + "/internalSubscriptions",
            initialState: initialState,
            reducers: {
                subscriptionsUpdated: {
                    reducer: function (state, action) {
                        return pn(state, action.payload);
                    },
                    prepare: prepareAutoBatched()
                }
            }
        });
        var configSlice = createSlice({
            name: reducerPath + "/config",
            initialState: __spreadValues({
                online: isOnline(),
                focused: isDocumentVisible(),
                middlewareRegistered: false
            }, config),
            reducers: {
                middlewareRegistered: function (state, _j) {
                    var payload = _j.payload;
                    state.middlewareRegistered = state.middlewareRegistered === "conflict" || apiUid !== payload ? "conflict" : true;
                }
            },
            extraReducers: function (builder) {
                builder.addCase(onOnline, function (state) {
                    state.online = true;
                }).addCase(onOffline, function (state) {
                    state.online = false;
                }).addCase(onFocus, function (state) {
                    state.focused = true;
                }).addCase(onFocusLost, function (state) {
                    state.focused = false;
                }).addMatcher(hasRehydrationInfo, function (draft) { return __spreadValues({}, draft); });
            }
        });
        var combinedReducer = combineReducers({
            queries: querySlice.reducer,
            mutations: mutationSlice.reducer,
            provided: invalidationSlice.reducer,
            subscriptions: internalSubscriptionsSlice.reducer,
            config: configSlice.reducer
        });
        var reducer = function (state, action) { return combinedReducer(resetApiState.match(action) ? void 0 : state, action); };
        var actions = __spreadProps(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({}, configSlice.actions), querySlice.actions), subscriptionSlice.actions), internalSubscriptionsSlice.actions), mutationSlice.actions), invalidationSlice.actions), {
            unsubscribeMutationResult: mutationSlice.actions.removeMutationResult,
            resetApiState: resetApiState
        });
        return { reducer: reducer, actions: actions };
    }
    // src/query/core/buildSelectors.ts
    var skipToken = /* @__PURE__ */ Symbol.for("RTKQ/skipToken");
    var skipSelector = skipToken;
    var initialSubState = {
        status: exports.QueryStatus.uninitialized
    };
    var defaultQuerySubState = /* @__PURE__ */ immer_esm_default(initialSubState, function () {
    });
    var defaultMutationSubState = /* @__PURE__ */ immer_esm_default(initialSubState, function () {
    });
    function buildSelectors(_j) {
        var serializeQueryArgs = _j.serializeQueryArgs, reducerPath = _j.reducerPath;
        var selectSkippedQuery = function (state) { return defaultQuerySubState; };
        var selectSkippedMutation = function (state) { return defaultMutationSubState; };
        return { buildQuerySelector: buildQuerySelector, buildMutationSelector: buildMutationSelector, selectInvalidatedBy: selectInvalidatedBy };
        function withRequestFlags(substate) {
            return __spreadValues(__spreadValues({}, substate), getRequestStatusFlags(substate.status));
        }
        function selectInternalState(rootState) {
            var state = rootState[reducerPath];
            {
                if (!state) {
                    if (selectInternalState.triggered)
                        return state;
                    selectInternalState.triggered = true;
                    console.error("Error: No data found at `state." + reducerPath + "`. Did you forget to add the reducer to the store?");
                }
            }
            return state;
        }
        function buildQuerySelector(endpointName, endpointDefinition) {
            return function (queryArgs) {
                var serializedArgs = serializeQueryArgs({
                    queryArgs: queryArgs,
                    endpointDefinition: endpointDefinition,
                    endpointName: endpointName
                });
                var selectQuerySubstate = function (state) {
                    var _a, _b, _c;
                    return (_c = (_b = (_a = selectInternalState(state)) == null ? void 0 : _a.queries) == null ? void 0 : _b[serializedArgs]) != null ? _c : defaultQuerySubState;
                };
                var finalSelectQuerySubState = queryArgs === skipToken ? selectSkippedQuery : selectQuerySubstate;
                return createSelector(finalSelectQuerySubState, withRequestFlags);
            };
        }
        function buildMutationSelector() {
            return function (id) {
                var _a;
                var mutationId;
                if (typeof id === "object") {
                    mutationId = (_a = getMutationCacheKey(id)) != null ? _a : skipToken;
                }
                else {
                    mutationId = id;
                }
                var selectMutationSubstate = function (state) {
                    var _a2, _b, _c;
                    return (_c = (_b = (_a2 = selectInternalState(state)) == null ? void 0 : _a2.mutations) == null ? void 0 : _b[mutationId]) != null ? _c : defaultMutationSubState;
                };
                var finalSelectMutationSubstate = mutationId === skipToken ? selectSkippedMutation : selectMutationSubstate;
                return createSelector(finalSelectMutationSubstate, withRequestFlags);
            };
        }
        function selectInvalidatedBy(state, tags) {
            var _a;
            var apiState = state[reducerPath];
            var toInvalidate = new Set();
            for (var _j = 0, _k = tags.map(expandTagDescription); _j < _k.length; _j++) {
                var tag = _k[_j];
                var provided = apiState.provided[tag.type];
                if (!provided) {
                    continue;
                }
                var invalidateSubscriptions = (_a = tag.id !== void 0 ? provided[tag.id] : flatten(Object.values(provided))) != null ? _a : [];
                for (var _l = 0, invalidateSubscriptions_1 = invalidateSubscriptions; _l < invalidateSubscriptions_1.length; _l++) {
                    var invalidate = invalidateSubscriptions_1[_l];
                    toInvalidate.add(invalidate);
                }
            }
            return flatten(Array.from(toInvalidate.values()).map(function (queryCacheKey) {
                var querySubState = apiState.queries[queryCacheKey];
                return querySubState ? [
                    {
                        queryCacheKey: queryCacheKey,
                        endpointName: querySubState.endpointName,
                        originalArgs: querySubState.originalArgs
                    }
                ] : [];
            }));
        }
    }
    // src/query/defaultSerializeQueryArgs.ts
    var cache = WeakMap ? new WeakMap() : void 0;
    var defaultSerializeQueryArgs = function (_j) {
        var endpointName = _j.endpointName, queryArgs = _j.queryArgs;
        var serialized = "";
        var cached = cache == null ? void 0 : cache.get(queryArgs);
        if (typeof cached === "string") {
            serialized = cached;
        }
        else {
            var stringified = JSON.stringify(queryArgs, function (key, value) { return isPlainObject2(value) ? Object.keys(value).sort().reduce(function (acc, key2) {
                acc[key2] = value[key2];
                return acc;
            }, {}) : value; });
            if (isPlainObject2(queryArgs)) {
                cache == null ? void 0 : cache.set(queryArgs, stringified);
            }
            serialized = stringified;
        }
        return endpointName + "(" + serialized + ")";
    };
    // src/query/createApi.ts
    function buildCreateApi() {
        var modules = [];
        for (var _j = 0; _j < arguments.length; _j++) {
            modules[_j] = arguments[_j];
        }
        return function baseCreateApi(options) {
            var extractRehydrationInfo = defaultMemoize(function (action) {
                var _a, _b;
                return (_b = options.extractRehydrationInfo) == null ? void 0 : _b.call(options, action, {
                    reducerPath: (_a = options.reducerPath) != null ? _a : "api"
                });
            });
            var optionsWithDefaults = __spreadProps(__spreadValues({
                reducerPath: "api",
                keepUnusedDataFor: 60,
                refetchOnMountOrArgChange: false,
                refetchOnFocus: false,
                refetchOnReconnect: false
            }, options), {
                extractRehydrationInfo: extractRehydrationInfo,
                serializeQueryArgs: function (queryArgsApi) {
                    var finalSerializeQueryArgs = defaultSerializeQueryArgs;
                    if ("serializeQueryArgs" in queryArgsApi.endpointDefinition) {
                        var endpointSQA_1 = queryArgsApi.endpointDefinition.serializeQueryArgs;
                        finalSerializeQueryArgs = function (queryArgsApi2) {
                            var initialResult = endpointSQA_1(queryArgsApi2);
                            if (typeof initialResult === "string") {
                                return initialResult;
                            }
                            else {
                                return defaultSerializeQueryArgs(__spreadProps(__spreadValues({}, queryArgsApi2), {
                                    queryArgs: initialResult
                                }));
                            }
                        };
                    }
                    else if (options.serializeQueryArgs) {
                        finalSerializeQueryArgs = options.serializeQueryArgs;
                    }
                    return finalSerializeQueryArgs(queryArgsApi);
                },
                tagTypes: __spreadArray([], options.tagTypes || [])
            });
            var context = {
                endpointDefinitions: {},
                batch: function (fn2) {
                    fn2();
                },
                apiUid: nanoid(),
                extractRehydrationInfo: extractRehydrationInfo,
                hasRehydrationInfo: defaultMemoize(function (action) { return extractRehydrationInfo(action) != null; })
            };
            var api = {
                injectEndpoints: injectEndpoints,
                enhanceEndpoints: function (_j) {
                    var addTagTypes = _j.addTagTypes, endpoints = _j.endpoints;
                    if (addTagTypes) {
                        for (var _k = 0, addTagTypes_1 = addTagTypes; _k < addTagTypes_1.length; _k++) {
                            var eT = addTagTypes_1[_k];
                            if (!optionsWithDefaults.tagTypes.includes(eT)) {
                                optionsWithDefaults.tagTypes.push(eT);
                            }
                        }
                    }
                    if (endpoints) {
                        for (var _l = 0, _m = Object.entries(endpoints); _l < _m.length; _l++) {
                            var _o = _m[_l], endpointName = _o[0], partialDefinition = _o[1];
                            if (typeof partialDefinition === "function") {
                                partialDefinition(context.endpointDefinitions[endpointName]);
                            }
                            else {
                                Object.assign(context.endpointDefinitions[endpointName] || {}, partialDefinition);
                            }
                        }
                    }
                    return api;
                }
            };
            var initializedModules = modules.map(function (m2) { return m2.init(api, optionsWithDefaults, context); });
            function injectEndpoints(inject) {
                var evaluatedEndpoints = inject.endpoints({
                    query: function (x2) { return __spreadProps(__spreadValues({}, x2), { type: DefinitionType.query }); },
                    mutation: function (x2) { return __spreadProps(__spreadValues({}, x2), { type: DefinitionType.mutation }); }
                });
                for (var _j = 0, _k = Object.entries(evaluatedEndpoints); _j < _k.length; _j++) {
                    var _l = _k[_j], endpointName = _l[0], definition = _l[1];
                    if (!inject.overrideExisting && endpointName in context.endpointDefinitions) {
                        if (typeof process !== "undefined" && true) {
                            console.error("called `injectEndpoints` to override already-existing endpointName " + endpointName + " without specifying `overrideExisting: true`");
                        }
                        continue;
                    }
                    context.endpointDefinitions[endpointName] = definition;
                    for (var _m = 0, initializedModules_1 = initializedModules; _m < initializedModules_1.length; _m++) {
                        var m2 = initializedModules_1[_m];
                        m2.injectEndpoint(endpointName, definition);
                    }
                }
                return api;
            }
            return api.injectEndpoints({ endpoints: options.endpoints });
        };
    }
    // src/query/fakeBaseQuery.ts
    function fakeBaseQuery() {
        return function () {
            throw new Error("When using `fakeBaseQuery`, all queries & mutations must use the `queryFn` definition syntax.");
        };
    }
    // src/query/core/buildMiddleware/cacheCollection.ts
    function isObjectEmpty(obj) {
        for (var k2 in obj) {
            return false;
        }
        return true;
    }
    var THIRTY_TWO_BIT_MAX_TIMER_SECONDS = 2147483647 / 1e3 - 1;
    var buildCacheCollectionHandler = function (_j) {
        var reducerPath = _j.reducerPath, api = _j.api, context = _j.context, internalState = _j.internalState;
        var _k = api.internalActions, removeQueryResult = _k.removeQueryResult, unsubscribeQueryResult = _k.unsubscribeQueryResult;
        function anySubscriptionsRemainingForKey(queryCacheKey) {
            var subscriptions = internalState.currentSubscriptions[queryCacheKey];
            return !!subscriptions && !isObjectEmpty(subscriptions);
        }
        var currentRemovalTimeouts = {};
        var handler = function (action, mwApi, internalState2) {
            var _a;
            if (unsubscribeQueryResult.match(action)) {
                var state = mwApi.getState()[reducerPath];
                var queryCacheKey = action.payload.queryCacheKey;
                handleUnsubscribe(queryCacheKey, (_a = state.queries[queryCacheKey]) == null ? void 0 : _a.endpointName, mwApi, state.config);
            }
            if (api.util.resetApiState.match(action)) {
                for (var _j = 0, _k = Object.entries(currentRemovalTimeouts); _j < _k.length; _j++) {
                    var _l = _k[_j], key = _l[0], timeout = _l[1];
                    if (timeout)
                        clearTimeout(timeout);
                    delete currentRemovalTimeouts[key];
                }
            }
            if (context.hasRehydrationInfo(action)) {
                var state = mwApi.getState()[reducerPath];
                var queries = context.extractRehydrationInfo(action).queries;
                for (var _m = 0, _o = Object.entries(queries); _m < _o.length; _m++) {
                    var _p = _o[_m], queryCacheKey = _p[0], queryState = _p[1];
                    handleUnsubscribe(queryCacheKey, queryState == null ? void 0 : queryState.endpointName, mwApi, state.config);
                }
            }
        };
        function handleUnsubscribe(queryCacheKey, endpointName, api2, config) {
            var _a;
            var endpointDefinition = context.endpointDefinitions[endpointName];
            var keepUnusedDataFor = (_a = endpointDefinition == null ? void 0 : endpointDefinition.keepUnusedDataFor) != null ? _a : config.keepUnusedDataFor;
            if (keepUnusedDataFor === Infinity) {
                return;
            }
            var finalKeepUnusedDataFor = Math.max(0, Math.min(keepUnusedDataFor, THIRTY_TWO_BIT_MAX_TIMER_SECONDS));
            if (!anySubscriptionsRemainingForKey(queryCacheKey)) {
                var currentTimeout = currentRemovalTimeouts[queryCacheKey];
                if (currentTimeout) {
                    clearTimeout(currentTimeout);
                }
                currentRemovalTimeouts[queryCacheKey] = setTimeout(function () {
                    if (!anySubscriptionsRemainingForKey(queryCacheKey)) {
                        api2.dispatch(removeQueryResult({ queryCacheKey: queryCacheKey }));
                    }
                    delete currentRemovalTimeouts[queryCacheKey];
                }, finalKeepUnusedDataFor * 1e3);
            }
        }
        return handler;
    };
    // src/query/core/buildMiddleware/invalidationByTags.ts
    var buildInvalidationByTagsHandler = function (_j) {
        var reducerPath = _j.reducerPath, context = _j.context, endpointDefinitions = _j.context.endpointDefinitions, mutationThunk = _j.mutationThunk, api = _j.api, assertTagType = _j.assertTagType, refetchQuery = _j.refetchQuery;
        var removeQueryResult = api.internalActions.removeQueryResult;
        var isThunkActionWithTags = isAnyOf(isFulfilled(mutationThunk), isRejectedWithValue(mutationThunk));
        var handler = function (action, mwApi) {
            if (isThunkActionWithTags(action)) {
                invalidateTags(calculateProvidedByThunk(action, "invalidatesTags", endpointDefinitions, assertTagType), mwApi);
            }
            if (api.util.invalidateTags.match(action)) {
                invalidateTags(calculateProvidedBy(action.payload, void 0, void 0, void 0, void 0, assertTagType), mwApi);
            }
        };
        function invalidateTags(tags, mwApi) {
            var rootState = mwApi.getState();
            var state = rootState[reducerPath];
            var toInvalidate = api.util.selectInvalidatedBy(rootState, tags);
            context.batch(function () {
                var _a;
                var valuesArray = Array.from(toInvalidate.values());
                for (var _j = 0, valuesArray_1 = valuesArray; _j < valuesArray_1.length; _j++) {
                    var queryCacheKey = valuesArray_1[_j].queryCacheKey;
                    var querySubState = state.queries[queryCacheKey];
                    var subscriptionSubState = (_a = state.subscriptions[queryCacheKey]) != null ? _a : {};
                    if (querySubState) {
                        if (Object.keys(subscriptionSubState).length === 0) {
                            mwApi.dispatch(removeQueryResult({
                                queryCacheKey: queryCacheKey
                            }));
                        }
                        else if (querySubState.status !== exports.QueryStatus.uninitialized) {
                            mwApi.dispatch(refetchQuery(querySubState, queryCacheKey));
                        }
                    }
                }
            });
        }
        return handler;
    };
    // src/query/core/buildMiddleware/polling.ts
    var buildPollingHandler = function (_j) {
        var reducerPath = _j.reducerPath, queryThunk = _j.queryThunk, api = _j.api, refetchQuery = _j.refetchQuery, internalState = _j.internalState;
        var currentPolls = {};
        var handler = function (action, mwApi) {
            if (api.internalActions.updateSubscriptionOptions.match(action) || api.internalActions.unsubscribeQueryResult.match(action)) {
                updatePollingInterval(action.payload, mwApi);
            }
            if (queryThunk.pending.match(action) || queryThunk.rejected.match(action) && action.meta.condition) {
                updatePollingInterval(action.meta.arg, mwApi);
            }
            if (queryThunk.fulfilled.match(action) || queryThunk.rejected.match(action) && !action.meta.condition) {
                startNextPoll(action.meta.arg, mwApi);
            }
            if (api.util.resetApiState.match(action)) {
                clearPolls();
            }
        };
        function startNextPoll(_j, api2) {
            var queryCacheKey = _j.queryCacheKey;
            var state = api2.getState()[reducerPath];
            var querySubState = state.queries[queryCacheKey];
            var subscriptions = internalState.currentSubscriptions[queryCacheKey];
            if (!querySubState || querySubState.status === exports.QueryStatus.uninitialized)
                return;
            var lowestPollingInterval = findLowestPollingInterval(subscriptions);
            if (!Number.isFinite(lowestPollingInterval))
                return;
            var currentPoll = currentPolls[queryCacheKey];
            if (currentPoll == null ? void 0 : currentPoll.timeout) {
                clearTimeout(currentPoll.timeout);
                currentPoll.timeout = void 0;
            }
            var nextPollTimestamp = Date.now() + lowestPollingInterval;
            var currentInterval = currentPolls[queryCacheKey] = {
                nextPollTimestamp: nextPollTimestamp,
                pollingInterval: lowestPollingInterval,
                timeout: setTimeout(function () {
                    currentInterval.timeout = void 0;
                    api2.dispatch(refetchQuery(querySubState, queryCacheKey));
                }, lowestPollingInterval)
            };
        }
        function updatePollingInterval(_j, api2) {
            var queryCacheKey = _j.queryCacheKey;
            var state = api2.getState()[reducerPath];
            var querySubState = state.queries[queryCacheKey];
            var subscriptions = internalState.currentSubscriptions[queryCacheKey];
            if (!querySubState || querySubState.status === exports.QueryStatus.uninitialized) {
                return;
            }
            var lowestPollingInterval = findLowestPollingInterval(subscriptions);
            if (!Number.isFinite(lowestPollingInterval)) {
                cleanupPollForKey(queryCacheKey);
                return;
            }
            var currentPoll = currentPolls[queryCacheKey];
            var nextPollTimestamp = Date.now() + lowestPollingInterval;
            if (!currentPoll || nextPollTimestamp < currentPoll.nextPollTimestamp) {
                startNextPoll({ queryCacheKey: queryCacheKey }, api2);
            }
        }
        function cleanupPollForKey(key) {
            var existingPoll = currentPolls[key];
            if (existingPoll == null ? void 0 : existingPoll.timeout) {
                clearTimeout(existingPoll.timeout);
            }
            delete currentPolls[key];
        }
        function clearPolls() {
            for (var _j = 0, _k = Object.keys(currentPolls); _j < _k.length; _j++) {
                var key = _k[_j];
                cleanupPollForKey(key);
            }
        }
        function findLowestPollingInterval(subscribers) {
            if (subscribers === void 0) { subscribers = {}; }
            var lowestPollingInterval = Number.POSITIVE_INFINITY;
            for (var key in subscribers) {
                if (!!subscribers[key].pollingInterval) {
                    lowestPollingInterval = Math.min(subscribers[key].pollingInterval, lowestPollingInterval);
                }
            }
            return lowestPollingInterval;
        }
        return handler;
    };
    // src/query/core/buildMiddleware/windowEventHandling.ts
    var buildWindowEventHandler = function (_j) {
        var reducerPath = _j.reducerPath, context = _j.context, api = _j.api, refetchQuery = _j.refetchQuery, internalState = _j.internalState;
        var removeQueryResult = api.internalActions.removeQueryResult;
        var handler = function (action, mwApi) {
            if (onFocus.match(action)) {
                refetchValidQueries(mwApi, "refetchOnFocus");
            }
            if (onOnline.match(action)) {
                refetchValidQueries(mwApi, "refetchOnReconnect");
            }
        };
        function refetchValidQueries(api2, type) {
            var state = api2.getState()[reducerPath];
            var queries = state.queries;
            var subscriptions = internalState.currentSubscriptions;
            context.batch(function () {
                for (var _j = 0, _k = Object.keys(subscriptions); _j < _k.length; _j++) {
                    var queryCacheKey = _k[_j];
                    var querySubState = queries[queryCacheKey];
                    var subscriptionSubState = subscriptions[queryCacheKey];
                    if (!subscriptionSubState || !querySubState)
                        continue;
                    var shouldRefetch = Object.values(subscriptionSubState).some(function (sub) { return sub[type] === true; }) || Object.values(subscriptionSubState).every(function (sub) { return sub[type] === void 0; }) && state.config[type];
                    if (shouldRefetch) {
                        if (Object.keys(subscriptionSubState).length === 0) {
                            api2.dispatch(removeQueryResult({
                                queryCacheKey: queryCacheKey
                            }));
                        }
                        else if (querySubState.status !== exports.QueryStatus.uninitialized) {
                            api2.dispatch(refetchQuery(querySubState, queryCacheKey));
                        }
                    }
                }
            });
        }
        return handler;
    };
    // src/query/core/buildMiddleware/cacheLifecycle.ts
    var neverResolvedError = new Error("Promise never resolved before cacheEntryRemoved.");
    var buildCacheLifecycleHandler = function (_j) {
        var api = _j.api, reducerPath = _j.reducerPath, context = _j.context, queryThunk = _j.queryThunk, mutationThunk = _j.mutationThunk; _j.internalState;
        var isQueryThunk = isAsyncThunkAction(queryThunk);
        var isMutationThunk = isAsyncThunkAction(mutationThunk);
        var isFulfilledThunk = isFulfilled(queryThunk, mutationThunk);
        var lifecycleMap = {};
        var handler = function (action, mwApi, stateBefore) {
            var cacheKey = getCacheKey(action);
            if (queryThunk.pending.match(action)) {
                var oldState = stateBefore[reducerPath].queries[cacheKey];
                var state = mwApi.getState()[reducerPath].queries[cacheKey];
                if (!oldState && state) {
                    handleNewKey(action.meta.arg.endpointName, action.meta.arg.originalArgs, cacheKey, mwApi, action.meta.requestId);
                }
            }
            else if (mutationThunk.pending.match(action)) {
                var state = mwApi.getState()[reducerPath].mutations[cacheKey];
                if (state) {
                    handleNewKey(action.meta.arg.endpointName, action.meta.arg.originalArgs, cacheKey, mwApi, action.meta.requestId);
                }
            }
            else if (isFulfilledThunk(action)) {
                var lifecycle = lifecycleMap[cacheKey];
                if (lifecycle == null ? void 0 : lifecycle.valueResolved) {
                    lifecycle.valueResolved({
                        data: action.payload,
                        meta: action.meta.baseQueryMeta
                    });
                    delete lifecycle.valueResolved;
                }
            }
            else if (api.internalActions.removeQueryResult.match(action) || api.internalActions.removeMutationResult.match(action)) {
                var lifecycle = lifecycleMap[cacheKey];
                if (lifecycle) {
                    delete lifecycleMap[cacheKey];
                    lifecycle.cacheEntryRemoved();
                }
            }
            else if (api.util.resetApiState.match(action)) {
                for (var _j = 0, _k = Object.entries(lifecycleMap); _j < _k.length; _j++) {
                    var _l = _k[_j], cacheKey2 = _l[0], lifecycle = _l[1];
                    delete lifecycleMap[cacheKey2];
                    lifecycle.cacheEntryRemoved();
                }
            }
        };
        function getCacheKey(action) {
            if (isQueryThunk(action))
                return action.meta.arg.queryCacheKey;
            if (isMutationThunk(action))
                return action.meta.requestId;
            if (api.internalActions.removeQueryResult.match(action))
                return action.payload.queryCacheKey;
            if (api.internalActions.removeMutationResult.match(action))
                return getMutationCacheKey(action.payload);
            return "";
        }
        function handleNewKey(endpointName, originalArgs, queryCacheKey, mwApi, requestId) {
            var endpointDefinition = context.endpointDefinitions[endpointName];
            var onCacheEntryAdded = endpointDefinition == null ? void 0 : endpointDefinition.onCacheEntryAdded;
            if (!onCacheEntryAdded)
                return;
            var lifecycle = {};
            var cacheEntryRemoved = new Promise(function (resolve) {
                lifecycle.cacheEntryRemoved = resolve;
            });
            var cacheDataLoaded = Promise.race([
                new Promise(function (resolve) {
                    lifecycle.valueResolved = resolve;
                }),
                cacheEntryRemoved.then(function () {
                    throw neverResolvedError;
                })
            ]);
            cacheDataLoaded.catch(function () {
            });
            lifecycleMap[queryCacheKey] = lifecycle;
            var selector = api.endpoints[endpointName].select(endpointDefinition.type === DefinitionType.query ? originalArgs : queryCacheKey);
            var extra = mwApi.dispatch(function (_2, __, extra2) { return extra2; });
            var lifecycleApi = __spreadProps(__spreadValues({}, mwApi), {
                getCacheEntry: function () { return selector(mwApi.getState()); },
                requestId: requestId,
                extra: extra,
                updateCachedData: endpointDefinition.type === DefinitionType.query ? function (updateRecipe) { return mwApi.dispatch(api.util.updateQueryData(endpointName, originalArgs, updateRecipe)); } : void 0,
                cacheDataLoaded: cacheDataLoaded,
                cacheEntryRemoved: cacheEntryRemoved
            });
            var runningHandler = onCacheEntryAdded(originalArgs, lifecycleApi);
            Promise.resolve(runningHandler).catch(function (e2) {
                if (e2 === neverResolvedError)
                    return;
                throw e2;
            });
        }
        return handler;
    };
    // src/query/core/buildMiddleware/queryLifecycle.ts
    var buildQueryLifecycleHandler = function (_j) {
        var api = _j.api, context = _j.context, queryThunk = _j.queryThunk, mutationThunk = _j.mutationThunk;
        var isPendingThunk = isPending(queryThunk, mutationThunk);
        var isRejectedThunk = isRejected(queryThunk, mutationThunk);
        var isFullfilledThunk = isFulfilled(queryThunk, mutationThunk);
        var lifecycleMap = {};
        var handler = function (action, mwApi) {
            var _a, _b, _c;
            if (isPendingThunk(action)) {
                var _j = action.meta, requestId = _j.requestId, _k = _j.arg, endpointName_1 = _k.endpointName, originalArgs_1 = _k.originalArgs;
                var endpointDefinition = context.endpointDefinitions[endpointName_1];
                var onQueryStarted = endpointDefinition == null ? void 0 : endpointDefinition.onQueryStarted;
                if (onQueryStarted) {
                    var lifecycle_1 = {};
                    var queryFulfilled = new Promise(function (resolve, reject) {
                        lifecycle_1.resolve = resolve;
                        lifecycle_1.reject = reject;
                    });
                    queryFulfilled.catch(function () {
                    });
                    lifecycleMap[requestId] = lifecycle_1;
                    var selector_1 = api.endpoints[endpointName_1].select(endpointDefinition.type === DefinitionType.query ? originalArgs_1 : requestId);
                    var extra = mwApi.dispatch(function (_2, __, extra2) { return extra2; });
                    var lifecycleApi = __spreadProps(__spreadValues({}, mwApi), {
                        getCacheEntry: function () { return selector_1(mwApi.getState()); },
                        requestId: requestId,
                        extra: extra,
                        updateCachedData: endpointDefinition.type === DefinitionType.query ? function (updateRecipe) { return mwApi.dispatch(api.util.updateQueryData(endpointName_1, originalArgs_1, updateRecipe)); } : void 0,
                        queryFulfilled: queryFulfilled
                    });
                    onQueryStarted(originalArgs_1, lifecycleApi);
                }
            }
            else if (isFullfilledThunk(action)) {
                var _l = action.meta, requestId = _l.requestId, baseQueryMeta = _l.baseQueryMeta;
                (_a = lifecycleMap[requestId]) == null ? void 0 : _a.resolve({
                    data: action.payload,
                    meta: baseQueryMeta
                });
                delete lifecycleMap[requestId];
            }
            else if (isRejectedThunk(action)) {
                var _m = action.meta, requestId = _m.requestId, rejectedWithValue = _m.rejectedWithValue, baseQueryMeta = _m.baseQueryMeta;
                (_c = lifecycleMap[requestId]) == null ? void 0 : _c.reject({
                    error: (_b = action.payload) != null ? _b : action.error,
                    isUnhandledError: !rejectedWithValue,
                    meta: baseQueryMeta
                });
                delete lifecycleMap[requestId];
            }
        };
        return handler;
    };
    // src/query/core/buildMiddleware/devMiddleware.ts
    var buildDevCheckHandler = function (_j) {
        var api = _j.api, apiUid = _j.context.apiUid, reducerPath = _j.reducerPath;
        return function (action, mwApi) {
            var _a, _b;
            if (api.util.resetApiState.match(action)) {
                mwApi.dispatch(api.internalActions.middlewareRegistered(apiUid));
            }
            if (typeof process !== "undefined" && true) {
                if (api.internalActions.middlewareRegistered.match(action) && action.payload === apiUid && ((_b = (_a = mwApi.getState()[reducerPath]) == null ? void 0 : _a.config) == null ? void 0 : _b.middlewareRegistered) === "conflict") {
                    console.warn("There is a mismatch between slice and middleware for the reducerPath \"" + reducerPath + "\".\nYou can only have one api per reducer path, this will lead to crashes in various situations!" + (reducerPath === "api" ? "\nIf you have multiple apis, you *have* to specify the reducerPath option when using createApi!" : ""));
                }
            }
        };
    };
    // src/query/core/buildMiddleware/batchActions.ts
    var promise2;
    var queueMicrotaskShim2 = typeof queueMicrotask === "function" ? queueMicrotask.bind(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : globalThis) : function (cb) { return (promise2 || (promise2 = Promise.resolve())).then(cb).catch(function (err) { return setTimeout(function () {
        throw err;
    }, 0); }); };
    var buildBatchedActionsHandler = function (_j) {
        var api = _j.api, queryThunk = _j.queryThunk, internalState = _j.internalState;
        var subscriptionsPrefix = api.reducerPath + "/subscriptions";
        var previousSubscriptions = null;
        var dispatchQueued = false;
        var _k = api.internalActions, updateSubscriptionOptions = _k.updateSubscriptionOptions, unsubscribeQueryResult = _k.unsubscribeQueryResult;
        var actuallyMutateSubscriptions = function (mutableState, action) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _i;
            if (updateSubscriptionOptions.match(action)) {
                var _j = action.payload, queryCacheKey = _j.queryCacheKey, requestId = _j.requestId, options = _j.options;
                if ((_a = mutableState == null ? void 0 : mutableState[queryCacheKey]) == null ? void 0 : _a[requestId]) {
                    mutableState[queryCacheKey][requestId] = options;
                }
                return true;
            }
            if (unsubscribeQueryResult.match(action)) {
                var _k = action.payload, queryCacheKey = _k.queryCacheKey, requestId = _k.requestId;
                if (mutableState[queryCacheKey]) {
                    delete mutableState[queryCacheKey][requestId];
                }
                return true;
            }
            if (api.internalActions.removeQueryResult.match(action)) {
                delete mutableState[action.payload.queryCacheKey];
                return true;
            }
            if (queryThunk.pending.match(action)) {
                var _l = action.meta, arg = _l.arg, requestId = _l.requestId;
                if (arg.subscribe) {
                    var substate = (_c = mutableState[_b = arg.queryCacheKey]) != null ? _c : mutableState[_b] = {};
                    substate[requestId] = (_e = (_d = arg.subscriptionOptions) != null ? _d : substate[requestId]) != null ? _e : {};
                    return true;
                }
            }
            if (queryThunk.rejected.match(action)) {
                var _m = action.meta, condition = _m.condition, arg = _m.arg, requestId = _m.requestId;
                if (condition && arg.subscribe) {
                    var substate = (_g = mutableState[_f = arg.queryCacheKey]) != null ? _g : mutableState[_f] = {};
                    substate[requestId] = (_i = (_h = arg.subscriptionOptions) != null ? _h : substate[requestId]) != null ? _i : {};
                    return true;
                }
            }
            return false;
        };
        return function (action, mwApi) {
            var _a, _b;
            if (!previousSubscriptions) {
                previousSubscriptions = JSON.parse(JSON.stringify(internalState.currentSubscriptions));
            }
            if (api.util.resetApiState.match(action)) {
                previousSubscriptions = internalState.currentSubscriptions = {};
                return [true, false];
            }
            if (api.internalActions.internal_probeSubscription.match(action)) {
                var _j = action.payload, queryCacheKey = _j.queryCacheKey, requestId = _j.requestId;
                var hasSubscription = !!((_a = internalState.currentSubscriptions[queryCacheKey]) == null ? void 0 : _a[requestId]);
                return [false, hasSubscription];
            }
            var didMutate = actuallyMutateSubscriptions(internalState.currentSubscriptions, action);
            if (didMutate) {
                if (!dispatchQueued) {
                    queueMicrotaskShim2(function () {
                        var newSubscriptions = JSON.parse(JSON.stringify(internalState.currentSubscriptions));
                        var _j = cn(previousSubscriptions, function () { return newSubscriptions; }), patches = _j[1];
                        mwApi.next(api.internalActions.subscriptionsUpdated(patches));
                        previousSubscriptions = newSubscriptions;
                        dispatchQueued = false;
                    });
                    dispatchQueued = true;
                }
                var isSubscriptionSliceAction = !!((_b = action.type) == null ? void 0 : _b.startsWith(subscriptionsPrefix));
                var isAdditionalSubscriptionAction = queryThunk.rejected.match(action) && action.meta.condition && !!action.meta.arg.subscribe;
                var actionShouldContinue = !isSubscriptionSliceAction && !isAdditionalSubscriptionAction;
                return [actionShouldContinue, false];
            }
            return [true, false];
        };
    };
    // src/query/core/buildMiddleware/index.ts
    function buildMiddleware(input) {
        var reducerPath = input.reducerPath, queryThunk = input.queryThunk, api = input.api, context = input.context;
        var apiUid = context.apiUid;
        var actions = {
            invalidateTags: createAction(reducerPath + "/invalidateTags")
        };
        var isThisApiSliceAction = function (action) {
            return !!action && typeof action.type === "string" && action.type.startsWith(reducerPath + "/");
        };
        var handlerBuilders = [
            buildDevCheckHandler,
            buildCacheCollectionHandler,
            buildInvalidationByTagsHandler,
            buildPollingHandler,
            buildCacheLifecycleHandler,
            buildQueryLifecycleHandler
        ];
        var middleware = function (mwApi) {
            var initialized2 = false;
            var internalState = {
                currentSubscriptions: {}
            };
            var builderArgs = __spreadProps(__spreadValues({}, input), {
                internalState: internalState,
                refetchQuery: refetchQuery
            });
            var handlers = handlerBuilders.map(function (build) { return build(builderArgs); });
            var batchedActionsHandler = buildBatchedActionsHandler(builderArgs);
            var windowEventsHandler = buildWindowEventHandler(builderArgs);
            return function (next) {
                return function (action) {
                    if (!initialized2) {
                        initialized2 = true;
                        mwApi.dispatch(api.internalActions.middlewareRegistered(apiUid));
                    }
                    var mwApiWithNext = __spreadProps(__spreadValues({}, mwApi), { next: next });
                    var stateBefore = mwApi.getState();
                    var _j = batchedActionsHandler(action, mwApiWithNext, stateBefore), actionShouldContinue = _j[0], hasSubscription = _j[1];
                    var res;
                    if (actionShouldContinue) {
                        res = next(action);
                    }
                    else {
                        res = hasSubscription;
                    }
                    if (!!mwApi.getState()[reducerPath]) {
                        windowEventsHandler(action, mwApiWithNext, stateBefore);
                        if (isThisApiSliceAction(action) || context.hasRehydrationInfo(action)) {
                            for (var _k = 0, handlers_1 = handlers; _k < handlers_1.length; _k++) {
                                var handler = handlers_1[_k];
                                handler(action, mwApiWithNext, stateBefore);
                            }
                        }
                    }
                    return res;
                };
            };
        };
        return { middleware: middleware, actions: actions };
        function refetchQuery(querySubState, queryCacheKey, override) {
            if (override === void 0) { override = {}; }
            return queryThunk(__spreadValues({
                type: "query",
                endpointName: querySubState.endpointName,
                originalArgs: querySubState.originalArgs,
                subscribe: false,
                forceRefetch: true,
                queryCacheKey: queryCacheKey
            }, override));
        }
    }
    function safeAssign(target) {
        var args = [];
        for (var _j = 1; _j < arguments.length; _j++) {
            args[_j - 1] = arguments[_j];
        }
        Object.assign.apply(Object, __spreadArray([target], args));
    }
    // src/query/core/module.ts
    var coreModuleName = /* @__PURE__ */ Symbol();
    var coreModule = function () { return ({
        name: coreModuleName,
        init: function (api, _j, context) {
            var baseQuery = _j.baseQuery, tagTypes = _j.tagTypes, reducerPath = _j.reducerPath, serializeQueryArgs = _j.serializeQueryArgs, keepUnusedDataFor = _j.keepUnusedDataFor, refetchOnMountOrArgChange = _j.refetchOnMountOrArgChange, refetchOnFocus = _j.refetchOnFocus, refetchOnReconnect = _j.refetchOnReconnect;
            T();
            var assertTagType = function (tag) {
                if (typeof process !== "undefined" && true) {
                    if (!tagTypes.includes(tag.type)) {
                        console.error("Tag type '" + tag.type + "' was used, but not specified in `tagTypes`!");
                    }
                }
                return tag;
            };
            Object.assign(api, {
                reducerPath: reducerPath,
                endpoints: {},
                internalActions: {
                    onOnline: onOnline,
                    onOffline: onOffline,
                    onFocus: onFocus,
                    onFocusLost: onFocusLost
                },
                util: {}
            });
            var _k = buildThunks({
                baseQuery: baseQuery,
                reducerPath: reducerPath,
                context: context,
                api: api,
                serializeQueryArgs: serializeQueryArgs,
                assertTagType: assertTagType
            }), queryThunk = _k.queryThunk, mutationThunk = _k.mutationThunk, patchQueryData = _k.patchQueryData, updateQueryData = _k.updateQueryData, upsertQueryData = _k.upsertQueryData, prefetch = _k.prefetch, buildMatchThunkActions = _k.buildMatchThunkActions;
            var _l = buildSlice({
                context: context,
                queryThunk: queryThunk,
                mutationThunk: mutationThunk,
                reducerPath: reducerPath,
                assertTagType: assertTagType,
                config: {
                    refetchOnFocus: refetchOnFocus,
                    refetchOnReconnect: refetchOnReconnect,
                    refetchOnMountOrArgChange: refetchOnMountOrArgChange,
                    keepUnusedDataFor: keepUnusedDataFor,
                    reducerPath: reducerPath
                }
            }), reducer = _l.reducer, sliceActions = _l.actions;
            safeAssign(api.util, {
                patchQueryData: patchQueryData,
                updateQueryData: updateQueryData,
                upsertQueryData: upsertQueryData,
                prefetch: prefetch,
                resetApiState: sliceActions.resetApiState
            });
            safeAssign(api.internalActions, sliceActions);
            var _m = buildMiddleware({
                reducerPath: reducerPath,
                context: context,
                queryThunk: queryThunk,
                mutationThunk: mutationThunk,
                api: api,
                assertTagType: assertTagType
            }), middleware = _m.middleware, middlewareActions = _m.actions;
            safeAssign(api.util, middlewareActions);
            safeAssign(api, { reducer: reducer, middleware: middleware });
            var _o = buildSelectors({
                serializeQueryArgs: serializeQueryArgs,
                reducerPath: reducerPath
            }), buildQuerySelector = _o.buildQuerySelector, buildMutationSelector = _o.buildMutationSelector, selectInvalidatedBy = _o.selectInvalidatedBy;
            safeAssign(api.util, { selectInvalidatedBy: selectInvalidatedBy });
            var _p = buildInitiate({
                queryThunk: queryThunk,
                mutationThunk: mutationThunk,
                api: api,
                serializeQueryArgs: serializeQueryArgs,
                context: context
            }), buildInitiateQuery = _p.buildInitiateQuery, buildInitiateMutation = _p.buildInitiateMutation, getRunningMutationThunk = _p.getRunningMutationThunk, getRunningMutationsThunk = _p.getRunningMutationsThunk, getRunningQueriesThunk = _p.getRunningQueriesThunk, getRunningQueryThunk = _p.getRunningQueryThunk, getRunningOperationPromises = _p.getRunningOperationPromises, removalWarning = _p.removalWarning;
            safeAssign(api.util, {
                getRunningOperationPromises: getRunningOperationPromises,
                getRunningOperationPromise: removalWarning,
                getRunningMutationThunk: getRunningMutationThunk,
                getRunningMutationsThunk: getRunningMutationsThunk,
                getRunningQueryThunk: getRunningQueryThunk,
                getRunningQueriesThunk: getRunningQueriesThunk
            });
            return {
                name: coreModuleName,
                injectEndpoint: function (endpointName, definition) {
                    var _a, _b;
                    var anyApi = api;
                    (_b = (_a = anyApi.endpoints)[endpointName]) != null ? _b : _a[endpointName] = {};
                    if (isQueryDefinition(definition)) {
                        safeAssign(anyApi.endpoints[endpointName], {
                            name: endpointName,
                            select: buildQuerySelector(endpointName, definition),
                            initiate: buildInitiateQuery(endpointName, definition)
                        }, buildMatchThunkActions(queryThunk, endpointName));
                    }
                    else if (isMutationDefinition(definition)) {
                        safeAssign(anyApi.endpoints[endpointName], {
                            name: endpointName,
                            select: buildMutationSelector(),
                            initiate: buildInitiateMutation(endpointName)
                        }, buildMatchThunkActions(mutationThunk, endpointName));
                    }
                }
            };
        }
    }); };
    // src/query/core/index.ts
    var createApi = /* @__PURE__ */ buildCreateApi(coreModule());

    exports.buildCreateApi = buildCreateApi;
    exports.copyWithStructuralSharing = copyWithStructuralSharing;
    exports.coreModule = coreModule;
    exports.coreModuleName = coreModuleName;
    exports.createApi = createApi;
    exports.defaultSerializeQueryArgs = defaultSerializeQueryArgs;
    exports.fakeBaseQuery = fakeBaseQuery;
    exports.fetchBaseQuery = fetchBaseQuery;
    exports.retry = retry;
    exports.setupListeners = setupListeners;
    exports.skipSelector = skipSelector;
    exports.skipToken = skipToken;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=rtk-query.umd.js.map
