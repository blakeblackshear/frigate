/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import type {
  JSONSchema4,
  JSONSchema6,
  JSONSchema7,
  JSONSchema7TypeName,
} from "json-schema";

export interface OpenApiObject {
  openapi: string;
  info: InfoObject;
  servers?: ServerObject[];
  paths: PathsObject;
  components?: ComponentsObject;
  security?: SecurityRequirementObject[];
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
  swagger?: string;
  webhooks?: PathsObject;
  "x-webhooks"?: PathsObject;
  "x-tagGroups"?: TagGroupObject[];
}

export interface OpenApiObjectWithRef {
  openapi: string;
  info: InfoObject;
  servers?: ServerObject[];
  paths: PathsObjectWithRef;
  components?: ComponentsObjectWithRef;
  security?: SecurityRequirementObject[];
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
}

export interface InfoObject {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: ContactObject;
  license?: LicenseObject;
  version: string;
  tags?: TagObject[];
  "x-logo"?: LogoObject;
  "x-dark-logo"?: LogoObject;
  logo?: LogoObject;
  darkLogo?: LogoObject;
}

export interface LogoObject {
  url?: string;
}

export interface ContactObject {
  name?: string;
  url?: string;
  email?: string;
}

export interface LicenseObject {
  name: string;
  url?: string;
}

export interface ServerObject {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

export interface ServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface ComponentsObject {
  schemas?: Record<string, SchemaObject>;
  responses?: Record<string, ResponseObject>;
  parameters?: Record<string, ParameterObject>;
  examples?: Record<string, ExampleObject>;
  requestBodies?: Record<string, RequestBodyObject>;
  headers?: Record<string, HeaderObject>;
  securitySchemes?: Record<string, SecuritySchemeObject>;
  links?: Record<string, LinkObject>;
  callbacks?: Record<string, CallbackObject>;
}

export interface ComponentsObjectWithRef {
  schemas?: Record<string, SchemaObjectWithRef | ReferenceObject>;
  responses?: Record<string, ResponseObjectWithRef | ReferenceObject>;
  parameters?: Record<string, ParameterObjectWithRef | ReferenceObject>;
  examples?: Record<string, ExampleObject | ReferenceObject>;
  requestBodies?: Record<string, RequestBodyObjectWithRef | ReferenceObject>;
  headers?: Record<string, HeaderObjectWithRef | ReferenceObject>;
  securitySchemes?: Record<string, SecuritySchemeObject | ReferenceObject>;
  links?: Record<string, LinkObject | ReferenceObject>;
  callbacks?: Record<string, CallbackObjectWithRef | ReferenceObject>;
}

export type PathsObject = Record<string, PathItemObject>;

export type PathsObjectWithRef = Record<string, PathItemObjectWithRef>;

export interface PathItemObject {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: OperationObject;
  put?: OperationObject;
  post?: OperationObject;
  delete?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  patch?: OperationObject;
  trace?: OperationObject;
  servers?: ServerObject[];
  parameters?: ParameterObject[];
}

export interface PathItemObjectWithRef {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: OperationObjectWithRef;
  put?: OperationObjectWithRef;
  post?: OperationObjectWithRef;
  delete?: OperationObjectWithRef;
  options?: OperationObjectWithRef;
  head?: OperationObjectWithRef;
  patch?: OperationObjectWithRef;
  trace?: OperationObjectWithRef;
  servers?: ServerObject[];
  parameters?: (ParameterObjectWithRef | ReferenceObject)[];
}

export interface OperationObject {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  operationId?: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: ResponsesObject;
  callbacks?: Record<string, CallbackObject>;
  deprecated?: boolean;
  security?: SecurityRequirementObject[];
  servers?: ServerObject[];
  // extensions
  "x-position"?: number;
  "x-deprecated-description"?: string;
}

export interface OperationObjectWithRef {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  operationId?: string;
  parameters?: (ParameterObjectWithRef | ReferenceObject)[];
  requestBody?: RequestBodyObjectWithRef | ReferenceObject;
  responses: ResponsesObjectWithRef;
  callbacks?: Record<string, CallbackObjectWithRef | ReferenceObject>;
  deprecated?: boolean;
  security?: SecurityRequirementObject[];
  servers?: ServerObject[];

