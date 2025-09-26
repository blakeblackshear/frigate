/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { ATNState, DecisionState } from "./atn.js";
export interface DFA {
    start?: DFAState;
    states: Record<string, DFAState>;
    decision: number;
    atnStartState: DecisionState;
}
export interface DFAState {
    configs: ATNConfigSet;
    edges: Record<number, DFAState>;
    isAcceptState: boolean;
    prediction: number;
}
export declare const DFA_ERROR: DFAState;
export interface ATNConfig {
    state: ATNState;
    alt: number;
    stack: ATNState[];
}
export declare class ATNConfigSet {
    private map;
    private configs;
    uniqueAlt: number | undefined;
    get size(): number;
    finalize(): void;
    add(config: ATNConfig): void;
    get elements(): readonly ATNConfig[];
    get alts(): number[];
    get key(): string;
}
export declare function getATNConfigKey(config: ATNConfig, alt?: boolean): string;
//# sourceMappingURL=dfa.d.ts.map