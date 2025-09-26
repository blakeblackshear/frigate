"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSwizzleContext = initSwizzleContext;
const site_1 = require("../../server/site");
const init_1 = require("../../server/plugins/init");
const configs_1 = require("../../server/plugins/configs");
async function getSwizzlePlugins(context) {
    const pluginConfigs = await (0, configs_1.loadPluginConfigs)(context);
    const pluginConfigInitResults = await (0, init_1.initPluginsConfigs)(context, pluginConfigs);
    return pluginConfigInitResults.flatMap((initResult) => {
        // Ignore self-disabling plugins returning null
        if (initResult.plugin === null) {
            return [];
        }
        return [
            // TODO this is a bit confusing, need refactor
            {
                plugin: initResult.config,
                instance: initResult.plugin,
            },
        ];
    });
}
async function initSwizzleContext(siteDir, options) {
    const context = await (0, site_1.loadContext)({ siteDir, config: options.config });
    return {
        plugins: await getSwizzlePlugins(context),
    };
}
