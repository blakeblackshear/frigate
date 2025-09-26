/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Transformer } from 'unified';
/**
 * In the blog list view, each post will be compiled separately. However, they
 * may use the same footnote IDs. This leads to duplicated DOM IDs and inability
 * to navigate to footnote references. This plugin fixes it by appending a
 * unique hash to each reference/definition.
 */
export default function plugin(): Transformer;
