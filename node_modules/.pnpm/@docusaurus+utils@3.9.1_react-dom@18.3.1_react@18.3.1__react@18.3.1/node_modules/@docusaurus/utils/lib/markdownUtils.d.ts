/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type SluggerOptions } from './slugger';
import type { ParseFrontMatter, DefaultParseFrontMatter } from '@docusaurus/types';
/**
 * Parses custom ID from a heading. The ID can contain any characters except
 * `{#` and `}`.
 *
 * @param heading e.g. `## Some heading {#some-heading}` where the last
 * character must be `}` for the ID to be recognized
 */
export declare function parseMarkdownHeadingId(heading: string): {
    /**
     * The heading content sans the ID part, right-trimmed. e.g. `## Some heading`
     */
    text: string;
    /** The heading ID. e.g. `some-heading` */
    id: string | undefined;
};
/**
 * MDX 2 requires escaping { with a \ so our anchor syntax need that now.
 * See https://mdxjs.com/docs/troubleshooting-mdx/#could-not-parse-expression-with-acorn-error
 */
export declare function escapeMarkdownHeadingIds(content: string): string;
/**
 * Hacky temporary escape hatch for Crowdin bad MDX support
 * See https://docusaurus.io/docs/i18n/crowdin#mdx
 *
 * TODO Titus suggested a clean solution based on ```mdx eval and Remark
 * See https://github.com/mdx-js/mdx/issues/701#issuecomment-947030041
 *
 * @param content
 */
export declare function unwrapMdxCodeBlocks(content: string): string;
/**
 * Add support for our legacy ":::note Title" admonition syntax
 * Not supported by https://github.com/remarkjs/remark-directive
 * Syntax is transformed to ":::note[Title]" (container directive label)
 * See https://talk.commonmark.org/t/generic-directives-plugins-syntax/444
 *
 * @param content
 * @param admonitionContainerDirectives
 */
export declare function admonitionTitleToDirectiveLabel(content: string, admonitionContainerDirectives: string[]): string;
/**
 * Creates an excerpt of a Markdown file. This function will:
 *
 * - Ignore h1 headings (setext or atx)
 * - Ignore import/export
 * - Ignore code blocks
 *
 * And for the first contentful line, it will strip away most Markdown
 * syntax, including HTML tags, emphasis, links (keeping the text), etc.
 */
export declare function createExcerpt(fileString: string): string | undefined;
/**
 * Takes a raw Markdown file content, and parses the front matter using
 * gray-matter. Worth noting that gray-matter accepts TOML and other markup
 * languages as well.
 *
 * @throws Throws when gray-matter throws. e.g.:
 * ```md
 * ---
 * foo: : bar
 * ---
 * ```
 */
export declare function parseFileContentFrontMatter(fileContent: string): {
    /** Front matter as parsed by gray-matter. */
    frontMatter: {
        [key: string]: unknown;
    };
    /** The remaining content, trimmed. */
    content: string;
};
export declare const DEFAULT_PARSE_FRONT_MATTER: DefaultParseFrontMatter;
type ParseMarkdownContentTitleOptions = {
    /**
     * If `true`, the matching title will be removed from the returned content.
     * We can promise that at least one empty line will be left between the
     * content before and after, but you shouldn't make too much assumption
     * about what's left.
     */
    removeContentTitle?: boolean;
};
/**
 * Takes the raw Markdown content, without front matter, and tries to find an h1
 * title (setext or atx) to be used as metadata.
 *
 * It only searches until the first contentful paragraph, ignoring import/export
 * declarations.
 *
 * It will try to convert markdown to reasonable text, but won't be best effort,
 * since it's only used as a fallback when `frontMatter.title` is not provided.
 * For now, we just unwrap inline code (``# `config.js` `` => `config.js`).
 */
export declare function parseMarkdownContentTitle(contentUntrimmed: string, options?: ParseMarkdownContentTitleOptions): {
    /** The content, optionally without the content title. */
    content: string;
    /** The title, trimmed and without the `#`. */
    contentTitle: string | undefined;
};
/**
 * Makes a full-round parse.
 *
 * @throws Throws when `parseFrontMatter` throws, usually because of invalid
 * syntax.
 */
export declare function parseMarkdownFile({ filePath, fileContent, parseFrontMatter, removeContentTitle, }: {
    filePath: string;
    fileContent: string;
    parseFrontMatter: ParseFrontMatter;
} & ParseMarkdownContentTitleOptions): Promise<{
    /** @see {@link parseFrontMatter} */
    frontMatter: {
        [key: string]: unknown;
    };
    /** @see {@link parseMarkdownContentTitle} */
    contentTitle: string | undefined;
    /** @see {@link createExcerpt} */
    excerpt: string | undefined;
    /**
     * Content without front matter and (optionally) without title, depending on
     * the `removeContentTitle` option.
     */
    content: string;
}>;
export type WriteHeadingIDOptions = SluggerOptions & {
    /** Overwrite existing heading IDs. */
    overwrite?: boolean;
};
/**
 * Takes Markdown content, returns new content with heading IDs written.
 * Respects existing IDs (unless `overwrite=true`) and never generates colliding
 * IDs (through the slugger).
 */
export declare function writeMarkdownHeadingId(content: string, options?: WriteHeadingIDOptions): string;
export {};
//# sourceMappingURL=markdownUtils.d.ts.map