"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBlogPostFrontMatter = validateBlogPostFrontMatter;
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const utils_validation_1 = require("@docusaurus/utils-validation");
const authorsSocials_1 = require("./authorsSocials");
const BlogPostFrontMatterAuthorSchema = utils_validation_1.JoiFrontMatter.object({
    key: utils_validation_1.JoiFrontMatter.string(),
    name: utils_validation_1.JoiFrontMatter.string(),
    title: utils_validation_1.JoiFrontMatter.string(),
    url: utils_validation_1.URISchema,
    imageURL: utils_validation_1.JoiFrontMatter.string(),
    socials: authorsSocials_1.AuthorSocialsSchema,
})
    .or('key', 'name', 'imageURL')
    .rename('image_url', 'imageURL', { alias: true });
const FrontMatterAuthorErrorMessage = '{{#label}} does not look like a valid blog post author. Please use an author key or an author object (with a key and/or name).';
const BlogFrontMatterSchema = utils_validation_1.JoiFrontMatter.object({
    id: utils_validation_1.JoiFrontMatter.string(),
    title: utils_validation_1.JoiFrontMatter.string().allow(''),
    title_meta: utils_validation_1.JoiFrontMatter.string().allow(''),
    sidebar_label: utils_validation_1.JoiFrontMatter.string().allow(''),
    description: utils_validation_1.JoiFrontMatter.string().allow(''),
    tags: utils_validation_1.FrontMatterTagsSchema,
    date: utils_validation_1.JoiFrontMatter.date().raw(),
    // New multi-authors front matter:
    authors: utils_validation_1.JoiFrontMatter.alternatives()
        .try(utils_validation_1.JoiFrontMatter.string(), BlogPostFrontMatterAuthorSchema, utils_validation_1.JoiFrontMatter.array()
        .items(utils_validation_1.JoiFrontMatter.string(), BlogPostFrontMatterAuthorSchema)
        .messages({
        'array.sparse': FrontMatterAuthorErrorMessage,
        'array.includes': FrontMatterAuthorErrorMessage,
    }))
        .messages({
        'alternatives.match': FrontMatterAuthorErrorMessage,
    }),
    // Legacy author front matter
    author: utils_validation_1.JoiFrontMatter.string(),
    author_title: utils_validation_1.JoiFrontMatter.string(),
    author_url: utils_validation_1.URISchema,
    author_image_url: utils_validation_1.URISchema,
    // TODO enable deprecation warnings later
    authorURL: utils_validation_1.URISchema,
    // .warning('deprecate.error', { alternative: '"author_url"'}),
    authorTitle: utils_validation_1.JoiFrontMatter.string(),
    // .warning('deprecate.error', { alternative: '"author_title"'}),
    authorImageURL: utils_validation_1.URISchema,
    // .warning('deprecate.error', { alternative: '"author_image_url"'}),
    slug: utils_validation_1.JoiFrontMatter.string(),
    image: utils_validation_1.URISchema,
    keywords: utils_validation_1.JoiFrontMatter.array().items(utils_validation_1.JoiFrontMatter.string().required()),
    hide_table_of_contents: utils_validation_1.JoiFrontMatter.boolean(),
    ...utils_validation_1.FrontMatterTOCHeadingLevels,
    last_update: utils_validation_1.FrontMatterLastUpdateSchema,
})
    .messages({
    'deprecate.error': '{#label} blog frontMatter field is deprecated. Please use {#alternative} instead.',
})
    .concat(utils_validation_1.ContentVisibilitySchema);
function validateBlogPostFrontMatter(frontMatter) {
    return (0, utils_validation_1.validateFrontMatter)(frontMatter, BlogFrontMatterSchema);
}
