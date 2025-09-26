"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogo = createLogo;
const utils_1 = require("./utils");
function createLogo(logo, darkLogo) {
    return (0, utils_1.guard)(logo || darkLogo, () => [
        (0, utils_1.create)("ApiLogo", {
            logo: logo,
            darkLogo: darkLogo,
        }),
    ]);
}
