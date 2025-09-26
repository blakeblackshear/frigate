"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSSGRenderer = loadSSGRenderer;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
// TODO eval is archived / unmaintained: https://github.com/pierrec/node-eval
//  We should internalize/modernize it
const eval_1 = tslib_1.__importDefault(require("eval"));
const p_map_1 = tslib_1.__importDefault(require("p-map"));
const logger_1 = tslib_1.__importStar(require("@docusaurus/logger"));
const bundler_1 = require("@docusaurus/bundler");
const ssgTemplate_1 = require("./ssgTemplate");
const ssgEnv_1 = require("./ssgEnv");
const ssgUtils_1 = require("./ssgUtils");
const ssgNodeRequire_1 = require("./ssgNodeRequire");
async function loadAppRenderer({ serverBundlePath, }) {
    const source = await logger_1.PerfLogger.async(`Load server bundle`, () => fs_extra_1.default.readFile(serverBundlePath));
    const filename = path_1.default.basename(serverBundlePath);
    const ssgRequire = (0, ssgNodeRequire_1.createSSGRequire)(serverBundlePath);
    const globals = {
        // When using "new URL('file.js', import.meta.url)", Webpack will emit
        // __filename, and this plugin will throw. not sure the __filename value
        // has any importance for this plugin, just using an empty string to
        // avoid the error. See https://github.com/facebook/docusaurus/issues/4922
        __filename: '',
        // This uses module.createRequire() instead of very old "require-like" lib
        // See also: https://github.com/pierrec/node-eval/issues/33
        require: ssgRequire.require,
    };
    const serverEntry = await logger_1.PerfLogger.async(`Evaluate server bundle`, () => (0, eval_1.default)(source, 
    /* filename: */ filename, 
    /* scope: */ globals, 
    /* includeGlobals: */ true));
    if (!serverEntry?.default || typeof serverEntry.default !== 'function') {
        throw new Error(`Docusaurus Bug: server bundle export from "${filename}" must be a function that renders the Docusaurus React app, not ${typeof serverEntry?.default}`);
    }
    async function shutdown() {
        ssgRequire.cleanup();
    }
    return {
        render: serverEntry.default,
        shutdown,
    };
}
async function loadSSGRenderer({ params, }) {
    const [appRenderer, htmlMinifier, ssgTemplate] = await Promise.all([
        logger_1.PerfLogger.async('Load App renderer', () => loadAppRenderer({
            serverBundlePath: params.serverBundlePath,
        })),
        logger_1.PerfLogger.async('Load HTML minifier', () => (0, bundler_1.getHtmlMinifier)({
            type: params.htmlMinifierType,
        })),
        logger_1.PerfLogger.async('Compile SSG template', () => (0, ssgTemplate_1.compileSSGTemplate)(params.ssgTemplateContent)),
    ]);
    return {
        renderPathnames: (pathnames) => {
            return (0, p_map_1.default)(pathnames, async (pathname) => generateStaticFile({
                pathname,
                appRenderer,
                params,
                htmlMinifier,
                ssgTemplate,
            }), { concurrency: ssgEnv_1.SSGConcurrency });
        },
        shutdown: async () => {
            await appRenderer.shutdown();
        },
    };
}
// We reduce the page collected data structure after the HTML file is written
// Some data (modules, metadata.internal) is only useful to create the HTML file
// It's not useful to aggregate that collected data in memory
// Keep this data structure as small as possible
// See https://github.com/facebook/docusaurus/pull/11162
function reduceCollectedData(pageCollectedData) {
    // We re-create the object from scratch
    // We absolutely want to avoid TS duck typing
    return {
        anchors: pageCollectedData.anchors,
        metadata: {
            public: pageCollectedData.metadata.public,
            helmet: pageCollectedData.metadata.helmet,
        },
        links: pageCollectedData.links,
    };
}
async function generateStaticFile({ pathname, appRenderer, params, htmlMinifier, ssgTemplate, }) {
    try {
        // This only renders the app HTML
        const appRenderResult = await appRenderer.render({
            pathname,
            v4RemoveLegacyPostBuildHeadAttribute: params.v4RemoveLegacyPostBuildHeadAttribute,
        });
        // This renders the full page HTML, including head tags...
        const fullPageHtml = (0, ssgTemplate_1.renderSSGTemplate)({
            params,
            result: appRenderResult,
            ssgTemplate,
        });
        const minifierResult = await htmlMinifier.minify(fullPageHtml);
        await (0, ssgUtils_1.writeStaticFile)({
            pathname,
            content: minifierResult.code,
            params,
        });
        const collectedData = reduceCollectedData(appRenderResult.collectedData);
        return {
            success: true,
            pathname,
            result: {
                collectedData,
                // As of today, only the html minifier can emit SSG warnings
                warnings: minifierResult.warnings,
            },
        };
    }
    catch (errorUnknown) {
        const error = errorUnknown;
        const tips = getSSGErrorTips(error);
        const message = logger_1.default.interpolate `Can't render static file for pathname path=${pathname}${tips ? `\n\n${tips}` : ''}`;
        return {
            success: false,
            pathname,
            error: new Error(message, {
                cause: error,
            }),
        };
    }
}
function getSSGErrorTips(error) {
    const parts = [];
    const isNotDefinedErrorRegex = /(?:window|document|localStorage|navigator|alert|location|buffer|self) is not defined/i;
    if (isNotDefinedErrorRegex.test(error.message)) {
        parts.push(`It looks like you are using code that should run on the client-side only.
To get around it, try using one of:
- ${logger_1.default.code('<BrowserOnly>')} (${logger_1.default.url('https://docusaurus.io/docs/docusaurus-core/#browseronly')})
- ${logger_1.default.code('ExecutionEnvironment')} (${logger_1.default.url('https://docusaurus.io/docs/docusaurus-core/#executionenvironment')}).
It might also require to wrap your client code in ${logger_1.default.code('useEffect')} hook and/or import a third-party library dynamically (if any).`);
    }
    return parts.join('\n');
}
