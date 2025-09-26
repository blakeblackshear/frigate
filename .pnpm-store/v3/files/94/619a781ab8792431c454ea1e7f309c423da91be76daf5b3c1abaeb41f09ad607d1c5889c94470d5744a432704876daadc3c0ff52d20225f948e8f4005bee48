/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
    IToken,
    TokenType,
    tokenMatcher,
    tokenLabel,
    Rule,
    IProductionWithOccurrence,
    NonTerminal,
    Alternation,
    Option,
    RepetitionMandatory,
    RepetitionMandatoryWithSeparator,
    RepetitionWithSeparator,
    Repetition,
    Terminal,
    BaseParser,
    LLkLookaheadStrategy,
    ILookaheadValidationError,
    IOrAlt,
    getLookaheadPaths,
    OptionalProductionType
} from "chevrotain";
import {
    ATN,
    ATNState,
    ATN_RULE_STOP,
    AtomTransition,
    buildATNKey,
    createATN,
    DecisionState,
    EpsilonTransition,
    RuleTransition,
    Transition
} from "./atn.js";
import {
    ATNConfig,
    ATNConfigSet,
    DFA,
    DFAState,
    DFA_ERROR,
    getATNConfigKey
} from "./dfa.js";
import min from "lodash-es/min.js";
import flatMap from "lodash-es/flatMap.js";
import uniqBy from "lodash-es/uniqBy.js";
import map from "lodash-es/map.js";
import flatten from "lodash-es/flatten.js";
import forEach from "lodash-es/forEach.js";
import isEmpty from "lodash-es/isEmpty.js";
import reduce from "lodash-es/reduce.js";

type DFACache = (predicateSet: PredicateSet) => DFA

export type AmbiguityReport = (message: string) => void;

function createDFACache(startState: DecisionState, decision: number): DFACache {
    const map: Record<string, DFA | undefined> = {}
    return (predicateSet) => {
        const key = predicateSet.toString()
        let existing = map[key]
        if (existing !== undefined) {
            return existing
        } else {
            existing = {
                atnStartState: startState,
                decision,
                states: {}
            }
            map[key] = existing
            return existing
        }
    }
}

class PredicateSet {
    private predicates: boolean[] = []

    is(index: number): boolean {
        return index >= this.predicates.length || this.predicates[index]
    }

    set(index: number, value: boolean) {
        this.predicates[index] = value
    }

    toString(): string {
        let value = ""
        const size = this.predicates.length
        for (let i = 0; i < size; i++) {
            value += this.predicates[i] === true ? "1" : "0"
        }
        return value
    }
}

interface AdaptivePredictError {
    tokenPath: IToken[]
    possibleTokenTypes: TokenType[]
    actualToken: IToken
}

const EMPTY_PREDICATES = new PredicateSet()

export interface LLStarLookaheadOptions {
    logging?: AmbiguityReport
}

export class LLStarLookaheadStrategy extends LLkLookaheadStrategy {

    private atn: ATN;
    private dfas: DFACache[];
    private logging: AmbiguityReport;

    constructor(options?: LLStarLookaheadOptions) {
        super();
        this.logging = options?.logging ?? ((message) => console.log(message));
    }

    override initialize(options: { rules: Rule[] }): void {
        this.atn = createATN(options.rules);
        this.dfas = initATNSimulator(this.atn);
    }

    override validateAmbiguousAlternationAlternatives(): ILookaheadValidationError[] {
        return [];
    }

    override validateEmptyOrAlternatives(): ILookaheadValidationError[] {
        return [];
    }

