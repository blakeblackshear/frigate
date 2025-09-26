/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

export interface Props {
  label?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
}

function FloatingButton({ label, onClick, children }: Props) {
  return (
    <div tabIndex={0} className="openapi-explorer__floating-btn">
      {label && (
        <button tabIndex={0} onClick={onClick}>
          {label}
        </button>
      )}
      {children}
    </div>
  );
}

export default FloatingButton;
