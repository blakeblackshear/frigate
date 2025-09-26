/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { useMemo } from 'react';
import { matchPath, useLocation } from '@docusaurus/router';
import renderRoutes from '@docusaurus/renderRoutes';
import { useActivePlugin, useActiveDocContext, useLatestVersion, } from '@docusaurus/plugin-content-docs/client';
import { isSamePath } from '@docusaurus/theme-common/internal';
import { uniq } from '@docusaurus/theme-common';
import { useDocsPreferredVersion } from './docsPreferredVersion';
import { useDocsVersion } from './docsVersion';
import { useDocsSidebar } from './docsSidebar';
export function useDocById(id) {
    const version = useDocsVersion();
    if (!id) {
        return undefined;
    }
    const doc = version.docs[id];
    if (!doc) {
        throw new Error(`no version doc found by id=${id}`);
    }
    return doc;
}
/**
 * Pure function, similar to `Array#find`, but works on the sidebar tree.
 */
export function findSidebarCategory(sidebar, predicate) {
    for (const item of sidebar) {
        if (item.type === 'category') {
            if (predicate(item)) {
                return item;
            }
            const subItem = findSidebarCategory(item.items, predicate);
            if (subItem) {
                return subItem;
            }
        }
    }
    return undefined;
}
/**
 * Best effort to assign a link to a sidebar category. If the category doesn't
 * have a link itself, we link to the first sub item with a link.
 */
export function findFirstSidebarItemCategoryLink(item) {
    if (item.href && !item.linkUnlisted) {
        return item.href;
    }
    for (const subItem of item.items) {
        const link = findFirstSidebarItemLink(subItem);
        if (link) {
            return link;
        }
    }
    return undefined;
}
/**
 * Best effort to assign a link to a sidebar item.
 */
export function findFirstSidebarItemLink(item) {
    if (item.type === 'link' && !item.unlisted) {
        return item.href;
    }
    if (item.type === 'category') {
        return findFirstSidebarItemCategoryLink(item);
    }
    // Other items types, like "html"
    return undefined;
}
/**
 * Gets the category associated with the current location. Should only be used
 * on category index pages.
 */
export function useCurrentSidebarCategory() {
    const { pathname } = useLocation();
    const sidebar = useDocsSidebar();
    if (!sidebar) {
        throw new Error('Unexpected: cant find current sidebar in context');
    }
    const categoryBreadcrumbs = getSidebarBreadcrumbs({
        sidebarItems: sidebar.items,
        pathname,
        onlyCategories: true,
    });
    const deepestCategory = categoryBreadcrumbs.slice(-1)[0];
    if (!deepestCategory) {
        throw new Error(`${pathname} is not associated with a category. useCurrentSidebarCategory() should only be used on category index pages.`);
    }
    return deepestCategory;
}
/**
 * Gets the category associated with the current location. Should only be used
 * on category index pages.
 */
export function useCurrentSidebarSiblings() {
    const { pathname } = useLocation();
    const sidebar = useDocsSidebar();
    if (!sidebar) {
        throw new Error('Unexpected: cant find current sidebar in context');
    }
    const categoryBreadcrumbs = getSidebarBreadcrumbs({
        sidebarItems: sidebar.items,
        pathname,
        onlyCategories: true,
    });
    const deepestCategory = categoryBreadcrumbs.slice(-1)[0];
    return deepestCategory?.items ?? sidebar.items;
}
const isActive = (testedPath, activePath) => typeof testedPath !== 'undefined' && isSamePath(testedPath, activePath);
const containsActiveSidebarItem = (items, activePath) => items.some((subItem) => isActiveSidebarItem(subItem, activePath));
/**
 * Checks if a sidebar item should be active, based on the active path.
 */
export function isActiveSidebarItem(item, activePath) {
    if (item.type === 'link') {
        return isActive(item.href, activePath);
    }
    if (item.type === 'category') {
        return (isActive(item.href, activePath) ||
            containsActiveSidebarItem(item.items, activePath));
    }
    return false;
}
export function isVisibleSidebarItem(item, activePath) {
    switch (item.type) {
        case 'category':
            return (isActiveSidebarItem(item, activePath) ||
                (typeof item.href !== 'undefined' && !item.linkUnlisted) ||
                item.items.some((subItem) => isVisibleSidebarItem(subItem, activePath)));
        case 'link':
            // An unlisted item remains visible if it is active
            return !item.unlisted || isActiveSidebarItem(item, activePath);
        default:
            return true;
    }
}
export function useVisibleSidebarItems(items, activePath) {
    return useMemo(() => items.filter((item) => isVisibleSidebarItem(item, activePath)), [items, activePath]);
}
/**
 * Get the sidebar the breadcrumbs for a given pathname
 * Ordered from top to bottom
 */
