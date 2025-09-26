"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontMatterLastUpdateSchema = exports.FrontMatterLastUpdateErrorMessage = exports.ContentVisibilitySchema = exports.FrontMatterTOCHeadingLevels = exports.FrontMatterTagsSchema = exports.RouteBasePathSchema = exports.PathnameSchema = exports.URISchema = exports.AdmonitionsSchema = exports.RecmaPluginsSchema = exports.RehypePluginsSchema = exports.RemarkPluginsSchema = exports.PluginIdSchema = void 0;
const tslib_1 = require("tslib");
const utils_1 = require("@docusaurus/utils");
const utils_common_1 = require("@docusaurus/utils-common");
const Joi_1 = tslib_1.__importDefault(require("./Joi"));
const JoiFrontMatter_1 = require("./JoiFrontMatter");
exports.PluginIdSchema = Joi_1.default.string()
    .regex(/^[\w-]+$/)
    .message('Illegal plugin ID value "{#value}": it should only contain alphanumerics, underscores, and dashes.')
    .default(utils_1.DEFAULT_PLUGIN_ID);
const MarkdownPluginsSchema = Joi_1.default.array()
    .items(Joi_1.default.array().ordered(Joi_1.default.function().required(), Joi_1.default.any().required()), Joi_1.default.function(), Joi_1.default.object())
    .messages({
    'array.includes': `{#label} does not look like a valid MDX plugin config. A plugin config entry should be one of:
- A tuple, like \`[require("rehype-katex"), \\{ strict: false \\}]\`, or
- A simple module, like \`require("remark-math")\``,
})
    .default([]);
exports.RemarkPluginsSchema = MarkdownPluginsSchema;
exports.RehypePluginsSchema = MarkdownPluginsSchema;
exports.RecmaPluginsSchema = MarkdownPluginsSchema;
exports.AdmonitionsSchema = JoiFrontMatter_1.JoiFrontMatter.alternatives()
    .try(JoiFrontMatter_1.JoiFrontMatter.boolean().required(), JoiFrontMatter_1.JoiFrontMatter.object({
    keywords: JoiFrontMatter_1.JoiFrontMatter.array().items(JoiFrontMatter_1.JoiFrontMatter.string()),
    extendDefaults: JoiFrontMatter_1.JoiFrontMatter.boolean(),
    // TODO Remove before 2024
    tag: Joi_1.default.any().forbidden().messages({
        'any.unknown': `It is not possible anymore to use a custom admonition tag. The only admonition tag supported is ':::' (Markdown Directive syntax)`,
    }),
}).required())
    .default(true)
    .messages({
    'alternatives.types': '{{#label}} does not look like a valid admonitions config',
});
// TODO how can we make this emit a custom error message :'(
//  Joi is such a pain, good luck to annoying trying to improve this
exports.URISchema = Joi_1.default.alternatives(Joi_1.default.string().uri({ allowRelative: true }), 
// This custom validation logic is required notably because Joi does not
// accept paths like /a/b/c ...
Joi_1.default.custom((val, helpers) => {
    if (typeof val !== 'string') {
        return helpers.error('any.invalid');
    }
    try {
        // eslint-disable-next-line no-new
        new URL(String(val));
        return val;
    }
    catch {
        return helpers.error('any.invalid');
    }
})).messages({
    'alternatives.match': "{{#label}} does not look like a valid url (value='{{.value}}')",
});
exports.PathnameSchema = Joi_1.default.string()
    .custom((val) => {
    if (!(0, utils_1.isValidPathname)(val)) {
        throw new Error();
    }
    return val;
})
    .message('{{#label}} ({{#value}}) is not a valid pathname. Pathname should start with slash and not contain any domain or query string.');
// Normalized schema for url path segments: baseUrl + routeBasePath...
// Note we only add a leading slash
// we don't always want to enforce a trailing slash on urls such as /docs
//
// Examples:
// '' => '/'
// 'docs' => '/docs'
// '/docs' => '/docs'
// 'docs/' => '/docs'
// 'prefix/docs' => '/prefix/docs'
// TODO tighter validation: not all strings are valid path segments
exports.RouteBasePathSchema = Joi_1.default
    // Weird Joi trick needed, otherwise value '' is not normalized...
    .alternatives()
    .try(Joi_1.default.string().required().allow(''))
    .custom((value) => 
// /!\ do not add trailing slash here
(0, utils_common_1.addLeadingSlash)(value));
const FrontMatterTagSchema = JoiFrontMatter_1.JoiFrontMatter.alternatives()
    .try(JoiFrontMatter_1.JoiFrontMatter.string().required(), 
// TODO Docusaurus v4 remove this legacy front matter tag object form
//  users should use tags.yml instead
JoiFrontMatter_1.JoiFrontMatter.object({
    label: JoiFrontMatter_1.JoiFrontMatter.string().required(),
    permalink: JoiFrontMatter_1.JoiFrontMatter.string().required(),
}).required())
    .messages({
    'alternatives.match': '{{#label}} does not look like a valid tag',
    'alternatives.types': '{{#label}} does not look like a valid tag',
});
exports.FrontMatterTagsSchema = JoiFrontMatter_1.JoiFrontMatter.array()
    .items(FrontMatterTagSchema)
    .messages({
    'array.base': '{{#label}} does not look like a valid front matter Yaml array.',
});
exports.FrontMatterTOCHeadingLevels = {
    toc_min_heading_level: JoiFrontMatter_1.JoiFrontMatter.number().when('toc_max_heading_level', {
        is: JoiFrontMatter_1.JoiFrontMatter.exist(),
        then: JoiFrontMatter_1.JoiFrontMatter.number()
            .min(2)
            .max(JoiFrontMatter_1.JoiFrontMatter.ref('toc_max_heading_level')),
        otherwise: JoiFrontMatter_1.JoiFrontMatter.number().min(2).max(6),
    }),
    toc_max_heading_level: JoiFrontMatter_1.JoiFrontMatter.number().min(2).max(6),
};
exports.ContentVisibilitySchema = JoiFrontMatter_1.JoiFrontMatter.object({
    draft: JoiFrontMatter_1.JoiFrontMatter.boolean(),
    unlisted: JoiFrontMatter_1.JoiFrontMatter.boolean(),
})
    .custom((frontMatter, helpers) => {
    if (frontMatter.draft && frontMatter.unlisted) {
        return helpers.error('frontMatter.draftAndUnlistedError');
    }
    return frontMatter;
})
    .messages({
    'frontMatter.draftAndUnlistedError': "Can't be draft and unlisted at the same time.",
})
    .unknown();
exports.FrontMatterLastUpdateErrorMessage = '{{#label}} does not look like a valid last update object. Please use an author key with a string or a date with a string or Date.';
exports.FrontMatterLastUpdateSchema = Joi_1.default.object({
    author: Joi_1.default.string(),
    date: Joi_1.default.date().raw(),
})
    .or('author', 'date')
    .messages({
    'object.missing': exports.FrontMatterLastUpdateErrorMessage,
    'object.base': exports.FrontMatterLastUpdateErrorMessage,
});
//# sourceMappingURL=validationSchemas.js.map