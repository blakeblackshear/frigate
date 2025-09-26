/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { UriUtils } from '../utils/uri-utils.js';
import * as fs from 'node:fs';
export class NodeFileSystemProvider {
    constructor() {
        this.encoding = 'utf-8';
    }
    readFile(uri) {
        return fs.promises.readFile(uri.fsPath, this.encoding);
    }
    async readDirectory(folderPath) {
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
//# sourceMappingURL=node-file-system-provider.js.map