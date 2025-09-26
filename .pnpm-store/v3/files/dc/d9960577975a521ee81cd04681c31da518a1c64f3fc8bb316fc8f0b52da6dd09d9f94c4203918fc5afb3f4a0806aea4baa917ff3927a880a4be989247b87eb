"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSiteConfig = loadSiteConfig;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const configValidation_1 = require("./configValidation");
async function findConfig(siteDir) {
    // We could support .mjs, .ts, etc. in the future
    const candidates = ['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs'].map((ext) => utils_1.DEFAULT_CONFIG_FILE_NAME + ext);
    const configPath = await (0, utils_1.findAsyncSequential)(candidates.map((file) => path_1.default.join(siteDir, file)), fs_extra_1.default.pathExists);
    if (!configPath) {
        const relativeSiteDir = path_1.default.relative(process.cwd(), siteDir);
        throw new Error(logger_1.default.interpolate `No config file found in site dir code=${relativeSiteDir}.
Expected one of:${candidates.map(logger_1.default.code)}
You can provide a custom config path with the code=${'--config'} option.
    `);
    }
    return configPath;
}
async function loadSiteConfig({ siteDir, customConfigFilePath, }) {
    const siteConfigPath = customConfigFilePath
        ? path_1.default.resolve(siteDir, customConfigFilePath)
        : await findConfig(siteDir);
    if (!(await fs_extra_1.default.pathExists(siteConfigPath))) {
        throw new Error(`Config file at "${siteConfigPath}" not found.`);
    }
    const importedConfig = await (0, utils_1.loadFreshModule)(siteConfigPath);
    const loadedConfig = typeof importedConfig === 'function'
        ? await importedConfig()
        : await importedConfig;
    const siteConfig = (0, configValidation_1.validateConfig)(loadedConfig, path_1.default.relative(siteDir, siteConfigPath));
    return { siteConfig, siteConfigPath };
}
