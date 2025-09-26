"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestSchema = createRequestSchema;
const utils_1 = require("./utils");
function createRequestSchema({ title, body, ...rest }) {
    return [
        (0, utils_1.create)("RequestSchema", {
            title: title,
            body: body,
            ...rest,
        }),
        "\n\n",
    ];
}
