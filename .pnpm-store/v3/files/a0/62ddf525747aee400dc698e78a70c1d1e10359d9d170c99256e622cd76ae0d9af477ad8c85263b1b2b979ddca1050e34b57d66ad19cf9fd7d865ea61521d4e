/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import map from "lodash-es/map.js";
import filter from "lodash-es/filter.js";
import { Alternation, NonTerminal, Option, RepetitionMandatory, Repetition, Terminal, RepetitionWithSeparator, RepetitionMandatoryWithSeparator } from "chevrotain";
export function buildATNKey(rule, type, occurrence) {
    return `${rule.name}_${type}_${occurrence}`;
}
export const ATN_INVALID_TYPE = 0;
export const ATN_BASIC = 1;
export const ATN_RULE_START = 2;
export const ATN_PLUS_BLOCK_START = 4;
export const ATN_STAR_BLOCK_START = 5;
// Currently unused as the ATN is not used for lexing
export const ATN_TOKEN_START = 6;
export const ATN_RULE_STOP = 7;
export const ATN_BLOCK_END = 8;
export const ATN_STAR_LOOP_BACK = 9;
export const ATN_STAR_LOOP_ENTRY = 10;
export const ATN_PLUS_LOOP_BACK = 11;
export const ATN_LOOP_END = 12;
export class AbstractTransition {
    constructor(target) {
        this.target = target;
    }
    isEpsilon() {
        return false;
    }
}
export class AtomTransition extends AbstractTransition {
    constructor(target, tokenType) {
        super(target);
        this.tokenType = tokenType;
    }
}
export class EpsilonTransition extends AbstractTransition {
    constructor(target) {
        super(target);
    }
    isEpsilon() {
        return true;
    }
}
export class RuleTransition extends AbstractTransition {
    constructor(ruleStart, rule, followState) {
        super(ruleStart);
        this.rule = rule;
        this.followState = followState;
    }
    isEpsilon() {
        return true;
    }
}
export function createATN(rules) {
    const atn = {
        decisionMap: {},
        decisionStates: [],
        ruleToStartState: new Map(),
        ruleToStopState: new Map(),
        states: []
    };
    createRuleStartAndStopATNStates(atn, rules);
    const ruleLength = rules.length;
    for (let i = 0; i < ruleLength; i++) {
        const rule = rules[i];
        const ruleBlock = block(atn, rule, rule);
        if (ruleBlock === undefined) {
            continue;
        }
        buildRuleHandle(atn, rule, ruleBlock);
    }
    return atn;
}
function createRuleStartAndStopATNStates(atn, rules) {
    const ruleLength = rules.length;
    for (let i = 0; i < ruleLength; i++) {
        const rule = rules[i];
        const start = newState(atn, rule, undefined, {
            type: ATN_RULE_START
        });
        const stop = newState(atn, rule, undefined, {
            type: ATN_RULE_STOP
        });
        start.stop = stop;
        atn.ruleToStartState.set(rule, start);
        atn.ruleToStopState.set(rule, stop);
    }
}
function atom(atn, rule, production) {
    if (production instanceof Terminal) {
        return tokenRef(atn, rule, production.terminalType, production);
    }
    else if (production instanceof NonTerminal) {
        return ruleRef(atn, rule, production);
    }
    else if (production instanceof Alternation) {
        return alternation(atn, rule, production);
    }
    else if (production instanceof Option) {
        return option(atn, rule, production);
    }
    else if (production instanceof Repetition) {
        return repetition(atn, rule, production);
    }
    else if (production instanceof RepetitionWithSeparator) {
        return repetitionSep(atn, rule, production);
    }
    else if (production instanceof RepetitionMandatory) {
        return repetitionMandatory(atn, rule, production);
    }
    else if (production instanceof RepetitionMandatoryWithSeparator) {
        return repetitionMandatorySep(atn, rule, production);
    }
    else {
        return block(atn, rule, production);
    }
}
function repetition(atn, rule, repetition) {
    const starState = newState(atn, rule, repetition, {
        type: ATN_STAR_BLOCK_START
    });
    defineDecisionState(atn, starState);
    const handle = makeAlts(atn, rule, starState, repetition, block(atn, rule, repetition));
    return star(atn, rule, repetition, handle);
}
function repetitionSep(atn, rule, repetition) {
    const starState = newState(atn, rule, repetition, {
        type: ATN_STAR_BLOCK_START
    });
    defineDecisionState(atn, starState);
    const handle = makeAlts(atn, rule, starState, repetition, block(atn, rule, repetition));
    const sep = tokenRef(atn, rule, repetition.separator, repetition);
    return star(atn, rule, repetition, handle, sep);
}
function repetitionMandatory(atn, rule, repetition) {
    const plusState = newState(atn, rule, repetition, {
        type: ATN_PLUS_BLOCK_START
    });
    defineDecisionState(atn, plusState);
    const handle = makeAlts(atn, rule, plusState, repetition, block(atn, rule, repetition));
    return plus(atn, rule, repetition, handle);
}
function repetitionMandatorySep(atn, rule, repetition) {
    const plusState = newState(atn, rule, repetition, {
        type: ATN_PLUS_BLOCK_START
    });
    defineDecisionState(atn, plusState);
    const handle = makeAlts(atn, rule, plusState, repetition, block(atn, rule, repetition));
    const sep = tokenRef(atn, rule, repetition.separator, repetition);
    return plus(atn, rule, repetition, handle, sep);
}
function alternation(atn, rule, alternation) {
    const start = newState(atn, rule, alternation, {
        type: ATN_BASIC
    });
    defineDecisionState(atn, start);
    const alts = map(alternation.definition, (e) => atom(atn, rule, e));
    const handle = makeAlts(atn, rule, start, alternation, ...alts);
    return handle;
}
function option(atn, rule, option) {
    const start = newState(atn, rule, option, {
        type: ATN_BASIC
    });
    defineDecisionState(atn, start);
    const handle = makeAlts(atn, rule, start, option, block(atn, rule, option));
    return optional(atn, rule, option, handle);
}
function block(atn, rule, block) {
    const handles = filter(map(block.definition, (e) => atom(atn, rule, e)), (e) => e !== undefined);
    if (handles.length === 1) {
        return handles[0];
    }
    else if (handles.length === 0) {
        return undefined;
    }
    else {
        return makeBlock(atn, handles);
    }
}
function plus(atn, rule, plus, handle, sep) {
    const blkStart = handle.left;
    const blkEnd = handle.right;
    const loop = newState(atn, rule, plus, {
        type: ATN_PLUS_LOOP_BACK
    });
    defineDecisionState(atn, loop);
    const end = newState(atn, rule, plus, {
        type: ATN_LOOP_END
    });
    blkStart.loopback = loop;
    end.loopback = loop;
    atn.decisionMap[buildATNKey(rule, sep ? 'RepetitionMandatoryWithSeparator' : 'RepetitionMandatory', plus.idx)] = loop;
    epsilon(blkEnd, loop); // block can see loop back
    // Depending on whether we have a separator we put the exit transition at index 1 or 0
    // This influences the chosen option in the lookahead DFA
    if (sep === undefined) {
        epsilon(loop, blkStart); // loop back to start
        epsilon(loop, end); // exit
    }
    else {
        epsilon(loop, end); // exit
        // loop back to start with separator
        epsilon(loop, sep.left);
        epsilon(sep.right, blkStart);
    }
    return {
        left: blkStart,
        right: end
    };
}
function star(atn, rule, star, handle, sep) {
    const start = handle.left;
    const end = handle.right;
    const entry = newState(atn, rule, star, {
        type: ATN_STAR_LOOP_ENTRY
    });
    defineDecisionState(atn, entry);
    const loopEnd = newState(atn, rule, star, {
        type: ATN_LOOP_END
    });
    const loop = newState(atn, rule, star, {
        type: ATN_STAR_LOOP_BACK
    });
    entry.loopback = loop;
    loopEnd.loopback = loop;
    epsilon(entry, start); // loop enter edge (alt 2)
    epsilon(entry, loopEnd); // bypass loop edge (alt 1)
    epsilon(end, loop); // block end hits loop back
    if (sep !== undefined) {
        epsilon(loop, loopEnd); // end loop
        // loop back to start of handle using separator
        epsilon(loop, sep.left);
        epsilon(sep.right, start);
    }
    else {
        epsilon(loop, entry); // loop back to entry/exit decision
    }
    atn.decisionMap[buildATNKey(rule, sep ? 'RepetitionWithSeparator' : 'Repetition', star.idx)] = entry;
    return {
        left: entry,
        right: loopEnd
    };
}
function optional(atn, rule, optional, handle) {
    const start = handle.left;
    const end = handle.right;
    epsilon(start, end);
    atn.decisionMap[buildATNKey(rule, 'Option', optional.idx)] = start;
    return handle;
}
function defineDecisionState(atn, state) {
    atn.decisionStates.push(state);
    state.decision = atn.decisionStates.length - 1;
    return state.decision;
}
function makeAlts(atn, rule, start, production, ...alts) {
    const end = newState(atn, rule, production, {
        type: ATN_BLOCK_END,
        start
    });
    start.end = end;
    for (const alt of alts) {
        if (alt !== undefined) {
            // hook alts up to decision block
            epsilon(start, alt.left);
            epsilon(alt.right, end);
        }
        else {
            epsilon(start, end);
        }
    }
    const handle = {
        left: start,
        right: end
    };
    atn.decisionMap[buildATNKey(rule, getProdType(production), production.idx)] = start;
    return handle;
}
function getProdType(production) {
    if (production instanceof Alternation) {
        return 'Alternation';
    }
    else if (production instanceof Option) {
        return 'Option';
    }
    else if (production instanceof Repetition) {
        return 'Repetition';
    }
    else if (production instanceof RepetitionWithSeparator) {
        return 'RepetitionWithSeparator';
    }
    else if (production instanceof RepetitionMandatory) {
        return 'RepetitionMandatory';
    }
    else if (production instanceof RepetitionMandatoryWithSeparator) {
        return 'RepetitionMandatoryWithSeparator';
    }
    else {
        throw new Error('Invalid production type encountered');
    }
}
function makeBlock(atn, alts) {
    const altsLength = alts.length;
    for (let i = 0; i < altsLength - 1; i++) {
        const handle = alts[i];
        let transition;
        if (handle.left.transitions.length === 1) {
            transition = handle.left.transitions[0];
        }
        const isRuleTransition = transition instanceof RuleTransition;
        const ruleTransition = transition;
        const next = alts[i + 1].left;
        if (handle.left.type === ATN_BASIC &&
            handle.right.type === ATN_BASIC &&
            transition !== undefined &&
            ((isRuleTransition && ruleTransition.followState === handle.right) ||
                transition.target === handle.right)) {
            // we can avoid epsilon edge to next element
            if (isRuleTransition) {
                ruleTransition.followState = next;
            }
            else {
                transition.target = next;
            }
            removeState(atn, handle.right); // we skipped over this state
        }
        else {
            // need epsilon if previous block's right end node is complex
            epsilon(handle.right, next);
        }
    }
    const first = alts[0];
    const last = alts[altsLength - 1];
    return {
        left: first.left,
        right: last.right
    };
}
function tokenRef(atn, rule, tokenType, production) {
    const left = newState(atn, rule, production, {
        type: ATN_BASIC
    });
    const right = newState(atn, rule, production, {
        type: ATN_BASIC
    });
    addTransition(left, new AtomTransition(right, tokenType));
    return {
        left,
        right
    };
}
function ruleRef(atn, currentRule, nonTerminal) {
    const rule = nonTerminal.referencedRule;
    const start = atn.ruleToStartState.get(rule);
    const left = newState(atn, currentRule, nonTerminal, {
        type: ATN_BASIC
    });
    const right = newState(atn, currentRule, nonTerminal, {
        type: ATN_BASIC
    });
    const call = new RuleTransition(start, rule, right);
    addTransition(left, call);
    return {
        left,
        right
    };
}
function buildRuleHandle(atn, rule, block) {
    const start = atn.ruleToStartState.get(rule);
    epsilon(start, block.left);
    const stop = atn.ruleToStopState.get(rule);
    epsilon(block.right, stop);
    const handle = {
        left: start,
        right: stop
    };
    return handle;
}
function epsilon(a, b) {
    const transition = new EpsilonTransition(b);
    addTransition(a, transition);
}
function newState(atn, rule, production, partial) {
    const t = Object.assign({ atn,
        production, epsilonOnlyTransitions: false, rule, transitions: [], nextTokenWithinRule: [], stateNumber: atn.states.length }, partial);
    atn.states.push(t);
    return t;
}
function addTransition(state, transition) {
    // A single ATN state can only contain epsilon transitions or non-epsilon transitions
    // Because they are never mixed, only setting the property for the first transition is fine
    if (state.transitions.length === 0) {
        state.epsilonOnlyTransitions = transition.isEpsilon();
    }
    state.transitions.push(transition);
}
function removeState(atn, state) {
    atn.states.splice(atn.states.indexOf(state), 1);
}
//# sourceMappingURL=atn.js.map