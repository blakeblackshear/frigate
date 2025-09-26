"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePageFrontMatter = validatePageFrontMatter;
const utils_validation_1 = require("@docusaurus/utils-validation");
const PageFrontMatterSchema = utils_validation_1.Joi.object({
    // See https://github.com/facebook/docusaurus/issues/4591#issuecomment-822372398
    title: utils_validation_1.Joi.string().allow(''),
    // See https://github.com/facebook/docusaurus/issues/4591#issuecomment-822372398
    description: utils_validation_1.Joi.string().allow(''),
    keywords: utils_validation_1.Joi.array().items(utils_validation_1.Joi.string().required()),
    image: utils_validation_1.URISchema,
    slug: utils_validation_1.Joi.string(),
    wrapperClassName: utils_validation_1.Joi.string(),
    hide_table_of_contents: utils_validation_1.Joi.boolean(),
    ...utils_validation_1.FrontMatterTOCHeadingLevels,
    last_update: utils_validation_1.FrontMatterLastUpdateSchema,
}).concat(utils_validation_1.ContentVisibilitySchema);
function validatePageFrontMatter(frontMatter) {
    return (0, utils_validation_1.validateFrontMatter)(frontMatter, PageFrontMatterSchema);
}
