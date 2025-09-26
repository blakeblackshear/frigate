"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOptions = exports.validateThemeConfig = exports.getSwizzleConfig = void 0;
exports.default = themeClassic;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const rtlcss_1 = tslib_1.__importDefault(require("rtlcss"));
const theme_translations_1 = require("@docusaurus/theme-translations");
const translations_1 = require("./translations");
const inlineScripts_1 = require("./inlineScripts");
const inlineSvgSprites_1 = require("./inlineSvgSprites");
function getInfimaCSSFile(direction) {
    return `infima/dist/css/default/default${direction === 'rtl' ? '-rtl' : ''}.css`;
}
function themeClassic(context, options) {
    const { i18n: { currentLocale, localeConfigs }, siteStorage, } = context;
    const themeConfig = context.siteConfig.themeConfig;
    const { announcementBar, colorMode, prism: { additionalLanguages }, } = themeConfig;
    const { customCss } = options;
    const { direction } = localeConfigs[currentLocale];
    return {
        name: 'docusaurus-theme-classic',
        getThemePath() {
            return '../lib/theme';
        },
        getTypeScriptThemePath() {
            return '../src/theme';
        },
        getTranslationFiles: () => (0, translations_1.getTranslationFiles)({ themeConfig }),
        translateThemeConfig: (params) => (0, translations_1.translateThemeConfig)({
            themeConfig: params.themeConfig,
            translationFiles: params.translationFiles,
        }),
        getDefaultCodeTranslationMessages() {
            return (0, theme_translations_1.readDefaultCodeTranslationMessages)({
                locale: currentLocale,
                name: 'theme-common',
            });
        },
        getClientModules() {
            const modules = [
                require.resolve(getInfimaCSSFile(direction)),
                './prism-include-languages',
                './nprogress',
            ];
            modules.push(...customCss.map((p) => path_1.default.resolve(context.siteDir, p)));
            return modules;
        },
        configureWebpack(__config, __isServer, { currentBundler }) {
            const prismLanguages = additionalLanguages
                .map((lang) => `prism-${lang}`)
                .join('|');
            return {
                plugins: [
                    // This allows better optimization by only bundling those components
                    // that the user actually needs, because the modules are dynamically
                    // required and can't be known during compile time.
                    new currentBundler.instance.ContextReplacementPlugin(/prismjs[\\/]components$/, new RegExp(`^./(${prismLanguages})$`)),
                ],
            };
        },
        configurePostCss(postCssOptions) {
            if (direction === 'rtl') {
                const resolvedInfimaFile = require.resolve(getInfimaCSSFile(direction));
                const plugin = {
                    postcssPlugin: 'RtlCssPlugin',
                    prepare: (result) => {
                        const file = result.root.source?.input.file;
                        // Skip Infima as we are using the its RTL version.
                        if (file === resolvedInfimaFile) {
                            return {};
                        }
                        return (0, rtlcss_1.default)(result.root);
                    },
                };
                postCssOptions.plugins.push(plugin);
            }
            return postCssOptions;
        },
        injectHtmlTags() {
            return {
                preBodyTags: [
                    {
                        tagName: 'svg',
                        attributes: {
                            style: 'display: none;',
                        },
                        innerHTML: inlineSvgSprites_1.SvgSpriteDefs,
                    },
                    {
                        tagName: 'script',
                        innerHTML: `
${(0, inlineScripts_1.getThemeInlineScript)({ colorMode, siteStorage })}
${inlineScripts_1.DataAttributeQueryStringInlineJavaScript}
${announcementBar ? (0, inlineScripts_1.getAnnouncementBarInlineScript)({ siteStorage }) : ''}
            `,
                    },
                ],
            };
        },
    };
}
var getSwizzleConfig_1 = require("./getSwizzleConfig");
Object.defineProperty(exports, "getSwizzleConfig", { enumerable: true, get: function () { return tslib_1.__importDefault(getSwizzleConfig_1).default; } });
var options_1 = require("./options");
Object.defineProperty(exports, "validateThemeConfig", { enumerable: true, get: function () { return options_1.validateThemeConfig; } });
Object.defineProperty(exports, "validateOptions", { enumerable: true, get: function () { return options_1.validateOptions; } });
