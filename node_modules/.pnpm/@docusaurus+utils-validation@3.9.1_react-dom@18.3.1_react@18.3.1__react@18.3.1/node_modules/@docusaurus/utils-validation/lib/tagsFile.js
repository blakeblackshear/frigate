"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUniquePermalinks = ensureUniquePermalinks;
exports.normalizeTagsFile = normalizeTagsFile;
exports.getTagsFilePathsToWatch = getTagsFilePathsToWatch;
exports.getTagsFile = getTagsFile;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const joi_1 = tslib_1.__importDefault(require("joi"));
const js_yaml_1 = tslib_1.__importDefault(require("js-yaml"));
const utils_1 = require("@docusaurus/utils");
const TagsFileInputSchema = joi_1.default.object().pattern(joi_1.default.string(), joi_1.default.object({
    label: joi_1.default.string(),
    description: joi_1.default.string(),
    permalink: joi_1.default.string(),
}).allow(null));
function ensureUniquePermalinks(tags) {
    const permalinks = new Set();
    const duplicates = new Set();
    for (const [, tag] of Object.entries(tags)) {
        const { permalink } = tag;
        if (permalinks.has(permalink)) {
            duplicates.add(permalink);
        }
        else {
            permalinks.add(permalink);
        }
    }
    if (duplicates.size > 0) {
        const duplicateList = Array.from(duplicates)
            .map((permalink) => `  - ${permalink}`)
            .join('\n');
        throw new Error(`Duplicate permalinks found in tags file:\n${duplicateList}`);
    }
}
function normalizeTagsFile(data) {
    return lodash_1.default.mapValues(data, (tag, key) => {
        return {
            label: tag?.label || lodash_1.default.capitalize(key),
            description: tag?.description,
            permalink: tag?.permalink || `/${lodash_1.default.kebabCase(key)}`,
        };
    });
}
const DefaultTagsFileName = 'tags.yml';
function getTagsFilePathsToWatch({ tags, contentPaths, }) {
    if (tags === false || tags === null) {
        return [];
    }
    const relativeFilePath = tags ?? DefaultTagsFileName;
    return (0, utils_1.getContentPathList)(contentPaths).map((contentPath) => node_path_1.default.posix.join(contentPath, relativeFilePath));
}
async function getTagsFile({ tags, contentPaths, }) {
    if (tags === false || tags === null) {
        return null;
    }
    const relativeFilePath = tags ?? DefaultTagsFileName;
    // if returned path is defined, the file exists (localized or not)
    const yamlFilePath = await (0, utils_1.getDataFilePath)({
        contentPaths,
        filePath: relativeFilePath,
    });
    // If the tags option is undefined, don't throw when the file does not exist
    // Retro-compatible behavior: existing sites do not yet have tags.yml
    if (tags === undefined && !yamlFilePath) {
        return null;
    }
    if (!yamlFilePath) {
        throw new Error(`No tags file '${relativeFilePath}' could be found in any of those directories:\n- ${(0, utils_1.getContentPathList)(contentPaths).join('\n- ')}`);
    }
    const tagDefinitionContent = await fs_extra_1.default.readFile(yamlFilePath, 'utf-8');
    if (!tagDefinitionContent.trim()) {
        return {};
    }
    const yamlContent = js_yaml_1.default.load(tagDefinitionContent);
    const tagsFileInputResult = TagsFileInputSchema.validate(yamlContent);
    if (tagsFileInputResult.error) {
        throw new Error(`There was an error extracting tags from file: ${tagsFileInputResult.error.message}`, { cause: tagsFileInputResult });
    }
    const tagsFile = normalizeTagsFile(tagsFileInputResult.value);
    ensureUniquePermalinks(tagsFile);
    return tagsFile;
}
//# sourceMappingURL=tagsFile.js.map