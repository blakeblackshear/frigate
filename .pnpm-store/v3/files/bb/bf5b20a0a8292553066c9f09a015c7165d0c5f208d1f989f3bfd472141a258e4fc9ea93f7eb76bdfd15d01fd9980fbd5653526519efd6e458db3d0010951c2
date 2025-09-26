/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { findNodeForProperty } from '../utils/grammar-utils.js';
export function isNamed(node) {
    return typeof node.name === 'string';
}
export class DefaultNameProvider {
    getName(node) {
        if (isNamed(node)) {
            return node.name;
        }
        return undefined;
    }
    getNameNode(node) {
        return findNodeForProperty(node.$cstNode, 'name');
    }
}
//# sourceMappingURL=name-provider.js.map