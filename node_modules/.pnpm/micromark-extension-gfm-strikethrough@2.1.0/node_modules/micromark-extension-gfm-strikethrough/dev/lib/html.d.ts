/**
 * @import {HtmlExtension} from 'micromark-util-types'
 */
/**
 * Create an HTML extension for `micromark` to support GFM strikethrough when
 * serializing to HTML.
 *
 * @returns {HtmlExtension}
 *   Extension for `micromark` that can be passed in `htmlExtensions`, to
 *   support GFM strikethrough when serializing to HTML.
 */
export function gfmStrikethroughHtml(): HtmlExtension;
import type { HtmlExtension } from 'micromark-util-types';
