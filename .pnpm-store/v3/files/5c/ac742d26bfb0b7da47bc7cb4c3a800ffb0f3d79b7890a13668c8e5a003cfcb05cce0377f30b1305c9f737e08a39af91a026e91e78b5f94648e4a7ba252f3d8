"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
function FloatingButton({ label, onClick, children }) {
  return react_1.default.createElement(
    "div",
    { tabIndex: 0, className: "openapi-explorer__floating-btn" },
    label &&
      react_1.default.createElement(
        "button",
        { tabIndex: 0, onClick: onClick },
        label
      ),
    children
  );
}
exports.default = FloatingButton;
