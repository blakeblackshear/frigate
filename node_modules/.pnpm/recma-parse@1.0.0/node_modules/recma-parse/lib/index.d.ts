/**
 * Plugin to add support for parsing from JavaScript.
 *
 * @this {Processor<Program>}
 *   Processor instance.
 * @param {Readonly<Options> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {undefined}
 *   Nothing.
 */
export default function rehypeParse(this: Processor<Program, undefined, undefined, undefined, undefined>, options?: Readonly<Options> | null | undefined): undefined;
export default class rehypeParse {
    /**
     * Plugin to add support for parsing from JavaScript.
     *
     * @this {Processor<Program>}
     *   Processor instance.
     * @param {Readonly<Options> | null | undefined} [options]
     *   Configuration (optional).
     * @returns {undefined}
     *   Nothing.
     */
    constructor(this: Processor<Program, undefined, undefined, undefined, undefined>, options?: Readonly<Options> | null | undefined);
    parser: (value: string) => Program;
}
import type { Options } from 'esast-util-from-js';
import type { Program } from 'estree';
import type { Processor } from 'unified';
//# sourceMappingURL=index.d.ts.map