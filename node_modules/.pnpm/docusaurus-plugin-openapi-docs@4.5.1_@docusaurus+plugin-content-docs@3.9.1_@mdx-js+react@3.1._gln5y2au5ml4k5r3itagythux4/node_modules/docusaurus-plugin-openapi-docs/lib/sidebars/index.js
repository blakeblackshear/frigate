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
exports.default = generateSidebarSlice;
const path_1 = __importDefault(require("path"));
const utils_1 = require("@docusaurus/utils");
const clsx_1 = __importDefault(require("clsx"));
const lodash_1 = require("lodash");
const uniq_1 = __importDefault(require("lodash/uniq"));
function isApiItem(item) {
    return item.type === "api";
}
function isInfoItem(item) {
    return item.type === "info";
}
function isSchemaItem(item) {
    return item.type === "schema";
}
const createDocItem = (item, { sidebarOptions: { customProps }, basePath }) => {
    var _a, _b;
    const sidebar_label = item.frontMatter.sidebar_label;
    const title = item.title;
    const id = item.type === "schema" ? `schemas/${item.id}` : item.id;
    const className = item.type === "api"
        ? (0, clsx_1.default)({
            "menu__list-item--deprecated": item.api.deprecated,
            "api-method": !!item.api.method,
        }, item.api.method)
        : (0, clsx_1.default)({
            "menu__list-item--deprecated": item.schema.deprecated,
        }, "schema");
    return {
        type: "doc",
        id: basePath === "" || undefined ? `${id}` : `${basePath}/${id}`,
        label: (_b = (_a = sidebar_label) !== null && _a !== void 0 ? _a : title) !== null && _b !== void 0 ? _b : id,
        customProps: customProps,
        className: className ? className : undefined,
    };
};
function groupByTags(items, sidebarOptions, options, tags, docPath) {
    var _a, _b;
    let { outputDir, label, showSchemas } = options;
    // Remove trailing slash before proceeding
    outputDir = outputDir.replace(/\/$/, "");
    const { sidebarCollapsed, sidebarCollapsible, categoryLinkSource } = sidebarOptions;
    const apiItems = items.filter(isApiItem);
    const infoItems = items.filter(isInfoItem);
    const schemaItems = items.filter(isSchemaItem);
    const intros = infoItems.map((item) => {
        return {
            id: item.id,
            title: item.title,
            description: item.description,
            tags: item.info.tags,
        };
    });
    // TODO: make sure we only take the first tag
    const operationTags = (0, uniq_1.default)(apiItems
        .flatMap((item) => item.api.tags)
        .filter((item) => !!item));
    const schemaTags = (0, uniq_1.default)(schemaItems
        .flatMap((item) => item.schema["x-tags"])
        .filter((item) => !!item));
    // Combine globally defined tags with operation and schema tags
    // Only include global tag if referenced in operation/schema tags
    let apiTags = [];
    tags.flat().forEach((tag) => {
        // Should we also check x-displayName?
        if (operationTags.includes(tag.name) || schemaTags.includes(tag.name)) {
            apiTags.push(tag.name);
        }
    });
    if (sidebarOptions.groupPathsBy !== "tagGroup") {
        apiTags = (0, uniq_1.default)(apiTags.concat(operationTags, schemaTags));
    }
    const basePath = docPath
        ? outputDir.split(docPath)[1].replace(/^\/+/g, "")
        : outputDir.slice(outputDir.indexOf("/", 1)).replace(/^\/+/g, "");
    const createDocItemFnContext = {
        sidebarOptions,
        basePath,
    };
    const createDocItemFn = (_b = (_a = sidebarOptions.sidebarGenerators) === null || _a === void 0 ? void 0 : _a.createDocItem) !== null && _b !== void 0 ? _b : createDocItem;
    let rootIntroDoc = undefined;
    if (infoItems.length === 1) {
        const infoItem = infoItems[0];
        const id = infoItem.id;
        rootIntroDoc = {
            type: "doc",
            id: basePath === "" || undefined ? `${id}` : `${basePath}/${id}`,
        };
    }
    const tagged = apiTags
        .map((tag) => {
        var _a;
        // Map info object to tag
        const taggedInfoObject = intros.find((i) => i.tags ? i.tags.find((t) => t.name === tag) : undefined);
        const tagObject = tags.flat().find((t) => tag === t.name && {
            name: tag,
            description: `${tag} Index`,
        });
        // TODO: perhaps move this into a getLinkConfig() function
        // Default to no link config (spindowns only)
        let linkConfig = undefined;
        if (taggedInfoObject !== undefined && categoryLinkSource === "info") {
            linkConfig = {
                type: "doc",
                id: basePath === "" || undefined
                    ? `${taggedInfoObject.id}`
                    : `${basePath}/${taggedInfoObject.id}`,
            };
        }
        // TODO: perhaps move this into a getLinkConfig() function
        if (tagObject !== undefined && categoryLinkSource === "tag") {
            const tagId = (0, lodash_1.kebabCase)(tagObject.name);
            linkConfig = {
                type: "doc",
                id: basePath === "" || undefined ? `${tagId}` : `${basePath}/${tagId}`,
            };
        }
        if (categoryLinkSource === "auto") {
            linkConfig = {
                type: "generated-index",
                title: tag,
                slug: label
                    ? (0, utils_1.posixPath)(path_1.default.join("/category", basePath, (0, lodash_1.kebabCase)(label), (0, lodash_1.kebabCase)(tag)))
                    : (0, utils_1.posixPath)(path_1.default.join("/category", basePath, (0, lodash_1.kebabCase)(tag))),
            };
        }
        const taggedApiItems = apiItems.filter((item) => { var _a; return !!((_a = item.api.tags) === null || _a === void 0 ? void 0 : _a.includes(tag)); });
        const taggedSchemaItems = schemaItems.filter((item) => { var _a; return !!((_a = item.schema["x-tags"]) === null || _a === void 0 ? void 0 : _a.includes(tag)); });
        return {
            type: "category",
            label: (_a = tagObject === null || tagObject === void 0 ? void 0 : tagObject["x-displayName"]) !== null && _a !== void 0 ? _a : tag,
            link: linkConfig,
            collapsible: sidebarCollapsible,
            collapsed: sidebarCollapsed,
            items: [...taggedSchemaItems, ...taggedApiItems].map((item) => createDocItemFn(item, createDocItemFnContext)),
        };
    })
        .filter((item) => item.items.length > 0); // Filter out any categories with no items.
    // Handle items with no tag
    const untaggedItems = apiItems
        .filter(({ api }) => api.tags === undefined || api.tags.length === 0)
        .map((item) => createDocItemFn(item, createDocItemFnContext));
    let untagged = [];
    if (untaggedItems.length > 0) {
        untagged = [
            {
                type: "category",
                label: "UNTAGGED",
                collapsible: sidebarCollapsible,
                collapsed: sidebarCollapsed,
                items: apiItems
                    .filter(({ api }) => api.tags === undefined || api.tags.length === 0)
                    .map((item) => createDocItemFn(item, createDocItemFnContext)),
            },
        ];
    }
    let schemas = [];
    if (showSchemas && schemaItems.length > 0) {
        schemas = [
            {
                type: "category",
                label: "Schemas",
                collapsible: sidebarCollapsible,
                collapsed: sidebarCollapsed,
                items: schemaItems
                    .filter(({ schema }) => !schema["x-tags"])
                    .map((item) => createDocItemFn(item, createDocItemFnContext)),
            },
        ];
    }
    // Shift root intro doc to top of sidebar
    // TODO: Add input validation for categoryLinkSource options
    if (rootIntroDoc && categoryLinkSource !== "info") {
        tagged.unshift(rootIntroDoc);
    }
    return [...tagged, ...untagged, ...schemas];
}
function generateSidebarSlice(sidebarOptions, options, api, tags, docPath, tagGroups) {
    let sidebarSlice = [];
    if (sidebarOptions.groupPathsBy === "tagGroup") {
        let schemasGroup = [];
        tagGroups === null || tagGroups === void 0 ? void 0 : tagGroups.forEach((tagGroup) => {
            var _a;
            //filter tags only included in group
            const filteredTags = [];
            tags[0].forEach((tag) => {
                if (tagGroup.tags.includes(tag.name)) {
                    filteredTags.push(tag);
                }
            });
            const groupCategory = {
                type: "category",
                label: tagGroup.name,
                collapsible: true,
                collapsed: true,
                items: groupByTags(api, sidebarOptions, options, [filteredTags], docPath),
            };
            if (options.showSchemas) {
                // For the first tagGroup, save the generated "Schemas" category for later.
                if (schemasGroup.length === 0) {
                    schemasGroup = (_a = groupCategory.items) === null || _a === void 0 ? void 0 : _a.filter((item) => item.type === "category" && item.label === "Schemas");
                }
                // Remove the "Schemas" category from every `groupCategory`.
                groupCategory.items = groupCategory.items.filter((item) => "label" in item ? item.label !== "Schemas" : true);
            }
            sidebarSlice.push(groupCategory);
        });
        // Add `schemasGroup` to the end of the sidebar.
        sidebarSlice.push(...schemasGroup);
    }
    else if (sidebarOptions.groupPathsBy === "tag") {
        sidebarSlice = groupByTags(api, sidebarOptions, options, tags, docPath);
    }
    return sidebarSlice;
}
