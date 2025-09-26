/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { EMPTY_ALT, EOF } from 'chevrotain';
import { isAction, isAlternatives, isEndOfFile, isAssignment, isConjunction, isCrossReference, isDisjunction, isGroup, isKeyword, isNegation, isParameterReference, isParserRule, isRuleCall, isTerminalRule, isUnorderedGroup, isBooleanLiteral } from '../languages/generated/ast.js';
import { assertUnreachable, ErrorWithLocation } from '../utils/errors.js';
import { stream } from '../utils/stream.js';
import { findNameAssignment, getAllReachableRules, getTypeName } from '../utils/grammar-utils.js';
export function createParser(grammar, parser, tokens) {
    const parserContext = {
        parser,
        tokens,
        ruleNames: new Map()
    };
    buildRules(parserContext, grammar);
    return parser;
}
function buildRules(parserContext, grammar) {
    const reachable = getAllReachableRules(grammar, false);
    const parserRules = stream(grammar.rules).filter(isParserRule).filter(rule => reachable.has(rule));
    for (const rule of parserRules) {
        const ctx = Object.assign(Object.assign({}, parserContext), { consume: 1, optional: 1, subrule: 1, many: 1, or: 1 });
        parserContext.parser.rule(rule, buildElement(ctx, rule.definition));
    }
}
function buildElement(ctx, element, ignoreGuard = false) {
    let method;
    if (isKeyword(element)) {
        method = buildKeyword(ctx, element);
    }
    else if (isAction(element)) {
        method = buildAction(ctx, element);
    }
    else if (isAssignment(element)) {
        method = buildElement(ctx, element.terminal);
    }
    else if (isCrossReference(element)) {
        method = buildCrossReference(ctx, element);
    }
    else if (isRuleCall(element)) {
        method = buildRuleCall(ctx, element);
    }
    else if (isAlternatives(element)) {
        method = buildAlternatives(ctx, element);
    }
    else if (isUnorderedGroup(element)) {
        method = buildUnorderedGroup(ctx, element);
    }
    else if (isGroup(element)) {
        method = buildGroup(ctx, element);
    }
    else if (isEndOfFile(element)) {
        const idx = ctx.consume++;
        method = () => ctx.parser.consume(idx, EOF, element);
    }
    else {
        throw new ErrorWithLocation(element.$cstNode, `Unexpected element type: ${element.$type}`);
    }
    return wrap(ctx, ignoreGuard ? undefined : getGuardCondition(element), method, element.cardinality);
}
function buildAction(ctx, action) {
    const actionType = getTypeName(action);
    return () => ctx.parser.action(actionType, action);
}
function buildRuleCall(ctx, ruleCall) {
    const rule = ruleCall.rule.ref;
    if (isParserRule(rule)) {
        const idx = ctx.subrule++;
        const fragment = rule.fragment;
        const predicate = ruleCall.arguments.length > 0 ? buildRuleCallPredicate(rule, ruleCall.arguments) : () => ({});
        return (args) => ctx.parser.subrule(idx, getRule(ctx, rule), fragment, ruleCall, predicate(args));
    }
    else if (isTerminalRule(rule)) {
        const idx = ctx.consume++;
        const method = getToken(ctx, rule.name);
        return () => ctx.parser.consume(idx, method, ruleCall);
    }
    else if (!rule) {
        throw new ErrorWithLocation(ruleCall.$cstNode, `Undefined rule: ${ruleCall.rule.$refText}`);
    }
    else {
        assertUnreachable(rule);
    }
}
function buildRuleCallPredicate(rule, namedArgs) {
    const predicates = namedArgs.map(e => buildPredicate(e.value));
    return (args) => {
        const ruleArgs = {};
        for (let i = 0; i < predicates.length; i++) {
            const ruleTarget = rule.parameters[i];
            const predicate = predicates[i];
            ruleArgs[ruleTarget.name] = predicate(args);
        }
        return ruleArgs;
    };
}
function buildPredicate(condition) {
    if (isDisjunction(condition)) {
        const left = buildPredicate(condition.left);
        const right = buildPredicate(condition.right);
        return (args) => (left(args) || right(args));
    }
    else if (isConjunction(condition)) {
        const left = buildPredicate(condition.left);
        const right = buildPredicate(condition.right);
        return (args) => (left(args) && right(args));
    }
    else if (isNegation(condition)) {
        const value = buildPredicate(condition.value);
        return (args) => !value(args);
    }
    else if (isParameterReference(condition)) {
        const name = condition.parameter.ref.name;
        return (args) => args !== undefined && args[name] === true;
    }
    else if (isBooleanLiteral(condition)) {
        const value = Boolean(condition.true);
        return () => value;
    }
    assertUnreachable(condition);
}
function buildAlternatives(ctx, alternatives) {
    if (alternatives.elements.length === 1) {
        return buildElement(ctx, alternatives.elements[0]);
    }
    else {
        const methods = [];
        for (const element of alternatives.elements) {
            const predicatedMethod = {
                // Since we handle the guard condition in the alternative already
                // We can ignore the group guard condition inside
                ALT: buildElement(ctx, element, true)
            };
            const guard = getGuardCondition(element);
            if (guard) {
                predicatedMethod.GATE = buildPredicate(guard);
            }
            methods.push(predicatedMethod);
        }
        const idx = ctx.or++;
        return (args) => ctx.parser.alternatives(idx, methods.map(method => {
            const alt = {
                ALT: () => method.ALT(args)
            };
            const gate = method.GATE;
            if (gate) {
                alt.GATE = () => gate(args);
            }
            return alt;
        }));
    }
}
function buildUnorderedGroup(ctx, group) {
    if (group.elements.length === 1) {
        return buildElement(ctx, group.elements[0]);
    }
    const methods = [];
    for (const element of group.elements) {
        const predicatedMethod = {
            // Since we handle the guard condition in the alternative already
            // We can ignore the group guard condition inside
            ALT: buildElement(ctx, element, true)
        };
        const guard = getGuardCondition(element);
        if (guard) {
            predicatedMethod.GATE = buildPredicate(guard);
        }
        methods.push(predicatedMethod);
    }
    const orIdx = ctx.or++;
    const idFunc = (groupIdx, lParser) => {
        const stackId = lParser.getRuleStack().join('-');
        return `uGroup_${groupIdx}_${stackId}`;
    };
    const alternatives = (args) => ctx.parser.alternatives(orIdx, methods.map((method, idx) => {
        const alt = { ALT: () => true };
        const parser = ctx.parser;
        alt.ALT = () => {
            method.ALT(args);
            if (!parser.isRecording()) {
                const key = idFunc(orIdx, parser);
                if (!parser.unorderedGroups.get(key)) {
                    // init after clear state
                    parser.unorderedGroups.set(key, []);
                }
                const groupState = parser.unorderedGroups.get(key);
                if (typeof (groupState === null || groupState === void 0 ? void 0 : groupState[idx]) === 'undefined') {
                    // Not accessed yet
                    groupState[idx] = true;
                }
            }
        };
        const gate = method.GATE;
        if (gate) {
            alt.GATE = () => gate(args);
        }
        else {
            alt.GATE = () => {
                const trackedAlternatives = parser.unorderedGroups.get(idFunc(orIdx, parser));
                const allow = !(trackedAlternatives === null || trackedAlternatives === void 0 ? void 0 : trackedAlternatives[idx]);
                return allow;
            };
        }
        return alt;
    }));
    const wrapped = wrap(ctx, getGuardCondition(group), alternatives, '*');
    return (args) => {
        wrapped(args);
        if (!ctx.parser.isRecording()) {
            ctx.parser.unorderedGroups.delete(idFunc(orIdx, ctx.parser));
        }
    };
}
function buildGroup(ctx, group) {
    const methods = group.elements.map(e => buildElement(ctx, e));
    return (args) => methods.forEach(method => method(args));
}
function getGuardCondition(element) {
    if (isGroup(element)) {
        return element.guardCondition;
    }
    return undefined;
}
function buildCrossReference(ctx, crossRef, terminal = crossRef.terminal) {
    if (!terminal) {
        if (!crossRef.type.ref) {
            throw new Error('Could not resolve reference to type: ' + crossRef.type.$refText);
        }
        const assignment = findNameAssignment(crossRef.type.ref);
        const assignTerminal = assignment === null || assignment === void 0 ? void 0 : assignment.terminal;
        if (!assignTerminal) {
            throw new Error('Could not find name assignment for type: ' + getTypeName(crossRef.type.ref));
        }
        return buildCrossReference(ctx, crossRef, assignTerminal);
    }
    else if (isRuleCall(terminal) && isParserRule(terminal.rule.ref)) {
        // The terminal is a data type rule here. Everything else will result in a validation error.
        const rule = terminal.rule.ref;
        const idx = ctx.subrule++;
        return (args) => ctx.parser.subrule(idx, getRule(ctx, rule), false, crossRef, args);
    }
    else if (isRuleCall(terminal) && isTerminalRule(terminal.rule.ref)) {
        const idx = ctx.consume++;
        const terminalRule = getToken(ctx, terminal.rule.ref.name);
        return () => ctx.parser.consume(idx, terminalRule, crossRef);
    }
    else if (isKeyword(terminal)) {
        const idx = ctx.consume++;
        const keyword = getToken(ctx, terminal.value);
        return () => ctx.parser.consume(idx, keyword, crossRef);
    }
    else {
        throw new Error('Could not build cross reference parser');
    }
}
function buildKeyword(ctx, keyword) {
    const idx = ctx.consume++;
    const token = ctx.tokens[keyword.value];
    if (!token) {
        throw new Error('Could not find token for keyword: ' + keyword.value);
    }
    return () => ctx.parser.consume(idx, token, keyword);
}
function wrap(ctx, guard, method, cardinality) {
    const gate = guard && buildPredicate(guard);
    if (!cardinality) {
        if (gate) {
            const idx = ctx.or++;
            return (args) => ctx.parser.alternatives(idx, [
                {
                    ALT: () => method(args),
                    GATE: () => gate(args)
                },
                {
                    ALT: EMPTY_ALT(),
                    GATE: () => !gate(args)
                }
            ]);
        }
        else {
            return method;
        }
    }
    if (cardinality === '*') {
        const idx = ctx.many++;
        return (args) => ctx.parser.many(idx, {
            DEF: () => method(args),
            GATE: gate ? () => gate(args) : undefined
        });
    }
    else if (cardinality === '+') {
        const idx = ctx.many++;
        if (gate) {
            const orIdx = ctx.or++;
            // In the case of a guard condition for the `+` group
            // We combine it with an empty alternative
            // If the condition returns true, it needs to parse at least a single iteration
            // If its false, it is not allowed to parse anything
            return (args) => ctx.parser.alternatives(orIdx, [
                {
                    ALT: () => ctx.parser.atLeastOne(idx, {
                        DEF: () => method(args)
                    }),
                    GATE: () => gate(args)
                },
                {
                    ALT: EMPTY_ALT(),
                    GATE: () => !gate(args)
                }
            ]);
        }
        else {
            return (args) => ctx.parser.atLeastOne(idx, {
                DEF: () => method(args),
            });
        }
    }
    else if (cardinality === '?') {
        const idx = ctx.optional++;
        return (args) => ctx.parser.optional(idx, {
            DEF: () => method(args),
            GATE: gate ? () => gate(args) : undefined
        });
    }
    else {
        assertUnreachable(cardinality);
    }
}
function getRule(ctx, element) {
    const name = getRuleName(ctx, element);
    const rule = ctx.parser.getRule(name);
    if (!rule)
        throw new Error(`Rule "${name}" not found."`);
    return rule;
}
function getRuleName(ctx, element) {
    if (isParserRule(element)) {
        return element.name;
    }
    else if (ctx.ruleNames.has(element)) {
        return ctx.ruleNames.get(element);
    }
    else {
        let item = element;
        let parent = item.$container;
        let ruleName = element.$type;
        while (!isParserRule(parent)) {
            if (isGroup(parent) || isAlternatives(parent) || isUnorderedGroup(parent)) {
                const index = parent.elements.indexOf(item);
                ruleName = index.toString() + ':' + ruleName;
            }
            item = parent;
            parent = parent.$container;
        }
        const rule = parent;
        ruleName = rule.name + ':' + ruleName;
        ctx.ruleNames.set(element, ruleName);
        return ruleName;
    }
}
function getToken(ctx, name) {
    const token = ctx.tokens[name];
    if (!token)
        throw new Error(`Token "${name}" not found."`);
    return token;
}
//# sourceMappingURL=parser-builder-base.js.map