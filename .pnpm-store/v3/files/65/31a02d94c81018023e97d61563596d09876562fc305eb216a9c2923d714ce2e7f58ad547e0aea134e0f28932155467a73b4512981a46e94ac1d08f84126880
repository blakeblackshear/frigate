"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schema = exports.DEFAULT_CONFIG = void 0;
exports.validateThemeConfig = validateThemeConfig;
const utils_1 = require("@docusaurus/utils");
const utils_validation_1 = require("@docusaurus/utils-validation");
const docSearchVersion_1 = require("./docSearchVersion");
exports.DEFAULT_CONFIG = {
    // Enabled by default, as it makes sense in most cases
    // see also https://github.com/facebook/docusaurus/issues/5880
    contextualSearch: true,
    searchParameters: {},
    searchPagePath: 'search',
};
const FacetFiltersSchema = utils_validation_1.Joi.array().items(utils_validation_1.Joi.alternatives().try(utils_validation_1.Joi.string(), utils_validation_1.Joi.array().items(utils_validation_1.Joi.string())));
exports.Schema = utils_validation_1.Joi.object({
    algolia: utils_validation_1.Joi.object({
        // Docusaurus attributes
        contextualSearch: utils_validation_1.Joi.boolean().default(exports.DEFAULT_CONFIG.contextualSearch),
        externalUrlRegex: utils_validation_1.Joi.string().optional(),
        // Algolia attributes
        appId: utils_validation_1.Joi.string().required().messages({
            'any.required': '"algolia.appId" is required. If you haven\'t migrated to the new DocSearch infra, please refer to the blog post for instructions: https://docusaurus.io/blog/2021/11/21/algolia-docsearch-migration',
        }),
        apiKey: utils_validation_1.Joi.string().required(),
        indexName: utils_validation_1.Joi.string().required(),
        searchParameters: utils_validation_1.Joi.object({
            facetFilters: FacetFiltersSchema.optional(),
        })
            .default(exports.DEFAULT_CONFIG.searchParameters)
            .unknown(),
        searchPagePath: utils_validation_1.Joi.alternatives()
            .try(utils_validation_1.Joi.boolean().invalid(true), utils_validation_1.Joi.string())
            .allow(null)
            .default(exports.DEFAULT_CONFIG.searchPagePath),
        replaceSearchResultPathname: utils_validation_1.Joi.object({
            from: utils_validation_1.Joi.custom((from) => {
                if (typeof from === 'string') {
                    return (0, utils_1.escapeRegexp)(from);
                }
                else if (from instanceof RegExp) {
                    return from.source;
                }
                throw new Error(`it should be a RegExp or a string, but received ${from}`);
            }).required(),
            to: utils_validation_1.Joi.string().required(),
        }).optional(),
        // Ask AI configuration (DocSearch v4 only)
        askAi: utils_validation_1.Joi.alternatives()
            .try(
        // Simple string format (assistantId only)
        utils_validation_1.Joi.string(), 
        // Full configuration object
        utils_validation_1.Joi.object({
            indexName: utils_validation_1.Joi.string().required(),
            apiKey: utils_validation_1.Joi.string().required(),
            appId: utils_validation_1.Joi.string().required(),
            assistantId: utils_validation_1.Joi.string().required(),
            searchParameters: utils_validation_1.Joi.object({
                facetFilters: FacetFiltersSchema.optional(),
            }).optional(),
        }))
            .custom((askAiInput, helpers) => {
            if (!askAiInput) {
                return askAiInput;
            }
            const algolia = helpers.state.ancestors[0];
            const algoliaFacetFilters = algolia.searchParameters?.facetFilters;
            if (typeof askAiInput === 'string') {
                return {
                    assistantId: askAiInput,
                    indexName: algolia.indexName,
                    apiKey: algolia.apiKey,
                    appId: algolia.appId,
                    ...(algoliaFacetFilters
                        ? {
                            searchParameters: {
                                facetFilters: algoliaFacetFilters,
                            },
                        }
                        : {}),
                };
            }
            if (askAiInput.searchParameters?.facetFilters === undefined &&
                algoliaFacetFilters) {
                askAiInput.searchParameters = askAiInput.searchParameters ?? {};
                askAiInput.searchParameters.facetFilters = algoliaFacetFilters;
            }
            return askAiInput;
        })
            .optional()
            .messages({
            'alternatives.types': 'askAi must be either a string (assistantId) or an object with indexName, apiKey, appId, and assistantId',
        }),
    })
        .label('themeConfig.algolia')
        .required()
        .unknown(),
});
// TODO Docusaurus v4: remove this check when we drop DocSearch v3
function ensureAskAISupported(themeConfig) {
    // enforce DocsSearch v4 requirement when AskAI is configured
    if (themeConfig.algolia.askAi && docSearchVersion_1.docSearchV3) {
        throw new Error('The askAi feature is only supported in DocSearch v4. ' +
            'Please upgrade to DocSearch v4 by installing "@docsearch/react": "^4.0.0" ' +
            'or remove the askAi configuration from your theme config.');
    }
}
function validateThemeConfig({ validate, themeConfig: themeConfigInput, }) {
    const themeConfig = validate(exports.Schema, themeConfigInput);
    ensureAskAISupported(themeConfig);
    return themeConfig;
}
