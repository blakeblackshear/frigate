"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortAliases = sortAliases;
exports.createAliasesForTheme = createAliasesForTheme;
exports.loadThemeAliases = loadThemeAliases;
exports.loadDocusaurusAliases = loadDocusaurusAliases;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
const ThemeFallbackDir = path_1.default.join(__dirname, '../../client/theme-fallback');
/**
 * Order of Webpack aliases is important because one alias can shadow another.
 * This ensures `@theme/NavbarItem` alias is after
 * `@theme/NavbarItem/LocaleDropdown`.
 *
 * @see https://github.com/facebook/docusaurus/pull/3922
 * @see https://github.com/facebook/docusaurus/issues/5382
 */
function sortAliases(aliases) {
    // Alphabetical order by default
    const entries = lodash_1.default.sortBy(Object.entries(aliases), ([alias]) => alias);
    // @theme/NavbarItem should be after @theme/NavbarItem/LocaleDropdown
    entries.sort(([alias1], [alias2]) => 
    // eslint-disable-next-line no-nested-ternary
    alias1.includes(`${alias2}/`) ? -1 : alias2.includes(`${alias1}/`) ? 1 : 0);
    return Object.fromEntries(entries);
}
async function createAliasesForTheme(themePath, addOriginalAlias) {
    if (!(await fs_extra_1.default.pathExists(themePath))) {
        return {};
    }
    const themeComponentFiles = await (0, utils_1.Globby)(['**/*.{js,jsx,ts,tsx}'], {
        cwd: themePath,
    });
    const aliases = {};
    themeComponentFiles.forEach((relativeSource) => {
        const filePath = path_1.default.join(themePath, relativeSource);
        const fileName = (0, utils_1.fileToPath)(relativeSource);
        const aliasName = (0, utils_1.posixPath)((0, utils_1.normalizeUrl)(['@theme', fileName]).replace(/\/$/, ''));
        aliases[aliasName] = filePath;
        if (addOriginalAlias) {
            // For swizzled components to access the original.
            const originalAliasName = (0, utils_1.posixPath)((0, utils_1.normalizeUrl)(['@theme-original', fileName]).replace(/\/$/, ''));
            aliases[originalAliasName] = filePath;
        }
    });
    return sortAliases(aliases);
}
async function createThemeAliases(themePaths, userThemePaths) {
    const aliases = {};
    for (const themePath of themePaths) {
        const themeAliases = await createAliasesForTheme(themePath, true);
        Object.entries(themeAliases).forEach(([aliasKey, alias]) => {
            // If this alias shadows a previous one, use @theme-init to preserve the
            // initial one. @theme-init is only applied once: to the initial theme
            // that provided this component
            if (aliasKey in aliases) {
                const componentName = aliasKey.substring(aliasKey.indexOf('/') + 1);
                const initAlias = `@theme-init/${componentName}`;
                if (!(initAlias in aliases)) {
                    aliases[initAlias] = aliases[aliasKey];
                }
            }
            aliases[aliasKey] = alias;
        });
    }
    for (const themePath of userThemePaths) {
        const userThemeAliases = await createAliasesForTheme(themePath, false);
        Object.assign(aliases, userThemeAliases);
    }
    return sortAliases(aliases);
}
function loadThemeAliases({ siteDir, plugins, }) {
    const pluginThemes = plugins
        .map((plugin) => plugin.getThemePath && path_1.default.resolve(plugin.path, plugin.getThemePath()))
        .filter((x) => Boolean(x));
    const userTheme = path_1.default.resolve(siteDir, utils_1.THEME_PATH);
    return createThemeAliases([ThemeFallbackDir, ...pluginThemes], [userTheme]);
}
/**
 * Note: a `@docusaurus` alias would also catch `@docusaurus/theme-common`, so
 * instead of naively aliasing this to `client/exports`, we use fine-grained
 * aliases instead.
 */
async function loadDocusaurusAliases() {
    const dirPath = path_1.default.resolve(__dirname, '../../client/exports');
    const extensions = ['.js', '.ts', '.tsx'];
    const aliases = {};
    (await fs_extra_1.default.readdir(dirPath))
        .filter((fileName) => extensions.includes(path_1.default.extname(fileName)))
        .forEach((fileName) => {
        const fileNameWithoutExtension = path_1.default.basename(fileName, path_1.default.extname(fileName));
        const aliasName = `@docusaurus/${fileNameWithoutExtension}`;
        aliases[aliasName] = path_1.default.resolve(dirPath, fileName);
    });
    return aliases;
}
