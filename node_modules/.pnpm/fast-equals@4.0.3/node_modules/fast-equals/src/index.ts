import { createComparator } from './comparator';
import { areArraysEqual, areArraysEqualCircular } from './arrays';
import { areDatesEqual } from './dates';
import { areMapsEqual, areMapsEqualCircular } from './maps';
import { areObjectsEqual, areObjectsEqualCircular } from './objects';
import { areRegExpsEqual } from './regexps';
import { areSetsEqual, areSetsEqualCircular } from './sets';
import { createDefaultIsNestedEqual, merge, sameValueZeroEqual } from './utils';

import type {
  BaseCircularMeta,
  CreateComparatorCreatorOptions,
  EqualityComparator,
  GetComparatorOptions,
} from '../index.d';

export { sameValueZeroEqual };

const DEFAULT_CONFIG: CreateComparatorCreatorOptions<undefined> = Object.freeze(
  {
    areArraysEqual,
    areDatesEqual,
    areMapsEqual,
    areObjectsEqual,
    areRegExpsEqual,
    areSetsEqual,
    createIsNestedEqual: createDefaultIsNestedEqual,
  },
);
const DEFAULT_CIRCULAR_CONFIG: CreateComparatorCreatorOptions<BaseCircularMeta> =
  Object.freeze({
    areArraysEqual: areArraysEqualCircular,
    areDatesEqual,
    areMapsEqual: areMapsEqualCircular,
    areObjectsEqual: areObjectsEqualCircular,
    areRegExpsEqual,
    areSetsEqual: areSetsEqualCircular,
    createIsNestedEqual: createDefaultIsNestedEqual,
  });

const isDeepEqual = createComparator(DEFAULT_CONFIG);

/**
 * Whether the items passed are deeply-equal in value.
 */
export function deepEqual<A, B>(a: A, b: B): boolean {
  return isDeepEqual(a, b, undefined);
}

const isShallowEqual = createComparator(
  merge(DEFAULT_CONFIG, { createIsNestedEqual: () => sameValueZeroEqual }),
);

/**
 * Whether the items passed are shallowly-equal in value.
 */
export function shallowEqual<A, B>(a: A, b: B): boolean {
  return isShallowEqual(a, b, undefined);
}

const isCircularDeepEqual = createComparator(DEFAULT_CIRCULAR_CONFIG);

/**
 * Whether the items passed are deeply-equal in value, including circular references.
 */
export function circularDeepEqual<A, B>(a: A, b: B): boolean {
  return isCircularDeepEqual(a, b, new WeakMap());
}

const isCircularShallowEqual = createComparator(
  merge(DEFAULT_CIRCULAR_CONFIG, {
    createIsNestedEqual: () => sameValueZeroEqual,
  }),
);

/**
 * Whether the items passed are shallowly-equal in value, including circular references.
 */
export function circularShallowEqual<A, B>(a: A, b: B): boolean {
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
export function createCustomEqual<Meta = undefined>(
  getComparatorOptions: GetComparatorOptions<Meta>,
): EqualityComparator<Meta> {
  return createComparator<Meta>(
    merge(DEFAULT_CONFIG, getComparatorOptions(DEFAULT_CONFIG as any)),
  );
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
export function createCustomCircularEqual<
  Meta extends BaseCircularMeta = WeakMap<any, any>,
>(getComparatorOptions: GetComparatorOptions<Meta>): EqualityComparator<Meta> {
  const comparator = createComparator<Meta>(
    merge(
      DEFAULT_CIRCULAR_CONFIG,
      getComparatorOptions(DEFAULT_CIRCULAR_CONFIG as any),
    ),
  );

  return ((a: any, b: any, meta: any = new WeakMap()) =>
    comparator(a, b, meta)) as EqualityComparator<Meta>;
}
