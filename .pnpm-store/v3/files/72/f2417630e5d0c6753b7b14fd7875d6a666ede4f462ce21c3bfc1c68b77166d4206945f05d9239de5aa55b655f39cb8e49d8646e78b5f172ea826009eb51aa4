"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const utils_1 = require("@docusaurus/utils");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_2 = require("../utils");
function asFunction(onBrokenMarkdownLinks) {
    if (typeof onBrokenMarkdownLinks === 'string') {
        const extraHelp = onBrokenMarkdownLinks === 'throw'
            ? logger_1.default.interpolate `\nTo ignore this error, use the code=${'siteConfig.markdown.hooks.onBrokenMarkdownLinks'} option, or apply the code=${'pathname://'} protocol to the broken link URLs.`
            : '';
        return ({ sourceFilePath, url: linkUrl, node }) => {
            const relativePath = (0, utils_1.toMessageRelativeFilePath)(sourceFilePath);
            logger_1.default.report(onBrokenMarkdownLinks) `Markdown link with URL code=${linkUrl} in source file path=${relativePath}${(0, utils_2.formatNodePositionExtraMessage)(node)} couldn't be resolved.
Make sure it references a local Markdown file that exists within the current plugin.${extraHelp}`;
        };
    }
    else {
        return (params) => onBrokenMarkdownLinks({
            ...params,
            sourceFilePath: (0, utils_1.toMessageRelativeFilePath)(params.sourceFilePath),
        });
    }
}
const HAS_MARKDOWN_EXTENSION = /\.mdx?$/i;
function parseMarkdownLinkURLPath(link) {
    const urlPath = (0, utils_1.parseLocalURLPath)(link);
    // If it's not local, we don't resolve it even if it's a Markdown file
    // Example, we don't resolve https://github.com/project/README.md
    if (!urlPath) {
        return null;
    }
    // Ignore links without a Markdown file extension (ignoring qs/hash)
    if (!HAS_MARKDOWN_EXTENSION.test(urlPath.pathname)) {
        return null;
    }
    return urlPath;
}
/**
 * A remark plugin to extract the h1 heading found in Markdown files
 * This is exposed as "data.contentTitle" to the processed vfile
 * Also gives the ability to strip that content title (used for the blog plugin)
 */
// TODO merge this plugin with "transformLinks"
//  in general we'd want to avoid traversing multiple times the same AST
const plugin = function plugin(options) {
    const { resolveMarkdownLink } = options;
    const onBrokenMarkdownLinks = asFunction(options.onBrokenMarkdownLinks);
    return async (root, file) => {
        const { visit } = await import('unist-util-visit');
        visit(root, ['link', 'definition'], (node) => {
            const link = node;
            const linkURLPath = parseMarkdownLinkURLPath(link.url);
            if (!linkURLPath) {
                return;
            }
            const sourceFilePath = file.path;
            const permalink = resolveMarkdownLink({
                sourceFilePath,
                linkPathname: linkURLPath.pathname,
            });
            if (permalink) {
                // This reapplies the link ?qs#hash part to the resolved pathname
                link.url = (0, utils_1.serializeURLPath)({
                    ...linkURLPath,
                    pathname: permalink,
                });
            }
            else {
                link.url =
                    onBrokenMarkdownLinks({
                        url: link.url,
                        sourceFilePath,
                        node: link,
                    }) ?? link.url;
            }
        });
    };
};
exports.default = plugin;
//# sourceMappingURL=index.js.map