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
const clsx_1 = __importDefault(require("clsx"));
function FormItem({ label, type, required, children, className }) {
  return react_1.default.createElement(
    "div",
    {
      className: (0, clsx_1.default)("openapi-explorer__form-item", className),
    },
    label &&
      react_1.default.createElement(
        "label",
        { className: "openapi-explorer__form-item-label" },
        label
      ),
    type &&
      react_1.default.createElement(
        "span",
        { style: { opacity: 0.6 } },
        " \u2014 ",
        type
      ),
    required &&
      react_1.default.createElement(
        "span",
        { className: "openapi-schema__required" },
        "required"
      ),
    react_1.default.createElement("div", null, children)
  );
}
exports.default = FormItem;
