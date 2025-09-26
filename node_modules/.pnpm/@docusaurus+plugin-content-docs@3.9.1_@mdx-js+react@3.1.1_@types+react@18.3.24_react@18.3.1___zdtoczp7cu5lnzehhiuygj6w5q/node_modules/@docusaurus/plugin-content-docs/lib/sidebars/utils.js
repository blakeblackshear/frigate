"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCategoriesShorthand = isCategoriesShorthand;
exports.transformSidebarItems = transformSidebarItems;
exports.collectSidebarDocItems = collectSidebarDocItems;
exports.collectSidebarCategories = collectSidebarCategories;
exports.collectSidebarLinks = collectSidebarLinks;
exports.collectSidebarRefs = collectSidebarRefs;
exports.collectSidebarDocIds = collectSidebarDocIds;
exports.collectSidebarNavigation = collectSidebarNavigation;
exports.collectSidebarsDocIds = collectSidebarsDocIds;
exports.collectSidebarsNavigations = collectSidebarsNavigations;
exports.createSidebarsUtils = createSidebarsUtils;
exports.toDocNavigationLink = toDocNavigationLink;
exports.toNavigationLink = toNavigationLink;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
function isCategoriesShorthand(item) {
    return typeof item === 'object' && !item.type;
}
function transformSidebarItems(sidebar, updateFn) {
    function transformRecursive(item) {
        if (item.type === 'category') {
            return updateFn({
                ...item,
                items: item.items.map(transformRecursive),
            });
        }
        return updateFn(item);
    }
    return sidebar.map(transformRecursive);
}
/**
 * Flatten sidebar items into a single flat array (containing categories/docs on
 * the same level). Order matters (useful for next/prev nav), top categories
 * appear before their child elements
 */
