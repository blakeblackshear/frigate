/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import Container from "@theme/ApiExplorer/ApiCodeBlock/Container";
import type { Props } from "@theme/CodeBlock/Content/Element";
import clsx from "clsx";

// <pre> tags in markdown map to CodeBlocks. They may contain JSX children. When
// the children is not a simple string, we just return a styled block without
// actually highlighting.
export default function CodeBlockJSX({
  children,
  className,
}: Props): React.JSX.Element {
  return (
    <Container
      as="pre"
      tabIndex={0}
      className={clsx(
        "openapi-explorer__code-block-standalone",
        "thin-scrollbar",
        className
      )}
    >
      <code className="openapi-explorer__code-block-lines">{children}</code>
    </Container>
  );
}
