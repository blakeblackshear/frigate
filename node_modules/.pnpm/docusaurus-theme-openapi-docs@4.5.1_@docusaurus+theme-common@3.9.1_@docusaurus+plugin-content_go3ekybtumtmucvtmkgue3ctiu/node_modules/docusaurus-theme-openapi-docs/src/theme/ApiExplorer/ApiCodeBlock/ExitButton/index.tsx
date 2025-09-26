/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import { translate } from "@docusaurus/Translate";
import clsx from "clsx";

export interface Props {
  readonly className: string;
  readonly handler: () => void;
}

export default function ExitButton({
  className,
  handler,
}: Props): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={translate({
        id: "theme.CodeBlock.exitButtonAriaLabel",
        message: "Exit expanded view",
        description: "The ARIA label for exit expanded view button",
      })}
      title={translate({
        id: "theme.CodeBlock.copy",
        message: "Copy",
        description: "The exit button label on code blocks",
      })}
      className={clsx(
        "clean-btn",
        "openapi-explorer__code-block-exit-btn",
        className
      )}
      onClick={handler}
    >
      <span
        className="openapi-explorer__code-block-exit-btn-icons"
        aria-hidden="true"
      >
        <svg
          className="openapi-explorer__code-block-exit-btn-icon"
          viewBox="0 0 384 512"
        >
          <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
        </svg>
      </span>
    </button>
  );
}
