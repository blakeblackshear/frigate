import { createIsCircular } from './utils';

import type { InternalEqualityComparator } from '../index.d';

/**
 * Whether the `Map`s are equal in value.
 */
export function areMapsEqual(
  a: Map<any, any>,
  b: Map<any, any>,
  isEqual: InternalEqualityComparator<any>,
  meta: any,
): boolean {
  let isValueEqual = a.size === b.size;

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

  const matchedIndices: Record<number, true> = {};

  let indexA = 0;

  a.forEach((aValue, aKey) => {
    if (!isValueEqual) {
      return;
    }

    let hasMatch = false;
    let matchIndexB = 0;

    b.forEach((bValue, bKey) => {
      if (
        !hasMatch &&
        !matchedIndices[matchIndexB] &&
        (hasMatch =
          isEqual(aKey, bKey, indexA, matchIndexB, a, b, meta) &&
          isEqual(aValue, bValue, aKey, bKey, a, b, meta))
      ) {
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
export const areMapsEqualCircular = createIsCircular(areMapsEqual);
