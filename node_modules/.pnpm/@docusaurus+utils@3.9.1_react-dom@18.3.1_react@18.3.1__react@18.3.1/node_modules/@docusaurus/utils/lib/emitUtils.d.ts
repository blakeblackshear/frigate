/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Outputs a file to the generated files directory. Only writes files if content
 * differs from cache (for hot reload performance).
 *
 * @param generatedFilesDir Absolute path.
 * @param file Path relative to `generatedFilesDir`. File will always be
 * outputted; no need to ensure directory exists.
 * @param content String content to write.
 * @param skipCache If `true` (defaults as `true` for production), file is
 * force-rewritten, skipping cache.
 */
export declare function generate(generatedFilesDir: string, file: string, content: string, skipCache?: boolean): Promise<void>;
/**
 * @param permalink The URL that the HTML file corresponds to, without base URL
 * @param outDir Full path to the output directory
 * @param trailingSlash The site config option. If provided, only one path will
 * be read.
 * @returns This returns a buffer, which you have to decode string yourself if
 * needed. (Not always necessary since the output isn't for human consumption
 * anyways, and most HTML manipulation libs accept buffers)
 * @throws Throws when the HTML file is not found at any of the potential paths.
 * This should never happen as it would lead to a 404.
 */
export declare function readOutputHTMLFile(permalink: string, outDir: string, trailingSlash: boolean | undefined): Promise<Buffer>;
//# sourceMappingURL=emitUtils.d.ts.map