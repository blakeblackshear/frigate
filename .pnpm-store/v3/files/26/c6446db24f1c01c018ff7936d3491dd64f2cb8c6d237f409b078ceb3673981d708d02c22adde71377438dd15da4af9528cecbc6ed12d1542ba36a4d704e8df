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
function _type_of(obj) {
    "@swc/helpers - typeof";
    return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
var __typeError = function(msg) {
    throw TypeError(msg);
};
var __accessCheck = function(obj, member, msg) {
    return member.has(obj) || __typeError("Cannot " + msg);
};
var __privateGet = function(obj, member, getter) {
    return __accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = function(obj, member, value) {
    return member.has(obj) ? __typeError("Cannot add the same private member more than once") : _instanceof(member, WeakSet) ? member.add(obj) : member.set(obj, value);
};
var __privateSet = function(obj, member, value, setter) {
    return __accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value;
};
// src/index.ts
var to_string = function(obj) {
    return Object.prototype.toString.call(obj);
};
var is_typed_array = function(value) {
    return ArrayBuffer.isView(value) && !_instanceof(value, DataView);
};
var is_date = function(obj) {
    return to_string(obj) === "[object Date]";
};
var is_regexp = function(obj) {
    return to_string(obj) === "[object RegExp]";
};
var is_error = function(obj) {
    return to_string(obj) === "[object Error]";
};
var is_boolean = function(obj) {
    return to_string(obj) === "[object Boolean]";
};
var is_number = function(obj) {
    return to_string(obj) === "[object Number]";
};
var is_string = function(obj) {
    return to_string(obj) === "[object String]";
};
var is_array = Array.isArray;
var gopd = Object.getOwnPropertyDescriptor;
var is_property_enumerable = Object.prototype.propertyIsEnumerable;
var get_own_property_symbols = Object.getOwnPropertySymbols;
var has_own_property = Object.prototype.hasOwnProperty;
function own_enumerable_keys(obj) {
    var res = Object.keys(obj);
    var symbols = get_own_property_symbols(obj);
    for(var i = 0; i < symbols.length; i++){
        if (is_property_enumerable.call(obj, symbols[i])) {
            res.push(symbols[i]);
        }
    }
    return res;
}
function is_writable(object, key) {
    var _gopd;
    return !((_gopd = gopd(object, key)) === null || _gopd === void 0 ? void 0 : _gopd.writable);
}
function copy(src, options) {
    if ((typeof src === "undefined" ? "undefined" : _type_of(src)) === "object" && src !== null) {
        var dst;
        if (is_array(src)) {
            dst = [];
        } else if (is_date(src)) {
            dst = new Date(src.getTime ? src.getTime() : src);
        } else if (is_regexp(src)) {
            dst = new RegExp(src);
        } else if (is_error(src)) {
            dst = {
                message: src.message
            };
        } else if (is_boolean(src) || is_number(src) || is_string(src)) {
            dst = Object(src);
        } else if (is_typed_array(src)) {
            return src.slice();
        } else {
            dst = Object.create(Object.getPrototypeOf(src));
        }
        var iterator_function = options.includeSymbols ? own_enumerable_keys : Object.keys;
        var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
        try {
            for(var _iterator = iterator_function(src)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                var key = _step.value;
                dst[key] = src[key];
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
        return dst;
    }
    return src;
}
var empty_null = {
    includeSymbols: false,
    immutable: false
};
function walk(root, cb) {
    var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : empty_null;
    var path = [];
    var parents = [];
    var alive = true;
    var iterator_function = options.includeSymbols ? own_enumerable_keys : Object.keys;
    var immutable = !!options.immutable;
    return function walker(node_) {
        var node = immutable ? copy(node_, options) : node_;
        var modifiers = {};
        var keep_going = true;
        var state = {
            node: node,
            node_: node_,
            path: [].concat(path),
            parent: parents[parents.length - 1],
            parents: parents,
            key: path[path.length - 1],
            isRoot: path.length === 0,
            level: path.length,
            circular: void 0,
            isLeaf: false,
            notLeaf: true,
            notRoot: true,
            isFirst: false,
            isLast: false,
            update: function update(x) {
                var stopHere = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : false;
                if (!state.isRoot) {
                    state.parent.node[state.key] = x;
                }
                state.node = x;
                if (stopHere) {
                    keep_going = false;
                }
            },
            delete: function _delete(stopHere) {
                delete state.parent.node[state.key];
                if (stopHere) {
                    keep_going = false;
                }
            },
            remove: function remove(stopHere) {
                if (is_array(state.parent.node)) {
                    state.parent.node.splice(state.key, 1);
                } else {
                    delete state.parent.node[state.key];
                }
                if (stopHere) {
                    keep_going = false;
                }
            },
            keys: null,
            before: function before(f) {
                modifiers.before = f;
            },
            after: function after(f) {
                modifiers.after = f;
            },
            pre: function pre(f) {
                modifiers.pre = f;
            },
            post: function post(f) {
                modifiers.post = f;
            },
            stop: function stop() {
                alive = false;
            },
            block: function block() {
                keep_going = false;
            }
        };
        if (!alive) {
            return state;
        }
        function update_state() {
            if (_type_of(state.node) === "object" && state.node !== null) {
                if (!state.keys || state.node_ !== state.node) {
                    state.keys = iterator_function(state.node);
                }
                state.isLeaf = state.keys.length === 0;
                for(var i = 0; i < parents.length; i++){
                    if (parents[i].node_ === node_) {
                        state.circular = parents[i];
                        break;
                    }
                }
            } else {
                state.isLeaf = true;
                state.keys = null;
            }
            state.notLeaf = !state.isLeaf;
            state.notRoot = !state.isRoot;
        }
        update_state();
        var ret = cb.call(state, state.node);
        if (ret !== void 0 && state.update) {
            state.update(ret);
        }
        if (modifiers.before) {
            modifiers.before.call(state, state.node);
        }
        if (!keep_going) {
            return state;
        }
        if (_type_of(state.node) === "object" && state.node !== null && !state.circular) {
            parents.push(state);
            update_state();
            var _state_keys;
            var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
            try {
                for(var _iterator = Object.entries((_state_keys = state.keys) !== null && _state_keys !== void 0 ? _state_keys : [])[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                    var _step_value = _sliced_to_array(_step.value, 2), index = _step_value[0], key = _step_value[1];
                    var _state_keys1;
                    path.push(key);
                    if (modifiers.pre) {
                        modifiers.pre.call(state, state.node[key], key);
                    }
                    var child = walker(state.node[key]);
                    if (immutable && has_own_property.call(state.node, key) && !is_writable(state.node, key)) {
                        state.node[key] = child.node;
                    }
                    child.isLast = ((_state_keys1 = state.keys) === null || _state_keys1 === void 0 ? void 0 : _state_keys1.length) ? +index === state.keys.length - 1 : false;
                    child.isFirst = +index === 0;
                    if (modifiers.post) {
                        modifiers.post.call(state, child);
                    }
                    path.pop();
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
            parents.pop();
        }
        if (modifiers.after) {
            modifiers.after.call(state, state.node);
        }
        return state;
    }(root).node;
}
var _value, _options;
var Traverse = /*#__PURE__*/ function() {
    "use strict";
    function Traverse(obj) {
        var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : empty_null;
        _class_call_check(this, Traverse);
        // ! Have to keep these public as legacy mode requires them
        __privateAdd(this, _value);
        __privateAdd(this, _options);
        __privateSet(this, _value, obj);
        __privateSet(this, _options, options);
    }
    _create_class(Traverse, [
        {
            /**
   * Get the element at the array `path`.
   */ key: "get",
            value: function get(paths) {
                var node = __privateGet(this, _value);
                for(var i = 0; node && i < paths.length; i++){
                    var key = paths[i];
                    if (!has_own_property.call(node, key) || !__privateGet(this, _options).includeSymbols && (typeof key === "undefined" ? "undefined" : _type_of(key)) === "symbol") {
                        return void 0;
                    }
                    node = node[key];
                }
                return node;
            }
        },
        {
            /**
   * Return whether the element at the array `path` exists.
   */ key: "has",
            value: function has(paths) {
                var node = __privateGet(this, _value);
                for(var i = 0; node && i < paths.length; i++){
                    var key = paths[i];
                    if (!has_own_property.call(node, key) || !__privateGet(this, _options).includeSymbols && (typeof key === "undefined" ? "undefined" : _type_of(key)) === "symbol") {
                        return false;
                    }
                    node = node[key];
                }
                return true;
            }
        },
        {
            /**
   * Set the element at the array `path` to `value`.
   */ key: "set",
            value: function set(path, value) {
                var node = __privateGet(this, _value);
                var i = 0;
                for(i = 0; i < path.length - 1; i++){
                    var key = path[i];
                    if (!has_own_property.call(node, key)) {
                        node[key] = {};
                    }
                    node = node[key];
                }
                node[path[i]] = value;
                return value;
            }
        },
        {
            /**
   * Execute `fn` for each node in the object and return a new object with the results of the walk. To update nodes in the result use `this.update(value)`.
   */ key: "map",
            value: function map(cb) {
                return walk(__privateGet(this, _value), cb, {
                    immutable: true,
                    includeSymbols: !!__privateGet(this, _options).includeSymbols
                });
            }
        },
        {
            /**
   * Execute `fn` for each node in the object but unlike `.map()`, when `this.update()` is called it updates the object in-place.
   */ key: "forEach",
            value: function forEach(cb) {
                __privateSet(this, _value, walk(__privateGet(this, _value), cb, __privateGet(this, _options)));
                return __privateGet(this, _value);
            }
        },
        {
            /**
   * For each node in the object, perform a [left-fold](http://en.wikipedia.org/wiki/Fold_(higher-order_function)) with the return value of `fn(acc, node)`.
   *
   * If `init` isn't specified, `init` is set to the root object for the first step and the root element is skipped.
   */ key: "reduce",
            value: function reduce(cb, init) {
                var skip = arguments.length === 1;
                var acc = skip ? __privateGet(this, _value) : init;
                this.forEach(function(x) {
                    if (!this.isRoot || !skip) {
                        acc = cb.call(this, acc, x);
                    }
                });
                return acc;
            }
        },
        {
            /**
   * Return an `Array` of every possible non-cyclic path in the object.
   * Paths are `Array`s of string keys.
   */ key: "paths",
            value: function paths() {
                var acc = [];
                this.forEach(function() {
                    acc.push(this.path);
                });
                return acc;
            }
        },
        {
            /**
   * Return an `Array` of every node in the object.
   */ key: "nodes",
            value: function nodes() {
                var acc = [];
                this.forEach(function() {
                    acc.push(this.node);
                });
                return acc;
            }
        },
        {
            /**
   * Create a deep clone of the object.
   */ key: "clone",
            value: function clone() {
                var parents = [];
                var nodes = [];
                var options = __privateGet(this, _options);
                if (is_typed_array(__privateGet(this, _value))) {
                    return __privateGet(this, _value).slice();
                }
                return function clone(src) {
                    for(var i = 0; i < parents.length; i++){
                        if (parents[i] === src) {
                            return nodes[i];
                        }
                    }
                    if ((typeof src === "undefined" ? "undefined" : _type_of(src)) === "object" && src !== null) {
                        var dst = copy(src, options);
                        parents.push(src);
                        nodes.push(dst);
                        var iteratorFunction = options.includeSymbols ? own_enumerable_keys : Object.keys;
                        var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                        try {
                            for(var _iterator = iteratorFunction(src)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                                var key = _step.value;
                                dst[key] = clone(src[key]);
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
                        parents.pop();
                        nodes.pop();
                        return dst;
                    }
                    return src;
                }(__privateGet(this, _value));
            }
        }
    ]);
    return Traverse;
}();
_value = new WeakMap();
_options = new WeakMap();
var traverse = function(obj, options) {
    return new Traverse(obj, options);
};
traverse.get = function(obj, paths, options) {
    return new Traverse(obj, options).get(paths);
};
traverse.set = function(obj, path, value, options) {
    return new Traverse(obj, options).set(path, value);
};
traverse.has = function(obj, paths, options) {
    return new Traverse(obj, options).has(paths);
};
traverse.map = function(obj, cb, options) {
    return new Traverse(obj, options).map(cb);
};
traverse.forEach = function(obj, cb, options) {
    return new Traverse(obj, options).forEach(cb);
};
traverse.reduce = function(obj, cb, init, options) {
    return new Traverse(obj, options).reduce(cb, init);
};
traverse.paths = function(obj, options) {
    return new Traverse(obj, options).paths();
};
traverse.nodes = function(obj, options) {
    return new Traverse(obj, options).nodes();
};
traverse.clone = function(obj, options) {
    return new Traverse(obj, options).clone();
};
var src_default = traverse;
// src/legacy.cts

export { src_default as default };
