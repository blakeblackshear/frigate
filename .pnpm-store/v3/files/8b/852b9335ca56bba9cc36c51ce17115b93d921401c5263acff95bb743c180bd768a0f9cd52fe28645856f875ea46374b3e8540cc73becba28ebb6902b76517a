/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { DefinitionParams } from 'vscode-languageserver';
import type { LangiumServices } from '../../lsp/lsp-services.js';
import type { AstNode, LeafCstNode } from '../../syntax-tree.js';
import type { MaybePromise } from '../../utils/promise-utils.js';
import type { LangiumDocuments } from '../../workspace/documents.js';
import type { Grammar } from '../../languages/generated/ast.js';
import { LocationLink } from 'vscode-languageserver';
import { DefaultDefinitionProvider } from '../../lsp/index.js';
export declare class LangiumGrammarDefinitionProvider extends DefaultDefinitionProvider {
    protected documents: LangiumDocuments;
    constructor(services: LangiumServices);
    protected collectLocationLinks(sourceCstNode: LeafCstNode, _params: DefinitionParams): MaybePromise<LocationLink[] | undefined>;
    protected findTargetObject(importedGrammar: Grammar): AstNode | undefined;
}
//# sourceMappingURL=grammar-definition.d.ts.map