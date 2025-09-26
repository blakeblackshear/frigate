"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LAST_UPDATE_UNTRACKED_GIT_FILEPATH = exports.LAST_UPDATE_FALLBACK = void 0;
exports.getGitLastUpdate = getGitLastUpdate;
exports.getLastUpdate = getLastUpdate;
exports.readLastUpdateData = readLastUpdateData;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const gitUtils_1 = require("./gitUtils");
let showedGitRequirementError = false;
let showedFileNotTrackedError = false;
async function getGitLastUpdate(filePath) {
    if (!filePath) {
        return null;
    }
    // Wrap in try/catch in case the shell commands fail
    // (e.g. project doesn't use Git, etc).
    try {
        const result = await (0, gitUtils_1.getFileCommitDate)(filePath, {
            age: 'newest',
            includeAuthor: true,
        });
        return { lastUpdatedAt: result.timestamp, lastUpdatedBy: result.author };
    }
    catch (err) {
        if (err instanceof gitUtils_1.GitNotFoundError) {
            if (!showedGitRequirementError) {
                logger_1.default.warn('Sorry, the last update options require Git.');
                showedGitRequirementError = true;
            }
        }
        else if (err instanceof gitUtils_1.FileNotTrackedError) {
            if (!showedFileNotTrackedError) {
                logger_1.default.warn('Cannot infer the update date for some files, as they are not tracked by git.');
                showedFileNotTrackedError = true;
            }
        }
        else {
            throw new Error(`An error occurred when trying to get the last update date`, { cause: err });
        }
        return null;
    }
}
exports.LAST_UPDATE_FALLBACK = {
    lastUpdatedAt: 1539502055000,
    lastUpdatedBy: 'Author',
};
// Not proud of this, but convenient for tests :/
exports.LAST_UPDATE_UNTRACKED_GIT_FILEPATH = `file/path/${Math.random()}.mdx`;
async function getLastUpdate(filePath) {
    if (filePath === exports.LAST_UPDATE_UNTRACKED_GIT_FILEPATH) {
        return null;
    }
    if (process.env.NODE_ENV !== 'production' ||
        process.env.DOCUSAURUS_DISABLE_LAST_UPDATE === 'true') {
        // Use fake data in dev/test for faster development.
        return exports.LAST_UPDATE_FALLBACK;
    }
    return getGitLastUpdate(filePath);
}
async function readLastUpdateData(filePath, options, lastUpdateFrontMatter) {
    const { showLastUpdateAuthor, showLastUpdateTime } = options;
    if (!showLastUpdateAuthor && !showLastUpdateTime) {
        return { lastUpdatedBy: undefined, lastUpdatedAt: undefined };
    }
    const frontMatterAuthor = lastUpdateFrontMatter?.author;
    const frontMatterTimestamp = lastUpdateFrontMatter?.date
        ? new Date(lastUpdateFrontMatter.date).getTime()
        : undefined;
    // We try to minimize git last update calls
    // We call it at most once
    // If all the data is provided as front matter, we do not call it
    const getLastUpdateMemoized = lodash_1.default.memoize(() => getLastUpdate(filePath));
    const getLastUpdateBy = () => getLastUpdateMemoized().then((update) => {
        // Important, see https://github.com/facebook/docusaurus/pull/11211
        if (update === null) {
            return null;
        }
        return update?.lastUpdatedBy;
    });
    const getLastUpdateAt = () => getLastUpdateMemoized().then((update) => {
        // Important, see https://github.com/facebook/docusaurus/pull/11211
        if (update === null) {
            return null;
        }
        return update?.lastUpdatedAt;
    });
    const lastUpdatedBy = showLastUpdateAuthor
        ? frontMatterAuthor ?? (await getLastUpdateBy())
        : undefined;
    const lastUpdatedAt = showLastUpdateTime
        ? frontMatterTimestamp ?? (await getLastUpdateAt())
        : undefined;
    return {
        lastUpdatedBy,
        lastUpdatedAt,
    };
}
//# sourceMappingURL=lastUpdateUtils.js.map