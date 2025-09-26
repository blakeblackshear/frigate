/**
 * Create an extension for `mdast-util-from-markdown` to enable MDX JSX.
 *
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown` to enable MDX JSX.
 *
 *   When using the syntax extension with `addResult`, nodes will have a
 *   `data.estree` field set to an ESTree `Program` node.
 */
export function mdxJsxFromMarkdown(): FromMarkdownExtension;
/**
 * Create an extension for `mdast-util-to-markdown` to enable MDX JSX.
 *
 * This extension configures `mdast-util-to-markdown` with
 * `options.fences: true` and `options.resourceLink: true` too, do not
 * overwrite them!
 *
 * @param {ToMarkdownOptions | null | undefined} [options]
 *   Configuration (optional).
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown` to enable MDX JSX.
 */
export function mdxJsxToMarkdown(options?: ToMarkdownOptions | null | undefined): ToMarkdownExtension;
/**
 * Single tag.
 */
export type Tag = {
    /**
     *   Name of tag, or `undefined` for fragment.
     *
     *   > 👉 **Note**: `null` is used in the AST for fragments, as it serializes in
     *   > JSON.
     */
    name: string | undefined;
    /**
     *   Attributes.
     */
    attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute>;
    /**
     *   Whether the tag is closing (`</x>`).
     */
    close: boolean;
    /**
     *   Whether the tag is self-closing (`<x/>`).
     */
    selfClosing: boolean;
    /**
     *   Start point.
     */
    start: Token["start"];
    /**
     *   End point.
     */
    end: Token["start"];
};
/**
 * Configuration.
 */
export type ToMarkdownOptions = {
    /**
     * Preferred quote to use around attribute values (default: `'"'`).
     */
    quote?: "\"" | "'" | null | undefined;
    /**
     * Use the other quote if that results in less bytes (default: `false`).
     */
    quoteSmart?: boolean | null | undefined;
    /**
     * Do not use an extra space when closing self-closing elements: `<img/>`
     * instead of `<img />` (default: `false`).
     */
    tightSelfClosing?: boolean | null | undefined;
    /**
     * Try and wrap syntax at this width (default: `Infinity`).
     *
     * When set to a finite number (say, `80`), the formatter will print
     * attributes on separate lines when a tag doesn’t fit on one line.
     * The normal behavior is to print attributes with spaces between them
     * instead of line endings.
     */
    printWidth?: number | null | undefined;
};
import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';
import type { Options as ToMarkdownExtension } from 'mdast-util-to-markdown';
import type { MdxJsxAttribute } from '../index.js';
import type { MdxJsxExpressionAttribute } from '../index.js';
import type { Token } from 'mdast-util-from-markdown';
//# sourceMappingURL=index.d.ts.map