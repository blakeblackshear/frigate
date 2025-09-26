"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContactInfo = createContactInfo;
const utils_1 = require("./utils");
function createContactInfo(contact) {
    if (!contact || !Object.keys(contact).length)
        return "";
    const { name, url, email } = contact;
    return (0, utils_1.create)("div", {
        style: {
            display: "flex",
            flexDirection: "column",
            marginBottom: "var(--ifm-paragraph-margin-bottom)",
        },
        children: [
            (0, utils_1.create)("h3", {
                style: {
                    marginBottom: "0.25rem",
                },
                children: "Contact",
            }),
            (0, utils_1.create)("span", {
                children: [
                    (0, utils_1.guard)(name, () => `${name}: `),
                    (0, utils_1.guard)(email, () => `[${email}](mailto:${email})`),
                ],
            }),
            (0, utils_1.guard)(url, () => (0, utils_1.create)("span", {
                children: ["URL: ", `[${url}](${url})`],
            })),
        ],
    });
}
