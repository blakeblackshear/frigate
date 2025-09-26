"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPresets = loadPresets;
const module_1 = require("module");
const utils_1 = require("@docusaurus/utils");
const moduleShorthand_1 = require("./moduleShorthand");
/**
 * Calls preset functions, aggregates each of their return values, and returns
 * the plugin and theme configs.
 */
async function loadPresets(context) {
    // We need to resolve plugins from the perspective of the site config, as if
    // we are using `require.resolve` on those module names.
    const presetRequire = (0, module_1.createRequire)(context.siteConfigPath);
    const presets = context.siteConfig.presets.filter((p) => !!p);
    async function loadPreset(presetItem) {
        let presetModuleImport;
        let presetOptions = {};
        if (typeof presetItem === 'string') {
            presetModuleImport = presetItem;
        }
        else {
            [presetModuleImport, presetOptions] = presetItem;
        }
        const presetName = (0, moduleShorthand_1.resolveModuleName)(presetModuleImport, presetRequire, 'preset');
        const presetPath = presetRequire.resolve(presetName);
        const presetModule = (await (0, utils_1.loadFreshModule)(presetPath));
        const presetFunction = presetModule.default ?? presetModule;
        return presetFunction(context, presetOptions);
    }
    const loadedPresets = await Promise.all(presets.map(loadPreset));
    const plugins = loadedPresets.flatMap((preset) => preset.plugins ?? []);
    const themes = loadedPresets.flatMap((preset) => preset.themes ?? []);
    return { plugins, themes };
}
