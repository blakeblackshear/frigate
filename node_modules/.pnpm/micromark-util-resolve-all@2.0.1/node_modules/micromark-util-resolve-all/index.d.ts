/**
 * @import {Event, Resolver, TokenizeContext} from 'micromark-util-types'
 */
/**
 * Call all `resolveAll`s.
 *
 * @param {ReadonlyArray<{resolveAll?: Resolver | undefined}>} constructs
 *   List of constructs, optionally with `resolveAll`s.
 * @param {Array<Event>} events
 *   List of events.
 * @param {TokenizeContext} context
 *   Context used by `tokenize`.
 * @returns {Array<Event>}
 *   Changed events.
 */
export function resolveAll(constructs: ReadonlyArray<{
    resolveAll?: Resolver | undefined;
}>, events: Array<Event>, context: TokenizeContext): Array<Event>;
import type { Resolver } from 'micromark-util-types';
import type { Event } from 'micromark-util-types';
import type { TokenizeContext } from 'micromark-util-types';
//# sourceMappingURL=index.d.ts.map