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
exports.default = ExitButton;
const react_1 = __importDefault(require("react"));
const Translate_1 = require("@docusaurus/Translate");
const clsx_1 = __importDefault(require("clsx"));
function ExitButton({ className, handler }) {
  return react_1.default.createElement(
    "button",
    {
      type: "button",
      "aria-label": (0, Translate_1.translate)({
        id: "theme.CodeBlock.exitButtonAriaLabel",
        message: "Exit expanded view",
        description: "The ARIA label for exit expanded view button",
      }),
      title: (0, Translate_1.translate)({
        id: "theme.CodeBlock.copy",
        message: "Copy",
        description: "The exit button label on code blocks",
      }),
      className: (0, clsx_1.default)(
        "clean-btn",
        "openapi-explorer__code-block-exit-btn",
        className
      ),
      onClick: handler,
    },
    react_1.default.createElement(
      "span",
      {
        className: "openapi-explorer__code-block-exit-btn-icons",
        "aria-hidden": "true",
      },
      react_1.default.createElement(
        "svg",
        {
          className: "openapi-explorer__code-block-exit-btn-icon",
          viewBox: "0 0 384 512",
        },
        react_1.default.createElement("path", {
          d: "M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z",
        })
      )
    )
  );
}