  // extensions
  "x-deprecated-description"?: string;
}

export interface ExternalDocumentationObject {
  description?: string;
  url: string;
}

export interface ParameterObject {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  //
  style?: string;
  explode?: string;
  allowReserved?: boolean;
  schema?: SchemaObject;
  example?: any;
  examples?: Record<string, ExampleObject>;
  //
  content?: Record<string, MediaTypeObject>;
  param?: Object;
  // ignoring stylings: matrix, label, form, simple, spaceDelimited,
  // pipeDelimited and deepObject
  "x-enumDescriptions"?: Record<string, string>;
}

export interface ParameterObjectWithRef {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  //
  style?: string;
  explode?: string;
  allowReserved?: boolean;
  schema?: SchemaObjectWithRef | ReferenceObject;
  example?: any;
  examples?: Record<string, ExampleObject | ReferenceObject>;
  //
  content?: Record<string, MediaTypeObjectWithRef>;
  // ignoring stylings: matrix, label, form, simple, spaceDelimited,
  // pipeDelimited and deepObject
}

export interface RequestBodyObject {
  description?: string;
  content: Record<string, MediaTypeObject>;
  required?: boolean;
}

export interface RequestBodyObjectWithRef {
  description?: string;
  content: Record<string, MediaTypeObjectWithRef>;
  required?: boolean;
}

export interface MediaTypeObject {
  schema?: SchemaObject;
  example?: any;
  examples?: Record<string, ExampleObject>;
  encoding?: Record<string, EncodingObject>;
  type?: any;
}

export interface MediaTypeObjectWithRef {
  schema?: SchemaObjectWithRef | ReferenceObject;
  example?: any;
  examples?: Record<string, ExampleObject | ReferenceObject>;
  encoding?: Record<string, EncodingObjectWithRef>;
}

export interface EncodingObject {
  contentType?: string;
  headers?: Record<string, HeaderObject>;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export interface EncodingObjectWithRef {
  contentType?: string;
  headers?: Record<string, HeaderObjectWithRef | ReferenceObject>;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export type ResponsesObject = Record<string, ResponseObject>;

export type ResponsesObjectWithRef = Record<
  string,
  ResponseObjectWithRef | ReferenceObject
>;

export interface ResponseObject {
  description: string;
  headers?: Record<string, HeaderObject>;
  content?: Record<string, MediaTypeObject>;
  links?: Record<string, LinkObject>;
}

export interface ResponseObjectWithRef {
  description: string;
  headers?: Record<string, HeaderObjectWithRef | ReferenceObject>;
  content?: Record<string, MediaTypeObjectWithRef>;
  links?: Record<string, LinkObject | ReferenceObject>;
}

export type CallbackObject = Record<string, PathItemObject>;

export type CallbackObjectWithRef = Record<string, PathItemObjectWithRef>;

export interface ExampleObject {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
}

export interface LinkObject {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, any>;
  requestBody?: any;
  description?: string;
  server?: ServerObject;
}

export type HeaderObject = Omit<ParameterObject, "name" | "in">;

export type HeaderObjectWithRef = Omit<ParameterObjectWithRef, "name" | "in">;

export interface TagObject {
  name?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  "x-displayName"?: string;
}

export interface TagGroupObject {
  name: string;
  tags: string[];
}

export interface ReferenceObject {
  $ref: string;
}

export type JSONSchema = JSONSchema4 | JSONSchema6 | JSONSchema7;
export type SchemaType = JSONSchema7TypeName;
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
  type?: SchemaType;
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
  "x-tags"?: string[];
  "x-enumDescriptions"?: Record<string, string>;
};

export type SchemaObjectWithRef = Omit<
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
  type?: SchemaType;
  allOf?: (SchemaObject | ReferenceObject)[];
  oneOf?: (SchemaObject | ReferenceObject)[];
  anyOf?: (SchemaObject | ReferenceObject)[];
  not?: SchemaObject | ReferenceObject;
  items?: SchemaObject | ReferenceObject;
  properties?: Record<string, SchemaObject | ReferenceObject>;
  additionalProperties?: boolean | SchemaObject | ReferenceObject;

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

export type SecuritySchemeObject =
  | ApiKeySecuritySchemeObject
  | HttpSecuritySchemeObject
  | Oauth2SecuritySchemeObject
  | OpenIdConnectSecuritySchemeObject;

export interface ApiKeySecuritySchemeObject {
  type: "apiKey";
  description?: string;
  name: string;
  in: "query" | "header" | "cookie";
}

export interface HttpSecuritySchemeObject {
  type: "http";
  description?: string;
  scheme: string;
  bearerFormat?: string;
  name?: string;
  in?: string;
}

export interface Oauth2SecuritySchemeObject {
  type: "oauth2";
  description?: string;
  flows: OAuthFlowsObject;
}

export interface OpenIdConnectSecuritySchemeObject {
  type: "openIdConnect";
  description?: string;
  openIdConnectUrl: string;
}

export interface OAuthFlowsObject {
  implicit?: OAuthFlowObject;
  password?: OAuthFlowObject;
  clientCredentials?: OAuthFlowObject;
  authorizationCode?: OAuthFlowObject;
}

export interface OAuthFlowObject {
  authorizationUrl?: string; // required for some
  tokenUrl?: string; // required for some
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export type SecurityRequirementObject = Record<string, string[]>;
