"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOptions = void 0;
exports.default = pluginCssCascadeLayers;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const postCssPlugin_1 = require("./postCssPlugin");
const layers_1 = require("./layers");
const PluginName = 'docusaurus-plugin-css-cascade-layers';
const LayersDeclarationModule = 'layers.css';
function getLayersDeclarationPath(context, options) {
    const { generatedFilesDir } = context;
    const pluginId = options.id;
    if (pluginId !== 'default') {
        // Since it's only possible to declare a single layer order
        // using this plugin twice doesn't really make sense
        throw new Error('The CSS Cascade Layers plugin does not support multiple instances.');
    }
    return path_1.default.join(generatedFilesDir, PluginName, pluginId, LayersDeclarationModule);
}
function pluginCssCascadeLayers(context, options) {
    const layersDeclarationPath = getLayersDeclarationPath(context, options);
    return {
        name: PluginName,
        getClientModules() {
            return [layersDeclarationPath];
        },
        async contentLoaded({ actions }) {
            await actions.createData(LayersDeclarationModule, (0, layers_1.generateLayersDeclaration)(Object.keys(options.layers)));
        },
        configurePostCss(postCssOptions) {
            postCssOptions.plugins.push((0, postCssPlugin_1.PostCssPluginWrapInLayer)(options));
            return postCssOptions;
        },
    };
}
var options_1 = require("./options");
Object.defineProperty(exports, "validateOptions", { enumerable: true, get: function () { return options_1.validateOptions; } });
