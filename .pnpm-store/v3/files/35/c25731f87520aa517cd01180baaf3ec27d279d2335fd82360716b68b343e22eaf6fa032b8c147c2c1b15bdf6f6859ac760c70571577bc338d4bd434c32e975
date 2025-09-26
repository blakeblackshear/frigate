/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { RuleSetRule, LoaderContext } from 'webpack';
export type WebpackCompilerName = 'server' | 'client';
export declare function getWebpackLoaderCompilerName(context: LoaderContext<unknown>): WebpackCompilerName;
type AssetFolder = 'images' | 'files' | 'fonts' | 'medias';
type FileLoaderUtils = {
    loaders: {
        file: (options: {
            folder: AssetFolder;
        }) => RuleSetRule;
        url: (options: {
            folder: AssetFolder;
        }) => RuleSetRule;
        inlineMarkdownImageFileLoader: string;
        inlineMarkdownAssetImageFileLoader: string;
        inlineMarkdownLinkFileLoader: string;
    };
    rules: {
        images: () => RuleSetRule;
        svgs: () => RuleSetRule;
        fonts: () => RuleSetRule;
        media: () => RuleSetRule;
        otherAssets: () => RuleSetRule;
    };
};
/**
 * Returns unified loader configurations to be used for various file types.
 * Inspired by https://github.com/gatsbyjs/gatsby/blob/8e6e021014da310b9cc7d02e58c9b3efe938c665/packages/gatsby/src/utils/webpack-utils.ts#L447
 */
export declare function getFileLoaderUtils(isServer: boolean): FileLoaderUtils;
export {};
//# sourceMappingURL=webpackUtils.d.ts.map