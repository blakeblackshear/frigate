"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContentHelpers = createContentHelpers;
function indexBlogPostsBySource(content) {
    return new Map(content.blogPosts.map((blogPost) => [blogPost.metadata.source, blogPost]));
}
// TODO this is bad, we should have a better way to do this (new lifecycle?)
//  The source to blog/permalink is a mutable map passed to the mdx loader
//  See https://github.com/facebook/docusaurus/pull/10457
//  See https://github.com/facebook/docusaurus/pull/10185
function createContentHelpers() {
    const sourceToBlogPost = new Map();
    const sourceToPermalink = new Map();
    // Mutable map update :/
    function updateContent(content) {
        sourceToBlogPost.clear();
        sourceToPermalink.clear();
        indexBlogPostsBySource(content).forEach((value, key) => {
            sourceToBlogPost.set(key, value);
            sourceToPermalink.set(key, value.metadata.permalink);
        });
    }
    return { updateContent, sourceToBlogPost, sourceToPermalink };
}
