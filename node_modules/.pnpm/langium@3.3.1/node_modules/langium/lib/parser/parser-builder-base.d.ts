/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { TokenTypeDictionary } from 'chevrotain';
import type { Grammar } from '../languages/generated/ast.js';
import type { BaseParser } from './langium-parser.js';
export declare function createParser<T extends BaseParser>(grammar: Grammar, parser: T, tokens: TokenTypeDictionary): T;
//# sourceMappingURL=parser-builder-base.d.ts.map