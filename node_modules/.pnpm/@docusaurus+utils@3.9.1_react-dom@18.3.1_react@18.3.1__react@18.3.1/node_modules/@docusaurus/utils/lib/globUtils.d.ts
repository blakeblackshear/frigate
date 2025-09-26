/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import Globby from 'globby';
/** A re-export of the globby instance. */
export { Globby };
/**
 * The default glob patterns we ignore when sourcing content.
 * - Ignore files and folders starting with `_` recursively
 * - Ignore tests
 */
export declare const GlobExcludeDefault: string[];
type Matcher = (str: string) => boolean;
/**
 * A very thin wrapper around `Micromatch.makeRe`.
 *
 * @see {@link createAbsoluteFilePathMatcher}
 * @param patterns A list of glob patterns. If the list is empty, it defaults to
 * matching none.
 * @returns A matcher handle that tells if a file path is matched by any of the
 * patterns.
 */
export declare function createMatcher(patterns: string[]): Matcher;
/**
 * We use match patterns like `"** /_* /**"` (ignore the spaces), where `"_*"`
 * should only be matched within a subfolder. This function would:
 * - Match `/user/sebastien/website/docs/_partials/xyz.md`
 * - Ignore `/user/_sebastien/website/docs/partials/xyz.md`
 *
 * @param patterns A list of glob patterns.
 * @param rootFolders A list of root folders to resolve the glob from.
 * @returns A matcher handle that tells if a file path is matched by any of the
 * patterns, resolved from the first root folder that contains the path.
 * @throws Throws when the returned matcher receives a path that doesn't belong
 * to any of the `rootFolders`.
 */
export declare function createAbsoluteFilePathMatcher(patterns: string[], rootFolders: string[]): Matcher;
export declare function safeGlobby(patterns: string[], options?: Globby.GlobbyOptions): Promise<string[]>;
export declare const isTranslatableSourceFile: (filePath: string) => boolean;
export declare function globTranslatableSourceFiles(patterns: string[]): Promise<string[]>;
//# sourceMappingURL=globUtils.d.ts.map