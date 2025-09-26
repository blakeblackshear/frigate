import { sameValueZeroEqual } from './utils';

/**
 * Whether the dates passed are equal in value.
 *
 * @NOTE
 * This is a standalone function instead of done inline in the comparator
 * to allow for overrides.
 */
export function areDatesEqual(a: Date, b: Date): boolean {
  return sameValueZeroEqual(a.valueOf(), b.valueOf());
}
