"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_OPTIONS = void 0;
exports.validateOptions = validateOptions;
exports.validateThemeConfig = validateThemeConfig;
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const utils_validation_1 = require("@docusaurus/utils-validation");
exports.DEFAULT_OPTIONS = {
    anonymizeIP: false,
};
const pluginOptionsSchema = utils_validation_1.Joi.object({
    // We normalize trackingID as a string[]
    trackingID: utils_validation_1.Joi.alternatives()
        .try(utils_validation_1.Joi.alternatives().conditional(utils_validation_1.Joi.string().required(), {
        then: utils_validation_1.Joi.custom((val) => [val]),
    }), utils_validation_1.Joi.array().items(utils_validation_1.Joi.string().required()))
        .required(),
    anonymizeIP: utils_validation_1.Joi.boolean().default(exports.DEFAULT_OPTIONS.anonymizeIP),
});
function validateOptions({ validate, options, }) {
    return validate(pluginOptionsSchema, options);
}
function validateThemeConfig({ themeConfig, }) {
    if ('gtag' in themeConfig) {
        throw new Error('The "gtag" field in themeConfig should now be specified as option for plugin-google-gtag. More information at https://github.com/facebook/docusaurus/pull/5832.');
    }
    return themeConfig;
}
