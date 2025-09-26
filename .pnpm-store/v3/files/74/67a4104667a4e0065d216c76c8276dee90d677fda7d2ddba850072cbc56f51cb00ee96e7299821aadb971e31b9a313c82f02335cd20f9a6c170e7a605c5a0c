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
const BrowserOnly_1 = __importDefault(require("@docusaurus/BrowserOnly"));
const hooks_1 = require("@theme/ApiItem/hooks");
function colorForMethod(method) {
  switch (method.toLowerCase()) {
    case "get":
      return "primary";
    case "post":
      return "success";
    case "delete":
      return "danger";
    case "put":
      return "info";
    case "patch":
      return "warning";
    case "head":
      return "secondary";
    case "event":
      return "secondary";
    default:
      return undefined;
  }
}
function MethodEndpoint({ method, path, context }) {
  let serverValue = (0, hooks_1.useTypedSelector)(
    (state) => state.server.value
  );
  let serverUrlWithVariables = "";
  const renderServerUrl = () => {
    if (context === "callback") {
      return "";
    }
    if (serverValue && serverValue.variables) {
      serverUrlWithVariables = serverValue.url.replace(/\/$/, "");
      Object.keys(serverValue.variables).forEach((variable) => {
        serverUrlWithVariables = serverUrlWithVariables.replace(
          `{${variable}}`,
          serverValue.variables?.[variable].default ?? ""
        );
      });
    }
    return react_1.default.createElement(BrowserOnly_1.default, null, () => {
      if (serverUrlWithVariables.length) {
        return serverUrlWithVariables;
      } else if (serverValue && serverValue.url) {
        return serverValue.url;
      }
    });
  };
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    react_1.default.createElement(
      "pre",
      { className: "openapi__method-endpoint" },
      react_1.default.createElement(
        "span",
        { className: "badge badge--" + colorForMethod(method) },
        method === "event" ? "Webhook" : method.toUpperCase()
      ),
      " ",
      method !== "event" &&
        react_1.default.createElement(
          "h2",
          { className: "openapi__method-endpoint-path" },
          renderServerUrl(),
          `${path.replace(/{([a-z0-9-_]+)}/gi, ":$1")}`
        )
    ),
    react_1.default.createElement("div", { className: "openapi__divider" })
  );
}
exports.default = MethodEndpoint;
