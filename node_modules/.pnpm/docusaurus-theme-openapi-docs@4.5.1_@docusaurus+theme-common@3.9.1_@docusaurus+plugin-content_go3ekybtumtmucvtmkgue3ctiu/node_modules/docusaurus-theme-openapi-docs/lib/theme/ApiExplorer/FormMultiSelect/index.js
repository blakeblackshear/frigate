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
function FormMultiSelect({ value, options, onChange, showErrors }) {
  if (options.length === 0) {
    return null;
  }
  let height;
  if (options.length < 6) {
    const selectPadding = 12 * 2;
    const rawHeight = options.length * 29;
    const innerMargins = 4 * options.length - 1;
    const outerMargins = 4 * 2;
    const mysteryScroll = 1;
    height =
      rawHeight + innerMargins + outerMargins + selectPadding + mysteryScroll;
  }
  return react_1.default.createElement(
    "select",
    {
      style: { height: height },
      className: (0, clsx_1.default)("openapi-explorer__multi-select-input", {
        error: showErrors,
      }),
      value: value,
      onChange: onChange,
      size: Math.min(6, options.length + 1),
      multiple: true,
    },
    options.map((option) => {
      return react_1.default.createElement(
        "option",
        { key: option, value: option },
        option
      );
    })
  );
}
exports.default = FormMultiSelect;
