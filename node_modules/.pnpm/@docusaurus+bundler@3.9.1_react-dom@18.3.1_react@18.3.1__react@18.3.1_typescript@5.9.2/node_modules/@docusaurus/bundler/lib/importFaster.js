"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.importRspack = importRspack;
exports.importSwcLoader = importSwcLoader;
exports.importGetSwcLoaderOptions = importGetSwcLoaderOptions;
exports.importSwcJsMinimizerOptions = importSwcJsMinimizerOptions;
exports.importSwcHtmlMinifier = importSwcHtmlMinifier;
exports.importGetBrowserslistQueries = importGetBrowserslistQueries;
exports.importLightningCssMinimizerOptions = importLightningCssMinimizerOptions;
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
async function importFaster() {
    return import('@docusaurus/faster');
}
async function ensureFaster() {
    try {
        return await importFaster();
    }
    catch (error) {
        throw new Error(`To enable Docusaurus Faster options, your site must add the ${logger_1.default.name('@docusaurus/faster')} package as a dependency.`, { cause: error });
    }
}
async function importRspack() {
    const faster = await ensureFaster();
    return faster.rspack;
}
async function importSwcLoader() {
    const faster = await ensureFaster();
    return faster.swcLoader;
}
async function importGetSwcLoaderOptions() {
    const faster = await ensureFaster();
    return faster.getSwcLoaderOptions;
}
async function importSwcJsMinimizerOptions() {
    const faster = await ensureFaster();
    return faster.getSwcJsMinimizerOptions();
}
async function importSwcHtmlMinifier() {
    const faster = await ensureFaster();
    return faster.getSwcHtmlMinifier();
}
async function importGetBrowserslistQueries() {
    const faster = await ensureFaster();
    return faster.getBrowserslistQueries;
}
async function importLightningCssMinimizerOptions() {
    const faster = await ensureFaster();
    return faster.getLightningCssMinimizerOptions();
}
//# sourceMappingURL=importFaster.js.map