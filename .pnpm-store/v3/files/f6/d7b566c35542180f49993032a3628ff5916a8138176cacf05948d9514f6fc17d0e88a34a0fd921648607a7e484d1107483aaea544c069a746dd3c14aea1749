"use strict";
/* eslint @typescript-eslint/no-explicit-any: off */
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceNewProxy = exports.affectedToPathList = exports.markToTrack = exports.getUntracked = exports.trackMemo = exports.isChanged = exports.createProxy = void 0;
// symbols
const TRACK_MEMO_SYMBOL = Symbol();
const GET_ORIGINAL_SYMBOL = Symbol();
// properties
const AFFECTED_PROPERTY = 'a';
const IS_TARGET_COPIED_PROPERTY = 'f';
const PROXY_PROPERTY = 'p';
const PROXY_CACHE_PROPERTY = 'c';
const TARGET_CACHE_PROPERTY = 't';
const HAS_KEY_PROPERTY = 'h';
const ALL_OWN_KEYS_PROPERTY = 'w';
const HAS_OWN_KEY_PROPERTY = 'o';
const KEYS_PROPERTY = 'k';
// function to create a new bare proxy
let newProxy = (target, handler) => new Proxy(target, handler);
// get object prototype
const getProto = Object.getPrototypeOf;
const objectsToTrack = new WeakMap();
// check if obj is a plain object or an array
const isObjectToTrack = (obj) => obj &&
    (objectsToTrack.has(obj)
        ? objectsToTrack.get(obj)
        : getProto(obj) === Object.prototype || getProto(obj) === Array.prototype);
// check if it is object
const isObject = (x) => typeof x === 'object' && x !== null;
// Properties that are both non-configurable and non-writable will break
// the proxy get trap when we try to return a recursive/child compare proxy
// from them. We can avoid this by making a copy of the target object with
// all descriptors marked as configurable, see `copyTargetObject`.
// See: https://github.com/dai-shi/proxy-compare/pull/8
const needsToCopyTargetObject = (obj) => Object.values(Object.getOwnPropertyDescriptors(obj)).some((descriptor) => !descriptor.configurable && !descriptor.writable);
// Make a copy with all descriptors marked as configurable.
const copyTargetObject = (obj) => {
    if (Array.isArray(obj)) {
        // Arrays need a special way to copy
        return Array.from(obj);
    }
    // For non-array objects, we create a new object keeping the prototype
    // with changing all configurable options (otherwise, proxies will complain)
    const descriptors = Object.getOwnPropertyDescriptors(obj);
    Object.values(descriptors).forEach((desc) => {
        desc.configurable = true;
    });
    return Object.create(getProto(obj), descriptors);
};
const createProxyHandler = (origObj, isTargetCopied) => {
    const state = {
        [IS_TARGET_COPIED_PROPERTY]: isTargetCopied,
    };
    let trackObject = false; // for trackMemo
    const recordUsage = (type, key) => {
        if (!trackObject) {
            let used = state[AFFECTED_PROPERTY].get(origObj);
            if (!used) {
                used = {};
                state[AFFECTED_PROPERTY].set(origObj, used);
            }
            if (type === ALL_OWN_KEYS_PROPERTY) {
                used[ALL_OWN_KEYS_PROPERTY] = true;
            }
            else {
                let set = used[type];
                if (!set) {
                    set = new Set();
                    used[type] = set;
                }
                set.add(key);
            }
        }
    };
    const recordObjectAsUsed = () => {
        trackObject = true;
        state[AFFECTED_PROPERTY].delete(origObj);
    };
    const handler = {
        get(target, key) {
            if (key === GET_ORIGINAL_SYMBOL) {
                return origObj;
            }
            recordUsage(KEYS_PROPERTY, key);
            return (0, exports.createProxy)(Reflect.get(target, key), state[AFFECTED_PROPERTY], state[PROXY_CACHE_PROPERTY], state[TARGET_CACHE_PROPERTY]);
        },
        has(target, key) {
            if (key === TRACK_MEMO_SYMBOL) {
                recordObjectAsUsed();
                return true;
            }
            recordUsage(HAS_KEY_PROPERTY, key);
            return Reflect.has(target, key);
        },
        getOwnPropertyDescriptor(target, key) {
            recordUsage(HAS_OWN_KEY_PROPERTY, key);
            return Reflect.getOwnPropertyDescriptor(target, key);
        },
        ownKeys(target) {
            recordUsage(ALL_OWN_KEYS_PROPERTY);
            return Reflect.ownKeys(target);
        },
    };
    if (isTargetCopied) {
        handler.set = handler.deleteProperty = () => false;
    }
    return [handler, state];
};
const getOriginalObject = (obj) => 
// unwrap proxy
obj[GET_ORIGINAL_SYMBOL] ||
    // otherwise
    obj;
