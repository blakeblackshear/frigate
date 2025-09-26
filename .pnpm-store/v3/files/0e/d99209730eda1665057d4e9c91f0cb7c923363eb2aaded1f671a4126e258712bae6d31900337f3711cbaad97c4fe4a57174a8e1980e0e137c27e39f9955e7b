"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOptions = void 0;
exports.default = pluginContentPages;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("@docusaurus/utils");
const mdx_loader_1 = require("@docusaurus/mdx-loader");
const routes_1 = require("./routes");
const content_1 = require("./content");
async function pluginContentPages(context, options) {
    const { siteConfig, siteDir, generatedFilesDir } = context;
    const contentPaths = (0, content_1.createPagesContentPaths)({ context, options });
    const pluginDataDirRoot = path_1.default.join(generatedFilesDir, 'docusaurus-plugin-content-pages');
    const dataDir = path_1.default.join(pluginDataDirRoot, options.id ?? utils_1.DEFAULT_PLUGIN_ID);
    async function createPagesMDXLoaderRule() {
        const { admonitions, rehypePlugins, remarkPlugins, recmaPlugins, beforeDefaultRehypePlugins, beforeDefaultRemarkPlugins, } = options;
        const contentDirs = (0, utils_1.getContentPathList)(contentPaths);
        return (0, mdx_loader_1.createMDXLoaderRule)({
            include: contentDirs
                // Trailing slash is important, see https://github.com/facebook/docusaurus/pull/3970
                .map(utils_1.addTrailingPathSeparator),
            options: {
                useCrossCompilerCache: siteConfig.future.experimental_faster.mdxCrossCompilerCache,
                admonitions,
                remarkPlugins,
                rehypePlugins,
                recmaPlugins,
                beforeDefaultRehypePlugins,
                beforeDefaultRemarkPlugins,
                staticDirs: siteConfig.staticDirectories.map((dir) => path_1.default.resolve(siteDir, dir)),
                siteDir,
                isMDXPartial: (0, utils_1.createAbsoluteFilePathMatcher)(options.exclude, contentDirs),
                metadataPath: (mdxPath) => {
                    // Note that metadataPath must be the same/in-sync as
                    // the path from createData for each MDX.
                    const aliasedSource = (0, utils_1.aliasedSitePath)(mdxPath, siteDir);
                    return path_1.default.join(dataDir, `${(0, utils_1.docuHash)(aliasedSource)}.json`);
                },
                // createAssets converts relative paths to require() calls
                createAssets: ({ frontMatter }) => ({
                    image: frontMatter.image,
                }),
                markdownConfig: siteConfig.markdown,
            },
        });
    }
    const pagesMDXLoaderRule = await createPagesMDXLoaderRule();
    return {
        name: 'docusaurus-plugin-content-pages',
        getPathsToWatch() {
            const { include } = options;
            return (0, utils_1.getContentPathList)(contentPaths).flatMap((contentPath) => include.map((pattern) => `${contentPath}/${pattern}`));
        },
        async loadContent() {
            if (!(await fs_extra_1.default.pathExists(contentPaths.contentPath))) {
                return null;
            }
            return (0, content_1.loadPagesContent)({ context, options, contentPaths });
        },
        async contentLoaded({ content, actions }) {
            if (!content) {
                return;
            }
            await (0, routes_1.createAllRoutes)({ content, options, actions });
        },
        configureWebpack() {
            return {
                module: {
                    rules: [pagesMDXLoaderRule],
                },
            };
        },
    };
}
var options_1 = require("./options");
Object.defineProperty(exports, "validateOptions", { enumerable: true, get: function () { return options_1.validateOptions; } });
