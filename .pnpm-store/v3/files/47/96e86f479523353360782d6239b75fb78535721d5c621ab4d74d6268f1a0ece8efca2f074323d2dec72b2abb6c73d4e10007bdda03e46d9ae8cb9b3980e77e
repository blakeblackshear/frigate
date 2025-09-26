"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDataFilePath = getDataFilePath;
exports.readDataFile = readDataFile;
exports.getContentPathList = getContentPathList;
exports.findFolderContainingFile = findFolderContainingFile;
exports.getFolderContainingFile = getFolderContainingFile;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const js_yaml_1 = tslib_1.__importDefault(require("js-yaml"));
const index_1 = require("./index");
/**
 * Looks for a data file in the potential content paths; loads a localized data
 * file in priority.
 *
 * @returns An absolute path to the data file, or `undefined` if there isn't one.
 */
async function getDataFilePath({ filePath, contentPaths, }) {
    const contentPath = await findFolderContainingFile(getContentPathList(contentPaths), filePath);
    if (contentPath) {
        return path_1.default.resolve(contentPath, filePath);
    }
    return undefined;
}
/**
 * Looks up for a data file in the content paths
 * Favors the localized content path over the base content path
 * Currently supports Yaml and JSON data files
 * It is the caller responsibility to validate and normalize the resulting data
 *
 * @returns `undefined` when file not found
 * @throws Throws when data file can't be parsed
 */
async function readDataFile(params) {
    const filePath = await getDataFilePath(params);
    if (!filePath) {
        return undefined;
    }
    try {
        const contentString = await fs_extra_1.default.readFile(filePath, { encoding: 'utf8' });
        return js_yaml_1.default.load(contentString);
    }
    catch (err) {
        const msg = logger_1.default.interpolate `The file at path=${path_1.default.relative(process.cwd(), filePath)} looks invalid (not Yaml nor JSON).`;
        throw new Error(msg, { cause: err });
    }
}
/**
 * Takes the `contentPaths` data structure and returns an ordered path list
 * indicating their priorities. For all data, we look in the localized folder
 * in priority.
 */
function getContentPathList(contentPaths) {
    return [contentPaths.contentPathLocalized, contentPaths.contentPath].filter((p) => p !== undefined);
}
/**
 * @param folderPaths a list of absolute paths.
 * @param relativeFilePath file path relative to each `folderPaths`.
 * @returns the first folder path in which the file exists, or `undefined` if
 * none is found.
 */
async function findFolderContainingFile(folderPaths, relativeFilePath) {
    return (0, index_1.findAsyncSequential)(folderPaths, (folderPath) => fs_extra_1.default.pathExists(path_1.default.join(folderPath, relativeFilePath)));
}
/**
 * Fail-fast alternative to `findFolderContainingFile`.
 *
 * @param folderPaths a list of absolute paths.
 * @param relativeFilePath file path relative to each `folderPaths`.
 * @returns the first folder path in which the file exists.
 * @throws Throws if no file can be found. You should use this method only when
 * you actually know the file exists (e.g. when the `relativeFilePath` is read
 * with a glob and you are just trying to localize it)
 */
async function getFolderContainingFile(folderPaths, relativeFilePath) {
    const maybeFolderPath = await findFolderContainingFile(folderPaths, relativeFilePath);
    if (!maybeFolderPath) {
        throw new Error(`File "${relativeFilePath}" does not exist in any of these folders:
- ${folderPaths.join('\n- ')}`);
    }
    return maybeFolderPath;
}
//# sourceMappingURL=dataFileUtils.js.map