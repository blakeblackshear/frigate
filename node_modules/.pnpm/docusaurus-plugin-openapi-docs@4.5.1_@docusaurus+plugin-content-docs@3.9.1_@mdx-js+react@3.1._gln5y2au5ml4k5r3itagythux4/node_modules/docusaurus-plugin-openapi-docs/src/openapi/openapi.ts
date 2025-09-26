/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import path from "path";

import { Globby, GlobExcludeDefault, posixPath } from "@docusaurus/utils";
import chalk from "chalk";
import fs from "fs-extra";
import cloneDeep from "lodash/cloneDeep";
import kebabCase from "lodash/kebabCase";
import unionBy from "lodash/unionBy";
import uniq from "lodash/uniq";
import Converter from "openapi-to-postmanv2";
import { Collection } from "postman-collection";
import * as sdk from "postman-collection";

import { sampleRequestFromSchema } from "./createRequestExample";
import { OpenApiObject, TagGroupObject, TagObject } from "./types";
import { isURL } from "../index";
import {
  ApiMetadata,
  APIOptions,
  ApiPageMetadata,
  InfoPageMetadata,
  SchemaPageMetadata,
  SidebarOptions,
  TagPageMetadata,
} from "../types";
import { sampleResponseFromSchema } from "./createResponseExample";
import { loadAndResolveSpec } from "./utils/loadAndResolveSpec";

/**
 * Convenience function for converting raw JSON to a Postman Collection object.
 */
function jsonToCollection(data: OpenApiObject): Promise<Collection> {
  return new Promise((resolve, reject) => {
    let schemaPack = new Converter.SchemaPack(
      { type: "json", data },
      { schemaFaker: false }
    );
    schemaPack.computedOptions.schemaFaker = false;
    schemaPack.convert((_err: any, conversionResult: any) => {
      if (!conversionResult.result) {
        return reject(conversionResult.reason);
      }
      return resolve(new sdk.Collection(conversionResult.output[0].data));
    });
  });
}

/**
 * Creates a Postman Collection object from an OpenAPI definition.
 */
async function createPostmanCollection(
  openapiData: OpenApiObject
): Promise<Collection> {
  // Create copy of openapiData
  const data = cloneDeep(openapiData) as OpenApiObject;

  // Including `servers` breaks postman, so delete all of them.
  delete data.servers;
  for (let pathItemObject of Object.values(data.paths)) {
    delete pathItemObject.servers;
    delete pathItemObject.get?.servers;
    delete pathItemObject.put?.servers;
    delete pathItemObject.post?.servers;
    delete pathItemObject.delete?.servers;
    delete pathItemObject.options?.servers;
    delete pathItemObject.head?.servers;
    delete pathItemObject.patch?.servers;
    delete pathItemObject.trace?.servers;
  }

  return await jsonToCollection(data);
}

type PartialPage<T> = Omit<T, "permalink" | "source" | "sourceDirName">;

