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
exports.default = ApiLogo;
const react_1 = __importDefault(require("react"));
const theme_common_1 = require("@docusaurus/theme-common");
const useBaseUrl_1 = __importDefault(require("@docusaurus/useBaseUrl"));
const ThemedImage_1 = __importDefault(require("@theme/ThemedImage"));
function ApiLogo(props) {
  const { colorMode } = (0, theme_common_1.useColorMode)();
  const { logo, darkLogo } = props;
  const altText = () => {
    if (colorMode === "dark") {
      return darkLogo?.altText ?? logo?.altText;
    }
    return logo?.altText;
  };
  const lightLogoUrl = (0, useBaseUrl_1.default)(logo?.url);
  const darkLogoUrl = (0, useBaseUrl_1.default)(darkLogo?.url);
  if (logo && darkLogo) {
    return react_1.default.createElement(ThemedImage_1.default, {
      alt: altText(),
      sources: {
        light: lightLogoUrl,
        dark: darkLogoUrl,
      },
      className: "openapi__logo",
    });
  }
  if (logo || darkLogo) {
    return react_1.default.createElement(ThemedImage_1.default, {
      alt: altText(),
      sources: {
        light: lightLogoUrl ?? darkLogoUrl,
        dark: lightLogoUrl ?? darkLogoUrl,
      },
      className: "openapi__logo",
    });
  }
  return undefined;
}
