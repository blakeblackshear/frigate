/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { create, guard } from "./utils";
import { ContactObject } from "../openapi/types";

export function createContactInfo(contact: ContactObject) {
  if (!contact || !Object.keys(contact).length) return "";
  const { name, url, email } = contact;

  return create("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      marginBottom: "var(--ifm-paragraph-margin-bottom)",
    },
    children: [
      create("h3", {
        style: {
          marginBottom: "0.25rem",
        },
        children: "Contact",
      }),
      create("span", {
        children: [
          guard(name, () => `${name}: `),
          guard(email, () => `[${email}](mailto:${email})`),
        ],
      }),
      guard(url, () =>
        create("span", {
          children: ["URL: ", `[${url}](${url})`],
        })
      ),
    ],
  });
}