    override buildLookaheadForAlternation(options: {
        prodOccurrence: number;
        rule: Rule;
        maxLookahead: number;
        hasPredicates: boolean;
        dynamicTokensEnabled: boolean
    }): (this: BaseParser, orAlts?: IOrAlt<any>[] | undefined) => number | undefined {
        const { prodOccurrence, rule, hasPredicates, dynamicTokensEnabled } = options;
        const dfas = this.dfas;
        const logging = this.logging;
        const key = buildATNKey(rule, 'Alternation', prodOccurrence);
        const decisionState = this.atn.decisionMap[key];
        const decisionIndex = decisionState.decision;
        const partialAlts: (TokenType | undefined)[][] = map(
            getLookaheadPaths({
                maxLookahead: 1,
                occurrence: prodOccurrence,
                prodType: "Alternation",
                rule: rule
            }),
            (currAlt) => map(currAlt, (path) => path[0])
        )

        if (isLL1Sequence(partialAlts, false) && !dynamicTokensEnabled) {
            const choiceToAlt = reduce(
                partialAlts,
                (result, currAlt, idx) => {
                    forEach(currAlt, (currTokType) => {
                        if (currTokType) {
                            result[currTokType.tokenTypeIdx!] = idx
                            forEach(currTokType.categoryMatches!, (currExtendingType) => {
                                result[currExtendingType] = idx
                            })
                        }
                    })
                    return result
                },
                {} as Record<number, number>
            )

            if (hasPredicates) {
                return function (this: BaseParser, orAlts) {
                    const nextToken = this.LA(1)
                    const prediction: number | undefined = choiceToAlt[nextToken.tokenTypeIdx]
                    if (orAlts !== undefined && prediction !== undefined) {
                        const gate = orAlts[prediction]?.GATE
                        if (gate !== undefined && gate.call(this) === false) {
                            return undefined;
                        }
                    }
                    return prediction
                }
            } else {
                return function (this: BaseParser): number | undefined {
                    const nextToken = this.LA(1)
                    return choiceToAlt[nextToken.tokenTypeIdx];
                }
            }
        } else if (hasPredicates) {
            return function (this: BaseParser, orAlts) {
                const predicates = new PredicateSet()
                const length = orAlts === undefined ? 0 : orAlts.length
                for (let i = 0; i < length; i++) {
                    const gate = orAlts?.[i].GATE
                    predicates.set(i, gate === undefined || gate.call(this))
                }
                const result = adaptivePredict.call(this, dfas, decisionIndex, predicates, logging);
                return typeof result === 'number' ? result : undefined;
            }
        } else {
            return function (this: BaseParser) {
                const result = adaptivePredict.call(this, dfas, decisionIndex, EMPTY_PREDICATES, logging);
                return typeof result === 'number' ? result : undefined;
            }
        }
    }

    override buildLookaheadForOptional(options: {
        prodOccurrence: number;
        prodType: OptionalProductionType;
        rule: Rule;
        maxLookahead: number;
        dynamicTokensEnabled: boolean
    }): (this: BaseParser) => boolean {
        const { prodOccurrence, rule, prodType, dynamicTokensEnabled } = options;
        const dfas = this.dfas;
        const logging = this.logging;
        const key = buildATNKey(rule, prodType, prodOccurrence);
        const decisionState = this.atn.decisionMap[key];
        const decisionIndex = decisionState.decision;
        const alts = map(
            getLookaheadPaths({
                maxLookahead: 1,
                occurrence: prodOccurrence,
                prodType,
                rule
            }),
            (e) => {
              return map(e, (g) => g[0])
            }
          )
        
          if (isLL1Sequence(alts) && alts[0][0] && !dynamicTokensEnabled) {
            const alt = alts[0]
            const singleTokensTypes = flatten(alt)
        
            if (
              singleTokensTypes.length === 1 &&
              isEmpty(singleTokensTypes[0].categoryMatches)
            ) {
              const expectedTokenType = singleTokensTypes[0]
              const expectedTokenUniqueKey = expectedTokenType.tokenTypeIdx
        
              return function (this: BaseParser): boolean {
                return this.LA(1).tokenTypeIdx === expectedTokenUniqueKey
              }
            } else {
              const choiceToAlt = reduce(
                singleTokensTypes,
                (result, currTokType) => {
                  if (currTokType !== undefined) {
                    result[currTokType.tokenTypeIdx!] = true
                    forEach(currTokType.categoryMatches, (currExtendingType) => {
                      result[currExtendingType] = true
                    })
                  }
                  return result
                },
                {} as Record<number, boolean>
              )
        
              return function (this: BaseParser): boolean {
                const nextToken = this.LA(1)
                return choiceToAlt[nextToken.tokenTypeIdx] === true
              }
            }
          }
          return function (this: BaseParser) {
            const result = adaptivePredict.call(this, dfas, decisionIndex, EMPTY_PREDICATES, logging)
              return typeof result === "object" ? false : result === 0;
          }
    }

}

