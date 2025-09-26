"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVersionBadge = createVersionBadge;
const utils_1 = require("./utils");
function createVersionBadge(version) {
    return (0, utils_1.guard)(version, (version) => [
        (0, utils_1.create)("span", {
            className: "theme-doc-version-badge badge badge--secondary",
            children: `Version: ${escape(version)}`,
        }, { inline: true }),
        `\n\n`,
    ]);
}
