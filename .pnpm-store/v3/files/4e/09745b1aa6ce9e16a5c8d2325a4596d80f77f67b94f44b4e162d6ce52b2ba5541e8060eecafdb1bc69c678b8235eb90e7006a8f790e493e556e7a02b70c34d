/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { create } from "./utils";

export function createTermsOfService(termsOfService: string | undefined) {
  if (!termsOfService) return "";

  return create("div", {
    style: {
      marginBottom: "var(--ifm-paragraph-margin-bottom)",
    },
    children: [
      create("h3", {
        style: {
          marginBottom: "0.25rem",
        },
        children: "Terms of Service",
      }),
      create("a", {
        href: `${termsOfService}`,
        children: `{'${termsOfService}'}`,
      }),
    ],
  });
}
