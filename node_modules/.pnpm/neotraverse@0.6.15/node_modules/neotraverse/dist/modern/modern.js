// src/modern.ts
var to_string = (obj) => Object.prototype.toString.call(obj);
var is_typed_array = (value) => ArrayBuffer.isView(value) && !(value instanceof DataView);
var is_date = (obj) => to_string(obj) === "[object Date]";
var is_regexp = (obj) => to_string(obj) === "[object RegExp]";
var is_error = (obj) => to_string(obj) === "[object Error]";
var is_boolean = (obj) => to_string(obj) === "[object Boolean]";
var is_number = (obj) => to_string(obj) === "[object Number]";
var is_string = (obj) => to_string(obj) === "[object String]";
var is_array = Array.isArray;
var gopd = Object.getOwnPropertyDescriptor;
var is_property_enumerable = Object.prototype.propertyIsEnumerable;
var get_own_property_symbols = Object.getOwnPropertySymbols;
var has_own_property = Object.prototype.hasOwnProperty;
var object_keys = Object.keys;
function own_enumerable_keys(obj) {
  const res = object_keys(obj);
  const symbols = get_own_property_symbols(obj);
  for (let i = 0; i < symbols.length; i++) {
    if (is_property_enumerable.call(obj, symbols[i])) {
      res.push(symbols[i]);
    }
  }
  return res;
}
function is_writable(object, key) {
  return !gopd(object, key)?.writable;
}
function copy(src, options) {
  if (typeof src === "object" && src !== null) {
    let dst;
    if (is_array(src)) {
      dst = [];
    } else if (is_date(src)) {
      dst = new Date(src.getTime ? src.getTime() : src);
    } else if (is_regexp(src)) {
      dst = new RegExp(src);
    } else if (is_error(src)) {
      dst = { message: src.message };
    } else if (is_boolean(src) || is_number(src) || is_string(src)) {
      dst = Object(src);
    } else if (is_typed_array(src)) {
      return src.slice();
    } else {
      dst = Object.create(Object.getPrototypeOf(src));
    }
    const iterator_function = options.includeSymbols ? own_enumerable_keys : object_keys;
    for (const key of iterator_function(src)) {
      dst[key] = src[key];
    }
    return dst;
  }
  return src;
}
var empty_null = {
  includeSymbols: false,
  immutable: false
};
function walk(root, cb, options = empty_null) {
  const path = [];
  const parents = [];
  let alive = true;
  const iterator_function = options.includeSymbols ? own_enumerable_keys : object_keys;
  const immutable = !!options.immutable;
  return function walker(node_) {
    const node = immutable ? copy(node_, options) : node_;
    const modifiers = {};
    let keep_going = true;
    const state = {
      node,
      node_,
      path: [].concat(path),
      parent: parents[parents.length - 1],
      parents,
      key: path[path.length - 1],
      isRoot: path.length === 0,
      level: path.length,
      circular: void 0,
      isLeaf: false,
      notLeaf: true,
      notRoot: true,
      isFirst: false,
      isLast: false,
      update: function(x, stopHere = false) {
        if (!state.isRoot) {
          state.parent.node[state.key] = x;
        }
        state.node = x;
        if (stopHere) {
          keep_going = false;
        }
      },
      delete: function(stopHere) {
        delete state.parent.node[state.key];
        if (stopHere) {
          keep_going = false;
        }
      },
      remove: function(stopHere) {
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
      before: function(f) {
        modifiers.before = f;
      },
      after: function(f) {
        modifiers.after = f;
      },
      pre: function(f) {
        modifiers.pre = f;
      },
      post: function(f) {
        modifiers.post = f;
      },
      stop: function() {
        alive = false;
      },
      block: function() {
        keep_going = false;
      }
    };
    if (!alive) {
      return state;
    }
    function update_state() {
      if (typeof state.node === "object" && state.node !== null) {
        if (!state.keys || state.node_ !== state.node) {
          state.keys = iterator_function(state.node);
        }
        state.isLeaf = state.keys.length === 0;
        for (let i = 0; i < parents.length; i++) {
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
    const ret = cb(state, state.node);
    if (ret !== void 0 && state.update) {
      state.update(ret);
    }
    if (modifiers.before) {
      modifiers.before(state, state.node);
    }
    if (!keep_going) {
      return state;
    }
    if (typeof state.node === "object" && state.node !== null && !state.circular) {
      parents.push(state);
      update_state();
      for (const [index, key] of Object.entries(state.keys ?? [])) {
        path.push(key);
        if (modifiers.pre) {
          modifiers.pre(state, state.node[key], key);
        }
        const child = walker(state.node[key]);
        if (immutable && has_own_property.call(state.node, key) && !is_writable(state.node, key)) {
          state.node[key] = child.node;
        }
        child.isLast = state.keys?.length ? +index === state.keys.length - 1 : false;
        child.isFirst = +index === 0;
        if (modifiers.post) {
          modifiers.post(state, child);
        }
        path.pop();
      }
      parents.pop();
    }
    if (modifiers.after) {
      modifiers.after(state, state.node);
    }
    return state;
  }(root).node;
}
var Traverse = class {
  #value;
  #options;
  constructor(obj, options = empty_null) {
    this.#value = obj;
    this.#options = options;
  }
  /**
   * Get the element at the array `path`.
   */
  get(paths) {
    let node = this.#value;
    for (let i = 0; node && i < paths.length; i++) {
      const key = paths[i];
      if (!has_own_property.call(node, key) || !this.#options.includeSymbols && typeof key === "symbol") {
        return void 0;
      }
      node = node[key];
    }
    return node;
  }
  /**
   * Return whether the element at the array `path` exists.
   */
  has(paths) {
    let node = this.#value;
    for (let i = 0; node && i < paths.length; i++) {
      const key = paths[i];
      if (!has_own_property.call(node, key) || !this.#options.includeSymbols && typeof key === "symbol") {
        return false;
      }
      node = node[key];
    }
    return true;
  }
  /**
   * Set the element at the array `path` to `value`.
   */
  set(path, value) {
    let node = this.#value;
    let i = 0;
    for (i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!has_own_property.call(node, key)) {
        node[key] = {};
      }
      node = node[key];
    }
    node[path[i]] = value;
    return value;
  }
  /**
   * Execute `fn` for each node in the object and return a new object with the results of the walk. To update nodes in the result use `this.update(value)`.
   */
  map(cb) {
    return walk(this.#value, cb, {
      immutable: true,
      includeSymbols: !!this.#options.includeSymbols
    });
  }
  /**
   * Execute `fn` for each node in the object but unlike `.map()`, when `this.update()` is called it updates the object in-place.
   */
  forEach(cb) {
    this.#value = walk(this.#value, cb, this.#options);
    return this.#value;
  }
  /**
   * For each node in the object, perform a [left-fold](http://en.wikipedia.org/wiki/Fold_(higher-order_function)) with the return value of `fn(acc, node)`.
   *
   * If `init` isn't specified, `init` is set to the root object for the first step and the root element is skipped.
   */
  reduce(cb, init) {
    const skip = arguments.length === 1;
    let acc = skip ? this.#value : init;
    this.forEach((ctx, x) => {
      if (!ctx.isRoot || !skip) {
        acc = cb(ctx, acc, x);
      }
    });
    return acc;
  }
  /**
   * Return an `Array` of every possible non-cyclic path in the object.
   * Paths are `Array`s of string keys.
   */
  paths() {
    const acc = [];
    this.forEach((ctx) => {
      acc.push(ctx.path);
    });
    return acc;
  }
  /**
   * Return an `Array` of every node in the object.
   */
  nodes() {
    const acc = [];
    this.forEach((ctx) => {
      acc.push(ctx.node);
    });
    return acc;
  }
  /**
   * Create a deep clone of the object.
   */
  clone() {
    const parents = [];
    const nodes = [];
    const options = this.#options;
    if (is_typed_array(this.#value)) {
      return this.#value.slice();
    }
    return function clone(src) {
      for (let i = 0; i < parents.length; i++) {
        if (parents[i] === src) {
          return nodes[i];
        }
      }
      if (typeof src === "object" && src !== null) {
        const dst = copy(src, options);
        parents.push(src);
        nodes.push(dst);
        const iteratorFunction = options.includeSymbols ? own_enumerable_keys : object_keys;
        for (const key of iteratorFunction(src)) {
          dst[key] = clone(src[key]);
        }
        parents.pop();
        nodes.pop();
        return dst;
      }
      return src;
    }(this.#value);
  }
};
export {
  Traverse
};
