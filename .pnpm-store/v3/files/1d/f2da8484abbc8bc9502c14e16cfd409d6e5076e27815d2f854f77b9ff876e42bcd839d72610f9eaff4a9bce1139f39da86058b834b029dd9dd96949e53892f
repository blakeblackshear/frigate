/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { Scope } from '../../references/scope.js';
import type { LangiumCoreServices } from '../../services.js';
import type { AstNode, AstNodeDescription, ReferenceInfo } from '../../syntax-tree.js';
import type { AstNodeLocator } from '../../workspace/ast-node-locator.js';
import type { LangiumDocument, LangiumDocuments, PrecomputedScopes } from '../../workspace/documents.js';
import { DefaultScopeComputation } from '../../references/scope-computation.js';
import { DefaultScopeProvider } from '../../references/scope-provider.js';
export declare class LangiumGrammarScopeProvider extends DefaultScopeProvider {
    protected readonly langiumDocuments: LangiumDocuments;
    constructor(services: LangiumCoreServices);
    getScope(context: ReferenceInfo): Scope;
    private getTypeScope;
    protected getGlobalScope(referenceType: string, context: ReferenceInfo): Scope;
    private gatherImports;
}
export declare class LangiumGrammarScopeComputation extends DefaultScopeComputation {
    protected readonly astNodeLocator: AstNodeLocator;
    constructor(services: LangiumCoreServices);
    protected exportNode(node: AstNode, exports: AstNodeDescription[], document: LangiumDocument): void;
    protected processNode(node: AstNode, document: LangiumDocument, scopes: PrecomputedScopes): void;
    /**
     * Add synthetic type into the scope in case of explicitly or implicitly inferred type:<br>
     * cases: `ParserRule: ...;` or `ParserRule infers Type: ...;`
     */
    protected processTypeNode(node: AstNode, document: LangiumDocument, scopes: PrecomputedScopes): void;
    /**
     * Add synthetic type into the scope in case of explicitly inferred type:
     *
     * case: `{infer Action}`
     */
    protected processActionNode(node: AstNode, document: LangiumDocument, scopes: PrecomputedScopes): void;
    protected createInferredTypeDescription(node: AstNode, name: string, document?: LangiumDocument): AstNodeDescription;
}
//# sourceMappingURL=grammar-scope.d.ts.map