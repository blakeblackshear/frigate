"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTranslatableSourceFile = exports.GlobExcludeDefault = exports.Globby = void 0;
exports.createMatcher = createMatcher;
exports.createAbsoluteFilePathMatcher = createAbsoluteFilePathMatcher;
exports.safeGlobby = safeGlobby;
exports.globTranslatableSourceFiles = globTranslatableSourceFiles;
const tslib_1 = require("tslib");
// Globby/Micromatch are the 2 libs we use in Docusaurus consistently
const path_1 = tslib_1.__importDefault(require("path"));
const micromatch_1 = tslib_1.__importDefault(require("micromatch")); // Note: Micromatch is used by Globby
const utils_common_1 = require("@docusaurus/utils-common");
const globby_1 = tslib_1.__importDefault(require("globby"));
exports.Globby = globby_1.default;
const pathUtils_1 = require("./pathUtils");
/**
 * The default glob patterns we ignore when sourcing content.
 * - Ignore files and folders starting with `_` recursively
 * - Ignore tests
 */
exports.GlobExcludeDefault = [
    '**/_*.{js,jsx,ts,tsx,md,mdx}',
    '**/_*/**',
    '**/*.test.{js,jsx,ts,tsx}',
    '**/__tests__/**',
];
/**
 * A very thin wrapper around `Micromatch.makeRe`.
 *
 * @see {@link createAbsoluteFilePathMatcher}
 * @param patterns A list of glob patterns. If the list is empty, it defaults to
 * matching none.
 * @returns A matcher handle that tells if a file path is matched by any of the
 * patterns.
 */
function createMatcher(patterns) {
    if (patterns.length === 0) {
        // `/(?:)/.test("foo")` is `true`
        return () => false;
    }
    const regexp = new RegExp(patterns.map((pattern) => micromatch_1.default.makeRe(pattern).source).join('|'));
    return (str) => regexp.test(str);
}
/**
 * We use match patterns like `"** /_* /**"` (ignore the spaces), where `"_*"`
 * should only be matched within a subfolder. This function would:
 * - Match `/user/sebastien/website/docs/_partials/xyz.md`
 * - Ignore `/user/_sebastien/website/docs/partials/xyz.md`
 *
 * @param patterns A list of glob patterns.
 * @param rootFolders A list of root folders to resolve the glob from.
 * @returns A matcher handle that tells if a file path is matched by any of the
 * patterns, resolved from the first root folder that contains the path.
 * @throws Throws when the returned matcher receives a path that doesn't belong
 * to any of the `rootFolders`.
 */
function createAbsoluteFilePathMatcher(patterns, rootFolders) {
    const matcher = createMatcher(patterns);
    function getRelativeFilePath(absoluteFilePath) {
        const rootFolder = rootFolders.find((folderPath) => [(0, utils_common_1.addSuffix)(folderPath, '/'), (0, utils_common_1.addSuffix)(folderPath, '\\')].some((p) => absoluteFilePath.startsWith(p)));
        if (!rootFolder) {
            throw new Error(`createAbsoluteFilePathMatcher unexpected error, absoluteFilePath=${absoluteFilePath} was not contained in any of the root folders: ${rootFolders.join(', ')}`);
        }
        return path_1.default.relative(rootFolder, absoluteFilePath);
    }
    return (absoluteFilePath) => matcher(getRelativeFilePath(absoluteFilePath));
}
// Globby that fix Windows path patterns
// See https://github.com/facebook/docusaurus/pull/4222#issuecomment-795517329
async function safeGlobby(patterns, options) {
    // Required for Windows support, as paths using \ should not be used by globby
    // (also using the windows hard drive prefix like c: is not a good idea)
    const globPaths = patterns.map((dirPath) => (0, pathUtils_1.posixPath)(path_1.default.relative(process.cwd(), dirPath)));
    return (0, globby_1.default)(globPaths, options);
}
exports.isTranslatableSourceFile = (() => {
    // We only support extracting source code translations from these extensions
    const extensionsAllowed = new Set([
        '.js',
        '.jsx',
        '.ts',
        '.tsx',
        // TODO support md/mdx too? (may be overkill)
        // need to compile the MDX to JSX first and remove front matter
        // '.md',
        // '.mdx',
    ]);
    const isBlacklistedFilePath = (filePath) => {
        // We usually extract from ts files, unless they are .d.ts files
        return filePath.endsWith('.d.ts');
    };
    return (filePath) => {
        const ext = path_1.default.extname(filePath);
        return extensionsAllowed.has(ext) && !isBlacklistedFilePath(filePath);
    };
})();
// A bit weird to put this here, but it's used by core + theme-translations
async function globTranslatableSourceFiles(patterns) {
    const filePaths = await safeGlobby(patterns);
    return filePaths.filter(exports.isTranslatableSourceFile);
}
//# sourceMappingURL=globUtils.js.map