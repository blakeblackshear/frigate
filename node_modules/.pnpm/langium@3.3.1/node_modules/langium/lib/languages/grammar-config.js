/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { DefaultNameRegexp } from '../utils/cst-utils.js';
import { isCommentTerminal, terminalRegex } from '../utils/grammar-utils.js';
import { isMultilineComment } from '../utils/regexp-utils.js';
import { isTerminalRule } from './generated/ast.js';
/**
 * Create the default grammar configuration (used by `createDefaultModule`). This can be overridden in a
 * language-specific module.
 */
export function createGrammarConfig(services) {
    const rules = [];
    const grammar = services.Grammar;
    for (const rule of grammar.rules) {
        if (isTerminalRule(rule) && isCommentTerminal(rule) && isMultilineComment(terminalRegex(rule))) {
            rules.push(rule.name);
        }
    }
    return {
        multilineCommentRules: rules,
        nameRegexp: DefaultNameRegexp
    };
}
//# sourceMappingURL=grammar-config.js.map