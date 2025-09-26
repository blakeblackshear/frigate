"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestHeader = createRequestHeader;
const utils_1 = require("./utils");
function createRequestHeader(header) {
    return [
        (0, utils_1.create)("Heading", {
            children: header,
            id: header.replace(" ", "-").toLowerCase(),
            as: "h2",
            className: "openapi-tabs__heading",
        }, { inline: true }),
        `\n\n`,
    ];
}
