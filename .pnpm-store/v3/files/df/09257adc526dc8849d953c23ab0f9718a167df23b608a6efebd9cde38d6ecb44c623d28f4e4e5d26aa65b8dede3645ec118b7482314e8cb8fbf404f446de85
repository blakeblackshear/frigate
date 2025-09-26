"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeHeadingIds = writeHeadingIds;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const site_1 = require("../server/site");
const init_1 = require("../server/plugins/init");
async function transformMarkdownFile(filepath, options) {
    const content = await fs_extra_1.default.readFile(filepath, 'utf8');
    const updatedContent = (0, utils_1.writeMarkdownHeadingId)(content, options);
    if (content !== updatedContent) {
        await fs_extra_1.default.writeFile(filepath, updatedContent);
        return filepath;
    }
    return undefined;
}
/**
 * We only handle the "paths to watch" because these are the paths where the
 * markdown files are. Also we don't want to transform the site md docs that do
 * not belong to a content plugin. For example ./README.md should not be
 * transformed
 */
async function getPathsToWatch(siteDir) {
    const context = await (0, site_1.loadContext)({ siteDir });
    const plugins = await (0, init_1.initPlugins)(context);
    return plugins.flatMap((plugin) => plugin.getPathsToWatch?.() ?? []);
}
async function writeHeadingIds(siteDirParam = '.', files = [], options = {}) {
    const siteDir = await fs_extra_1.default.realpath(siteDirParam);
    const markdownFiles = await (0, utils_1.safeGlobby)(files ?? (await getPathsToWatch(siteDir)), {
        expandDirectories: ['**/*.{md,mdx}'],
    });
    const result = await Promise.all(markdownFiles.map((p) => transformMarkdownFile(p, options)));
    const pathsModified = result.filter(Boolean);
    if (pathsModified.length) {
        logger_1.default.success `Heading ids added to Markdown files (number=${`${pathsModified.length}/${markdownFiles.length}`} files): ${pathsModified}`;
    }
    else {
        logger_1.default.warn `number=${markdownFiles.length} Markdown files already have explicit heading IDs. If you intend to overwrite the existing heading IDs, use the code=${'--overwrite'} option.`;
    }
}
