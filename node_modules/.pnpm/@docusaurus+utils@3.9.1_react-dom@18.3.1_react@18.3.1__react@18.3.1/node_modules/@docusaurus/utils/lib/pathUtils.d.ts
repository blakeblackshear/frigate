/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export declare const isNameTooLong: (str: string) => boolean;
export declare function shortName(str: string): string;
/**
 * Convert Windows backslash paths to posix style paths.
 * E.g: endi\lie -> endi/lie
 *
 * Returns original path if the posix counterpart is not valid Windows path.
 * This makes the legacy code that uses posixPath safe; but also makes it less
 * useful when you actually want a path with forward slashes (e.g. for URL)
 *
 * Adopted from https://github.com/sindresorhus/slash/blob/main/index.js
 */
export declare function posixPath(str: string): string;
/**
 * When you want to display a path in a message/warning/error, it's more
 * convenient to:
 *
 * - make it relative to `cwd()`
 * - convert to posix (ie not using windows \ path separator)
 *
 * This way, Jest tests can run more reliably on any computer/CI on both
 * Unix/Windows
 * For Windows users this is not perfect (as they see / instead of \) but it's
 * probably good enough
 */
export declare function toMessageRelativeFilePath(filePath: string): string;
/**
 * Alias filepath relative to site directory, very useful so that we
 * don't expose user's site structure.
 * Example: some/path/to/website/docs/foo.md -> @site/docs/foo.md
 */
export declare function aliasedSitePath(filePath: string, siteDir: string): string;
/**
 * Converts back the aliased site path (starting with "@site/...") to a relative path
 *
 * TODO method this is a workaround, we shouldn't need to alias/un-alias paths
 *  we should refactor the codebase to not have aliased site paths everywhere
 *  We probably only need aliasing for client-only paths required by Webpack
 */
export declare function aliasedSitePathToRelativePath(filePath: string): string;
/**
 * When you have a path like C:\X\Y
 * It is not safe to use directly when generating code
 * For example, this would fail due to unescaped \:
 * `<img src={require("${filePath}")} />`
 * But this would work: `<img src={require("${escapePath(filePath)}")} />`
 *
 * posixPath can't be used in all cases, because forward slashes are only valid
 * Windows paths when they don't contain non-ascii characters, and posixPath
 * doesn't escape those that fail to be converted.
 *
 * This function escapes double quotes but not single quotes (because it uses
 * `JSON.stringify`). Therefore, you must put the escaped path inside double
 * quotes when generating code.
 */
export declare function escapePath(str: string): string;
export declare function addTrailingPathSeparator(str: string): string;
//# sourceMappingURL=pathUtils.d.ts.map