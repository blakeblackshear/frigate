"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_OPTIONS = void 0;
exports.validateOptions = validateOptions;
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_validation_1 = require("@docusaurus/utils-validation");
const utils_1 = require("@docusaurus/utils");
const generator_1 = require("./sidebars/generator");
const numberPrefix_1 = require("./numberPrefix");
exports.DEFAULT_OPTIONS = {
    path: 'docs', // Path to data on filesystem, relative to site dir.
    routeBasePath: 'docs', // URL Route.
    tagsBasePath: 'tags', // URL Tags Route.
    include: ['**/*.{md,mdx}'], // Extensions to include.
    exclude: utils_1.GlobExcludeDefault,
    sidebarItemsGenerator: generator_1.DefaultSidebarItemsGenerator,
    numberPrefixParser: numberPrefix_1.DefaultNumberPrefixParser,
    docsRootComponent: '@theme/DocsRoot',
    docVersionRootComponent: '@theme/DocVersionRoot',
    docRootComponent: '@theme/DocRoot',
    docItemComponent: '@theme/DocItem',
    docTagDocListComponent: '@theme/DocTagDocListPage',
    docTagsListComponent: '@theme/DocTagsListPage',
    docCategoryGeneratedIndexComponent: '@theme/DocCategoryGeneratedIndexPage',
    remarkPlugins: [],
    rehypePlugins: [],
    recmaPlugins: [],
    beforeDefaultRemarkPlugins: [],
    beforeDefaultRehypePlugins: [],
    showLastUpdateTime: false,
    showLastUpdateAuthor: false,
    admonitions: true,
    includeCurrentVersion: true,
    disableVersioning: false,
    lastVersion: undefined,
    versions: {},
    editCurrentVersion: false,
    editLocalizedFiles: false,
    sidebarCollapsible: true,
    sidebarCollapsed: true,
    breadcrumbs: true,
    onInlineTags: 'warn',
    tags: undefined,
};
const VersionOptionsSchema = utils_validation_1.Joi.object({
    path: utils_validation_1.Joi.string().allow('').optional(),
    label: utils_validation_1.Joi.string().optional(),
    banner: utils_validation_1.Joi.string().equal('none', 'unreleased', 'unmaintained').optional(),
    badge: utils_validation_1.Joi.boolean().optional(),
    className: utils_validation_1.Joi.string().optional(),
    noIndex: utils_validation_1.Joi.boolean().optional(),
});
const VersionsOptionsSchema = utils_validation_1.Joi.object()
    .pattern(utils_validation_1.Joi.string().required(), VersionOptionsSchema)
    .default(exports.DEFAULT_OPTIONS.versions);