function isLL1Sequence(sequences: (TokenType | undefined)[][], allowEmpty = true): boolean {
    const fullSet = new Set<number>()

    for (const alt of sequences) {
        const altSet = new Set<number>()
        for (const tokType of alt) {
            if (tokType === undefined) {
                if (allowEmpty) {
                    // Epsilon production encountered
                    break
                } else {
                    return false;
                }
            }
            const indices = [tokType.tokenTypeIdx!].concat(tokType.categoryMatches!)
            for (const index of indices) {
                if (fullSet.has(index)) {
                    if (!altSet.has(index)) {
                        return false
                    }
                } else {
                    fullSet.add(index)
                    altSet.add(index)
                }
            }
        }
    }
    return true
}

function initATNSimulator(atn: ATN): DFACache[] {
    const decisionLength = atn.decisionStates.length
    const decisionToDFA: DFACache[] = Array(decisionLength)
    for (let i = 0; i < decisionLength; i++) {
        decisionToDFA[i] = createDFACache(atn.decisionStates[i], i)
    }
    return decisionToDFA;
}

function adaptivePredict(
    this: BaseParser,
    dfaCaches: DFACache[],
    decision: number,
    predicateSet: PredicateSet,
    logging: AmbiguityReport
): number | AdaptivePredictError {
    const dfa = dfaCaches[decision](predicateSet)
    let start = dfa.start
    if (start === undefined) {
        const closure = computeStartState(dfa.atnStartState as ATNState)
        start = addDFAState(dfa, newDFAState(closure))
        dfa.start = start
    }

    const alt = performLookahead.apply(this, [dfa, start, predicateSet, logging])
    return alt
}

function performLookahead(
    this: BaseParser,
    dfa: DFA,
    s0: DFAState,
    predicateSet: PredicateSet,
    logging: AmbiguityReport
): number | AdaptivePredictError {
    let previousD = s0

    let i = 1
    const path: IToken[] = []
    let t = this.LA(i++)

    while (true) {
        let d = getExistingTargetState(previousD, t)
        if (d === undefined) {
            d = computeLookaheadTarget.apply(this, [dfa, previousD, t, i, predicateSet, logging])
        }

        if (d === DFA_ERROR) {
            return buildAdaptivePredictError(path, previousD, t)
        }

        if (d.isAcceptState === true) {
            return d.prediction
        }

        previousD = d
        path.push(t)
        t = this.LA(i++)
    }
}

function computeLookaheadTarget(
    this: BaseParser,
    dfa: DFA,
    previousD: DFAState,
    token: IToken,
    lookahead: number,
    predicateSet: PredicateSet,
    logging: AmbiguityReport
): DFAState {
    const reach = computeReachSet(previousD.configs, token, predicateSet)
    if (reach.size === 0) {
        addDFAEdge(dfa, previousD, token, DFA_ERROR)
        return DFA_ERROR
    }

    let newState = newDFAState(reach)
    const predictedAlt = getUniqueAlt(reach, predicateSet)

    if (predictedAlt !== undefined) {
        newState.isAcceptState = true
        newState.prediction = predictedAlt
        newState.configs.uniqueAlt = predictedAlt
    } else if (hasConflictTerminatingPrediction(reach)) {
        const prediction = min(reach.alts)!
        newState.isAcceptState = true
        newState.prediction = prediction
        newState.configs.uniqueAlt = prediction
        reportLookaheadAmbiguity.apply(this, [dfa, lookahead, reach.alts, logging])
    }

    newState = addDFAEdge(dfa, previousD, token, newState)
    return newState
}

function reportLookaheadAmbiguity(
    this: BaseParser,
    dfa: DFA,
    lookahead: number,
    ambiguityIndices: number[],
    logging: AmbiguityReport
) {
    const prefixPath: TokenType[] = []
    for (let i = 1; i <= lookahead; i++) {
        prefixPath.push(this.LA(i).tokenType)
    }
    const atnState = dfa.atnStartState
    const topLevelRule = atnState.rule
    const production = atnState.production
    const message = buildAmbiguityError({
        topLevelRule,
        ambiguityIndices,
        production,
        prefixPath
    })
    logging(message)
}

