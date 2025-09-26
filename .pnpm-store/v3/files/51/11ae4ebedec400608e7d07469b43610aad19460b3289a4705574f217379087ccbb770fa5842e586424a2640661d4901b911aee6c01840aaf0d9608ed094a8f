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
const ResponseExamples_1 = require("@theme/ResponseExamples");
const Schema_1 = __importDefault(require("@theme/Schema"));
const SchemaTabs_1 = __importDefault(require("@theme/SchemaTabs"));
const SkeletonLoader_1 = __importDefault(require("@theme/SkeletonLoader"));
const TabItem_1 = __importDefault(require("@theme/TabItem"));
const ResponseSchemaComponent = ({ title, body, style }) => {
  if (
    body === undefined ||
    body.content === undefined ||
    Object.keys(body).length === 0 ||
    Object.keys(body.content).length === 0
  ) {
    return null;
  }
  // Get all MIME types, including vendor-specific
  const mimeTypes = Object.keys(body.content);
  if (mimeTypes && mimeTypes.length) {
    return react_1.default.createElement(
      MimeTabs_1.default,
      { className: "openapi-tabs__mime", schemaType: "response" },
      mimeTypes.map((mimeType) => {
        const responseExamples = body.content[mimeType].examples;
        const responseExample = body.content[mimeType].example;
        const firstBody =
          body.content[mimeType].schema ?? body.content[mimeType];
        if (
          firstBody === undefined &&
          responseExample === undefined &&
          responseExamples === undefined
        ) {
          return undefined;
        }
        if (firstBody) {
          return (
            // @ts-ignore
            react_1.default.createElement(
              TabItem_1.default,
              { key: mimeType, label: mimeType, value: mimeType },
              react_1.default.createElement(
                SchemaTabs_1.default,
                { className: "openapi-tabs__schema" },
                react_1.default.createElement(
                  TabItem_1.default,
                  { key: title, label: title, value: title },
                  react_1.default.createElement(
                    Details_1.default,
                    {
                      className: "openapi-markdown__details response",
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
                            "strong",
                            {
                              className:
                                "openapi-markdown__details-summary-response",
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
                          {
                            style: { marginTop: "1rem", marginBottom: "1rem" },
                          },
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
                        schemaType: "response",
                      })
                    )
                  )
                ),
                firstBody &&
                  (0, ResponseExamples_1.ExampleFromSchema)({
                    schema: firstBody,
                    mimeType: mimeType,
                  }),
                responseExamples &&
                  (0, ResponseExamples_1.ResponseExamples)({
                    responseExamples,
                    mimeType,
                  }),
                responseExample &&
                  (0, ResponseExamples_1.ResponseExample)({
                    responseExample,
                    mimeType,
                  })
              )
            )
          );
        }
        return undefined;
      })
    );
  }
  return undefined;
};
const ResponseSchema = (props) => {
  return react_1.default.createElement(
    BrowserOnly_1.default,
    {
      fallback: react_1.default.createElement(SkeletonLoader_1.default, {
        size: "md",
      }),
    },
    () => {
      return react_1.default.createElement(ResponseSchemaComponent, {
        ...props,
      });
    }
  );
};
exports.default = ResponseSchema;
