/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Plugin } from 'unified';
import type { Root } from 'mdast';
import type { MarkdownConfig } from '@docusaurus/types';
type ResolveMarkdownLinkParams = {
    /**
     * Absolute path to the source file containing this Markdown link.
     */
    sourceFilePath: string;
    /**
     * The Markdown link pathname to resolve, as found in the source file.
     * If the link is "./myFile.mdx?qs#hash", this will be "./myFile.mdx"
     */
    linkPathname: string;
};
export type ResolveMarkdownLink = (params: ResolveMarkdownLinkParams) => string | null;
export interface PluginOptions {
    resolveMarkdownLink: ResolveMarkdownLink;
    onBrokenMarkdownLinks: MarkdownConfig['hooks']['onBrokenMarkdownLinks'];
}
/**
 * A remark plugin to extract the h1 heading found in Markdown files
 * This is exposed as "data.contentTitle" to the processed vfile
 * Also gives the ability to strip that content title (used for the blog plugin)
 */
declare const plugin: Plugin<PluginOptions[], Root>;
export default plugin;
//# sourceMappingURL=index.d.ts.map