function buildAmbiguityError(options: {
    topLevelRule: Rule
    prefixPath: TokenType[]
    ambiguityIndices: number[]
    production: IProductionWithOccurrence
}): string {
    const pathMsg = map(options.prefixPath, (currtok) =>
        tokenLabel(currtok)
    ).join(", ")
    const occurrence =
        options.production.idx === 0 ? "" : options.production.idx
    let currMessage =
        `Ambiguous Alternatives Detected: <${options.ambiguityIndices.join(
            ", "
        )}> in <${getProductionDslName(options.production)}${occurrence}>` +
        ` inside <${options.topLevelRule.name}> Rule,\n` +
        `<${pathMsg}> may appears as a prefix path in all these alternatives.\n`

    currMessage =
        currMessage +
        `See: https://chevrotain.io/docs/guide/resolving_grammar_errors.html#AMBIGUOUS_ALTERNATIVES\n` +
        `For Further details.`
    return currMessage
}

function getProductionDslName(prod: IProductionWithOccurrence): string {
    if (prod instanceof NonTerminal) {
        return "SUBRULE"
    } else if (prod instanceof Option) {
        return "OPTION"
    } else if (prod instanceof Alternation) {
        return "OR"
    } else if (prod instanceof RepetitionMandatory) {
        return "AT_LEAST_ONE"
    } else if (prod instanceof RepetitionMandatoryWithSeparator) {
        return "AT_LEAST_ONE_SEP"
    } else if (prod instanceof RepetitionWithSeparator) {
        return "MANY_SEP"
    } else if (prod instanceof Repetition) {
        return "MANY"
    } else if (prod instanceof Terminal) {
        return "CONSUME"
    } else {
        throw Error("non exhaustive match")
    }
}

function buildAdaptivePredictError(
    path: IToken[],
    previous: DFAState,
    current: IToken
): AdaptivePredictError {
    const nextTransitions = flatMap(
        previous.configs.elements,
        (e) => e.state.transitions
    )
    const nextTokenTypes = uniqBy(
        nextTransitions
            .filter((e): e is AtomTransition => e instanceof AtomTransition)
            .map((e) => e.tokenType),
        (e) => e.tokenTypeIdx
    )
    return {
        actualToken: current,
        possibleTokenTypes: nextTokenTypes,
        tokenPath: path
    }
}

function getExistingTargetState(
    state: DFAState,
    token: IToken
): DFAState | undefined {
    return state.edges[token.tokenTypeIdx]
}

function computeReachSet(
    configs: ATNConfigSet,
    token: IToken,
    predicateSet: PredicateSet
): ATNConfigSet {
    const intermediate = new ATNConfigSet()
    const skippedStopStates: ATNConfig[] = []

    for (const c of configs.elements) {
        if (predicateSet.is(c.alt) === false) {
            continue
        }
        if (c.state.type === ATN_RULE_STOP) {
            skippedStopStates.push(c)
            continue
        }
        const transitionLength = c.state.transitions.length
        for (let i = 0; i < transitionLength; i++) {
            const transition = c.state.transitions[i]
            const target = getReachableTarget(transition, token)
            if (target !== undefined) {
                intermediate.add({
                    state: target,
                    alt: c.alt,
                    stack: c.stack
                })
            }
        }
    }

    let reach: ATNConfigSet | undefined

    if (skippedStopStates.length === 0 && intermediate.size === 1) {
        reach = intermediate
    }

    if (reach === undefined) {
        reach = new ATNConfigSet()
        for (const c of intermediate.elements) {
            closure(c, reach)
        }
    }

    if (skippedStopStates.length > 0 && !hasConfigInRuleStopState(reach)) {
        for (const c of skippedStopStates) {
            reach.add(c)
        }
    }

    return reach
}

function getReachableTarget(
    transition: Transition,
    token: IToken
): ATNState | undefined {
    if (
        transition instanceof AtomTransition &&
        tokenMatcher(token, transition.tokenType)
    ) {
        return transition.target
    }
    return undefined
}

function getUniqueAlt(
    configs: ATNConfigSet,
    predicateSet: PredicateSet
): number | undefined {
    let alt: number | undefined
    for (const c of configs.elements) {
        if (predicateSet.is(c.alt) === true) {
            if (alt === undefined) {
                alt = c.alt
            } else if (alt !== c.alt) {
                return undefined
            }
        }
    }
    return alt
}

