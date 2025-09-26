"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const bundler_1 = require("@docusaurus/bundler");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
// When building, include the plugin to force terminate building if errors
// happened in the client bundle.
class ForceTerminatePlugin {
    apply(compiler) {
        compiler.hooks.done.tap('client:done', (stats) => {
            if (stats.hasErrors()) {
                const errorsWarnings = stats.toJson('errors-warnings');
                logger_1.default.error(`Client bundle compiled with errors therefore further build is impossible.\n${(0, bundler_1.formatStatsErrorMessage)(errorsWarnings)}`);
                process.exit(1);
            }
        });
    }
}
exports.default = ForceTerminatePlugin;
