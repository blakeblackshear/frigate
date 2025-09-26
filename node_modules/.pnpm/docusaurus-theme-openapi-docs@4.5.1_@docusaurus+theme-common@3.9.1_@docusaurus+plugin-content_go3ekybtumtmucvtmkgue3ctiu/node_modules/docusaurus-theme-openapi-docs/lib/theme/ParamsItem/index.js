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
const Markdown_1 = __importDefault(require("@theme/Markdown"));
const SchemaTabs_1 = __importDefault(require("@theme/SchemaTabs"));
const TabItem_1 = __importDefault(require("@theme/TabItem"));
/* eslint-disable import/no-extraneous-dependencies*/
const clsx_1 = __importDefault(require("clsx"));
const schema_1 = require("../../markdown/schema");
const utils_1 = require("../../markdown/utils");
const getEnumDescriptionMarkdown = (enumDescriptions) => {
  if (enumDescriptions?.length) {
    return `| Enum Value | Description |
| ---- | ----- |
${enumDescriptions
  .map((desc) => {
    return `| ${desc[0]} | ${desc[1]} | `.replaceAll("\n", "<br/>");
  })
  .join("\n")}
    `;
  }
  return "";
};
function ParamsItem({ param, ...rest }) {
  const {
    description,
    example,
    examples,
    name,
    required,
    deprecated,
    enumDescriptions,
  } = param;
  let schema = param.schema;
  let defaultValue;
  if (!schema) {
    schema = { type: "any" };
  }
  if (!schema.type) {
    schema.type = "any";
  }
  if (schema) {
    if (schema.items) {
      defaultValue = schema.items.default;
    } else {
      defaultValue = schema.default;
    }
  }
  const renderSchemaName = (0, utils_1.guard)(schema, (schema) =>
    react_1.default.createElement(
      "span",
      { className: "openapi-schema__type" },
      " ",
      (0, schema_1.getSchemaName)(schema)
    )
  );
  const renderSchemaRequired = (0, utils_1.guard)(required, () =>
    react_1.default.createElement(
      "span",
      { className: "openapi-schema__required" },
      "required"
    )
  );
  const renderDeprecated = (0, utils_1.guard)(deprecated, () =>
    react_1.default.createElement(
      "span",
      { className: "openapi-schema__deprecated" },
      "deprecated"
    )
  );
  const renderQualifier = (0, utils_1.guard)(
    (0, schema_1.getQualifierMessage)(schema),
    (qualifier) =>
      react_1.default.createElement(Markdown_1.default, null, qualifier)
  );
  const renderDescription = (0, utils_1.guard)(description, (description) =>
    react_1.default.createElement(Markdown_1.default, null, description)
  );
  const renderEnumDescriptions = (0, utils_1.guard)(
    getEnumDescriptionMarkdown(enumDescriptions),
    (value) => {
      return react_1.default.createElement(
        "div",
        { style: { marginTop: ".5rem" } },
        react_1.default.createElement(Markdown_1.default, null, value)
      );
    }
  );
  function renderDefaultValue() {
    if (defaultValue !== undefined) {
      if (typeof defaultValue === "string") {
        return react_1.default.createElement(
          "div",
          null,
          react_1.default.createElement("strong", null, "Default value: "),
          react_1.default.createElement(
            "span",
            null,
            react_1.default.createElement("code", null, defaultValue)
          )
        );
      }
      return react_1.default.createElement(
        "div",
        null,
        react_1.default.createElement("strong", null, "Default value: "),
        react_1.default.createElement(
          "span",
          null,
          react_1.default.createElement(
            "code",
            null,
            JSON.stringify(defaultValue)
          )
        )
      );
    }
    return undefined;
  }
  const renderExample = (0, utils_1.guard)(
    (0, utils_1.toString)(example),
    (example) =>
      react_1.default.createElement(
        "div",
        null,
        react_1.default.createElement("strong", null, "Example: "),
        example
      )
  );
  const renderExamples = (0, utils_1.guard)(examples, (examples) => {
    const exampleEntries = Object.entries(examples);
    return react_1.default.createElement(
      react_1.default.Fragment,
      null,
      react_1.default.createElement("strong", null, "Examples:"),
      react_1.default.createElement(
        SchemaTabs_1.default,
        null,
        exampleEntries.map(([exampleName, exampleProperties]) =>
          // @ts-ignore
          react_1.default.createElement(
            TabItem_1.default,
            { value: exampleName, label: exampleName },
            exampleProperties.summary &&
              react_1.default.createElement(
                "p",
                null,
                exampleProperties.summary
              ),
            exampleProperties.description &&
              react_1.default.createElement(
                "p",
                null,
                react_1.default.createElement("strong", null, "Description: "),
                react_1.default.createElement(
                  "span",
                  null,
                  exampleProperties.description
                )
              ),
            react_1.default.createElement(
              "p",
              null,
              react_1.default.createElement("strong", null, "Example: "),
              react_1.default.createElement(
                "code",
                null,
                exampleProperties.value
              )
            )
          )
        )
      )
    );
  });
  return react_1.default.createElement(
    "div",
    { className: "openapi-params__list-item" },
    react_1.default.createElement(
      "span",
      { className: "openapi-schema__container" },
      react_1.default.createElement(
        "strong",
        {
          className: (0, clsx_1.default)("openapi-schema__property", {
            "openapi-schema__strikethrough": deprecated,
          }),
        },
        name
      ),
      renderSchemaName,
      (required || deprecated) &&
        react_1.default.createElement("span", {
          className: "openapi-schema__divider",
        }),
      renderSchemaRequired,
      renderDeprecated
    ),
    renderQualifier,
    renderDescription,
    renderEnumDescriptions,
    renderDefaultValue(),
    renderExample,
    renderExamples
  );
}
exports.default = ParamsItem;
