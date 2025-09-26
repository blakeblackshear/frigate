/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { WebpackCompilerName } from '@docusaurus/utils';
import type { MDXFrontMatter } from './frontMatter';
import type { Options } from './options';
import type { AdmonitionOptions } from './remark/admonitions';
type Pluggable = any;
export type SimpleProcessorResult = {
    content: string;
    data: {
        [key: string]: unknown;
    };
};
export type SimpleProcessor = {
    process: ({ content, filePath, frontMatter, compilerName, }: {
        content: string;
        filePath: string;
        frontMatter: {
            [key: string]: unknown;
        };
        compilerName: WebpackCompilerName;
    }) => Promise<SimpleProcessorResult>;
};
export type MDXPlugin = Pluggable;
export type MDXOptions = {
    admonitions: boolean | Partial<AdmonitionOptions>;
    remarkPlugins: MDXPlugin[];
    rehypePlugins: MDXPlugin[];
    recmaPlugins: MDXPlugin[];
    beforeDefaultRemarkPlugins: MDXPlugin[];
    beforeDefaultRehypePlugins: MDXPlugin[];
};
export declare function createProcessorUncached(parameters: {
    options: Options;
    format: 'md' | 'mdx';
}): Promise<SimpleProcessor>;
export type SimpleProcessors = {
    mdProcessor: SimpleProcessor;
    mdxProcessor: SimpleProcessor;
};
export declare function createProcessors({ options, }: {
    options: Options;
}): Promise<SimpleProcessors>;
export declare function getProcessor({ filePath, mdxFrontMatter, options, }: {
    filePath: string;
    mdxFrontMatter: MDXFrontMatter;
    options: Options;
}): Promise<SimpleProcessor>;
export {};
//# sourceMappingURL=processor.d.ts.map