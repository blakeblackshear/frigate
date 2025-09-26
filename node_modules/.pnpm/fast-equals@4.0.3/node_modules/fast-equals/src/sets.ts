import { createIsCircular } from './utils';

import type { InternalEqualityComparator } from '../index.d';

/**
 * Whether the `Set`s are equal in value.
 */
export function areSetsEqual(
  a: Set<any>,
  b: Set<any>,
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

  a.forEach((aValue, aKey) => {
    if (!isValueEqual) {
      return;
    }

    let hasMatch = false;
    let matchIndex = 0;

    b.forEach((bValue, bKey) => {
      if (
        !hasMatch &&
        !matchedIndices[matchIndex] &&
        (hasMatch = isEqual(aValue, bValue, aKey, bKey, a, b, meta))
      ) {
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
export const areSetsEqualCircular = createIsCircular(areSetsEqual);
