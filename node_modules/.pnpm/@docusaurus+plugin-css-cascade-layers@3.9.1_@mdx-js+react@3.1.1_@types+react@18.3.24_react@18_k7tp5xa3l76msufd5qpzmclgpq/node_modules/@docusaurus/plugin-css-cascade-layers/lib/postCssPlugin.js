"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostCssPluginWrapInLayer = void 0;
const layers_1 = require("./layers");
function wrapCssRootInLayer(root, layer) {
    const rootBefore = root.clone();
    root.removeAll();
    root.append({
        type: 'atrule',
        name: 'layer',
        params: layer,
        nodes: rootBefore.nodes,
    });
}
const PostCssPluginWrapInLayer = (options) => {
    if (!options) {
        throw new Error('PostCssPluginWrapInLayer options are mandatory');
    }
    const layers = Object.entries(options.layers);
    return {
        postcssPlugin: 'postcss-wrap-in-layer',
        Once(root) {
            const filePath = root.source?.input.file;
            if (!filePath) {
                return;
            }
            const layer = (0, layers_1.findLayer)(filePath, layers);
            if (layer) {
                wrapCssRootInLayer(root, layer);
            }
        },
    };
};
exports.PostCssPluginWrapInLayer = PostCssPluginWrapInLayer;
exports.PostCssPluginWrapInLayer.postcss = true;
