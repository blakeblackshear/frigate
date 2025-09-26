/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import type { DocFrontMatter as DocusaurusDocFrontMatter } from "@docusaurus/plugin-content-docs";
import type { JSONSchema4, JSONSchema6, JSONSchema7 } from "json-schema";

export interface ThemeConfig {
  api?: {
    proxy?: string;
    authPersistance?: false | "localStorage" | "sessionStorage";
  };
}

export type JSONSchema = JSONSchema4 | JSONSchema6 | JSONSchema7;
export type SchemaObject = Omit<
  JSONSchema,
  | "type"
  | "allOf"
  | "oneOf"
  | "anyOf"
  | "not"
  | "items"
  | "properties"
  | "additionalProperties"
> & {
  // OpenAPI specific overrides
  type?: "string" | "number" | "integer" | "boolean" | "object" | "array";
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  not?: SchemaObject;
  items?: SchemaObject;
  properties?: Record<string, SchemaObject>;
  additionalProperties?: boolean | SchemaObject;

  // OpenAPI additions
  nullable?: boolean;
  discriminator?: DiscriminatorObject;
  readOnly?: boolean;
  writeOnly?: boolean;
  xml?: XMLObject;
  externalDocs?: ExternalDocumentationObject;
  example?: any;
  deprecated?: boolean;
};

export interface DiscriminatorObject {
  propertyName: string;
  mapping?: Record<string, string>;
}

export interface XMLObject {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}

export interface ExternalDocumentationObject {
  description?: string;
  url: string;
}

export interface DocFrontMatter extends DocusaurusDocFrontMatter {
  /** Provides OpenAPI Docs with a reference path to their respective Info Doc */
  info_path?: string;
}
