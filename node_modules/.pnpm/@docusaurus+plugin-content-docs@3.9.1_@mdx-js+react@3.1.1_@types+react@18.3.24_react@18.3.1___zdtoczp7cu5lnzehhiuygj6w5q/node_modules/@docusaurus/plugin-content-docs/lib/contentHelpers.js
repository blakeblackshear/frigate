"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContentHelpers = createContentHelpers;
function indexDocsBySource(content) {
    const allDocs = content.loadedVersions.flatMap((v) => v.docs);
    return new Map(allDocs.map((doc) => [doc.source, doc]));
}
// TODO this is bad, we should have a better way to do this (new lifecycle?)
//  The source to doc/permalink is a mutable map passed to the mdx loader
//  See https://github.com/facebook/docusaurus/pull/10457
//  See https://github.com/facebook/docusaurus/pull/10185
function createContentHelpers() {
    const sourceToDoc = new Map();
    const sourceToPermalink = new Map();
    // Mutable map update :/
    function updateContent(content) {
        sourceToDoc.clear();
        sourceToPermalink.clear();
        indexDocsBySource(content).forEach((value, key) => {
            sourceToDoc.set(key, value);
            sourceToPermalink.set(key, value.permalink);
        });
    }
    return { updateContent, sourceToDoc, sourceToPermalink };
}
