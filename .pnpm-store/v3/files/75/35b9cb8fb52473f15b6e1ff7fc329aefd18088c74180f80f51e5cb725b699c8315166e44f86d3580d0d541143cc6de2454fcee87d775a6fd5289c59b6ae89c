/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

export function createVendorExtensions(extensions: any) {
  if (!extensions || typeof extensions !== "object") {
    return undefined;
  }
  const rows: Array<string> = [];
  extensions.map((extension: any) => {
    const extensionRow = () => {
      return `${extension.key}: ${JSON.stringify(extension.value)}`;
    };
    return rows.push(extensionRow());
  });
  return `\n\n\`\`\`
${rows.join("\n")}
\`\`\`\n\n`;
}
