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
const file_saver_1 = __importDefault(require("file-saver"));
const saveFile = (url) => {
  let fileName;
  if (url.endsWith("json") || url.endsWith("yaml") || url.endsWith("yml")) {
    fileName = url.substring(url.lastIndexOf("/") + 1);
  }
  file_saver_1.default.saveAs(url, fileName ? fileName : "openapi.txt");
};
function Export({ url, proxy }) {
  return react_1.default.createElement(
    "div",
    {
      style: { float: "right" },
      className: "dropdown dropdown--hoverable dropdown--right",
    },
    react_1.default.createElement(
      "button",
      { className: "export-button button button--sm button--secondary" },
      "Export"
    ),
    react_1.default.createElement(
      "ul",
      { className: "export-dropdown dropdown__menu" },
      react_1.default.createElement(
        "li",
        null,
        react_1.default.createElement(
          "a",
          {
            onClick: (e) => {
              e.preventDefault();
              saveFile(`${url}`);
            },
            className: "dropdown__link",
            href: `${url}`,
          },
          "OpenAPI Spec"
        )
      )
    )
  );
}
exports.default = Export;
