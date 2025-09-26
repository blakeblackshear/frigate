/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { Grammar } from '../../languages/generated/ast.js';
import type { LangiumDocuments } from '../../workspace/documents.js';
import type { AstTypes } from './type-collector/types.js';
import type { ValidationAstTypes } from './type-collector/all-types.js';
import type { PlainAstTypes } from './type-collector/plain-types.js';
/**
 * Collects all types for the generated AST. The types collector entry point.
 *
 * @param grammars All grammars involved in the type generation process
 * @param documents Additional documents so that imports can be resolved as necessary
 */
export declare function collectAst(grammars: Grammar | Grammar[], documents?: LangiumDocuments): AstTypes;
/**
 * Collects all types used during the validation process.
 * The validation process requires us to compare our inferred types with our declared types.
 *
 * @param grammars All grammars involved in the validation process
 * @param documents Additional documents so that imports can be resolved as necessary
 */
export declare function collectValidationAst(grammars: Grammar | Grammar[], documents?: LangiumDocuments): ValidationAstTypes;
export declare function createAstTypes(first: PlainAstTypes, second?: PlainAstTypes): AstTypes;
export declare function specifyAstNodeProperties(astTypes: AstTypes): void;
//# sourceMappingURL=ast-collector.d.ts.map