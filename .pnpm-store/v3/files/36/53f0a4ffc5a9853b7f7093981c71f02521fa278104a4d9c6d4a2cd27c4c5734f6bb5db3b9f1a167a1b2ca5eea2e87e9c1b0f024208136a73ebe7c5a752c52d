/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadContext, InitializedPlugin } from '@docusaurus/types';
/**
 * Make a synthetic plugin to:
 * - Inject site client modules
 * - Inject scripts/stylesheets
 */
export declare function createBootstrapPlugin({ siteDir, siteConfig, }: LoadContext): InitializedPlugin;
/**
 * Configure Webpack fallback mdx loader for md/mdx files out of content-plugin
 * folders. Adds a "fallback" mdx loader for mdx files that are not processed by
 * content plugins. This allows to do things such as importing repo/README.md as
 * a partial from another doc. Not ideal solution, but good enough for now
 */
export declare function createMDXFallbackPlugin({ siteDir, siteConfig, }: LoadContext): Promise<InitializedPlugin>;
