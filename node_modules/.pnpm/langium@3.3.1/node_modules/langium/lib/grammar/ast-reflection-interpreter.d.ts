/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { AstReflection } from '../syntax-tree.js';
import type { LangiumDocuments } from '../workspace/documents.js';
import type { Grammar } from '../languages/generated/ast.js';
import type { AstTypes } from './type-system/type-collector/types.js';
export declare function interpretAstReflection(astTypes: AstTypes): AstReflection;
export declare function interpretAstReflection(grammar: Grammar, documents?: LangiumDocuments): AstReflection;
//# sourceMappingURL=ast-reflection-interpreter.d.ts.map