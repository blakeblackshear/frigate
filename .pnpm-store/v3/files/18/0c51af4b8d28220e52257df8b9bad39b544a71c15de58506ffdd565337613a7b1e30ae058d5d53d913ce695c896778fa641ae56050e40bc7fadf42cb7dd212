"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigSchema = exports.DEFAULT_CONFIG = exports.DEFAULT_MARKDOWN_CONFIG = exports.DEFAULT_MARKDOWN_HOOKS = exports.DEFAULT_FUTURE_CONFIG = exports.DEFAULT_FUTURE_V4_CONFIG_TRUE = exports.DEFAULT_FUTURE_V4_CONFIG = exports.DEFAULT_FASTER_CONFIG_TRUE = exports.DEFAULT_FASTER_CONFIG = exports.DEFAULT_STORAGE_CONFIG = exports.DEFAULT_I18N_CONFIG = void 0;
exports.validateConfig = validateConfig;
const tslib_1 = require("tslib");
const utils_1 = require("@docusaurus/utils");
const utils_validation_1 = require("@docusaurus/utils-validation");
const utils_common_1 = require("@docusaurus/utils-common");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const DEFAULT_I18N_LOCALE = 'en';
const SiteUrlSchema = utils_validation_1.Joi.string()
    .custom((value, helpers) => {
    try {
        const { pathname } = new URL(value);
        if (pathname !== '/') {
            return helpers.error('docusaurus.subPathError', { pathname });
        }
    }
    catch {
        return helpers.error('any.invalid');
    }
    return (0, utils_common_1.removeTrailingSlash)(value);
})
    .messages({
    'any.invalid': '"{#value}" does not look like a valid URL. Make sure it has a protocol; for example, "https://example.com".',
    'docusaurus.subPathError': 'The url is not supposed to contain a sub-path like "{#pathname}". Please use the baseUrl field for sub-paths.',
});
const BaseUrlSchema = utils_validation_1.Joi
    // Weird Joi trick needed, otherwise value '' is not normalized...
    .alternatives()
    .try(utils_validation_1.Joi.string().required().allow(''))
    .custom((value) => (0, utils_common_1.addLeadingSlash)((0, utils_common_1.addTrailingSlash)(value)));
