"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDownload = createDownload;
const utils_1 = require("./utils");
function createDownload(url) {
    return (0, utils_1.guard)(url, (url) => [
        (0, utils_1.create)("Export", { url: url, proxy: undefined }),
        `\n\n`,
    ]);
}
