/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { Module } from '../dependency-injection.js';
import type { LangiumServices, LangiumSharedServices, PartialLangiumServices, PartialLangiumSharedServices } from '../lsp/lsp-services.js';
import { type DefaultSharedModuleContext } from '../lsp/default-lsp-module.js';
import { LangiumGrammarValidator } from './validation/validator.js';
import { LangiumGrammarValidationResourcesCollector } from './validation/validation-resources-collector.js';
import { LangiumGrammarTypesValidator } from './validation/types-validator.js';
export type LangiumGrammarAddedServices = {
    validation: {
        LangiumGrammarValidator: LangiumGrammarValidator;
        ValidationResourcesCollector: LangiumGrammarValidationResourcesCollector;
        LangiumGrammarTypesValidator: LangiumGrammarTypesValidator;
    };
};
export type LangiumGrammarServices = LangiumServices & LangiumGrammarAddedServices;
export declare const LangiumGrammarModule: Module<LangiumGrammarServices, PartialLangiumServices & LangiumGrammarAddedServices>;
/**
 * Creates Langium grammar services, enriched with LSP functionality
 *
 * @param context Shared module context, used to create additional shared modules
 * @param sharedModule Existing shared module to inject together with new shared services
 * @param module Additional/modified service implementations for the language services
 * @returns Shared services enriched with LSP services + Grammar services, per usual
 */
export declare function createLangiumGrammarServices(context: DefaultSharedModuleContext, sharedModule?: Module<LangiumSharedServices, PartialLangiumSharedServices>, module?: Module<LangiumServices, PartialLangiumServices>): {
    shared: LangiumSharedServices;
    grammar: LangiumGrammarServices;
};
//# sourceMappingURL=langium-grammar-module.d.ts.map