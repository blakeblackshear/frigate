/// <reference types="node" />

import { Script } from "vm";

/**
 * A simple way to evaluate a module content in the same way as require() but
 * without loading it from a file. Effectively, it mimicks the javascript evil
 * `eval` function but leverages Node's VM module instead.
 */
declare const nodeEval: {
  (
    /** The content to be evaluated. */
    content: string | Buffer | Script,
  ): unknown;
  (
    /** The content to be evaluated. */
    content: string | Buffer | Script,
    /**
     * Optional flag to allow/disallow global variables (and require) to be
     * supplied to the content (default=false).
     */
    includeGlobals?: boolean,
  ): unknown;
  (
    /** The content to be evaluated. */
    content: string | Buffer | Script,
    /** Optional scope properties are provided as variables to the content. */
    scope?: Record<string, unknown>,
    /**
     * Optional flag to allow/disallow global variables (and require) to be
     * supplied to the content (default=false).
     */
    includeGlobals?: boolean,
  ): unknown;
  (
    /** The content to be evaluated. */
    content: string | Buffer | Script,
    /** Optional dummy name to be given (used in stacktraces). */
    filename?: string,
    /** Optional scope properties are provided as variables to the content. */
    scope?: Record<string, unknown>,
    /**
     * Optional flag to allow/disallow global variables (and require) to be
     * supplied to the content (default=false).
     */
    includeGlobals?: boolean,
  ): unknown;
};

export = nodeEval;
