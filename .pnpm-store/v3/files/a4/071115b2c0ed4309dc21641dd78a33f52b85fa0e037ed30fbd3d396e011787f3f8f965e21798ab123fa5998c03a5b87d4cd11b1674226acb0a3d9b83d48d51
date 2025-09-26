/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import map from "lodash-es/map.js"
import filter from "lodash-es/filter.js"
import {
    IProduction,
    IProductionWithOccurrence,
    TokenType,
    Alternation,
    NonTerminal,
    Rule,
    Option,
    RepetitionMandatory,
    Repetition,
    Terminal,
    Alternative,
    RepetitionWithSeparator,
    RepetitionMandatoryWithSeparator,
    LookaheadProductionType
} from "chevrotain"

export function buildATNKey(rule: Rule, type: LookaheadProductionType, occurrence: number): string {
    return `${rule.name}_${type}_${occurrence}`;
}

export interface ATN {
    decisionMap: Record<string, DecisionState>
    states: ATNState[]
    decisionStates: DecisionState[]
    ruleToStartState: Map<Rule, RuleStartState>
    ruleToStopState: Map<Rule, RuleStopState>
}

export const ATN_INVALID_TYPE = 0
export const ATN_BASIC = 1
export const ATN_RULE_START = 2
export const ATN_PLUS_BLOCK_START = 4
export const ATN_STAR_BLOCK_START = 5
// Currently unused as the ATN is not used for lexing
export const ATN_TOKEN_START = 6
export const ATN_RULE_STOP = 7
export const ATN_BLOCK_END = 8
export const ATN_STAR_LOOP_BACK = 9
export const ATN_STAR_LOOP_ENTRY = 10
export const ATN_PLUS_LOOP_BACK = 11
export const ATN_LOOP_END = 12

export type ATNState =
    | BasicState
    | BasicBlockStartState
    | PlusBlockStartState
    | PlusLoopbackState
    | StarBlockStartState
    | StarLoopbackState
    | StarLoopEntryState
    | BlockEndState
    | RuleStartState
    | RuleStopState
    | LoopEndState

export interface ATNBaseState {
    atn: ATN
    production: IProductionWithOccurrence
    stateNumber: number
    rule: Rule
    epsilonOnlyTransitions: boolean
    transitions: Transition[]
    nextTokenWithinRule: number[]
}

export interface BasicState extends ATNBaseState {
    type: typeof ATN_BASIC
}

export interface BlockStartState extends DecisionState {
    end: BlockEndState
}

export interface BasicBlockStartState extends BlockStartState {
    type: typeof ATN_BASIC
}

export interface PlusBlockStartState extends BlockStartState {
    loopback: PlusLoopbackState
    type: typeof ATN_PLUS_BLOCK_START
}

export interface PlusLoopbackState extends DecisionState {
    type: typeof ATN_PLUS_LOOP_BACK
}

export interface StarBlockStartState extends BlockStartState {
    type: typeof ATN_STAR_BLOCK_START
}

export interface StarLoopbackState extends ATNBaseState {
    type: typeof ATN_STAR_LOOP_BACK
}

export interface StarLoopEntryState extends DecisionState {
    loopback: StarLoopbackState
    type: typeof ATN_STAR_LOOP_ENTRY
}

export interface BlockEndState extends ATNBaseState {
    start: BlockStartState
    type: typeof ATN_BLOCK_END
}

export interface DecisionState extends ATNBaseState {
    decision: number
}

export interface LoopEndState extends ATNBaseState {
    loopback: ATNState
    type: typeof ATN_LOOP_END
}

export interface RuleStartState extends ATNBaseState {
    stop: RuleStopState
    type: typeof ATN_RULE_START
}

export interface RuleStopState extends ATNBaseState {
    type: typeof ATN_RULE_STOP
}

export interface Transition {
    target: ATNState
    isEpsilon(): boolean
}

export abstract class AbstractTransition implements Transition {
    target: ATNState

    constructor(target: ATNState) {
        this.target = target
    }

    isEpsilon() {
        return false
    }
}

export class AtomTransition extends AbstractTransition {
    tokenType: TokenType

    constructor(target: ATNState, tokenType: TokenType) {
        super(target)
        this.tokenType = tokenType
    }
}

export class EpsilonTransition extends AbstractTransition {
    constructor(target: ATNState) {
        super(target)
    }

    isEpsilon() {
        return true
    }
}

export class RuleTransition extends AbstractTransition {
    rule: Rule
    followState: ATNState

    constructor(ruleStart: RuleStartState, rule: Rule, followState: ATNState) {
        super(ruleStart)
        this.rule = rule
        this.followState = followState
    }

