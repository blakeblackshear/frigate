import { createIsCircular } from './utils';

import type { InternalEqualityComparator } from '../index.d';

interface Dictionary<Value> {
  [key: string]: Value;
  $$typeof?: any;
}

const OWNER = '_owner';
const { hasOwnProperty } = Object.prototype;

/**
 * Whether the objects are equal in value.
 */
export function areObjectsEqual(
  a: Dictionary<any>,
  b: Dictionary<any>,
  isEqual: InternalEqualityComparator<any>,
  meta: any,
): boolean {
  const keysA = Object.keys(a);

  let index = keysA.length;

  if (Object.keys(b).length !== index) {
    return false;
  }

  let key: string;

  // Decrementing `while` showed faster results than either incrementing or
  // decrementing `for` loop and than an incrementing `while` loop. Declarative
  // methods like `some` / `every` were not used to avoid incurring the garbage
  // cost of anonymous callbacks.
  while (index-- > 0) {
    key = keysA[index];

    if (key === OWNER) {
      const reactElementA = !!a.$$typeof;
      const reactElementB = !!b.$$typeof;

      if ((reactElementA || reactElementB) && reactElementA !== reactElementB) {
        return false;
      }
    }

    if (
      !hasOwnProperty.call(b, key) ||
      !isEqual(a[key], b[key], key, key, a, b, meta)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Whether the objects are equal in value, including circular references.
 */
export const areObjectsEqualCircular = createIsCircular(areObjectsEqual);
