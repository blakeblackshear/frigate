/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { create } from "./utils";

export function createRequestHeader(header: string) {
  return [
    create(
      "Heading",
      {
        children: header,
        id: header.replace(" ", "-").toLowerCase(),
        as: "h2",
        className: "openapi-tabs__heading",
      },
      { inline: true }
    ),
    `\n\n`,
  ];
}
