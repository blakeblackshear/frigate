"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBootstrapPlugin = createBootstrapPlugin;
exports.createMDXFallbackPlugin = createMDXFallbackPlugin;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const mdx_loader_1 = require("@docusaurus/mdx-loader");
/**
 * Make a synthetic plugin to:
 * - Inject site client modules
 * - Inject scripts/stylesheets
 */
function createBootstrapPlugin({ siteDir, siteConfig, }) {
    const { stylesheets, scripts, headTags, clientModules: siteConfigClientModules, } = siteConfig;
    return {
        name: 'docusaurus-bootstrap-plugin',
        options: {
            id: 'default',
        },
        version: { type: 'synthetic' },
        path: siteDir,
        getClientModules() {
            return siteConfigClientModules;
        },
        injectHtmlTags: () => {
            const stylesheetsTags = stylesheets.map((source) => typeof source === 'string'
                ? `<link rel="stylesheet" href="${source}">`
                : {
                    tagName: 'link',
                    attributes: {
                        rel: 'stylesheet',
                        ...source,
                    },
                });
            const scriptsTags = scripts.map((source) => typeof source === 'string'
                ? `<script src="${source}"></script>`
                : {
                    tagName: 'script',
                    attributes: {
                        ...source,
                    },
                });
            return {
                headTags: [...headTags, ...stylesheetsTags, ...scriptsTags],
            };
        },
    };
}
/**
 * Configure Webpack fallback mdx loader for md/mdx files out of content-plugin
 * folders. Adds a "fallback" mdx loader for mdx files that are not processed by
 * content plugins. This allows to do things such as importing repo/README.md as
 * a partial from another doc. Not ideal solution, but good enough for now
 */
async function createMDXFallbackPlugin({ siteDir, siteConfig, }) {
    const mdxLoaderItem = await (0, mdx_loader_1.createMDXLoaderItem)({
        useCrossCompilerCache: siteConfig.future.experimental_faster.mdxCrossCompilerCache,
        admonitions: true,
        staticDirs: siteConfig.staticDirectories.map((dir) => path_1.default.resolve(siteDir, dir)),
        siteDir,
        // External MDX files are always meant to be imported as partials
        isMDXPartial: () => true,
        // External MDX files might have front matter, just disable the warning
        isMDXPartialFrontMatterWarningDisabled: true,
        markdownConfig: siteConfig.markdown,
    });
    return {
        name: 'docusaurus-mdx-fallback-plugin',
        options: {
            id: 'default',
        },
        version: { type: 'synthetic' },
        // Synthetic, the path doesn't matter much
        path: '.',
        configureWebpack(config) {
            // We need the mdx fallback loader to exclude files that were already
            // processed by content plugins mdx loaders. This works, but a bit
            // hacky... Not sure there's a way to handle that differently in webpack
            function getMDXFallbackExcludedPaths() {
                const rules = config.module?.rules;
                return rules.flatMap((rule) => {
                    const isMDXRule = rule.test instanceof RegExp && rule.test.test('x.mdx');
                    return isMDXRule ? rule.include : [];
                });
            }
            return {
                module: {
                    rules: [
                        {
                            test: /\.mdx?$/i,
                            exclude: getMDXFallbackExcludedPaths(),
                            use: [mdxLoaderItem],
                        },
                    ],
                },
            };
        },
    };
}
