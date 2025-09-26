/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { LangiumCompletionParser } from './langium-parser.js';
import { createParser } from './parser-builder-base.js';
export function createCompletionParser(services) {
    const grammar = services.Grammar;
    const lexer = services.parser.Lexer;
    const parser = new LangiumCompletionParser(services);
    createParser(grammar, parser, lexer.definition);
    parser.finalize();
    return parser;
}
//# sourceMappingURL=completion-parser-builder.js.map