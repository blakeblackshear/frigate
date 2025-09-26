/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { LangiumDocument } from './documents.js';
export declare class DocumentTrie {
    private readonly root;
    clear(): void;
    insert(uri: string, document: LangiumDocument): void;
    delete(uri: string): void;
    has(uri: string): boolean;
    find(uri: string): LangiumDocument | undefined;
    all(): LangiumDocument[];
    findAll(prefix: string): LangiumDocument[];
    private getNode;
    private collectDocuments;
}
//# sourceMappingURL=document-trie.d.ts.map