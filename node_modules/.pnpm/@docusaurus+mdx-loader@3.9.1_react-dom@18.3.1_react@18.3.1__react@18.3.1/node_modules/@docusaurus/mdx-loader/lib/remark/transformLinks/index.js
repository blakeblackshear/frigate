"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const url_1 = tslib_1.__importDefault(require("url"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const utils_1 = require("@docusaurus/utils");
const escape_html_1 = tslib_1.__importDefault(require("escape-html"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_2 = require("../utils");
function asFunction(onBrokenMarkdownLinks) {
    if (typeof onBrokenMarkdownLinks === 'string') {
        const extraHelp = onBrokenMarkdownLinks === 'throw'
            ? logger_1.default.interpolate `\nTo ignore this error, use the code=${'siteConfig.markdown.hooks.onBrokenMarkdownLinks'} option, or apply the code=${'pathname://'} protocol to the broken link URLs.`
            : '';
        return ({ sourceFilePath, url: linkUrl, node }) => {
            const relativePath = (0, utils_1.toMessageRelativeFilePath)(sourceFilePath);
            if (linkUrl) {
                logger_1.default.report(onBrokenMarkdownLinks) `Markdown link with URL code=${linkUrl} in source file path=${relativePath}${(0, utils_2.formatNodePositionExtraMessage)(node)} couldn't be resolved.
Make sure it references a local Markdown file that exists within the current plugin.${extraHelp}`;
            }
            else {
                logger_1.default.report(onBrokenMarkdownLinks) `Markdown link with empty URL found in source file path=${relativePath}${(0, utils_2.formatNodePositionExtraMessage)(node)}.${extraHelp}`;
            }
        };
    }
    else {
        return (params) => onBrokenMarkdownLinks({
            ...params,
            sourceFilePath: (0, utils_1.toMessageRelativeFilePath)(params.sourceFilePath),
        });
    }
}
/**
 * Transforms the link node to a JSX `<a>` element with a `require()` call.
 */
async function toAssetRequireNode([node], assetPath, context) {
    // MdxJsxTextElement => see https://github.com/facebook/docusaurus/pull/8288#discussion_r1125871405
    const jsxNode = node;
    const attributes = [];
    // require("assets/file.pdf") means requiring from a package called assets
    const relativeAssetPath = `./${(0, utils_1.posixPath)(path_1.default.relative(path_1.default.dirname(context.filePath), assetPath))}`;
    const parsedUrl = (0, utils_1.parseURLOrPath)(node.url);
    const hash = parsedUrl.hash ?? '';
    const search = parsedUrl.search ?? '';
    const requireString = `${
    // A hack to stop Webpack from using its built-in loader to parse JSON
    path_1.default.extname(relativeAssetPath) === '.json'
        ? `${relativeAssetPath.replace('.json', '.raw')}!=`
        : ''}${context.inlineMarkdownLinkFileLoader}${(0, utils_1.escapePath)(relativeAssetPath) + search}`;
    attributes.push({
        type: 'mdxJsxAttribute',
        name: 'target',
        value: '_blank',
    });
    // Assets are not routes, and are required by Webpack already
    // They should not trigger the broken link checker
    attributes.push({
        type: 'mdxJsxAttribute',
        name: 'data-noBrokenLinkCheck',
        value: {
            type: 'mdxJsxAttributeValueExpression',
            value: 'true',
            data: {
                estree: {
                    type: 'Program',
                    body: [
                        {
                            type: 'ExpressionStatement',
                            expression: {
                                type: 'Literal',
                                value: true,
                                raw: 'true',
                            },
                        },
                    ],
                    sourceType: 'module',
                    comments: [],
                },
            },
        },
    });
    attributes.push({
        type: 'mdxJsxAttribute',
        name: 'href',
        value: (0, utils_2.assetRequireAttributeValue)(requireString, hash),
    });
    if (node.title) {
        attributes.push({
            type: 'mdxJsxAttribute',
            name: 'title',
            value: (0, escape_html_1.default)(node.title),
        });
    }
    const { children } = node;
    (0, utils_2.transformNode)(jsxNode, {
        type: 'mdxJsxTextElement',
        name: 'a',
        attributes,
        children,
    });
}
async function getLocalFileAbsolutePath(assetPath, { siteDir, filePath, staticDirs }) {
    if (assetPath.startsWith('@site/')) {
        const assetFilePath = path_1.default.join(siteDir, assetPath.replace('@site/', ''));
        if (await fs_extra_1.default.pathExists(assetFilePath)) {
            return assetFilePath;
        }
    }
    else if (path_1.default.isAbsolute(assetPath)) {
        const assetFilePath = await (0, utils_1.findAsyncSequential)(staticDirs.map((dir) => path_1.default.join(dir, assetPath)), fs_extra_1.default.pathExists);
        if (assetFilePath) {
            return assetFilePath;
        }
    }
    else {
        const assetFilePath = path_1.default.join(path_1.default.dirname(filePath), assetPath);
        if (await fs_extra_1.default.pathExists(assetFilePath)) {
            return assetFilePath;
        }
    }
    return null;
}
async function processLinkNode(target, context) {
    const [node] = target;
    if (!node.url) {
        node.url =
            context.onBrokenMarkdownLinks({
                url: node.url,
                sourceFilePath: context.filePath,
                node,
            }) ?? node.url;
        return;
    }
    const parsedUrl = url_1.default.parse(node.url);
    if (parsedUrl.protocol || !parsedUrl.pathname) {
        // Don't process pathname:// here, it's used by the <Link> component
        return;
    }
    const hasSiteAlias = parsedUrl.pathname.startsWith('@site/');
    const hasAssetLikeExtension = path_1.default.extname(parsedUrl.pathname) &&
        !parsedUrl.pathname.match(/\.(?:mdx?|html)(?:#|$)/);
    if (!hasSiteAlias && !hasAssetLikeExtension) {
        return;
    }
    const localFilePath = await getLocalFileAbsolutePath(decodeURIComponent(parsedUrl.pathname), context);
    if (localFilePath) {
        await toAssetRequireNode(target, localFilePath, context);
    }
    else {
        // The @site alias is the only way to believe that the user wants an asset.
        if (hasSiteAlias) {
            node.url =
                context.onBrokenMarkdownLinks({
                    url: node.url,
                    sourceFilePath: context.filePath,
                    node,
                }) ?? node.url;
        }
        else {
            // Even if the url has a dot, and it looks like a file extension
            // it can be risky to throw and fail fast by default
            // It's perfectly valid for a route path segment to look like a filename
        }
    }
}
const plugin = function plugin(options) {
    const onBrokenMarkdownLinks = asFunction(options.onBrokenMarkdownLinks);
    return async (root, vfile) => {
        const { visit } = await import('unist-util-visit');
        const fileLoaderUtils = (0, utils_1.getFileLoaderUtils)(vfile.data.compilerName === 'server');
        const context = {
            ...options,
            filePath: vfile.path,
            inlineMarkdownLinkFileLoader: fileLoaderUtils.loaders.inlineMarkdownLinkFileLoader,
            onBrokenMarkdownLinks,
        };
        const promises = [];
        visit(root, 'link', (node, index, parent) => {
            if (!parent || index === undefined) {
                return;
            }
            promises.push(processLinkNode([node, index, parent], context));
        });
        await Promise.all(promises);
    };
};
exports.default = plugin;
//# sourceMappingURL=index.js.map