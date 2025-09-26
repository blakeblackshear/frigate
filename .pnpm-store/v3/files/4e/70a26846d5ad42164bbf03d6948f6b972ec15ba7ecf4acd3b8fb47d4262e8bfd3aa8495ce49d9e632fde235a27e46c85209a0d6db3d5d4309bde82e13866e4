"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSlugger = createSlugger;
const tslib_1 = require("tslib");
const github_slugger_1 = tslib_1.__importDefault(require("github-slugger"));
/**
 * A thin wrapper around github-slugger. This is a factory function that returns
 * a stateful Slugger object.
 */
function createSlugger() {
    const githubSlugger = new github_slugger_1.default();
    return {
        slug: (value, options) => githubSlugger.slug(value, options?.maintainCase),
    };
}
//# sourceMappingURL=slugger.js.map