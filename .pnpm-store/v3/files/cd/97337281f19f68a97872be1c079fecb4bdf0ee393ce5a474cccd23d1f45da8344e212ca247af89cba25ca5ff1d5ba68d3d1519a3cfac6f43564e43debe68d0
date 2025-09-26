/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { isAstNodeWithComment } from '../serializer/json-serializer.js';
import { findCommentNode } from '../utils/cst-utils.js';
export class DefaultCommentProvider {
    constructor(services) {
        this.grammarConfig = () => services.parser.GrammarConfig;
    }
    getComment(node) {
        var _a;
        if (isAstNodeWithComment(node)) {
            return node.$comment;
        }
        return (_a = findCommentNode(node.$cstNode, this.grammarConfig().multilineCommentRules)) === null || _a === void 0 ? void 0 : _a.text;
    }
}
//# sourceMappingURL=comment-provider.js.map