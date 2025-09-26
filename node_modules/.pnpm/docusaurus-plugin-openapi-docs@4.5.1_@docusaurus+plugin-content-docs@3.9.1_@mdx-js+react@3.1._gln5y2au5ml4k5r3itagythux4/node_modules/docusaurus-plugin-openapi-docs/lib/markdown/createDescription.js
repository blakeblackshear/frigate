"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDescription = createDescription;
const utils_1 = require("./utils");
function createDescription(description) {
    return `\n\n${(0, utils_1.clean)(description)}\n\n`;
}
