/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { tokenMatcher, tokenLabel, NonTerminal, Alternation, Option, RepetitionMandatory, RepetitionMandatoryWithSeparator, RepetitionWithSeparator, Repetition, Terminal, LLkLookaheadStrategy, getLookaheadPaths } from "chevrotain";
import { ATN_RULE_STOP, AtomTransition, buildATNKey, createATN, EpsilonTransition, RuleTransition } from "./atn.js";
import { ATNConfigSet, DFA_ERROR, getATNConfigKey } from "./dfa.js";
import min from "lodash-es/min.js";
import flatMap from "lodash-es/flatMap.js";
import uniqBy from "lodash-es/uniqBy.js";
import map from "lodash-es/map.js";
import flatten from "lodash-es/flatten.js";
import forEach from "lodash-es/forEach.js";
import isEmpty from "lodash-es/isEmpty.js";
import reduce from "lodash-es/reduce.js";
function createDFACache(startState, decision) {
    const map = {};
    return (predicateSet) => {
        const key = predicateSet.toString();
        let existing = map[key];
        if (existing !== undefined) {
            return existing;
        }
        else {
            existing = {
                atnStartState: startState,
                decision,
                states: {}
            };
            map[key] = existing;
            return existing;
        }
    };
}
class PredicateSet {
    constructor() {
        this.predicates = [];
    }
    is(index) {
        return index >= this.predicates.length || this.predicates[index];
    }
    set(index, value) {
        this.predicates[index] = value;
    }
    toString() {
        let value = "";
        const size = this.predicates.length;
        for (let i = 0; i < size; i++) {
            value += this.predicates[i] === true ? "1" : "0";
        }
        return value;
    }
}
const EMPTY_PREDICATES = new PredicateSet();
export class LLStarLookaheadStrategy extends LLkLookaheadStrategy {
    constructor(options) {
        var _a;
        super();
        this.logging = (_a = options === null || options === void 0 ? void 0 : options.logging) !== null && _a !== void 0 ? _a : ((message) => console.log(message));
    }
    initialize(options) {
        this.atn = createATN(options.rules);
        this.dfas = initATNSimulator(this.atn);
    }
    validateAmbiguousAlternationAlternatives() {
        return [];
    }
    validateEmptyOrAlternatives() {
        return [];
    }
    buildLookaheadForAlternation(options) {
        const { prodOccurrence, rule, hasPredicates, dynamicTokensEnabled } = options;
        const dfas = this.dfas;
        const logging = this.logging;
        const key = buildATNKey(rule, 'Alternation', prodOccurrence);
        const decisionState = this.atn.decisionMap[key];
        const decisionIndex = decisionState.decision;
        const partialAlts = map(getLookaheadPaths({
            maxLookahead: 1,
            occurrence: prodOccurrence,
            prodType: "Alternation",
            rule: rule
        }), (currAlt) => map(currAlt, (path) => path[0]));
        if (isLL1Sequence(partialAlts, false) && !dynamicTokensEnabled) {
            const choiceToAlt = reduce(partialAlts, (result, currAlt, idx) => {
                forEach(currAlt, (currTokType) => {
                    if (currTokType) {
                        result[currTokType.tokenTypeIdx] = idx;
                        forEach(currTokType.categoryMatches, (currExtendingType) => {
                            result[currExtendingType] = idx;
                        });
                    }
                });
                return result;
            }, {});
            if (hasPredicates) {
                return function (orAlts) {
                    var _a;
                    const nextToken = this.LA(1);
                    const prediction = choiceToAlt[nextToken.tokenTypeIdx];
                    if (orAlts !== undefined && prediction !== undefined) {
                        const gate = (_a = orAlts[prediction]) === null || _a === void 0 ? void 0 : _a.GATE;
                        if (gate !== undefined && gate.call(this) === false) {
                            return undefined;
                        }
                    }
                    return prediction;
                };
            }
            else {
                return function () {
                    const nextToken = this.LA(1);
                    return choiceToAlt[nextToken.tokenTypeIdx];
                };
            }
        }
        else if (hasPredicates) {
            return function (orAlts) {
                const predicates = new PredicateSet();
                const length = orAlts === undefined ? 0 : orAlts.length;
                for (let i = 0; i < length; i++) {
                    const gate = orAlts === null || orAlts === void 0 ? void 0 : orAlts[i].GATE;
                    predicates.set(i, gate === undefined || gate.call(this));
                }
                const result = adaptivePredict.call(this, dfas, decisionIndex, predicates, logging);
                return typeof result === 'number' ? result : undefined;
            };
        }
        else {
            return function () {
                const result = adaptivePredict.call(this, dfas, decisionIndex, EMPTY_PREDICATES, logging);
                return typeof result === 'number' ? result : undefined;
            };
        }
    }
    buildLookaheadForOptional(options) {
        const { prodOccurrence, rule, prodType, dynamicTokensEnabled } = options;
        const dfas = this.dfas;
        const logging = this.logging;
        const key = buildATNKey(rule, prodType, prodOccurrence);
        const decisionState = this.atn.decisionMap[key];
        const decisionIndex = decisionState.decision;
        const alts = map(getLookaheadPaths({
            maxLookahead: 1,
            occurrence: prodOccurrence,
            prodType,
            rule
        }), (e) => {
            return map(e, (g) => g[0]);
        });
        if (isLL1Sequence(alts) && alts[0][0] && !dynamicTokensEnabled) {
            const alt = alts[0];
            const singleTokensTypes = flatten(alt);
            if (singleTokensTypes.length === 1 &&
                isEmpty(singleTokensTypes[0].categoryMatches)) {
                const expectedTokenType = singleTokensTypes[0];
                const expectedTokenUniqueKey = expectedTokenType.tokenTypeIdx;
                return function () {
                    return this.LA(1).tokenTypeIdx === expectedTokenUniqueKey;
                };
            }
            else {
                const choiceToAlt = reduce(singleTokensTypes, (result, currTokType) => {
                    if (currTokType !== undefined) {
                        result[currTokType.tokenTypeIdx] = true;
                        forEach(currTokType.categoryMatches, (currExtendingType) => {
                            result[currExtendingType] = true;
                        });
                    }
                    return result;
                }, {});
                return function () {
                    const nextToken = this.LA(1);
                    return choiceToAlt[nextToken.tokenTypeIdx] === true;
                };
            }
        }
        return function () {
            const result = adaptivePredict.call(this, dfas, decisionIndex, EMPTY_PREDICATES, logging);
            return typeof result === "object" ? false : result === 0;
        };
    }
}
function isLL1Sequence(sequences, allowEmpty = true) {
    const fullSet = new Set();
    for (const alt of sequences) {
        const altSet = new Set();
        for (const tokType of alt) {
            if (tokType === undefined) {
                if (allowEmpty) {
                    // Epsilon production encountered
                    break;
                }
                else {
                    return false;
                }
            }
            const indices = [tokType.tokenTypeIdx].concat(tokType.categoryMatches);
            for (const index of indices) {
                if (fullSet.has(index)) {
                    if (!altSet.has(index)) {
                        return false;
                    }
                }
                else {
                    fullSet.add(index);
                    altSet.add(index);
                }
            }
        }
    }
    return true;
}
function initATNSimulator(atn) {
    const decisionLength = atn.decisionStates.length;
    const decisionToDFA = Array(decisionLength);
    for (let i = 0; i < decisionLength; i++) {
        decisionToDFA[i] = createDFACache(atn.decisionStates[i], i);
    }
    return decisionToDFA;
}
function adaptivePredict(dfaCaches, decision, predicateSet, logging) {
    const dfa = dfaCaches[decision](predicateSet);
    let start = dfa.start;
    if (start === undefined) {
        const closure = computeStartState(dfa.atnStartState);
        start = addDFAState(dfa, newDFAState(closure));
        dfa.start = start;
    }
    const alt = performLookahead.apply(this, [dfa, start, predicateSet, logging]);
    return alt;
}
function performLookahead(dfa, s0, predicateSet, logging) {
    let previousD = s0;
    let i = 1;
    const path = [];
    let t = this.LA(i++);
    while (true) {
        let d = getExistingTargetState(previousD, t);
        if (d === undefined) {
            d = computeLookaheadTarget.apply(this, [dfa, previousD, t, i, predicateSet, logging]);
        }
        if (d === DFA_ERROR) {
            return buildAdaptivePredictError(path, previousD, t);
        }
        if (d.isAcceptState === true) {
            return d.prediction;
        }
        previousD = d;
        path.push(t);
        t = this.LA(i++);
    }
}
function computeLookaheadTarget(dfa, previousD, token, lookahead, predicateSet, logging) {
    const reach = computeReachSet(previousD.configs, token, predicateSet);
    if (reach.size === 0) {
        addDFAEdge(dfa, previousD, token, DFA_ERROR);
        return DFA_ERROR;
    }
    let newState = newDFAState(reach);
    const predictedAlt = getUniqueAlt(reach, predicateSet);
    if (predictedAlt !== undefined) {
        newState.isAcceptState = true;
        newState.prediction = predictedAlt;
        newState.configs.uniqueAlt = predictedAlt;
    }
    else if (hasConflictTerminatingPrediction(reach)) {
        const prediction = min(reach.alts);
        newState.isAcceptState = true;
        newState.prediction = prediction;
        newState.configs.uniqueAlt = prediction;
        reportLookaheadAmbiguity.apply(this, [dfa, lookahead, reach.alts, logging]);
    }
    newState = addDFAEdge(dfa, previousD, token, newState);
    return newState;
}
function reportLookaheadAmbiguity(dfa, lookahead, ambiguityIndices, logging) {
    const prefixPath = [];
    for (let i = 1; i <= lookahead; i++) {
        prefixPath.push(this.LA(i).tokenType);
    }
    const atnState = dfa.atnStartState;
    const topLevelRule = atnState.rule;
    const production = atnState.production;
    const message = buildAmbiguityError({
        topLevelRule,
        ambiguityIndices,
        production,
        prefixPath
    });
    logging(message);
}
function buildAmbiguityError(options) {
    const pathMsg = map(options.prefixPath, (currtok) => tokenLabel(currtok)).join(", ");
    const occurrence = options.production.idx === 0 ? "" : options.production.idx;
    let currMessage = `Ambiguous Alternatives Detected: <${options.ambiguityIndices.join(", ")}> in <${getProductionDslName(options.production)}${occurrence}>` +
        ` inside <${options.topLevelRule.name}> Rule,\n` +
        `<${pathMsg}> may appears as a prefix path in all these alternatives.\n`;
    currMessage =
        currMessage +
            `See: https://chevrotain.io/docs/guide/resolving_grammar_errors.html#AMBIGUOUS_ALTERNATIVES\n` +
            `For Further details.`;
    return currMessage;
}
function getProductionDslName(prod) {
    if (prod instanceof NonTerminal) {
        return "SUBRULE";
    }
    else if (prod instanceof Option) {
        return "OPTION";
    }
    else if (prod instanceof Alternation) {
        return "OR";
    }
    else if (prod instanceof RepetitionMandatory) {
        return "AT_LEAST_ONE";
    }
    else if (prod instanceof RepetitionMandatoryWithSeparator) {
        return "AT_LEAST_ONE_SEP";
    }
    else if (prod instanceof RepetitionWithSeparator) {
        return "MANY_SEP";
    }
    else if (prod instanceof Repetition) {
        return "MANY";
    }
    else if (prod instanceof Terminal) {
        return "CONSUME";
    }
    else {
        throw Error("non exhaustive match");
    }
}
function buildAdaptivePredictError(path, previous, current) {
    const nextTransitions = flatMap(previous.configs.elements, (e) => e.state.transitions);
    const nextTokenTypes = uniqBy(nextTransitions
        .filter((e) => e instanceof AtomTransition)
        .map((e) => e.tokenType), (e) => e.tokenTypeIdx);
    return {
        actualToken: current,
        possibleTokenTypes: nextTokenTypes,
        tokenPath: path
    };
}
function getExistingTargetState(state, token) {
    return state.edges[token.tokenTypeIdx];
}
function computeReachSet(configs, token, predicateSet) {
    const intermediate = new ATNConfigSet();
    const skippedStopStates = [];
    for (const c of configs.elements) {
        if (predicateSet.is(c.alt) === false) {
            continue;
        }
        if (c.state.type === ATN_RULE_STOP) {
            skippedStopStates.push(c);
            continue;
        }
        const transitionLength = c.state.transitions.length;
        for (let i = 0; i < transitionLength; i++) {
            const transition = c.state.transitions[i];
            const target = getReachableTarget(transition, token);
            if (target !== undefined) {
                intermediate.add({
                    state: target,
                    alt: c.alt,
                    stack: c.stack
                });
            }
        }
    }
    let reach;
    if (skippedStopStates.length === 0 && intermediate.size === 1) {
        reach = intermediate;
    }
    if (reach === undefined) {
        reach = new ATNConfigSet();
        for (const c of intermediate.elements) {
            closure(c, reach);
        }
    }
    if (skippedStopStates.length > 0 && !hasConfigInRuleStopState(reach)) {
        for (const c of skippedStopStates) {
            reach.add(c);
        }
    }
    return reach;
}
function getReachableTarget(transition, token) {
    if (transition instanceof AtomTransition &&
        tokenMatcher(token, transition.tokenType)) {
        return transition.target;
    }
    return undefined;
}
function getUniqueAlt(configs, predicateSet) {
    let alt;
    for (const c of configs.elements) {
        if (predicateSet.is(c.alt) === true) {
            if (alt === undefined) {
                alt = c.alt;
            }
            else if (alt !== c.alt) {
                return undefined;
            }
        }
    }
    return alt;
}
function newDFAState(closure) {
    return {
        configs: closure,
        edges: {},
        isAcceptState: false,
        prediction: -1
    };
}
function addDFAEdge(dfa, from, token, to) {
    to = addDFAState(dfa, to);
    from.edges[token.tokenTypeIdx] = to;
    return to;
}
function addDFAState(dfa, state) {
    if (state === DFA_ERROR) {
        return state;
    }
    // Repetitions have the same config set
    // Therefore, storing the key of the config in a map allows us to create a loop in our DFA
    const mapKey = state.configs.key;
    const existing = dfa.states[mapKey];
    if (existing !== undefined) {
        return existing;
    }
    state.configs.finalize();
    dfa.states[mapKey] = state;
    return state;
}
function computeStartState(atnState) {
    const configs = new ATNConfigSet();
    const numberOfTransitions = atnState.transitions.length;
    for (let i = 0; i < numberOfTransitions; i++) {
        const target = atnState.transitions[i].target;
        const config = {
            state: target,
            alt: i,
            stack: []
        };
        closure(config, configs);
    }
    return configs;
}
function closure(config, configs) {
    const p = config.state;
    if (p.type === ATN_RULE_STOP) {
        if (config.stack.length > 0) {
            const atnStack = [...config.stack];
            const followState = atnStack.pop();
            const followConfig = {
                state: followState,
                alt: config.alt,
                stack: atnStack
            };
            closure(followConfig, configs);
        }
        else {
            // Dipping into outer context, simply add the config
            // This will stop computation once every config is at the rule stop state
            configs.add(config);
        }
        return;
    }
    if (!p.epsilonOnlyTransitions) {
        configs.add(config);
    }
    const transitionLength = p.transitions.length;
    for (let i = 0; i < transitionLength; i++) {
        const transition = p.transitions[i];
        const c = getEpsilonTarget(config, transition);
        if (c !== undefined) {
            closure(c, configs);
        }
    }
}
function getEpsilonTarget(config, transition) {
    if (transition instanceof EpsilonTransition) {
        return {
            state: transition.target,
            alt: config.alt,
            stack: config.stack
        };
    }
    else if (transition instanceof RuleTransition) {
        const stack = [...config.stack, transition.followState];
        return {
            state: transition.target,
            alt: config.alt,
            stack
        };
    }
    return undefined;
}
function hasConfigInRuleStopState(configs) {
    for (const c of configs.elements) {
        if (c.state.type === ATN_RULE_STOP) {
            return true;
        }
    }
    return false;
}
function allConfigsInRuleStopStates(configs) {
    for (const c of configs.elements) {
        if (c.state.type !== ATN_RULE_STOP) {
            return false;
        }
    }
    return true;
}
function hasConflictTerminatingPrediction(configs) {
    if (allConfigsInRuleStopStates(configs)) {
        return true;
    }
    const altSets = getConflictingAltSets(configs.elements);
    const heuristic = hasConflictingAltSet(altSets) && !hasStateAssociatedWithOneAlt(altSets);
    return heuristic;
}
function getConflictingAltSets(configs) {
    const configToAlts = new Map();
    for (const c of configs) {
        const key = getATNConfigKey(c, false);
        let alts = configToAlts.get(key);
        if (alts === undefined) {
            alts = {};
            configToAlts.set(key, alts);
        }
        alts[c.alt] = true;
    }
    return configToAlts;
}
function hasConflictingAltSet(altSets) {
    for (const value of Array.from(altSets.values())) {
        if (Object.keys(value).length > 1) {
            return true;
        }
    }
    return false;
}
function hasStateAssociatedWithOneAlt(altSets) {
    for (const value of Array.from(altSets.values())) {
        if (Object.keys(value).length === 1) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=all-star-lookahead.js.map