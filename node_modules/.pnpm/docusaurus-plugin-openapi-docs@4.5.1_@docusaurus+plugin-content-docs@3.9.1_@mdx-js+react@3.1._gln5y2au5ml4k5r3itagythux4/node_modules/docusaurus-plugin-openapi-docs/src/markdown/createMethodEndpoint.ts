/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { create } from "./utils";

export function createMethodEndpoint(method: String, path: String) {
  return [
    create("MethodEndpoint", {
      method: method,
      path: path,
      context: "endpoint",
    }),
    "\n\n",
  ];
}
