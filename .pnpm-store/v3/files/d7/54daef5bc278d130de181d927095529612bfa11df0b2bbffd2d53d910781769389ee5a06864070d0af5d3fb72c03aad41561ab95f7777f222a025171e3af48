(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["fast-equals"] = {}));
})(this, (function (exports) { 'use strict';

  /**
   * Default equality comparator pass-through, used as the standard `isEqual` creator for
   * use inside the built comparator.
   */
  function createDefaultIsNestedEqual(comparator) {
      return function isEqual(a, b, _indexOrKeyA, _indexOrKeyB, _parentA, _parentB, meta) {
          return comparator(a, b, meta);
      };
  }
  /**
   * Wrap the provided `areItemsEqual` method to manage the circular cache, allowing
   * for circular references to be safely included in the comparison without creating
   * stack overflows.
   */
  function createIsCircular(areItemsEqual) {
      return function isCircular(a, b, isEqual, cache) {
          if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
              return areItemsEqual(a, b, isEqual, cache);
          }
          var cachedA = cache.get(a);
          var cachedB = cache.get(b);
          if (cachedA && cachedB) {
              return cachedA === b && cachedB === a;
          }
          cache.set(a, b);
          cache.set(b, a);
          var result = areItemsEqual(a, b, isEqual, cache);
          cache.delete(a);
          cache.delete(b);
          return result;
      };
  }
  /**
   * Targeted shallow merge of two objects.
   *
   * @NOTE
   * This exists as a tinier compiled version of the `__assign` helper that
   * `tsc` injects in case of `Object.assign` not being present.
   */
  function merge(a, b) {
      var merged = {};
      for (var key in a) {
          merged[key] = a[key];
      }
      for (var key in b) {
          merged[key] = b[key];
      }
      return merged;
  }
  /**
   * Whether the value is a plain object.
   *
   * @NOTE
   * This is a same-realm compariosn only.
   */
  function isPlainObject(value) {
      return value.constructor === Object || value.constructor == null;
  }
  /**
   * When the value is `Promise`-like, aka "then-able".
   */
  function isPromiseLike(value) {
      return typeof value.then === 'function';
  }
  /**
   * Whether the values passed are strictly equal or both NaN.
   */
  function sameValueZeroEqual(a, b) {
      return a === b || (a !== a && b !== b);
  }

  var ARGUMENTS_TAG = '[object Arguments]';
  var BOOLEAN_TAG = '[object Boolean]';
  var DATE_TAG = '[object Date]';
  var REG_EXP_TAG = '[object RegExp]';
  var MAP_TAG = '[object Map]';
  var NUMBER_TAG = '[object Number]';
  var OBJECT_TAG = '[object Object]';
  var SET_TAG = '[object Set]';
  var STRING_TAG = '[object String]';
  var toString = Object.prototype.toString;
  function createComparator(_a) {
      var areArraysEqual = _a.areArraysEqual, areDatesEqual = _a.areDatesEqual, areMapsEqual = _a.areMapsEqual, areObjectsEqual = _a.areObjectsEqual, areRegExpsEqual = _a.areRegExpsEqual, areSetsEqual = _a.areSetsEqual, createIsNestedEqual = _a.createIsNestedEqual;
      var isEqual = createIsNestedEqual(comparator);
      /**
       * compare the value of the two objects and return true if they are equivalent in values
       */
      function comparator(a, b, meta) {
          // If the items are strictly equal, no need to do a value comparison.
          if (a === b) {
              return true;
          }
          // If the items are not non-nullish objects, then the only possibility
          // of them being equal but not strictly is if they are both `NaN`. Since
          // `NaN` is uniquely not equal to itself, we can use self-comparison of
          // both objects, which is faster than `isNaN()`.
          if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
              return a !== a && b !== b;
          }
          // Checks are listed in order of commonality of use-case:
          //   1. Common complex object types (plain object, array)
          //   2. Common data values (date, regexp)
          //   3. Less-common complex object types (map, set)
          //   4. Less-common data values (promise, primitive wrappers)
          // Inherently this is both subjective and assumptive, however
          // when reviewing comparable libraries in the wild this order
          // appears to be generally consistent.
          // `isPlainObject` only checks against the object's own realm. Cross-realm
          // comparisons are rare, and will be handled in the ultimate fallback, so
          // we can avoid the `toString.call()` cost unless necessary.
          if (isPlainObject(a) && isPlainObject(b)) {
              return areObjectsEqual(a, b, isEqual, meta);
          }
          // `isArray()` works on subclasses and is cross-realm, so we can again avoid
          // the `toString.call()` cost unless necessary by just checking if either
          // and then both are arrays.
          var aArray = Array.isArray(a);
          var bArray = Array.isArray(b);
          if (aArray || bArray) {
              return aArray === bArray && areArraysEqual(a, b, isEqual, meta);
          }
          // Since this is a custom object, use the classic `toString.call()` to get its
          // type. This is reasonably performant in modern environments like v8 and
          // SpiderMonkey, and allows for cross-realm comparison when other checks like
          // `instanceof` do not.
          var aTag = toString.call(a);
          if (aTag !== toString.call(b)) {
              return false;
          }
          if (aTag === DATE_TAG) {
              // `getTime()` showed better results compared to alternatives like `valueOf()`
              // or the unary `+` operator.
              return areDatesEqual(a, b, isEqual, meta);
          }
          if (aTag === REG_EXP_TAG) {
              return areRegExpsEqual(a, b, isEqual, meta);
          }
          if (aTag === MAP_TAG) {
              return areMapsEqual(a, b, isEqual, meta);
          }
          if (aTag === SET_TAG) {
              return areSetsEqual(a, b, isEqual, meta);
          }
          // If a simple object tag, then we can prioritize a simple object comparison because
          // it is likely a custom class. If an arguments tag, it should be treated as a standard
          // object.
          if (aTag === OBJECT_TAG || aTag === ARGUMENTS_TAG) {
              // The exception for value comparison is `Promise`-like contracts. These should be
              // treated the same as standard `Promise` objects, which means strict equality.
              return isPromiseLike(a) || isPromiseLike(b)
                  ? false
                  : areObjectsEqual(a, b, isEqual, meta);
          }
          // As the penultimate fallback, check if the values passed are primitive wrappers. This
          // is very rare in modern JS, which is why it is deprioritized compared to all other object
          // types.
          if (aTag === BOOLEAN_TAG || aTag === NUMBER_TAG || aTag === STRING_TAG) {
              return sameValueZeroEqual(a.valueOf(), b.valueOf());
          }
          // If not matching any tags that require a specific type of comparison, then we hard-code false because
          // the only thing remaining is strict equality, which has already been compared. This is for a few reasons:
          //   - Certain types that cannot be introspected (e.g., `WeakMap`). For these types, this is the only
          //     comparison that can be made.
          //   - For types that can be introspected, but rarely have requirements to be compared
          //     (`ArrayBuffer`, `DataView`, etc.), the cost is avoided to prioritize the common
          //     use-cases (may be included in a future release, if requested enough).
          //   - For types that can be introspected but do not have an objective definition of what
          //     equality is (`Error`, etc.), the subjective decision is to be conservative and strictly compare.
          // In all cases, these decisions should be reevaluated based on changes to the language and
          // common development practices.
          return false;
      }
      return comparator;
  }

  /**
   * Whether the arrays are equal in value.
   */
  function areArraysEqual(a, b, isEqual, meta) {
      var index = a.length;
      if (b.length !== index) {
          return false;
      }
      // Decrementing `while` showed faster results than either incrementing or
      // decrementing `for` loop and than an incrementing `while` loop. Declarative
      // methods like `some` / `every` were not used to avoid incurring the garbage
      // cost of anonymous callbacks.
      while (index-- > 0) {
          if (!isEqual(a[index], b[index], index, index, a, b, meta)) {
              return false;
          }
      }
      return true;
  }
  /**
   * Whether the arrays are equal in value, including circular references.
   */
  var areArraysEqualCircular = createIsCircular(areArraysEqual);

  /**
   * Whether the dates passed are equal in value.
   *
   * @NOTE
   * This is a standalone function instead of done inline in the comparator
   * to allow for overrides.
   */
  function areDatesEqual(a, b) {
      return sameValueZeroEqual(a.valueOf(), b.valueOf());
  }

  /**
   * Whether the `Map`s are equal in value.
   */
  function areMapsEqual(a, b, isEqual, meta) {
      var isValueEqual = a.size === b.size;
      if (!isValueEqual) {
          return false;
      }
      if (!a.size) {
          return true;
      }
      // The use of `forEach()` is to avoid the transpilation cost of `for...of` comparisons, and
      // the inability to control the performance of the resulting code. It also avoids excessive
      // iteration compared to doing comparisons of `keys()` and `values()`. As a result, though,
      // we cannot short-circuit the iterations; bookkeeping must be done to short-circuit the
      // equality checks themselves.
      var matchedIndices = {};
      var indexA = 0;
      a.forEach(function (aValue, aKey) {
          if (!isValueEqual) {
              return;
          }
          var hasMatch = false;
          var matchIndexB = 0;
          b.forEach(function (bValue, bKey) {
              if (!hasMatch &&
                  !matchedIndices[matchIndexB] &&
                  (hasMatch =
                      isEqual(aKey, bKey, indexA, matchIndexB, a, b, meta) &&
                          isEqual(aValue, bValue, aKey, bKey, a, b, meta))) {
                  matchedIndices[matchIndexB] = true;
              }
              matchIndexB++;
          });
          indexA++;
          isValueEqual = hasMatch;
      });
      return isValueEqual;
  }
  /**
   * Whether the `Map`s are equal in value, including circular references.
   */
  var areMapsEqualCircular = createIsCircular(areMapsEqual);

  var OWNER = '_owner';
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  /**
   * Whether the objects are equal in value.
   */
  function areObjectsEqual(a, b, isEqual, meta) {
      var keysA = Object.keys(a);
      var index = keysA.length;
      if (Object.keys(b).length !== index) {
          return false;
      }
      var key;
      // Decrementing `while` showed faster results than either incrementing or
      // decrementing `for` loop and than an incrementing `while` loop. Declarative
      // methods like `some` / `every` were not used to avoid incurring the garbage
      // cost of anonymous callbacks.
      while (index-- > 0) {
          key = keysA[index];
          if (key === OWNER) {
              var reactElementA = !!a.$$typeof;
              var reactElementB = !!b.$$typeof;
              if ((reactElementA || reactElementB) && reactElementA !== reactElementB) {
                  return false;
              }
          }
          if (!hasOwnProperty.call(b, key) ||
              !isEqual(a[key], b[key], key, key, a, b, meta)) {
              return false;
          }
      }
      return true;
  }
  /**
   * Whether the objects are equal in value, including circular references.
   */
  var areObjectsEqualCircular = createIsCircular(areObjectsEqual);

  /**
   * Whether the regexps passed are equal in value.
   *
   * @NOTE
   * This is a standalone function instead of done inline in the comparator
   * to allow for overrides. An example of this would be supporting a
   * pre-ES2015 environment where the `flags` property is not available.
   */
  function areRegExpsEqual(a, b) {
      return a.source === b.source && a.flags === b.flags;
  }

  /**
   * Whether the `Set`s are equal in value.
   */
  function areSetsEqual(a, b, isEqual, meta) {
      var isValueEqual = a.size === b.size;
      if (!isValueEqual) {
          return false;
      }
      if (!a.size) {
          return true;
      }
      // The use of `forEach()` is to avoid the transpilation cost of `for...of` comparisons, and
      // the inability to control the performance of the resulting code. It also avoids excessive
      // iteration compared to doing comparisons of `keys()` and `values()`. As a result, though,
      // we cannot short-circuit the iterations; bookkeeping must be done to short-circuit the
      // equality checks themselves.
      var matchedIndices = {};
      a.forEach(function (aValue, aKey) {
          if (!isValueEqual) {
              return;
          }
          var hasMatch = false;
          var matchIndex = 0;
          b.forEach(function (bValue, bKey) {
              if (!hasMatch &&
                  !matchedIndices[matchIndex] &&
                  (hasMatch = isEqual(aValue, bValue, aKey, bKey, a, b, meta))) {
                  matchedIndices[matchIndex] = true;
              }
              matchIndex++;
          });
          isValueEqual = hasMatch;
      });
      return isValueEqual;
  }
  /**
   * Whether the `Set`s are equal in value, including circular references.
   */
  var areSetsEqualCircular = createIsCircular(areSetsEqual);

  var DEFAULT_CONFIG = Object.freeze({
      areArraysEqual: areArraysEqual,
      areDatesEqual: areDatesEqual,
      areMapsEqual: areMapsEqual,
      areObjectsEqual: areObjectsEqual,
      areRegExpsEqual: areRegExpsEqual,
      areSetsEqual: areSetsEqual,
      createIsNestedEqual: createDefaultIsNestedEqual,
  });
  var DEFAULT_CIRCULAR_CONFIG = Object.freeze({
      areArraysEqual: areArraysEqualCircular,
      areDatesEqual: areDatesEqual,
      areMapsEqual: areMapsEqualCircular,
      areObjectsEqual: areObjectsEqualCircular,
      areRegExpsEqual: areRegExpsEqual,
      areSetsEqual: areSetsEqualCircular,
      createIsNestedEqual: createDefaultIsNestedEqual,
  });
  var isDeepEqual = createComparator(DEFAULT_CONFIG);
  /**
   * Whether the items passed are deeply-equal in value.
   */
  function deepEqual(a, b) {
      return isDeepEqual(a, b, undefined);
  }
  var isShallowEqual = createComparator(merge(DEFAULT_CONFIG, { createIsNestedEqual: function () { return sameValueZeroEqual; } }));
  /**
   * Whether the items passed are shallowly-equal in value.
   */
  function shallowEqual(a, b) {
      return isShallowEqual(a, b, undefined);
  }
  var isCircularDeepEqual = createComparator(DEFAULT_CIRCULAR_CONFIG);
  /**
   * Whether the items passed are deeply-equal in value, including circular references.
   */
  function circularDeepEqual(a, b) {
      return isCircularDeepEqual(a, b, new WeakMap());
  }
  var isCircularShallowEqual = createComparator(merge(DEFAULT_CIRCULAR_CONFIG, {
      createIsNestedEqual: function () { return sameValueZeroEqual; },
  }));
  /**
   * Whether the items passed are shallowly-equal in value, including circular references.
   */
  function circularShallowEqual(a, b) {
      return isCircularShallowEqual(a, b, new WeakMap());
  }
  /**
   * Create a custom equality comparison method.
   *
   * This can be done to create very targeted comparisons in extreme hot-path scenarios
   * where the standard methods are not performant enough, but can also be used to provide
   * support for legacy environments that do not support expected features like
   * `RegExp.prototype.flags` out of the box.
   */
  function createCustomEqual(getComparatorOptions) {
      return createComparator(merge(DEFAULT_CONFIG, getComparatorOptions(DEFAULT_CONFIG)));
  }
  /**
   * Create a custom equality comparison method that handles circular references. This is very
   * similar to `createCustomEqual`, with the only difference being that `meta` expects to be
   * populated with a `WeakMap`-like contract.
   *
   * This can be done to create very targeted comparisons in extreme hot-path scenarios
   * where the standard methods are not performant enough, but can also be used to provide
   * support for legacy environments that do not support expected features like
   * `WeakMap` out of the box.
   */
  function createCustomCircularEqual(getComparatorOptions) {
      var comparator = createComparator(merge(DEFAULT_CIRCULAR_CONFIG, getComparatorOptions(DEFAULT_CIRCULAR_CONFIG)));
      return (function (a, b, meta) {
          if (meta === void 0) { meta = new WeakMap(); }
          return comparator(a, b, meta);
      });
  }

  exports.circularDeepEqual = circularDeepEqual;
  exports.circularShallowEqual = circularShallowEqual;
  exports.createCustomCircularEqual = createCustomCircularEqual;
  exports.createCustomEqual = createCustomEqual;
  exports.deepEqual = deepEqual;
  exports.sameValueZeroEqual = sameValueZeroEqual;
  exports.shallowEqual = shallowEqual;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=fast-equals.js.map
