/******************************************************************************
* Copyright 2022 TypeFox GmbH
* This program and the accompanying materials are made available under the
* terms of the MIT License, which is available in the project root.
******************************************************************************/
import { DefaultNameProvider } from '../../references/name-provider.js';
import { findNodeForProperty } from '../../utils/grammar-utils.js';
import { isAssignment } from '../../languages/generated/ast.js';
export class LangiumGrammarNameProvider extends DefaultNameProvider {
    getName(node) {
        if (isAssignment(node)) {
            return node.feature;
        }
        else {
            return super.getName(node);
        }
    }
    getNameNode(node) {
        if (isAssignment(node)) {
            return findNodeForProperty(node.$cstNode, 'feature');
        }
        else {
            return super.getNameNode(node);
        }
    }
}
//# sourceMappingURL=grammar-naming.js.map