exports.DEFAULT_I18N_CONFIG = {
    defaultLocale: DEFAULT_I18N_LOCALE,
    path: utils_1.DEFAULT_I18N_DIR_NAME,
    locales: [DEFAULT_I18N_LOCALE],
    localeConfigs: {},
};
exports.DEFAULT_STORAGE_CONFIG = {
    type: 'localStorage',
    namespace: false,
};
exports.DEFAULT_FASTER_CONFIG = {
    swcJsLoader: false,
    swcJsMinimizer: false,
    swcHtmlMinimizer: false,
    lightningCssMinimizer: false,
    mdxCrossCompilerCache: false,
    rspackBundler: false,
    rspackPersistentCache: false,
    ssgWorkerThreads: false,
};
// When using the "faster: true" shortcut
exports.DEFAULT_FASTER_CONFIG_TRUE = {
    swcJsLoader: true,
    swcJsMinimizer: true,
    swcHtmlMinimizer: true,
    lightningCssMinimizer: true,
    mdxCrossCompilerCache: true,
    rspackBundler: true,
    rspackPersistentCache: true,
    ssgWorkerThreads: true,
};
exports.DEFAULT_FUTURE_V4_CONFIG = {
    removeLegacyPostBuildHeadAttribute: false,
    useCssCascadeLayers: false,
};
// When using the "v4: true" shortcut
exports.DEFAULT_FUTURE_V4_CONFIG_TRUE = {
    removeLegacyPostBuildHeadAttribute: true,
    useCssCascadeLayers: true,
};
exports.DEFAULT_FUTURE_CONFIG = {
    v4: exports.DEFAULT_FUTURE_V4_CONFIG,
    experimental_faster: exports.DEFAULT_FASTER_CONFIG,
    experimental_storage: exports.DEFAULT_STORAGE_CONFIG,
    experimental_router: 'browser',
};
exports.DEFAULT_MARKDOWN_HOOKS = {
    onBrokenMarkdownLinks: 'warn',
    onBrokenMarkdownImages: 'throw',
};
exports.DEFAULT_MARKDOWN_CONFIG = {
    format: 'mdx', // TODO change this to "detect" in Docusaurus v4?
    mermaid: false,
    emoji: true,
    preprocessor: undefined,
    parseFrontMatter: utils_1.DEFAULT_PARSE_FRONT_MATTER,
    mdx1Compat: {
        comments: true,
        admonitions: true,
        headingIds: true,
    },
    anchors: {
        maintainCase: false,
    },
    remarkRehypeOptions: undefined,
    hooks: exports.DEFAULT_MARKDOWN_HOOKS,
};
exports.DEFAULT_CONFIG = {
    i18n: exports.DEFAULT_I18N_CONFIG,
    future: exports.DEFAULT_FUTURE_CONFIG,
    onBrokenLinks: 'throw',
    onBrokenAnchors: 'warn', // TODO Docusaurus v4: change to throw
    onBrokenMarkdownLinks: undefined,
    onDuplicateRoutes: 'warn',
    plugins: [],
    themes: [],
    presets: [],
    headTags: [],
    stylesheets: [],
    scripts: [],
    clientModules: [],
    customFields: {},
    themeConfig: {},
    titleDelimiter: '|',
    noIndex: false,
    tagline: '',
    baseUrlIssueBanner: true,
    staticDirectories: [utils_1.DEFAULT_STATIC_DIR_NAME],
    markdown: exports.DEFAULT_MARKDOWN_CONFIG,
};
function createPluginSchema(theme) {
    return utils_validation_1.Joi.alternatives()
        .try(utils_validation_1.Joi.function(), utils_validation_1.Joi.array()
        .ordered(utils_validation_1.Joi.function().required(), utils_validation_1.Joi.object().required())
        .length(2), utils_validation_1.Joi.string(), utils_validation_1.Joi.array()
        .ordered(utils_validation_1.Joi.string().required(), utils_validation_1.Joi.object().required())
        .length(2), utils_validation_1.Joi.any().valid(false, null))
        .error((errors) => {
        errors.forEach((error) => {
            const validConfigExample = theme
                ? `Example valid theme config:
{
  themes: [
    ["@docusaurus/theme-classic",options],
    "./myTheme",
    ["./myTheme",{someOption: 42}],
    function myTheme() { },
    [function myTheme() { },options]
  ],
};`
                : `Example valid plugin config:
{
  plugins: [
    ["@docusaurus/plugin-content-docs",options],
    "./myPlugin",
    ["./myPlugin",{someOption: 42}],
    function myPlugin() { },
    [function myPlugin() { },options]
  ],
};`;
            error.message = ` => Bad Docusaurus ${theme ? 'theme' : 'plugin'} value ${error.path.reduce((acc, cur) => typeof cur === 'string' ? `${acc}.${cur}` : `${acc}[${cur}]`)}.
${validConfigExample}
`;
        });
        return errors;
    });
}
const PluginSchema = createPluginSchema(false);
const ThemeSchema = createPluginSchema(true);
const PresetSchema = utils_validation_1.Joi.alternatives()
    .try(utils_validation_1.Joi.string(), utils_validation_1.Joi.array()
    .items(utils_validation_1.Joi.string().required(), utils_validation_1.Joi.object().required())
    .length(2), utils_validation_1.Joi.any().valid(false, null))
    .messages({
    'alternatives.types': `{#label} does not look like a valid preset config. A preset config entry should be one of:
- A tuple of [presetName, options], like \`["classic", \\{ blog: false \\}]\`, or
- A simple string, like \`"classic"\``,
});
const LocaleConfigSchema = utils_validation_1.Joi.object({
    label: utils_validation_1.Joi.string(),
    htmlLang: utils_validation_1.Joi.string(),
    direction: utils_validation_1.Joi.string().equal('ltr', 'rtl'),
    calendar: utils_validation_1.Joi.string(),
    path: utils_validation_1.Joi.string(),
    url: SiteUrlSchema,
    baseUrl: BaseUrlSchema,
});
const I18N_CONFIG_SCHEMA = utils_validation_1.Joi.object({
    defaultLocale: utils_validation_1.Joi.string().required(),
    path: utils_validation_1.Joi.string().default(exports.DEFAULT_I18N_CONFIG.path),
    locales: utils_validation_1.Joi.array().items().min(1).items(utils_validation_1.Joi.string().required()).required(),
    localeConfigs: utils_validation_1.Joi.object()
        .pattern(/.*/, LocaleConfigSchema)
        .default(exports.DEFAULT_I18N_CONFIG.localeConfigs),
})
    .optional()
    .default(exports.DEFAULT_I18N_CONFIG);
