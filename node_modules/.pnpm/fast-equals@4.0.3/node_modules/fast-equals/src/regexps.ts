/**
 * Whether the regexps passed are equal in value.
 *
 * @NOTE
 * This is a standalone function instead of done inline in the comparator
 * to allow for overrides. An example of this would be supporting a
 * pre-ES2015 environment where the `flags` property is not available.
 */
export function areRegExpsEqual(a: RegExp, b: RegExp): boolean {
  return a.source === b.source && a.flags === b.flags;
}
