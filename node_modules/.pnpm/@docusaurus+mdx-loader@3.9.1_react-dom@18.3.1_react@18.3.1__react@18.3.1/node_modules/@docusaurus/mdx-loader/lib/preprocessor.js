"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = preprocessContent;
const utils_1 = require("@docusaurus/utils");
const admonitions_1 = require("./remark/admonitions");
/**
 * Preprocess the string before passing it to MDX
 * This is not particularly recommended but makes it easier to upgrade to MDX 2
 */
function preprocessContent({ fileContent: initialFileContent, filePath, markdownConfig, admonitions, }) {
    let fileContent = initialFileContent;
    if (markdownConfig.preprocessor) {
        fileContent = markdownConfig.preprocessor({
            fileContent,
            filePath,
        });
    }
    fileContent = (0, utils_1.unwrapMdxCodeBlocks)(fileContent);
    if (markdownConfig.mdx1Compat.headingIds) {
        fileContent = (0, utils_1.escapeMarkdownHeadingIds)(fileContent);
    }
    if (markdownConfig.mdx1Compat.admonitions && admonitions) {
        const { keywords } = (0, admonitions_1.normalizeAdmonitionOptions)(admonitions);
        fileContent = (0, utils_1.admonitionTitleToDirectiveLabel)(fileContent, keywords);
    }
    return fileContent;
}
//# sourceMappingURL=preprocessor.js.map