const FASTER_CONFIG_SCHEMA = utils_validation_1.Joi.alternatives()
    .try(utils_validation_1.Joi.object({
    swcJsLoader: utils_validation_1.Joi.boolean().default(exports.DEFAULT_FASTER_CONFIG.swcJsLoader),
    swcJsMinimizer: utils_validation_1.Joi.boolean().default(exports.DEFAULT_FASTER_CONFIG.swcJsMinimizer),
    swcHtmlMinimizer: utils_validation_1.Joi.boolean().default(exports.DEFAULT_FASTER_CONFIG.swcHtmlMinimizer),
    lightningCssMinimizer: utils_validation_1.Joi.boolean().default(exports.DEFAULT_FASTER_CONFIG.lightningCssMinimizer),
    mdxCrossCompilerCache: utils_validation_1.Joi.boolean().default(exports.DEFAULT_FASTER_CONFIG.mdxCrossCompilerCache),
    rspackBundler: utils_validation_1.Joi.boolean().default(exports.DEFAULT_FASTER_CONFIG.rspackBundler),
    rspackPersistentCache: utils_validation_1.Joi.boolean().default(exports.DEFAULT_FASTER_CONFIG.rspackPersistentCache),
    ssgWorkerThreads: utils_validation_1.Joi.boolean().default(exports.DEFAULT_FASTER_CONFIG.ssgWorkerThreads),
}), utils_validation_1.Joi.boolean()
    .required()
    .custom((bool) => bool ? exports.DEFAULT_FASTER_CONFIG_TRUE : exports.DEFAULT_FASTER_CONFIG))
    .optional()
    .default(exports.DEFAULT_FASTER_CONFIG);
const FUTURE_V4_SCHEMA = utils_validation_1.Joi.alternatives()
    .try(utils_validation_1.Joi.object({
    removeLegacyPostBuildHeadAttribute: utils_validation_1.Joi.boolean().default(exports.DEFAULT_FUTURE_V4_CONFIG.removeLegacyPostBuildHeadAttribute),
    useCssCascadeLayers: utils_validation_1.Joi.boolean().default(exports.DEFAULT_FUTURE_V4_CONFIG.useCssCascadeLayers),
}), utils_validation_1.Joi.boolean()
    .required()
    .custom((bool) => bool ? exports.DEFAULT_FUTURE_V4_CONFIG_TRUE : exports.DEFAULT_FUTURE_V4_CONFIG))
    .optional()
    .default(exports.DEFAULT_FUTURE_V4_CONFIG);
