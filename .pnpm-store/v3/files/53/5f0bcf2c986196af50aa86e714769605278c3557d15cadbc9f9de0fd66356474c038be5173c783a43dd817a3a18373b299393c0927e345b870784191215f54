"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStaticDirectoriesCopyPlugin = createStaticDirectoriesCopyPlugin;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const bundler_1 = require("@docusaurus/bundler");
async function createStaticDirectoriesCopyPlugin({ props, }) {
    const CopyPlugin = await (0, bundler_1.getCopyPlugin)({
        currentBundler: props.currentBundler,
    });
    const { outDir, siteDir, siteConfig: { staticDirectories: staticDirectoriesOption }, } = props;
    // The staticDirectories option can contain empty directories, or non-existent
    // directories (e.g. user deleted `static`). Instead of issuing an error, we
    // just silently filter them out, because user could have never configured it
    // in the first place (the default option should always "work").
    const staticDirectories = (await Promise.all(staticDirectoriesOption.map(async (dir) => {
        const staticDir = path_1.default.resolve(siteDir, dir);
        if ((await fs_extra_1.default.pathExists(staticDir)) &&
            (await fs_extra_1.default.readdir(staticDir)).length > 0) {
            return staticDir;
        }
        return '';
    }))).filter(Boolean);
    if (staticDirectories.length === 0) {
        return undefined;
    }
    return new CopyPlugin({
        patterns: staticDirectories.map((dir) => ({
            from: dir,
            to: outDir,
            toType: 'dir',
            info: {
                // Prevents Webpack from minimizing static files (js/css)
                // see https://github.com/facebook/docusaurus/pull/10658
                // see https://github.com/webpack-contrib/copy-webpack-plugin#skip-running-javascript-files-through-a-minimizer
                minimized: true,
            },
        })),
    });
}
