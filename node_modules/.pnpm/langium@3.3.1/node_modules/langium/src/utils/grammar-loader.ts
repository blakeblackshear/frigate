/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { createDefaultCoreModule, createDefaultSharedCoreModule } from '../default-module.js';
import type { Module } from '../dependency-injection.js';
import { inject } from '../dependency-injection.js';
import * as ast from '../languages/generated/ast.js';
import type { LangiumCoreServices, LangiumSharedCoreServices, PartialLangiumCoreServices, PartialLangiumSharedCoreServices } from '../services.js';
import type { Mutable } from '../syntax-tree.js';
import { EmptyFileSystem } from '../workspace/file-system-provider.js';
import { URI } from './uri-utils.js';

const minimalGrammarModule: Module<LangiumCoreServices, PartialLangiumCoreServices> = {
    Grammar: () => undefined as unknown as ast.Grammar,
    LanguageMetaData: () => ({
        caseInsensitive: false,
        fileExtensions: ['.langium'],
        languageId: 'langium'
    })
};

const minimalSharedGrammarModule: Module<LangiumSharedCoreServices, PartialLangiumSharedCoreServices> = {
    AstReflection: () => new ast.LangiumGrammarAstReflection()
};

function createMinimalGrammarServices(): LangiumCoreServices {
    const shared = inject(
        createDefaultSharedCoreModule(EmptyFileSystem),
        minimalSharedGrammarModule
    );
    const grammar = inject(
        createDefaultCoreModule({ shared }),
        minimalGrammarModule
    );
    shared.ServiceRegistry.register(grammar);
    return grammar;
}

/**
 * Load a Langium grammar for your language from a JSON string. This is used by several services,
 * most notably the parser builder which interprets the grammar to create a parser.
 */
export function loadGrammarFromJson(json: string): ast.Grammar {
    const services = createMinimalGrammarServices();
    const astNode = services.serializer.JsonSerializer.deserialize(json) as Mutable<ast.Grammar>;
    services.shared.workspace.LangiumDocumentFactory.fromModel(astNode, URI.parse(`memory://${astNode.name ?? 'grammar'}.langium`));
    return astNode;
}
