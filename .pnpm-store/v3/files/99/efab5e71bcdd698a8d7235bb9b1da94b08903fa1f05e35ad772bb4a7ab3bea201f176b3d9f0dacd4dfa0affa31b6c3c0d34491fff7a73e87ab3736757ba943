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
const Details_1 = __importDefault(require("@theme/Details"));
const Markdown_1 = __importDefault(require("@theme/Markdown"));
const MimeTabs_1 = __importDefault(require("@theme/MimeTabs")); // Assume these components exist
const Schema_1 = __importDefault(require("@theme/Schema"));
const SkeletonLoader_1 = __importDefault(require("@theme/SkeletonLoader"));
const TabItem_1 = __importDefault(require("@theme/TabItem"));
const RequestSchemaComponent = ({ title, body, style }) => {
  if (
    body === undefined ||
    body.content === undefined ||
    Object.keys(body).length === 0 ||
    Object.keys(body.content).length === 0
  ) {
    return null;
  }
  const mimeTypes = Object.keys(body.content);
  if (mimeTypes.length > 1) {
    return react_1.default.createElement(
      MimeTabs_1.default,
      { className: "openapi-tabs__mime", schemaType: "request" },
      mimeTypes.map((mimeType) => {
        const firstBody = body.content[mimeType].schema;
        if (
          firstBody === undefined ||
          (firstBody.properties &&
            Object.keys(firstBody.properties).length === 0)
        ) {
          return null;
        }
        return (
          // @ts-ignore
          react_1.default.createElement(
            TabItem_1.default,
            { key: mimeType, label: mimeType, value: mimeType },
            react_1.default.createElement(
              Details_1.default,
              {
                className: "openapi-markdown__details mime",
                "data-collapsed": false,
                open: true,
                style: style,
                summary: react_1.default.createElement(
                  react_1.default.Fragment,
                  null,
                  react_1.default.createElement(
                    "summary",
                    null,
                    react_1.default.createElement(
                      "h3",
                      {
                        className:
                          "openapi-markdown__details-summary-header-body",
                      },
                      title,
                      body.required === true &&
                        react_1.default.createElement(
                          "span",
                          { className: "openapi-schema__required" },
                          "required"
                        )
                    )
                  )
                ),
              },
              react_1.default.createElement(
                "div",
                { style: { textAlign: "left", marginLeft: "1rem" } },
                body.description &&
                  react_1.default.createElement(
                    "div",
                    { style: { marginTop: "1rem", marginBottom: "1rem" } },
                    react_1.default.createElement(
                      Markdown_1.default,
                      null,
                      body.description
                    )
                  )
              ),
              react_1.default.createElement(
                "ul",
                { style: { marginLeft: "1rem" } },
                react_1.default.createElement(Schema_1.default, {
                  schema: firstBody,
                  schemaType: "request",
                })
              )
            )
          )
        );
      })
    );
  }
  const randomFirstKey = mimeTypes[0];
  const firstBody =
    body.content[randomFirstKey].schema ?? body.content[randomFirstKey];
  if (firstBody === undefined) {
    return null;
  }
  return react_1.default.createElement(
    MimeTabs_1.default,
    { className: "openapi-tabs__mime", schemaType: "request" },
    react_1.default.createElement(
      TabItem_1.default,
      { label: randomFirstKey, value: `${randomFirstKey}-schema` },
      react_1.default.createElement(
        Details_1.default,
        {
          className: "openapi-markdown__details mime",
          "data-collapsed": false,
          open: true,
          style: style,
          summary: react_1.default.createElement(
            react_1.default.Fragment,
            null,
            react_1.default.createElement(
              "summary",
              null,
              react_1.default.createElement(
                "h3",
                { className: "openapi-markdown__details-summary-header-body" },
                title,
                firstBody.type === "array" &&
                  react_1.default.createElement(
                    "span",
                    { style: { opacity: "0.6" } },
                    " array"
                  ),
                body.required &&
                  react_1.default.createElement(
                    "strong",
                    { className: "openapi-schema__required" },
                    "required"
                  )
              )
            )
          ),
        },
        react_1.default.createElement(
          "div",
          { style: { textAlign: "left", marginLeft: "1rem" } },
          body.description &&
            react_1.default.createElement(
              "div",
              { style: { marginTop: "1rem", marginBottom: "1rem" } },
              react_1.default.createElement(
                Markdown_1.default,
                null,
                body.description
              )
            )
        ),
        react_1.default.createElement(
          "ul",
          { style: { marginLeft: "1rem" } },
          react_1.default.createElement(Schema_1.default, {
            schema: firstBody,
            schemaType: "request",
          })
        )
      )
    )
  );
};
const RequestSchema = (props) => {
  return react_1.default.createElement(
    BrowserOnly_1.default,
    {
      fallback: react_1.default.createElement(SkeletonLoader_1.default, {
        size: "sm",
      }),
    },
    () => {
      return react_1.default.createElement(RequestSchemaComponent, {
        ...props,
      });
    }
  );
};
exports.default = RequestSchema;
