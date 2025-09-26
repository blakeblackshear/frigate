"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSwizzleConfig = normalizeSwizzleConfig;
exports.getThemeSwizzleConfig = getThemeSwizzleConfig;
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_validation_1 = require("@docusaurus/utils-validation");
const common_1 = require("./common");
const themes_1 = require("./themes");
function getModuleSwizzleConfig(swizzlePlugin) {
    const getSwizzleConfig = swizzlePlugin.plugin.plugin.getSwizzleConfig ??
        swizzlePlugin.plugin.pluginModule?.module.getSwizzleConfig;
    if (getSwizzleConfig) {
        return getSwizzleConfig();
    }
    // TODO deprecate getSwizzleComponentList later
    const getSwizzleComponentList = swizzlePlugin.plugin.plugin.getSwizzleComponentList ??
        swizzlePlugin.plugin.pluginModule?.module.getSwizzleComponentList;
    if (getSwizzleComponentList) {
        const safeComponents = getSwizzleComponentList() ?? [];
        const safeComponentConfig = {
            actions: {
                eject: 'safe',
                wrap: 'safe',
            },
            description: undefined,
        };
        return {
            components: Object.fromEntries(safeComponents.map((comp) => [comp, safeComponentConfig])),
        };
    }
    return undefined;
}
const SwizzleConfigSchema = utils_validation_1.Joi.object({
    components: utils_validation_1.Joi.object()
        .pattern(utils_validation_1.Joi.string(), utils_validation_1.Joi.object({
        actions: utils_validation_1.Joi.object().pattern(utils_validation_1.Joi.string().valid(...common_1.SwizzleActions), utils_validation_1.Joi.string().valid(...common_1.SwizzleActionsStatuses)),
        description: utils_validation_1.Joi.string(),
    }))
        .required(),
});
function validateSwizzleConfig(unsafeSwizzleConfig) {
    const result = SwizzleConfigSchema.validate(unsafeSwizzleConfig);
    if (result.error) {
        throw new Error(`Swizzle config does not match expected schema: ${result.error.message}`);
    }
    return result.value;
}
function normalizeSwizzleConfig(unsafeSwizzleConfig) {
    const swizzleConfig = validateSwizzleConfig(unsafeSwizzleConfig);
    // Ensure all components always declare all actions
    Object.values(swizzleConfig.components).forEach((componentConfig) => {
        common_1.SwizzleActions.forEach((action) => {
            if (!componentConfig.actions[action]) {
                componentConfig.actions[action] = 'unsafe';
            }
        });
    });
    return swizzleConfig;
}
const FallbackSwizzleConfig = {
    components: {},
};
function getThemeSwizzleConfig(themeName, plugins) {
    const plugin = (0, themes_1.getPluginByThemeName)(plugins, themeName);
    const config = getModuleSwizzleConfig(plugin);
    if (config) {
        try {
            return normalizeSwizzleConfig(config);
        }
        catch (err) {
            logger_1.default.error `Invalid Swizzle config for theme name=${themeName}.`;
            throw err;
        }
    }
    return FallbackSwizzleConfig;
}
