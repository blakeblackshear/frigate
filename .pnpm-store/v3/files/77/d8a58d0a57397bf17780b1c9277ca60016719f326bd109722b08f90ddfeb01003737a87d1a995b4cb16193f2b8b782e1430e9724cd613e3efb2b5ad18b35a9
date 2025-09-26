"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_OPTIONS = void 0;
exports.validateOptions = validateOptions;
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const utils_validation_1 = require("@docusaurus/utils-validation");
exports.DEFAULT_OPTIONS = {
    svgrConfig: {},
};
const pluginOptionsSchema = utils_validation_1.Joi.object({
    svgrConfig: utils_validation_1.Joi.object()
        .pattern(utils_validation_1.Joi.string(), utils_validation_1.Joi.any())
        .optional()
        .default(exports.DEFAULT_OPTIONS.svgrConfig),
}).default(exports.DEFAULT_OPTIONS);
function validateOptions({ validate, options, }) {
    return validate(pluginOptionsSchema, options);
}
