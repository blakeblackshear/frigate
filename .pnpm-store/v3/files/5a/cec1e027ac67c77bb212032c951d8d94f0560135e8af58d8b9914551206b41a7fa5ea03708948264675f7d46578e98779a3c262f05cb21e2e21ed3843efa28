"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMethodEndpoint = createMethodEndpoint;
const utils_1 = require("./utils");
function createMethodEndpoint(method, path) {
    return [
        (0, utils_1.create)("MethodEndpoint", {
            method: method,
            path: path,
            context: "endpoint",
        }),
        "\n\n",
    ];
}
