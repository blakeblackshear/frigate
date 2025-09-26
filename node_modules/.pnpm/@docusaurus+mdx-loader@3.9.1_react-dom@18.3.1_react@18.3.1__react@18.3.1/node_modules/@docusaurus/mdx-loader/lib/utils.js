"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssetsExportCode = createAssetsExportCode;
exports.extractContentTitleData = extractContentTitleData;
exports.compileToJSX = compileToJSX;
exports.promiseWithResolvers = promiseWithResolvers;
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const processor_1 = require("./processor");
const frontMatter_1 = require("./frontMatter");
const preprocessor_1 = tslib_1.__importDefault(require("./preprocessor"));
/**
 * Converts assets an object with Webpack require calls code.
 * This is useful for mdx files to reference co-located assets using relative
 * paths. Those assets should enter the Webpack assets pipeline and be hashed.
 * For now, we only handle that for images and paths starting with `./`:
 *
 * `{image: "./myImage.png"}` => `{image: require("./myImage.png")}`
 */
function createAssetsExportCode({ assets, inlineMarkdownAssetImageFileLoader, }) {
    if (typeof assets !== 'object' ||
        !assets ||
        Object.keys(assets).length === 0) {
        return 'undefined';
    }
    // TODO implementation can be completed/enhanced
    function createAssetValueCode(assetValue) {
        if (Array.isArray(assetValue)) {
            const arrayItemCodes = assetValue.map((item) => createAssetValueCode(item) ?? 'undefined');
            return `[${arrayItemCodes.join(', ')}]`;
        }
        // Only process string values starting with ./
        // We could enhance this logic and check if file exists on disc?
        if (typeof assetValue === 'string' && assetValue.startsWith('./')) {
            // TODO do we have other use-cases than image assets?
            // Probably not worth adding more support, as we want to move to Webpack 5 new asset system (https://github.com/facebook/docusaurus/pull/4708)
            return `require("${inlineMarkdownAssetImageFileLoader}${(0, utils_1.escapePath)(assetValue)}").default`;
        }
        return undefined;
    }
    const assetEntries = Object.entries(assets);
    const codeLines = assetEntries
        .map(([key, value]) => {
        const assetRequireCode = createAssetValueCode(value);
        return assetRequireCode ? `"${key}": ${assetRequireCode},` : undefined;
    })
        .filter(Boolean);
    return `{\n${codeLines.join('\n')}\n}`;
}
/**
 * data.contentTitle is set by the remark contentTitle plugin
 */
function extractContentTitleData(data) {
    return data.contentTitle;
}
async function compileToJSX({ filePath, fileContent, frontMatter, options, compilerName, }) {
    const preprocessedFileContent = (0, preprocessor_1.default)({
        fileContent,
        filePath,
        admonitions: options.admonitions,
        markdownConfig: options.markdownConfig,
    });
    const mdxFrontMatter = (0, frontMatter_1.validateMDXFrontMatter)(frontMatter.mdx);
    const processor = await (0, processor_1.getProcessor)({
        filePath,
        options,
        mdxFrontMatter,
    });
    try {
        return await processor.process({
            content: preprocessedFileContent,
            filePath,
            frontMatter,
            compilerName,
        });
    }
    catch (errorUnknown) {
        const error = errorUnknown;
        // MDX can emit errors that have useful extra attributes
        const errorJSON = JSON.stringify(error, null, 2);
        const errorDetails = errorJSON === '{}'
            ? // regular JS error case: print stacktrace
                error.stack ?? 'N/A'
            : // MDX error: print extra attributes + stacktrace
                `${errorJSON}\n${error.stack}`;
        throw new Error(`MDX compilation failed for file ${logger_1.default.path(filePath)}\nCause: ${error.message}\nDetails:\n${errorDetails}`, 
        // TODO error cause doesn't seem to be used by Webpack stats.errors :s
        { cause: error });
    }
}
// TODO Docusaurus v4, remove temporary polyfill when upgrading to Node 22+
function promiseWithResolvers() {
    // @ts-expect-error: it's fine
    const out = {};
    out.promise = new Promise((resolve, reject) => {
        out.resolve = resolve;
        out.reject = reject;
    });
    return out;
}
//# sourceMappingURL=utils.js.map