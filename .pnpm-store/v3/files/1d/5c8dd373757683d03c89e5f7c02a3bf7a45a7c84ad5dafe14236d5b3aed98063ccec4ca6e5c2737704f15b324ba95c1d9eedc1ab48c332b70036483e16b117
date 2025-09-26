"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpeningArrayBracket = createOpeningArrayBracket;
exports.createClosingArrayBracket = createClosingArrayBracket;
const utils_1 = require("./utils");
function createOpeningArrayBracket() {
    return (0, utils_1.create)("li", {
        children: (0, utils_1.create)("div", {
            style: {
                fontSize: "var(--ifm-code-font-size)",
                opacity: "0.6",
                marginLeft: "-.5rem",
                paddingBottom: ".5rem",
            },
            children: ["Array ["],
        }),
    });
}
function createClosingArrayBracket() {
    return (0, utils_1.create)("li", {
        children: (0, utils_1.create)("div", {
            style: {
                fontSize: "var(--ifm-code-font-size)",
                opacity: "0.6",
                marginLeft: "-.5rem",
            },
            children: ["]"],
        }),
    });
}