function getSidebarBreadcrumbs({ sidebarItems, pathname, onlyCategories = false, }) {
    const breadcrumbs = [];
    function extract(items) {
        for (const item of items) {
            if ((item.type === 'category' &&
                (isSamePath(item.href, pathname) || extract(item.items))) ||
                (item.type === 'link' && isSamePath(item.href, pathname))) {
                const filtered = onlyCategories && item.type !== 'category';
                if (!filtered) {
                    breadcrumbs.unshift(item);
                }
                return true;
            }
        }
        return false;
    }
    extract(sidebarItems);
    return breadcrumbs;
}
/**
 * Gets the breadcrumbs of the current doc page, based on its sidebar location.
 * Returns `null` if there's no sidebar or breadcrumbs are disabled.
 */
export function useSidebarBreadcrumbs() {
    const sidebar = useDocsSidebar();
    const { pathname } = useLocation();
    const breadcrumbsOption = useActivePlugin()?.pluginData.breadcrumbs;
    if (breadcrumbsOption === false || !sidebar) {
        return null;
    }
    return getSidebarBreadcrumbs({ sidebarItems: sidebar.items, pathname });
}
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
export function useDocsVersionCandidates(docsPluginId) {
    const { activeVersion } = useActiveDocContext(docsPluginId);
    const { preferredVersion } = useDocsPreferredVersion(docsPluginId);
    const latestVersion = useLatestVersion(docsPluginId);
    return useMemo(() => uniq([activeVersion, preferredVersion, latestVersion].filter(Boolean)), [activeVersion, preferredVersion, latestVersion]);
}
/**
 * The layout components, like navbar items, must be able to work on all pages,
 * even on non-doc ones where there's no version context, so a sidebar ID could
 * be ambiguous. This hook would always return a sidebar to be linked to. See
 * also {@link useDocsVersionCandidates} for how this selection is done.
 *
 * @throws This hook throws if a sidebar with said ID is not found.
 */
export function useLayoutDocsSidebar(sidebarId, docsPluginId) {
    const versions = useDocsVersionCandidates(docsPluginId);
    return useMemo(() => {
        const allSidebars = versions.flatMap((version) => version.sidebars ? Object.entries(version.sidebars) : []);
        const sidebarEntry = allSidebars.find((sidebar) => sidebar[0] === sidebarId);
        if (!sidebarEntry) {
            throw new Error(`Can't find any sidebar with id "${sidebarId}" in version${versions.length > 1 ? 's' : ''} ${versions.map((version) => version.name).join(', ')}".
Available sidebar ids are:
- ${allSidebars.map((entry) => entry[0]).join('\n- ')}`);
        }
        return sidebarEntry[1];
    }, [sidebarId, versions]);
}
/**
 * The layout components, like navbar items, must be able to work on all pages,
 * even on non-doc ones where there's no version context, so a doc ID could be
 * ambiguous. This hook would always return a doc to be linked to. See also
 * {@link useDocsVersionCandidates} for how this selection is done.
 *
 * @throws This hook throws if a doc with said ID is not found.
 */
export function useLayoutDoc(docId, docsPluginId) {
    const versions = useDocsVersionCandidates(docsPluginId);
    return useMemo(() => {
        const allDocs = versions.flatMap((version) => version.docs);
        const doc = allDocs.find((versionDoc) => versionDoc.id === docId);
        if (!doc) {
            const isDraft = versions
                .flatMap((version) => version.draftIds)
                .includes(docId);
            // Drafts should be silently filtered instead of throwing
            if (isDraft) {
                return null;
            }
            throw new Error(`Couldn't find any doc with id "${docId}" in version${versions.length > 1 ? 's' : ''} "${versions.map((version) => version.name).join(', ')}".
Available doc ids are:
- ${uniq(allDocs.map((versionDoc) => versionDoc.id)).join('\n- ')}`);
        }
        return doc;
    }, [docId, versions]);
}
// TODO later read version/route directly from context
/**
 * The docs plugin creates nested routes, with the top-level route providing the
 * version metadata, and the subroutes creating individual doc pages. This hook
 * will match the current location against all known sub-routes.
 *
 * @param props The props received by `@theme/DocRoot`
 * @returns The data of the relevant document at the current location, or `null`
 * if no document associated with the current location can be found.
 */
export function useDocRootMetadata({ route }) {
    const location = useLocation();
    const versionMetadata = useDocsVersion();
    const docRoutes = route.routes;
    const currentDocRoute = docRoutes.find((docRoute) => matchPath(location.pathname, docRoute));
    if (!currentDocRoute) {
        return null;
    }
    // For now, the sidebarName is added as route config: not ideal!
    const sidebarName = currentDocRoute.sidebar;
    const sidebarItems = sidebarName
        ? versionMetadata.docsSidebars[sidebarName]
        : undefined;
    const docElement = renderRoutes(docRoutes);
    return {
        docElement,
        sidebarName,
        sidebarItems,
    };
}
/**
 * Filter items we don't want to display on the doc card list view
 * @param items
 */
export function filterDocCardListItems(items) {
    return items.filter((item) => {
        const canHaveLink = item.type === 'category' || item.type === 'link';
        if (canHaveLink) {
            return !!findFirstSidebarItemLink(item);
        }
        return true;
    });
}
