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
const Link_1 = __importDefault(require("@docusaurus/Link"));
const hooks_1 = require("@theme/ApiItem/hooks");
function SecuritySchemes(props) {
  const options = (0, hooks_1.useTypedSelector)((state) => state.auth.options);
  const selected = (0, hooks_1.useTypedSelector)(
    (state) => state.auth.selected
  );
  const infoAuthPath = `/${props.infoPath}#authentication`;
  if (selected === undefined) return null;
  if (options[selected]?.[0]?.type === undefined) {
    return null;
  }
  const selectedAuth = options[selected];
  return react_1.default.createElement(
    "details",
    { className: "openapi-security__details", open: false },
    react_1.default.createElement(
      "summary",
      { className: "openapi-security__summary-container" },
      react_1.default.createElement(
        "h4",
        { className: "openapi-security__summary-header" },
        "Authorization: ",
        selectedAuth[0].name ?? selectedAuth[0].type
      )
    ),
    selectedAuth.map((auth) => {
      const isHttp = auth.type === "http";
      const isApiKey = auth.type === "apiKey";
      const isOauth2 = auth.type === "oauth2";
      const isOpenId = auth.type === "openIdConnect";
      if (isHttp) {
        if (auth.scheme === "bearer") {
          const { name, key, type, scopes, ...rest } = auth;
          return react_1.default.createElement(
            react_1.default.Fragment,
            { key: auth.key },
            react_1.default.createElement(
              "pre",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--openapi-card-background-color)",
                },
              },
              react_1.default.createElement(
                "span",
                null,
                react_1.default.createElement("strong", null, "name:"),
                " ",
                react_1.default.createElement(
                  Link_1.default,
                  { to: infoAuthPath },
                  name ?? key
                )
              ),
              react_1.default.createElement(
                "span",
                null,
                react_1.default.createElement("strong", null, "type: "),
                type
              ),
              scopes &&
                scopes.length > 0 &&
                react_1.default.createElement(
                  "span",
                  null,
                  react_1.default.createElement("strong", null, "scopes: "),
                  react_1.default.createElement(
                    "code",
                    null,
                    auth.scopes.length > 0 ? auth.scopes.toString() : "[]"
                  )
                ),
              Object.keys(rest).map((k, i) => {
                return react_1.default.createElement(
                  "span",
                  { key: k },
                  react_1.default.createElement("strong", null, k, ": "),
                  typeof rest[k] === "object"
                    ? JSON.stringify(rest[k], null, 2)
                    : String(rest[k])
                );
              })
            )
          );
        }
        if (auth.scheme === "basic") {
          const { name, key, type, scopes, ...rest } = auth;
          return react_1.default.createElement(
            react_1.default.Fragment,
            { key: auth.key },
            react_1.default.createElement(
              "pre",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--openapi-card-background-color)",
                },
              },
              react_1.default.createElement(
                "span",
                null,
                react_1.default.createElement("strong", null, "name:"),
                " ",
                react_1.default.createElement(
                  Link_1.default,
                  { to: infoAuthPath },
                  name ?? key
                )
              ),
              react_1.default.createElement(
                "span",
                null,
                react_1.default.createElement("strong", null, "type: "),
                type
              ),
              scopes &&
                scopes.length > 0 &&
                react_1.default.createElement(
                  "span",
                  null,
                  react_1.default.createElement("strong", null, "scopes: "),
                  react_1.default.createElement(
                    "code",
                    null,
                    auth.scopes.length > 0 ? auth.scopes.toString() : "[]"
                  )
                ),
              Object.keys(rest).map((k, i) => {
                return react_1.default.createElement(
                  "span",
                  { key: k },
                  react_1.default.createElement("strong", null, k, ": "),
                  typeof rest[k] === "object"
                    ? JSON.stringify(rest[k], null, 2)
                    : String(rest[k])
                );
              })
            )
          );
        }
        return react_1.default.createElement(
          react_1.default.Fragment,
          { key: auth.key },
          react_1.default.createElement(
            "pre",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                background: "var(--openapi-card-background-color)",
              },
            },
            react_1.default.createElement(
              "span",
              null,
              react_1.default.createElement("strong", null, "name:"),
              " ",
              react_1.default.createElement(
                Link_1.default,
                { to: infoAuthPath },
                auth.name ?? auth.key
              )
            ),
            react_1.default.createElement(
              "span",
              null,
              react_1.default.createElement("strong", null, "type: "),
              auth.type
            ),
            react_1.default.createElement(
              "span",
              null,
              react_1.default.createElement("strong", null, "in: "),
              auth.in
            )
          )
        );
      }
      if (isApiKey) {
        const { name, key, type, scopes, ...rest } = auth;
        return react_1.default.createElement(
          react_1.default.Fragment,
          { key: auth.key },
          react_1.default.createElement(
            "pre",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                background: "var(--openapi-card-background-color)",
              },
            },
            react_1.default.createElement(
              "span",
              null,
              react_1.default.createElement("strong", null, "name:"),
              " ",
              react_1.default.createElement(
                Link_1.default,
                { to: infoAuthPath },
                name ?? key
              )
            ),
            react_1.default.createElement(
              "span",
              null,
              react_1.default.createElement("strong", null, "type: "),
              type
            ),
            scopes &&
              scopes.length > 0 &&
              react_1.default.createElement(
                "span",
                null,
                react_1.default.createElement("strong", null, "scopes: "),
                react_1.default.createElement(
                  "code",
                  null,
                  auth.scopes.length > 0 ? auth.scopes.toString() : "[]"
                )
              ),
            Object.keys(rest).map((k, i) => {
              return react_1.default.createElement(
                "span",
                { key: k },
                react_1.default.createElement("strong", null, k, ": "),
                typeof rest[k] === "object"
                  ? JSON.stringify(rest[k], null, 2)
                  : String(rest[k])
              );
            })
          )
        );
      }
      if (isOauth2) {
        const { name, key, type, scopes, flows, ...rest } = auth;
        return react_1.default.createElement(
          react_1.default.Fragment,
          { key: selected },
          react_1.default.createElement(
            "pre",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                background: "var(--openapi-card-background-color)",
              },
            },
            react_1.default.createElement(
              "span",
              null,
              react_1.default.createElement("strong", null, "name:"),
              " ",
              react_1.default.createElement(
                Link_1.default,
                { to: infoAuthPath },
                name ?? key
              )
            ),
            react_1.default.createElement(
              "span",
              null,
              react_1.default.createElement("strong", null, "type: "),
              type
            ),
            scopes &&
              scopes.length > 0 &&
              react_1.default.createElement(
                "span",
                null,
                react_1.default.createElement("strong", null, "scopes: "),
                react_1.default.createElement(
                  "code",
                  null,
                  auth.scopes.length > 0 ? auth.scopes.toString() : "[]"
                )
              ),
            Object.keys(rest).map((k, i) => {
              return react_1.default.createElement(
                "span",
                { key: k },
                react_1.default.createElement("strong", null, k, ": "),
                typeof rest[k] === "object"
                  ? JSON.stringify(rest[k], null, 2)
                  : String(rest[k])
              );
            }),
            flows &&
              react_1.default.createElement(
                "span",
                null,
                react_1.default.createElement(
                  "code",
                  null,
                  react_1.default.createElement("strong", null, "flows: "),
                  JSON.stringify(flows, null, 2)
                )
              )
          )
        );
      }
      if (isOpenId) {
        const { name, key, scopes, type, ...rest } = auth;
        return react_1.default.createElement(
          react_1.default.Fragment,
          { key: auth.key },
          react_1.default.createElement(
            "pre",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                background: "var(--openapi-card-background-color)",
              },
            },
            react_1.default.createElement(
              "span",
              null,
              react_1.default.createElement("strong", null, "name:"),
              " ",
              react_1.default.createElement(
                Link_1.default,
                { to: infoAuthPath },
                name ?? key
              )
            ),
            react_1.default.createElement(
              "span",
              null,
              react_1.default.createElement("strong", null, "type: "),
              type
            ),
            scopes &&
              scopes.length > 0 &&
              react_1.default.createElement(
                "span",
                null,
                react_1.default.createElement("strong", null, "scopes: "),
                react_1.default.createElement(
                  "code",
                  null,
                  auth.scopes.length > 0 ? auth.scopes.toString() : "[]"
                )
              ),
            Object.keys(rest).map((k, i) => {
              return react_1.default.createElement(
                "span",
                { key: k },
                react_1.default.createElement("strong", null, k, ": "),
                typeof rest[k] === "object"
                  ? JSON.stringify(rest[k], null, 2)
                  : String(rest[k])
              );
            })
          )
        );
      }
      return undefined;
    })
  );
}
exports.default = SecuritySchemes;
