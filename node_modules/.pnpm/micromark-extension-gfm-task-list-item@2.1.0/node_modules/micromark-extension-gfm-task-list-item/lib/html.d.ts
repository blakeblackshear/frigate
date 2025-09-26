/**
 * @import {HtmlExtension} from 'micromark-util-types'
 */
/**
 * Create an HTML extension for `micromark` to support GFM task list items when
 * serializing to HTML.
 *
 * @returns {HtmlExtension}
 *   Extension for `micromark` that can be passed in `htmlExtensions` to
 *   support GFM task list items when serializing to HTML.
 */
export function gfmTaskListItemHtml(): HtmlExtension;
import type { HtmlExtension } from 'micromark-util-types';
