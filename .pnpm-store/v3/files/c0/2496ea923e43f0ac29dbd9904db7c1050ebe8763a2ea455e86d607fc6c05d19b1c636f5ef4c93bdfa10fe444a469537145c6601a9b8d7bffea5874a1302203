/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
export class DocumentTrie {
    constructor() {
        this.root = { children: new Map() };
    }
    clear() {
        this.root.children.clear();
    }
    insert(uri, document) {
        const node = this.getNode(uri, true);
        node.document = document;
    }
    delete(uri) {
        const lastPart = uri.substring(uri.lastIndexOf('/') + 1);
        const nodeToDelete = this.getNode(uri, false);
        if (nodeToDelete === null || nodeToDelete === void 0 ? void 0 : nodeToDelete.parent) {
            nodeToDelete.parent.children.delete(lastPart);
        }
    }
    has(uri) {
        return Boolean(this.getNode(uri, false));
    }
    find(uri) {
        var _a;
        return (_a = this.getNode(uri, false)) === null || _a === void 0 ? void 0 : _a.document;
    }
    all() {
        return this.collectDocuments(this.root);
    }
    findAll(prefix) {
        const node = this.getNode(prefix, false);
        if (!node) {
            return [];
        }
        return this.collectDocuments(node);
    }
    getNode(uri, create) {
        const parts = uri.split('/');
        let current = this.root;
        for (const part of parts) {
            let child = current.children.get(part);
            if (!child) {
                if (create) {
                    child = {
                        children: new Map(),
                        parent: current
                    };
                    current.children.set(part, child);
                }
                else {
                    return undefined;
                }
            }
            current = child;
        }
        return current;
    }
    collectDocuments(node) {
        const result = [];
        if (node.document) {
            result.push(node.document);
        }
        for (const child of node.children.values()) {
            result.push(...this.collectDocuments(child));
        }
        return result;
    }
}
//# sourceMappingURL=document-trie.js.map