const OptionsSchema = utils_validation_1.Joi.object({
    path: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.path),
    editUrl: utils_validation_1.Joi.alternatives().try(utils_validation_1.URISchema, utils_validation_1.Joi.function()),
    editCurrentVersion: utils_validation_1.Joi.boolean().default(exports.DEFAULT_OPTIONS.editCurrentVersion),
    editLocalizedFiles: utils_validation_1.Joi.boolean().default(exports.DEFAULT_OPTIONS.editLocalizedFiles),
    routeBasePath: utils_validation_1.RouteBasePathSchema.default(exports.DEFAULT_OPTIONS.routeBasePath),
    tagsBasePath: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.tagsBasePath),
    // @ts-expect-error: deprecated
    homePageId: utils_validation_1.Joi.any().forbidden().messages({
        'any.unknown': 'The docs plugin option homePageId is not supported anymore. To make a doc the "home", please add "slug: /" in its front matter. See: https://docusaurus.io/docs/next/docs-introduction#home-page-docs',
    }),
    include: utils_validation_1.Joi.array().items(utils_validation_1.Joi.string()).default(exports.DEFAULT_OPTIONS.include),
    exclude: utils_validation_1.Joi.array().items(utils_validation_1.Joi.string()).default(exports.DEFAULT_OPTIONS.exclude),
    sidebarPath: utils_validation_1.Joi.alternatives().try(utils_validation_1.Joi.boolean().invalid(true), utils_validation_1.Joi.string()),
    sidebarItemsGenerator: utils_validation_1.Joi.function().default(() => exports.DEFAULT_OPTIONS.sidebarItemsGenerator),
    sidebarCollapsible: utils_validation_1.Joi.boolean().default(exports.DEFAULT_OPTIONS.sidebarCollapsible),
    sidebarCollapsed: utils_validation_1.Joi.boolean().default(exports.DEFAULT_OPTIONS.sidebarCollapsed),
    numberPrefixParser: utils_validation_1.Joi.alternatives()
        .try(utils_validation_1.Joi.function(), 
    // Convert boolean values to functions
    utils_validation_1.Joi.alternatives().conditional(utils_validation_1.Joi.boolean(), {
        then: utils_validation_1.Joi.custom((val) => val ? numberPrefix_1.DefaultNumberPrefixParser : numberPrefix_1.DisabledNumberPrefixParser),
    }))
        .default(() => exports.DEFAULT_OPTIONS.numberPrefixParser),
    docsRootComponent: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.docsRootComponent),
    docVersionRootComponent: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.docVersionRootComponent),
    docRootComponent: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.docRootComponent),
    docItemComponent: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.docItemComponent),
    docTagsListComponent: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.docTagsListComponent),
    docTagDocListComponent: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.docTagDocListComponent),
    docCategoryGeneratedIndexComponent: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.docCategoryGeneratedIndexComponent),
    remarkPlugins: utils_validation_1.RemarkPluginsSchema.default(exports.DEFAULT_OPTIONS.remarkPlugins),
    rehypePlugins: utils_validation_1.RehypePluginsSchema.default(exports.DEFAULT_OPTIONS.rehypePlugins),
    recmaPlugins: utils_validation_1.RecmaPluginsSchema.default(exports.DEFAULT_OPTIONS.recmaPlugins),
    beforeDefaultRemarkPlugins: utils_validation_1.RemarkPluginsSchema.default(exports.DEFAULT_OPTIONS.beforeDefaultRemarkPlugins),
    beforeDefaultRehypePlugins: utils_validation_1.RehypePluginsSchema.default(exports.DEFAULT_OPTIONS.beforeDefaultRehypePlugins),
    admonitions: utils_validation_1.AdmonitionsSchema.default(exports.DEFAULT_OPTIONS.admonitions),
    showLastUpdateTime: utils_validation_1.Joi.bool().default(exports.DEFAULT_OPTIONS.showLastUpdateTime),
    showLastUpdateAuthor: utils_validation_1.Joi.bool().default(exports.DEFAULT_OPTIONS.showLastUpdateAuthor),
    includeCurrentVersion: utils_validation_1.Joi.bool().default(exports.DEFAULT_OPTIONS.includeCurrentVersion),
    onlyIncludeVersions: utils_validation_1.Joi.array().items(utils_validation_1.Joi.string().required()).optional(),
    disableVersioning: utils_validation_1.Joi.bool().default(exports.DEFAULT_OPTIONS.disableVersioning),
    lastVersion: utils_validation_1.Joi.string().optional(),
    versions: VersionsOptionsSchema,
    breadcrumbs: utils_validation_1.Joi.bool().default(exports.DEFAULT_OPTIONS.breadcrumbs),
    onInlineTags: utils_validation_1.Joi.string()
        .equal('ignore', 'log', 'warn', 'throw')
        .default(exports.DEFAULT_OPTIONS.onInlineTags),
    tags: utils_validation_1.Joi.string()
        .disallow('')
        .allow(null, false)
        .default(() => exports.DEFAULT_OPTIONS.tags),
});
function validateOptions({ validate, options: userOptions, }) {
    let options = userOptions;
    if (options.sidebarCollapsible === false) {
        // When sidebarCollapsible=false and sidebarCollapsed=undefined, we don't
        // want to have the inconsistency warning. We let options.sidebarCollapsible
        // become the default value for options.sidebarCollapsed
        if (typeof options.sidebarCollapsed === 'undefined') {
            options = {
                ...options,
                sidebarCollapsed: false,
            };
        }
        if (options.sidebarCollapsed) {
            logger_1.default.warn `The docs plugin config is inconsistent. It does not make sense to use code=${'sidebarCollapsible: false'} and code=${'sidebarCollapsed: true'} at the same time. code=${'sidebarCollapsed: true'} will be ignored.`;
            options = {
                ...options,
                sidebarCollapsed: false,
            };
        }
    }
    const normalizedOptions = validate(OptionsSchema, options);
    return normalizedOptions;
}
