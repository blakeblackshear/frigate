/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { NormalizedSidebarItem, NormalizedSidebars, SidebarItemConfig, SidebarsConfig } from './types';
/**
 * Normalizes recursively item and all its children. Ensures that at the end
 * each item will be an object with the corresponding type.
 */
export declare function normalizeItem(item: SidebarItemConfig): NormalizedSidebarItem[];
export declare function normalizeSidebars(sidebars: SidebarsConfig): NormalizedSidebars;
