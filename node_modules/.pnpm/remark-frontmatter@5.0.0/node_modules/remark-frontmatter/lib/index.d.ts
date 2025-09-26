/**
 * Add support for frontmatter.
 *
 * ###### Notes
 *
 * Doesn’t parse the data inside them: create your own plugin to do that.
 *
 * @param {Options | null | undefined} [options='yaml']
 *   Configuration (default: `'yaml'`).
 * @returns {undefined}
 *   Nothing.
 */
export default function remarkFrontmatter(options?: Options | null | undefined): undefined;
export type Root = import('mdast').Root;
export type Options = import('micromark-extension-frontmatter').Options;
export type Processor = import('unified').Processor<Root>;