    isEpsilon() {
        return true
    }
}

interface ATNHandle {
    left: ATNState
    right: ATNState
}

export function createATN(rules: Rule[]): ATN {
    const atn: ATN = {
        decisionMap: {},
        decisionStates: [],
        ruleToStartState: new Map(),
        ruleToStopState: new Map(),
        states: []
    }
    createRuleStartAndStopATNStates(atn, rules)
    const ruleLength = rules.length
    for (let i = 0; i < ruleLength; i++) {
        const rule = rules[i]
        const ruleBlock = block(atn, rule, rule)
        if (ruleBlock === undefined) {
            continue
        }
        buildRuleHandle(atn, rule, ruleBlock)
    }
    return atn
}

function createRuleStartAndStopATNStates(atn: ATN, rules: Rule[]): void {
    const ruleLength = rules.length
    for (let i = 0; i < ruleLength; i++) {
        const rule = rules[i]
        const start = newState<RuleStartState>(atn, rule, undefined, {
            type: ATN_RULE_START
        })
        const stop = newState<RuleStopState>(atn, rule, undefined, {
            type: ATN_RULE_STOP
        })
        start.stop = stop
        atn.ruleToStartState.set(rule, start)
        atn.ruleToStopState.set(rule, stop)
    }
}

function atom(
    atn: ATN,
    rule: Rule,
    production: IProduction
): ATNHandle | undefined {
    if (production instanceof Terminal) {
        return tokenRef(atn, rule, production.terminalType, production)
    } else if (production instanceof NonTerminal) {
        return ruleRef(atn, rule, production)
    } else if (production instanceof Alternation) {
        return alternation(atn, rule, production)
    } else if (production instanceof Option) {
        return option(atn, rule, production)
    } else if (production instanceof Repetition) {
        return repetition(atn, rule, production)
    } else if (production instanceof RepetitionWithSeparator) {
        return repetitionSep(atn, rule, production)
    } else if (production instanceof RepetitionMandatory) {
        return repetitionMandatory(atn, rule, production)
    } else if (production instanceof RepetitionMandatoryWithSeparator) {
        return repetitionMandatorySep(atn, rule, production)
    } else {
        return block(atn, rule, production as Alternative)
    }
}

function repetition(atn: ATN, rule: Rule, repetition: Repetition): ATNHandle {
    const starState = newState<StarBlockStartState>(atn, rule, repetition, {
        type: ATN_STAR_BLOCK_START
    })
    defineDecisionState(atn, starState)
    const handle = makeAlts(
        atn,
        rule,
        starState,
        repetition,
        block(atn, rule, repetition)
    )
    return star(atn, rule, repetition, handle)
}

function repetitionSep(
    atn: ATN,
    rule: Rule,
    repetition: RepetitionWithSeparator
): ATNHandle {
    const starState = newState<StarBlockStartState>(atn, rule, repetition, {
        type: ATN_STAR_BLOCK_START
    })
    defineDecisionState(atn, starState)
    const handle = makeAlts(
        atn,
        rule,
        starState,
        repetition,
        block(atn, rule, repetition)
    )
    const sep = tokenRef(atn, rule, repetition.separator, repetition)
    return star(atn, rule, repetition, handle, sep)
}

function repetitionMandatory(
    atn: ATN,
    rule: Rule,
    repetition: RepetitionMandatory
): ATNHandle {
    const plusState = newState<PlusBlockStartState>(atn, rule, repetition, {
        type: ATN_PLUS_BLOCK_START
    })
    defineDecisionState(atn, plusState)
    const handle = makeAlts(
        atn,
        rule,
        plusState,
        repetition,
        block(atn, rule, repetition)
    )
    return plus(atn, rule, repetition, handle)
}

function repetitionMandatorySep(
    atn: ATN,
    rule: Rule,
    repetition: RepetitionMandatoryWithSeparator
): ATNHandle {
    const plusState = newState<PlusBlockStartState>(atn, rule, repetition, {
        type: ATN_PLUS_BLOCK_START
    })
    defineDecisionState(atn, plusState)
    const handle = makeAlts(
        atn,
        rule,
        plusState,
        repetition,
        block(atn, rule, repetition)
    )
    const sep = tokenRef(atn, rule, repetition.separator, repetition)
    return plus(atn, rule, repetition, handle, sep)
}

function alternation(
    atn: ATN,
    rule: Rule,
    alternation: Alternation
): ATNHandle {
    const start = newState<BasicBlockStartState>(atn, rule, alternation, {
        type: ATN_BASIC
    })
    defineDecisionState(atn, start)
    const alts = map(alternation.definition, (e) => atom(atn, rule, e))
    const handle = makeAlts(atn, rule, start, alternation, ...alts)
    return handle
}

