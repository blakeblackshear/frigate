/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { URI } from 'vscode-uri';
import type { FileSystemNode, FileSystemProvider } from '../workspace/file-system-provider.js';
export declare class VirtualFileSystemProvider implements FileSystemProvider {
    private readonly trie;
    insert(uri: URI | string, content: string): void;
    delete(uri: URI | string): void;
    stat(uri: URI): Promise<FileSystemNode>;
    statSync(uri: URI): FileSystemNode;
    readFile(uri: URI): Promise<string>;
    readDirectory(uri: URI): Promise<FileSystemNode[]>;
}
//# sourceMappingURL=virtual-file-system.d.ts.map