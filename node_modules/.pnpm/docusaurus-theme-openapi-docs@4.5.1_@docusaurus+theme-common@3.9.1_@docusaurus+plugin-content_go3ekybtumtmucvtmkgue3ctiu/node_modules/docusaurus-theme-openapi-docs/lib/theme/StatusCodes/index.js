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
const ApiTabs_1 = __importDefault(require("@theme/ApiTabs"));
const Details_1 = __importDefault(require("@theme/Details"));
const Markdown_1 = __importDefault(require("@theme/Markdown"));
const ResponseHeaders_1 = __importDefault(require("@theme/ResponseHeaders"));
const ResponseSchema_1 = __importDefault(require("@theme/ResponseSchema"));
const TabItem_1 = __importDefault(require("@theme/TabItem"));
const StatusCodes = ({ label, id, responses }) => {
  if (!responses) return null;
  const codes = Object.keys(responses);
  if (codes.length === 0) return null;
  return react_1.default.createElement(
    ApiTabs_1.default,
    { label: label, id: id },
    codes.map((code) => {
      const response = responses[code];
      const responseHeaders = response.headers;
      return (
        // @ts-ignore
        react_1.default.createElement(
          TabItem_1.default,
          { key: code, label: code, value: code },
          react_1.default.createElement(
            "div",
            null,
            response.description &&
              react_1.default.createElement(
                "div",
                { style: { marginTop: ".5rem", marginBottom: ".5rem" } },
                react_1.default.createElement(
                  Markdown_1.default,
                  null,
                  response.description
                )
              )
          ),
          responseHeaders &&
            react_1.default.createElement(
              Details_1.default,
              {
                className: "openapi-markdown__details",
                "data-collapsed": true,
                open: false,
                style: { textAlign: "left", marginBottom: "1rem" },
                summary: react_1.default.createElement(
                  "summary",
                  null,
                  react_1.default.createElement(
                    "strong",
                    null,
                    "Response Headers"
                  )
                ),
              },
              react_1.default.createElement(ResponseHeaders_1.default, {
                responseHeaders: responseHeaders,
              })
            ),
          react_1.default.createElement(ResponseSchema_1.default, {
            title: "Schema",
            body: { content: response.content },
          })
        )
      );
    })
  );
};
exports.default = StatusCodes;
