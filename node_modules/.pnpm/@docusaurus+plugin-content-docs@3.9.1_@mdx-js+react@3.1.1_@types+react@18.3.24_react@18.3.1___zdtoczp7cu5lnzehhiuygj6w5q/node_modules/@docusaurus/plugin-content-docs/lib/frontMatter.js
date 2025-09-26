"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocFrontMatterSchema = void 0;
exports.validateDocFrontMatter = validateDocFrontMatter;
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const utils_validation_1 = require("@docusaurus/utils-validation");
// NOTE: we don't add any default value on purpose here
// We don't want default values to magically appear in doc metadata and props
// While the user did not provide those values explicitly
// We use default values in code instead
exports.DocFrontMatterSchema = utils_validation_1.JoiFrontMatter.object({
    id: utils_validation_1.JoiFrontMatter.string(),
    // See https://github.com/facebook/docusaurus/issues/4591#issuecomment-822372398
    title: utils_validation_1.JoiFrontMatter.string().allow(''),
    hide_title: utils_validation_1.JoiFrontMatter.boolean(),
    hide_table_of_contents: utils_validation_1.JoiFrontMatter.boolean(),
    keywords: utils_validation_1.JoiFrontMatter.array().items(utils_validation_1.JoiFrontMatter.string().required()),
    image: utils_validation_1.URISchema,
    // See https://github.com/facebook/docusaurus/issues/4591#issuecomment-822372398
    description: utils_validation_1.JoiFrontMatter.string().allow(''),
    slug: utils_validation_1.JoiFrontMatter.string(),
    sidebar_label: utils_validation_1.JoiFrontMatter.string(),
    sidebar_position: utils_validation_1.JoiFrontMatter.number(),
    sidebar_class_name: utils_validation_1.JoiFrontMatter.string(),
    sidebar_custom_props: utils_validation_1.JoiFrontMatter.object().unknown(),
    displayed_sidebar: utils_validation_1.JoiFrontMatter.string().allow(null),
    tags: utils_validation_1.FrontMatterTagsSchema,
    pagination_label: utils_validation_1.JoiFrontMatter.string(),
    custom_edit_url: utils_validation_1.URISchema.allow('', null),
    parse_number_prefixes: utils_validation_1.JoiFrontMatter.boolean(),
    pagination_next: utils_validation_1.JoiFrontMatter.string().allow(null),
    pagination_prev: utils_validation_1.JoiFrontMatter.string().allow(null),
    ...utils_validation_1.FrontMatterTOCHeadingLevels,
    last_update: utils_validation_1.FrontMatterLastUpdateSchema,
})
    .unknown()
    .concat(utils_validation_1.ContentVisibilitySchema);
function validateDocFrontMatter(frontMatter) {
    return (0, utils_validation_1.validateFrontMatter)(frontMatter, exports.DocFrontMatterSchema);
}
