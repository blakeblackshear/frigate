/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { LangiumCoreServices } from '../services.js';
import { DefaultNameRegexp } from '../utils/cst-utils.js';
import { isCommentTerminal, terminalRegex } from '../utils/grammar-utils.js';
import { isMultilineComment } from '../utils/regexp-utils.js';
import { isTerminalRule } from './generated/ast.js';

export interface GrammarConfig {
    /**
     * Lists all rule names which are classified as multiline comment rules
     */
    multilineCommentRules: string[]
    /**
     * A regular expression which matches characters of names
     */
    nameRegexp: RegExp
}

/**
 * Create the default grammar configuration (used by `createDefaultModule`). This can be overridden in a
 * language-specific module.
 */
export function createGrammarConfig(services: LangiumCoreServices): GrammarConfig {
    const rules: string[] = [];
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
