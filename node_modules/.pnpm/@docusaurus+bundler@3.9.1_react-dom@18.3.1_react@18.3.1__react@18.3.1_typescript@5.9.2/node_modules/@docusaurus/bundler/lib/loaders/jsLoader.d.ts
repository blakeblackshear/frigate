/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { ConfigureWebpackUtils, DocusaurusConfig } from '@docusaurus/types';
export declare function createJsLoaderFactory({ siteConfig, }: {
    siteConfig: {
        webpack?: DocusaurusConfig['webpack'];
        future: {
            experimental_faster: DocusaurusConfig['future']['experimental_faster'];
        };
    };
}): Promise<ConfigureWebpackUtils['getJSLoader']>;
//# sourceMappingURL=jsLoader.d.ts.map