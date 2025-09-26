"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = build;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const logger_1 = tslib_1.__importStar(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const site_1 = require("../../server/site");
const i18n_1 = require("../../server/i18n");
const buildLocale_1 = require("./buildLocale");
const buildUtils_1 = require("./buildUtils");
async function build(siteDirParam = '.', cliOptions = {}) {
    process.env.BABEL_ENV = 'production';
    process.env.NODE_ENV = 'production';
    if (cliOptions.dev) {
        logger_1.default.info `Building in dev mode`;
        process.env.BABEL_ENV = 'development';
        process.env.NODE_ENV = 'development';
    }
    const siteDir = await fs_extra_1.default.realpath(siteDirParam);
    ['SIGINT', 'SIGTERM'].forEach((sig) => {
        process.on(sig, () => process.exit());
    });
    const locales = await logger_1.PerfLogger.async('Get locales to build', () => getLocalesToBuild({ siteDir, cliOptions }));
    if (locales.length > 1) {
        logger_1.default.info `Website will be built for all these locales: ${locales}`;
    }
    await logger_1.PerfLogger.async(`Build`, () => (0, utils_1.mapAsyncSequential)(locales, async (locale) => {
        await tryToBuildLocale({ siteDir, locale, cliOptions });
    }));
    logger_1.default.info `Use code=${'npm run serve'} command to test your build locally.`;
}
// We need the default locale to always be the 1st in the list. If we build it
// last, it would "erase" the localized sites built in sub-folders
function orderLocales({ locales, defaultLocale, }) {
    if (locales.includes(defaultLocale)) {
        return [
            defaultLocale,
            ...locales.filter((locale) => locale !== defaultLocale),
        ];
    }
    else {
        return locales;
    }
}
async function getLocalesToBuild({ siteDir, cliOptions, }) {
    // TODO we shouldn't need to load all context + i18n just to get that list
    // only loading siteConfig should be enough
    const context = await (0, site_1.loadContext)({
        siteDir,
        outDir: cliOptions.outDir,
        config: cliOptions.config,
        automaticBaseUrlLocalizationDisabled: (0, buildUtils_1.isAutomaticBaseUrlLocalizationDisabled)(cliOptions),
    });
    const i18n = await (0, i18n_1.loadI18n)({
        siteDir,
        config: context.siteConfig,
        currentLocale: context.siteConfig.i18n.defaultLocale, // Awkward but ok
        automaticBaseUrlLocalizationDisabled: false,
    });
    const locales = cliOptions.locale ?? i18n.locales;
    return orderLocales({
        locales: locales,
        defaultLocale: i18n.defaultLocale,
    });
}
async function tryToBuildLocale(params) {
    try {
        await logger_1.PerfLogger.async(`${logger_1.default.name(params.locale)}`, async () => {
            // Note: I tried to run buildLocale in worker_threads (still sequentially)
            // It didn't work and I got SIGSEGV / SIGBUS errors
            // See https://x.com/sebastienlorber/status/1848413716372480338
            await runBuildLocaleTask(params);
        });
    }
    catch (err) {
        throw new Error(logger_1.default.interpolate `Unable to build website for locale name=${params.locale}.`, {
            cause: err,
        });
    }
}
async function runBuildLocaleTask(params) {
    // Note: I tried to run buildLocale task in worker_threads (sequentially)
    // It didn't work and I got SIGSEGV / SIGBUS errors
    // Goal was to isolate memory of each localized site build
    // See also https://x.com/sebastienlorber/status/1848413716372480338
    //
    // Running in child_process worked but is more complex and requires
    // specifying the memory of the child process + weird logging issues to fix
    //
    // Note in the future we could try to enable concurrent localized site builds
    await (0, buildLocale_1.buildLocale)(params);
}
