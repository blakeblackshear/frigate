/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import WebpackBar from 'webpackbar';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import type { FasterModule } from './importFaster';
import type { CurrentBundler, DocusaurusConfig } from '@docusaurus/types';
type SiteConfigSlice = {
    future: {
        experimental_faster: Pick<DocusaurusConfig['future']['experimental_faster'], 'rspackBundler'>;
    };
};
export declare function getCurrentBundler({ siteConfig, }: {
    siteConfig: SiteConfigSlice;
}): Promise<CurrentBundler>;
export declare function getCurrentBundlerAsRspack({ currentBundler, }: {
    currentBundler: CurrentBundler;
}): FasterModule['rspack'];
export declare function getCSSExtractPlugin({ currentBundler, }: {
    currentBundler: CurrentBundler;
}): Promise<typeof MiniCssExtractPlugin>;
export declare function getCopyPlugin({ currentBundler, }: {
    currentBundler: CurrentBundler;
}): Promise<typeof CopyWebpackPlugin>;
export declare function getProgressBarPlugin({ currentBundler, }: {
    currentBundler: CurrentBundler;
}): Promise<typeof WebpackBar>;
export declare function registerBundlerTracing({ currentBundler, }: {
    currentBundler: CurrentBundler;
}): Promise<() => Promise<void>>;
export {};
//# sourceMappingURL=currentBundler.d.ts.map