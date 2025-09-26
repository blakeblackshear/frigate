import {
  EqualityComparator,
  InternalEqualityComparator,
  TypeEqualityComparator,
} from '../index.d';

/**
 * Default equality comparator pass-through, used as the standard `isEqual` creator for
 * use inside the built comparator.
 */
export function createDefaultIsNestedEqual<Meta>(
  comparator: EqualityComparator<Meta>,
): InternalEqualityComparator<Meta> {
  return function isEqual<A, B>(
    a: A,
    b: B,
    _indexOrKeyA: any,
    _indexOrKeyB: any,
    _parentA: any,
    _parentB: any,
    meta: Meta,
  ) {
    return comparator(a, b, meta);
  };
}

/**
 * Wrap the provided `areItemsEqual` method to manage the circular cache, allowing
 * for circular references to be safely included in the comparison without creating
 * stack overflows.
 */
export function createIsCircular<
  AreItemsEqual extends TypeEqualityComparator<any, any>,
>(areItemsEqual: AreItemsEqual): AreItemsEqual {
  return function isCircular(
    a: any,
    b: any,
    isEqual: InternalEqualityComparator<WeakMap<any, any>>,
    cache: WeakMap<any, any>,
  ) {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
      return areItemsEqual(a, b, isEqual, cache);
    }

    const cachedA = cache.get(a);
    const cachedB = cache.get(b);

    if (cachedA && cachedB) {
      return cachedA === b && cachedB === a;
    }

    cache.set(a, b);
    cache.set(b, a);

    const result = areItemsEqual(a, b, isEqual, cache);

    cache.delete(a);
    cache.delete(b);

    return result;
  } as AreItemsEqual;
}

/**
 * Targeted shallow merge of two objects.
 *
 * @NOTE
 * This exists as a tinier compiled version of the `__assign` helper that
 * `tsc` injects in case of `Object.assign` not being present.
 */
export function merge<A extends object, B extends object>(a: A, b: B): A & B {
  const merged: Record<string, any> = {};

  for (const key in a) {
    merged[key] = a[key];
  }

  for (const key in b) {
    merged[key] = b[key];
  }

  return merged as A & B;
}

/**
 * Whether the value is a plain object.
 *
 * @NOTE
 * This is a same-realm compariosn only.
 */
export function isPlainObject(value: any): boolean {
  return value.constructor === Object || value.constructor == null;
}

/**
 * When the value is `Promise`-like, aka "then-able".
 */
export function isPromiseLike(value: any): boolean {
  return typeof value.then === 'function';
}

/**
 * Whether the values passed are strictly equal or both NaN.
 */
export function sameValueZeroEqual(a: any, b: any): boolean {
  return a === b || (a !== a && b !== b);
}
