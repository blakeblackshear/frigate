/**
 * Create an extension for `micromark` to enable MDX syntax.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions` to enable MDX
 *   syntax.
 */
export function mdxjs(options?: Options | null | undefined): Extension;
export type Options = import('micromark-extension-mdx-expression').Options;
export type Extension = import('micromark-util-types').Extension;
