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
const json2xml_1 = __importDefault(require("@theme/ApiExplorer/Body/json2xml"));
const FormFileUpload_1 = __importDefault(
  require("@theme/ApiExplorer/FormFileUpload")
);
const FormItem_1 = __importDefault(require("@theme/ApiExplorer/FormItem"));
const FormSelect_1 = __importDefault(require("@theme/ApiExplorer/FormSelect"));
const FormTextInput_1 = __importDefault(
  require("@theme/ApiExplorer/FormTextInput")
);
const LiveEditor_1 = __importDefault(require("@theme/ApiExplorer/LiveEditor"));
const hooks_1 = require("@theme/ApiItem/hooks");
const Markdown_1 = __importDefault(require("@theme/Markdown"));
const SchemaTabs_1 = __importDefault(require("@theme/SchemaTabs"));
const TabItem_1 = __importDefault(require("@theme/TabItem"));
const xml_formatter_1 = __importDefault(require("xml-formatter"));
const slice_1 = require("./slice");
function BodyWrap({
  requestBodyMetadata,
  jsonRequestBodyExample,
  methods,
  required,
}) {
  const contentType = (0, hooks_1.useTypedSelector)(
    (state) => state.contentType.value
  );
  // NOTE: We used to check if body was required, but opted to always show the request body
  // to reduce confusion, see: https://github.com/cloud-annotations/docusaurus-openapi/issues/145
  // No body
  if (contentType === undefined) {
    return null;
  }
  return react_1.default.createElement(Body, {
    requestBodyMetadata: requestBodyMetadata,
    jsonRequestBodyExample: jsonRequestBodyExample,
    required: required,
  });
}
function Body({
  requestBodyMetadata,
  jsonRequestBodyExample,
  methods,
  required,
}) {
  const contentType = (0, hooks_1.useTypedSelector)(
    (state) => state.contentType.value
  );
  const dispatch = (0, hooks_1.useTypedDispatch)();
  // Lot's of possible content-types:
  // - application/json
  // - application/xml
  // - text/plain
  // - text/css
  // - text/html
  // - text/javascript
  // - application/javascript
  // - multipart/form-data
  // - application/x-www-form-urlencoded
  // - image/svg+xml;charset=US-ASCII
  // Show editor:
  // - application/json
  // - application/xml
  // - */*
  // Show form:
  // - multipart/form-data
  // - application/x-www-form-urlencoded
  const schema = requestBodyMetadata?.content?.[contentType]?.schema;
  const example = requestBodyMetadata?.content?.[contentType]?.example;
  const examples = requestBodyMetadata?.content?.[contentType]?.examples;
  if (schema?.format === "binary") {
    return react_1.default.createElement(
      FormItem_1.default,
      null,
      react_1.default.createElement(FormFileUpload_1.default, {
        placeholder: schema.description || "Body",
        onChange: (file) => {
          if (file === undefined) {
            dispatch((0, slice_1.clearRawBody)());
            return;
          }
          dispatch(
            (0, slice_1.setFileRawBody)({
              src: `/path/to/${file.name}`,
              content: file,
            })
          );
        },
      })
    );
  }
  if (
    (contentType === "multipart/form-data" ||
      contentType === "application/x-www-form-urlencoded") &&
    schema?.type === "object"
  ) {
    return react_1.default.createElement(
      FormItem_1.default,
      { className: "openapi-explorer__form-item-body-container" },
      react_1.default.createElement(
        "div",
        null,
        Object.entries(schema.properties ?? {}).map(([key, val]) => {
          if (val.format === "binary") {
            return react_1.default.createElement(
              FormItem_1.default,
              {
                key: key,
                label: key,
                required:
                  Array.isArray(schema.required) &&
                  schema.required.includes(key),
              },
              react_1.default.createElement(FormFileUpload_1.default, {
                placeholder: val.description || key,
                onChange: (file) => {
                  if (file === undefined) {
                    dispatch((0, slice_1.clearFormBodyKey)(key));
                    return;
                  }
                  dispatch(
                    (0, slice_1.setFileFormBody)({
                      key: key,
                      value: {
                        src: `/path/to/${file.name}`,
                        content: file,
                      },
                    })
                  );
                },
              })
            );
          }
          if (val.enum) {
            return react_1.default.createElement(
              FormItem_1.default,
              {
                key: key,
                label: key,
                required:
                  Array.isArray(schema.required) &&
                  schema.required.includes(key),
              },
              react_1.default.createElement(FormSelect_1.default, {
                options: ["---", ...val.enum],
                onChange: (e) => {
                  const val = e.target.value;
                  if (val === "---") {
                    dispatch((0, slice_1.clearFormBodyKey)(key));
                  } else {
                    dispatch(
                      (0, slice_1.setStringFormBody)({
                        key: key,
                        value: val,
                      })
                    );
                  }
                },
              })
            );
          }
          // TODO: support all the other types.
          return react_1.default.createElement(
            FormItem_1.default,
            {
              key: key,
              label: key,
              required:
                Array.isArray(schema.required) && schema.required.includes(key),
            },
            react_1.default.createElement(FormTextInput_1.default, {
              paramName: key,
              isRequired:
                Array.isArray(schema.required) && schema.required.includes(key),
              placeholder: val.description || key,
              onChange: (e) => {
                dispatch(
                  (0, slice_1.setStringFormBody)({
                    key: key,
                    value: e.target.value,
                  })
                );
              },
            })
          );
        })
      )
    );
  }
  let language = "plaintext";
  let defaultBody = ""; //"body content";
  let exampleBody;
  let examplesBodies = [];
  if (
    contentType.includes("application/json") ||
    contentType.endsWith("+json")
  ) {
    if (jsonRequestBodyExample) {
      defaultBody = JSON.stringify(jsonRequestBodyExample, null, 2);
    }
    if (example) {
      exampleBody = JSON.stringify(example, null, 2);
    }
    if (examples) {
      for (const [key, example] of Object.entries(examples)) {
        let body = example.value;
        try {
          // If the value is already valid JSON we shouldn't double encode the value
          JSON.parse(example.value);
        } catch (e) {
          body = JSON.stringify(example.value, null, 2);
        }
        examplesBodies.push({
          label: key,
          body,
          summary: example.summary,
        });
      }
    }
    language = "json";
  }
  if (contentType === "application/xml" || contentType.endsWith("+xml")) {
    if (jsonRequestBodyExample) {
      try {
        defaultBody = (0, xml_formatter_1.default)(
          (0, json2xml_1.default)(jsonRequestBodyExample, ""),
          {
            indentation: "  ",
            lineSeparator: "\n",
            collapseContent: true,
          }
        );
      } catch {
        defaultBody = (0, json2xml_1.default)(jsonRequestBodyExample);
      }
    }
    if (example) {
      try {
        exampleBody = (0, xml_formatter_1.default)(
          (0, json2xml_1.default)(example, ""),
          {
            indentation: "  ",
            lineSeparator: "\n",
            collapseContent: true,
          }
        );
      } catch {
        exampleBody = (0, json2xml_1.default)(example);
      }
    }
    if (examples) {
      for (const [key, example] of Object.entries(examples)) {
        let formattedXmlBody;
        try {
          formattedXmlBody = (0, xml_formatter_1.default)(example.value, {
            indentation: "  ",
            lineSeparator: "\n",
            collapseContent: true,
          });
        } catch {
          formattedXmlBody = example.value;
        }
        examplesBodies.push({
          label: key,
          body: formattedXmlBody,
          summary: example.summary,
        });
      }
    }
    language = "xml";
  }
  if (exampleBody) {
    return react_1.default.createElement(
      FormItem_1.default,
      null,
      react_1.default.createElement(
        SchemaTabs_1.default,
        { className: "openapi-tabs__schema", lazy: true },
        react_1.default.createElement(
          TabItem_1.default,
          {
            label: "Example (from schema)",
            value: "Example (from schema)",
            default: true,
          },
          react_1.default.createElement(
            LiveEditor_1.default,
            { action: dispatch, language: language, required: required },
            defaultBody
          )
        ),
        react_1.default.createElement(
          TabItem_1.default,
          { label: "Example", value: "example" },
          example.summary &&
            react_1.default.createElement(
              Markdown_1.default,
              null,
              example.summary
            ),
          exampleBody &&
            react_1.default.createElement(
              LiveEditor_1.default,
              { action: dispatch, language: language, required: required },
              exampleBody
            )
        )
      )
    );
  }
  if (examplesBodies && examplesBodies.length > 0) {
    return react_1.default.createElement(
      FormItem_1.default,
      { className: "openapi-explorer__form-item-body-container" },
      react_1.default.createElement(
        SchemaTabs_1.default,
        { className: "openapi-tabs__schema", lazy: true },
        react_1.default.createElement(
          TabItem_1.default,
          {
            label: "Example (from schema)",
            value: "Example (from schema)",
            default: true,
          },
          react_1.default.createElement(
            LiveEditor_1.default,
            { action: dispatch, language: language, required: required },
            defaultBody
          )
        ),
        examplesBodies.map((example) => {
          return (
            // @ts-ignore
            react_1.default.createElement(
              TabItem_1.default,
              {
                label: example.label,
                value: example.label,
                key: example.label,
              },
              example.summary &&
                react_1.default.createElement(
                  Markdown_1.default,
                  null,
                  example.summary
                ),
              example.body &&
                react_1.default.createElement(
                  LiveEditor_1.default,
                  { action: dispatch, language: language },
                  example.body
                )
            )
          );
        })
      )
    );
  }
  return react_1.default.createElement(
    FormItem_1.default,
    null,
    react_1.default.createElement(
      LiveEditor_1.default,
      { action: dispatch, language: language, required: required },
      defaultBody
    )
  );
}
exports.default = BodyWrap;