function option(atn: ATN, rule: Rule, option: Option): ATNHandle {
    const start = newState<BasicBlockStartState>(atn, rule, option, {
        type: ATN_BASIC
    })
    defineDecisionState(atn, start)
    const handle = makeAlts(atn, rule, start, option, block(atn, rule, option))
    return optional(atn, rule, option, handle)
}

function block(
    atn: ATN,
    rule: Rule,
    block: { definition: IProduction[] }
): ATNHandle | undefined {
    const handles = filter(
        map(block.definition, (e) => atom(atn, rule, e)),
        (e) => e !== undefined
    ) as ATNHandle[]
    if (handles.length === 1) {
        return handles[0]
    } else if (handles.length === 0) {
        return undefined
    } else {
        return makeBlock(atn, handles)
    }
}

function plus(
    atn: ATN,
    rule: Rule,
    plus: IProductionWithOccurrence,
    handle: ATNHandle,
    sep?: ATNHandle
): ATNHandle {
    const blkStart = handle.left as PlusBlockStartState
    const blkEnd = handle.right

    const loop = newState<PlusLoopbackState>(atn, rule, plus, {
        type: ATN_PLUS_LOOP_BACK
    })
    defineDecisionState(atn, loop)
    const end = newState<LoopEndState>(atn, rule, plus, {
        type: ATN_LOOP_END
    })
    blkStart.loopback = loop
    end.loopback = loop
    atn.decisionMap[buildATNKey(rule, sep ? 'RepetitionMandatoryWithSeparator' : 'RepetitionMandatory', plus.idx)] = loop;
    epsilon(blkEnd, loop) // block can see loop back

    // Depending on whether we have a separator we put the exit transition at index 1 or 0
    // This influences the chosen option in the lookahead DFA
    if (sep === undefined) {
        epsilon(loop, blkStart) // loop back to start
        epsilon(loop, end) // exit
    } else {
        epsilon(loop, end) // exit
        // loop back to start with separator
        epsilon(loop, sep.left)
        epsilon(sep.right, blkStart)
    }

    return {
        left: blkStart,
        right: end
    }
}

function star(
    atn: ATN,
    rule: Rule,
    star: IProductionWithOccurrence,
    handle: ATNHandle,
    sep?: ATNHandle
): ATNHandle {
    const start = handle.left
    const end = handle.right

    const entry = newState<StarLoopEntryState>(atn, rule, star, {
        type: ATN_STAR_LOOP_ENTRY
    })
    defineDecisionState(atn, entry)
    const loopEnd = newState<LoopEndState>(atn, rule, star, {
        type: ATN_LOOP_END
    })
    const loop = newState<StarLoopbackState>(atn, rule, star, {
        type: ATN_STAR_LOOP_BACK
    })
    entry.loopback = loop
    loopEnd.loopback = loop

    epsilon(entry, start) // loop enter edge (alt 2)
    epsilon(entry, loopEnd) // bypass loop edge (alt 1)
    epsilon(end, loop) // block end hits loop back

    if (sep !== undefined) {
        epsilon(loop, loopEnd) // end loop
        // loop back to start of handle using separator
        epsilon(loop, sep.left)
        epsilon(sep.right, start)
    } else {
        epsilon(loop, entry) // loop back to entry/exit decision
    }

    atn.decisionMap[buildATNKey(rule, sep ? 'RepetitionWithSeparator' : 'Repetition', star.idx)] = entry;
    return {
        left: entry,
        right: loopEnd
    }
}

function optional(atn: ATN, rule: Rule, optional: Option, handle: ATNHandle): ATNHandle {
    const start = handle.left as DecisionState
    const end = handle.right

    epsilon(start, end)

    atn.decisionMap[buildATNKey(rule, 'Option', optional.idx)] = start;
    return handle
}

function defineDecisionState(atn: ATN, state: DecisionState): number {
    atn.decisionStates.push(state)
    state.decision = atn.decisionStates.length - 1
    return state.decision
}

function makeAlts(
    atn: ATN,
    rule: Rule,
    start: BlockStartState,
    production: IProductionWithOccurrence,
    ...alts: (ATNHandle | undefined)[]
): ATNHandle {
    const end = newState<BlockEndState>(atn, rule, production, {
        type: ATN_BLOCK_END,
        start
    })
    start.end = end
    for (const alt of alts) {
        if (alt !== undefined) {
            // hook alts up to decision block
            epsilon(start, alt.left)
            epsilon(alt.right, end)
        } else {
            epsilon(start, end)
        }
    }

    const handle: ATNHandle = {
        left: start as ATNState,
        right: end
    }
    atn.decisionMap[buildATNKey(rule, getProdType(production), production.idx)] = start
    return handle
}

