/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { create, guard } from "./utils";
import { LogoObject } from "../openapi/types";

export function createLogo(
  logo: LogoObject | undefined,
  darkLogo: LogoObject | undefined
) {
  return guard(logo || darkLogo, () => [
    create("ApiLogo", {
      logo: logo,
      darkLogo: darkLogo,
    }),
  ]);
}
