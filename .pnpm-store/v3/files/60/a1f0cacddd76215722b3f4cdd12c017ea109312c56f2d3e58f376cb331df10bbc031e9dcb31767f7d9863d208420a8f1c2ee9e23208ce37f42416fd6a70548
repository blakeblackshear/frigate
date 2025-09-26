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
const utils_1 = require("@docusaurus/utils");
exports.DEFAULT_OPTIONS = {
    path: 'src/pages', // Path to data on filesystem, relative to site dir.
    routeBasePath: '/', // URL Route.
    include: ['**/*.{js,jsx,ts,tsx,md,mdx}'], // Extensions to include.
    exclude: utils_1.GlobExcludeDefault,
    mdxPageComponent: '@theme/MDXPage',
    remarkPlugins: [],
    rehypePlugins: [],
    recmaPlugins: [],
    beforeDefaultRehypePlugins: [],
    beforeDefaultRemarkPlugins: [],
    admonitions: true,
    showLastUpdateTime: false,
    showLastUpdateAuthor: false,
    editLocalizedFiles: false,
};
const PluginOptionSchema = utils_validation_1.Joi.object({
    path: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.path),
    routeBasePath: utils_validation_1.RouteBasePathSchema.default(exports.DEFAULT_OPTIONS.routeBasePath),
    include: utils_validation_1.Joi.array().items(utils_validation_1.Joi.string()).default(exports.DEFAULT_OPTIONS.include),
    exclude: utils_validation_1.Joi.array().items(utils_validation_1.Joi.string()).default(exports.DEFAULT_OPTIONS.exclude),
    mdxPageComponent: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.mdxPageComponent),
    remarkPlugins: utils_validation_1.RemarkPluginsSchema.default(exports.DEFAULT_OPTIONS.remarkPlugins),
    rehypePlugins: utils_validation_1.RehypePluginsSchema.default(exports.DEFAULT_OPTIONS.rehypePlugins),
    recmaPlugins: utils_validation_1.RecmaPluginsSchema.default(exports.DEFAULT_OPTIONS.recmaPlugins),
    beforeDefaultRehypePlugins: utils_validation_1.RehypePluginsSchema.default(exports.DEFAULT_OPTIONS.beforeDefaultRehypePlugins),
    beforeDefaultRemarkPlugins: utils_validation_1.RemarkPluginsSchema.default(exports.DEFAULT_OPTIONS.beforeDefaultRemarkPlugins),
    admonitions: utils_validation_1.AdmonitionsSchema.default(exports.DEFAULT_OPTIONS.admonitions),
    showLastUpdateTime: utils_validation_1.Joi.bool().default(exports.DEFAULT_OPTIONS.showLastUpdateTime),
    showLastUpdateAuthor: utils_validation_1.Joi.bool().default(exports.DEFAULT_OPTIONS.showLastUpdateAuthor),
    editUrl: utils_validation_1.Joi.alternatives().try(utils_validation_1.URISchema, utils_validation_1.Joi.function()),
    editLocalizedFiles: utils_validation_1.Joi.boolean().default(exports.DEFAULT_OPTIONS.editLocalizedFiles),
});
function validateOptions({ validate, options, }) {
    const validatedOptions = validate(PluginOptionSchema, options);
    return validatedOptions;
}
