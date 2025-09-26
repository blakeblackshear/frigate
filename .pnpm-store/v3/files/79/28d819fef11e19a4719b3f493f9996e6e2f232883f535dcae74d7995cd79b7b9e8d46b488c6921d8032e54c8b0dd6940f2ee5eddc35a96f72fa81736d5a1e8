"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportAuthorsProblems = reportAuthorsProblems;
exports.reportInlineAuthors = reportInlineAuthors;
exports.reportDuplicateAuthors = reportDuplicateAuthors;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
function reportAuthorsProblems(params) {
    reportInlineAuthors(params);
    reportDuplicateAuthors(params);
}
function reportInlineAuthors({ authors, blogSourceRelative, options: { onInlineAuthors, authorsMapPath }, }) {
    if (onInlineAuthors === 'ignore') {
        return;
    }
    const inlineAuthors = authors.filter((author) => !author.key);
    if (inlineAuthors.length > 0) {
        logger_1.default.report(onInlineAuthors)(logger_1.default.interpolate `Some blog authors used in path=${blogSourceRelative} are not defined in path=${authorsMapPath}:
- ${inlineAuthors.map(authorToString).join('\n- ')}

Note that we recommend to declare authors once in a path=${authorsMapPath} file and reference them by key in blog posts front matter to avoid author info duplication.
But if you want to allow inline blog authors, you can disable this message by setting onInlineAuthors: 'ignore' in your blog plugin options.
More info at url=${'https://docusaurus.io/docs/blog'}
`);
    }
}
function reportDuplicateAuthors({ authors, blogSourceRelative, }) {
    const duplicateAuthors = (0, lodash_1.default)(authors)
        // for now we only check for predefined authors duplicates
        .filter((author) => !!author.key)
        .groupBy((author) => author.key)
        .pickBy((authorsByKey) => authorsByKey.length > 1)
        // We only keep the "test" of all the duplicate groups
        // The first author of a group is not really a duplicate...
        .flatMap(([, ...rest]) => rest)
        .value();
    if (duplicateAuthors.length > 0) {
        throw new Error(logger_1.default.interpolate `Duplicate blog post authors were found in blog post path=${blogSourceRelative} front matter:
- ${duplicateAuthors.map(authorToString).join('\n- ')}`);
    }
}
function authorToString(author) {
    return JSON.stringify(author);
}
