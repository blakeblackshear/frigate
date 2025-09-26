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
exports.ResponseHeaders = void 0;
const react_1 = __importDefault(require("react"));
const SchemaItem_1 = __importDefault(require("@theme/SchemaItem"));
const schema_1 = require("../../markdown/schema");
const ResponseHeaders = ({ responseHeaders }) => {
  if (!responseHeaders) {
    return null;
  }
  return react_1.default.createElement(
    "ul",
    { style: { marginLeft: "1rem" } },
    Object.entries(responseHeaders).map(([name, schema]) => {
      return react_1.default.createElement(SchemaItem_1.default, {
        name: name,
        collapsible: false,
        schemaName: (0, schema_1.getSchemaName)(schema),
        qualifierMessage: (0, schema_1.getQualifierMessage)(schema),
        schema: schema,
        discriminator: false,
        children: null,
      });
    })
  );
};
exports.ResponseHeaders = ResponseHeaders;
exports.default = exports.ResponseHeaders;
