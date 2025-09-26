"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.printWarning = printWarning;
exports.normalizePluginOptions = normalizePluginOptions;
exports.normalizeThemeConfig = normalizeThemeConfig;
exports.validateFrontMatter = validateFrontMatter;
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const js_yaml_1 = tslib_1.__importDefault(require("js-yaml"));
const validationSchemas_1 = require("./validationSchemas");
/** Print warnings returned from Joi validation. */
function printWarning(warning) {
    if (warning) {
        const warningMessages = warning.details
            .map(({ message }) => message)
            .join('\n');
        logger_1.default.warn(warningMessages);
    }
}
/**
 * The callback that should be used to validate plugin options. Handles plugin
 * IDs on a generic level: no matter what the schema declares, this callback
 * would require a string ID or default to "default".
 */
function normalizePluginOptions(schema, 
// This allows us to automatically normalize undefined to { id: "default" }
options = {}) {
    // All plugins can be provided an "id" option (multi-instance support)
    // we add schema validation automatically
    const finalSchema = schema.append({
        id: validationSchemas_1.PluginIdSchema,
    });
    const { error, warning, value } = finalSchema.validate(options, {
        convert: false,
    });
    printWarning(warning);
    if (error) {
        throw error;
    }
    return value;
}
/**
 * The callback that should be used to validate theme config. No matter what the
 * schema declares, this callback would allow unknown attributes.
 */
function normalizeThemeConfig(schema, themeConfig) {
    // A theme should only validate its "slice" of the full themeConfig,
    // not the whole object, so we allow unknown attributes
    // otherwise one theme would fail validating the data of another theme
    const finalSchema = schema.unknown();
    const { error, warning, value } = finalSchema.validate(themeConfig, {
        convert: false,
    });
    printWarning(warning);
    if (error) {
        throw error;
    }
    return value;
}
/**
 * Validate front matter with better error message
 */
function validateFrontMatter(frontMatter, schema, options) {
    const { value, error, warning } = schema.validate(frontMatter, {
        convert: true,
        allowUnknown: true,
        abortEarly: false,
        ...options,
    });
    printWarning(warning);
    if (error) {
        const errorDetails = error.details;
        const invalidFields = errorDetails.map(({ path }) => path).join(', ');
        logger_1.default.error `The following front matter:
---
${js_yaml_1.default.dump(frontMatter)}---
contains invalid values for field(s): code=${invalidFields}.
${errorDetails.map(({ message }) => message)}
`;
        throw error;
    }
    return value;
}
//# sourceMappingURL=validationUtils.js.map