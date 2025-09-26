/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { CodeActionParams } from 'vscode-languageserver-protocol';
import type { CodeAction, Command } from 'vscode-languageserver-types';
import type { CodeActionProvider } from '../../lsp/code-action.js';
import type { LangiumServices } from '../../lsp/lsp-services.js';
import type { AstReflection } from '../../syntax-tree.js';
import type { MaybePromise } from '../../utils/promise-utils.js';
import type { LangiumDocument } from '../../workspace/documents.js';
import type { IndexManager } from '../../workspace/index-manager.js';
export declare class LangiumGrammarCodeActionProvider implements CodeActionProvider {
    protected readonly reflection: AstReflection;
    protected readonly indexManager: IndexManager;
    constructor(services: LangiumServices);
    getCodeActions(document: LangiumDocument, params: CodeActionParams): MaybePromise<Array<Command | CodeAction>>;
    private createCodeActions;
    /**
     * Adds missing returns for parser rule
     */
    private fixMissingReturns;
    private fixInvalidReturnsInfers;
    private fixMissingInfer;
    private fixSuperfluousInfer;
    private fixUnnecessaryFileExtension;
    private makeUpperCase;
    private addEntryKeyword;
    private fixRegexTokens;
    private fixCrossRefSyntax;
    private fixHiddenTerminals;
    private addNewRule;
    private lookInGlobalScope;
}
//# sourceMappingURL=grammar-code-actions.d.ts.map