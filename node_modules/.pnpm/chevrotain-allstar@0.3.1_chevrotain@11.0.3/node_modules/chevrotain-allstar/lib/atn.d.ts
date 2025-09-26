/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { IProductionWithOccurrence, TokenType, Rule, LookaheadProductionType } from "chevrotain";
export declare function buildATNKey(rule: Rule, type: LookaheadProductionType, occurrence: number): string;
export interface ATN {
    decisionMap: Record<string, DecisionState>;
    states: ATNState[];
    decisionStates: DecisionState[];
    ruleToStartState: Map<Rule, RuleStartState>;
    ruleToStopState: Map<Rule, RuleStopState>;
}
export declare const ATN_INVALID_TYPE = 0;
export declare const ATN_BASIC = 1;
export declare const ATN_RULE_START = 2;
export declare const ATN_PLUS_BLOCK_START = 4;
export declare const ATN_STAR_BLOCK_START = 5;
export declare const ATN_TOKEN_START = 6;
export declare const ATN_RULE_STOP = 7;
export declare const ATN_BLOCK_END = 8;
export declare const ATN_STAR_LOOP_BACK = 9;
export declare const ATN_STAR_LOOP_ENTRY = 10;
export declare const ATN_PLUS_LOOP_BACK = 11;
export declare const ATN_LOOP_END = 12;
export type ATNState = BasicState | BasicBlockStartState | PlusBlockStartState | PlusLoopbackState | StarBlockStartState | StarLoopbackState | StarLoopEntryState | BlockEndState | RuleStartState | RuleStopState | LoopEndState;
export interface ATNBaseState {
    atn: ATN;
    production: IProductionWithOccurrence;
    stateNumber: number;
    rule: Rule;
    epsilonOnlyTransitions: boolean;
    transitions: Transition[];
    nextTokenWithinRule: number[];
}
export interface BasicState extends ATNBaseState {
    type: typeof ATN_BASIC;
}
export interface BlockStartState extends DecisionState {
    end: BlockEndState;
}
export interface BasicBlockStartState extends BlockStartState {
    type: typeof ATN_BASIC;
}
export interface PlusBlockStartState extends BlockStartState {
    loopback: PlusLoopbackState;
    type: typeof ATN_PLUS_BLOCK_START;
}
export interface PlusLoopbackState extends DecisionState {
    type: typeof ATN_PLUS_LOOP_BACK;
}
export interface StarBlockStartState extends BlockStartState {
    type: typeof ATN_STAR_BLOCK_START;
}
export interface StarLoopbackState extends ATNBaseState {
    type: typeof ATN_STAR_LOOP_BACK;
}
export interface StarLoopEntryState extends DecisionState {
    loopback: StarLoopbackState;
    type: typeof ATN_STAR_LOOP_ENTRY;
}
export interface BlockEndState extends ATNBaseState {
    start: BlockStartState;
    type: typeof ATN_BLOCK_END;
}
export interface DecisionState extends ATNBaseState {
    decision: number;
}
export interface LoopEndState extends ATNBaseState {
    loopback: ATNState;
    type: typeof ATN_LOOP_END;
}
export interface RuleStartState extends ATNBaseState {
    stop: RuleStopState;
    type: typeof ATN_RULE_START;
}
export interface RuleStopState extends ATNBaseState {
    type: typeof ATN_RULE_STOP;
}
export interface Transition {
    target: ATNState;
    isEpsilon(): boolean;
}
export declare abstract class AbstractTransition implements Transition {
    target: ATNState;
    constructor(target: ATNState);
    isEpsilon(): boolean;
}
export declare class AtomTransition extends AbstractTransition {
    tokenType: TokenType;
    constructor(target: ATNState, tokenType: TokenType);
}
export declare class EpsilonTransition extends AbstractTransition {
    constructor(target: ATNState);
    isEpsilon(): boolean;
}
export declare class RuleTransition extends AbstractTransition {
    rule: Rule;
    followState: ATNState;
    constructor(ruleStart: RuleStartState, rule: Rule, followState: ATNState);
    isEpsilon(): boolean;
}
export declare function createATN(rules: Rule[]): ATN;
//# sourceMappingURL=atn.d.ts.map