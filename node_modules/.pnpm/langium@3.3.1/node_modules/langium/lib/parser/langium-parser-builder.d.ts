/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { LangiumCoreServices } from '../services.js';
import { LangiumParser } from './langium-parser.js';
/**
 * Create and finalize a Langium parser. The parser rules are derived from the grammar, which is
 * available at `services.Grammar`.
 */
export declare function createLangiumParser(services: LangiumCoreServices): LangiumParser;
/**
 * Create a Langium parser without finalizing it. This is used to extract more detailed error
 * information when the parser is initially validated.
 */
export declare function prepareLangiumParser(services: LangiumCoreServices): LangiumParser;
//# sourceMappingURL=langium-parser-builder.d.ts.map