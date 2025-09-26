/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { URI } from '../utils/uri-utils.js';
import type { FileSystemNode, FileSystemProvider } from '../workspace/file-system-provider.js';
export type NodeTextEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'latin1';
export declare class NodeFileSystemProvider implements FileSystemProvider {
    encoding: NodeTextEncoding;
    readFile(uri: URI): Promise<string>;
    readDirectory(folderPath: URI): Promise<FileSystemNode[]>;
}
export declare const NodeFileSystem: {
    fileSystemProvider: () => NodeFileSystemProvider;
};
//# sourceMappingURL=node-file-system-provider.d.ts.map