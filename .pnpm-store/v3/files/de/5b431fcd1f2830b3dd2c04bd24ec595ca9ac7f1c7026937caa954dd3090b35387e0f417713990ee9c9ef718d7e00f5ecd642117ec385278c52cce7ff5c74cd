/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type WebpackCompilerName } from '@docusaurus/utils';
import { type SimpleProcessorResult } from './processor';
import type { Options } from './options';
/**
 * Converts assets an object with Webpack require calls code.
 * This is useful for mdx files to reference co-located assets using relative
 * paths. Those assets should enter the Webpack assets pipeline and be hashed.
 * For now, we only handle that for images and paths starting with `./`:
 *
 * `{image: "./myImage.png"}` => `{image: require("./myImage.png")}`
 */
export declare function createAssetsExportCode({ assets, inlineMarkdownAssetImageFileLoader, }: {
    assets: unknown;
    inlineMarkdownAssetImageFileLoader: string;
}): string;
/**
 * data.contentTitle is set by the remark contentTitle plugin
 */
export declare function extractContentTitleData(data: {
    [key: string]: unknown;
}): string | undefined;
export declare function compileToJSX({ filePath, fileContent, frontMatter, options, compilerName, }: {
    filePath: string;
    fileContent: string;
    frontMatter: Record<string, unknown>;
    options: Options;
    compilerName: WebpackCompilerName;
}): Promise<SimpleProcessorResult>;
export interface PromiseWithResolvers<T> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
}
export declare function promiseWithResolvers<T>(): PromiseWithResolvers<T>;
//# sourceMappingURL=utils.d.ts.map