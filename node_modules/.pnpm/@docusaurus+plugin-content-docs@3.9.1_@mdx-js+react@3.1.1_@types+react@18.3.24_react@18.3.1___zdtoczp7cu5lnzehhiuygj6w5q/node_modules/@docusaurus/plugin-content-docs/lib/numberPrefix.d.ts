/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { NumberPrefixParser } from '@docusaurus/plugin-content-docs';
export declare const DefaultNumberPrefixParser: NumberPrefixParser;
export declare const DisabledNumberPrefixParser: NumberPrefixParser;
export declare function stripNumberPrefix(str: string, parser: NumberPrefixParser): string;
export declare function stripPathNumberPrefixes(path: string, parser: NumberPrefixParser): string;
