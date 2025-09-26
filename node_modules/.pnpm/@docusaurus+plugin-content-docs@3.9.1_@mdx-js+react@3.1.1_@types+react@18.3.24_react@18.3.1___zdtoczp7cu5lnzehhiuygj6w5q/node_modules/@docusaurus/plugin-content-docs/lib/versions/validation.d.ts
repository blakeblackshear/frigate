/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { VersionsOptions } from '@docusaurus/plugin-content-docs';
export declare function validateVersionName(name: unknown): asserts name is string;
export declare function validateVersionNames(names: unknown): asserts names is string[];
/**
 * @throws Throws for one of the following invalid options:
 * - `lastVersion` is non-existent
 * - `versions` includes unknown keys
 * - `onlyIncludeVersions` is empty, contains unknown names, or doesn't include
 * `latestVersion` (if provided)
 */
export declare function validateVersionsOptions(availableVersionNames: string[], options: VersionsOptions): void;
