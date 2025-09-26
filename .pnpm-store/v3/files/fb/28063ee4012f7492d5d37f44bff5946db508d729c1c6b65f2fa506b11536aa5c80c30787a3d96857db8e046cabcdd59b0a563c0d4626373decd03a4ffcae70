"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toGlobalDataVersion = toGlobalDataVersion;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const docs_1 = require("./docs");
function toGlobalDataDoc(doc) {
    return {
        id: doc.id,
        path: doc.permalink,
        // optimize global data size: do not add unlisted: false/undefined
        ...(doc.unlisted && { unlisted: doc.unlisted }),
        // TODO optimize size? remove attribute when no sidebar (breaking change?)
        sidebar: doc.sidebar,
    };
}
function toGlobalDataGeneratedIndex(doc) {
    return {
        id: doc.slug,
        path: doc.permalink,
        sidebar: doc.sidebar,
    };
}
function toGlobalSidebars(sidebars, version) {
    return lodash_1.default.mapValues(sidebars, (sidebar, sidebarId) => {
        const firstLink = version.sidebarsUtils.getFirstLink(sidebarId);
        if (!firstLink) {
            return {};
        }
        return {
            link: {
                path: firstLink.type === 'generated-index'
                    ? firstLink.permalink
                    : version.docs.find((doc) => doc.id === firstLink.id).permalink,
                label: firstLink.label,
            },
        };
    });
}
function toGlobalDataVersion(version) {
    return {
        name: version.versionName,
        label: version.label,
        isLast: version.isLast,
        path: version.path,
        mainDocId: (0, docs_1.getMainDocId)(version),
        docs: version.docs
            .map(toGlobalDataDoc)
            .concat(version.categoryGeneratedIndices.map(toGlobalDataGeneratedIndex)),
        draftIds: version.drafts.map((doc) => doc.id),
        sidebars: toGlobalSidebars(version.sidebars, version),
    };
}
