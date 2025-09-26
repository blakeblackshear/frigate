/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Sidebars, Sidebar, SidebarItem, SidebarItemCategory, SidebarItemLink, SidebarItemDoc, SidebarCategoriesShorthand, SidebarItemConfig, SidebarItemCategoryWithGeneratedIndex, SidebarNavigationItem } from './types';
import type { DocMetadataBase, PropNavigationLink, VersionMetadata } from '@docusaurus/plugin-content-docs';
export declare function isCategoriesShorthand(item: SidebarItemConfig): item is SidebarCategoriesShorthand;
export declare function transformSidebarItems(sidebar: Sidebar, updateFn: (item: SidebarItem) => SidebarItem): Sidebar;
export declare function collectSidebarDocItems(sidebar: Sidebar): SidebarItemDoc[];
export declare function collectSidebarCategories(sidebar: Sidebar): SidebarItemCategory[];
export declare function collectSidebarLinks(sidebar: Sidebar): SidebarItemLink[];
export declare function collectSidebarRefs(sidebar: Sidebar): SidebarItemDoc[];
export declare function collectSidebarDocIds(sidebar: Sidebar): string[];
export declare function collectSidebarNavigation(sidebar: Sidebar): SidebarNavigationItem[];
export declare function collectSidebarsDocIds(sidebars: Sidebars): {
    [sidebarId: string]: string[];
};
export declare function collectSidebarsNavigations(sidebars: Sidebars): {
    [sidebarId: string]: SidebarNavigationItem[];
};
export type SidebarNavigation = {
    sidebarName: string | undefined;
    previous: SidebarNavigationItem | undefined;
    next: SidebarNavigationItem | undefined;
};
export type SidebarsUtils = {
    sidebars: Sidebars;
    getFirstDocIdOfFirstSidebar: () => string | undefined;
    getSidebarNameByDocId: (docId: string) => string | undefined;
    getDocNavigation: (params: {
        docId: string;
        displayedSidebar: string | null | undefined;
        unlistedIds: Set<string>;
    }) => SidebarNavigation;
    getCategoryGeneratedIndexList: () => SidebarItemCategoryWithGeneratedIndex[];
    getCategoryGeneratedIndexNavigation: (categoryGeneratedIndexPermalink: string) => SidebarNavigation;
    /**
     * This function may return undefined. This is usually a user mistake, because
     * it means this sidebar will never be displayed; however, we can still use
     * `displayed_sidebar` to make it displayed. Pretty weird but valid use-case
     */
    getFirstLink: (sidebarId: string) => {
        type: 'doc';
        id: string;
        label: string;
    } | {
        type: 'generated-index';
        permalink: string;
        label: string;
    } | undefined;
    checkLegacyVersionedSidebarNames: ({ versionMetadata, }: {
        sidebarFilePath: string;
        versionMetadata: VersionMetadata;
    }) => void;
    checkSidebarsDocIds: ({ allDocIds, sidebarFilePath, versionMetadata, }: {
        allDocIds: string[];
        sidebarFilePath: string;
        versionMetadata: VersionMetadata;
    }) => void;
};
export declare function createSidebarsUtils(sidebars: Sidebars): SidebarsUtils;
export declare function toDocNavigationLink(doc: DocMetadataBase, options?: {
    sidebarItemLabel?: string;
}): PropNavigationLink;
export declare function toNavigationLink(navigationItem: SidebarNavigationItem | undefined, docsById: {
    [docId: string]: DocMetadataBase;
}): PropNavigationLink | undefined;
