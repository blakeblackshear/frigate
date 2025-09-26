/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import path from "path";

import { ProcessedSidebarItem } from "@docusaurus/plugin-content-docs/lib/sidebars/types";
import {
  ProcessedSidebar,
  SidebarItemCategory,
  SidebarItemCategoryLinkConfig,
} from "@docusaurus/plugin-content-docs/src/sidebars/types";
import { posixPath } from "@docusaurus/utils";
import clsx from "clsx";
import { kebabCase } from "lodash";
import uniq from "lodash/uniq";

import { TagGroupObject, TagObject } from "../openapi/types";
import type {
  SidebarOptions,
  APIOptions,
  ApiPageMetadata,
  ApiMetadata,
  InfoPageMetadata,
  SchemaPageMetadata,
  ApiDocItemGenerator,
} from "../types";

function isApiItem(item: ApiMetadata): item is ApiMetadata {
  return item.type === "api";
}

function isInfoItem(item: ApiMetadata): item is ApiMetadata {
  return item.type === "info";
}

function isSchemaItem(item: ApiMetadata): item is ApiMetadata {
  return item.type === "schema";
}

const createDocItem: ApiDocItemGenerator = (
  item,
  { sidebarOptions: { customProps }, basePath }
) => {
  const sidebar_label = item.frontMatter.sidebar_label;
  const title = item.title;
  const id = item.type === "schema" ? `schemas/${item.id}` : item.id;
  const className =
    item.type === "api"
      ? clsx(
          {
            "menu__list-item--deprecated": item.api.deprecated,
            "api-method": !!item.api.method,
          },
          item.api.method
        )
      : clsx(
          {
            "menu__list-item--deprecated": item.schema.deprecated,
          },
          "schema"
        );
  return {
    type: "doc" as const,
    id: basePath === "" || undefined ? `${id}` : `${basePath}/${id}`,
    label: (sidebar_label as string) ?? title ?? id,
    customProps: customProps,
    className: className ? className : undefined,
  };
};

