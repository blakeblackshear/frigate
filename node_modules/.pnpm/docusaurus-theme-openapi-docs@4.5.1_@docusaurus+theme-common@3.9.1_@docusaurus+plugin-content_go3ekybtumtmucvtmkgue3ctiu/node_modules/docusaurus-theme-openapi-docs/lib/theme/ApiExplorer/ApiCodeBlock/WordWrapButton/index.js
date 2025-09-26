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
exports.default = WordWrapButton;
const react_1 = __importDefault(require("react"));
const Translate_1 = require("@docusaurus/Translate");
const clsx_1 = __importDefault(require("clsx"));
function WordWrapButton({ className, onClick, isEnabled }) {
  const title = (0, Translate_1.translate)({
    id: "theme.CodeBlock.wordWrapToggle",
    message: "Toggle word wrap",
    description:
      "The title attribute for toggle word wrapping button of code block lines",
  });
  return react_1.default.createElement(
    "button",
    {
      type: "button",
      onClick: onClick,
      className: (0, clsx_1.default)(
        "clean-btn",
        className,
        isEnabled && "openapi-explorer__code-block-word-wrap-btn--enabled"
      ),
      "aria-label": title,
      title: title,
    },
    react_1.default.createElement(
      "svg",
      {
        className: "openapi-explorer__code-block-word-wrap-btn-icon",
        viewBox: "0 0 24 24",
        "aria-hidden": "true",
      },
      react_1.default.createElement("path", {
        fill: "currentColor",
        d: "M4 19h6v-2H4v2zM20 5H4v2h16V5zm-3 6H4v2h13.25c1.1 0 2 .9 2 2s-.9 2-2 2H15v-2l-3 3l3 3v-2h2c2.21 0 4-1.79 4-4s-1.79-4-4-4z",
      })
    )
  );
}
