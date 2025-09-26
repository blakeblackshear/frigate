"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomBabelConfigFilePath = getCustomBabelConfigFilePath;
exports.getBabelOptions = getBabelOptions;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("@docusaurus/utils");
async function getCustomBabelConfigFilePath(siteDir) {
    const customBabelConfigurationPath = path_1.default.join(siteDir, utils_1.BABEL_CONFIG_FILE_NAME);
    return (await fs_extra_1.default.pathExists(customBabelConfigurationPath))
        ? customBabelConfigurationPath
        : undefined;
}
function getBabelOptions({ isServer, babelOptions, } = {}) {
    const caller = { name: isServer ? 'server' : 'client' };
    if (typeof babelOptions === 'string') {
        return {
            babelrc: false,
            configFile: babelOptions,
            caller,
        };
    }
    return {
        ...(babelOptions ?? {
            presets: [require.resolve('@docusaurus/babel/preset')],
        }),
        babelrc: false,
        configFile: false,
        caller,
    };
}
//# sourceMappingURL=utils.js.map