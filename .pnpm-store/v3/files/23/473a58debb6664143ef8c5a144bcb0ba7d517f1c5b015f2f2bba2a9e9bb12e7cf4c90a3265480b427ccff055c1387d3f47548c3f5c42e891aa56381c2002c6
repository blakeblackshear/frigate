/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Content plugins have a base path and a localized path to source content from.
 * We will look into the localized path in priority.
 */
export type ContentPaths = {
    /**
     * The absolute path to the base content directory, like `"<siteDir>/docs"`.
     */
    contentPath: string;
    /**
     * The absolute path to the localized content directory, like
     * `"<siteDir>/i18n/zh-Hans/plugin-content-blog"`.
     *
     * Undefined when the locale has `translate: false` config
     */
    contentPathLocalized: string | undefined;
};
/** Data structure representing each broken Markdown link to be reported. */
export type BrokenMarkdownLink<T extends ContentPaths> = {
    /** Absolute path to the file containing this link. */
    filePath: string;
    /**
     * This is generic because it may contain extra metadata like version name,
     * which the reporter can provide for context.
     */
    contentPaths: T;
    /**
     * The content of the link, like `"./brokenFile.md"`
     */
    link: string;
};
export type SourceToPermalink = Map<string, // Aliased source path: "@site/docs/content.mdx"
string>;
export declare function resolveMarkdownLinkPathname(linkPathname: string, context: {
    sourceFilePath: string;
    sourceToPermalink: SourceToPermalink;
    contentPaths: ContentPaths;
    siteDir: string;
}): string | null;
//# sourceMappingURL=markdownLinks.d.ts.map