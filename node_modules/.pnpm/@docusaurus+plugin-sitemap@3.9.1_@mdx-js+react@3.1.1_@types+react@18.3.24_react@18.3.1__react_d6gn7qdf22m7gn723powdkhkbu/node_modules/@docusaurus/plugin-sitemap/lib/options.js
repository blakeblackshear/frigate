"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_OPTIONS = void 0;
exports.validateOptions = validateOptions;
const utils_validation_1 = require("@docusaurus/utils-validation");
const types_1 = require("./types");
exports.DEFAULT_OPTIONS = {
    filename: 'sitemap.xml',
    ignorePatterns: [],
    // TODO Docusaurus v4 breaking change
    //  change default to "date" if no bug or perf issue reported
    lastmod: null,
    // TODO Docusaurus v4 breaking change
    //  those options are useless and should be removed
    changefreq: 'weekly',
    priority: 0.5,
};
const PluginOptionSchema = utils_validation_1.Joi.object({
    // @ts-expect-error: forbidden
    cacheTime: utils_validation_1.Joi.forbidden().messages({
        'any.unknown': 'Option `cacheTime` in sitemap config is deprecated. Please remove it.',
    }),
    // TODO remove for Docusaurus v4 breaking changes?
    //  This is not even used by Google crawlers
    //  See also https://github.com/facebook/docusaurus/issues/2604
    changefreq: utils_validation_1.Joi.string()
        .valid(null, ...types_1.ChangeFreqList)
        .default(exports.DEFAULT_OPTIONS.changefreq),
    // TODO remove for Docusaurus v4 breaking changes?
    //  This is not even used by Google crawlers
    //  The priority is "relative", and using the same priority for all routes
    //  does not make sense according to the spec
    //  See also https://github.com/facebook/docusaurus/issues/2604
    //  See also https://www.sitemaps.org/protocol.html
    priority: utils_validation_1.Joi.alternatives()
        .try(utils_validation_1.Joi.valid(null), utils_validation_1.Joi.number().min(0).max(1))
        .default(exports.DEFAULT_OPTIONS.priority),
    lastmod: utils_validation_1.Joi.string()
        .valid(null, ...types_1.LastModOptionList)
        .default(exports.DEFAULT_OPTIONS.lastmod),
    createSitemapItems: utils_validation_1.Joi.function(),
    ignorePatterns: utils_validation_1.Joi.array()
        .items(utils_validation_1.Joi.string())
        .default(exports.DEFAULT_OPTIONS.ignorePatterns),
    trailingSlash: utils_validation_1.Joi.forbidden().messages({
        'any.unknown': 'Please use the new Docusaurus global trailingSlash config instead, and the sitemaps plugin will use it.',
    }),
    filename: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.filename),
});
function validateOptions({ validate, options, }) {
    const validatedOptions = validate(PluginOptionSchema, options);
    return validatedOptions;
}
