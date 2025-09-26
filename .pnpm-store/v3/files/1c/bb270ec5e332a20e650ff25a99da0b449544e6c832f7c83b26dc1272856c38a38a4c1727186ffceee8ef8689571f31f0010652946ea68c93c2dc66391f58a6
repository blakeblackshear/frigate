"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryGeneratedIndexMetadataList = getCategoryGeneratedIndexMetadataList;
const utils_1 = require("./sidebars/utils");
const docs_1 = require("./docs");
function getCategoryGeneratedIndexMetadata({ category, sidebarsUtils, docsById, }) {
    const { sidebarName, previous, next } = sidebarsUtils.getCategoryGeneratedIndexNavigation(category.link.permalink);
    return {
        title: category.link.title ?? category.label,
        description: category.link.description,
        image: category.link.image,
        keywords: category.link.keywords,
        slug: category.link.slug,
        permalink: category.link.permalink,
        sidebar: sidebarName,
        navigation: {
            previous: (0, utils_1.toNavigationLink)(previous, docsById),
            next: (0, utils_1.toNavigationLink)(next, docsById),
        },
    };
}
function getCategoryGeneratedIndexMetadataList({ docs, sidebarsUtils, }) {
    const docsById = (0, docs_1.createDocsByIdIndex)(docs);
    const categoryGeneratedIndexItems = sidebarsUtils.getCategoryGeneratedIndexList();
    return categoryGeneratedIndexItems.map((category) => getCategoryGeneratedIndexMetadata({
        category,
        sidebarsUtils,
        docsById,
    }));
}
