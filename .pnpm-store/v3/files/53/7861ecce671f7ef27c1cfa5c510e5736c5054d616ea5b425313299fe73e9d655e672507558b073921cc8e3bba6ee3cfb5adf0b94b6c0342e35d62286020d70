"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebpackLoaderCompilerName = getWebpackLoaderCompilerName;
exports.getFileLoaderUtils = getFileLoaderUtils;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const pathUtils_1 = require("./pathUtils");
const constants_1 = require("./constants");
function getWebpackLoaderCompilerName(context) {
    // eslint-disable-next-line no-underscore-dangle
    const compilerName = context._compiler?.name;
    switch (compilerName) {
        case 'server':
        case 'client':
            return compilerName;
        default:
            throw new Error(`Cannot get valid Docusaurus webpack compiler name. Found compilerName=${compilerName}`);
    }
}
// TODO this historical code is quite messy
//  We should try to get rid of it and move to assets pipeline
function createFileLoaderUtils({ isServer, }) {
    // Files/images < urlLoaderLimit will be inlined as base64 strings directly in
    // the html
    const urlLoaderLimit = constants_1.WEBPACK_URL_LOADER_LIMIT;
    const fileLoaderFileName = (folder) => path_1.default.posix.join(constants_1.OUTPUT_STATIC_ASSETS_DIR_NAME, folder, '[name]-[contenthash].[ext]');
    const loaders = {
        file: (options) => ({
            loader: require.resolve(`file-loader`),
            options: {
                name: fileLoaderFileName(options.folder),
                emitFile: !isServer,
            },
        }),
        url: (options) => ({
            loader: require.resolve('url-loader'),
            options: {
                limit: urlLoaderLimit,
                name: fileLoaderFileName(options.folder),
                fallback: require.resolve('file-loader'),
                emitFile: !isServer,
            },
        }),
        // TODO avoid conflicts with the ideal-image plugin
        // TODO this may require a little breaking change for ideal-image users?
        // Maybe with the ideal image plugin, all md images should be "ideal"?
        // This is used to force url-loader+file-loader on markdown images
        // https://webpack.js.org/concepts/loaders/#inline
        inlineMarkdownImageFileLoader: `!${(0, pathUtils_1.escapePath)(require.resolve('url-loader'))}?limit=${urlLoaderLimit}&name=${fileLoaderFileName('images')}&fallback=${(0, pathUtils_1.escapePath)(require.resolve('file-loader'))}${isServer ? `&emitFile=false` : ''}!`,
        inlineMarkdownAssetImageFileLoader: `!${(0, pathUtils_1.escapePath)(require.resolve('file-loader'))}?name=${fileLoaderFileName('images')}${isServer ? `&emitFile=false` : ''}!`,
        inlineMarkdownLinkFileLoader: `!${(0, pathUtils_1.escapePath)(require.resolve('file-loader'))}?name=${fileLoaderFileName('files')}${isServer ? `&emitFile=false` : ''}!`,
    };
    const rules = {
        /**
         * Loads image assets, inlines images via a data URI if they are below
         * the size threshold
         */
        images: () => ({
            use: [loaders.url({ folder: 'images' })],
            test: /\.(?:ico|jpe?g|png|gif|webp|avif)(?:\?.*)?$/i,
        }),
        /**
         * The SVG rule is isolated on purpose: our SVGR plugin enhances it
         * See https://github.com/facebook/docusaurus/pull/10820
         */
        svgs: () => ({
            use: [loaders.url({ folder: 'images' })],
            test: /\.svg$/i,
        }),
        fonts: () => ({
            use: [loaders.url({ folder: 'fonts' })],
            test: /\.(?:woff2?|eot|ttf|otf)$/i,
        }),
        /**
         * Loads audio and video and inlines them via a data URI if they are below
         * the size threshold
         */
        media: () => ({
            use: [loaders.url({ folder: 'medias' })],
            test: /\.(?:mp4|avi|mov|mkv|mpg|mpeg|vob|wmv|m4v|webm|ogv|wav|mp3|m4a|aac|oga|flac)$/i,
        }),
        otherAssets: () => ({
            use: [loaders.file({ folder: 'files' })],
            test: /\.(?:pdf|docx?|xlsx?|zip|rar)$/i,
        }),
    };
    return { loaders, rules };
}
const FileLoaderUtilsMap = {
    server: createFileLoaderUtils({ isServer: true }),
    client: createFileLoaderUtils({ isServer: false }),
};
/**
 * Returns unified loader configurations to be used for various file types.
 * Inspired by https://github.com/gatsbyjs/gatsby/blob/8e6e021014da310b9cc7d02e58c9b3efe938c665/packages/gatsby/src/utils/webpack-utils.ts#L447
 */
function getFileLoaderUtils(isServer) {
    return isServer ? FileLoaderUtilsMap.server : FileLoaderUtilsMap.client;
}
//# sourceMappingURL=webpackUtils.js.map