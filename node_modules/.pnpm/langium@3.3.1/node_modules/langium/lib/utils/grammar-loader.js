/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { createDefaultCoreModule, createDefaultSharedCoreModule } from '../default-module.js';
import { inject } from '../dependency-injection.js';
import * as ast from '../languages/generated/ast.js';
import { EmptyFileSystem } from '../workspace/file-system-provider.js';
import { URI } from './uri-utils.js';
const minimalGrammarModule = {
    Grammar: () => undefined,
    LanguageMetaData: () => ({
        caseInsensitive: false,
        fileExtensions: ['.langium'],
        languageId: 'langium'
    })
};
const minimalSharedGrammarModule = {
    AstReflection: () => new ast.LangiumGrammarAstReflection()
};
function createMinimalGrammarServices() {
    const shared = inject(createDefaultSharedCoreModule(EmptyFileSystem), minimalSharedGrammarModule);
    const grammar = inject(createDefaultCoreModule({ shared }), minimalGrammarModule);
    shared.ServiceRegistry.register(grammar);
    return grammar;
}
/**
 * Load a Langium grammar for your language from a JSON string. This is used by several services,
 * most notably the parser builder which interprets the grammar to create a parser.
 */
export function loadGrammarFromJson(json) {
    var _a;
    const services = createMinimalGrammarServices();
    const astNode = services.serializer.JsonSerializer.deserialize(json);
    services.shared.workspace.LangiumDocumentFactory.fromModel(astNode, URI.parse(`memory://${(_a = astNode.name) !== null && _a !== void 0 ? _a : 'grammar'}.langium`));
    return astNode;
}
//# sourceMappingURL=grammar-loader.js.map