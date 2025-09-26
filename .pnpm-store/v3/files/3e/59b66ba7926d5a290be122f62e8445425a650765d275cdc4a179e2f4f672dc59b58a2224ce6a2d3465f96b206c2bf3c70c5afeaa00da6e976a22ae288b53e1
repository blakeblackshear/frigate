/******************************************************************************
* Copyright 2021 TypeFox GmbH
* This program and the accompanying materials are made available under the
* terms of the MIT License, which is available in the project root.
******************************************************************************/
import type { LangiumCoreServices } from '../../services.js';
import type { AstNode, CstNode } from '../../syntax-tree.js';
import type { Stream } from '../../utils/stream.js';
import type { ReferenceDescription } from '../../workspace/ast-descriptions.js';
import type { LangiumDocuments } from '../../workspace/documents.js';
import type { Action, Assignment, Interface, ParserRule, Type, TypeAttribute } from '../../languages/generated/ast.js';
import type { FindReferencesOptions } from '../../references/references.js';
import { DefaultReferences } from '../../references/references.js';
export declare class LangiumGrammarReferences extends DefaultReferences {
    protected readonly documents: LangiumDocuments;
    constructor(services: LangiumCoreServices);
    findDeclaration(sourceCstNode: CstNode): AstNode | undefined;
    findReferences(targetNode: AstNode, options: FindReferencesOptions): Stream<ReferenceDescription>;
    protected findReferencesToTypeAttribute(targetNode: TypeAttribute, includeDeclaration: boolean): Stream<ReferenceDescription>;
    protected createReferencesToAttribute(ruleOrAction: ParserRule | Action, attribute: TypeAttribute): ReferenceDescription[];
    protected findAssignmentDeclaration(assignment: Assignment): AstNode | undefined;
    protected findActionDeclaration(action: Action, featureName?: string): TypeAttribute | undefined;
    protected findRulesWithReturnType(interf: Interface | Type): Array<ParserRule | Action>;
}
//# sourceMappingURL=grammar-references.d.ts.map