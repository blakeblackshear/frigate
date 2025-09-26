"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeSSGInlineTask = executeSSGInlineTask;
const ssgRenderer_1 = require("./ssgRenderer");
// "inline" means in the current thread, not in a worker
async function executeSSGInlineTask(arg) {
    const appRenderer = await (0, ssgRenderer_1.loadSSGRenderer)({ params: arg.params });
    const ssgResults = appRenderer.renderPathnames(arg.pathnames);
    await appRenderer.shutdown();
    return ssgResults;
}
