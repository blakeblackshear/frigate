"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeRegexp = escapeRegexp;
const tslib_1 = require("tslib");
const escape_string_regexp_1 = tslib_1.__importDefault(require("escape-string-regexp"));
function escapeRegexp(string) {
    return (0, escape_string_regexp_1.default)(string);
}
//# sourceMappingURL=regExpUtils.js.map