"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVendorExtensions = createVendorExtensions;
function createVendorExtensions(extensions) {
    if (!extensions || typeof extensions !== "object") {
        return undefined;
    }
    const rows = [];
    extensions.map((extension) => {
        const extensionRow = () => {
            return `${extension.key}: ${JSON.stringify(extension.value)}`;
        };
        return rows.push(extensionRow());
    });
    return `\n\n\`\`\`
${rows.join("\n")}
\`\`\`\n\n`;
}
