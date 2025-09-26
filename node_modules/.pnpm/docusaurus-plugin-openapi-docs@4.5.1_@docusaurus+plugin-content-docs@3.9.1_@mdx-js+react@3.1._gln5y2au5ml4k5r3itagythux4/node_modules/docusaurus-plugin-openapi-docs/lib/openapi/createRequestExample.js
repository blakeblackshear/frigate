"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleRequestFromSchema = void 0;
const createSchemaExample_1 = require("./createSchemaExample");
const sampleRequestFromSchema = (schema = {}) => {
    return (0, createSchemaExample_1.sampleFromSchema)(schema, { type: "request" });
};
exports.sampleRequestFromSchema = sampleRequestFromSchema;
