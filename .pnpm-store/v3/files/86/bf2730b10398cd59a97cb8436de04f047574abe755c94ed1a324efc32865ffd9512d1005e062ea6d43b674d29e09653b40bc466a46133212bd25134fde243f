"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLicense = createLicense;
const utils_1 = require("./utils");
function createLicense(license) {
    if (!license || !Object.keys(license).length)
        return "";
    const { name, url } = license;
    return (0, utils_1.create)("div", {
        style: {
            marginBottom: "var(--ifm-paragraph-margin-bottom)",
        },
        children: [
            (0, utils_1.create)("h3", {
                style: {
                    marginBottom: "0.25rem",
                },
                children: "License",
            }),
            (0, utils_1.guard)(url, () => (0, utils_1.create)("a", {
                href: url,
                children: name !== null && name !== void 0 ? name : url,
            })),
        ],
    });
}
