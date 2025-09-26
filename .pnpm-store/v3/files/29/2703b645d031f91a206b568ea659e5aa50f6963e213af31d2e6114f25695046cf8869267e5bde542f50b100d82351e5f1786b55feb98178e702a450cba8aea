"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTermsOfService = createTermsOfService;
const utils_1 = require("./utils");
function createTermsOfService(termsOfService) {
    if (!termsOfService)
        return "";
    return (0, utils_1.create)("div", {
        style: {
            marginBottom: "var(--ifm-paragraph-margin-bottom)",
        },
        children: [
            (0, utils_1.create)("h3", {
                style: {
                    marginBottom: "0.25rem",
                },
                children: "Terms of Service",
            }),
            (0, utils_1.create)("a", {
                href: `${termsOfService}`,
                children: `{'${termsOfService}'}`,
            }),
        ],
    });
}
