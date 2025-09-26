/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { clean, create } from "./utils";

export function createHeading(heading: string) {
  return [
    create(
      "Heading",
      {
        children: clean(heading),
        as: "h1",
        className: "openapi__heading",
      },
      { inline: true }
    ),
    `\n\n`,
  ];
}