function newDFAState(closure: ATNConfigSet): DFAState {
    return {
        configs: closure,
        edges: {},
        isAcceptState: false,
        prediction: -1
    }
}

function addDFAEdge(
    dfa: DFA,
    from: DFAState,
    token: IToken,
    to: DFAState
): DFAState {
    to = addDFAState(dfa, to)
    from.edges[token.tokenTypeIdx] = to
    return to
}

function addDFAState(dfa: DFA, state: DFAState): DFAState {
    if (state === DFA_ERROR) {
        return state
    }
    // Repetitions have the same config set
    // Therefore, storing the key of the config in a map allows us to create a loop in our DFA
    const mapKey = state.configs.key
    const existing = dfa.states[mapKey]
    if (existing !== undefined) {
        return existing
    }
    state.configs.finalize()
    dfa.states[mapKey] = state
    return state
}

function computeStartState(atnState: ATNState): ATNConfigSet {
    const configs = new ATNConfigSet()

    const numberOfTransitions = atnState.transitions.length
    for (let i = 0; i < numberOfTransitions; i++) {
        const target = atnState.transitions[i].target
        const config: ATNConfig = {
            state: target,
            alt: i,
            stack: []
        }
        closure(config, configs)
    }

    return configs
}

function closure(config: ATNConfig, configs: ATNConfigSet): void {
    const p = config.state

    if (p.type === ATN_RULE_STOP) {
        if (config.stack.length > 0) {
            const atnStack = [...config.stack]
            const followState = atnStack.pop()!
            const followConfig: ATNConfig = {
                state: followState,
                alt: config.alt,
                stack: atnStack
            }
            closure(followConfig, configs)
        } else {
            // Dipping into outer context, simply add the config
            // This will stop computation once every config is at the rule stop state
            configs.add(config)
        }
        return
    }

    if (!p.epsilonOnlyTransitions) {
        configs.add(config)
    }

    const transitionLength = p.transitions.length
    for (let i = 0; i < transitionLength; i++) {
        const transition = p.transitions[i]
        const c = getEpsilonTarget(config, transition)

        if (c !== undefined) {
            closure(c, configs)
        }
    }
}

function getEpsilonTarget(
    config: ATNConfig,
    transition: Transition
): ATNConfig | undefined {
    if (transition instanceof EpsilonTransition) {
        return {
            state: transition.target,
            alt: config.alt,
            stack: config.stack
        }
    } else if (transition instanceof RuleTransition) {
        const stack = [...config.stack, transition.followState]
        return {
            state: transition.target,
            alt: config.alt,
            stack
        }
    }
    return undefined
}

function hasConfigInRuleStopState(configs: ATNConfigSet): boolean {
    for (const c of configs.elements) {
        if (c.state.type === ATN_RULE_STOP) {
            return true
        }
    }
    return false
}

function allConfigsInRuleStopStates(configs: ATNConfigSet): boolean {
    for (const c of configs.elements) {
        if (c.state.type !== ATN_RULE_STOP) {
            return false
        }
    }
    return true
}

function hasConflictTerminatingPrediction(configs: ATNConfigSet): boolean {
    if (allConfigsInRuleStopStates(configs)) {
        return true
    }
    const altSets = getConflictingAltSets(configs.elements)
    const heuristic =
        hasConflictingAltSet(altSets) && !hasStateAssociatedWithOneAlt(altSets)
    return heuristic
}

function getConflictingAltSets(
    configs: readonly ATNConfig[]
): Map<string, Record<number, boolean>> {
    const configToAlts = new Map<string, Record<number, boolean>>()
    for (const c of configs) {
        const key = getATNConfigKey(c, false)
        let alts = configToAlts.get(key)
        if (alts === undefined) {
            alts = {}
            configToAlts.set(key, alts)
        }
        alts[c.alt] = true
    }
    return configToAlts
}

function hasConflictingAltSet(
    altSets: Map<string, Record<number, boolean>>
): boolean {
    for (const value of Array.from(altSets.values())) {
        if (Object.keys(value).length > 1) {
            return true
        }
    }
    return false
}

function hasStateAssociatedWithOneAlt(
    altSets: Map<string, Record<number, boolean>>
): boolean {
    for (const value of Array.from(altSets.values())) {
        if (Object.keys(value).length === 1) {
            return true
        }
    }
    return false
}
