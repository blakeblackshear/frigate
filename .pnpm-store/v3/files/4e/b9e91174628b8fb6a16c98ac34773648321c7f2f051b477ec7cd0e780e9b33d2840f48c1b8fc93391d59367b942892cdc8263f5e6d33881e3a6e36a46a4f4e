"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllClientModules = getAllClientModules;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
/**
 * Runs the `getClientModules` lifecycle. The returned file paths are all
 * absolute.
 */
function getAllClientModules(plugins) {
    return plugins.flatMap((plugin) => plugin.getClientModules?.().map((p) => path_1.default.resolve(plugin.path, p)) ??
        []);
}
