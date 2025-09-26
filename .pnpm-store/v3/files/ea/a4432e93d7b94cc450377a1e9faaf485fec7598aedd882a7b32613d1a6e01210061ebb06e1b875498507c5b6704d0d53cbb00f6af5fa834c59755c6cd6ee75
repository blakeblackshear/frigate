"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCodeTranslationFileContent = readCodeTranslationFileContent;
exports.writeCodeTranslations = writeCodeTranslations;
exports.writePluginTranslations = writePluginTranslations;
exports.localizePluginTranslationFile = localizePluginTranslationFile;
exports.mergeCodeTranslations = mergeCodeTranslations;
exports.loadPluginsDefaultCodeTranslationMessages = loadPluginsDefaultCodeTranslationMessages;
exports.getPluginsDefaultCodeTranslations = getPluginsDefaultCodeTranslations;
exports.applyDefaultCodeTranslations = applyDefaultCodeTranslations;
exports.loadSiteCodeTranslations = loadSiteCodeTranslations;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const utils_validation_1 = require("@docusaurus/utils-validation");
const TranslationFileContentSchema = utils_validation_1.Joi.object()
    .pattern(utils_validation_1.Joi.string(), utils_validation_1.Joi.object({
    message: utils_validation_1.Joi.string().allow('').required(),
    description: utils_validation_1.Joi.string().optional(),
}))
    .required();
function ensureTranslationFileContent(content) {
    utils_validation_1.Joi.attempt(content, TranslationFileContentSchema, {
        abortEarly: false,
        allowUnknown: false,
        convert: false,
    });
}
async function readTranslationFileContent(filePath) {
    if (await fs_extra_1.default.pathExists(filePath)) {
        try {
            const content = await fs_extra_1.default.readJSON(filePath);
            ensureTranslationFileContent(content);
            return content;
        }
        catch (err) {
            logger_1.default.error `Invalid translation file at path=${filePath}.`;
            throw err;
        }
    }
    return undefined;
}
function mergeTranslationFileContent({ existingContent = {}, newContent, options, }) {
    // Apply messagePrefix to all messages
    const newContentTransformed = lodash_1.default.mapValues(newContent, (value) => ({
        ...value,
        message: `${options.messagePrefix ?? ''}${value.message}`,
    }));
    const result = { ...existingContent };
    // We only add missing keys here, we don't delete existing ones
    Object.entries(newContentTransformed).forEach(([key, { message, description }]) => {
        result[key] = {
            // If messages already exist, we don't override them (unless requested)
            message: options.override
                ? message
                : existingContent[key]?.message ?? message,
            description,
        };
    });
    return result;
}
async function writeTranslationFileContent({ filePath, content: newContent, options = {}, }) {
    const existingContent = await readTranslationFileContent(filePath);
    // Warn about potential legacy keys
    const unknownKeys = lodash_1.default.difference(Object.keys(existingContent ?? {}), Object.keys(newContent));
    if (unknownKeys.length > 0) {
        logger_1.default.warn `Some translation keys looks unknown to us in file path=${filePath}.
Maybe you should remove them? ${unknownKeys}`;
    }
    const mergedContent = mergeTranslationFileContent({
        existingContent,
        newContent,
        options,
    });
    // Avoid creating empty translation files
    if (Object.keys(mergedContent).length > 0) {
        logger_1.default.info `number=${Object.keys(mergedContent).length} translations will be written at path=${(0, utils_1.toMessageRelativeFilePath)(filePath)}.`;
        await fs_extra_1.default.outputFile(filePath, `${JSON.stringify(mergedContent, null, 2)}\n`);
    }
}
function getCodeTranslationsFilePath(context) {
    return path_1.default.join(context.localizationDir, utils_1.CODE_TRANSLATIONS_FILE_NAME);
}
async function readCodeTranslationFileContent(context) {
    return readTranslationFileContent(getCodeTranslationsFilePath(context));
}
async function writeCodeTranslations(context, content, options) {
    return writeTranslationFileContent({
        filePath: getCodeTranslationsFilePath(context),
        content,
        options,
    });
}
// We ask users to not provide any extension on purpose:
// maybe some day we'll want to support multiple FS formats?
// (json/yaml/toml/xml...)
function addTranslationFileExtension(translationFilePath) {
    if (translationFilePath.endsWith('.json')) {
        throw new Error(`Translation file path at "${translationFilePath}" does not need to end with ".json", we add the extension automatically.`);
    }
    return `${translationFilePath}.json`;
}
function getPluginTranslationFilePath({ localizationDir, plugin, translationFilePath, }) {
    const dirPath = (0, utils_1.getPluginI18nPath)({
        localizationDir,
        pluginName: plugin.name,
        pluginId: plugin.options.id,
    });
    const filePath = addTranslationFileExtension(translationFilePath);
    return path_1.default.join(dirPath, filePath);
}
async function writePluginTranslations({ localizationDir, plugin, translationFile, options, }) {
    const filePath = getPluginTranslationFilePath({
        plugin,
        localizationDir,
        translationFilePath: translationFile.path,
    });
    await writeTranslationFileContent({
        filePath,
        content: translationFile.content,
        options,
    });
}
async function localizePluginTranslationFile({ localizationDir, plugin, translationFile, }) {
    const filePath = getPluginTranslationFilePath({
        plugin,
        localizationDir,
        translationFilePath: translationFile.path,
    });
    const localizedContent = await readTranslationFileContent(filePath);
    if (localizedContent) {
        // Localized messages "override" default unlocalized messages
        return {
            path: translationFile.path,
            content: {
                ...translationFile.content,
                ...localizedContent,
            },
        };
    }
    return translationFile;
}
function mergeCodeTranslations(codeTranslations) {
    return codeTranslations.reduce((allCodeTranslations, current) => ({
        ...allCodeTranslations,
        ...current,
    }), {});
}
async function loadPluginsDefaultCodeTranslationMessages(plugins) {
    const pluginsMessages = await Promise.all(plugins.map((plugin) => plugin.getDefaultCodeTranslationMessages?.() ?? {}));
    return mergeCodeTranslations(pluginsMessages);
}
function getPluginsDefaultCodeTranslations({ plugins, }) {
    return mergeCodeTranslations(plugins.map((p) => p.defaultCodeTranslations));
}
function applyDefaultCodeTranslations({ extractedCodeTranslations, defaultCodeMessages, }) {
    const unusedDefaultCodeMessages = lodash_1.default.difference(Object.keys(defaultCodeMessages), Object.keys(extractedCodeTranslations));
    if (unusedDefaultCodeMessages.length > 0) {
        logger_1.default.warn `Unused default message codes found.
Please report this Docusaurus issue. name=${unusedDefaultCodeMessages}`;
    }
    return lodash_1.default.mapValues(extractedCodeTranslations, (messageTranslation, messageId) => ({
        ...messageTranslation,
        message: defaultCodeMessages[messageId] ?? messageTranslation.message,
    }));
}
async function loadSiteCodeTranslations({ localizationDir, }) {
    const codeTranslationFileContent = (await readCodeTranslationFileContent({ localizationDir })) ?? {};
    // We only need key->message for code translations
    return lodash_1.default.mapValues(codeTranslationFileContent, (value) => value.message);
}
