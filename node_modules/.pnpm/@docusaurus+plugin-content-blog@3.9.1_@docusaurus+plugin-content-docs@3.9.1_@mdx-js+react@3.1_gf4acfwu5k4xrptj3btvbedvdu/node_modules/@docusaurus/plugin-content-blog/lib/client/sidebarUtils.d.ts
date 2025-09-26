/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
import type { BlogSidebarItem } from '@docusaurus/plugin-content-blog';
/**
 * Return the visible blog sidebar items to display.
 * Unlisted items are filtered.
 */
export declare function useVisibleBlogSidebarItems(items: BlogSidebarItem[]): BlogSidebarItem[];
export declare function groupBlogSidebarItemsByYear(items: BlogSidebarItem[]): [string, BlogSidebarItem[]][];
export declare function BlogSidebarItemList({ items, ulClassName, liClassName, linkClassName, linkActiveClassName, }: {
    items: BlogSidebarItem[];
    ulClassName?: string;
    liClassName?: string;
    linkClassName?: string;
    linkActiveClassName?: string;
}): ReactNode;
