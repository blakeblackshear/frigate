/**
 * Create an extension for `micromark` to enable GFM strikethrough syntax.
 *
 * @param {Options | null | undefined} [options={}]
 *   Configuration.
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions`, to
 *   enable GFM strikethrough syntax.
 */
export function gfmStrikethrough(options?: Options | null | undefined): Extension;
import type { Options } from 'micromark-extension-gfm-strikethrough';
import type { Extension } from 'micromark-util-types';