const STORAGE_CONFIG_SCHEMA = utils_validation_1.Joi.object({
    type: utils_validation_1.Joi.string()
        .equal('localStorage', 'sessionStorage')
        .default(exports.DEFAULT_STORAGE_CONFIG.type),
    namespace: utils_validation_1.Joi.alternatives()
        .try(utils_validation_1.Joi.string(), utils_validation_1.Joi.boolean())
        .default(exports.DEFAULT_STORAGE_CONFIG.namespace),
})
    .optional()
    .default(exports.DEFAULT_STORAGE_CONFIG);
const FUTURE_CONFIG_SCHEMA = utils_validation_1.Joi.object({
    v4: FUTURE_V4_SCHEMA,
    experimental_faster: FASTER_CONFIG_SCHEMA,
    experimental_storage: STORAGE_CONFIG_SCHEMA,
    experimental_router: utils_validation_1.Joi.string()
        .equal('browser', 'hash')
        .default(exports.DEFAULT_FUTURE_CONFIG.experimental_router),
})
    .optional()
    .default(exports.DEFAULT_FUTURE_CONFIG);
// TODO move to @docusaurus/utils-validation
exports.ConfigSchema = utils_validation_1.Joi.object({
    url: SiteUrlSchema.required(),
    baseUrl: BaseUrlSchema.required(),
    baseUrlIssueBanner: utils_validation_1.Joi.boolean().default(exports.DEFAULT_CONFIG.baseUrlIssueBanner),
    favicon: utils_validation_1.Joi.string().optional(),
    title: utils_validation_1.Joi.string().required(),
    trailingSlash: utils_validation_1.Joi.boolean(), // No default value! undefined = retrocompatible legacy behavior!
    i18n: I18N_CONFIG_SCHEMA,
    future: FUTURE_CONFIG_SCHEMA,
    onBrokenLinks: utils_validation_1.Joi.string()
        .equal('ignore', 'log', 'warn', 'throw')
        .default(exports.DEFAULT_CONFIG.onBrokenLinks),
    onBrokenAnchors: utils_validation_1.Joi.string()
        .equal('ignore', 'log', 'warn', 'throw')
        .default(exports.DEFAULT_CONFIG.onBrokenAnchors),
    onBrokenMarkdownLinks: utils_validation_1.Joi.string()
        .equal('ignore', 'log', 'warn', 'throw')
        .default(() => exports.DEFAULT_CONFIG.onBrokenMarkdownLinks),
    onDuplicateRoutes: utils_validation_1.Joi.string()
        .equal('ignore', 'log', 'warn', 'throw')
        .default(exports.DEFAULT_CONFIG.onDuplicateRoutes),
    organizationName: utils_validation_1.Joi.string().allow(''),
    staticDirectories: utils_validation_1.Joi.array()
        .items(utils_validation_1.Joi.string())
        .default(exports.DEFAULT_CONFIG.staticDirectories),
    projectName: utils_validation_1.Joi.string().allow(''),
    deploymentBranch: utils_validation_1.Joi.string().optional(),
    customFields: utils_validation_1.Joi.object().unknown().default(exports.DEFAULT_CONFIG.customFields),
    githubHost: utils_validation_1.Joi.string(),
    githubPort: utils_validation_1.Joi.string(),
    plugins: utils_validation_1.Joi.array().items(PluginSchema).default(exports.DEFAULT_CONFIG.plugins),
    themes: utils_validation_1.Joi.array().items(ThemeSchema).default(exports.DEFAULT_CONFIG.themes),
    presets: utils_validation_1.Joi.array().items(PresetSchema).default(exports.DEFAULT_CONFIG.presets),
    themeConfig: utils_validation_1.Joi.object().unknown().default(exports.DEFAULT_CONFIG.themeConfig),
    scripts: utils_validation_1.Joi.array()
        .items(utils_validation_1.Joi.string(), utils_validation_1.Joi.object({
        src: utils_validation_1.Joi.string().required(),
        async: utils_validation_1.Joi.bool(),
        defer: utils_validation_1.Joi.bool(),
    })
        // See https://github.com/facebook/docusaurus/issues/3378
        .unknown())
        .messages({
        'array.includes': '{#label} is invalid. A script must be a plain string (the src), or an object with at least a "src" property.',
    })
        .default(exports.DEFAULT_CONFIG.scripts),
    ssrTemplate: utils_validation_1.Joi.string(),
    headTags: utils_validation_1.Joi.array()
        .items(utils_validation_1.Joi.object({
        tagName: utils_validation_1.Joi.string().required(),
        attributes: utils_validation_1.Joi.object()
            .pattern(/[\w-]+/, utils_validation_1.Joi.string())
            .required(),
    }).unknown())
        .messages({
        'array.includes': '{#label} is invalid. A headTag must be an object with at least a "tagName" and an "attributes" property.',
    })
        .default(exports.DEFAULT_CONFIG.headTags),
    stylesheets: utils_validation_1.Joi.array()
        .items(utils_validation_1.Joi.string(), utils_validation_1.Joi.object({
        href: utils_validation_1.Joi.string().required(),
        type: utils_validation_1.Joi.string(),
    }).unknown())
        .messages({
        'array.includes': '{#label} is invalid. A stylesheet must be a plain string (the href), or an object with at least a "href" property.',
    })
        .default(exports.DEFAULT_CONFIG.stylesheets),
    clientModules: utils_validation_1.Joi.array()
        .items(utils_validation_1.Joi.string())
        .default(exports.DEFAULT_CONFIG.clientModules),
    tagline: utils_validation_1.Joi.string().allow('').default(exports.DEFAULT_CONFIG.tagline),
    titleDelimiter: utils_validation_1.Joi.string().default(exports.DEFAULT_CONFIG.titleDelimiter),
    noIndex: utils_validation_1.Joi.bool().default(exports.DEFAULT_CONFIG.noIndex),
    webpack: utils_validation_1.Joi.object({
        jsLoader: utils_validation_1.Joi.alternatives()
            .try(utils_validation_1.Joi.string().equal('babel'), utils_validation_1.Joi.function())
            .optional(),
    }).optional(),
    markdown: utils_validation_1.Joi.object({
        format: utils_validation_1.Joi.string()
            .equal('mdx', 'md', 'detect')
            .default(exports.DEFAULT_CONFIG.markdown.format),
        parseFrontMatter: utils_validation_1.Joi.function().default(() => exports.DEFAULT_CONFIG.markdown.parseFrontMatter),
        mermaid: utils_validation_1.Joi.boolean().default(exports.DEFAULT_CONFIG.markdown.mermaid),
        emoji: utils_validation_1.Joi.boolean().default(exports.DEFAULT_CONFIG.markdown.emoji),
        preprocessor: utils_validation_1.Joi.function()
            .arity(1)
            .optional()
            .default(() => exports.DEFAULT_CONFIG.markdown.preprocessor),
        mdx1Compat: utils_validation_1.Joi.object({
            comments: utils_validation_1.Joi.boolean().default(exports.DEFAULT_CONFIG.markdown.mdx1Compat.comments),
            admonitions: utils_validation_1.Joi.boolean().default(exports.DEFAULT_CONFIG.markdown.mdx1Compat.admonitions),
            headingIds: utils_validation_1.Joi.boolean().default(exports.DEFAULT_CONFIG.markdown.mdx1Compat.headingIds),
        }).default(exports.DEFAULT_CONFIG.markdown.mdx1Compat),
        remarkRehypeOptions: 
        // add proper external options validation?
        // Not sure if it's a good idea, validation is likely to become stale
        // See https://github.com/remarkjs/remark-rehype#options
        utils_validation_1.Joi.object().unknown(),
        anchors: utils_validation_1.Joi.object({
            maintainCase: utils_validation_1.Joi.boolean().default(exports.DEFAULT_CONFIG.markdown.anchors.maintainCase),
        }).default(exports.DEFAULT_CONFIG.markdown.anchors),
        hooks: utils_validation_1.Joi.object({
            onBrokenMarkdownLinks: utils_validation_1.Joi.alternatives()
                .try(utils_validation_1.Joi.string().equal('ignore', 'log', 'warn', 'throw'), utils_validation_1.Joi.function())
                .default(exports.DEFAULT_CONFIG.markdown.hooks.onBrokenMarkdownLinks),
            onBrokenMarkdownImages: utils_validation_1.Joi.alternatives()
                .try(utils_validation_1.Joi.string().equal('ignore', 'log', 'warn', 'throw'), utils_validation_1.Joi.function())
                .default(exports.DEFAULT_CONFIG.markdown.hooks.onBrokenMarkdownImages),
        }).default(exports.DEFAULT_CONFIG.markdown.hooks),
    }).default(exports.DEFAULT_CONFIG.markdown),
}).messages({
    'docusaurus.configValidationWarning': 'Docusaurus config validation warning. Field {#label}: {#warningMessage}',
});
// Expressing this kind of logic in Joi is a pain
// We also want to decouple logic from Joi: easier to remove it later!
function postProcessDocusaurusConfig(config) {
    if (config.onBrokenMarkdownLinks) {
        logger_1.default.warn `The code=${'siteConfig.onBrokenMarkdownLinks'} config option is deprecated and will be removed in Docusaurus v4.
Please migrate and move this option to code=${'siteConfig.markdown.hooks.onBrokenMarkdownLinks'} instead.`;
        // For v3 retro compatibility we use the old attribute over the new one
        config.markdown.hooks.onBrokenMarkdownLinks = config.onBrokenMarkdownLinks;
        // We erase the former one to ensure we don't use it anywhere
        config.onBrokenMarkdownLinks = undefined;
    }
    if (config.future.experimental_faster.ssgWorkerThreads &&
        !config.future.v4.removeLegacyPostBuildHeadAttribute) {
        throw new Error(`Docusaurus config ${logger_1.default.code('future.experimental_faster.ssgWorkerThreads')} requires the future flag ${logger_1.default.code('future.v4.removeLegacyPostBuildHeadAttribute')} to be turned on.
If you use Docusaurus Faster, we recommend that you also activate Docusaurus v4 future flags: ${logger_1.default.code('{future: {v4: true}}')}
All the v4 future flags are documented here: https://docusaurus.io/docs/api/docusaurus-config#future`);
    }
    if (config.future.experimental_faster.rspackPersistentCache &&
        !config.future.experimental_faster.rspackBundler) {
        throw new Error(`Docusaurus config flag ${logger_1.default.code('future.experimental_faster.rspackPersistentCache')} requires the flag ${logger_1.default.code('future.experimental_faster.rspackBundler')} to be turned on.`);
    }
}
// TODO move to @docusaurus/utils-validation
function validateConfig(config, siteConfigPath) {
    const { error, warning, value } = exports.ConfigSchema.validate(config, {
        abortEarly: false,
    });
    (0, utils_validation_1.printWarning)(warning);
    if (error) {
        const unknownFields = error.details.reduce((formattedError, err) => {
            if (err.type === 'object.unknown') {
                return `${formattedError}"${err.path.reduce((acc, cur) => typeof cur === 'string' ? `${acc}.${cur}` : `${acc}[${cur}]`)}",`;
            }
            return formattedError;
        }, '');
        let formattedError = error.details.reduce((accumulatedErr, err) => err.type !== 'object.unknown'
            ? `${accumulatedErr}${err.message}\n`
            : accumulatedErr, '');
        formattedError = unknownFields
            ? `${formattedError}These field(s) (${unknownFields}) are not recognized in ${siteConfigPath}.\nIf you still want these fields to be in your configuration, put them in the "customFields" field.\nSee https://docusaurus.io/docs/api/docusaurus-config/#customfields`
            : formattedError;
        throw new Error(formattedError);
    }
    postProcessDocusaurusConfig(value);
    return value;
}