function groupByTags(
  items: ApiMetadata[],
  sidebarOptions: SidebarOptions,
  options: APIOptions,
  tags: TagObject[][],
  docPath: string
): ProcessedSidebar {
  let { outputDir, label, showSchemas } = options;

  // Remove trailing slash before proceeding
  outputDir = outputDir.replace(/\/$/, "");

  const { sidebarCollapsed, sidebarCollapsible, categoryLinkSource } =
    sidebarOptions;

  const apiItems = items.filter(isApiItem) as ApiPageMetadata[];
  const infoItems = items.filter(isInfoItem) as InfoPageMetadata[];
  const schemaItems = items.filter(isSchemaItem) as SchemaPageMetadata[];
  const intros = infoItems.map((item: any) => {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      tags: item.info.tags,
    };
  });

  // TODO: make sure we only take the first tag
  const operationTags = uniq(
    apiItems
      .flatMap((item) => item.api.tags)
      .filter((item): item is string => !!item)
  );
  const schemaTags = uniq(
    schemaItems
      .flatMap((item) => item.schema["x-tags"])
      .filter((item): item is string => !!item)
  );

  // Combine globally defined tags with operation and schema tags
  // Only include global tag if referenced in operation/schema tags
  let apiTags: string[] = [];
  tags.flat().forEach((tag) => {
    // Should we also check x-displayName?
    if (operationTags.includes(tag.name!) || schemaTags.includes(tag.name!)) {
      apiTags.push(tag.name!);
    }
  });

  if (sidebarOptions.groupPathsBy !== "tagGroup") {
    apiTags = uniq(apiTags.concat(operationTags, schemaTags));
  }

  const basePath = docPath
    ? outputDir.split(docPath!)[1].replace(/^\/+/g, "")
    : outputDir.slice(outputDir.indexOf("/", 1)).replace(/^\/+/g, "");

  const createDocItemFnContext = {
    sidebarOptions,
    basePath,
  };
  const createDocItemFn =
    sidebarOptions.sidebarGenerators?.createDocItem ?? createDocItem;

  let rootIntroDoc = undefined;
  if (infoItems.length === 1) {
    const infoItem = infoItems[0];
    const id = infoItem.id;
    rootIntroDoc = {
      type: "doc" as const,
      id: basePath === "" || undefined ? `${id}` : `${basePath}/${id}`,
    };
  }

  const tagged = apiTags
    .map((tag) => {
      // Map info object to tag
      const taggedInfoObject = intros.find((i) =>
        i.tags ? i.tags.find((t: any) => t.name === tag) : undefined
      );
      const tagObject = tags.flat().find(
        (t) =>
          tag === t.name && {
            name: tag,
            description: `${tag} Index`,
          }
      );

      // TODO: perhaps move this into a getLinkConfig() function
      // Default to no link config (spindowns only)
      let linkConfig = undefined;
      if (taggedInfoObject !== undefined && categoryLinkSource === "info") {
        linkConfig = {
          type: "doc",
          id:
            basePath === "" || undefined
              ? `${taggedInfoObject.id}`
              : `${basePath}/${taggedInfoObject.id}`,
        } as SidebarItemCategoryLinkConfig;
      }

      // TODO: perhaps move this into a getLinkConfig() function
      if (tagObject !== undefined && categoryLinkSource === "tag") {
        const tagId = kebabCase(tagObject.name);
        linkConfig = {
          type: "doc",
          id:
            basePath === "" || undefined ? `${tagId}` : `${basePath}/${tagId}`,
        } as SidebarItemCategoryLinkConfig;
      }

      if (categoryLinkSource === "auto") {
        linkConfig = {
          type: "generated-index" as "generated-index",
          title: tag,
          slug: label
            ? posixPath(
                path.join(
                  "/category",
                  basePath,
                  kebabCase(label),
                  kebabCase(tag)
                )
              )
            : posixPath(path.join("/category", basePath, kebabCase(tag))),
        } as SidebarItemCategoryLinkConfig;
      }

      const taggedApiItems = apiItems.filter(
        (item) => !!item.api.tags?.includes(tag)
      );
      const taggedSchemaItems = schemaItems.filter(
        (item) => !!item.schema["x-tags"]?.includes(tag)
      );

      return {
        type: "category" as const,
        label: tagObject?.["x-displayName"] ?? tag,
        link: linkConfig,
        collapsible: sidebarCollapsible,
        collapsed: sidebarCollapsed,
        items: [...taggedSchemaItems, ...taggedApiItems].map((item) =>
          createDocItemFn(item, createDocItemFnContext)
        ),
      };
    })
    .filter((item) => item.items.length > 0); // Filter out any categories with no items.

  // Handle items with no tag
  const untaggedItems = apiItems
    .filter(({ api }) => api.tags === undefined || api.tags.length === 0)
    .map((item) => createDocItemFn(item, createDocItemFnContext));
  let untagged: SidebarItemCategory[] = [];
  if (untaggedItems.length > 0) {
    untagged = [
      {
        type: "category" as const,
        label: "UNTAGGED",
        collapsible: sidebarCollapsible!,
        collapsed: sidebarCollapsed!,
        items: apiItems
          .filter(({ api }) => api.tags === undefined || api.tags.length === 0)
          .map((item) => createDocItemFn(item, createDocItemFnContext)),
      },
    ];
  }

  let schemas: SidebarItemCategory[] = [];
  if (showSchemas && schemaItems.length > 0) {
    schemas = [
      {
        type: "category" as const,
        label: "Schemas",
        collapsible: sidebarCollapsible!,
        collapsed: sidebarCollapsed!,
        items: schemaItems
          .filter(({ schema }) => !schema["x-tags"])
          .map((item) => createDocItemFn(item, createDocItemFnContext)),
      },
    ];
  }

  // Shift root intro doc to top of sidebar
  // TODO: Add input validation for categoryLinkSource options
  if (rootIntroDoc && categoryLinkSource !== "info") {
    tagged.unshift(rootIntroDoc as any);
  }

  return [...tagged, ...untagged, ...schemas];
}

export default function generateSidebarSlice(
  sidebarOptions: SidebarOptions,
  options: APIOptions,
  api: ApiMetadata[],
  tags: TagObject[][],
  docPath: string,
  tagGroups?: TagGroupObject[]
) {
  let sidebarSlice: ProcessedSidebar = [];

  if (sidebarOptions.groupPathsBy === "tagGroup") {
    let schemasGroup: ProcessedSidebar = [];
    tagGroups?.forEach((tagGroup) => {
      //filter tags only included in group
      const filteredTags: TagObject[] = [];
      tags[0].forEach((tag) => {
        if (tagGroup.tags.includes(tag.name as string)) {
          filteredTags.push(tag);
        }
      });

      const groupCategory = {
        type: "category" as const,
        label: tagGroup.name,
        collapsible: true,
        collapsed: true,
        items: groupByTags(
          api,
          sidebarOptions,
          options,
          [filteredTags],
          docPath
        ),
      };

      if (options.showSchemas) {
        // For the first tagGroup, save the generated "Schemas" category for later.
        if (schemasGroup.length === 0) {
          schemasGroup = groupCategory.items?.filter(
            (item) => item.type === "category" && item.label === "Schemas"
          );
        }
        // Remove the "Schemas" category from every `groupCategory`.
        groupCategory.items = groupCategory.items.filter((item) =>
          "label" in item ? item.label !== "Schemas" : true
        );
      }
      sidebarSlice.push(groupCategory as ProcessedSidebarItem);
    });
    // Add `schemasGroup` to the end of the sidebar.
    sidebarSlice.push(...schemasGroup);
  } else if (sidebarOptions.groupPathsBy === "tag") {
    sidebarSlice = groupByTags(api, sidebarOptions, options, tags, docPath);
  }

  return sidebarSlice;
}
