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
exports.default = CodeBlockLine;
const react_1 = __importDefault(require("react"));
const clsx_1 = __importDefault(require("clsx"));
function CodeBlockLine({
  line,
  classNames,
  showLineNumbers,
  getLineProps,
  getTokenProps,
}) {
  if (line.length === 1 && line[0].content === "\n") {
    line[0].content = "";
  }
  const lineProps = getLineProps({
    line,
    className: (0, clsx_1.default)(
      classNames,
      showLineNumbers && "openapi-explorer__code-block-code-line"
    ),
  });
  const lineTokens = line.map((token, key) =>
    react_1.default.createElement("span", {
      key: key,
      ...getTokenProps({ token, key }),
    })
  );
  return react_1.default.createElement(
    "span",
    { ...lineProps },
    showLineNumbers
      ? react_1.default.createElement(
          react_1.default.Fragment,
          null,
          react_1.default.createElement("span", {
            className: "openapi-explorer__code-block-code-line-number",
          }),
          react_1.default.createElement(
            "span",
            { className: "openapi-explorer__code-block-code-line-content" },
            lineTokens
          )
        )
      : lineTokens,
    react_1.default.createElement("br", null)
  );
}
