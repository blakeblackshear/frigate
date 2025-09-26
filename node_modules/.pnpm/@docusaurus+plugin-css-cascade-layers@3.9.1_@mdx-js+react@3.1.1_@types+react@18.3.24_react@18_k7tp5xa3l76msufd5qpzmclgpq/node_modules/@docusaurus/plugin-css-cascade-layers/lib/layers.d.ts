/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export type LayerEntry = [string, (filePath: string) => boolean];
export declare function isValidLayerName(layer: string): boolean;
export declare function generateLayersDeclaration(layers: string[]): string;
export declare function findLayer(filePath: string, layers: LayerEntry[]): string | undefined;
