/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { create } from "./utils";

export function createOpeningArrayBracket() {
  return create("li", {
    children: create("div", {
      style: {
        fontSize: "var(--ifm-code-font-size)",
        opacity: "0.6",
        marginLeft: "-.5rem",
        paddingBottom: ".5rem",
      },
      children: ["Array ["],
    }),
  });
}

export function createClosingArrayBracket() {
  return create("li", {
    children: create("div", {
      style: {
        fontSize: "var(--ifm-code-font-size)",
        opacity: "0.6",
        marginLeft: "-.5rem",
      },
      children: ["]"],
    }),
  });
}
