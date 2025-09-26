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
exports.ExampleFromSchema =
  exports.ResponseExample =
  exports.ResponseExamples =
    void 0;
exports.json2xml = json2xml;
const react_1 = __importDefault(require("react"));
const CodeSamples_1 = __importDefault(require("@theme/CodeSamples"));
const Markdown_1 = __importDefault(require("@theme/Markdown"));
const TabItem_1 = __importDefault(require("@theme/TabItem"));
const createResponseExample_1 = require("docusaurus-plugin-openapi-docs/lib/openapi/createResponseExample");
const xml_formatter_1 = __importDefault(require("xml-formatter"));
function json2xml(o, tab) {
  const toXml = (v, name, ind) => {
    let xml = "";
    if (v instanceof Array) {
      for (let i = 0, n = v.length; i < n; i++) {
        xml += ind + toXml(v[i], name, ind + "\t") + "\n";
      }
    } else if (typeof v === "object") {
      let hasChild = false;
      xml += ind + "<" + name;
      for (const m in v) {
        if (m.charAt(0) === "@") {
          xml += " " + m.substr(1) + '="' + v[m].toString() + '"';
        } else {
          hasChild = true;
        }
      }
      xml += hasChild ? ">" : "/>";
      if (hasChild) {
        for (const m2 in v) {
          if (m2 === "#text") xml += v[m2];
          else if (m2 === "#cdata") xml += "<![CDATA[" + v[m2] + "]]>";
          else if (m2.charAt(0) !== "@") xml += toXml(v[m2], m2, ind + "\t");
        }
        xml +=
          (xml.charAt(xml.length - 1) === "\n" ? ind : "") + "</" + name + ">";
      }
    } else {
      xml += ind + "<" + name + ">" + v.toString() + "</" + name + ">";
    }
    return xml;
  };
  let xml = "";
  for (const m3 in o) xml += toXml(o[m3], m3, "");
  return tab ? xml.replace(/\t/g, tab) : xml.replace(/\t|\n/g, "");
}
const ResponseExamples = ({ responseExamples, mimeType }) => {
  let language = "shell";
  if (mimeType.endsWith("json")) language = "json";
  if (mimeType.endsWith("xml")) language = "xml";
  // Map response examples to an array of TabItem elements
  const examplesArray = Object.entries(responseExamples).map(
    ([exampleName, exampleValue]) => {
      const isObject = typeof exampleValue.value === "object";
      const responseExample = isObject
        ? JSON.stringify(exampleValue.value, null, 2)
        : exampleValue.value;
      return (
        // @ts-ignore
        react_1.default.createElement(
          TabItem_1.default,
          { label: exampleName, value: exampleName, key: exampleName },
          exampleValue.summary &&
            react_1.default.createElement(
              Markdown_1.default,
              { className: "openapi-example__summary" },
              exampleValue.summary
            ),
          react_1.default.createElement(CodeSamples_1.default, {
            example: responseExample,
            language: language,
          })
        )
      );
    }
  );
  return examplesArray;
};
exports.ResponseExamples = ResponseExamples;
const ResponseExample = ({ responseExample, mimeType }) => {
  let language = "shell";
  if (mimeType.endsWith("json")) {
    language = "json";
  }
  if (mimeType.endsWith("xml")) {
    language = "xml";
  }
  const isObject = typeof responseExample === "object";
  const exampleContent = isObject
    ? JSON.stringify(responseExample, null, 2)
    : responseExample;
  return (
    // @ts-ignore
    react_1.default.createElement(
      TabItem_1.default,
      { label: "Example", value: "Example" },
      responseExample.summary &&
        react_1.default.createElement(
          Markdown_1.default,
          { className: "openapi-example__summary" },
          responseExample.summary
        ),
      react_1.default.createElement(CodeSamples_1.default, {
        example: exampleContent,
        language: language,
      })
    )
  );
};
exports.ResponseExample = ResponseExample;
const ExampleFromSchema = ({ schema, mimeType }) => {
  const responseExample = (0, createResponseExample_1.sampleResponseFromSchema)(
    schema
  );
  if (mimeType.endsWith("xml")) {
    let responseExampleObject;
    try {
      responseExampleObject = JSON.parse(JSON.stringify(responseExample));
    } catch {
      return null;
    }
    if (typeof responseExampleObject === "object") {
      let xmlExample;
      try {
        xmlExample = (0, xml_formatter_1.default)(
          json2xml(responseExampleObject, ""),
          {
            indentation: "  ",
            lineSeparator: "\n",
            collapseContent: true,
          }
        );
      } catch {
        const xmlExampleWithRoot = { root: responseExampleObject };
        try {
          xmlExample = (0, xml_formatter_1.default)(
            json2xml(xmlExampleWithRoot, ""),
            {
              indentation: "  ",
              lineSeparator: "\n",
              collapseContent: true,
            }
          );
        } catch {
          xmlExample = json2xml(responseExampleObject, "");
        }
      }
      return (
        // @ts-ignore
        react_1.default.createElement(
          TabItem_1.default,
          { label: "Example (auto)", value: "Example (auto)" },
          react_1.default.createElement(CodeSamples_1.default, {
            example: xmlExample,
            language: "xml",
          })
        )
      );
    }
  }
  if (
    typeof responseExample === "object" ||
    typeof responseExample === "string"
  ) {
    return (
      // @ts-ignore
      react_1.default.createElement(
        TabItem_1.default,
        { label: "Example (auto)", value: "Example (auto)" },
        react_1.default.createElement(CodeSamples_1.default, {
          example: JSON.stringify(responseExample, null, 2),
          language: "json",
        })
      )
    );
  }
  return null;
};
exports.ExampleFromSchema = ExampleFromSchema;
