"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidLayerName = isValidLayerName;
exports.generateLayersDeclaration = generateLayersDeclaration;
exports.findLayer = findLayer;
function isValidLayerName(layer) {
    // TODO improve validation rule to match spec, not high priority
    return !layer.includes(',') && !layer.includes(' ');
}
function generateLayersDeclaration(layers) {
    return `@layer ${layers.join(', ')};`;
}
function findLayer(filePath, layers) {
    // Using find() => layers order matter
    // The first layer that matches is used in priority even if others match too
    const layerEntry = layers.find((layer) => layer[1](filePath));
    return layerEntry?.[0]; // return layer name
}
