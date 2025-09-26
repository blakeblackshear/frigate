"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultMDXFrontMatter = void 0;
exports.validateMDXFrontMatter = validateMDXFrontMatter;
const utils_validation_1 = require("@docusaurus/utils-validation");
exports.DefaultMDXFrontMatter = {
    format: undefined,
};
const MDXFrontMatterSchema = utils_validation_1.JoiFrontMatter.object({
    format: utils_validation_1.JoiFrontMatter.string().equal('md', 'mdx', 'detect').optional(),
}).default(exports.DefaultMDXFrontMatter);
function validateMDXFrontMatter(frontMatter) {
    return (0, utils_validation_1.validateFrontMatter)(frontMatter, MDXFrontMatterSchema, {
        allowUnknown: false,
    });
}
//# sourceMappingURL=frontMatter.js.map