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
const client_1 = require("@docusaurus/plugin-content-docs/client");
const theme_common_1 = require("@docusaurus/theme-common");
const ApiCodeBlock_1 = __importDefault(
  require("@theme/ApiExplorer/ApiCodeBlock")
);
const hooks_1 = require("@theme/ApiItem/hooks");
const SchemaTabs_1 = __importDefault(require("@theme/SchemaTabs"));
const TabItem_1 = __importDefault(require("@theme/TabItem"));
const clsx_1 = __importDefault(require("clsx"));
const slice_1 = require("./slice");
// TODO: We probably shouldn't attempt to format XML...
function formatXml(xml) {
  const tab = "  ";
  let formatted = "";
  let indent = "";
  xml.split(/>\s*</).forEach((node) => {
    if (node.match(/^\/\w/)) {
      // decrease indent by one 'tab'
      indent = indent.substring(tab.length);
    }
    formatted += indent + "<" + node + ">\r\n";
    if (node.match(/^<?\w[^>]*[^/]$/)) {
      // increase indent
      indent += tab;
    }
  });
  return formatted.substring(1, formatted.length - 3);
}
function Response({ item }) {
  const metadata = (0, client_1.useDoc)();
  const hideSendButton = metadata.frontMatter.hide_send_button;
  const prismTheme = (0, theme_common_1.usePrismTheme)();
  const code = (0, hooks_1.useTypedSelector)((state) => state.response.code);
  const headers = (0, hooks_1.useTypedSelector)(
    (state) => state.response.headers
  );
  const response = (0, hooks_1.useTypedSelector)(
    (state) => state.response.value
  );
  const dispatch = (0, hooks_1.useTypedDispatch)();
  const responseStatusClass =
    code &&
    "openapi-response__dot " +
      (parseInt(code) >= 400
        ? "openapi-response__dot--danger"
        : parseInt(code) >= 200 && parseInt(code) < 300
          ? "openapi-response__dot--success"
          : "openapi-response__dot--info");
  if (!item.servers || hideSendButton) {
    return null;
  }
  let prettyResponse = response;
  if (prettyResponse) {
    try {
      prettyResponse = JSON.stringify(JSON.parse(response), null, 2);
    } catch {
      if (response.startsWith("<")) {
        prettyResponse = formatXml(response);
      }
    }
  }
  return react_1.default.createElement(
    "div",
    { className: "openapi-explorer__response-container" },
    react_1.default.createElement(
      "div",
      { className: "openapi-explorer__response-title-container" },
      react_1.default.createElement(
        "span",
        { className: "openapi-explorer__response-title" },
        "Response"
      ),
      react_1.default.createElement(
        "span",
        {
          className: "openapi-explorer__response-clear-btn",
          onClick: () => {
            dispatch((0, slice_1.clearResponse)());
            dispatch((0, slice_1.clearCode)());
            dispatch((0, slice_1.clearHeaders)());
          },
        },
        "Clear"
      )
    ),
    react_1.default.createElement(
      "div",
      {
        style: {
          backgroundColor:
            code && prettyResponse !== "Fetching..."
              ? prismTheme.plain.backgroundColor
              : "transparent",
          paddingLeft: "1rem",
          paddingTop: "1rem",
          ...((prettyResponse === "Fetching..." || !code) && {
            paddingBottom: "1rem",
          }),
        },
      },
      code && prettyResponse !== "Fetching..."
        ? react_1.default.createElement(
            SchemaTabs_1.default,
            { lazy: true },
            react_1.default.createElement(
              TabItem_1.default,
              {
                label: ` ${code}`,
                value: "body",
                attributes: {
                  className: (0, clsx_1.default)(
                    "openapi-response__dot",
                    responseStatusClass
                  ),
                },
                default: true,
              },
              react_1.default.createElement(
                ApiCodeBlock_1.default,
                {
                  className:
                    "openapi-explorer__code-block openapi-response__status-code",
                  language: response.startsWith("<") ? `xml` : `json`,
                },
                prettyResponse ||
                  react_1.default.createElement(
                    "p",
                    {
                      className:
                        "openapi-explorer__response-placeholder-message",
                    },
                    "Click the ",
                    react_1.default.createElement(
                      "code",
                      null,
                      "Send API Request"
                    ),
                    " button above and see the response here!"
                  )
              )
            ),
            react_1.default.createElement(
              TabItem_1.default,
              { label: "Headers", value: "headers" },
              react_1.default.createElement(
                ApiCodeBlock_1.default,
                {
                  className:
                    "openapi-explorer__code-block openapi-response__status-headers",
                  language: response.startsWith("<") ? `xml` : `json`,
                },
                JSON.stringify(headers, undefined, 2)
              )
            )
          )
        : prettyResponse === "Fetching..."
          ? react_1.default.createElement(
              "div",
              { className: "openapi-explorer__loading-container" },
              react_1.default.createElement(
                "div",
                { className: "openapi-response__lds-ring" },
                react_1.default.createElement("div", null),
                react_1.default.createElement("div", null),
                react_1.default.createElement("div", null),
                react_1.default.createElement("div", null)
              )
            )
          : react_1.default.createElement(
              "p",
              { className: "openapi-explorer__response-placeholder-message" },
              "Click the ",
              react_1.default.createElement("code", null, "Send API Request"),
              " button above and see the response here!"
            )
    )
  );
}
exports.default = Response;
