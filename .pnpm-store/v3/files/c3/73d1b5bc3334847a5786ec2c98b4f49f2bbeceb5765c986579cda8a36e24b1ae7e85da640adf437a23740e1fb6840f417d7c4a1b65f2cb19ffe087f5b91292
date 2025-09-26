/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { SidebarItemDoc } from "@docusaurus/plugin-content-docs/src/sidebars/types";
import Request from "postman-collection";

import {
  InfoObject,
  OperationObject,
  SchemaObject,
  SecuritySchemeObject,
  TagObject,
} from "./openapi/types";

export type {
  PropSidebarItemCategory,
  SidebarItemLink,
  PropSidebar,
  PropSidebarItem,
} from "@docusaurus/plugin-content-docs-types";
export interface PluginOptions {
  id?: string;
  docsPlugin?: string;
  docsPluginId: string;
  config: {
    [key: string]: APIOptions;
  };
}

export interface APIOptions {
  specPath: string;
  outputDir: string;
  template?: string;
  infoTemplate?: string;
  tagTemplate?: string;
  schemaTemplate?: string;
  downloadUrl?: string;
  hideSendButton?: boolean;
  showExtensions?: boolean;
  sidebarOptions?: SidebarOptions;
  version?: string;
  label?: string;
  baseUrl?: string;
  versions?: {
    [key: string]: APIVersionOptions;
  };
  proxy?: string;
  markdownGenerators?: MarkdownGenerator;
  showSchemas?: boolean;
  disableCompression?: boolean;
}

export interface MarkdownGenerator {
  createApiPageMD?: (pageData: ApiPageMetadata) => string;
  createInfoPageMD?: (pageData: InfoPageMetadata) => string;
  createTagPageMD?: (pageData: TagPageMetadata) => string;
  createSchemaPageMD?: (pageData: SchemaPageMetadata) => string;
}

export type ApiDocItemGenerator = (
  item: ApiPageMetadata | SchemaPageMetadata,
  context: { sidebarOptions: SidebarOptions; basePath: string }
) => SidebarItemDoc;

export interface SidebarGenerators {
  createDocItem?: ApiDocItemGenerator;
}

export interface SidebarOptions {
  groupPathsBy?: string;
  categoryLinkSource?: "info" | "tag" | "auto";
  customProps?: { [key: string]: unknown };
  sidebarCollapsible?: boolean;
  sidebarCollapsed?: boolean;
  sidebarGenerators?: SidebarGenerators;
}

export interface APIVersionOptions {
  specPath: string;
  outputDir: string;
  label: string;
  baseUrl: string;
  downloadUrl?: string;
}

export interface LoadedContent {
  loadedApi: ApiMetadata[];
  // loadedDocs: DocPageMetadata[]; TODO: cleanup
}

export type ApiMetadata =
  | ApiPageMetadata
  | InfoPageMetadata
  | TagPageMetadata
  | SchemaPageMetadata;

export interface ApiMetadataBase {
  sidebar?: string;
  previous?: ApiNavLink;
  next?: ApiNavLink;
  //
  id: string; // TODO legacy versioned id => try to remove
  unversionedId: string; // TODO new unversioned id => try to rename to "id"
  infoId?: string;
  infoPath?: string;
  downloadUrl?: string;
  title: string;
  description: string;
  source: string; // @site aliased source => "@site/docs/folder/subFolder/subSubFolder/myDoc.md"
  sourceDirName: string; // relative to the versioned docs folder (can be ".") => "folder/subFolder/subSubFolder"
  slug?: string;
  permalink: string;
  sidebarPosition?: number;
  frontMatter: Record<string, unknown>;
  method?: string;
  path?: string;
  position?: number;
}

export interface ApiPageMetadata extends ApiMetadataBase {
  json?: string;
  type: "api";
  api: ApiItem;
  markdown?: string;
}

export interface ApiItem extends OperationObject {
  method: string; // get, post, put, etc...
  path: string; // The endpoint path => "/api/getPets"
  jsonRequestBodyExample: string;
  securitySchemes?: {
    [key: string]: SecuritySchemeObject;
  };
  postman?: Request;
  proxy?: string;
  info: InfoObject;
  extensions?: object;
}

export interface InfoPageMetadata extends ApiMetadataBase {
  type: "info";
  info: ApiInfo;
  markdown?: string;
  securitySchemes?: {
    [key: string]: SecuritySchemeObject;
  };
}

export interface TagPageMetadata extends ApiMetadataBase {
  type: "tag";
  tag: TagObject;
  markdown?: string;
}

export interface SchemaPageMetadata extends ApiMetadataBase {
  type: "schema";
  schema: SchemaObject;
  markdown?: string;
}

export interface TagGroupPageMetadata extends ApiMetadataBase {
  type: "tagGroup";
  name: string;
  tags: TagObject[];
  markdown?: string;
}

export type ApiInfo = InfoObject;

export interface ApiNavLink {
  title: string;
  permalink: string;
}
