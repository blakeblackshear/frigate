/**
 * Create smart processors to handle different formats.
 *
 * @param {Readonly<CompileOptions> | null | undefined} [compileOptions]
 *   Configuration (optional).
 * @return {FormatAwareProcessors}
 *   Smart processor.
 */
export function createFormatAwareProcessors(compileOptions?: Readonly<CompileOptions> | null | undefined): FormatAwareProcessors;
/**
 * Result.
 */
export type FormatAwareProcessors = {
    /**
     *   Extensions to use.
     */
    extnames: ReadonlyArray<string>;
    /**
     *   Smart processor, async.
     */
    process: Process;
};
/**
 * Smart processor.
 */
export type Process = (vfileCompatible: Compatible) => Promise<VFile>;
import type { CompileOptions } from '../compile.js';
import type { Compatible } from 'vfile';
import type { VFile } from 'vfile';
//# sourceMappingURL=create-format-aware-processors.d.ts.map