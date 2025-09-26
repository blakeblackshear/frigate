"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isURL = isURL;
exports.getDocsPluginConfig = getDocsPluginConfig;
exports.default = pluginOpenAPIDocs;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const utils_1 = require("@docusaurus/utils");
const chalk_1 = __importDefault(require("chalk"));
const json5_1 = __importDefault(require("json5"));
const mustache_1 = require("mustache");
const markdown_1 = require("./markdown");
const openapi_1 = require("./openapi");
const options_1 = require("./options");
const sidebars_1 = __importDefault(require("./sidebars"));
function isURL(str) {
    return /^(https?:)\/\//m.test(str);
}
function getDocsPluginConfig(presetsPlugins, plugin, pluginId) {
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
function getPluginConfig(plugins, pluginId) {
    return plugins.filter((data) => data[1].id === pluginId)[0][1];
}
function getPluginInstances(plugins) {
    return plugins.filter((data) => data[0] === "docusaurus-plugin-openapi-docs");
}
function pluginOpenAPIDocs(context, options) {
    const { config, docsPlugin = "@docusaurus/plugin-content-docs", docsPluginId, } = options;
    const { siteDir, siteConfig } = context;
    // Get routeBasePath and path from plugin-content-docs or preset
    const presets = siteConfig.presets;
    const plugins = siteConfig.plugins;
    const presetsPlugins = presets.concat(plugins);
    let docData = getDocsPluginConfig(presetsPlugins, docsPlugin, docsPluginId);
    let docRouteBasePath = docData ? docData.routeBasePath : undefined;
    let docPath = docData ? (docData.path ? docData.path : "docs") : undefined;
    async function generateApiDocs(options, pluginId) {
        var _a, _b, _c, _d;
        let { specPath, outputDir, template, infoTemplate, tagTemplate, schemaTemplate, markdownGenerators, downloadUrl, sidebarOptions, disableCompression, } = options;
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
            : path_1.default.resolve(siteDir, specPath);
        try {
            const openapiFiles = await (0, openapi_1.readOpenapiFiles)(contentPath);
            const [loadedApi, tags, tagGroups] = await (0, openapi_1.processOpenapiFiles)(openapiFiles, options, sidebarOptions);
            if (!fs_1.default.existsSync(outputDir)) {
                try {
                    fs_1.default.mkdirSync(outputDir, { recursive: true });
                    console.log(chalk_1.default.green(`Successfully created "${outputDir}"`));
                }
                catch (err) {
                    console.error(chalk_1.default.red(`Failed to create "${outputDir}"`), chalk_1.default.yellow(err));
                }
            }
            // TODO: figure out better way to set default
            if (Object.keys(sidebarOptions !== null && sidebarOptions !== void 0 ? sidebarOptions : {}).length > 0) {
                const sidebarSlice = (0, sidebars_1.default)(sidebarOptions, options, loadedApi, tags, docPath, tagGroups);
                let sidebarSliceTemplate = `import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";\n\n`;
                sidebarSliceTemplate += `const sidebar: SidebarsConfig = {{{slice}}};\n\n`;
                sidebarSliceTemplate += `export default sidebar.apisidebar;\n`;
                const view = (0, mustache_1.render)(sidebarSliceTemplate, {
                    slice: json5_1.default.stringify({ apisidebar: sidebarSlice }, { space: 2, quote: '"' }),
                });
                if (!fs_1.default.existsSync(`${outputDir}/sidebar.ts`)) {
                    try {
                        fs_1.default.writeFileSync(`${outputDir}/sidebar.ts`, view, "utf8");
                        console.log(chalk_1.default.green(`Successfully created "${outputDir}/sidebar.ts"`));
                    }
                    catch (err) {
                        console.error(chalk_1.default.red(`Failed to write "${outputDir}/sidebar.ts"`), chalk_1.default.yellow(err));
                    }
                }
            }
            const mdTemplate = template
                ? fs_1.default.readFileSync(template).toString()
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
                ? fs_1.default.readFileSync(infoTemplate).toString()
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
                ? fs_1.default.readFileSync(tagTemplate).toString()
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
                ? fs_1.default.readFileSync(schemaTemplate).toString()
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
            const apiPageGenerator = (_a = markdownGenerators === null || markdownGenerators === void 0 ? void 0 : markdownGenerators.createApiPageMD) !== null && _a !== void 0 ? _a : markdown_1.createApiPageMD;
            const infoPageGenerator = (_b = markdownGenerators === null || markdownGenerators === void 0 ? void 0 : markdownGenerators.createInfoPageMD) !== null && _b !== void 0 ? _b : markdown_1.createInfoPageMD;
            const tagPageGenerator = (_c = markdownGenerators === null || markdownGenerators === void 0 ? void 0 : markdownGenerators.createTagPageMD) !== null && _c !== void 0 ? _c : markdown_1.createTagPageMD;
            const schemaPageGenerator = (_d = markdownGenerators === null || markdownGenerators === void 0 ? void 0 : markdownGenerators.createSchemaPageMD) !== null && _d !== void 0 ? _d : markdown_1.createSchemaPageMD;
            const pageGeneratorByType = {
                api: apiPageGenerator,
                info: infoPageGenerator,
                tag: tagPageGenerator,
                schema: schemaPageGenerator,
            };
            loadedApi.map(async (item) => {
                if (downloadUrl) {
                    item.downloadUrl = downloadUrl;
                }
                const markdown = pageGeneratorByType[item.type](item);
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
                        : (item.json = zlib_1.default
                            .deflateSync(JSON.stringify(item.api))
                            .toString("base64"));
                    let infoBasePath = `${outputDir}/${item.infoId}`;
                    if (docRouteBasePath) {
                        infoBasePath = `${docRouteBasePath}/${outputDir
                            .split(docPath)[1]
                            .replace(/^\/+/g, "")}/${item.infoId}`.replace(/^\/+/g, "");
                    }
                    if (item.infoId)
                        item.infoPath = infoBasePath;
                }
                const view = (0, mustache_1.render)(mdTemplate, item);
                const utils = (0, mustache_1.render)(infoMdTemplate, item);
                // eslint-disable-next-line testing-library/render-result-naming-convention
                const tagUtils = (0, mustache_1.render)(tagMdTemplate, item);
                if (item.type === "api") {
                    if (!fs_1.default.existsSync(`${outputDir}/${item.id}.api.mdx`)) {
                        try {
                            // kebabCase(arg) returns 0-length string when arg is undefined
                            if (item.id.length === 0) {
                                throw Error("Operation must have summary or operationId defined");
                            }
                            fs_1.default.writeFileSync(`${outputDir}/${item.id}.api.mdx`, view, "utf8");
                            console.log(chalk_1.default.green(`Successfully created "${outputDir}/${item.id}.api.mdx"`));
                        }
                        catch (err) {
                            console.error(chalk_1.default.red(`Failed to write "${outputDir}/${item.id}.api.mdx"`), chalk_1.default.yellow(err));
                        }
                    }
                }
                if (item.type === "info") {
                    if (!fs_1.default.existsSync(`${outputDir}/${item.id}.info.mdx`)) {
                        try {
                            (sidebarOptions === null || sidebarOptions === void 0 ? void 0 : sidebarOptions.categoryLinkSource) === "info" || infoTemplate // Only use utils template if set to "info" or if infoTemplate is set
                                ? fs_1.default.writeFileSync(`${outputDir}/${item.id}.info.mdx`, utils, "utf8")
                                : fs_1.default.writeFileSync(`${outputDir}/${item.id}.info.mdx`, view, "utf8");
                            console.log(chalk_1.default.green(`Successfully created "${outputDir}/${item.id}.info.mdx"`));
                        }
                        catch (err) {
                            console.error(chalk_1.default.red(`Failed to write "${outputDir}/${item.id}.info.mdx"`), chalk_1.default.yellow(err));
                        }
                    }
                }
                if (item.type === "tag") {
                    if (!fs_1.default.existsSync(`${outputDir}/${item.id}.tag.mdx`)) {
                        try {
                            fs_1.default.writeFileSync(`${outputDir}/${item.id}.tag.mdx`, tagUtils, "utf8");
                            console.log(chalk_1.default.green(`Successfully created "${outputDir}/${item.id}.tag.mdx"`));
                        }
                        catch (err) {
                            console.error(chalk_1.default.red(`Failed to write "${outputDir}/${item.id}.tag.mdx"`), chalk_1.default.yellow(err));
                        }
                    }
                }
                if (item.type === "schema") {
                    if (!fs_1.default.existsSync(`${outputDir}/schemas/${item.id}.schema.mdx`)) {
                        if (!fs_1.default.existsSync(`${outputDir}/schemas`)) {
                            try {
                                fs_1.default.mkdirSync(`${outputDir}/schemas`, { recursive: true });
                                console.log(chalk_1.default.green(`Successfully created "${outputDir}/schemas"`));
                            }
                            catch (err) {
                                console.error(chalk_1.default.red(`Failed to create "${outputDir}/schemas"`), chalk_1.default.yellow(err));
                            }
                        }
                        try {
                            // kebabCase(arg) returns 0-length string when arg is undefined
                            if (item.id.length === 0) {
                                throw Error("Schema must have title defined");
                            }
                            // eslint-disable-next-line testing-library/render-result-naming-convention
                            const schemaView = (0, mustache_1.render)(schemaMdTemplate, item);
                            fs_1.default.writeFileSync(`${outputDir}/schemas/${item.id}.schema.mdx`, schemaView, "utf8");
                            console.log(chalk_1.default.green(`Successfully created "${outputDir}/${item.id}.schema.mdx"`));
                        }
                        catch (err) {
                            console.error(chalk_1.default.red(`Failed to write "${outputDir}/${item.id}.schema.mdx"`), chalk_1.default.yellow(err));
                        }
                    }
                }
                return;
            });
            return;
        }
        catch (e) {
            console.error(chalk_1.default.red(`Loading of api failed for "${contentPath}"`));
            throw e;
        }
    }
    async function cleanApiDocs(options) {
        const { outputDir } = options;
        const apiDir = (0, utils_1.posixPath)(path_1.default.join(siteDir, outputDir));
        const apiMdxFiles = await (0, utils_1.Globby)(["*.api.mdx", "*.info.mdx", "*.tag.mdx"], {
            cwd: path_1.default.resolve(apiDir),
            deep: 1,
        });
        const sidebarFile = await (0, utils_1.Globby)(["sidebar.js", "sidebar.ts"], {
            cwd: path_1.default.resolve(apiDir),
            deep: 1,
        });
        apiMdxFiles.map((mdx) => fs_1.default.unlink(`${apiDir}/${mdx}`, (err) => {
            if (err) {
                console.error(chalk_1.default.red(`Cleanup failed for "${apiDir}/${mdx}"`), chalk_1.default.yellow(err));
            }
            else {
                console.log(chalk_1.default.green(`Cleanup succeeded for "${apiDir}/${mdx}"`));
            }
        }));
        try {
            fs_1.default.rmSync(`${apiDir}/schemas`, { recursive: true });
            console.log(chalk_1.default.green(`Cleanup succeeded for "${apiDir}/schemas"`));
        }
        catch (err) {
            if (err.code !== "ENOENT") {
                console.error(chalk_1.default.red(`Cleanup failed for "${apiDir}/schemas"`), chalk_1.default.yellow(err));
            }
        }
        sidebarFile.map((sidebar) => fs_1.default.unlink(`${apiDir}/${sidebar}`, (err) => {
            if (err) {
                console.error(chalk_1.default.red(`Cleanup failed for "${apiDir}/${sidebar}"`), chalk_1.default.yellow(err));
            }
            else {
                console.log(chalk_1.default.green(`Cleanup succeeded for "${apiDir}/${sidebar}"`));
            }
        }));
    }
    async function generateVersions(versions, outputDir) {
        let versionsArray = [];
        for (const [version, metadata] of Object.entries(versions)) {
            versionsArray.push({
                version: version,
                label: metadata.label,
                baseUrl: metadata.baseUrl,
                downloadUrl: metadata.downloadUrl,
            });
        }
        if (!fs_1.default.existsSync(outputDir)) {
            try {
                fs_1.default.mkdirSync(outputDir, { recursive: true });
                console.log(chalk_1.default.green(`Successfully created "${outputDir}"`));
            }
            catch (err) {
                console.error(chalk_1.default.red(`Failed to create "${outputDir}"`), chalk_1.default.yellow(err));
            }
        }
        const versionsJson = JSON.stringify(versionsArray, null, 2);
        try {
            fs_1.default.writeFileSync(`${outputDir}/versions.json`, versionsJson + "\n", "utf8");
            console.log(chalk_1.default.green(`Successfully created "${outputDir}/versions.json"`));
        }
        catch (err) {
            console.error(chalk_1.default.red(`Failed to write "${outputDir}/versions.json"`), chalk_1.default.yellow(err));
        }
    }
    async function cleanVersions(outputDir) {
        if (fs_1.default.existsSync(`${outputDir}/versions.json`)) {
            fs_1.default.unlink(`${outputDir}/versions.json`, (err) => {
                if (err) {
                    console.error(chalk_1.default.red(`Cleanup failed for "${outputDir}/versions.json"`), chalk_1.default.yellow(err));
                }
                else {
                    console.log(chalk_1.default.green(`Cleanup succeeded for "${outputDir}/versions.json"`));
                }
            });
        }
    }
    async function generateAllVersions(options, pluginId) {
        const parentOptions = Object.assign({}, options);
        const { versions } = parentOptions;
        if (versions != null && Object.keys(versions).length > 0) {
            const version = parentOptions.version;
            const label = parentOptions.label;
            const baseUrl = parentOptions.baseUrl;
            let parentVersion = {};
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
                    console.error(chalk_1.default.red("Can't use id 'all' for OpenAPI docs versions configuration key."));
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
    async function cleanAllVersions(options) {
        const parentOptions = Object.assign({}, options);
        const { versions } = parentOptions;
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
        extendCli(cli) {
            cli
                .command(`gen-api-docs`)
                .description(`Generates OpenAPI docs in MDX file format and sidebar.ts (if enabled).`)
                .usage("<id>")
                .arguments("<id>")
                .option("-p, --plugin-id <plugin>", "OpenAPI docs plugin ID.")
                .option("--all-versions", "Generate all versions.")
                .action(async (id, instance) => {
                var _a;
                const options = instance.opts();
                const pluginId = options.pluginId;
                const allVersions = options.allVersions;
                const pluginInstances = getPluginInstances(plugins);
                let targetConfig;
                let targetDocsPluginId;
                if (pluginId) {
                    try {
                        const pluginConfig = getPluginConfig(plugins, pluginId);
                        targetConfig = (_a = pluginConfig.config) !== null && _a !== void 0 ? _a : {};
                        targetDocsPluginId = pluginConfig.docsPluginId;
                    }
                    catch {
                        console.error(chalk_1.default.red(`OpenAPI docs plugin ID '${pluginId}' not found.`));
                        return;
                    }
                }
                else {
                    if (pluginInstances.length > 1) {
                        console.error(chalk_1.default.red("OpenAPI docs plugin ID must be specified when more than one plugin instance exists."));
                        return;
                    }
                    targetConfig = config;
                }
                if (id === "all") {
                    if (targetConfig[id]) {
                        console.error(chalk_1.default.red("Can't use id 'all' for OpenAPI docs configuration key."));
                    }
                    else {
                        Object.keys(targetConfig).forEach(async function (key) {
                            await generateApiDocs(targetConfig[key], targetDocsPluginId);
                            if (allVersions) {
                                await generateAllVersions(targetConfig[key], targetDocsPluginId);
                            }
                        });
                    }
                }
                else if (!targetConfig[id]) {
                    console.error(chalk_1.default.red(`ID '${id}' does not exist in OpenAPI docs config.`));
                }
                else {
                    await generateApiDocs(targetConfig[id], targetDocsPluginId);
                    if (allVersions) {
                        await generateAllVersions(targetConfig[id], targetDocsPluginId);
                    }
                }
            });
            cli
                .command(`gen-api-docs:version`)
                .description(`Generates versioned OpenAPI docs in MDX file format, versions.js and sidebar.ts (if enabled).`)
                .usage("<id:version>")
                .arguments("<id:version>")
                .option("-p, --plugin-id <plugin>", "OpenAPI docs plugin ID.")
                .action(async (id, instance) => {
                var _a;
                const options = instance.opts();
                const pluginId = options.pluginId;
                const pluginInstances = getPluginInstances(plugins);
                let targetConfig;
                let targetDocsPluginId;
                if (pluginId) {
                    try {
                        const pluginConfig = getPluginConfig(plugins, pluginId);
                        targetConfig = (_a = pluginConfig.config) !== null && _a !== void 0 ? _a : {};
                        targetDocsPluginId = pluginConfig.docsPluginId;
                    }
                    catch {
                        console.error(chalk_1.default.red(`OpenAPI docs plugin ID '${pluginId}' not found.`));
                        return;
                    }
                }
                else {
                    if (pluginInstances.length > 1) {
                        console.error(chalk_1.default.red("OpenAPI docs plugin ID must be specified when more than one plugin instance exists."));
                        return;
                    }
                    targetConfig = config;
                }
                const [parentId, versionId] = id.split(":");
                const parentConfig = Object.assign({}, targetConfig[parentId]);
                const version = parentConfig.version;
                const label = parentConfig.label;
                const baseUrl = parentConfig.baseUrl;
                let parentVersion = {};
                parentVersion[version] = { label: label, baseUrl: baseUrl };
                const { versions } = targetConfig[parentId];
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
                        console.error(chalk_1.default.red("Can't use id 'all' for OpenAPI docs versions configuration key."));
                    }
                    else {
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
                }
                else if (!versions[versionId]) {
                    console.error(chalk_1.default.red(`Version ID '${versionId}' does not exist in OpenAPI docs versions config.`));
                }
                else {
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
                .description(`Clears the generated OpenAPI docs MDX files and sidebar.ts (if enabled).`)
                .usage("<id>")
                .arguments("<id>")
                .option("-p, --plugin-id <plugin>", "OpenAPI docs plugin ID.")
                .option("--all-versions", "Clean all versions.")
                .action(async (id, instance) => {
                var _a;
                const options = instance.opts();
                const pluginId = options.pluginId;
                const allVersions = options.allVersions;
                const pluginInstances = getPluginInstances(plugins);
                let targetConfig;
                if (pluginId) {
                    try {
                        const pluginConfig = getPluginConfig(plugins, pluginId);
                        targetConfig = (_a = pluginConfig.config) !== null && _a !== void 0 ? _a : {};
                    }
                    catch {
                        console.error(chalk_1.default.red(`OpenAPI docs plugin ID '${pluginId}' not found.`));
                        return;
                    }
                }
                else {
                    if (pluginInstances.length > 1) {
                        console.error(chalk_1.default.red("OpenAPI docs plugin ID must be specified when more than one plugin instance exists."));
                        return;
                    }
                    targetConfig = config;
                }
                if (id === "all") {
                    if (targetConfig[id]) {
                        console.error(chalk_1.default.red("Can't use id 'all' for OpenAPI docs configuration key."));
                    }
                    else {
                        Object.keys(targetConfig).forEach(async function (key) {
                            await cleanApiDocs(targetConfig[key]);
                            if (allVersions) {
                                await cleanAllVersions(targetConfig[key]);
                            }
                        });
                    }
                }
                else {
                    await cleanApiDocs(targetConfig[id]);
                    if (allVersions) {
                        await cleanAllVersions(targetConfig[id]);
                    }
                }
            });
            cli
                .command(`clean-api-docs:version`)
                .description(`Clears the versioned, generated OpenAPI docs MDX files, versions.json and sidebar.ts (if enabled).`)
                .usage("<id:version>")
                .arguments("<id:version>")
                .option("-p, --plugin-id <plugin>", "OpenAPI docs plugin ID.")
                .action(async (id, instance) => {
                var _a;
                const options = instance.opts();
                const pluginId = options.pluginId;
                const pluginInstances = getPluginInstances(plugins);
                let targetConfig;
                if (pluginId) {
                    try {
                        const pluginConfig = getPluginConfig(plugins, pluginId);
                        targetConfig = (_a = pluginConfig.config) !== null && _a !== void 0 ? _a : {};
                    }
                    catch {
                        console.error(chalk_1.default.red(`OpenAPI docs plugin ID '${pluginId}' not found.`));
                        return;
                    }
                }
                else {
                    if (pluginInstances.length > 1) {
                        console.error(chalk_1.default.red("OpenAPI docs plugin ID must be specified when more than one plugin instance exists."));
                        return;
                    }
                    targetConfig = config;
                }
                const [parentId, versionId] = id.split(":");
                const { versions } = targetConfig[parentId];
                const parentConfig = Object.assign({}, targetConfig[parentId]);
                delete parentConfig.versions;
                if (versionId === "all") {
                    if (versions[id]) {
                        chalk_1.default.red("Can't use id 'all' for OpenAPI docs versions configuration key.");
                    }
                    else {
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
                }
                else {
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
pluginOpenAPIDocs.validateOptions = ({ options, validate }) => {
    const validatedOptions = validate(options_1.OptionsSchema, options);
    return validatedOptions;
};
