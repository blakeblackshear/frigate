/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { EMPTY_STREAM, stream } from '../utils/stream.js';
/**
 * The default scope implementation is based on a `Stream`. It has an optional _outer scope_ describing
 * the next level of elements, which are queried when a target element is not found in the stream provided
 * to this scope.
 */
export class StreamScope {
    constructor(elements, outerScope, options) {
        var _a;
        this.elements = elements;
        this.outerScope = outerScope;
        this.caseInsensitive = (_a = options === null || options === void 0 ? void 0 : options.caseInsensitive) !== null && _a !== void 0 ? _a : false;
    }
    getAllElements() {
        if (this.outerScope) {
            return this.elements.concat(this.outerScope.getAllElements());
        }
        else {
            return this.elements;
        }
    }
    getElement(name) {
        const local = this.caseInsensitive
            ? this.elements.find(e => e.name.toLowerCase() === name.toLowerCase())
            : this.elements.find(e => e.name === name);
        if (local) {
            return local;
        }
        if (this.outerScope) {
            return this.outerScope.getElement(name);
        }
        return undefined;
    }
}
export class MapScope {
    constructor(elements, outerScope, options) {
        var _a;
        this.elements = new Map();
        this.caseInsensitive = (_a = options === null || options === void 0 ? void 0 : options.caseInsensitive) !== null && _a !== void 0 ? _a : false;
        for (const element of elements) {
            const name = this.caseInsensitive
                ? element.name.toLowerCase()
                : element.name;
            this.elements.set(name, element);
        }
        this.outerScope = outerScope;
    }
    getElement(name) {
        const localName = this.caseInsensitive ? name.toLowerCase() : name;
        const local = this.elements.get(localName);
        if (local) {
            return local;
        }
        if (this.outerScope) {
            return this.outerScope.getElement(name);
        }
        return undefined;
    }
    getAllElements() {
        let elementStream = stream(this.elements.values());
        if (this.outerScope) {
            elementStream = elementStream.concat(this.outerScope.getAllElements());
        }
        return elementStream;
    }
}
export const EMPTY_SCOPE = {
    getElement() {
        return undefined;
    },
    getAllElements() {
        return EMPTY_STREAM;
    }
};
//# sourceMappingURL=scope.js.map