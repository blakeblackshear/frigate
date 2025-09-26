"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateThemeConfig = void 0;
exports.default = themeSearchAlgolia;
const utils_1 = require("@docusaurus/utils");
const theme_translations_1 = require("@docusaurus/theme-translations");
const opensearch_1 = require("./opensearch");
const docSearchVersion_1 = require("./docSearchVersion");
function themeSearchAlgolia(context) {
    const { baseUrl, siteConfig: { themeConfig }, i18n: { currentLocale }, } = context;
    const { algolia: { searchPagePath }, } = themeConfig;
    return {
        name: 'docusaurus-theme-search-algolia',
        getThemePath() {
            return '../lib/theme';
        },
        getTypeScriptThemePath() {
            return '../src/theme';
        },
        getDefaultCodeTranslationMessages() {
            return (0, theme_translations_1.readDefaultCodeTranslationMessages)({
                locale: currentLocale,
                name: 'theme-search-algolia',
            });
        },
        contentLoaded({ actions: { addRoute } }) {
            if (searchPagePath) {
                addRoute({
                    path: (0, utils_1.normalizeUrl)([baseUrl, searchPagePath]),
                    component: '@theme/SearchPage',
                    exact: true,
                });
            }
        },
        async postBuild() {
            if ((0, opensearch_1.shouldCreateOpenSearchFile)({ context })) {
                await (0, opensearch_1.createOpenSearchFile)({ context });
            }
        },
        injectHtmlTags() {
            if ((0, opensearch_1.shouldCreateOpenSearchFile)({ context })) {
                return { headTags: (0, opensearch_1.createOpenSearchHeadTags)({ context }) };
            }
            return {};
        },
        configureWebpack() {
            // TODO Docusaurus v4: remove after dropping DocSearch v3 support
            if (docSearchVersion_1.docSearchV3) {
                // These aliases ensure DocSearch v3 imports are compatible with
                // the newly added DocSearch v4 entry points
                // See https://github.com/algolia/docsearch/pull/2764
                const docSearchV3Entry = require.resolve('@docsearch/react');
                return {
                    resolve: {
                        alias: {
                            '@docsearch/react/version': docSearchV3Entry,
                            '@docsearch/react/useDocSearchKeyboardEvents': docSearchV3Entry,
                            '@docsearch/react/useTheme': docSearchV3Entry,
                        },
                    },
                };
            }
            return undefined;
        },
    };
}
var validateThemeConfig_1 = require("./validateThemeConfig");
Object.defineProperty(exports, "validateThemeConfig", { enumerable: true, get: function () { return validateThemeConfig_1.validateThemeConfig; } });
