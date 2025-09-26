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
const CodeBlock_1 = __importDefault(require("@theme/CodeBlock"));
function CodeSamples({ example, language }) {
  return react_1.default.createElement(
    "div",
    { className: "openapi-code__code-samples-container" },
    react_1.default.createElement(
      CodeBlock_1.default,
      { language: language ? language : "json" },
      example
    )
  );
}
exports.default = CodeSamples;