/**
 * Create a proxy.
 *
 * This function will create a proxy at top level and proxy nested objects as you access them,
 * in order to keep track of which properties were accessed via get/has proxy handlers:
 *
 * NOTE: Printing of WeakMap is hard to inspect and not very readable
 * for this purpose you can use the `affectedToPathList` helper.
 *
 * @param {object} obj - Object that will be wrapped on the proxy.
 * @param {WeakMap<object, unknown>} affected -
 * WeakMap that will hold the tracking of which properties in the proxied object were accessed.
 * @param {WeakMap<object, unknown>} [proxyCache] -
 * WeakMap that will help keep referential identity for proxies.
 * @returns {Proxy<object>} - Object wrapped in a proxy.
 *
 * @example
 * import { createProxy } from 'proxy-compare';
 *
 * const original = { a: "1", c: "2", d: { e: "3" } };
 * const affected = new WeakMap();
 * const proxy = createProxy(original, affected);
 *
 * proxy.a // Will mark as used and track its value.
 * // This will update the affected WeakMap with original as key
 * // and a Set with "a"
 *
 * proxy.d // Will mark "d" as accessed to track and proxy itself ({ e: "3" }).
 * // This will update the affected WeakMap with original as key
 * // and a Set with "d"
 */
const createProxy = (obj, affected, proxyCache, targetCache) => {
    if (!isObjectToTrack(obj))
        return obj;
    let targetAndCopied = targetCache && targetCache.get(obj);
    if (!targetAndCopied) {
        const target = getOriginalObject(obj);
        if (needsToCopyTargetObject(target)) {
            targetAndCopied = [target, copyTargetObject(target)];
        }
        else {
            targetAndCopied = [target];
        }
        targetCache === null || targetCache === void 0 ? void 0 : targetCache.set(obj, targetAndCopied);
    }
    const [target, copiedTarget] = targetAndCopied;
    let handlerAndState = proxyCache && proxyCache.get(target);
    if (!handlerAndState ||
        handlerAndState[1][IS_TARGET_COPIED_PROPERTY] !== !!copiedTarget) {
        handlerAndState = createProxyHandler(target, !!copiedTarget);
        handlerAndState[1][PROXY_PROPERTY] = newProxy(copiedTarget || target, handlerAndState[0]);
        if (proxyCache) {
            proxyCache.set(target, handlerAndState);
        }
    }
    handlerAndState[1][AFFECTED_PROPERTY] = affected;
    handlerAndState[1][PROXY_CACHE_PROPERTY] = proxyCache;
    handlerAndState[1][TARGET_CACHE_PROPERTY] = targetCache;
    return handlerAndState[1][PROXY_PROPERTY];
};
exports.createProxy = createProxy;
const isAllOwnKeysChanged = (prevObj, nextObj) => {
    const prevKeys = Reflect.ownKeys(prevObj);
    const nextKeys = Reflect.ownKeys(nextObj);
    return (prevKeys.length !== nextKeys.length ||
        prevKeys.some((k, i) => k !== nextKeys[i]));
};
/**
 * Compare changes on objects.
 *
 * This will compare the affected properties on tracked objects inside the proxy
 * to check if there were any changes made to it,
 * by default if no property was accessed on the proxy it will attempt to do a
 * reference equality check for the objects provided (Object.is(a, b)). If you access a property
 * on the proxy, then isChanged will only compare the affected properties.
 *
 * @param {object} prevObj - The previous object to compare.
 * @param {object} nextObj - Object to compare with the previous one.
 * @param {WeakMap<object, unknown>} affected -
 * WeakMap that holds the tracking of which properties in the proxied object were accessed.
 * @param {WeakMap<object, unknown>} [cache] -
 * WeakMap that holds a cache of the comparisons for better performance with repetitive comparisons,
 * and to avoid infinite loop with circular structures.
 * @returns {boolean} - Boolean indicating if the affected property on the object has changed.
 *
 * @example
 * import { createProxy, isChanged } from 'proxy-compare';
 *
 * const obj = { a: "1", c: "2", d: { e: "3" } };
 * const affected = new WeakMap();
 *
 * const proxy = createProxy(obj, affected);
 *
 * proxy.a
 *
 * isChanged(obj, { a: "1" }, affected) // false
 *
 * proxy.a = "2"
 *
 * isChanged(obj, { a: "1" }, affected) // true
 */
