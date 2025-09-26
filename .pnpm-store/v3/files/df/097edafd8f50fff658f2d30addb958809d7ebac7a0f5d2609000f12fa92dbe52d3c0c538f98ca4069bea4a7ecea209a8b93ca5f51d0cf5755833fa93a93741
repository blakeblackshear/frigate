"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.externalCommand = externalCommand;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const site_1 = require("../server/site");
const init_1 = require("../server/plugins/init");
async function externalCommand({ cli, siteDir: siteDirInput, config, }) {
    const siteDir = await fs_extra_1.default.realpath(siteDirInput);
    const context = await (0, site_1.loadContext)({ siteDir, config });
    const plugins = await (0, init_1.initPlugins)(context);
    // Plugin Lifecycle - extendCli.
    plugins.forEach((plugin) => {
        plugin.extendCli?.(cli);
    });
}
