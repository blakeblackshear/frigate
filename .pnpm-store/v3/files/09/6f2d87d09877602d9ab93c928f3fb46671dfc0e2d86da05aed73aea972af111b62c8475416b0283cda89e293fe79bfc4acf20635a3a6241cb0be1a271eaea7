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
exports.default = CodeBlockJSX;
const react_1 = __importDefault(require("react"));
const Container_1 = __importDefault(
  require("@theme/ApiExplorer/ApiCodeBlock/Container")
);
const clsx_1 = __importDefault(require("clsx"));
// <pre> tags in markdown map to CodeBlocks. They may contain JSX children. When
// the children is not a simple string, we just return a styled block without
// actually highlighting.
function CodeBlockJSX({ children, className }) {
  return react_1.default.createElement(
    Container_1.default,
    {
      as: "pre",
      tabIndex: 0,
      className: (0, clsx_1.default)(
        "openapi-explorer__code-block-standalone",
        "thin-scrollbar",
        className
      ),
    },
    react_1.default.createElement(
      "code",
      { className: "openapi-explorer__code-block-lines" },
      children
    )
  );
}
