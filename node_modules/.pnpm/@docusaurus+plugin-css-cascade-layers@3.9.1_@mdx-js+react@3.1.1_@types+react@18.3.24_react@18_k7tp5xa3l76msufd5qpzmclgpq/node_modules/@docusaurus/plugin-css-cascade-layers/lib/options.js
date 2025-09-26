"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_OPTIONS = exports.DEFAULT_LAYERS = void 0;
exports.validateOptions = validateOptions;
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const utils_validation_1 = require("@docusaurus/utils-validation");
const utils_1 = require("@docusaurus/utils");
const layers_1 = require("./layers");
// Not ideal to compute layers using "filePath.includes()"
// But this is mostly temporary until we add first-class layers everywhere
function layerFor(...params) {
    return (filePath) => {
        const posixFilePath = (0, utils_1.posixPath)(filePath);
        return params.some((p) => posixFilePath.includes(p));
    };
}
// Object order matters, it defines the layer order
exports.DEFAULT_LAYERS = {
    'docusaurus.infima': layerFor('node_modules/infima/dist'),
    'docusaurus.theme-common': layerFor('packages/docusaurus-theme-common/lib', 'node_modules/@docusaurus/theme-common/lib'),
    'docusaurus.theme-classic': layerFor('packages/docusaurus-theme-classic/lib', 'node_modules/@docusaurus/theme-classic/lib'),
    'docusaurus.core': layerFor('packages/docusaurus/lib', 'node_modules/@docusaurus/core/lib'),
    'docusaurus.plugin-debug': layerFor('packages/docusaurus-plugin-debug/lib', 'node_modules/@docusaurus/plugin-debug/lib'),
    'docusaurus.theme-mermaid': layerFor('packages/docusaurus-theme-mermaid/lib', 'node_modules/@docusaurus/theme-mermaid/lib'),
    'docusaurus.theme-live-codeblock': layerFor('packages/docusaurus-theme-live-codeblock/lib', 'node_modules/@docusaurus/theme-live-codeblock/lib'),
    'docusaurus.theme-search-algolia.docsearch': layerFor('node_modules/@docsearch/css/dist'),
    'docusaurus.theme-search-algolia': layerFor('packages/docusaurus-theme-search-algolia/lib', 'node_modules/@docusaurus/theme-search-algolia/lib'),
    // docusaurus.website layer ? (declare it, even if empty?)
};
exports.DEFAULT_OPTIONS = {
    id: 'default',
    layers: exports.DEFAULT_LAYERS,
};
const pluginOptionsSchema = utils_validation_1.Joi.object({
    layers: utils_validation_1.Joi.object()
        .pattern(utils_validation_1.Joi.custom((val, helpers) => {
        if (!(0, layers_1.isValidLayerName)(val)) {
            return helpers.error('any.invalid');
        }
        return val;
    }), utils_validation_1.Joi.function().arity(1).required())
        .default(exports.DEFAULT_LAYERS),
});
function validateOptions({ validate, options, }) {
    return validate(pluginOptionsSchema, options);
}
