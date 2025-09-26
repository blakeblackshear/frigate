/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { BlogMarkdownLoaderOptions } from './types';
import type { LoaderContext } from 'webpack';
export default function markdownLoader(this: LoaderContext<BlogMarkdownLoaderOptions>, source: string): void;
