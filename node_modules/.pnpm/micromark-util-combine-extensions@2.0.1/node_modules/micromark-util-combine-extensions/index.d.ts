/**
 * Combine multiple syntax extensions into one.
 *
 * @param {ReadonlyArray<Extension>} extensions
 *   List of syntax extensions.
 * @returns {NormalizedExtension}
 *   A single combined extension.
 */
export function combineExtensions(extensions: ReadonlyArray<Extension>): NormalizedExtension;
/**
 * Combine multiple HTML extensions into one.
 *
 * @param {ReadonlyArray<HtmlExtension>} htmlExtensions
 *   List of HTML extensions.
 * @returns {HtmlExtension}
 *   Single combined HTML extension.
 */
export function combineHtmlExtensions(htmlExtensions: ReadonlyArray<HtmlExtension>): HtmlExtension;
import type { Extension } from 'micromark-util-types';
import type { NormalizedExtension } from 'micromark-util-types';
import type { HtmlExtension } from 'micromark-util-types';
//# sourceMappingURL=index.d.ts.map