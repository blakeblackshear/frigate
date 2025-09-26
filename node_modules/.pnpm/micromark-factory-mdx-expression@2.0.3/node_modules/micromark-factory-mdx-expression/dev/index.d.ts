/**
 * @this {TokenizeContext}
 *   Context.
 * @param {Effects} effects
 *   Context.
 * @param {State} ok
 *   State switched to when successful
 * @param {TokenType} type
 *   Token type for whole (`{}`).
 * @param {TokenType} markerType
 *   Token type for the markers (`{`, `}`).
 * @param {TokenType} chunkType
 *   Token type for the value (`1`).
 * @param {Acorn | null | undefined} [acorn]
 *   Object with `acorn.parse` and `acorn.parseExpressionAt`.
 * @param {AcornOptions | null | undefined} [acornOptions]
 *   Configuration for acorn.
 * @param {boolean | null | undefined} [addResult=false]
 *   Add `estree` to token (default: `false`).
 * @param {boolean | null | undefined} [spread=false]
 *   Support a spread (`{...a}`) only (default: `false`).
 * @param {boolean | null | undefined} [allowEmpty=false]
 *   Support an empty expression (default: `false`).
 * @param {boolean | null | undefined} [allowLazy=false]
 *   Support lazy continuation of an expression (default: `false`).
 * @returns {State}
 */
export function factoryMdxExpression(this: TokenizeContext, effects: Effects, ok: State, type: TokenType, markerType: TokenType, chunkType: TokenType, acorn?: Acorn | null | undefined, acornOptions?: AcornOptions | null | undefined, addResult?: boolean | null | undefined, spread?: boolean | null | undefined, allowEmpty?: boolean | null | undefined, allowLazy?: boolean | null | undefined): State;
/**
 * Good result.
 */
export type MdxSignalOk = {
    /**
     *   Type.
     */
    type: "ok";
    /**
     *   Value.
     */
    estree: Program | undefined;
};
/**
 * Bad result.
 */
export type MdxSignalNok = {
    /**
     *   Type.
     */
    type: "nok";
    /**
     *   Value.
     */
    message: VFileMessage;
};
export type MdxSignal = MdxSignalNok | MdxSignalOk;
import type { Effects } from 'micromark-util-types';
import type { State } from 'micromark-util-types';
import type { TokenType } from 'micromark-util-types';
import type { Acorn } from 'micromark-util-events-to-acorn';
import type { AcornOptions } from 'micromark-util-events-to-acorn';
import type { TokenizeContext } from 'micromark-util-types';
import type { Program } from 'estree';
import { VFileMessage } from 'vfile-message';
//# sourceMappingURL=index.d.ts.map