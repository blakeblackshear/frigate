import { isPlainObject, isPromiseLike, sameValueZeroEqual } from './utils';

import type {
  CreateComparatorCreatorOptions,
  EqualityComparator,
} from '../index.d';

const ARGUMENTS_TAG = '[object Arguments]';
const BOOLEAN_TAG = '[object Boolean]';
const DATE_TAG = '[object Date]';
const REG_EXP_TAG = '[object RegExp]';
const MAP_TAG = '[object Map]';
const NUMBER_TAG = '[object Number]';
const OBJECT_TAG = '[object Object]';
const SET_TAG = '[object Set]';
const STRING_TAG = '[object String]';

const { toString } = Object.prototype;

export function createComparator<Meta>({
  areArraysEqual,
  areDatesEqual,
  areMapsEqual,
  areObjectsEqual,
  areRegExpsEqual,
  areSetsEqual,
  createIsNestedEqual,
}: CreateComparatorCreatorOptions<Meta>): EqualityComparator<Meta> {
  const isEqual = createIsNestedEqual(comparator as EqualityComparator<Meta>);

  /**
   * compare the value of the two objects and return true if they are equivalent in values
   */
  function comparator(a: any, b: any, meta: Meta): boolean {
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
    const aArray = Array.isArray(a);
    const bArray = Array.isArray(b);

    if (aArray || bArray) {
      return aArray === bArray && areArraysEqual(a, b, isEqual, meta);
    }

    // Since this is a custom object, use the classic `toString.call()` to get its
    // type. This is reasonably performant in modern environments like v8 and
    // SpiderMonkey, and allows for cross-realm comparison when other checks like
    // `instanceof` do not.
    const aTag = toString.call(a);

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

  return comparator as EqualityComparator<Meta>;
}