function flattenSidebarItems(items) {
    function flattenRecursive(item) {
        return item.type === 'category'
            ? [item, ...item.items.flatMap(flattenRecursive)]
            : [item];
    }
    return items.flatMap(flattenRecursive);
}
function collectSidebarItemsOfType(type, sidebar) {
    return flattenSidebarItems(sidebar).filter((item) => item.type === type);
}
function collectSidebarDocItems(sidebar) {
    return collectSidebarItemsOfType('doc', sidebar);
}
function collectSidebarCategories(sidebar) {
    return collectSidebarItemsOfType('category', sidebar);
}
function collectSidebarLinks(sidebar) {
    return collectSidebarItemsOfType('link', sidebar);
}
function collectSidebarRefs(sidebar) {
    return collectSidebarItemsOfType('ref', sidebar);
}
// /!\ docId order matters for navigation!
function collectSidebarDocIds(sidebar) {
    return flattenSidebarItems(sidebar).flatMap((item) => {
        if (item.type === 'category') {
            return item.link?.type === 'doc' ? [item.link.id] : [];
        }
        if (item.type === 'doc') {
            return [item.id];
        }
        return [];
    });
}
function collectSidebarNavigation(sidebar) {
    return flattenSidebarItems(sidebar).flatMap((item) => {
        if (item.type === 'category' && item.link) {
            return [item];
        }
        if (item.type === 'doc') {
            return [item];
        }
        return [];
    });
}
function collectSidebarsDocIds(sidebars) {
    return lodash_1.default.mapValues(sidebars, collectSidebarDocIds);
}
function collectSidebarsNavigations(sidebars) {
    return lodash_1.default.mapValues(sidebars, collectSidebarNavigation);
}
function createSidebarsUtils(sidebars) {
    const sidebarNameToDocIds = collectSidebarsDocIds(sidebars);
    const sidebarNameToNavigationItems = collectSidebarsNavigations(sidebars);
    // Reverse mapping
    const docIdToSidebarName = Object.fromEntries(Object.entries(sidebarNameToDocIds).flatMap(([sidebarName, docIds]) => docIds.map((docId) => [docId, sidebarName])));
    function getFirstDocIdOfFirstSidebar() {
        return Object.values(sidebarNameToDocIds)[0]?.[0];
    }
    function getSidebarNameByDocId(docId) {
        return docIdToSidebarName[docId];
    }
    function emptySidebarNavigation() {
        return {
            sidebarName: undefined,
            previous: undefined,
            next: undefined,
        };
    }
    function getDocNavigation({ docId, displayedSidebar, unlistedIds, }) {
        const sidebarName = displayedSidebar === undefined
            ? getSidebarNameByDocId(docId)
            : displayedSidebar;
        if (!sidebarName) {
            return emptySidebarNavigation();
        }
        let navigationItems = sidebarNameToNavigationItems[sidebarName];
        if (!navigationItems) {
            throw new Error(`Doc with ID ${docId} wants to display sidebar ${sidebarName} but a sidebar with this name doesn't exist`);
        }
        // Filter unlisted items from navigation
        navigationItems = navigationItems.filter((item) => {
            if (item.type === 'doc' && unlistedIds.has(item.id)) {
                return false;
            }
            if (item.type === 'category' &&
                item.link.type === 'doc' &&
                unlistedIds.has(item.link.id)) {
                return false;
            }
            return true;
        });
        const currentItemIndex = navigationItems.findIndex((item) => {
            if (item.type === 'doc') {
                return item.id === docId;
            }
            if (item.type === 'category' && item.link.type === 'doc') {
                return item.link.id === docId;
            }
            return false;
        });
        if (currentItemIndex === -1) {
            return { sidebarName, next: undefined, previous: undefined };
        }
        return {
            sidebarName,
            previous: navigationItems[currentItemIndex - 1],
            next: navigationItems[currentItemIndex + 1],
        };
    }
    function getCategoryGeneratedIndexList() {
        return Object.values(sidebarNameToNavigationItems)
            .flat()
            .flatMap((item) => {
            if (item.type === 'category' && item.link.type === 'generated-index') {
                return [item];
            }
            return [];
        });
    }
    /**
     * We identity the category generated index by its permalink (should be
     * unique). More reliable than using object identity
     */
    function getCategoryGeneratedIndexNavigation(categoryGeneratedIndexPermalink) {
        function isCurrentCategoryGeneratedIndexItem(item) {
            return (item.type === 'category' &&
                item.link.type === 'generated-index' &&
                item.link.permalink === categoryGeneratedIndexPermalink);
        }
        const sidebarName = Object.entries(sidebarNameToNavigationItems).find(([, navigationItems]) => navigationItems.find(isCurrentCategoryGeneratedIndexItem))[0];
        const navigationItems = sidebarNameToNavigationItems[sidebarName];
        const currentItemIndex = navigationItems.findIndex(isCurrentCategoryGeneratedIndexItem);
        return {
            sidebarName,
            previous: navigationItems[currentItemIndex - 1],
            next: navigationItems[currentItemIndex + 1],
        };
    }
    // TODO remove in Docusaurus v4
    function getLegacyVersionedPrefix(versionMetadata) {
        return `version-${versionMetadata.versionName}/`;
    }
    // In early v2, sidebar names used to be versioned
    // example: "version-2.0.0-alpha.66/my-sidebar-name"
    // In v3 it's not the case anymore and we throw an error to explain
    // TODO remove in Docusaurus v4
    function checkLegacyVersionedSidebarNames({ versionMetadata, sidebarFilePath, }) {
        const illegalPrefix = getLegacyVersionedPrefix(versionMetadata);
        const legacySidebarNames = Object.keys(sidebars).filter((sidebarName) => sidebarName.startsWith(illegalPrefix));
        if (legacySidebarNames.length > 0) {
            throw new Error(`Invalid sidebar file at "${(0, utils_1.toMessageRelativeFilePath)(sidebarFilePath)}".
These legacy versioned sidebar names are not supported anymore in Docusaurus v3:
- ${legacySidebarNames.sort().join('\n- ')}

The sidebar names you should now use are:
- ${legacySidebarNames
                .sort()
                .map((legacyName) => legacyName.split('/').splice(1).join('/'))
                .join('\n- ')}

Please remove the "${illegalPrefix}" prefix from your versioned sidebar file.
This breaking change is documented on Docusaurus v3 release notes: https://docusaurus.io/blog/releases/3.0
`);
        }
    }
    // throw a better error message for Docusaurus v3 breaking change
    // TODO this can be removed in Docusaurus v4
    function handleLegacyVersionedDocIds({ invalidDocIds, sidebarFilePath, versionMetadata, }) {
        const illegalPrefix = getLegacyVersionedPrefix(versionMetadata);
        // In older v2.0 alpha/betas, versioned docs had a legacy versioned prefix
        // Example: "version-1.4/my-doc-id"
        //
        const legacyVersionedDocIds = invalidDocIds.filter((docId) => docId.startsWith(illegalPrefix));
        if (legacyVersionedDocIds.length > 0) {
            throw new Error(`Invalid sidebar file at "${(0, utils_1.toMessageRelativeFilePath)(sidebarFilePath)}".
These legacy versioned document ids are not supported anymore in Docusaurus v3:
- ${legacyVersionedDocIds.sort().join('\n- ')}

The document ids you should now use are:
- ${legacyVersionedDocIds
                .sort()
                .map((legacyId) => legacyId.split('/').splice(1).join('/'))
                .join('\n- ')}

Please remove the "${illegalPrefix}" prefix from your versioned sidebar file.
This breaking change is documented on Docusaurus v3 release notes: https://docusaurus.io/blog/releases/3.0
`);
        }
    }
    function checkSidebarsDocIds({ allDocIds, sidebarFilePath, versionMetadata, }) {
        const allSidebarDocIds = Object.values(sidebarNameToDocIds).flat();
        const invalidDocIds = lodash_1.default.difference(allSidebarDocIds, allDocIds);
        if (invalidDocIds.length > 0) {
            handleLegacyVersionedDocIds({
                invalidDocIds,
                sidebarFilePath,
                versionMetadata,
            });
            throw new Error(`Invalid sidebar file at "${(0, utils_1.toMessageRelativeFilePath)(sidebarFilePath)}".
These sidebar document ids do not exist:
- ${invalidDocIds.sort().join('\n- ')}

Available document ids are:
- ${lodash_1.default.uniq(allDocIds).sort().join('\n- ')}
`);
        }
    }
    function getFirstLink(sidebar) {
        for (const item of sidebar) {
            if (item.type === 'doc') {
                return {
                    type: 'doc',
                    id: item.id,
                    label: item.label ?? item.id,
                };
            }
            else if (item.type === 'category') {
                if (item.link?.type === 'doc') {
                    return {
                        type: 'doc',
                        id: item.link.id,
                        label: item.label,
                    };
                }
                else if (item.link?.type === 'generated-index') {
                    return {
                        type: 'generated-index',
                        permalink: item.link.permalink,
                        label: item.label,
                    };
                }
                const firstSubItem = getFirstLink(item.items);
                if (firstSubItem) {
                    return firstSubItem;
                }
            }
        }
        return undefined;
    }
    return {
        sidebars,
        getFirstDocIdOfFirstSidebar,
        getSidebarNameByDocId,
        getDocNavigation,
        getCategoryGeneratedIndexList,
        getCategoryGeneratedIndexNavigation,
        checkLegacyVersionedSidebarNames,
        checkSidebarsDocIds,
        getFirstLink: (id) => getFirstLink(sidebars[id]),
    };
}
function toDocNavigationLink(doc, options) {
    const { title, permalink, frontMatter: { pagination_label: paginationLabel, sidebar_label: sidebarLabel, }, } = doc;
    return {
        title: paginationLabel ?? sidebarLabel ?? options?.sidebarItemLabel ?? title,
        permalink,
    };
}
function toNavigationLink(navigationItem, docsById) {
    function getDocById(docId) {
        const doc = docsById[docId];
        if (!doc) {
            throw new Error(`Can't create navigation link: no doc found with id=${docId}`);
        }
        return doc;
    }
    if (!navigationItem) {
        return undefined;
    }
    if (navigationItem.type === 'category') {
        return navigationItem.link.type === 'doc'
            ? toDocNavigationLink(getDocById(navigationItem.link.id))
            : {
                title: navigationItem.label,
                permalink: navigationItem.link.permalink,
            };
    }
    return toDocNavigationLink(getDocById(navigationItem.id), {
        sidebarItemLabel: navigationItem?.label,
    });
}
