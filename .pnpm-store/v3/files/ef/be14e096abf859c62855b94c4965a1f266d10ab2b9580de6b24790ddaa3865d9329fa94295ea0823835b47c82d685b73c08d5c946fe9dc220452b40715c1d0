/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Manifest } from 'react-loadable-ssr-addon-v5-slorber';
import type { Props } from '@docusaurus/types';
import type { HtmlMinifierType } from '@docusaurus/bundler';
export type SSGParams = {
    trailingSlash: boolean | undefined;
    manifest: Manifest;
    headTags: string;
    preBodyTags: string;
    postBodyTags: string;
    outDir: string;
    baseUrl: string;
    noIndex: boolean;
    DOCUSAURUS_VERSION: string;
    htmlMinifierType: HtmlMinifierType;
    serverBundlePath: string;
    ssgTemplateContent: string;
    v4RemoveLegacyPostBuildHeadAttribute: boolean;
};
export declare function createSSGParams({ props, serverBundlePath, clientManifestPath, }: {
    props: Props;
    serverBundlePath: string;
    clientManifestPath: string;
}): Promise<SSGParams>;
