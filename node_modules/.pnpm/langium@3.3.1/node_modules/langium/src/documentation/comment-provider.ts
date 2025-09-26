/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { GrammarConfig } from '../languages/grammar-config.js';
import { isAstNodeWithComment } from '../serializer/json-serializer.js';
import type { LangiumCoreServices } from '../services.js';
import type { AstNode } from '../syntax-tree.js';
import { findCommentNode } from '../utils/cst-utils.js';

/**
 * Provides comments for AST nodes.
 */
export interface CommentProvider {
    /**
     * Returns the comment associated with the specified AST node.
     * @param node The AST node to get the comment for.
     * @returns The comment associated with the specified AST node or `undefined` if there is no comment.
     */
    getComment(node: AstNode): string | undefined;
}

export class DefaultCommentProvider implements CommentProvider {
    protected readonly grammarConfig: () => GrammarConfig;
    constructor(services: LangiumCoreServices) {
        this.grammarConfig = () => services.parser.GrammarConfig;
    }
    getComment(node: AstNode): string | undefined {
        if(isAstNodeWithComment(node)) {
            return node.$comment;
        }
        return findCommentNode(node.$cstNode, this.grammarConfig().multilineCommentRules)?.text;
    }
}
