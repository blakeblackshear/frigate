"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schema = exports.DEFAULT_THEME_CONFIG = void 0;
exports.validateThemeConfig = validateThemeConfig;
const utils_validation_1 = require("@docusaurus/utils-validation");
exports.DEFAULT_THEME_CONFIG = {
    mermaid: {
        theme: {
            dark: 'dark',
            light: 'default',
        },
        options: {},
    },
};
exports.Schema = utils_validation_1.Joi.object({
    mermaid: utils_validation_1.Joi.object({
        theme: utils_validation_1.Joi.object({
            dark: utils_validation_1.Joi.string().default(exports.DEFAULT_THEME_CONFIG.mermaid.theme.dark),
            light: utils_validation_1.Joi.string().default(exports.DEFAULT_THEME_CONFIG.mermaid.theme.light),
        }).default(exports.DEFAULT_THEME_CONFIG.mermaid.theme),
        options: utils_validation_1.Joi.object().default(exports.DEFAULT_THEME_CONFIG.mermaid.options),
    }).default(exports.DEFAULT_THEME_CONFIG.mermaid),
});
function validateThemeConfig({ validate, themeConfig, }) {
    return validate(exports.Schema, themeConfig);
}
