/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { MinimizerOptions as JsMinimizerOptions, CustomOptions } from 'terser-webpack-plugin';
import type { MinimizerOptions as CssMinimizerOptions } from 'css-minimizer-webpack-plugin';
export type FasterModule = Awaited<typeof import('@docusaurus/faster')>;
export declare function importRspack(): Promise<FasterModule['rspack']>;
export declare function importSwcLoader(): Promise<string>;
export declare function importGetSwcLoaderOptions(): Promise<FasterModule['getSwcLoaderOptions']>;
export declare function importSwcJsMinimizerOptions(): Promise<JsMinimizerOptions<CustomOptions>>;
export declare function importSwcHtmlMinifier(): Promise<ReturnType<FasterModule['getSwcHtmlMinifier']>>;
export declare function importGetBrowserslistQueries(): Promise<FasterModule['getBrowserslistQueries']>;
export declare function importLightningCssMinimizerOptions(): Promise<CssMinimizerOptions<CustomOptions>>;
//# sourceMappingURL=importFaster.d.ts.map