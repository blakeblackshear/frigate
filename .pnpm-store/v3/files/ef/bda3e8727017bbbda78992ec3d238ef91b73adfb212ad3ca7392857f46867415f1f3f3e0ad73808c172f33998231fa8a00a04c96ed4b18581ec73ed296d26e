/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { LangiumCoreServices } from '../services.js';
import { LangiumParser } from './langium-parser.js';
import { createParser } from './parser-builder-base.js';

/**
 * Create and finalize a Langium parser. The parser rules are derived from the grammar, which is
 * available at `services.Grammar`.
 */
export function createLangiumParser(services: LangiumCoreServices): LangiumParser {
    const parser = prepareLangiumParser(services);
    parser.finalize();
    return parser;
}

/**
 * Create a Langium parser without finalizing it. This is used to extract more detailed error
 * information when the parser is initially validated.
 */
export function prepareLangiumParser(services: LangiumCoreServices): LangiumParser {
    const grammar = services.Grammar;
    const lexer = services.parser.Lexer;
    const parser = new LangiumParser(services);
    return createParser(grammar, parser, lexer.definition);
}
