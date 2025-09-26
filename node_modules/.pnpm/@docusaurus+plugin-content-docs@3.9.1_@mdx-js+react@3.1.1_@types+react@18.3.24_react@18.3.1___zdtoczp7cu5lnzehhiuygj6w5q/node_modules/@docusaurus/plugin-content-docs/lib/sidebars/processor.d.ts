/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { NormalizedSidebars, ProcessedSidebars, SidebarProcessorParams, CategoryMetadataFile } from './types';
export declare function processSidebars(unprocessedSidebars: NormalizedSidebars, categoriesMetadata: {
    [filePath: string]: CategoryMetadataFile;
}, params: SidebarProcessorParams): Promise<ProcessedSidebars>;
