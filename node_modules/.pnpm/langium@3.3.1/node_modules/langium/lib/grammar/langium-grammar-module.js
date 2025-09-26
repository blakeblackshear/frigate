/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { LangiumGrammarTypeHierarchyProvider } from './lsp/grammar-type-hierarchy.js';
import { createDefaultModule, createDefaultSharedModule } from '../lsp/default-lsp-module.js';
import { inject } from '../dependency-injection.js';
import { LangiumGrammarGeneratedModule, LangiumGrammarGeneratedSharedModule } from './generated/module.js';
import { LangiumGrammarScopeComputation, LangiumGrammarScopeProvider } from './references/grammar-scope.js';
import { LangiumGrammarValidator, registerValidationChecks } from './validation/validator.js';
import { LangiumGrammarCodeActionProvider } from './lsp/grammar-code-actions.js';
import { LangiumGrammarCompletionProvider } from './lsp/grammar-completion-provider.js';
import { LangiumGrammarFoldingRangeProvider } from './lsp/grammar-folding-ranges.js';
import { LangiumGrammarFormatter } from './lsp/grammar-formatter.js';
import { LangiumGrammarSemanticTokenProvider } from './lsp/grammar-semantic-tokens.js';
import { LangiumGrammarNameProvider } from './references/grammar-naming.js';
import { LangiumGrammarReferences } from './references/grammar-references.js';
import { LangiumGrammarDefinitionProvider } from './lsp/grammar-definition.js';
import { LangiumGrammarCallHierarchyProvider } from './lsp/grammar-call-hierarchy.js';
import { LangiumGrammarValidationResourcesCollector } from './validation/validation-resources-collector.js';
import { LangiumGrammarTypesValidator, registerTypeValidationChecks } from './validation/types-validator.js';
import { DocumentState } from '../workspace/documents.js';
export const LangiumGrammarModule = {
    validation: {
        LangiumGrammarValidator: (services) => new LangiumGrammarValidator(services),
        ValidationResourcesCollector: (services) => new LangiumGrammarValidationResourcesCollector(services),
        LangiumGrammarTypesValidator: () => new LangiumGrammarTypesValidator(),
    },
    lsp: {
        FoldingRangeProvider: (services) => new LangiumGrammarFoldingRangeProvider(services),
        CodeActionProvider: (services) => new LangiumGrammarCodeActionProvider(services),
        SemanticTokenProvider: (services) => new LangiumGrammarSemanticTokenProvider(services),
        Formatter: () => new LangiumGrammarFormatter(),
        DefinitionProvider: (services) => new LangiumGrammarDefinitionProvider(services),
        CallHierarchyProvider: (services) => new LangiumGrammarCallHierarchyProvider(services),
        TypeHierarchyProvider: (services) => new LangiumGrammarTypeHierarchyProvider(services),
        CompletionProvider: (services) => new LangiumGrammarCompletionProvider(services)
    },
    references: {
        ScopeComputation: (services) => new LangiumGrammarScopeComputation(services),
        ScopeProvider: (services) => new LangiumGrammarScopeProvider(services),
        References: (services) => new LangiumGrammarReferences(services),
        NameProvider: () => new LangiumGrammarNameProvider()
    }
};
/**
 * Creates Langium grammar services, enriched with LSP functionality
 *
 * @param context Shared module context, used to create additional shared modules
 * @param sharedModule Existing shared module to inject together with new shared services
 * @param module Additional/modified service implementations for the language services
 * @returns Shared services enriched with LSP services + Grammar services, per usual
 */
export function createLangiumGrammarServices(context, sharedModule, module) {
    const shared = inject(createDefaultSharedModule(context), LangiumGrammarGeneratedSharedModule, sharedModule);
    const grammar = inject(createDefaultModule({ shared }), LangiumGrammarGeneratedModule, LangiumGrammarModule, module);
    addTypeCollectionPhase(shared, grammar);
    shared.ServiceRegistry.register(grammar);
    registerValidationChecks(grammar);
    registerTypeValidationChecks(grammar);
    if (!context.connection) {
        // We don't run inside a language server
        // Therefore, initialize the configuration provider instantly
        shared.workspace.ConfigurationProvider.initialized({});
    }
    return { shared, grammar };
}
function addTypeCollectionPhase(sharedServices, grammarServices) {
    const documentBuilder = sharedServices.workspace.DocumentBuilder;
    documentBuilder.onDocumentPhase(DocumentState.IndexedReferences, async (document) => {
        const typeCollector = grammarServices.validation.ValidationResourcesCollector;
        const grammar = document.parseResult.value;
        document.validationResources = typeCollector.collectValidationResources(grammar);
    });
}
//# sourceMappingURL=langium-grammar-module.js.map