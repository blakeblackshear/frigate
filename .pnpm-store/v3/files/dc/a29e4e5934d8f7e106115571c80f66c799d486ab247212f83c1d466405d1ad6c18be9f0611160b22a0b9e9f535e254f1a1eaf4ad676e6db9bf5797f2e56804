"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateThemeConfig = void 0;
exports.default = themeMermaid;
/**
 * Check if the optional @mermaid-js/layout-elk package is available.
 * It's an optional peer dependency because it's heavy and most Mermaid users
 * might not need it.
 */
async function isElkLayoutPackageAvailable() {
    try {
        await import('@mermaid-js/layout-elk');
        return true;
    }
    catch (e) {
        return false;
    }
}
async function themeMermaid() {
    // For now, we infer based on package availability
    // In the future, we could make it configurable so that users can disable it
    // even if the package is installed?
    const elkLayoutEnabled = await isElkLayoutPackageAvailable();
    return {
        name: 'docusaurus-theme-mermaid',
        getThemePath() {
            return '../lib/theme';
        },
        getTypeScriptThemePath() {
            return '../src/theme';
        },
        configureWebpack(config, isServer, utils) {
            return {
                plugins: [
                    new utils.currentBundler.instance.DefinePlugin({
                        __DOCUSAURUS_MERMAID_LAYOUT_ELK_ENABLED__: JSON.stringify(
                        // We only need to include the layout registration code on the
                        // client side. This also solves a weird Webpack-only bug when
                        // compiling the server config due to the module being ESM-only.
                        !isServer && elkLayoutEnabled),
                    }),
                ],
            };
        },
    };
}
var validateThemeConfig_1 = require("./validateThemeConfig");
Object.defineProperty(exports, "validateThemeConfig", { enumerable: true, get: function () { return validateThemeConfig_1.validateThemeConfig; } });
