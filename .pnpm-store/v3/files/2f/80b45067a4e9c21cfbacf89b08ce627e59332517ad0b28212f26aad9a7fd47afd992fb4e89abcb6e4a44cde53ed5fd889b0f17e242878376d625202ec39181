/**
 * Compile MDX to JS.
 *
 * @param {Readonly<Compatible>} vfileCompatible
 *   MDX document to parse.
 * @param {Readonly<CompileOptions> | null | undefined} [compileOptions]
 *   Compile configuration (optional).
 * @return {Promise<VFile>}
 *   Promise to compiled file.
 */
export function compile(vfileCompatible: Readonly<Compatible>, compileOptions?: Readonly<CompileOptions> | null | undefined): Promise<VFile>;
/**
 * Synchronously compile MDX to JS.
 *
 * When possible please use the async `compile`.
 *
 * @param {Readonly<Compatible>} vfileCompatible
 *   MDX document to parse.
 * @param {Readonly<CompileOptions> | null | undefined} [compileOptions]
 *   Compile configuration (optional).
 * @return {VFile}
 *   Compiled file.
 */
export function compileSync(vfileCompatible: Readonly<Compatible>, compileOptions?: Readonly<CompileOptions> | null | undefined): VFile;
/**
 * Core configuration.
 */
export type CoreProcessorOptions = Omit<ProcessorOptions, "format">;
/**
 * Extra configuration.
 */
export type ExtraOptions = {
    /**
     * Format of `file` (default: `'detect'`).
     */
    format?: "detect" | "md" | "mdx" | null | undefined;
};
/**
 * Configuration for `compile`.
 *
 * `CompileOptions` is the same as `ProcessorOptions` with the exception that
 * the `format` option supports a `'detect'` value, which is the default.
 * The `'detect'` format means to use `'md'` for files with an extension in
 * `mdExtensions` and `'mdx'` otherwise.
 */
export type CompileOptions = CoreProcessorOptions & ExtraOptions;
import type { Compatible } from 'vfile';
import type { VFile } from 'vfile';
import type { ProcessorOptions } from './core.js';
//# sourceMappingURL=compile.d.ts.map