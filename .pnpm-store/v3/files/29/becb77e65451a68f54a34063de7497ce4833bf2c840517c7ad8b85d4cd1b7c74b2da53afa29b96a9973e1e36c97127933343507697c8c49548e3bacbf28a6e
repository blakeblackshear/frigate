/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { create, guard } from "./utils";

export function createDownload(url: string | undefined) {
  return guard(url, (url) => [
    create("Export", { url: url, proxy: undefined }),
    `\n\n`,
  ]);
}
