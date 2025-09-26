/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import fs from "fs";
import path from "path";
import zlib from "zlib";

import type { LoadContext, Plugin } from "@docusaurus/types";
import { Globby, posixPath } from "@docusaurus/utils";
import chalk from "chalk";
import JSON5 from "json5";
import { render } from "mustache";

import {
  createApiPageMD,
  createInfoPageMD,
  createSchemaPageMD,
  createTagPageMD,
} from "./markdown";
import { processOpenapiFiles, readOpenapiFiles } from "./openapi";
import { OptionsSchema } from "./options";
import generateSidebarSlice from "./sidebars";
import type {
  ApiMetadata,
  APIOptions,
  ApiPageMetadata,
  InfoPageMetadata,
  LoadedContent,
  PluginOptions,
  SchemaPageMetadata,
  TagPageMetadata,
} from "./types";

export function isURL(str: string): boolean {
  return /^(https?:)\/\//m.test(str);
}

export function getDocsPluginConfig(
  presetsPlugins: any[],
  plugin: string,
  pluginId: string
): Object | undefined {
  // eslint-disable-next-line array-callback-return
  const filteredConfig = presetsPlugins.filter((data) => {
    // Search presets
    if (Array.isArray(data)) {
      if (typeof data[0] === "string" && data[0].endsWith(pluginId)) {
        return data[1];
      }

      // Search plugin-content-docs instances
      if (typeof data[0] === "string" && data[0] === plugin) {
        const configPluginId = data[1].id ? data[1].id : "default";
        if (configPluginId === pluginId) {
          return data[1];
        }
      }
    }
  })[0];

  if (filteredConfig) {
    // Search presets, e.g. "classic"
    if (filteredConfig[0].endsWith(pluginId)) {
      return filteredConfig[1].docs;
    }

    // Search plugin-content-docs instances
    if (filteredConfig[0] === plugin) {
      const configPluginId = filteredConfig[1].id
        ? filteredConfig[1].id
        : "default";
      if (configPluginId === pluginId) {
        return filteredConfig[1];
      }
    }
  }
  return;
}

function getPluginConfig(plugins: any[], pluginId: string): any {
  return plugins.filter((data) => data[1].id === pluginId)[0][1];
}

function getPluginInstances(plugins: any[]): any {
  return plugins.filter((data) => data[0] === "docusaurus-plugin-openapi-docs");
}

