/**
 * @typedef {import('micromark-util-types').Extension} Extension
 */
/**
 * Create an extension for `micromark` to disable some CommonMark syntax (code
 * (indented), autolinks, and HTML (flow and text)) for MDX.
 *
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions` to disable
 *   some CommonMark syntax for MDX.
 */
export function mdxMd(): Extension
export type Extension = import('micromark-util-types').Extension
