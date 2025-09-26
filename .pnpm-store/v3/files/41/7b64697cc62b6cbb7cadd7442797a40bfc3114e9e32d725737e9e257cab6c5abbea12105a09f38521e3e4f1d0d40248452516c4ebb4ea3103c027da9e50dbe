"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectAllSiteMessages = collectAllSiteMessages;
exports.emitSiteMessages = emitSiteMessages;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const babel_1 = require("@docusaurus/babel");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const uselessBabelConfigMessages = async ({ site }) => {
    const { props: { siteDir, siteConfig }, } = site;
    if (siteConfig.future.experimental_faster.swcJsLoader) {
        const babelConfigFilePath = await (0, babel_1.getCustomBabelConfigFilePath)(siteDir);
        if (babelConfigFilePath) {
            return [
                {
                    type: 'warning',
                    message: `Your site is using the SWC js loader. You can safely remove the Babel config file at ${logger_1.default.code(path_1.default.relative(process.cwd(), babelConfigFilePath))}.`,
                },
            ];
        }
    }
    return [];
};
async function collectAllSiteMessages(params) {
    const messageCreators = [uselessBabelConfigMessages];
    return (await Promise.all(messageCreators.map((createMessages) => createMessages(params)))).flat();
}
function printSiteMessages(siteMessages) {
    const [errors, warnings] = lodash_1.default.partition(siteMessages, (sm) => sm.type === 'error');
    if (errors.length > 0) {
        logger_1.default.error(`Docusaurus site errors:
- ${errors.map((sm) => sm.message).join('\n- ')}`);
    }
    if (warnings.length > 0) {
        logger_1.default.warn(`Docusaurus site warnings:
- ${warnings.map((sm) => sm.message).join('\n- ')}`);
    }
}
async function emitSiteMessages(params) {
    const siteMessages = await collectAllSiteMessages(params);
    printSiteMessages(siteMessages);
}
