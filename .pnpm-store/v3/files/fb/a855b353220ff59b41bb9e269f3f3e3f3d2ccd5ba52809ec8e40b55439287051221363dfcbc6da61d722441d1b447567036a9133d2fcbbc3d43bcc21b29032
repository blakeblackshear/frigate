/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { create, guard } from "./utils";

export function createVersionBadge(version: string | undefined) {
  return guard(version, (version) => [
    create(
      "span",
      {
        className: "theme-doc-version-badge badge badge--secondary",
        children: `Version: ${escape(version)}`,
      },
      { inline: true }
    ),
    `\n\n`,
  ]);
}
