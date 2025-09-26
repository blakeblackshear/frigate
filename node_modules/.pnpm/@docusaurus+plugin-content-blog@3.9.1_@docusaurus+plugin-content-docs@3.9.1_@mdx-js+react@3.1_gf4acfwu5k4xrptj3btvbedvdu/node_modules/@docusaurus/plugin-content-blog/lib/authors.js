"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeImageUrl = normalizeImageUrl;
exports.getBlogPostAuthors = getBlogPostAuthors;
exports.groupBlogPostsByAuthorKey = groupBlogPostsByAuthorKey;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
const authorsSocials_1 = require("./authorsSocials");
function normalizeImageUrl({ imageURL, baseUrl, }) {
    return imageURL?.startsWith('/')
        ? (0, utils_1.normalizeUrl)([baseUrl, imageURL])
        : imageURL;
}
function normalizeAuthorUrl({ author, baseUrl, }) {
    if (author.key) {
        // Ensures invariant: global authors should have already been normalized
        if (author.imageURL?.startsWith('/') &&
            !author.imageURL.startsWith(baseUrl)) {
            throw new Error(`Docusaurus internal bug: global authors image ${author.imageURL} should start with the expected baseUrl=${baseUrl}`);
        }
        return author.imageURL;
    }
    return normalizeImageUrl({ imageURL: author.imageURL, baseUrl });
}
// Legacy v1/early-v2 front matter fields
// We may want to deprecate those in favor of using only frontMatter.authors
// TODO Docusaurus v4: remove this legacy front matter
function getFrontMatterAuthorLegacy({ baseUrl, frontMatter, }) {
    const name = frontMatter.author;
    const title = frontMatter.author_title ?? frontMatter.authorTitle;
    const url = frontMatter.author_url ?? frontMatter.authorURL;
    const imageURL = normalizeImageUrl({
        imageURL: frontMatter.author_image_url ?? frontMatter.authorImageURL,
        baseUrl,
    });
    if (name || title || url || imageURL) {
        return {
            name,
            title,
            url,
            imageURL,
            // legacy front matter authors do not have an author key/page
            key: null,
            page: null,
        };
    }
    return undefined;
}
function getFrontMatterAuthors(params) {
    const { authorsMap, frontMatter, baseUrl } = params;
    return normalizeFrontMatterAuthors().map(toAuthor);
    function normalizeFrontMatterAuthors() {
        if (frontMatter.authors === undefined) {
            return [];
        }
        function normalizeAuthor(authorInput) {
            if (typeof authorInput === 'string') {
                // We could allow users to provide an author's name here, but we only
                // support keys, otherwise, a typo in a key would fall back to
                // becoming a name and may end up unnoticed
                return { key: authorInput };
            }
            return {
                ...authorInput,
                socials: (0, authorsSocials_1.normalizeSocials)(authorInput.socials ?? {}),
            };
        }
        return Array.isArray(frontMatter.authors)
            ? frontMatter.authors.map(normalizeAuthor)
            : [normalizeAuthor(frontMatter.authors)];
    }
    function getAuthorsMapAuthor(key) {
        if (key) {
            if (!authorsMap || Object.keys(authorsMap).length === 0) {
                throw new Error(`Can't reference blog post authors by a key (such as '${key}') because no authors map file could be loaded.
Please double-check your blog plugin config (in particular 'authorsMapPath'), ensure the file exists at the configured path, is not empty, and is valid!`);
            }
            const author = authorsMap[key];
            if (!author) {
                throw Error(`Blog author with key "${key}" not found in the authors map file.
Valid author keys are:
${Object.keys(authorsMap)
                    .map((validKey) => `- ${validKey}`)
                    .join('\n')}`);
            }
            return author;
        }
        return undefined;
    }
    function toAuthor(frontMatterAuthor) {
        const author = {
            // Author def from authorsMap can be locally overridden by front matter
            ...getAuthorsMapAuthor(frontMatterAuthor.key),
            ...frontMatterAuthor,
        };
        return {
            ...author,
            key: author.key ?? null,
            page: author.page ?? null,
            // global author images have already been normalized
            imageURL: normalizeAuthorUrl({ author, baseUrl }),
        };
    }
}
function getBlogPostAuthors(params) {
    const authorLegacy = getFrontMatterAuthorLegacy(params);
    const authors = getFrontMatterAuthors(params);
    if (authorLegacy) {
        // Technically, we could allow mixing legacy/authors front matter, but do we
        // really want to?
        if (authors.length > 0) {
            throw new Error(`To declare blog post authors, use the 'authors' front matter in priority.
Don't mix 'authors' with other existing 'author_*' front matter. Choose one or the other, not both at the same time.`);
        }
        return [authorLegacy];
    }
    return authors;
}
/**
 * Group blog posts by author key
 * Blog posts with only inline authors are ignored
 */
function groupBlogPostsByAuthorKey({ blogPosts, authorsMap, }) {
    return lodash_1.default.mapValues(authorsMap, (author, key) => blogPosts.filter((p) => p.metadata.authors.some((a) => a.key === key)));
}
