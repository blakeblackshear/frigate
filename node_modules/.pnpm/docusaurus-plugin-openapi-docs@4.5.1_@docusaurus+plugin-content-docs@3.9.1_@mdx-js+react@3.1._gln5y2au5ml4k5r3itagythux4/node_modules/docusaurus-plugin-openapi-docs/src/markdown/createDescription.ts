/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { clean } from "./utils";

export function createDescription(description: string | undefined) {
  return `\n\n${clean(description)}\n\n`;
}
