"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionsSchema = void 0;
const utils_validation_1 = require("@docusaurus/utils-validation");
const sidebarGenerators = utils_validation_1.Joi.object({
    createDocItem: utils_validation_1.Joi.function(),
});
const sidebarOptions = utils_validation_1.Joi.object({
    groupPathsBy: utils_validation_1.Joi.string().valid("tag", "tagGroup"),
    categoryLinkSource: utils_validation_1.Joi.string().valid("tag", "info", "auto"),
    customProps: utils_validation_1.Joi.object(),
    sidebarCollapsible: utils_validation_1.Joi.boolean(),
    sidebarCollapsed: utils_validation_1.Joi.boolean(),
    sidebarGenerators: sidebarGenerators,
});
const markdownGenerators = utils_validation_1.Joi.object({
    createApiPageMD: utils_validation_1.Joi.function(),
    createInfoPageMD: utils_validation_1.Joi.function(),
    createTagPageMD: utils_validation_1.Joi.function(),
    createSchemaPageMD: utils_validation_1.Joi.function(),
});
exports.OptionsSchema = utils_validation_1.Joi.object({
    id: utils_validation_1.Joi.string().required(),
    docsPlugin: utils_validation_1.Joi.string(),
    docsPluginId: utils_validation_1.Joi.string().required(),
    config: utils_validation_1.Joi.object()
        .pattern(/^/, utils_validation_1.Joi.object({
        specPath: utils_validation_1.Joi.string().required(),
        proxy: utils_validation_1.Joi.string(),
        outputDir: utils_validation_1.Joi.string().required(),
        template: utils_validation_1.Joi.string(),
        infoTemplate: utils_validation_1.Joi.string(),
        tagTemplate: utils_validation_1.Joi.string(),
        schemaTemplate: utils_validation_1.Joi.string(),
        downloadUrl: utils_validation_1.Joi.string(),
        hideSendButton: utils_validation_1.Joi.boolean(),
        showExtensions: utils_validation_1.Joi.boolean(),
        sidebarOptions: sidebarOptions,
        markdownGenerators: markdownGenerators,
        showSchemas: utils_validation_1.Joi.boolean(),
        disableCompression: utils_validation_1.Joi.boolean(),
        version: utils_validation_1.Joi.string().when("versions", {
            is: utils_validation_1.Joi.exist(),
            then: utils_validation_1.Joi.required(),
        }),
        label: utils_validation_1.Joi.string().when("versions", {
            is: utils_validation_1.Joi.exist(),
            then: utils_validation_1.Joi.required(),
        }),
        baseUrl: utils_validation_1.Joi.string().when("versions", {
            is: utils_validation_1.Joi.exist(),
            then: utils_validation_1.Joi.required(),
        }),
        versions: utils_validation_1.Joi.object().pattern(/^/, utils_validation_1.Joi.object({
            specPath: utils_validation_1.Joi.string().required(),
            outputDir: utils_validation_1.Joi.string().required(),
            label: utils_validation_1.Joi.string().required(),
            baseUrl: utils_validation_1.Joi.string().required(),
            downloadUrl: utils_validation_1.Joi.string(),
        })),
    }))
        .required(),
});