const isChanged = (prevObj, nextObj, affected, cache, // for object with cycles
isEqual = Object.is) => {
    if (isEqual(prevObj, nextObj)) {
        return false;
    }
    if (!isObject(prevObj) || !isObject(nextObj))
        return true;
    const used = affected.get(getOriginalObject(prevObj));
    if (!used)
        return true;
    if (cache) {
        const hit = cache.get(prevObj);
        if (hit === nextObj) {
            return false;
        }
        // for object with cycles
        cache.set(prevObj, nextObj);
    }
    let changed = null;
    for (const key of used[HAS_KEY_PROPERTY] || []) {
        changed = Reflect.has(prevObj, key) !== Reflect.has(nextObj, key);
        if (changed)
            return changed;
    }
    if (used[ALL_OWN_KEYS_PROPERTY] === true) {
        changed = isAllOwnKeysChanged(prevObj, nextObj);
        if (changed)
            return changed;
    }
    else {
        for (const key of used[HAS_OWN_KEY_PROPERTY] || []) {
            const hasPrev = !!Reflect.getOwnPropertyDescriptor(prevObj, key);
            const hasNext = !!Reflect.getOwnPropertyDescriptor(nextObj, key);
            changed = hasPrev !== hasNext;
            if (changed)
                return changed;
        }
    }
    for (const key of used[KEYS_PROPERTY] || []) {
        changed = (0, exports.isChanged)(prevObj[key], nextObj[key], affected, cache, isEqual);
        if (changed)
            return changed;
    }
    if (changed === null)
        throw new Error('invalid used');
    return changed;
};
exports.isChanged = isChanged;
// explicitly track object with memo
const trackMemo = (obj) => {
    if (isObjectToTrack(obj)) {
        return TRACK_MEMO_SYMBOL in obj;
    }
    return false;
};
exports.trackMemo = trackMemo;
/**
 * Unwrap proxy to get the original object.
 *
 * Used to retrieve the original object used to create the proxy instance with `createProxy`.
 *
 * @param {Proxy<object>} obj -  The proxy wrapper of the originial object.
 * @returns {object | null} - Return either the unwrapped object if exists.
 *
 * @example
 * import { createProxy, getUntracked } from 'proxy-compare';
 *
 * const original = { a: "1", c: "2", d: { e: "3" } };
 * const affected = new WeakMap();
 *
 * const proxy = createProxy(original, affected);
 * const originalFromProxy = getUntracked(proxy)
 *
 * Object.is(original, originalFromProxy) // true
 * isChanged(original, originalFromProxy, affected) // false
 */
const getUntracked = (obj) => {
    if (isObjectToTrack(obj)) {
        return obj[GET_ORIGINAL_SYMBOL] || null;
    }
    return null;
};
exports.getUntracked = getUntracked;
/**
 * Mark object to be tracked.
 *
 * This function marks an object that will be passed into `createProxy`
 * as marked to track or not. By default only Array and Object are marked to track,
 * so this is useful for example to mark a class instance to track or to mark a object
 * to be untracked when creating your proxy.
 *
 * @param obj - Object to mark as tracked or not.
 * @param mark - Boolean indicating whether you want to track this object or not.
 * @returns - No return.
 *
 * @example
 * import { createProxy, markToTrack, isChanged } from 'proxy-compare';
 *
 * const nested = { e: "3" }
 *
 * markToTrack(nested, false)
 *
 * const original = { a: "1", c: "2", d: nested };
 * const affected = new WeakMap();
 *
 * const proxy = createProxy(original, affected);
 *
 * proxy.d.e
 *
 * isChanged(original, { d: { e: "3" } }, affected) // true
 */
const markToTrack = (obj, mark = true) => {
    objectsToTrack.set(obj, mark);
};
exports.markToTrack = markToTrack;
/**
 * Convert `affected` to path list
 *
 * `affected` is a weak map which is not printable.
 * This function is can convert it to printable path list.
 * It's for debugging purpose.
 *
 * @param obj - An object that is used with `createProxy`.
 * @param affected - A weak map that is used with `createProxy`.
 * @param onlyWithValues - An optional boolean to exclude object getters.
 * @returns - An array of paths.
 */
const affectedToPathList = (obj, affected, onlyWithValues) => {
    const list = [];
    const seen = new WeakSet();
    const walk = (x, path) => {
        var _a, _b, _c;
        if (seen.has(x)) {
            // for object with cycles
            return;
        }
        if (isObject(x)) {
            seen.add(x);
        }
        const used = isObject(x) && affected.get(getOriginalObject(x));
        if (used) {
            (_a = used[HAS_KEY_PROPERTY]) === null || _a === void 0 ? void 0 : _a.forEach((key) => {
                const segment = `:has(${String(key)})`;
                list.push(path ? [...path, segment] : [segment]);
            });
            if (used[ALL_OWN_KEYS_PROPERTY] === true) {
                const segment = ':ownKeys';
                list.push(path ? [...path, segment] : [segment]);
            }
            else {
                (_b = used[HAS_OWN_KEY_PROPERTY]) === null || _b === void 0 ? void 0 : _b.forEach((key) => {
                    const segment = `:hasOwn(${String(key)})`;
                    list.push(path ? [...path, segment] : [segment]);
                });
            }
            (_c = used[KEYS_PROPERTY]) === null || _c === void 0 ? void 0 : _c.forEach((key) => {
                if (!onlyWithValues ||
                    'value' in (Object.getOwnPropertyDescriptor(x, key) || {})) {
                    walk(x[key], path ? [...path, key] : [key]);
                }
            });
        }
        else if (path) {
            list.push(path);
        }
    };
    walk(obj);
    return list;
};
exports.affectedToPathList = affectedToPathList;
/**
 * replace newProxy function.
 *
 * This can be used if you want to use proxy-polyfill.
 * Note that proxy-polyfill can't polyfill everything.
 * Use it at your own risk.
 */
const replaceNewProxy = (fn) => {
    newProxy = fn;
};
exports.replaceNewProxy = replaceNewProxy;
