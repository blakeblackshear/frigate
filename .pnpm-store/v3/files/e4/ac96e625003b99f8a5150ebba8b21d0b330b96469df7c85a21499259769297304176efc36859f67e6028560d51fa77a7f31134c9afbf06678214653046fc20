/******************************************************************************
* Copyright 2022 TypeFox GmbH
* This program and the accompanying materials are made available under the
* terms of the MIT License, which is available in the project root.
******************************************************************************/

import type { AstNode, CstNode } from '../../syntax-tree.js';
import { DefaultNameProvider } from '../../references/name-provider.js';
import { findNodeForProperty } from '../../utils/grammar-utils.js';
import { isAssignment } from '../../languages/generated/ast.js';

export class LangiumGrammarNameProvider extends DefaultNameProvider {

    override getName(node: AstNode): string | undefined {
        if (isAssignment(node)) {
            return node.feature;
        } else {
            return super.getName(node);
        }
    }

    override getNameNode(node: AstNode): CstNode | undefined {
        if (isAssignment(node)) {
            return findNodeForProperty(node.$cstNode, 'feature');
        } else {
            return super.getNameNode(node);
        }
    }

}
