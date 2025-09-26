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
exports.default = CodeBlockContainer;
const react_1 = __importDefault(require("react"));
const theme_common_1 = require("@docusaurus/theme-common");
const internal_1 = require("@docusaurus/theme-common/internal");
const clsx_1 = __importDefault(require("clsx"));
function CodeBlockContainer({ as: As, ...props }) {
  const prismTheme = (0, theme_common_1.usePrismTheme)();
  const prismCssVariables = (0, internal_1.getPrismCssVariables)(prismTheme);
  return react_1.default.createElement(
    As,
    // Polymorphic components are hard to type, without `oneOf` generics
    {
      ...props,
      style: prismCssVariables,
      className: (0, clsx_1.default)(
        "openapi-explorer__code-block-container",
        props.className,
        theme_common_1.ThemeClassNames.common.codeBlock
      ),
    }
  );
}
