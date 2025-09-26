/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Preset, LoadContext } from '@docusaurus/types';
import type { Options, ThemeConfig } from './options';
export default function preset(context: LoadContext, opts?: Options): Preset;
export type { Options, ThemeConfig };
