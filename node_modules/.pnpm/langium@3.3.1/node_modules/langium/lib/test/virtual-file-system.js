/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { URI } from 'vscode-uri';
import { UriTrie } from '../utils/uri-utils.js';
export class VirtualFileSystemProvider {
    constructor() {
        this.trie = new UriTrie();
    }
    insert(uri, content) {
        this.trie.insert(uri, content);
    }
    delete(uri) {
        this.trie.delete(uri);
    }
    stat(uri) {
        return Promise.resolve(this.statSync(uri));
    }
    statSync(uri) {
        const node = this.trie.findNode(uri);
        if (node) {
            return {
                isDirectory: node.element === undefined,
                isFile: node.element !== undefined,
                uri
            };
        }
        else {
            throw new Error('File not found');
        }
    }
    readFile(uri) {
        const data = this.trie.find(uri);
        if (typeof data === 'string') {
            return Promise.resolve(data);
        }
        else {
            throw new Error('File not found');
        }
    }
    readDirectory(uri) {
        const node = this.trie.findNode(uri);
        if (!node) {
            throw new Error('Directory not found');
        }
        const children = this.trie.findChildren(uri);
        return Promise.resolve(children.map(child => ({
            isDirectory: child.element === undefined,
            isFile: child.element !== undefined,
            uri: URI.parse(child.uri)
        })));
    }
}
//# sourceMappingURL=virtual-file-system.js.map