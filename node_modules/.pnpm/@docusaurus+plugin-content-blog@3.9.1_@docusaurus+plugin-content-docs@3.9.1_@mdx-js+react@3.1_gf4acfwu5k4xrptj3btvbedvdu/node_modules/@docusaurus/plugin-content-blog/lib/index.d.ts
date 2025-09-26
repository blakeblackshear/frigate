/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadContext, Plugin } from '@docusaurus/types';
import type { PluginOptions, BlogContent } from '@docusaurus/plugin-content-blog';
export default function pluginContentBlog(context: LoadContext, options: PluginOptions): Promise<Plugin<BlogContent>>;
export { validateOptions } from './options';