function getProdType(production: IProduction): LookaheadProductionType {
    if (production instanceof Alternation) {
        return 'Alternation';
    } else if (production instanceof Option) {
        return 'Option';
    } else if (production instanceof Repetition) {
        return 'Repetition';
    } else if (production instanceof RepetitionWithSeparator) {
        return 'RepetitionWithSeparator';
    } else if (production instanceof RepetitionMandatory) {
        return 'RepetitionMandatory';
    } else if (production instanceof RepetitionMandatoryWithSeparator) {
        return 'RepetitionMandatoryWithSeparator';
    } else {
        throw new Error('Invalid production type encountered');
    }
}

function makeBlock(atn: ATN, alts: ATNHandle[]): ATNHandle {
    const altsLength = alts.length
    for (let i = 0; i < altsLength - 1; i++) {
        const handle = alts[i]
        let transition: Transition | undefined
        if (handle.left.transitions.length === 1) {
            transition = handle.left.transitions[0]
        }
        const isRuleTransition = transition instanceof RuleTransition
        const ruleTransition = transition as RuleTransition
        const next = alts[i + 1].left
        if (
            handle.left.type === ATN_BASIC &&
            handle.right.type === ATN_BASIC &&
            transition !== undefined &&
            ((isRuleTransition && ruleTransition.followState === handle.right) ||
                transition.target === handle.right)
        ) {
            // we can avoid epsilon edge to next element
            if (isRuleTransition) {
                ruleTransition.followState = next
            } else {
                transition.target = next
            }
            removeState(atn, handle.right) // we skipped over this state
        } else {
            // need epsilon if previous block's right end node is complex
            epsilon(handle.right, next)
        }
    }

    const first = alts[0]
    const last = alts[altsLength - 1]
    return {
        left: first.left,
        right: last.right
    }
}

function tokenRef(
    atn: ATN,
    rule: Rule,
    tokenType: TokenType,
    production: IProductionWithOccurrence
): ATNHandle {
    const left = newState<BasicState>(atn, rule, production, {
        type: ATN_BASIC
    })
    const right = newState<BasicState>(atn, rule, production, {
        type: ATN_BASIC
    })
    addTransition(left, new AtomTransition(right, tokenType))
    return {
        left,
        right
    }
}

function ruleRef(
    atn: ATN,
    currentRule: Rule,
    nonTerminal: NonTerminal
): ATNHandle {
    const rule = nonTerminal.referencedRule
    const start = atn.ruleToStartState.get(rule)!
    const left = newState<BasicBlockStartState>(atn, currentRule, nonTerminal, {
        type: ATN_BASIC
    })
    const right = newState<BasicBlockStartState>(atn, currentRule, nonTerminal, {
        type: ATN_BASIC
    })

    const call = new RuleTransition(start, rule, right)
    addTransition(left, call)

    return {
        left,
        right
    }
}

function buildRuleHandle(atn: ATN, rule: Rule, block: ATNHandle): ATNHandle {
    const start = atn.ruleToStartState.get(rule)!
    epsilon(start, block.left)
    const stop = atn.ruleToStopState.get(rule)!
    epsilon(block.right, stop)
    const handle: ATNHandle = {
        left: start,
        right: stop
    }
    return handle
}

function epsilon(a: ATNBaseState, b: ATNBaseState): void {
    const transition = new EpsilonTransition(b as ATNState)
    addTransition(a, transition)
}

function newState<T extends ATNState>(
    atn: ATN,
    rule: Rule,
    production: IProductionWithOccurrence | undefined,
    partial: Partial<T>
): T {
    const t: T = {
        atn,
        production,
        epsilonOnlyTransitions: false,
        rule,
        transitions: [],
        nextTokenWithinRule: [],
        stateNumber: atn.states.length,
        ...partial
    } as unknown as T
    atn.states.push(t)
    return t
}

function addTransition(state: ATNBaseState, transition: Transition) {
    // A single ATN state can only contain epsilon transitions or non-epsilon transitions
    // Because they are never mixed, only setting the property for the first transition is fine
    if (state.transitions.length === 0) {
        state.epsilonOnlyTransitions = transition.isEpsilon()
    }
    state.transitions.push(transition)
}

function removeState(atn: ATN, state: ATNState): void {
    atn.states.splice(atn.states.indexOf(state), 1)
}
