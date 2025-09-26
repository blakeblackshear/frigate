"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProcessorUncached = createProcessorUncached;
exports.createProcessors = createProcessors;
exports.getProcessor = getProcessor;
const tslib_1 = require("tslib");
const headings_1 = tslib_1.__importDefault(require("./remark/headings"));
const contentTitle_1 = tslib_1.__importDefault(require("./remark/contentTitle"));
const toc_1 = tslib_1.__importDefault(require("./remark/toc"));
const transformImage_1 = tslib_1.__importDefault(require("./remark/transformImage"));
const transformLinks_1 = tslib_1.__importDefault(require("./remark/transformLinks"));
const resolveMarkdownLinks_1 = tslib_1.__importDefault(require("./remark/resolveMarkdownLinks"));
const details_1 = tslib_1.__importDefault(require("./remark/details"));
const head_1 = tslib_1.__importDefault(require("./remark/head"));
const mermaid_1 = tslib_1.__importDefault(require("./remark/mermaid"));
const admonitions_1 = tslib_1.__importDefault(require("./remark/admonitions"));
const unusedDirectives_1 = tslib_1.__importDefault(require("./remark/unusedDirectives"));
const codeCompatPlugin_1 = tslib_1.__importDefault(require("./remark/mdx1Compat/codeCompatPlugin"));
const format_1 = require("./format");
function getAdmonitionsPlugins(admonitionsOption) {
    if (admonitionsOption) {
        const plugin = admonitionsOption === true
            ? admonitions_1.default
            : [admonitions_1.default, admonitionsOption];
        return [plugin];
    }
    return [];
}
// Need to be async due to ESM dynamic imports...
async function createProcessorFactory() {
    const { createProcessor: createMdxProcessor } = await import('@mdx-js/mdx');
    const { default: frontmatter } = await import('remark-frontmatter');
    const { default: rehypeRaw } = await import('rehype-raw');
    const { default: gfm } = await import('remark-gfm');
    // TODO using fork until PR merged: https://github.com/leebyron/remark-comment/pull/3
    const { default: comment } = await import('@slorber/remark-comment');
    const { default: directive } = await import('remark-directive');
    const { VFile } = await import('vfile');
    const { default: emoji } = await import('remark-emoji');
    function getDefaultRemarkPlugins({ options }) {
        return [
            [
                headings_1.default,
                { anchorsMaintainCase: options.markdownConfig.anchors.maintainCase },
            ],
            ...(options.markdownConfig.emoji ? [emoji] : []),
            toc_1.default,
        ];
    }
    // /!\ this method is synchronous on purpose
    // Using async code here can create cache entry race conditions!
    function createProcessorSync({ options, format, }) {
        const remarkPlugins = [
            ...(options.beforeDefaultRemarkPlugins ?? []),
            frontmatter,
            directive,
            [contentTitle_1.default, { removeContentTitle: options.removeContentTitle }],
            ...getAdmonitionsPlugins(options.admonitions ?? false),
            ...getDefaultRemarkPlugins({ options }),
            details_1.default,
            head_1.default,
            ...(options.markdownConfig.mermaid ? [mermaid_1.default] : []),
            [
                transformImage_1.default,
                {
                    staticDirs: options.staticDirs,
                    siteDir: options.siteDir,
                    onBrokenMarkdownImages: options.markdownConfig.hooks.onBrokenMarkdownImages,
                },
            ],
            // TODO merge this with transformLinks?
            options.resolveMarkdownLink
                ? [
                    resolveMarkdownLinks_1.default,
                    {
                        resolveMarkdownLink: options.resolveMarkdownLink,
                        onBrokenMarkdownLinks: options.markdownConfig.hooks.onBrokenMarkdownLinks,
                    },
                ]
                : undefined,
            [
                transformLinks_1.default,
                {
                    staticDirs: options.staticDirs,
                    siteDir: options.siteDir,
                    onBrokenMarkdownLinks: options.markdownConfig.hooks.onBrokenMarkdownLinks,
                },
            ],
            gfm,
            options.markdownConfig.mdx1Compat.comments ? comment : null,
            ...(options.remarkPlugins ?? []),
            unusedDirectives_1.default,
        ].filter((plugin) => Boolean(plugin));
        // codeCompatPlugin needs to be applied last after user-provided plugins
        // (after npm2yarn for example)
        remarkPlugins.push(codeCompatPlugin_1.default);
        const rehypePlugins = [
            ...(options.beforeDefaultRehypePlugins ?? []),
            ...(options.rehypePlugins ?? []),
        ];
        // Maybe we'll want to introduce default recma plugins later?
        // For example https://github.com/domdomegg/recma-mdx-displayname ?
        const recmaPlugins = [...(options.recmaPlugins ?? [])];
        if (format === 'md') {
            // This is what permits to embed HTML elements with format 'md'
            // See https://github.com/facebook/docusaurus/pull/8960
            // See https://github.com/mdx-js/mdx/pull/2295#issuecomment-1540085960
            const rehypeRawPlugin = [
                rehypeRaw,
                {
                    passThrough: [
                        'mdxFlowExpression',
                        'mdxJsxFlowElement',
                        'mdxJsxTextElement',
                        'mdxTextExpression',
                        'mdxjsEsm',
                    ],
                },
            ];
            rehypePlugins.unshift(rehypeRawPlugin);
        }
        const processorOptions = {
            ...options,
            remarkPlugins,
            rehypePlugins,
            recmaPlugins,
            providerImportSource: '@mdx-js/react',
        };
        const mdxProcessor = createMdxProcessor({
            ...processorOptions,
            remarkRehypeOptions: options.markdownConfig.remarkRehypeOptions,
            format,
        });
        return {
            process: async ({ content, filePath, frontMatter, compilerName }) => {
                const vfile = new VFile({
                    value: content,
                    path: filePath,
                    data: {
                        frontMatter,
                        compilerName,
                    },
                });
                return mdxProcessor.process(vfile).then((result) => ({
                    content: result.toString(),
                    data: result.data,
                }));
            },
        };
    }
    return { createProcessorSync };
}
// Will be useful for tests
async function createProcessorUncached(parameters) {
    const { createProcessorSync } = await createProcessorFactory();
    return createProcessorSync(parameters);
}
// Compilers are cached so that Remark/Rehype plugins can run
// expensive code during initialization
const ProcessorsCache = new Map();
async function createProcessors({ options, }) {
    const { createProcessorSync } = await createProcessorFactory();
    return {
        mdProcessor: createProcessorSync({
            options,
            format: 'md',
        }),
        mdxProcessor: createProcessorSync({
            options,
            format: 'mdx',
        }),
    };
}
async function createProcessorsCacheEntry({ options, }) {
    const compilers = ProcessorsCache.get(options);
    if (compilers) {
        return compilers;
    }
    const processors = await createProcessors({ options });
    ProcessorsCache.set(options, processors);
    return processors;
}
async function getProcessor({ filePath, mdxFrontMatter, options, }) {
    const processors = options.processors ?? (await createProcessorsCacheEntry({ options }));
    const format = (0, format_1.getFormat)({
        filePath,
        frontMatterFormat: mdxFrontMatter.format,
        markdownConfigFormat: options.markdownConfig.format,
    });
    return format === 'md' ? processors.mdProcessor : processors.mdxProcessor;
}
//# sourceMappingURL=processor.js.map