/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { create } from "./utils";

export function createAuthorization(infoPath: string) {
  if (!infoPath) return undefined;
  return [create("SecuritySchemes", { infoPath: infoPath }), "\n\n"];
}
