/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { Grammar } from '../../languages/generated/ast.js';
import type { ValidationResources } from '../workspace/documents.js';
import type { LangiumGrammarServices } from '../langium-grammar-module.js';
export declare class LangiumGrammarValidationResourcesCollector {
    private readonly documents;
    constructor(services: LangiumGrammarServices);
    collectValidationResources(grammar: Grammar): ValidationResources;
    private collectValidationInfo;
    private collectSuperProperties;
    private addSuperProperties;
}
//# sourceMappingURL=validation-resources-collector.d.ts.map