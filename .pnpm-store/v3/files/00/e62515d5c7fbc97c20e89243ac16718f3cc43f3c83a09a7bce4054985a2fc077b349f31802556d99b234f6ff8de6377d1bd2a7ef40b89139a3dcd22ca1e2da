"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAuthorsMapPermalinkCollisions = checkAuthorsMapPermalinkCollisions;
exports.validateAuthorsMapInput = validateAuthorsMapInput;
exports.getAuthorsMap = getAuthorsMap;
exports.validateAuthorsMap = validateAuthorsMap;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
const utils_validation_1 = require("@docusaurus/utils-validation");
const authorsSocials_1 = require("./authorsSocials");
const authors_1 = require("./authors");
const AuthorPageSchema = utils_validation_1.Joi.object({
    permalink: utils_validation_1.Joi.string().required(),
});
const AuthorsMapInputSchema = utils_validation_1.Joi.object()
    .pattern(utils_validation_1.Joi.string(), utils_validation_1.Joi.object({
    name: utils_validation_1.Joi.string(),
    url: utils_validation_1.URISchema,
    imageURL: utils_validation_1.URISchema,
    title: utils_validation_1.Joi.string(),
    email: utils_validation_1.Joi.string(),
    page: utils_validation_1.Joi.alternatives(utils_validation_1.Joi.bool(), AuthorPageSchema),
    socials: authorsSocials_1.AuthorSocialsSchema,
    description: utils_validation_1.Joi.string(),
})
    .rename('image_url', 'imageURL')
    .or('name', 'imageURL')
    .unknown()
    .required()
    .messages({
    'object.base': '{#label} should be an author object containing properties like name, title, and imageURL.',
    'any.required': '{#label} cannot be undefined. It should be an author object containing properties like name, title, and imageURL.',
}))
    .messages({
    'object.base': "The authors map file should contain an object where each entry contains an author key and the corresponding author's data.",
});
function checkAuthorsMapPermalinkCollisions(authorsMap) {
    if (!authorsMap) {
        return;
    }
    const permalinkCounts = (0, lodash_1.default)(authorsMap)
        // Filter to keep only authors with a page
        .pickBy((author) => !!author.page)
        // Group authors by their permalink
        .groupBy((author) => author.page?.permalink)
        // Filter to keep only permalinks with more than one author
        .pickBy((authors) => authors.length > 1)
        // Transform the object into an array of [permalink, authors] pairs
        .toPairs()
        .value();
    if (permalinkCounts.length > 0) {
        const errorMessage = permalinkCounts
            .map(([permalink, authors]) => `Permalink: ${permalink}\nAuthors: ${authors
            .map((author) => author.name || 'Unknown')
            .join(', ')}`)
            .join('\n');
        throw new Error(`The following permalinks are duplicated:\n${errorMessage}`);
    }
}
function normalizeAuthor({ authorsBaseRoutePath, authorKey, baseUrl, author, }) {
    function getAuthorPage() {
        if (!author.page) {
            return null;
        }
        const slug = author.page === true ? lodash_1.default.kebabCase(authorKey) : author.page.permalink;
        return {
            permalink: (0, utils_1.normalizeUrl)([authorsBaseRoutePath, slug]),
        };
    }
    return {
        ...author,
        key: authorKey,
        page: getAuthorPage(),
        imageURL: (0, authors_1.normalizeImageUrl)({ imageURL: author.imageURL, baseUrl }),
        socials: author.socials ? (0, authorsSocials_1.normalizeSocials)(author.socials) : undefined,
    };
}
function normalizeAuthorsMap({ authorsBaseRoutePath, authorsMapInput, baseUrl, }) {
    return lodash_1.default.mapValues(authorsMapInput, (author, authorKey) => {
        return normalizeAuthor({ authorsBaseRoutePath, authorKey, author, baseUrl });
    });
}
function validateAuthorsMapInput(content) {
    const { error, value } = AuthorsMapInputSchema.validate(content);
    if (error) {
        throw error;
    }
    return value;
}
async function getAuthorsMapInput(params) {
    const content = await (0, utils_1.readDataFile)({
        filePath: params.authorsMapPath,
        contentPaths: params.contentPaths,
    });
    return content ? validateAuthorsMapInput(content) : undefined;
}
async function getAuthorsMap(params) {
    const authorsMapInput = await getAuthorsMapInput(params);
    if (!authorsMapInput) {
        return undefined;
    }
    const authorsMap = normalizeAuthorsMap({ authorsMapInput, ...params });
    return authorsMap;
}
function validateAuthorsMap(content) {
    const { error, value } = AuthorsMapInputSchema.validate(content);
    if (error) {
        throw error;
    }
    return value;
}