function createItems(
  openapiData: OpenApiObject,
  options: APIOptions,
  sidebarOptions: SidebarOptions
): ApiMetadata[] {
  // TODO: Find a better way to handle this
  let items: PartialPage<ApiMetadata>[] = [];
  const infoIdSpaces = openapiData.info.title.replace(" ", "-").toLowerCase();
  const infoId = kebabCase(infoIdSpaces);

  if (openapiData.info.description || openapiData.info.title) {
    // Only create an info page if we have a description.
    const infoDescription = openapiData.info?.description;
    let splitDescription: any;
    if (infoDescription) {
      splitDescription = infoDescription.match(/[^\r\n]+/g);
    }
    const infoPage: PartialPage<InfoPageMetadata> = {
      type: "info",
      id: infoId,
      unversionedId: infoId,
      title: openapiData.info.title
        ? openapiData.info.title.replace(/((?:^|[^\\])(?:\\{2})*)"/g, "$1'")
        : "",
      description: openapiData.info.description
        ? openapiData.info.description.replace(
            /((?:^|[^\\])(?:\\{2})*)"/g,
            "$1'"
          )
        : "",
      frontMatter: {
        description: splitDescription
          ? splitDescription[0]
              .replace(/((?:^|[^\\])(?:\\{2})*)"/g, "$1'")
              .replace(/\s+$/, "")
          : "",
      },
      securitySchemes: openapiData.components?.securitySchemes,
      info: {
        ...openapiData.info,
        tags: openapiData.tags,
        title: openapiData.info.title ?? "Introduction",
        logo: openapiData.info["x-logo"]! as any,
        darkLogo: openapiData.info["x-dark-logo"]! as any,
      },
    };
    items.push(infoPage);
  }

  for (let [path, pathObject] of Object.entries(openapiData.paths)) {
    const { $ref, description, parameters, servers, summary, ...rest } =
      pathObject;
    for (let [method, operationObject] of Object.entries({ ...rest })) {
      const title =
        operationObject.summary ??
        operationObject.operationId ??
        "Missing summary";
      if (operationObject.description === undefined) {
        operationObject.description =
          operationObject.summary ?? operationObject.operationId ?? "";
      }

      const baseId = operationObject.operationId
        ? kebabCase(operationObject.operationId)
        : kebabCase(operationObject.summary);

      const extensions = [];
      const commonExtensions = ["x-codeSamples"];

      for (const [key, value] of Object.entries(operationObject)) {
        if (key.startsWith("x-") && !commonExtensions.includes(key)) {
          extensions.push({ key, value });
        }
      }

      const servers =
        operationObject.servers ?? pathObject.servers ?? openapiData.servers;

      const security = operationObject.security ?? openapiData.security;

      // Add security schemes so we know how to handle security.
      const securitySchemes = openapiData.components?.securitySchemes;

      // Make sure schemes are lowercase. See: https://github.com/cloud-annotations/docusaurus-plugin-openapi/issues/79
      if (securitySchemes) {
        for (let securityScheme of Object.values(securitySchemes)) {
          if (securityScheme.type === "http") {
            securityScheme.scheme = securityScheme.scheme.toLowerCase();
          }
        }
      }

      let jsonRequestBodyExample;
      const content = operationObject.requestBody?.content;
      let body;
      for (let key in content) {
        if (
          key.toLowerCase() === "application/json" ||
          key.toLowerCase() === "application/json; charset=utf-8"
        ) {
          body = content[key];
          break;
        }
      }

      if (body?.schema) {
        jsonRequestBodyExample = sampleRequestFromSchema(body.schema);
      }

      // Handle vendor JSON media types
      const bodyContent = operationObject.requestBody?.content;

      if (bodyContent && Object.keys(bodyContent).length > 0) {
        const firstBodyContentKey = Object.keys(bodyContent)[0];
        if (firstBodyContentKey.endsWith("+json")) {
          const firstBody = bodyContent[firstBodyContentKey];
          if (firstBody?.schema) {
            jsonRequestBodyExample = sampleRequestFromSchema(firstBody.schema);
          }
        }
      }

      // TODO: Don't include summary temporarilly
      const { summary, ...defaults } = operationObject;

      // Merge common parameters with operation parameters
      // Operation params take precendence over common params
      if (parameters !== undefined) {
        if (operationObject.parameters !== undefined) {
          defaults.parameters = unionBy(
            operationObject.parameters,
            parameters,
            "name"
          );
        } else {
          defaults.parameters = parameters;
        }
      }

      const opDescription = operationObject.description;
      let splitDescription: any;
      if (opDescription) {
        splitDescription = opDescription.match(/[^\r\n]+/g);
      }

      const apiPage: PartialPage<ApiPageMetadata> = {
        type: "api",
        id: baseId,
        infoId: infoId ?? "",
        unversionedId: baseId,
        title: title ? title.replace(/((?:^|[^\\])(?:\\{2})*)"/g, "$1'") : "",
        description: operationObject.description
          ? operationObject.description.replace(
              /((?:^|[^\\])(?:\\{2})*)"/g,
              "$1'"
            )
          : "",
        frontMatter: {
          description: splitDescription
            ? splitDescription[0]
                .replace(/((?:^|[^\\])(?:\\{2})*)"/g, "$1'")
                .replace(/\s+$/, "")
            : "",
          ...(options?.proxy && { proxy: options.proxy }),
          ...(options?.hideSendButton && {
            hide_send_button: options.hideSendButton,
          }),
          ...(options?.showExtensions && {
            show_extensions: options.showExtensions,
          }),
        },
        api: {
          ...defaults,
          ...(extensions.length > 0 && { extensions: extensions }),
          tags: operationObject.tags,
          method,
          path,
          servers,
          security,
          securitySchemes,
          jsonRequestBodyExample,
          info: openapiData.info,
        },
        position: operationObject["x-position"] as number | undefined,
      };

      items.push(apiPage);
    }
  }

  // Gather x-webhooks endpoints
  for (let [path, pathObject] of Object.entries(
    openapiData["x-webhooks"] ?? openapiData["webhooks"] ?? {}
  )) {
    path = "webhook";
    const { $ref, description, parameters, servers, summary, ...rest } =
      pathObject;
    for (let [method, operationObject] of Object.entries({ ...rest })) {
      method = "event";
      const title =
        operationObject.summary ??
        operationObject.operationId ??
        "Missing summary";
      if (operationObject.description === undefined) {
        operationObject.description =
          operationObject.summary ?? operationObject.operationId ?? "";
      }

      const baseId = operationObject.operationId
        ? kebabCase(operationObject.operationId)
        : kebabCase(operationObject.summary);

      const extensions = [];
      const commonExtensions = ["x-codeSamples"];

      for (const [key, value] of Object.entries(operationObject)) {
        if (key.startsWith("x-") && !commonExtensions.includes(key)) {
          extensions.push({ key, value });
        }
      }

      const servers =
        operationObject.servers ?? pathObject.servers ?? openapiData.servers;

      const security = operationObject.security ?? openapiData.security;

      // Add security schemes so we know how to handle security.
      const securitySchemes = openapiData.components?.securitySchemes;

      // Make sure schemes are lowercase. See: https://github.com/cloud-annotations/docusaurus-plugin-openapi/issues/79
      if (securitySchemes) {
        for (let securityScheme of Object.values(securitySchemes)) {
          if (securityScheme.type === "http") {
            securityScheme.scheme = securityScheme.scheme.toLowerCase();
          }
        }
      }

      let jsonRequestBodyExample;
      const content = operationObject.requestBody?.content;
      let body;
      for (let key in content) {
        if (
          key.toLowerCase() === "application/json" ||
          key.toLowerCase() === "application/json; charset=utf-8"
        ) {
          body = content[key];
          break;
        }
      }

      if (body?.schema) {
        jsonRequestBodyExample = sampleRequestFromSchema(body.schema);
      }

      // Handle vendor JSON media types
      const bodyContent = operationObject.requestBody?.content;
      if (bodyContent) {
        const firstBodyContentKey = Object.keys(bodyContent)[0];
        if (firstBodyContentKey.endsWith("+json")) {
          const firstBody = bodyContent[firstBodyContentKey];
          if (firstBody?.schema) {
            jsonRequestBodyExample = sampleRequestFromSchema(firstBody.schema);
          }
        }
      }

      // TODO: Don't include summary temporarilly
      const { summary, ...defaults } = operationObject;

      // Merge common parameters with operation parameters
      // Operation params take precendence over common params
      if (parameters !== undefined) {
        if (operationObject.parameters !== undefined) {
          defaults.parameters = unionBy(
            operationObject.parameters,
            parameters,
            "name"
          );
        } else {
          defaults.parameters = parameters;
        }
      }

      const opDescription = operationObject.description;
      let splitDescription: any;
      if (opDescription) {
        splitDescription = opDescription.match(/[^\r\n]+/g);
      }

      const apiPage: PartialPage<ApiPageMetadata> = {
        type: "api",
        id: baseId,
        infoId: infoId ?? "",
        unversionedId: baseId,
        title: title ? title.replace(/((?:^|[^\\])(?:\\{2})*)"/g, "$1'") : "",
        description: operationObject.description
          ? operationObject.description.replace(
              /((?:^|[^\\])(?:\\{2})*)"/g,
              "$1'"
            )
          : "",
        frontMatter: {
          description: splitDescription
            ? splitDescription[0]
                .replace(/((?:^|[^\\])(?:\\{2})*)"/g, "$1'")
                .replace(/\s+$/, "")
            : "",
          ...(options?.proxy && { proxy: options.proxy }),
          ...(options?.hideSendButton && {
            hide_send_button: options.hideSendButton,
          }),
          ...(options?.showExtensions && {
            show_extensions: options.showExtensions,
          }),
        },
        api: {
          ...defaults,
          ...(extensions.length > 0 && { extensions: extensions }),
          tags: operationObject.tags,
          method,
          path,
          servers,
          security,
          securitySchemes,
          jsonRequestBodyExample,
          info: openapiData.info,
        },
      };
      items.push(apiPage);
    }
  }

  if (
    options?.showSchemas === true ||
    Object.entries(openapiData?.components?.schemas ?? {})
      .flatMap(([_, s]) => s["x-tags"])
      .filter((item) => !!item).length > 0
  ) {
    // Gather schemas
    for (let [schema, schemaObject] of Object.entries(
      openapiData?.components?.schemas ?? {}
    )) {
      if (options?.showSchemas === true || schemaObject["x-tags"]) {
        const baseIdSpaces =
          schemaObject?.title?.replace(" ", "-").toLowerCase() ?? "";
        const baseId = kebabCase(baseIdSpaces);

        const schemaDescription = schemaObject.description;
        let splitDescription: any;
        if (schemaDescription) {
          splitDescription = schemaDescription.match(/[^\r\n]+/g);
        }

        const schemaPage: PartialPage<SchemaPageMetadata> = {
          type: "schema",
          id: baseId,
          infoId: infoId ?? "",
          unversionedId: baseId,
          title: schemaObject.title
            ? schemaObject.title.replace(/((?:^|[^\\])(?:\\{2})*)"/g, "$1'")
            : schema,
          description: schemaObject.description
            ? schemaObject.description.replace(
                /((?:^|[^\\])(?:\\{2})*)"/g,
                "$1'"
              )
            : "",
          frontMatter: {
            description: splitDescription
              ? splitDescription[0]
                  .replace(/((?:^|[^\\])(?:\\{2})*)"/g, "$1'")
                  .replace(/\s+$/, "")
              : "",
            sample: JSON.stringify(sampleResponseFromSchema(schemaObject)),
          },
          schema: schemaObject,
        };

        items.push(schemaPage);
      }
    }
  }

  if (sidebarOptions?.categoryLinkSource === "tag") {
    // Get global tags
    const tags: TagObject[] = openapiData.tags ?? [];

    // Get operation tags
    const apiItems = items.filter((item) => {
      return item.type === "api";
    }) as ApiPageMetadata[];
    const operationTags = uniq(
      apiItems
        .flatMap((item) => item.api.tags)
        .filter((item): item is string => !!item)
    );

    // eslint-disable-next-line array-callback-return
    tags
      .filter((tag) => operationTags.includes(tag.name!)) // include only tags referenced by operation
      // eslint-disable-next-line array-callback-return
      .map((tag) => {
        const description = getTagDisplayName(
          tag.name!,
          openapiData.tags ?? []
        );
        const tagId = kebabCase(tag.name);
        const splitDescription = description.match(/[^\r\n]+/g);
        const tagPage: PartialPage<TagPageMetadata> = {
          type: "tag",
          id: tagId,
          unversionedId: tagId,
          title: description ?? "",
          description: description ?? "",
          frontMatter: {
            description: splitDescription
              ? splitDescription[0]
                  .replace(/((?:^|[^\\])(?:\\{2})*)"/g, "$1'")
                  .replace(/\s+$/, "")
              : "",
          },
          tag: {
            ...tag,
          },
        };
        items.push(tagPage);
      });
  }

  items.sort((a, b) => {
    // Items with position come first, sorted by position
    if (a.position !== undefined && b.position !== undefined) {
      return a.position - b.position;
    }
    // Items with position come before items without position
    if (a.position !== undefined) {
      return -1;
    }
    if (b.position !== undefined) {
      return 1;
    }
    // If neither has position, maintain original order
    return 0;
  });

  return items as ApiMetadata[];
}

/**
 * Attach Postman Request objects to the corresponding ApiItems.
 */
function bindCollectionToApiItems(
  items: ApiMetadata[],
  postmanCollection: sdk.Collection
) {
  postmanCollection.forEachItem((item: any) => {
    const method = item.request.method.toLowerCase();
    const path = item.request.url
      .getPath({ unresolved: true }) // unresolved returns "/:variableName" instead of "/<type>"
      .replace(/(?<![a-z0-9-_]+):([a-z0-9-_]+)/gi, "{$1}"); // replace "/:variableName" with "/{variableName}"
    const apiItem = items.find((item) => {
      if (
        item.type === "info" ||
        item.type === "tag" ||
        item.type === "schema"
      ) {
        return false;
      }
      return item.api.path === path && item.api.method === method;
    });

    if (apiItem?.type === "api") {
      apiItem.api.postman = item.request;
    }
  });
}

interface OpenApiFiles {
  source: string;
  sourceDirName: string;
  data: OpenApiObject;
}

export async function readOpenapiFiles(
  openapiPath: string
): Promise<OpenApiFiles[]> {
  if (!isURL(openapiPath)) {
    const stat = await fs.lstat(openapiPath);
    if (stat.isDirectory()) {
      // TODO: Add config for inlcude/ignore
      const allFiles = await Globby(["**/*.{json,yaml,yml}"], {
        cwd: openapiPath,
        ignore: GlobExcludeDefault,
        deep: 1,
      });
      const sources = allFiles.filter((x) => !x.includes("_category_")); // todo: regex exclude?
      return Promise.all(
        sources.map(async (source) => {
          // TODO: make a function for this
          const fullPath = posixPath(path.join(openapiPath, source));
          const data = (await loadAndResolveSpec(
            fullPath
          )) as unknown as OpenApiObject;
          return {
            source: fullPath, // This will be aliased in process.
            sourceDirName: path.dirname(source),
            data,
          };
        })
      );
    }
  }
  const data = (await loadAndResolveSpec(
    openapiPath
  )) as unknown as OpenApiObject;
  return [
    {
      source: openapiPath, // This will be aliased in process.
      sourceDirName: ".",
      data,
    },
  ];
}

export async function processOpenapiFiles(
  files: OpenApiFiles[],
  options: APIOptions,
  sidebarOptions: SidebarOptions
): Promise<[ApiMetadata[], TagObject[][], TagGroupObject[]]> {
  const promises = files.map(async (file) => {
    if (file.data !== undefined) {
      const processedFile = await processOpenapiFile(
        file.data,
        options,
        sidebarOptions
      );
      const itemsObjectsArray = processedFile[0].map((item) => ({
        ...item,
      }));
      const tags = processedFile[1];
      const tagGroups = processedFile[2];
      return [itemsObjectsArray, tags, tagGroups];
    }
    console.warn(
      chalk.yellow(
        `WARNING: the following OpenAPI spec returned undefined: ${file.source}`
      )
    );
    return [];
  });
  const metadata = await Promise.all(promises);
  const items = metadata
    .map(function (x) {
      return x[0];
    })
    .flat()
    .filter(function (x) {
      // Remove undefined items due to transient parsing errors
      return x !== undefined;
    });

  const tags = metadata
    .map(function (x) {
      return x[1];
    })
    .filter(function (x) {
      // Remove undefined tags due to transient parsing errors
      return x !== undefined;
    });

  const tagGroups = metadata
    .map(function (x) {
      return x[2];
    })
    .flat()
    .filter(function (x) {
      // Remove undefined tags due to transient parsing errors
      return x !== undefined;
    });

  return [
    items as ApiMetadata[],
    tags as TagObject[][],
    tagGroups as TagGroupObject[],
  ];
}

export async function processOpenapiFile(
  openapiData: OpenApiObject,
  options: APIOptions,
  sidebarOptions: SidebarOptions
): Promise<[ApiMetadata[], TagObject[], TagGroupObject[]]> {
  const postmanCollection = await createPostmanCollection(openapiData);
  const items = createItems(openapiData, options, sidebarOptions);

  bindCollectionToApiItems(items, postmanCollection);

  let tags: TagObject[] = [];
  if (openapiData.tags !== undefined) {
    tags = openapiData.tags;
  }

  let tagGroups: TagGroupObject[] = [];
  if (openapiData["x-tagGroups"] !== undefined) {
    tagGroups = openapiData["x-tagGroups"];
  }

  return [items, tags, tagGroups];
}

// order for picking items as a display name of tags
const tagDisplayNameProperties = ["x-displayName", "name"] as const;

export function getTagDisplayName(tagName: string, tags: TagObject[]): string {
  // find the very own tagObject
  const tagObject = tags.find((tagObject) => tagObject.name === tagName) ?? {
    // if none found, just fake one
    name: tagName,
  };

  // return the first found and filled value from the property list
  for (const property of tagDisplayNameProperties) {
    const displayName = tagObject[property];
    if (typeof displayName === "string") {
      return displayName;
    }
  }

  // always default to the tagName
  return tagName;
}
