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
const fromFile_1 = require("image-size/fromFile");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_2 = require("../utils");
function asFunction(onBrokenMarkdownImages) {
    if (typeof onBrokenMarkdownImages === 'string') {
        const extraHelp = onBrokenMarkdownImages === 'throw'
            ? logger_1.default.interpolate `\nTo ignore this error, use the code=${'siteConfig.markdown.hooks.onBrokenMarkdownImages'} option, or apply the code=${'pathname://'} protocol to the broken image URLs.`
            : '';
        return ({ sourceFilePath, url: imageUrl, node }) => {
            const relativePath = (0, utils_1.toMessageRelativeFilePath)(sourceFilePath);
            if (imageUrl) {
                logger_1.default.report(onBrokenMarkdownImages) `Markdown image with URL code=${imageUrl} in source file path=${relativePath}${(0, utils_2.formatNodePositionExtraMessage)(node)} couldn't be resolved to an existing local image file.${extraHelp}`;
            }
            else {
                logger_1.default.report(onBrokenMarkdownImages) `Markdown image with empty URL found in source file path=${relativePath}${(0, utils_2.formatNodePositionExtraMessage)(node)}.${extraHelp}`;
            }
        };
    }
    else {
        return (params) => onBrokenMarkdownImages({
            ...params,
            sourceFilePath: (0, utils_1.toMessageRelativeFilePath)(params.sourceFilePath),
        });
    }
}
async function toImageRequireNode([node], imagePath, context) {
    // MdxJsxTextElement => see https://github.com/facebook/docusaurus/pull/8288#discussion_r1125871405
    const jsxNode = node;
    const attributes = [];
    let relativeImagePath = (0, utils_1.posixPath)(path_1.default.relative(path_1.default.dirname(context.filePath), imagePath));
    relativeImagePath = `./${relativeImagePath}`;
    const parsedUrl = (0, utils_1.parseURLOrPath)(node.url);
    const hash = parsedUrl.hash ?? '';
    const search = parsedUrl.search ?? '';
    const requireString = `${context.inlineMarkdownImageFileLoader}${(0, utils_1.escapePath)(relativeImagePath) + search}`;
    if (node.alt) {
        attributes.push({
            type: 'mdxJsxAttribute',
            name: 'alt',
            value: (0, escape_html_1.default)(node.alt),
        });
    }
    attributes.push({
        type: 'mdxJsxAttribute',
        name: 'src',
        value: (0, utils_2.assetRequireAttributeValue)(requireString, hash),
    });
    if (node.title) {
        attributes.push({
            type: 'mdxJsxAttribute',
            name: 'title',
            value: (0, escape_html_1.default)(node.title),
        });
    }
    try {
        const size = (await (0, fromFile_1.imageSizeFromFile)(imagePath));
        if (size.width) {
            attributes.push({
                type: 'mdxJsxAttribute',
                name: 'width',
                value: String(size.width),
            });
        }
        if (size.height) {
            attributes.push({
                type: 'mdxJsxAttribute',
                name: 'height',
                value: String(size.height),
            });
        }
    }
    catch (err) {
        console.error(err);
        // Workaround for https://github.com/yarnpkg/berry/pull/3889#issuecomment-1034469784
        // TODO remove this check once fixed in Yarn PnP
        if (!process.versions.pnp) {
            logger_1.default.warn `The image at path=${imagePath} can't be read correctly. Please ensure it's a valid image.
${err.message}`;
        }
    }
    (0, utils_2.transformNode)(jsxNode, {
        type: 'mdxJsxTextElement',
        name: 'img',
        attributes,
        children: [],
    });
}
async function getLocalImageAbsolutePath(originalImagePath, { siteDir, filePath, staticDirs }) {
    if (originalImagePath.startsWith('@site/')) {
        const imageFilePath = path_1.default.join(siteDir, originalImagePath.replace('@site/', ''));
        if (!(await fs_extra_1.default.pathExists(imageFilePath))) {
            return null;
        }
        return imageFilePath;
    }
    else if (path_1.default.isAbsolute(originalImagePath)) {
        // Absolute paths are expected to exist in the static folder.
        const possiblePaths = staticDirs.map((dir) => path_1.default.join(dir, originalImagePath));
        const imageFilePath = await (0, utils_1.findAsyncSequential)(possiblePaths, fs_extra_1.default.pathExists);
        if (!imageFilePath) {
            return null;
        }
        return imageFilePath;
    }
    else {
        // relative paths are resolved against the source file's folder
        const imageFilePath = path_1.default.join(path_1.default.dirname(filePath), originalImagePath);
        if (!(await fs_extra_1.default.pathExists(imageFilePath))) {
            return null;
        }
        return imageFilePath;
    }
}
async function processImageNode(target, context) {
    const [node] = target;
    if (!node.url) {
        node.url =
            context.onBrokenMarkdownImages({
                url: node.url,
                sourceFilePath: context.filePath,
                node,
            }) ?? node.url;
        return;
    }
    const parsedUrl = url_1.default.parse(node.url);
    if (parsedUrl.protocol || !parsedUrl.pathname) {
        // pathname:// is an escape hatch, in case user does not want her images to
        // be converted to require calls going through webpack loader
        if (parsedUrl.protocol === 'pathname:') {
            node.url = node.url.replace('pathname://', '');
        }
        return;
    }
    // We decode it first because Node Url.pathname is always encoded
    // while the image file-system path are not.
    // See https://github.com/facebook/docusaurus/discussions/10720
    const decodedPathname = decodeURIComponent(parsedUrl.pathname);
    // We try to convert image urls without protocol to images with require calls
    // going through webpack ensures that image assets exist at build time
    const localImagePath = await getLocalImageAbsolutePath(decodedPathname, context);
    if (localImagePath === null) {
        node.url =
            context.onBrokenMarkdownImages({
                url: node.url,
                sourceFilePath: context.filePath,
                node,
            }) ?? node.url;
    }
    else {
        await toImageRequireNode(target, localImagePath, context);
    }
}
const plugin = function plugin(options) {
    const onBrokenMarkdownImages = asFunction(options.onBrokenMarkdownImages);
    return async (root, vfile) => {
        const { visit } = await import('unist-util-visit');
        const fileLoaderUtils = (0, utils_1.getFileLoaderUtils)(vfile.data.compilerName === 'server');
        const context = {
            ...options,
            filePath: vfile.path,
            inlineMarkdownImageFileLoader: fileLoaderUtils.loaders.inlineMarkdownImageFileLoader,
            onBrokenMarkdownImages,
        };
        const promises = [];
        visit(root, 'image', (node, index, parent) => {
            if (!parent || index === undefined) {
                return;
            }
            promises.push(processImageNode([node, index, parent], context));
        });
        await Promise.all(promises);
    };
};
exports.default = plugin;
//# sourceMappingURL=index.js.map