export default function pluginOpenAPIDocs(
  context: LoadContext,
  options: PluginOptions
): Plugin<LoadedContent> {
  const {
    config,
    docsPlugin = "@docusaurus/plugin-content-docs",
    docsPluginId,
  } = options;
  const { siteDir, siteConfig } = context;

  // Get routeBasePath and path from plugin-content-docs or preset
  const presets: any = siteConfig.presets;
  const plugins: any = siteConfig.plugins;
  const presetsPlugins = presets.concat(plugins);
  let docData: any = getDocsPluginConfig(
    presetsPlugins,
    docsPlugin,
    docsPluginId
  );
  let docRouteBasePath = docData ? docData.routeBasePath : undefined;
  let docPath = docData ? (docData.path ? docData.path : "docs") : undefined;

  async function generateApiDocs(options: APIOptions, pluginId: any) {
    let {
      specPath,
      outputDir,
      template,
      infoTemplate,
      tagTemplate,
      schemaTemplate,
      markdownGenerators,
      downloadUrl,
      sidebarOptions,
      disableCompression,
    } = options;

    // Remove trailing slash before proceeding
    outputDir = outputDir.replace(/\/$/, "");

    // Override docPath if pluginId provided
    if (pluginId) {
      docData = getDocsPluginConfig(presetsPlugins, docsPlugin, pluginId);
      docRouteBasePath = docData ? docData.routeBasePath : undefined;
      docPath = docData ? (docData.path ? docData.path : "docs") : undefined;
    }

    const contentPath = isURL(specPath)
      ? specPath
      : path.resolve(siteDir, specPath);

    try {
      const openapiFiles = await readOpenapiFiles(contentPath);
      const [loadedApi, tags, tagGroups] = await processOpenapiFiles(
        openapiFiles,
        options,
        sidebarOptions!
      );
      if (!fs.existsSync(outputDir)) {
        try {
          fs.mkdirSync(outputDir, { recursive: true });
          console.log(chalk.green(`Successfully created "${outputDir}"`));
        } catch (err) {
          console.error(
            chalk.red(`Failed to create "${outputDir}"`),
            chalk.yellow(err)
          );
        }
      }

      // TODO: figure out better way to set default
      if (Object.keys(sidebarOptions ?? {}).length > 0) {
        const sidebarSlice = generateSidebarSlice(
          sidebarOptions!,
          options,
          loadedApi,
          tags,
          docPath,
          tagGroups
        );

        let sidebarSliceTemplate = `import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";\n\n`;
        sidebarSliceTemplate += `const sidebar: SidebarsConfig = {{{slice}}};\n\n`;
        sidebarSliceTemplate += `export default sidebar.apisidebar;\n`;

        const view = render(sidebarSliceTemplate, {
          slice: JSON5.stringify(
            { apisidebar: sidebarSlice },
            { space: 2, quote: '"' }
          ),
        });

        if (!fs.existsSync(`${outputDir}/sidebar.ts`)) {
          try {
            fs.writeFileSync(`${outputDir}/sidebar.ts`, view, "utf8");
            console.log(
              chalk.green(`Successfully created "${outputDir}/sidebar.ts"`)
            );
          } catch (err) {
            console.error(
              chalk.red(`Failed to write "${outputDir}/sidebar.ts"`),
              chalk.yellow(err)
            );
          }
        }
      }

      const mdTemplate = template
        ? fs.readFileSync(template).toString()
        : `---
id: {{{id}}}
title: "{{{title}}}"
description: "{{{frontMatter.description}}}"
{{^api}}
sidebar_label: Introduction
{{/api}}
{{#api}}
sidebar_label: "{{{title}}}"
{{/api}}
{{^api}}
sidebar_position: 0
{{/api}}
hide_title: true
{{#api}}
hide_table_of_contents: true
{{/api}}
{{#json}}
api: {{{json}}}
{{/json}}
{{#api.method}}
sidebar_class_name: "{{{api.method}}} api-method"
{{/api.method}}
{{#infoPath}}
info_path: {{{infoPath}}}
{{/infoPath}}
custom_edit_url: null
{{#frontMatter.proxy}}
proxy: {{{frontMatter.proxy}}}
{{/frontMatter.proxy}}
{{#frontMatter.hide_send_button}}
hide_send_button: true
{{/frontMatter.hide_send_button}}
{{#frontMatter.show_extensions}}
show_extensions: true
{{/frontMatter.show_extensions}}
---

{{{markdown}}}
      `;

      const infoMdTemplate = infoTemplate
        ? fs.readFileSync(infoTemplate).toString()
        : `---
id: {{{id}}}
title: "{{{title}}}"
description: "{{{frontMatter.description}}}"
sidebar_label: "{{{title}}}"
hide_title: true
custom_edit_url: null
---

{{{markdown}}}

\`\`\`mdx-code-block
import DocCardList from '@theme/DocCardList';
import {useCurrentSidebarCategory} from '@docusaurus/theme-common';

<DocCardList items={useCurrentSidebarCategory().items}/>
\`\`\`
      `;

      const tagMdTemplate = tagTemplate
        ? fs.readFileSync(tagTemplate).toString()
        : `---
id: {{{id}}}
title: "{{{frontMatter.description}}}"
description: "{{{frontMatter.description}}}"
custom_edit_url: null
---

{{{markdown}}}

\`\`\`mdx-code-block
import DocCardList from '@theme/DocCardList';
import {useCurrentSidebarCategory} from '@docusaurus/theme-common';

<DocCardList items={useCurrentSidebarCategory().items}/>
\`\`\`
      `;

      const schemaMdTemplate = schemaTemplate
        ? fs.readFileSync(schemaTemplate).toString()
        : `---
id: {{{id}}}
title: "{{{title}}}"
description: "{{{frontMatter.description}}}"
sidebar_label: "{{{title}}}"
hide_title: true
{{#schema}}
hide_table_of_contents: true
{{/schema}}
schema: true
sample: {{{frontMatter.sample}}}
custom_edit_url: null
---

{{{markdown}}}
            `;

      const apiPageGenerator =
        markdownGenerators?.createApiPageMD ?? createApiPageMD;
      const infoPageGenerator =
        markdownGenerators?.createInfoPageMD ?? createInfoPageMD;
      const tagPageGenerator =
        markdownGenerators?.createTagPageMD ?? createTagPageMD;
      const schemaPageGenerator =
        markdownGenerators?.createSchemaPageMD ?? createSchemaPageMD;

      const pageGeneratorByType: {
        [key in ApiMetadata["type"]]: (
          pageData: {
            api: ApiPageMetadata;
            info: InfoPageMetadata;
            tag: TagPageMetadata;
            schema: SchemaPageMetadata;
          }[key]
        ) => string;
      } = {
        api: apiPageGenerator,
        info: infoPageGenerator,
        tag: tagPageGenerator,
        schema: schemaPageGenerator,
      };

      loadedApi.map(async (item) => {
        if (downloadUrl) {
          item.downloadUrl = downloadUrl;
        }
        const markdown = pageGeneratorByType[item.type](item as any);
        item.markdown = markdown;
        if (item.type === "api") {
          // opportunity to compress JSON
          // const serialize = (o: any) => {
          //   return zlib.deflateSync(JSON.stringify(o)).toString("base64");
          // };
          // const deserialize = (s: any) => {
          //   return zlib.inflateSync(Buffer.from(s, "base64")).toString();
          // };
          disableCompression === true
            ? (item.json = JSON.stringify(item.api))
            : (item.json = zlib
                .deflateSync(JSON.stringify(item.api))
                .toString("base64"));
          let infoBasePath = `${outputDir}/${item.infoId}`;
          if (docRouteBasePath) {
            infoBasePath = `${docRouteBasePath}/${outputDir
              .split(docPath!)[1]
              .replace(/^\/+/g, "")}/${item.infoId}`.replace(/^\/+/g, "");
          }
          if (item.infoId) item.infoPath = infoBasePath;
        }

        const view = render(mdTemplate, item);
        const utils = render(infoMdTemplate, item);
        // eslint-disable-next-line testing-library/render-result-naming-convention
        const tagUtils = render(tagMdTemplate, item);

        if (item.type === "api") {
          if (!fs.existsSync(`${outputDir}/${item.id}.api.mdx`)) {
            try {
              // kebabCase(arg) returns 0-length string when arg is undefined
              if (item.id.length === 0) {
                throw Error(
                  "Operation must have summary or operationId defined"
                );
              }
              fs.writeFileSync(`${outputDir}/${item.id}.api.mdx`, view, "utf8");
              console.log(
                chalk.green(
                  `Successfully created "${outputDir}/${item.id}.api.mdx"`
                )
              );
            } catch (err) {
              console.error(
                chalk.red(`Failed to write "${outputDir}/${item.id}.api.mdx"`),
                chalk.yellow(err)
              );
            }
          }
        }

        if (item.type === "info") {
          if (!fs.existsSync(`${outputDir}/${item.id}.info.mdx`)) {
            try {
              sidebarOptions?.categoryLinkSource === "info" || infoTemplate // Only use utils template if set to "info" or if infoTemplate is set
                ? fs.writeFileSync(
                    `${outputDir}/${item.id}.info.mdx`,
                    utils,
                    "utf8"
                  )
                : fs.writeFileSync(
                    `${outputDir}/${item.id}.info.mdx`,
                    view,
                    "utf8"
                  );
              console.log(
                chalk.green(
                  `Successfully created "${outputDir}/${item.id}.info.mdx"`
                )
              );
            } catch (err) {
              console.error(
                chalk.red(`Failed to write "${outputDir}/${item.id}.info.mdx"`),
                chalk.yellow(err)
              );
            }
          }
        }

        if (item.type === "tag") {
          if (!fs.existsSync(`${outputDir}/${item.id}.tag.mdx`)) {
            try {
              fs.writeFileSync(
                `${outputDir}/${item.id}.tag.mdx`,
                tagUtils,
                "utf8"
              );
              console.log(
                chalk.green(
                  `Successfully created "${outputDir}/${item.id}.tag.mdx"`
                )
              );
            } catch (err) {
              console.error(
                chalk.red(`Failed to write "${outputDir}/${item.id}.tag.mdx"`),
                chalk.yellow(err)
              );
            }
          }
        }

        if (item.type === "schema") {
          if (!fs.existsSync(`${outputDir}/schemas/${item.id}.schema.mdx`)) {
            if (!fs.existsSync(`${outputDir}/schemas`)) {
              try {
                fs.mkdirSync(`${outputDir}/schemas`, { recursive: true });
                console.log(
                  chalk.green(`Successfully created "${outputDir}/schemas"`)
                );
              } catch (err) {
                console.error(
                  chalk.red(`Failed to create "${outputDir}/schemas"`),
                  chalk.yellow(err)
                );
              }
            }
            try {
              // kebabCase(arg) returns 0-length string when arg is undefined
              if (item.id.length === 0) {
                throw Error("Schema must have title defined");
              }
              // eslint-disable-next-line testing-library/render-result-naming-convention
              const schemaView = render(schemaMdTemplate, item);
              fs.writeFileSync(
                `${outputDir}/schemas/${item.id}.schema.mdx`,
                schemaView,
                "utf8"
              );
              console.log(
                chalk.green(
                  `Successfully created "${outputDir}/${item.id}.schema.mdx"`
                )
              );
            } catch (err) {
              console.error(
                chalk.red(
                  `Failed to write "${outputDir}/${item.id}.schema.mdx"`
                ),
                chalk.yellow(err)
              );
            }
          }
        }
        return;
      });

      return;
    } catch (e) {
      console.error(chalk.red(`Loading of api failed for "${contentPath}"`));
      throw e;
    }
  }

  async function cleanApiDocs(options: APIOptions) {
    const { outputDir } = options;
    const apiDir = posixPath(path.join(siteDir, outputDir));
    const apiMdxFiles = await Globby(["*.api.mdx", "*.info.mdx", "*.tag.mdx"], {
      cwd: path.resolve(apiDir),
      deep: 1,
    });
    const sidebarFile = await Globby(["sidebar.js", "sidebar.ts"], {
      cwd: path.resolve(apiDir),
      deep: 1,
    });
    apiMdxFiles.map((mdx) =>
      fs.unlink(`${apiDir}/${mdx}`, (err) => {
        if (err) {
          console.error(
            chalk.red(`Cleanup failed for "${apiDir}/${mdx}"`),
            chalk.yellow(err)
          );
        } else {
          console.log(chalk.green(`Cleanup succeeded for "${apiDir}/${mdx}"`));
        }
      })
    );

    try {
      fs.rmSync(`${apiDir}/schemas`, { recursive: true });
      console.log(chalk.green(`Cleanup succeeded for "${apiDir}/schemas"`));
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        console.error(
          chalk.red(`Cleanup failed for "${apiDir}/schemas"`),
          chalk.yellow(err)
        );
      }
    }

    sidebarFile.map((sidebar) =>
      fs.unlink(`${apiDir}/${sidebar}`, (err) => {
        if (err) {
          console.error(
            chalk.red(`Cleanup failed for "${apiDir}/${sidebar}"`),
            chalk.yellow(err)
          );
        } else {
          console.log(
            chalk.green(`Cleanup succeeded for "${apiDir}/${sidebar}"`)
          );
        }
      })
    );
  }

  async function generateVersions(versions: object, outputDir: string) {
    let versionsArray = [] as object[];
    for (const [version, metadata] of Object.entries(versions)) {
      versionsArray.push({
        version: version,
        label: metadata.label,
        baseUrl: metadata.baseUrl,
        downloadUrl: metadata.downloadUrl,
      });
    }

    if (!fs.existsSync(outputDir)) {
      try {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(chalk.green(`Successfully created "${outputDir}"`));
      } catch (err) {
        console.error(
          chalk.red(`Failed to create "${outputDir}"`),
          chalk.yellow(err)
        );
      }
    }

    const versionsJson = JSON.stringify(versionsArray, null, 2);
    try {
      fs.writeFileSync(
        `${outputDir}/versions.json`,
        versionsJson + "\n",
        "utf8"
      );
      console.log(
        chalk.green(`Successfully created "${outputDir}/versions.json"`)
      );
    } catch (err) {
      console.error(
        chalk.red(`Failed to write "${outputDir}/versions.json"`),
        chalk.yellow(err)
      );
    }
  }

  async function cleanVersions(outputDir: string) {
    if (fs.existsSync(`${outputDir}/versions.json`)) {
      fs.unlink(`${outputDir}/versions.json`, (err) => {
        if (err) {
          console.error(
            chalk.red(`Cleanup failed for "${outputDir}/versions.json"`),
            chalk.yellow(err)
          );
        } else {
          console.log(
            chalk.green(`Cleanup succeeded for "${outputDir}/versions.json"`)
          );
        }
      });
    }
  }

  async function generateAllVersions(options: APIOptions, pluginId: any) {
    const parentOptions = Object.assign({}, options);
    const { versions } = parentOptions as any;

    if (versions != null && Object.keys(versions).length > 0) {
      const version = parentOptions.version as string;
      const label = parentOptions.label as string;

      const baseUrl = parentOptions.baseUrl as string;
      let parentVersion = {} as any;

      parentVersion[version] = { label: label, baseUrl: baseUrl };
      const mergedVersions = Object.assign(parentVersion, versions);

      // Prepare for merge
      delete parentOptions.versions;
      delete parentOptions.version;
      delete parentOptions.label;
      delete parentOptions.baseUrl;
      delete parentOptions.downloadUrl;

      await generateVersions(mergedVersions, parentOptions.outputDir);
      Object.keys(versions).forEach(async (key) => {
        if (key === "all") {
          console.error(
            chalk.red(
              "Can't use id 'all' for OpenAPI docs versions configuration key."
            )
          );
        }
        const versionOptions = versions[key];
        const mergedOptions = {
          ...parentOptions,
          ...versionOptions,
        };
        await generateApiDocs(mergedOptions, pluginId);
      });
    }
  }

  async function cleanAllVersions(options: APIOptions) {
    const parentOptions = Object.assign({}, options);

    const { versions } = parentOptions as any;

    delete parentOptions.versions;

    if (versions != null && Object.keys(versions).length > 0) {
      await cleanVersions(parentOptions.outputDir);
      Object.keys(versions).forEach(async (key) => {
        const versionOptions = versions[key];
        const mergedOptions = {
          ...parentOptions,
          ...versionOptions,
        };
        await cleanApiDocs(mergedOptions);
      });
    }
  }

  return {
    name: `docusaurus-plugin-openapi-docs`,

    extendCli(cli): void {
      cli
        .command(`gen-api-docs`)
        .description(
          `Generates OpenAPI docs in MDX file format and sidebar.ts (if enabled).`
        )
        .usage("<id>")
        .arguments("<id>")
        .option("-p, --plugin-id <plugin>", "OpenAPI docs plugin ID.")
        .option("--all-versions", "Generate all versions.")
        .action(async (id, instance) => {
          const options = instance.opts();
          const pluginId = options.pluginId;
          const allVersions = options.allVersions;
          const pluginInstances = getPluginInstances(plugins);
          let targetConfig: any;
          let targetDocsPluginId: any;
          if (pluginId) {
            try {
              const pluginConfig = getPluginConfig(plugins, pluginId);
              targetConfig = pluginConfig.config ?? {};
              targetDocsPluginId = pluginConfig.docsPluginId;
            } catch {
              console.error(
                chalk.red(`OpenAPI docs plugin ID '${pluginId}' not found.`)
              );
              return;
            }
          } else {
            if (pluginInstances.length > 1) {
              console.error(
                chalk.red(
                  "OpenAPI docs plugin ID must be specified when more than one plugin instance exists."
                )
              );
              return;
            }
            targetConfig = config;
          }

          if (id === "all") {
            if (targetConfig[id]) {
              console.error(
                chalk.red(
                  "Can't use id 'all' for OpenAPI docs configuration key."
                )
              );
            } else {
              Object.keys(targetConfig).forEach(async function (key) {
                await generateApiDocs(targetConfig[key], targetDocsPluginId);
                if (allVersions) {
                  await generateAllVersions(
                    targetConfig[key],
                    targetDocsPluginId
                  );
                }
              });
            }
          } else if (!targetConfig[id]) {
            console.error(
              chalk.red(`ID '${id}' does not exist in OpenAPI docs config.`)
            );
          } else {
            await generateApiDocs(targetConfig[id], targetDocsPluginId);
            if (allVersions) {
              await generateAllVersions(targetConfig[id], targetDocsPluginId);
            }
          }
        });

      cli
        .command(`gen-api-docs:version`)
        .description(
          `Generates versioned OpenAPI docs in MDX file format, versions.js and sidebar.ts (if enabled).`
        )
        .usage("<id:version>")
        .arguments("<id:version>")
        .option("-p, --plugin-id <plugin>", "OpenAPI docs plugin ID.")
        .action(async (id, instance) => {
          const options = instance.opts();
          const pluginId = options.pluginId;
          const pluginInstances = getPluginInstances(plugins);
          let targetConfig: any;
          let targetDocsPluginId: any;
          if (pluginId) {
            try {
              const pluginConfig = getPluginConfig(plugins, pluginId);
              targetConfig = pluginConfig.config ?? {};
              targetDocsPluginId = pluginConfig.docsPluginId;
            } catch {
              console.error(
                chalk.red(`OpenAPI docs plugin ID '${pluginId}' not found.`)
              );
              return;
            }
          } else {
            if (pluginInstances.length > 1) {
              console.error(
                chalk.red(
                  "OpenAPI docs plugin ID must be specified when more than one plugin instance exists."
                )
              );
              return;
            }
            targetConfig = config;
          }
          const [parentId, versionId] = id.split(":");
          const parentConfig = Object.assign({}, targetConfig[parentId]);

          const version = parentConfig.version as string;
          const label = parentConfig.label as string;
          const baseUrl = parentConfig.baseUrl as string;

          let parentVersion = {} as any;
          parentVersion[version] = { label: label, baseUrl: baseUrl };

          const { versions } = targetConfig[parentId] as any;
          const mergedVersions = Object.assign(parentVersion, versions);

          // Prepare for merge
          delete parentConfig.versions;
          delete parentConfig.version;
          delete parentConfig.label;
          delete parentConfig.baseUrl;
          delete parentConfig.downloadUrl;

          // TODO: handle when no versions are defined by version command is passed
          if (versionId === "all") {
            if (versions[id]) {
              console.error(
                chalk.red(
                  "Can't use id 'all' for OpenAPI docs versions configuration key."
                )
              );
            } else {
              await generateVersions(mergedVersions, parentConfig.outputDir);
              Object.keys(versions).forEach(async (key) => {
                const versionConfig = versions[key];
                const mergedConfig = {
                  ...parentConfig,
                  ...versionConfig,
                };
                await generateApiDocs(mergedConfig, targetDocsPluginId);
              });
            }
          } else if (!versions[versionId]) {
            console.error(
              chalk.red(
                `Version ID '${versionId}' does not exist in OpenAPI docs versions config.`
              )
            );
          } else {
            const versionConfig = versions[versionId];
            const mergedConfig = {
              ...parentConfig,
              ...versionConfig,
            };
            await generateVersions(mergedVersions, parentConfig.outputDir);
            await generateApiDocs(mergedConfig, targetDocsPluginId);
          }
        });

      cli
        .command(`clean-api-docs`)
        .description(
          `Clears the generated OpenAPI docs MDX files and sidebar.ts (if enabled).`
        )
        .usage("<id>")
        .arguments("<id>")
        .option("-p, --plugin-id <plugin>", "OpenAPI docs plugin ID.")
        .option("--all-versions", "Clean all versions.")
        .action(async (id, instance) => {
          const options = instance.opts();
          const pluginId = options.pluginId;
          const allVersions = options.allVersions;
          const pluginInstances = getPluginInstances(plugins);
          let targetConfig: any;
          if (pluginId) {
            try {
              const pluginConfig = getPluginConfig(plugins, pluginId);
              targetConfig = pluginConfig.config ?? {};
            } catch {
              console.error(
                chalk.red(`OpenAPI docs plugin ID '${pluginId}' not found.`)
              );
              return;
            }
          } else {
            if (pluginInstances.length > 1) {
              console.error(
                chalk.red(
                  "OpenAPI docs plugin ID must be specified when more than one plugin instance exists."
                )
              );
              return;
            }
            targetConfig = config;
          }
          if (id === "all") {
            if (targetConfig[id]) {
              console.error(
                chalk.red(
                  "Can't use id 'all' for OpenAPI docs configuration key."
                )
              );
            } else {
              Object.keys(targetConfig).forEach(async function (key) {
                await cleanApiDocs(targetConfig[key]);
                if (allVersions) {
                  await cleanAllVersions(targetConfig[key]);
                }
              });
            }
          } else {
            await cleanApiDocs(targetConfig[id]);
            if (allVersions) {
              await cleanAllVersions(targetConfig[id]);
            }
          }
        });

      cli
        .command(`clean-api-docs:version`)
        .description(
          `Clears the versioned, generated OpenAPI docs MDX files, versions.json and sidebar.ts (if enabled).`
        )
        .usage("<id:version>")
        .arguments("<id:version>")
        .option("-p, --plugin-id <plugin>", "OpenAPI docs plugin ID.")
        .action(async (id, instance) => {
          const options = instance.opts();
          const pluginId = options.pluginId;
          const pluginInstances = getPluginInstances(plugins);
          let targetConfig: any;
          if (pluginId) {
            try {
              const pluginConfig = getPluginConfig(plugins, pluginId);
              targetConfig = pluginConfig.config ?? {};
            } catch {
              console.error(
                chalk.red(`OpenAPI docs plugin ID '${pluginId}' not found.`)
              );
              return;
            }
          } else {
            if (pluginInstances.length > 1) {
              console.error(
                chalk.red(
                  "OpenAPI docs plugin ID must be specified when more than one plugin instance exists."
                )
              );
              return;
            }
            targetConfig = config;
          }
          const [parentId, versionId] = id.split(":");
          const { versions } = targetConfig[parentId] as any;

          const parentConfig = Object.assign({}, targetConfig[parentId]);
          delete parentConfig.versions;

          if (versionId === "all") {
            if (versions[id]) {
              chalk.red(
                "Can't use id 'all' for OpenAPI docs versions configuration key."
              );
            } else {
              await cleanVersions(parentConfig.outputDir);
              Object.keys(versions).forEach(async (key) => {
                const versionConfig = versions[key];
                const mergedConfig = {
                  ...parentConfig,
                  ...versionConfig,
                };
                await cleanApiDocs(mergedConfig);
              });
            }
          } else {
            const versionConfig = versions[versionId];
            const mergedConfig = {
              ...parentConfig,
              ...versionConfig,
            };
            await cleanApiDocs(mergedConfig);
          }
        });
    },
  };
}

pluginOpenAPIDocs.validateOptions = ({ options, validate }: any) => {
  const validatedOptions = validate(OptionsSchema, options);
  return validatedOptions;
};
