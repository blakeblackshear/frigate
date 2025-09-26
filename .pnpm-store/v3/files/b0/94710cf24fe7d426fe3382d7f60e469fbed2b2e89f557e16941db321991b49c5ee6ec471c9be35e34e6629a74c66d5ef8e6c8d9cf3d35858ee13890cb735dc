/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { ConfigureWebpackUtils, FasterConfig, Props } from '@docusaurus/types';
import type { Configuration } from 'webpack';
export declare function createStartClientConfig({ props, minify, poll, faster, configureWebpackUtils, }: {
    props: Props;
    minify: boolean;
    poll: number | boolean | undefined;
    faster: FasterConfig;
    configureWebpackUtils: ConfigureWebpackUtils;
}): Promise<{
    clientConfig: Configuration;
}>;
export declare function createBuildClientConfig({ props, minify, faster, configureWebpackUtils, bundleAnalyzer, }: {
    props: Props;
    minify: boolean;
    faster: FasterConfig;
    configureWebpackUtils: ConfigureWebpackUtils;
    bundleAnalyzer: boolean;
}): Promise<{
    config: Configuration;
    clientManifestPath: string;
}>;
