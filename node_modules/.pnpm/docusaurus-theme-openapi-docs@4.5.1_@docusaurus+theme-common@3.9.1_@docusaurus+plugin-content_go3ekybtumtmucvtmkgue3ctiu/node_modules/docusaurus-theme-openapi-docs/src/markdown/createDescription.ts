/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

export function createDescription(description: string | undefined) {
  if (!description) {
    return "";
  }
  return `\n\n${description}\n\n`;
}
