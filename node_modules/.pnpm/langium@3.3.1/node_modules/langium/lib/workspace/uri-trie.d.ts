/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
export declare class UriTrie<T> {
    private readonly root;
    clear(): void;
    insert(uri: string, element: T): void;
    delete(uri: string): void;
    has(uri: string): boolean;
    find(uri: string): T | undefined;
    all(): T[];
    findAll(prefix: string): T[];
    private getNode;
    private collectDocuments;
}
//# sourceMappingURL=uri-trie.d.ts.map