/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
export class UriTrie {
    constructor() {
        this.root = { name: '', children: new Map() };
    }
    clear() {
        this.root.children.clear();
    }
    insert(uri, element) {
        const node = this.getNode(uri, true);
        node.element = element;
    }
    delete(uri) {
        const nodeToDelete = this.getNode(uri, false);
        if (nodeToDelete === null || nodeToDelete === void 0 ? void 0 : nodeToDelete.parent) {
            nodeToDelete.parent.children.delete(nodeToDelete.name);
        }
    }
    has(uri) {
        var _a;
        return Boolean((_a = this.getNode(uri, false)) === null || _a === void 0 ? void 0 : _a.element);
    }
    find(uri) {
        var _a;
        return (_a = this.getNode(uri, false)) === null || _a === void 0 ? void 0 : _a.element;
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
        if (uri.charAt(uri.length - 1) === '/') {
            // Remove the last part if the URI ends with a slash
            parts.pop();
        }
        let current = this.root;
        for (const part of parts) {
            let child = current.children.get(part);
            if (!child) {
                if (create) {
                    child = {
                        name: part,
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
        if (node.element) {
            result.push(node.element);
        }
        for (const child of node.children.values()) {
            result.push(...this.collectDocuments(child));
        }
        return result;
    }
}
//# sourceMappingURL=uri-trie.js.map