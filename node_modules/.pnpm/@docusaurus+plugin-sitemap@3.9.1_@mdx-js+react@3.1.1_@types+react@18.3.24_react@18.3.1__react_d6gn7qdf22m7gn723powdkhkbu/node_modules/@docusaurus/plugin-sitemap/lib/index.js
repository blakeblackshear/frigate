"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOptions = void 0;
exports.default = pluginSitemap;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const createSitemap_1 = tslib_1.__importDefault(require("./createSitemap"));
const PluginName = 'docusaurus-plugin-sitemap';
function pluginSitemap(context, options) {
    if (context.siteConfig.future.experimental_router === 'hash') {
        logger_1.default.warn(`${PluginName} does not support the Hash Router and will be disabled.`);
        return null;
    }
    return {
        name: PluginName,
        async postBuild({ siteConfig, routes, outDir, routesBuildMetadata }) {
            if (siteConfig.noIndex) {
                return;
            }
            // Generate sitemap.
            const generatedSitemap = await (0, createSitemap_1.default)({
                siteConfig,
                routes,
                routesBuildMetadata,
                options,
            });
            if (!generatedSitemap) {
                return;
            }
            // Write sitemap file.
            const sitemapPath = path_1.default.join(outDir, options.filename);
            try {
                await fs_extra_1.default.outputFile(sitemapPath, generatedSitemap);
            }
            catch (err) {
                logger_1.default.error('Writing sitemap failed.');
                throw err;
            }
        },
    };
}
var options_1 = require("./options");
Object.defineProperty(exports, "validateOptions", { enumerable: true, get: function () { return options_1.validateOptions; } });
