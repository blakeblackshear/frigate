"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = clearPath;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const promises_1 = require("fs/promises");
const logger_1 = require("@docusaurus/logger");
/**
 * @param pathToClear
 */
async function clearPath(pathToClear) {
    return logger_1.PerfLogger.async(`clearPath ${path_1.default.relative(process.cwd(), pathToClear)}`, async () => {
        await (0, promises_1.rm)(pathToClear, { recursive: true, force: true });
    });
}
