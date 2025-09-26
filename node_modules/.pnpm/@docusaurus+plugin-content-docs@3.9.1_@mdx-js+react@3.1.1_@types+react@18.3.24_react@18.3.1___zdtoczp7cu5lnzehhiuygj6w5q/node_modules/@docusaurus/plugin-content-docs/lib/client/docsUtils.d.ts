/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
import { type GlobalVersion, type GlobalSidebar, type GlobalDoc } from '@docusaurus/plugin-content-docs/client';
import type { Props as DocRootProps } from '@theme/DocRoot';
import type { PropSidebar, PropSidebarItem, PropSidebarItemCategory, PropVersionDoc, PropSidebarBreadcrumbsItem } from '@docusaurus/plugin-content-docs';
/**
 * A null-safe way to access a doc's data by ID in the active version.
 */
export declare function useDocById(id: string): PropVersionDoc;
/**
 * A null-safe way to access a doc's data by ID in the active version.
 */
export declare function useDocById(id: string | undefined): PropVersionDoc | undefined;
/**
 * Pure function, similar to `Array#find`, but works on the sidebar tree.
 */
export declare function findSidebarCategory(sidebar: PropSidebar, predicate: (category: PropSidebarItemCategory) => boolean): PropSidebarItemCategory | undefined;
/**
 * Best effort to assign a link to a sidebar category. If the category doesn't
 * have a link itself, we link to the first sub item with a link.
 */
export declare function findFirstSidebarItemCategoryLink(item: PropSidebarItemCategory): string | undefined;
/**
 * Best effort to assign a link to a sidebar item.
 */
export declare function findFirstSidebarItemLink(item: PropSidebarItem): string | undefined;
/**
 * Gets the category associated with the current location. Should only be used
 * on category index pages.
 */
export declare function useCurrentSidebarCategory(): PropSidebarItemCategory;
/**
 * Gets the category associated with the current location. Should only be used
 * on category index pages.
 */
export declare function useCurrentSidebarSiblings(): PropSidebarItem[];
/**
 * Checks if a sidebar item should be active, based on the active path.
 */
export declare function isActiveSidebarItem(item: PropSidebarItem, activePath: string): boolean;
export declare function isVisibleSidebarItem(item: PropSidebarItem, activePath: string): boolean;
export declare function useVisibleSidebarItems(items: readonly PropSidebarItem[], activePath: string): PropSidebarItem[];
/**
 * Gets the breadcrumbs of the current doc page, based on its sidebar location.
 * Returns `null` if there's no sidebar or breadcrumbs are disabled.
 */
export declare function useSidebarBreadcrumbs(): PropSidebarBreadcrumbsItem[] | null;
/**
 * "Version candidates" are mostly useful for the layout components, which must
 * be able to work on all pages. For example, if a user has `{ type: "doc",
 * docId: "intro" }` as a navbar item, which version does that refer to? We
 * believe that it could refer to at most three version candidates:
 *
 * 1. The **active version**, the one that the user is currently browsing. See
 * {@link useActiveDocContext}.
 * 2. The **preferred version**, the one that the user last visited. See
 * {@link useDocsPreferredVersion}.
 * 3. The **latest version**, the "default". See {@link useLatestVersion}.
 *
 * @param docsPluginId The plugin ID to get versions from.
 * @returns An array of 1~3 versions with priorities defined above, guaranteed
 * to be unique and non-sparse. Will be memoized, hence stable for deps array.
 */
export declare function useDocsVersionCandidates(docsPluginId?: string): [GlobalVersion, ...GlobalVersion[]];
/**
 * The layout components, like navbar items, must be able to work on all pages,
 * even on non-doc ones where there's no version context, so a sidebar ID could
 * be ambiguous. This hook would always return a sidebar to be linked to. See
 * also {@link useDocsVersionCandidates} for how this selection is done.
 *
 * @throws This hook throws if a sidebar with said ID is not found.
 */
export declare function useLayoutDocsSidebar(sidebarId: string, docsPluginId?: string): GlobalSidebar;
/**
 * The layout components, like navbar items, must be able to work on all pages,
 * even on non-doc ones where there's no version context, so a doc ID could be
 * ambiguous. This hook would always return a doc to be linked to. See also
 * {@link useDocsVersionCandidates} for how this selection is done.
 *
 * @throws This hook throws if a doc with said ID is not found.
 */
export declare function useLayoutDoc(docId: string, docsPluginId?: string): GlobalDoc | null;
/**
 * The docs plugin creates nested routes, with the top-level route providing the
 * version metadata, and the subroutes creating individual doc pages. This hook
 * will match the current location against all known sub-routes.
 *
 * @param props The props received by `@theme/DocRoot`
 * @returns The data of the relevant document at the current location, or `null`
 * if no document associated with the current location can be found.
 */
export declare function useDocRootMetadata({ route }: DocRootProps): null | {
    /** The element that should be rendered at the current location. */
    docElement: ReactNode;
    /**
     * The name of the sidebar associated with the current doc. `sidebarName` and
     * `sidebarItems` correspond to the value of {@link useDocsSidebar}.
     */
    sidebarName: string | undefined;
    /** The items of the sidebar associated with the current doc. */
    sidebarItems: PropSidebar | undefined;
};
/**
 * Filter items we don't want to display on the doc card list view
 * @param items
 */
export declare function filterDocCardListItems(items: PropSidebarItem[]): PropSidebarItem[];
