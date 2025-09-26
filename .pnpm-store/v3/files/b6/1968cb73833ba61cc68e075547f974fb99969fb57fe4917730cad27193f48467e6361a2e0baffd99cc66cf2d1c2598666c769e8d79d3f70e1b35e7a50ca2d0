/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { URI } from '../utils/uri-utils.js';
import { UriUtils } from '../utils/uri-utils.js';
import type { FileSystemNode, FileSystemProvider } from '../workspace/file-system-provider.js';
import * as fs from 'node:fs';

export type NodeTextEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'latin1';

export class NodeFileSystemProvider implements FileSystemProvider {

    encoding: NodeTextEncoding = 'utf-8';

    readFile(uri: URI): Promise<string> {
        return fs.promises.readFile(uri.fsPath, this.encoding);
    }

    async readDirectory(folderPath: URI): Promise<FileSystemNode[]> {
        const dirents = await fs.promises.readdir(folderPath.fsPath, { withFileTypes: true });
        return dirents.map(dirent => ({
            dirent, // Include the raw entry, it may be useful...
            isFile: dirent.isFile(),
            isDirectory: dirent.isDirectory(),
            uri: UriUtils.joinPath(folderPath, dirent.name)
        }));
    }
}

export const NodeFileSystem = {
    fileSystemProvider: () => new NodeFileSystemProvider()
};
