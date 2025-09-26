"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveMarkdownLinkPathname = resolveMarkdownLinkPathname;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const dataFileUtils_1 = require("./dataFileUtils");
const pathUtils_1 = require("./pathUtils");
function resolveMarkdownLinkPathname(linkPathname, context) {
    const { sourceFilePath, sourceToPermalink, contentPaths, siteDir } = context;
    // If the link is already @site aliased, there's no need to resolve it
    if (linkPathname.startsWith('@site/')) {
        return sourceToPermalink.get(decodeURIComponent(linkPathname)) ?? null;
    }
    // Get the dirs to "look into", ordered by priority, when resolving the link
    function getSourceDirsToTry() {
        // /file.md is always resolved from
        // - the plugin content paths,
        // - then siteDir
        if (linkPathname.startsWith('/')) {
            return [...(0, dataFileUtils_1.getContentPathList)(contentPaths), siteDir];
        }
        // ./file.md and ../file.md are always resolved from
        // - the current file dir
        else if (linkPathname.startsWith('./') || linkPathname.startsWith('../')) {
            return [path_1.default.dirname(sourceFilePath)];
        }
        // file.md is resolved from
        // - the current file dir,
        // - then from the plugin content paths,
        // - then siteDir
        else {
            return [
                path_1.default.dirname(sourceFilePath),
                ...(0, dataFileUtils_1.getContentPathList)(contentPaths),
                siteDir,
            ];
        }
    }
    const sourcesToTry = getSourceDirsToTry()
        .map((sourceDir) => path_1.default.join(sourceDir, decodeURIComponent(linkPathname)))
        .map((source) => (0, pathUtils_1.aliasedSitePath)(source, siteDir));
    const aliasedSourceMatch = sourcesToTry.find((source) => sourceToPermalink.has(source));
    return aliasedSourceMatch
        ? sourceToPermalink.get(aliasedSourceMatch) ?? null
        : null;
}
//# sourceMappingURL=markdownLinks.js.map