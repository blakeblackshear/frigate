(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.RTK = {}));
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
            for (var _c = 0, _d = __getOwnPropSymbols(b2); _c < _d.length; _c++) {
                var prop = _d[_c];
                if (__propIsEnum.call(b2, prop))
                    __defNormalProp(a2, prop, b2[prop]);
            }
        return a2;
    };
    var __spreadProps = function (a2, b2) { return __defProps(a2, __getOwnPropDescs(b2)); };
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
    an.produceWithPatches.bind(an);
    an.setAutoFreeze.bind(an);
    an.setUseProxies.bind(an);
    an.applyPatches.bind(an);
    an.createDraft.bind(an);
    an.finishDraft.bind(an);
    var immer_esm_default = fn;
    // ../../node_modules/@babel/runtime/helpers/esm/defineProperty.js
    function _defineProperty(obj, key, value) {
        if (key in obj) {
            Object.defineProperty(obj, key, {
                value: value,
                enumerable: true,
                configurable: true,
                writable: true
            });
        }
        else {
            obj[key] = value;
        }
        return obj;
    }
    // ../../node_modules/@babel/runtime/helpers/esm/objectSpread2.js
    function ownKeys(object, enumerableOnly) {
        var keys = Object.keys(object);
        if (Object.getOwnPropertySymbols) {
            var symbols = Object.getOwnPropertySymbols(object);
            enumerableOnly && (symbols = symbols.filter(function (sym) {
                return Object.getOwnPropertyDescriptor(object, sym).enumerable;
            })), keys.push.apply(keys, symbols);
        }
        return keys;
    }
    function _objectSpread2(target) {
        for (var i2 = 1; i2 < arguments.length; i2++) {
            var source = arguments[i2] != null ? arguments[i2] : {};
            i2 % 2 ? ownKeys(Object(source), true).forEach(function (key) {
                _defineProperty(target, key, source[key]);
            }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
                Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
            });
        }
        return target;
    }
    // ../../node_modules/redux/es/redux.js
    var $$observable = function () {
        return typeof Symbol === "function" && Symbol.observable || "@@observable";
    }();
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
    function createStore(reducer, preloadedState, enhancer) {
        var _ref2;
        if (typeof preloadedState === "function" && typeof enhancer === "function" || typeof enhancer === "function" && typeof arguments[3] === "function") {
            throw new Error("It looks like you are passing several store enhancers to createStore(). This is not supported. Instead, compose them together to a single function. See https://redux.js.org/tutorials/fundamentals/part-4-store#creating-a-store-with-enhancers for an example.");
        }
        if (typeof preloadedState === "function" && typeof enhancer === "undefined") {
            enhancer = preloadedState;
            preloadedState = void 0;
        }
        if (typeof enhancer !== "undefined") {
            if (typeof enhancer !== "function") {
                throw new Error("Expected the enhancer to be a function. Instead, received: '" + kindOf(enhancer) + "'");
            }
            return enhancer(createStore)(reducer, preloadedState);
        }
        if (typeof reducer !== "function") {
            throw new Error("Expected the root reducer to be a function. Instead, received: '" + kindOf(reducer) + "'");
        }
        var currentReducer = reducer;
        var currentState = preloadedState;
        var currentListeners = [];
        var nextListeners = currentListeners;
        var isDispatching = false;
        function ensureCanMutateNextListeners() {
            if (nextListeners === currentListeners) {
                nextListeners = currentListeners.slice();
            }
        }
        function getState() {
            if (isDispatching) {
                throw new Error("You may not call store.getState() while the reducer is executing. The reducer has already received the state as an argument. Pass it down from the top reducer instead of reading it from the store.");
            }
            return currentState;
        }
        function subscribe(listener2) {
            if (typeof listener2 !== "function") {
                throw new Error("Expected the listener to be a function. Instead, received: '" + kindOf(listener2) + "'");
            }
            if (isDispatching) {
                throw new Error("You may not call store.subscribe() while the reducer is executing. If you would like to be notified after the store has been updated, subscribe from a component and invoke store.getState() in the callback to access the latest state. See https://redux.js.org/api/store#subscribelistener for more details.");
            }
            var isSubscribed = true;
            ensureCanMutateNextListeners();
            nextListeners.push(listener2);
            return function unsubscribe() {
                if (!isSubscribed) {
                    return;
                }
                if (isDispatching) {
                    throw new Error("You may not unsubscribe from a store listener while the reducer is executing. See https://redux.js.org/api/store#subscribelistener for more details.");
                }
                isSubscribed = false;
                ensureCanMutateNextListeners();
                var index = nextListeners.indexOf(listener2);
                nextListeners.splice(index, 1);
                currentListeners = null;
            };
        }
        function dispatch(action) {
            if (!isPlainObject(action)) {
                throw new Error("Actions must be plain objects. Instead, the actual type was: '" + kindOf(action) + "'. You may need to add middleware to your store setup to handle dispatching other values, such as 'redux-thunk' to handle dispatching functions. See https://redux.js.org/tutorials/fundamentals/part-4-store#middleware and https://redux.js.org/tutorials/fundamentals/part-6-async-logic#using-the-redux-thunk-middleware for examples.");
            }
            if (typeof action.type === "undefined") {
                throw new Error('Actions may not have an undefined "type" property. You may have misspelled an action type string constant.');
            }
            if (isDispatching) {
                throw new Error("Reducers may not dispatch actions.");
            }
            try {
                isDispatching = true;
                currentState = currentReducer(currentState, action);
            }
            finally {
                isDispatching = false;
            }
            var listeners = currentListeners = nextListeners;
            for (var i2 = 0; i2 < listeners.length; i2++) {
                var listener2 = listeners[i2];
                listener2();
            }
            return action;
        }
        function replaceReducer(nextReducer) {
            if (typeof nextReducer !== "function") {
                throw new Error("Expected the nextReducer to be a function. Instead, received: '" + kindOf(nextReducer));
            }
            currentReducer = nextReducer;
            dispatch({
                type: ActionTypes.REPLACE
            });
        }
        function observable() {
            var _ref;
            var outerSubscribe = subscribe;
            return _ref = {
                subscribe: function subscribe2(observer) {
                    if (typeof observer !== "object" || observer === null) {
                        throw new Error("Expected the observer to be an object. Instead, received: '" + kindOf(observer) + "'");
                    }
                    function observeState() {
                        if (observer.next) {
                            observer.next(getState());
                        }
                    }
                    observeState();
                    var unsubscribe = outerSubscribe(observeState);
                    return {
                        unsubscribe: unsubscribe
                    };
                }
            }, _ref[$$observable] = function () {
                return this;
            }, _ref;
        }
        dispatch({
            type: ActionTypes.INIT
        });
        return _ref2 = {
            dispatch: dispatch,
            subscribe: subscribe,
            getState: getState,
            replaceReducer: replaceReducer
        }, _ref2[$$observable] = observable, _ref2;
    }
    var legacy_createStore = createStore;
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
            var initialState = reducer(void 0, {
                type: ActionTypes.INIT
            });
            if (typeof initialState === "undefined") {
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
    function bindActionCreator(actionCreator, dispatch) {
        return function () {
            return dispatch(actionCreator.apply(this, arguments));
        };
    }
    function bindActionCreators(actionCreators, dispatch) {
        if (typeof actionCreators === "function") {
            return bindActionCreator(actionCreators, dispatch);
        }
        if (typeof actionCreators !== "object" || actionCreators === null) {
            throw new Error("bindActionCreators expected an object or a function, but instead received: '" + kindOf(actionCreators) + "'. Did you write \"import ActionCreators from\" instead of \"import * as ActionCreators from\"?");
        }
        var boundActionCreators = {};
        for (var key in actionCreators) {
            var actionCreator = actionCreators[key];
            if (typeof actionCreator === "function") {
                boundActionCreators[key] = bindActionCreator(actionCreator, dispatch);
            }
        }
        return boundActionCreators;
    }
    function compose() {
        for (var _len = arguments.length, funcs = new Array(_len), _key = 0; _key < _len; _key++) {
            funcs[_key] = arguments[_key];
        }
        if (funcs.length === 0) {
            return function (arg) {
                return arg;
            };
        }
        if (funcs.length === 1) {
            return funcs[0];
        }
        return funcs.reduce(function (a2, b2) {
            return function () {
                return a2(b2.apply(void 0, arguments));
            };
        });
    }
    function applyMiddleware() {
        for (var _len = arguments.length, middlewares = new Array(_len), _key = 0; _key < _len; _key++) {
            middlewares[_key] = arguments[_key];
        }
        return function (createStore2) {
            return function () {
                var store = createStore2.apply(void 0, arguments);
                var _dispatch = function dispatch() {
                    throw new Error("Dispatching while constructing your middleware is not allowed. Other middleware would not be applied to this dispatch.");
                };
                var middlewareAPI = {
                    getState: store.getState,
                    dispatch: function dispatch() {
                        return _dispatch.apply(void 0, arguments);
                    }
                };
                var chain = middlewares.map(function (middleware) {
                    return middleware(middlewareAPI);
                });
                _dispatch = compose.apply(void 0, chain)(store.dispatch);
                return _objectSpread2(_objectSpread2({}, store), {}, {
                    dispatch: _dispatch
                });
            };
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
        var cache = maxSize === 1 ? createSingletonCache(comparator) : createLruCache(maxSize, comparator);
        function memoized() {
            var value = cache.get(arguments);
            if (value === NOT_FOUND) {
                value = func.apply(null, arguments);
                if (resultEqualityCheck) {
                    var entries = cache.getEntries();
                    var matchingEntry = entries.find(function (entry) {
                        return resultEqualityCheck(entry.value, value);
                    });
                    if (matchingEntry) {
                        value = matchingEntry.value;
                    }
                }
                cache.put(arguments, value);
            }
            return value;
        }
        memoized.clearCache = function () {
            return cache.clear();
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
    // src/createDraftSafeSelector.ts
    var createDraftSafeSelector = function () {
        var args = [];
        for (var _c = 0; _c < arguments.length; _c++) {
            args[_c] = arguments[_c];
        }
        var selector = createSelector.apply(void 0, args);
        var wrappedSelector = function (value) {
            var rest = [];
            for (var _c = 1; _c < arguments.length; _c++) {
                rest[_c - 1] = arguments[_c];
            }
            return selector.apply(void 0, __spreadArray([r(value) ? R(value) : value], rest));
        };
        return wrappedSelector;
    };
    // src/devtoolsExtension.ts
    var composeWithDevTools = typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : function () {
        if (arguments.length === 0)
            return void 0;
        if (typeof arguments[0] === "object")
            return compose;
        return compose.apply(null, arguments);
    };
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
    // ../../node_modules/redux-thunk/es/index.js
    function createThunkMiddleware(extraArgument) {
        var middleware = function middleware2(_ref) {
            var dispatch = _ref.dispatch, getState = _ref.getState;
            return function (next) {
                return function (action) {
                    if (typeof action === "function") {
                        return action(dispatch, getState, extraArgument);
                    }
                    return next(action);
                };
            };
        };
        return middleware;
    }
    var thunk = createThunkMiddleware();
    thunk.withExtraArgument = createThunkMiddleware;
    var es_default = thunk;
    // src/tsHelpers.ts
    var hasMatchFunction = function (v2) {
        return v2 && typeof v2.match === "function";
    };
    // src/createAction.ts
    function createAction(type, prepareAction) {
        function actionCreator() {
            var args = [];
            for (var _c = 0; _c < arguments.length; _c++) {
                args[_c] = arguments[_c];
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
    function isAction(action) {
        return isPlainObject2(action) && "type" in action;
    }
    function isActionCreator(action) {
        return typeof action === "function" && "type" in action && hasMatchFunction(action);
    }
    function isFSA(action) {
        return isAction(action) && typeof action.type === "string" && Object.keys(action).every(isValidKey);
    }
    function isValidKey(key) {
        return ["type", "payload", "error", "meta"].indexOf(key) > -1;
    }
    function getType(actionCreator) {
        return "" + actionCreator;
    }
    // src/actionCreatorInvariantMiddleware.ts
    function getMessage(type) {
        var splitType = type ? ("" + type).split("/") : [];
        var actionName = splitType[splitType.length - 1] || "actionCreator";
        return "Detected an action creator with type \"" + (type || "unknown") + "\" being dispatched. \nMake sure you're calling the action creator before dispatching, i.e. `dispatch(" + actionName + "())` instead of `dispatch(" + actionName + ")`. This is necessary even if the action has no payload.";
    }
    function createActionCreatorInvariantMiddleware(options) {
        if (options === void 0) { options = {}; }
        var _c = options.isActionCreator, isActionCreator2 = _c === void 0 ? isActionCreator : _c;
        return function () { return function (next) { return function (action) {
            if (isActionCreator2(action)) {
                console.warn(getMessage(action.type));
            }
            return next(action);
        }; }; };
    }
    // src/utils.ts
    function getTimeMeasureUtils(maxDelay, fnName) {
        var elapsed = 0;
        return {
            measureTime: function (fn2) {
                var started = Date.now();
                try {
                    return fn2();
                }
                finally {
                    var finished = Date.now();
                    elapsed += finished - started;
                }
            },
            warnIfExceeded: function () {
                if (elapsed > maxDelay) {
                    console.warn(fnName + " took " + elapsed + "ms, which is more than the warning threshold of " + maxDelay + "ms. \nIf your state or actions are very large, you may want to disable the middleware as it might cause too much of a slowdown in development mode. See https://redux-toolkit.js.org/api/getDefaultMiddleware for instructions.\nIt is disabled in production builds, so you don't need to worry about that.");
                }
            }
        };
    }
    var MiddlewareArray = /** @class */ (function (_super) {
        __extends(MiddlewareArray, _super);
        function MiddlewareArray() {
            var args = [];
            for (var _c = 0; _c < arguments.length; _c++) {
                args[_c] = arguments[_c];
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
            for (var _c = 0; _c < arguments.length; _c++) {
                arr[_c] = arguments[_c];
            }
            return _super.prototype.concat.apply(this, arr);
        };
        MiddlewareArray.prototype.prepend = function () {
            var arr = [];
            for (var _c = 0; _c < arguments.length; _c++) {
                arr[_c] = arguments[_c];
            }
            if (arr.length === 1 && Array.isArray(arr[0])) {
                return new (MiddlewareArray.bind.apply(MiddlewareArray, __spreadArray([void 0], arr[0].concat(this))))();
            }
            return new (MiddlewareArray.bind.apply(MiddlewareArray, __spreadArray([void 0], arr.concat(this))))();
        };
        return MiddlewareArray;
    }(Array));
    var EnhancerArray = /** @class */ (function (_super) {
        __extends(EnhancerArray, _super);
        function EnhancerArray() {
            var args = [];
            for (var _c = 0; _c < arguments.length; _c++) {
                args[_c] = arguments[_c];
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
            for (var _c = 0; _c < arguments.length; _c++) {
                arr[_c] = arguments[_c];
            }
            return _super.prototype.concat.apply(this, arr);
        };
        EnhancerArray.prototype.prepend = function () {
            var arr = [];
            for (var _c = 0; _c < arguments.length; _c++) {
                arr[_c] = arguments[_c];
            }
            if (arr.length === 1 && Array.isArray(arr[0])) {
                return new (EnhancerArray.bind.apply(EnhancerArray, __spreadArray([void 0], arr[0].concat(this))))();
            }
            return new (EnhancerArray.bind.apply(EnhancerArray, __spreadArray([void 0], arr.concat(this))))();
        };
        return EnhancerArray;
    }(Array));
    function freezeDraftable(val) {
        return t(val) ? immer_esm_default(val, function () {
        }) : val;
    }
    var prefix = "Invariant failed";
    function invariant(condition, message) {
        if (condition) {
            return;
        }
        throw new Error(prefix + ": " + (message || ""));
    }
    function stringify(obj, serializer, indent, decycler) {
        return JSON.stringify(obj, getSerialize(serializer, decycler), indent);
    }
    function getSerialize(serializer, decycler) {
        var stack = [], keys = [];
        if (!decycler)
            decycler = function (_2, value) {
                if (stack[0] === value)
                    return "[Circular ~]";
                return "[Circular ~." + keys.slice(0, stack.indexOf(value)).join(".") + "]";
            };
        return function (key, value) {
            if (stack.length > 0) {
                var thisPos = stack.indexOf(this);
                ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
                ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
                if (~stack.indexOf(value))
                    value = decycler.call(this, key, value);
            }
            else
                stack.push(value);
            return serializer == null ? value : serializer.call(this, key, value);
        };
    }
    function isImmutableDefault(value) {
        return typeof value !== "object" || value == null || Object.isFrozen(value);
    }
    function trackForMutations(isImmutable, ignorePaths, obj) {
        var trackedProperties = trackProperties(isImmutable, ignorePaths, obj);
        return {
            detectMutations: function () {
                return detectMutations(isImmutable, ignorePaths, trackedProperties, obj);
            }
        };
    }
    function trackProperties(isImmutable, ignorePaths, obj, path, checkedObjects) {
        if (ignorePaths === void 0) { ignorePaths = []; }
        if (path === void 0) { path = ""; }
        if (checkedObjects === void 0) { checkedObjects = new Set(); }
        var tracked = { value: obj };
        if (!isImmutable(obj) && !checkedObjects.has(obj)) {
            checkedObjects.add(obj);
            tracked.children = {};
            for (var key in obj) {
                var childPath = path ? path + "." + key : key;
                if (ignorePaths.length && ignorePaths.indexOf(childPath) !== -1) {
                    continue;
                }
                tracked.children[key] = trackProperties(isImmutable, ignorePaths, obj[key], childPath);
            }
        }
        return tracked;
    }
    function detectMutations(isImmutable, ignoredPaths, trackedProperty, obj, sameParentRef, path) {
        if (ignoredPaths === void 0) { ignoredPaths = []; }
        if (sameParentRef === void 0) { sameParentRef = false; }
        if (path === void 0) { path = ""; }
        var prevObj = trackedProperty ? trackedProperty.value : void 0;
        var sameRef = prevObj === obj;
        if (sameParentRef && !sameRef && !Number.isNaN(obj)) {
            return { wasMutated: true, path: path };
        }
        if (isImmutable(prevObj) || isImmutable(obj)) {
            return { wasMutated: false };
        }
        var keysToDetect = {};
        for (var key in trackedProperty.children) {
            keysToDetect[key] = true;
        }
        for (var key in obj) {
            keysToDetect[key] = true;
        }
        var hasIgnoredPaths = ignoredPaths.length > 0;
        var _loop_1 = function (key) {
            var nestedPath = path ? path + "." + key : key;
            if (hasIgnoredPaths) {
                var hasMatches = ignoredPaths.some(function (ignored) {
                    if (ignored instanceof RegExp) {
                        return ignored.test(nestedPath);
                    }
                    return nestedPath === ignored;
                });
                if (hasMatches) {
                    return "continue";
                }
            }
            var result = detectMutations(isImmutable, ignoredPaths, trackedProperty.children[key], obj[key], sameRef, nestedPath);
            if (result.wasMutated) {
                return { value: result };
            }
        };
        for (var key in keysToDetect) {
            var state_1 = _loop_1(key);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        return { wasMutated: false };
    }
    function createImmutableStateInvariantMiddleware(options) {
        if (options === void 0) { options = {}; }
        var _c = options.isImmutable, isImmutable = _c === void 0 ? isImmutableDefault : _c, ignoredPaths = options.ignoredPaths, _d = options.warnAfter, warnAfter = _d === void 0 ? 32 : _d, ignore = options.ignore;
        ignoredPaths = ignoredPaths || ignore;
        var track = trackForMutations.bind(null, isImmutable, ignoredPaths);
        return function (_c) {
            var getState = _c.getState;
            var state = getState();
            var tracker = track(state);
            var result;
            return function (next) { return function (action) {
                var measureUtils = getTimeMeasureUtils(warnAfter, "ImmutableStateInvariantMiddleware");
                measureUtils.measureTime(function () {
                    state = getState();
                    result = tracker.detectMutations();
                    tracker = track(state);
                    invariant(!result.wasMutated, "A state mutation was detected between dispatches, in the path '" + (result.path || "") + "'.  This may cause incorrect behavior. (https://redux.js.org/style-guide/style-guide#do-not-mutate-state)");
                });
                var dispatchedAction = next(action);
                measureUtils.measureTime(function () {
                    state = getState();
                    result = tracker.detectMutations();
                    tracker = track(state);
                    result.wasMutated && invariant(!result.wasMutated, "A state mutation was detected inside a dispatch, in the path: " + (result.path || "") + ". Take a look at the reducer(s) handling the action " + stringify(action) + ". (https://redux.js.org/style-guide/style-guide#do-not-mutate-state)");
                });
                measureUtils.warnIfExceeded();
                return dispatchedAction;
            }; };
        };
    }
    // src/serializableStateInvariantMiddleware.ts
    function isPlain(val) {
        var type = typeof val;
        return val == null || type === "string" || type === "boolean" || type === "number" || Array.isArray(val) || isPlainObject2(val);
    }
    function findNonSerializableValue(value, path, isSerializable, getEntries, ignoredPaths, cache) {
        if (path === void 0) { path = ""; }
        if (isSerializable === void 0) { isSerializable = isPlain; }
        if (ignoredPaths === void 0) { ignoredPaths = []; }
        var foundNestedSerializable;
        if (!isSerializable(value)) {
            return {
                keyPath: path || "<root>",
                value: value
            };
        }
        if (typeof value !== "object" || value === null) {
            return false;
        }
        if (cache == null ? void 0 : cache.has(value))
            return false;
        var entries = getEntries != null ? getEntries(value) : Object.entries(value);
        var hasIgnoredPaths = ignoredPaths.length > 0;
        var _loop_2 = function (key, nestedValue) {
            var nestedPath = path ? path + "." + key : key;
            if (hasIgnoredPaths) {
                var hasMatches = ignoredPaths.some(function (ignored) {
                    if (ignored instanceof RegExp) {
                        return ignored.test(nestedPath);
                    }
                    return nestedPath === ignored;
                });
                if (hasMatches) {
                    return "continue";
                }
            }
            if (!isSerializable(nestedValue)) {
                return { value: {
                        keyPath: nestedPath,
                        value: nestedValue
                    } };
            }
            if (typeof nestedValue === "object") {
                foundNestedSerializable = findNonSerializableValue(nestedValue, nestedPath, isSerializable, getEntries, ignoredPaths, cache);
                if (foundNestedSerializable) {
                    return { value: foundNestedSerializable };
                }
            }
        };
        for (var _c = 0, entries_1 = entries; _c < entries_1.length; _c++) {
            var _d = entries_1[_c], key = _d[0], nestedValue = _d[1];
            var state_2 = _loop_2(key, nestedValue);
            if (typeof state_2 === "object")
                return state_2.value;
        }
        if (cache && isNestedFrozen(value))
            cache.add(value);
        return false;
    }
    function isNestedFrozen(value) {
        if (!Object.isFrozen(value))
            return false;
        for (var _c = 0, _d = Object.values(value); _c < _d.length; _c++) {
            var nestedValue = _d[_c];
            if (typeof nestedValue !== "object" || nestedValue === null)
                continue;
            if (!isNestedFrozen(nestedValue))
                return false;
        }
        return true;
    }
    function createSerializableStateInvariantMiddleware(options) {
        if (options === void 0) { options = {}; }
        var _c = options.isSerializable, isSerializable = _c === void 0 ? isPlain : _c, getEntries = options.getEntries, _d = options.ignoredActions, ignoredActions = _d === void 0 ? [] : _d, _e = options.ignoredActionPaths, ignoredActionPaths = _e === void 0 ? ["meta.arg", "meta.baseQueryMeta"] : _e, _f = options.ignoredPaths, ignoredPaths = _f === void 0 ? [] : _f, _g = options.warnAfter, warnAfter = _g === void 0 ? 32 : _g, _h = options.ignoreState, ignoreState = _h === void 0 ? false : _h, _j = options.ignoreActions, ignoreActions = _j === void 0 ? false : _j, _k = options.disableCache, disableCache = _k === void 0 ? false : _k;
        var cache = !disableCache && WeakSet ? new WeakSet() : void 0;
        return function (storeAPI) { return function (next) { return function (action) {
            var result = next(action);
            var measureUtils = getTimeMeasureUtils(warnAfter, "SerializableStateInvariantMiddleware");
            if (!ignoreActions && !(ignoredActions.length && ignoredActions.indexOf(action.type) !== -1)) {
                measureUtils.measureTime(function () {
                    var foundActionNonSerializableValue = findNonSerializableValue(action, "", isSerializable, getEntries, ignoredActionPaths, cache);
                    if (foundActionNonSerializableValue) {
                        var keyPath = foundActionNonSerializableValue.keyPath, value = foundActionNonSerializableValue.value;
                        console.error("A non-serializable value was detected in an action, in the path: `" + keyPath + "`. Value:", value, "\nTake a look at the logic that dispatched this action: ", action, "\n(See https://redux.js.org/faq/actions#why-should-type-be-a-string-or-at-least-serializable-why-should-my-action-types-be-constants)", "\n(To allow non-serializable values see: https://redux-toolkit.js.org/usage/usage-guide#working-with-non-serializable-data)");
                    }
                });
            }
            if (!ignoreState) {
                measureUtils.measureTime(function () {
                    var state = storeAPI.getState();
                    var foundStateNonSerializableValue = findNonSerializableValue(state, "", isSerializable, getEntries, ignoredPaths, cache);
                    if (foundStateNonSerializableValue) {
                        var keyPath = foundStateNonSerializableValue.keyPath, value = foundStateNonSerializableValue.value;
                        console.error("A non-serializable value was detected in the state, in the path: `" + keyPath + "`. Value:", value, "\nTake a look at the reducer(s) handling this action type: " + action.type + ".\n(See https://redux.js.org/faq/organizing-state#can-i-put-functions-promises-or-other-non-serializable-items-in-my-store-state)");
                    }
                });
                measureUtils.warnIfExceeded();
            }
            return result;
        }; }; };
    }
    // src/getDefaultMiddleware.ts
    function isBoolean(x2) {
        return typeof x2 === "boolean";
    }
    function curryGetDefaultMiddleware() {
        return function curriedGetDefaultMiddleware(options) {
            return getDefaultMiddleware(options);
        };
    }
    function getDefaultMiddleware(options) {
        if (options === void 0) { options = {}; }
        var _c = options.thunk, thunk2 = _c === void 0 ? true : _c, _d = options.immutableCheck, immutableCheck = _d === void 0 ? true : _d, _e = options.serializableCheck, serializableCheck = _e === void 0 ? true : _e, _f = options.actionCreatorCheck, actionCreatorCheck = _f === void 0 ? true : _f;
        var middlewareArray = new MiddlewareArray();
        if (thunk2) {
            if (isBoolean(thunk2)) {
                middlewareArray.push(es_default);
            }
            else {
                middlewareArray.push(es_default.withExtraArgument(thunk2.extraArgument));
            }
        }
        {
            if (immutableCheck) {
                var immutableOptions = {};
                if (!isBoolean(immutableCheck)) {
                    immutableOptions = immutableCheck;
                }
                middlewareArray.unshift(createImmutableStateInvariantMiddleware(immutableOptions));
            }
            if (serializableCheck) {
                var serializableOptions = {};
                if (!isBoolean(serializableCheck)) {
                    serializableOptions = serializableCheck;
                }
                middlewareArray.push(createSerializableStateInvariantMiddleware(serializableOptions));
            }
            if (actionCreatorCheck) {
                var actionCreatorOptions = {};
                if (!isBoolean(actionCreatorCheck)) {
                    actionCreatorOptions = actionCreatorCheck;
                }
                middlewareArray.unshift(createActionCreatorInvariantMiddleware(actionCreatorOptions));
            }
        }
        return middlewareArray;
    }
    // src/configureStore.ts
    var IS_PRODUCTION = false;
    function configureStore(options) {
        var curriedGetDefaultMiddleware = curryGetDefaultMiddleware();
        var _c = options || {}, _d = _c.reducer, reducer = _d === void 0 ? void 0 : _d, _e = _c.middleware, middleware = _e === void 0 ? curriedGetDefaultMiddleware() : _e, _f = _c.devTools, devTools = _f === void 0 ? true : _f, _g = _c.preloadedState, preloadedState = _g === void 0 ? void 0 : _g, _h = _c.enhancers, enhancers = _h === void 0 ? void 0 : _h;
        var rootReducer;
        if (typeof reducer === "function") {
            rootReducer = reducer;
        }
        else if (isPlainObject2(reducer)) {
            rootReducer = combineReducers(reducer);
        }
        else {
            throw new Error('"reducer" is a required argument, and must be a function or an object of functions that can be passed to combineReducers');
        }
        var finalMiddleware = middleware;
        if (typeof finalMiddleware === "function") {
            finalMiddleware = finalMiddleware(curriedGetDefaultMiddleware);
            if (!Array.isArray(finalMiddleware)) {
                throw new Error("when using a middleware builder function, an array of middleware must be returned");
            }
        }
        if (finalMiddleware.some(function (item) { return typeof item !== "function"; })) {
            throw new Error("each middleware provided to configureStore must be a function");
        }
        var middlewareEnhancer = applyMiddleware.apply(void 0, finalMiddleware);
        var finalCompose = compose;
        if (devTools) {
            finalCompose = composeWithDevTools(__spreadValues({
                trace: !IS_PRODUCTION
            }, typeof devTools === "object" && devTools));
        }
        var defaultEnhancers = new EnhancerArray(middlewareEnhancer);
        var storeEnhancers = defaultEnhancers;
        if (Array.isArray(enhancers)) {
            storeEnhancers = __spreadArray([middlewareEnhancer], enhancers);
        }
        else if (typeof enhancers === "function") {
            storeEnhancers = enhancers(defaultEnhancers);
        }
        var composedEnhancer = finalCompose.apply(void 0, storeEnhancers);
        return createStore(rootReducer, preloadedState, composedEnhancer);
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
    function createReducer(initialState, mapOrBuilderCallback, actionMatchers, defaultCaseReducer) {
        if (actionMatchers === void 0) { actionMatchers = []; }
        {
            if (typeof mapOrBuilderCallback === "object") {
                if (!hasWarnedAboutObjectNotation) {
                    hasWarnedAboutObjectNotation = true;
                    console.warn("The object notation for `createReducer` is deprecated, and will be removed in RTK 2.0. Please use the 'builder callback' notation instead: https://redux-toolkit.js.org/api/createReducer");
                }
            }
        }
        var _c = typeof mapOrBuilderCallback === "function" ? executeReducerBuilderCallback(mapOrBuilderCallback) : [mapOrBuilderCallback, actionMatchers, defaultCaseReducer], actionsMap = _c[0], finalActionMatchers = _c[1], finalDefaultCaseReducer = _c[2];
        var getInitialState;
        if (isStateFunction(initialState)) {
            getInitialState = function () { return freezeDraftable(initialState()); };
        }
        else {
            var frozenInitialState_1 = freezeDraftable(initialState);
            getInitialState = function () { return frozenInitialState_1; };
        }
        function reducer(state, action) {
            if (state === void 0) { state = getInitialState(); }
            var caseReducers = __spreadArray([
                actionsMap[action.type]
            ], finalActionMatchers.filter(function (_c) {
                var matcher = _c.matcher;
                return matcher(action);
            }).map(function (_c) {
                var reducer2 = _c.reducer;
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
    function getType2(slice, actionKey) {
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
        var initialState = typeof options.initialState == "function" ? options.initialState : freezeDraftable(options.initialState);
        var reducers = options.reducers || {};
        var reducerNames = Object.keys(reducers);
        var sliceCaseReducersByName = {};
        var sliceCaseReducersByType = {};
        var actionCreators = {};
        reducerNames.forEach(function (reducerName) {
            var maybeReducerWithPrepare = reducers[reducerName];
            var type = getType2(name, reducerName);
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
            var _c = typeof options.extraReducers === "function" ? executeReducerBuilderCallback(options.extraReducers) : [options.extraReducers], _d = _c[0], extraReducers = _d === void 0 ? {} : _d, _e = _c[1], actionMatchers = _e === void 0 ? [] : _e, _f = _c[2], defaultCaseReducer = _f === void 0 ? void 0 : _f;
            var finalCaseReducers = __spreadValues(__spreadValues({}, extraReducers), sliceCaseReducersByType);
            return createReducer(initialState, function (builder) {
                for (var key in finalCaseReducers) {
                    builder.addCase(key, finalCaseReducers[key]);
                }
                for (var _c = 0, actionMatchers_1 = actionMatchers; _c < actionMatchers_1.length; _c++) {
                    var m2 = actionMatchers_1[_c];
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
    // src/entities/entity_state.ts
    function getInitialEntityState() {
        return {
            ids: [],
            entities: {}
        };
    }
    function createInitialStateFactory() {
        function getInitialState(additionalState) {
            if (additionalState === void 0) { additionalState = {}; }
            return Object.assign(getInitialEntityState(), additionalState);
        }
        return { getInitialState: getInitialState };
    }
    // src/entities/state_selectors.ts
    function createSelectorsFactory() {
        function getSelectors(selectState) {
            var selectIds = function (state) { return state.ids; };
            var selectEntities = function (state) { return state.entities; };
            var selectAll = createDraftSafeSelector(selectIds, selectEntities, function (ids, entities) { return ids.map(function (id) { return entities[id]; }); });
            var selectId = function (_2, id) { return id; };
            var selectById = function (entities, id) { return entities[id]; };
            var selectTotal = createDraftSafeSelector(selectIds, function (ids) { return ids.length; });
            if (!selectState) {
                return {
                    selectIds: selectIds,
                    selectEntities: selectEntities,
                    selectAll: selectAll,
                    selectTotal: selectTotal,
                    selectById: createDraftSafeSelector(selectEntities, selectId, selectById)
                };
            }
            var selectGlobalizedEntities = createDraftSafeSelector(selectState, selectEntities);
            return {
                selectIds: createDraftSafeSelector(selectState, selectIds),
                selectEntities: selectGlobalizedEntities,
                selectAll: createDraftSafeSelector(selectState, selectAll),
                selectTotal: createDraftSafeSelector(selectState, selectTotal),
                selectById: createDraftSafeSelector(selectGlobalizedEntities, selectId, selectById)
            };
        }
        return { getSelectors: getSelectors };
    }
    // src/entities/state_adapter.ts
    function createSingleArgumentStateOperator(mutator) {
        var operator = createStateOperator(function (_2, state) { return mutator(state); });
        return function operation(state) {
            return operator(state, void 0);
        };
    }
    function createStateOperator(mutator) {
        return function operation(state, arg) {
            function isPayloadActionArgument(arg2) {
                return isFSA(arg2);
            }
            var runMutator = function (draft) {
                if (isPayloadActionArgument(arg)) {
                    mutator(arg.payload, draft);
                }
                else {
                    mutator(arg, draft);
                }
            };
            if (r(state)) {
                runMutator(state);
                return state;
            }
            else {
                return immer_esm_default(state, runMutator);
            }
        };
    }
    // src/entities/utils.ts
    function selectIdValue(entity, selectId) {
        var key = selectId(entity);
        if (key === void 0) {
            console.warn("The entity passed to the `selectId` implementation returned undefined.", "You should probably provide your own `selectId` implementation.", "The entity that was passed:", entity, "The `selectId` implementation:", selectId.toString());
        }
        return key;
    }
    function ensureEntitiesArray(entities) {
        if (!Array.isArray(entities)) {
            entities = Object.values(entities);
        }
        return entities;
    }
    function splitAddedUpdatedEntities(newEntities, selectId, state) {
        newEntities = ensureEntitiesArray(newEntities);
        var added = [];
        var updated = [];
        for (var _c = 0, newEntities_1 = newEntities; _c < newEntities_1.length; _c++) {
            var entity = newEntities_1[_c];
            var id = selectIdValue(entity, selectId);
            if (id in state.entities) {
                updated.push({ id: id, changes: entity });
            }
            else {
                added.push(entity);
            }
        }
        return [added, updated];
    }
    // src/entities/unsorted_state_adapter.ts
    function createUnsortedStateAdapter(selectId) {
        function addOneMutably(entity, state) {
            var key = selectIdValue(entity, selectId);
            if (key in state.entities) {
                return;
            }
            state.ids.push(key);
            state.entities[key] = entity;
        }
        function addManyMutably(newEntities, state) {
            newEntities = ensureEntitiesArray(newEntities);
            for (var _c = 0, newEntities_2 = newEntities; _c < newEntities_2.length; _c++) {
                var entity = newEntities_2[_c];
                addOneMutably(entity, state);
            }
        }
        function setOneMutably(entity, state) {
            var key = selectIdValue(entity, selectId);
            if (!(key in state.entities)) {
                state.ids.push(key);
            }
            state.entities[key] = entity;
        }
        function setManyMutably(newEntities, state) {
            newEntities = ensureEntitiesArray(newEntities);
            for (var _c = 0, newEntities_3 = newEntities; _c < newEntities_3.length; _c++) {
                var entity = newEntities_3[_c];
                setOneMutably(entity, state);
            }
        }
        function setAllMutably(newEntities, state) {
            newEntities = ensureEntitiesArray(newEntities);
            state.ids = [];
            state.entities = {};
            addManyMutably(newEntities, state);
        }
        function removeOneMutably(key, state) {
            return removeManyMutably([key], state);
        }
        function removeManyMutably(keys, state) {
            var didMutate = false;
            keys.forEach(function (key) {
                if (key in state.entities) {
                    delete state.entities[key];
                    didMutate = true;
                }
            });
            if (didMutate) {
                state.ids = state.ids.filter(function (id) { return id in state.entities; });
            }
        }
        function removeAllMutably(state) {
            Object.assign(state, {
                ids: [],
                entities: {}
            });
        }
        function takeNewKey(keys, update, state) {
            var original = state.entities[update.id];
            var updated = Object.assign({}, original, update.changes);
            var newKey = selectIdValue(updated, selectId);
            var hasNewKey = newKey !== update.id;
            if (hasNewKey) {
                keys[update.id] = newKey;
                delete state.entities[update.id];
            }
            state.entities[newKey] = updated;
            return hasNewKey;
        }
        function updateOneMutably(update, state) {
            return updateManyMutably([update], state);
        }
        function updateManyMutably(updates, state) {
            var newKeys = {};
            var updatesPerEntity = {};
            updates.forEach(function (update) {
                if (update.id in state.entities) {
                    updatesPerEntity[update.id] = {
                        id: update.id,
                        changes: __spreadValues(__spreadValues({}, updatesPerEntity[update.id] ? updatesPerEntity[update.id].changes : null), update.changes)
                    };
                }
            });
            updates = Object.values(updatesPerEntity);
            var didMutateEntities = updates.length > 0;
            if (didMutateEntities) {
                var didMutateIds = updates.filter(function (update) { return takeNewKey(newKeys, update, state); }).length > 0;
                if (didMutateIds) {
                    state.ids = Object.keys(state.entities);
                }
            }
        }
        function upsertOneMutably(entity, state) {
            return upsertManyMutably([entity], state);
        }
        function upsertManyMutably(newEntities, state) {
            var _c = splitAddedUpdatedEntities(newEntities, selectId, state), added = _c[0], updated = _c[1];
            updateManyMutably(updated, state);
            addManyMutably(added, state);
        }
        return {
            removeAll: createSingleArgumentStateOperator(removeAllMutably),
            addOne: createStateOperator(addOneMutably),
            addMany: createStateOperator(addManyMutably),
            setOne: createStateOperator(setOneMutably),
            setMany: createStateOperator(setManyMutably),
            setAll: createStateOperator(setAllMutably),
            updateOne: createStateOperator(updateOneMutably),
            updateMany: createStateOperator(updateManyMutably),
            upsertOne: createStateOperator(upsertOneMutably),
            upsertMany: createStateOperator(upsertManyMutably),
            removeOne: createStateOperator(removeOneMutably),
            removeMany: createStateOperator(removeManyMutably)
        };
    }
    // src/entities/sorted_state_adapter.ts
    function createSortedStateAdapter(selectId, sort) {
        var _c = createUnsortedStateAdapter(selectId), removeOne = _c.removeOne, removeMany = _c.removeMany, removeAll = _c.removeAll;
        function addOneMutably(entity, state) {
            return addManyMutably([entity], state);
        }
        function addManyMutably(newEntities, state) {
            newEntities = ensureEntitiesArray(newEntities);
            var models = newEntities.filter(function (model) { return !(selectIdValue(model, selectId) in state.entities); });
            if (models.length !== 0) {
                merge(models, state);
            }
        }
        function setOneMutably(entity, state) {
            return setManyMutably([entity], state);
        }
        function setManyMutably(newEntities, state) {
            newEntities = ensureEntitiesArray(newEntities);
            if (newEntities.length !== 0) {
                merge(newEntities, state);
            }
        }
        function setAllMutably(newEntities, state) {
            newEntities = ensureEntitiesArray(newEntities);
            state.entities = {};
            state.ids = [];
            addManyMutably(newEntities, state);
        }
        function updateOneMutably(update, state) {
            return updateManyMutably([update], state);
        }
        function updateManyMutably(updates, state) {
            var appliedUpdates = false;
            for (var _c = 0, updates_1 = updates; _c < updates_1.length; _c++) {
                var update = updates_1[_c];
                var entity = state.entities[update.id];
                if (!entity) {
                    continue;
                }
                appliedUpdates = true;
                Object.assign(entity, update.changes);
                var newId = selectId(entity);
                if (update.id !== newId) {
                    delete state.entities[update.id];
                    state.entities[newId] = entity;
                }
            }
            if (appliedUpdates) {
                resortEntities(state);
            }
        }
        function upsertOneMutably(entity, state) {
            return upsertManyMutably([entity], state);
        }
        function upsertManyMutably(newEntities, state) {
            var _c = splitAddedUpdatedEntities(newEntities, selectId, state), added = _c[0], updated = _c[1];
            updateManyMutably(updated, state);
            addManyMutably(added, state);
        }
        function areArraysEqual(a2, b2) {
            if (a2.length !== b2.length) {
                return false;
            }
            for (var i2 = 0; i2 < a2.length && i2 < b2.length; i2++) {
                if (a2[i2] === b2[i2]) {
                    continue;
                }
                return false;
            }
            return true;
        }
        function merge(models, state) {
            models.forEach(function (model) {
                state.entities[selectId(model)] = model;
            });
            resortEntities(state);
        }
        function resortEntities(state) {
            var allEntities = Object.values(state.entities);
            allEntities.sort(sort);
            var newSortedIds = allEntities.map(selectId);
            var ids = state.ids;
            if (!areArraysEqual(ids, newSortedIds)) {
                state.ids = newSortedIds;
            }
        }
        return {
            removeOne: removeOne,
            removeMany: removeMany,
            removeAll: removeAll,
            addOne: createStateOperator(addOneMutably),
            updateOne: createStateOperator(updateOneMutably),
            upsertOne: createStateOperator(upsertOneMutably),
            setOne: createStateOperator(setOneMutably),
            setMany: createStateOperator(setManyMutably),
            setAll: createStateOperator(setAllMutably),
            addMany: createStateOperator(addManyMutably),
            updateMany: createStateOperator(updateManyMutably),
            upsertMany: createStateOperator(upsertManyMutably)
        };
    }
    // src/entities/create_adapter.ts
    function createEntityAdapter(options) {
        if (options === void 0) { options = {}; }
        var _c = __spreadValues({
            sortComparer: false,
            selectId: function (instance) { return instance.id; }
        }, options), selectId = _c.selectId, sortComparer = _c.sortComparer;
        var stateFactory = createInitialStateFactory();
        var selectorsFactory = createSelectorsFactory();
        var stateAdapter = sortComparer ? createSortedStateAdapter(selectId, sortComparer) : createUnsortedStateAdapter(selectId);
        return __spreadValues(__spreadValues(__spreadValues({
            selectId: selectId,
            sortComparer: sortComparer
        }, stateFactory), selectorsFactory), stateAdapter);
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
            for (var _c = 0, commonProperties_1 = commonProperties; _c < commonProperties_1.length; _c++) {
                var property = commonProperties_1[_c];
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
                    var promise2 = function () {
                        return __async(this, null, function () {
                            var _a, _b, finalAction, conditionResult, abortedPromise, err_1, skipDispatch;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _c.trys.push([0, 4, , 5]);
                                        conditionResult = (_a = options == null ? void 0 : options.condition) == null ? void 0 : _a.call(options, arg, { getState: getState, extra: extra });
                                        if (!isThenable(conditionResult)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, conditionResult];
                                    case 1:
                                        conditionResult = _c.sent();
                                        _c.label = 2;
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
                                        finalAction = _c.sent();
                                        return [3 /*break*/, 5];
                                    case 4:
                                        err_1 = _c.sent();
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
                    return Object.assign(promise2, {
                        abort: abort,
                        requestId: requestId,
                        arg: arg,
                        unwrap: function () {
                            return promise2.then(unwrapResult);
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
        for (var _c = 0; _c < arguments.length; _c++) {
            matchers[_c] = arguments[_c];
        }
        return function (action) {
            return matchers.some(function (matcher) { return matches(matcher, action); });
        };
    }
    function isAllOf() {
        var matchers = [];
        for (var _c = 0; _c < arguments.length; _c++) {
            matchers[_c] = arguments[_c];
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
        for (var _c = 0; _c < arguments.length; _c++) {
            asyncThunks[_c] = arguments[_c];
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
        for (var _c = 0; _c < arguments.length; _c++) {
            asyncThunks[_c] = arguments[_c];
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
        for (var _c = 0; _c < arguments.length; _c++) {
            asyncThunks[_c] = arguments[_c];
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
        for (var _c = 0; _c < arguments.length; _c++) {
            asyncThunks[_c] = arguments[_c];
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
        for (var _c = 0; _c < arguments.length; _c++) {
            asyncThunks[_c] = arguments[_c];
        }
        if (asyncThunks.length === 0) {
            return function (action) { return hasExpectedRequestMetadata(action, ["pending", "fulfilled", "rejected"]); };
        }
        if (!isAsyncThunkArray(asyncThunks)) {
            return isAsyncThunkAction()(asyncThunks[0]);
        }
        return function (action) {
            var matchers = [];
            for (var _c = 0, asyncThunks_1 = asyncThunks; _c < asyncThunks_1.length; _c++) {
                var asyncThunk = asyncThunks_1[_c];
                matchers.push(asyncThunk.pending, asyncThunk.rejected, asyncThunk.fulfilled);
            }
            var combinedMatcher = isAnyOf.apply(void 0, matchers);
            return combinedMatcher(action);
        };
    }
    // src/listenerMiddleware/utils.ts
    var assertFunction = function (func, expected) {
        if (typeof func !== "function") {
            throw new TypeError(expected + " is not a function");
        }
    };
    var noop = function () {
    };
    var catchRejection = function (promise2, onError) {
        if (onError === void 0) { onError = noop; }
        promise2.catch(onError);
        return promise2;
    };
    var addAbortSignalListener = function (abortSignal, callback) {
        abortSignal.addEventListener("abort", callback, { once: true });
        return function () { return abortSignal.removeEventListener("abort", callback); };
    };
    var abortControllerWithReason = function (abortController, reason) {
        var signal = abortController.signal;
        if (signal.aborted) {
            return;
        }
        if (!("reason" in signal)) {
            Object.defineProperty(signal, "reason", {
                enumerable: true,
                value: reason,
                configurable: true,
                writable: true
            });
        }
        abortController.abort(reason);
    };
    // src/listenerMiddleware/exceptions.ts
    var task = "task";
    var listener = "listener";
    var completed = "completed";
    var cancelled = "cancelled";
    var taskCancelled = "task-" + cancelled;
    var taskCompleted = "task-" + completed;
    var listenerCancelled = listener + "-" + cancelled;
    var listenerCompleted = listener + "-" + completed;
    var TaskAbortError = /** @class */ (function () {
        function TaskAbortError(code) {
            this.code = code;
            this.name = "TaskAbortError";
            this.message = task + " " + cancelled + " (reason: " + code + ")";
        }
        return TaskAbortError;
    }());
    // src/listenerMiddleware/task.ts
    var validateActive = function (signal) {
        if (signal.aborted) {
            throw new TaskAbortError(signal.reason);
        }
    };
    function raceWithSignal(signal, promise2) {
        var cleanup = noop;
        return new Promise(function (resolve, reject) {
            var notifyRejection = function () { return reject(new TaskAbortError(signal.reason)); };
            if (signal.aborted) {
                notifyRejection();
                return;
            }
            cleanup = addAbortSignalListener(signal, notifyRejection);
            promise2.finally(function () { return cleanup(); }).then(resolve, reject);
        }).finally(function () {
            cleanup = noop;
        });
    }
    var runTask = function (task2, cleanUp) { return __async(void 0, null, function () {
        var value, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, Promise.resolve()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, task2()];
                case 2:
                    value = _c.sent();
                    return [2 /*return*/, {
                            status: "ok",
                            value: value
                        }];
                case 3:
                    error_1 = _c.sent();
                    return [2 /*return*/, {
                            status: error_1 instanceof TaskAbortError ? "cancelled" : "rejected",
                            error: error_1
                        }];
                case 4:
                    cleanUp == null ? void 0 : cleanUp();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var createPause = function (signal) {
        return function (promise2) {
            return catchRejection(raceWithSignal(signal, promise2).then(function (output) {
                validateActive(signal);
                return output;
            }));
        };
    };
    var createDelay = function (signal) {
        var pause = createPause(signal);
        return function (timeoutMs) {
            return pause(new Promise(function (resolve) { return setTimeout(resolve, timeoutMs); }));
        };
    };
    // src/listenerMiddleware/index.ts
    var assign = Object.assign;
    var INTERNAL_NIL_TOKEN = {};
    var alm = "listenerMiddleware";
    var createFork = function (parentAbortSignal, parentBlockingPromises) {
        var linkControllers = function (controller) { return addAbortSignalListener(parentAbortSignal, function () { return abortControllerWithReason(controller, parentAbortSignal.reason); }); };
        return function (taskExecutor, opts) {
            assertFunction(taskExecutor, "taskExecutor");
            var childAbortController = new AbortController();
            linkControllers(childAbortController);
            var result = runTask(function () { return __async(void 0, null, function () {
                var result2;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            validateActive(parentAbortSignal);
                            validateActive(childAbortController.signal);
                            return [4 /*yield*/, taskExecutor({
                                    pause: createPause(childAbortController.signal),
                                    delay: createDelay(childAbortController.signal),
                                    signal: childAbortController.signal
                                })];
                        case 1:
                            result2 = _c.sent();
                            validateActive(childAbortController.signal);
                            return [2 /*return*/, result2];
                    }
                });
            }); }, function () { return abortControllerWithReason(childAbortController, taskCompleted); });
            if (opts == null ? void 0 : opts.autoJoin) {
                parentBlockingPromises.push(result);
            }
            return {
                result: createPause(parentAbortSignal)(result),
                cancel: function () {
                    abortControllerWithReason(childAbortController, taskCancelled);
                }
            };
        };
    };
    var createTakePattern = function (startListening, signal) {
        var take = function (predicate, timeout) { return __async(void 0, null, function () {
            var unsubscribe, tuplePromise, promises, output;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        validateActive(signal);
                        unsubscribe = function () {
                        };
                        tuplePromise = new Promise(function (resolve, reject) {
                            var stopListening = startListening({
                                predicate: predicate,
                                effect: function (action, listenerApi) {
                                    listenerApi.unsubscribe();
                                    resolve([
                                        action,
                                        listenerApi.getState(),
                                        listenerApi.getOriginalState()
                                    ]);
                                }
                            });
                            unsubscribe = function () {
                                stopListening();
                                reject();
                            };
                        });
                        promises = [
                            tuplePromise
                        ];
                        if (timeout != null) {
                            promises.push(new Promise(function (resolve) { return setTimeout(resolve, timeout, null); }));
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, raceWithSignal(signal, Promise.race(promises))];
                    case 2:
                        output = _c.sent();
                        validateActive(signal);
                        return [2 /*return*/, output];
                    case 3:
                        unsubscribe();
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        return function (predicate, timeout) { return catchRejection(take(predicate, timeout)); };
    };
    var getListenerEntryPropsFrom = function (options) {
        var type = options.type, actionCreator = options.actionCreator, matcher = options.matcher, predicate = options.predicate, effect = options.effect;
        if (type) {
            predicate = createAction(type).match;
        }
        else if (actionCreator) {
            type = actionCreator.type;
            predicate = actionCreator.match;
        }
        else if (matcher) {
            predicate = matcher;
        }
        else if (predicate) ;
        else {
            throw new Error("Creating or removing a listener requires one of the known fields for matching an action");
        }
        assertFunction(effect, "options.listener");
        return { predicate: predicate, type: type, effect: effect };
    };
    var createListenerEntry = function (options) {
        var _c = getListenerEntryPropsFrom(options), type = _c.type, predicate = _c.predicate, effect = _c.effect;
        var id = nanoid();
        var entry = {
            id: id,
            effect: effect,
            type: type,
            predicate: predicate,
            pending: new Set(),
            unsubscribe: function () {
                throw new Error("Unsubscribe not initialized");
            }
        };
        return entry;
    };
    var cancelActiveListeners = function (entry) {
        entry.pending.forEach(function (controller) {
            abortControllerWithReason(controller, listenerCancelled);
        });
    };
    var createClearListenerMiddleware = function (listenerMap) {
        return function () {
            listenerMap.forEach(cancelActiveListeners);
            listenerMap.clear();
        };
    };
    var safelyNotifyError = function (errorHandler, errorToNotify, errorInfo) {
        try {
            errorHandler(errorToNotify, errorInfo);
        }
        catch (errorHandlerError) {
            setTimeout(function () {
                throw errorHandlerError;
            }, 0);
        }
    };
    var addListener = createAction(alm + "/add");
    var clearAllListeners = createAction(alm + "/removeAll");
    var removeListener = createAction(alm + "/remove");
    var defaultErrorHandler = function () {
        var args = [];
        for (var _c = 0; _c < arguments.length; _c++) {
            args[_c] = arguments[_c];
        }
        console.error.apply(console, __spreadArray([alm + "/error"], args));
    };
    function createListenerMiddleware(middlewareOptions) {
        var _this = this;
        if (middlewareOptions === void 0) { middlewareOptions = {}; }
        var listenerMap = new Map();
        var extra = middlewareOptions.extra, _c = middlewareOptions.onError, onError = _c === void 0 ? defaultErrorHandler : _c;
        assertFunction(onError, "onError");
        var insertEntry = function (entry) {
            entry.unsubscribe = function () { return listenerMap.delete(entry.id); };
            listenerMap.set(entry.id, entry);
            return function (cancelOptions) {
                entry.unsubscribe();
                if (cancelOptions == null ? void 0 : cancelOptions.cancelActive) {
                    cancelActiveListeners(entry);
                }
            };
        };
        var findListenerEntry = function (comparator) {
            for (var _c = 0, _d = Array.from(listenerMap.values()); _c < _d.length; _c++) {
                var entry = _d[_c];
                if (comparator(entry)) {
                    return entry;
                }
            }
            return void 0;
        };
        var startListening = function (options) {
            var entry = findListenerEntry(function (existingEntry) { return existingEntry.effect === options.effect; });
            if (!entry) {
                entry = createListenerEntry(options);
            }
            return insertEntry(entry);
        };
        var stopListening = function (options) {
            var _c = getListenerEntryPropsFrom(options), type = _c.type, effect = _c.effect, predicate = _c.predicate;
            var entry = findListenerEntry(function (entry2) {
                var matchPredicateOrType = typeof type === "string" ? entry2.type === type : entry2.predicate === predicate;
                return matchPredicateOrType && entry2.effect === effect;
            });
            if (entry) {
                entry.unsubscribe();
                if (options.cancelActive) {
                    cancelActiveListeners(entry);
                }
            }
            return !!entry;
        };
        var notifyListener = function (entry, action, api, getOriginalState) { return __async(_this, null, function () {
            var internalTaskController, take, autoJoinPromises, listenerError_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        internalTaskController = new AbortController();
                        take = createTakePattern(startListening, internalTaskController.signal);
                        autoJoinPromises = [];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, 4, 6]);
                        entry.pending.add(internalTaskController);
                        return [4 /*yield*/, Promise.resolve(entry.effect(action, assign({}, api, {
                                getOriginalState: getOriginalState,
                                condition: function (predicate, timeout) { return take(predicate, timeout).then(Boolean); },
                                take: take,
                                delay: createDelay(internalTaskController.signal),
                                pause: createPause(internalTaskController.signal),
                                extra: extra,
                                signal: internalTaskController.signal,
                                fork: createFork(internalTaskController.signal, autoJoinPromises),
                                unsubscribe: entry.unsubscribe,
                                subscribe: function () {
                                    listenerMap.set(entry.id, entry);
                                },
                                cancelActiveListeners: function () {
                                    entry.pending.forEach(function (controller, _2, set) {
                                        if (controller !== internalTaskController) {
                                            abortControllerWithReason(controller, listenerCancelled);
                                            set.delete(controller);
                                        }
                                    });
                                }
                            })))];
                    case 2:
                        _c.sent();
                        return [3 /*break*/, 6];
                    case 3:
                        listenerError_1 = _c.sent();
                        if (!(listenerError_1 instanceof TaskAbortError)) {
                            safelyNotifyError(onError, listenerError_1, {
                                raisedBy: "effect"
                            });
                        }
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, Promise.allSettled(autoJoinPromises)];
                    case 5:
                        _c.sent();
                        abortControllerWithReason(internalTaskController, listenerCompleted);
                        entry.pending.delete(internalTaskController);
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        var clearListenerMiddleware = createClearListenerMiddleware(listenerMap);
        var middleware = function (api) { return function (next) { return function (action) {
            if (!isAction(action)) {
                return next(action);
            }
            if (addListener.match(action)) {
                return startListening(action.payload);
            }
            if (clearAllListeners.match(action)) {
                clearListenerMiddleware();
                return;
            }
            if (removeListener.match(action)) {
                return stopListening(action.payload);
            }
            var originalState = api.getState();
            var getOriginalState = function () {
                if (originalState === INTERNAL_NIL_TOKEN) {
                    throw new Error(alm + ": getOriginalState can only be called synchronously");
                }
                return originalState;
            };
            var result;
            try {
                result = next(action);
                if (listenerMap.size > 0) {
                    var currentState = api.getState();
                    var listenerEntries = Array.from(listenerMap.values());
                    for (var _c = 0, listenerEntries_1 = listenerEntries; _c < listenerEntries_1.length; _c++) {
                        var entry = listenerEntries_1[_c];
                        var runListener = false;
                        try {
                            runListener = entry.predicate(action, currentState, originalState);
                        }
                        catch (predicateError) {
                            runListener = false;
                            safelyNotifyError(onError, predicateError, {
                                raisedBy: "predicate"
                            });
                        }
                        if (!runListener) {
                            continue;
                        }
                        notifyListener(entry, action, api, getOriginalState);
                    }
                }
            }
            finally {
                originalState = INTERNAL_NIL_TOKEN;
            }
            return result;
        }; }; };
        return {
            middleware: middleware,
            startListening: startListening,
            stopListening: stopListening,
            clearListeners: clearListenerMiddleware
        };
    }
    // src/autoBatchEnhancer.ts
    var SHOULD_AUTOBATCH = "RTK_autoBatch";
    var prepareAutoBatched = function () { return function (payload) {
        var _c;
        return ({
            payload: payload,
            meta: (_c = {}, _c[SHOULD_AUTOBATCH] = true, _c)
        });
    }; };
    var promise;
    var queueMicrotaskShim = typeof queueMicrotask === "function" ? queueMicrotask.bind(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : globalThis) : function (cb) { return (promise || (promise = Promise.resolve())).then(cb).catch(function (err) { return setTimeout(function () {
        throw err;
    }, 0); }); };
    var createQueueWithTimer = function (timeout) {
        return function (notify) {
            setTimeout(notify, timeout);
        };
    };
    var rAF = typeof window !== "undefined" && window.requestAnimationFrame ? window.requestAnimationFrame : createQueueWithTimer(10);
    var autoBatchEnhancer = function (options) {
        if (options === void 0) { options = { type: "raf" }; }
        return function (next) { return function () {
            var args = [];
            for (var _c = 0; _c < arguments.length; _c++) {
                args[_c] = arguments[_c];
            }
            var store = next.apply(void 0, args);
            var notifying = true;
            var shouldNotifyAtEndOfTick = false;
            var notificationQueued = false;
            var listeners = new Set();
            var queueCallback = options.type === "tick" ? queueMicrotaskShim : options.type === "raf" ? rAF : options.type === "callback" ? options.queueNotification : createQueueWithTimer(options.timeout);
            var notifyListeners = function () {
                notificationQueued = false;
                if (shouldNotifyAtEndOfTick) {
                    shouldNotifyAtEndOfTick = false;
                    listeners.forEach(function (l2) { return l2(); });
                }
            };
            return Object.assign({}, store, {
                subscribe: function (listener2) {
                    var wrappedListener = function () { return notifying && listener2(); };
                    var unsubscribe = store.subscribe(wrappedListener);
                    listeners.add(listener2);
                    return function () {
                        unsubscribe();
                        listeners.delete(listener2);
                    };
                },
                dispatch: function (action) {
                    var _a;
                    try {
                        notifying = !((_a = action == null ? void 0 : action.meta) == null ? void 0 : _a[SHOULD_AUTOBATCH]);
                        shouldNotifyAtEndOfTick = !notifying;
                        if (shouldNotifyAtEndOfTick) {
                            if (!notificationQueued) {
                                notificationQueued = true;
                                queueCallback(notifyListeners);
                            }
                        }
                        return store.dispatch(action);
                    }
                    finally {
                        notifying = true;
                    }
                }
            });
        }; };
    };
    // src/index.ts
    F();

    exports.EnhancerArray = EnhancerArray;
    exports.MiddlewareArray = MiddlewareArray;
    exports.SHOULD_AUTOBATCH = SHOULD_AUTOBATCH;
    exports.TaskAbortError = TaskAbortError;
    exports.__DO_NOT_USE__ActionTypes = ActionTypes;
    exports.addListener = addListener;
    exports.applyMiddleware = applyMiddleware;
    exports.autoBatchEnhancer = autoBatchEnhancer;
    exports.bindActionCreators = bindActionCreators;
    exports.clearAllListeners = clearAllListeners;
    exports.combineReducers = combineReducers;
    exports.compose = compose;
    exports.configureStore = configureStore;
    exports.createAction = createAction;
    exports.createActionCreatorInvariantMiddleware = createActionCreatorInvariantMiddleware;
    exports.createAsyncThunk = createAsyncThunk;
    exports.createDraftSafeSelector = createDraftSafeSelector;
    exports.createEntityAdapter = createEntityAdapter;
    exports.createImmutableStateInvariantMiddleware = createImmutableStateInvariantMiddleware;
    exports.createListenerMiddleware = createListenerMiddleware;
    exports.createNextState = immer_esm_default;
    exports.createReducer = createReducer;
    exports.createSelector = createSelector;
    exports.createSerializableStateInvariantMiddleware = createSerializableStateInvariantMiddleware;
    exports.createSlice = createSlice;
    exports.createStore = createStore;
    exports.current = R;
    exports.findNonSerializableValue = findNonSerializableValue;
    exports.freeze = d;
    exports.getDefaultMiddleware = getDefaultMiddleware;
    exports.getType = getType;
    exports.isAction = isAction;
    exports.isActionCreator = isActionCreator;
    exports.isAllOf = isAllOf;
    exports.isAnyOf = isAnyOf;
    exports.isAsyncThunkAction = isAsyncThunkAction;
    exports.isDraft = r;
    exports.isFluxStandardAction = isFSA;
    exports.isFulfilled = isFulfilled;
    exports.isImmutableDefault = isImmutableDefault;
    exports.isPending = isPending;
    exports.isPlain = isPlain;
    exports.isPlainObject = isPlainObject2;
    exports.isRejected = isRejected;
    exports.isRejectedWithValue = isRejectedWithValue;
    exports.legacy_createStore = legacy_createStore;
    exports.miniSerializeError = miniSerializeError;
    exports.nanoid = nanoid;
    exports.original = e;
    exports.prepareAutoBatched = prepareAutoBatched;
    exports.removeListener = removeListener;
    exports.unwrapResult = unwrapResult;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=redux-toolkit.umd.js.map
