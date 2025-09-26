/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { IToken, TokenType } from 'chevrotain';
import type { Range } from 'vscode-languageserver-types';
import type { AbstractElement } from '../languages/generated/ast.js';
import type { AstNode, CompositeCstNode, CstNode, LeafCstNode, RootCstNode } from '../syntax-tree.js';
export declare class CstNodeBuilder {
    private rootNode;
    private nodeStack;
    get current(): CompositeCstNodeImpl;
    buildRootNode(input: string): RootCstNode;
    buildCompositeNode(feature: AbstractElement): CompositeCstNode;
    buildLeafNode(token: IToken, feature?: AbstractElement): LeafCstNode;
    removeNode(node: CstNode): void;
    addHiddenNodes(tokens: IToken[]): void;
    construct(item: {
        $type: string | symbol | undefined;
        $cstNode: CstNode;
    }): void;
}
export declare abstract class AbstractCstNode implements CstNode {
    abstract get offset(): number;
    abstract get length(): number;
    abstract get end(): number;
    abstract get range(): Range;
    container?: CompositeCstNode;
    grammarSource?: AbstractElement;
    root: RootCstNode;
    private _astNode?;
    /** @deprecated use `container` instead. */
    get parent(): CompositeCstNode | undefined;
    /** @deprecated use `grammarSource` instead. */
    get feature(): AbstractElement | undefined;
    get hidden(): boolean;
    get astNode(): AstNode;
    set astNode(value: AstNode | undefined);
    /** @deprecated use `astNode` instead. */
    get element(): AstNode;
    get text(): string;
}
export declare class LeafCstNodeImpl extends AbstractCstNode implements LeafCstNode {
    get offset(): number;
    get length(): number;
    get end(): number;
    get hidden(): boolean;
    get tokenType(): TokenType;
    get range(): Range;
    private _hidden;
    private _offset;
    private _length;
    private _range;
    private _tokenType;
    constructor(offset: number, length: number, range: Range, tokenType: TokenType, hidden?: boolean);
}
export declare class CompositeCstNodeImpl extends AbstractCstNode implements CompositeCstNode {
    readonly content: CstNode[];
    private _rangeCache?;
    /** @deprecated use `content` instead. */
    get children(): CstNode[];
    get offset(): number;
    get length(): number;
    get end(): number;
    get range(): Range;
    private get firstNonHiddenNode();
    private get lastNonHiddenNode();
}
export declare class RootCstNodeImpl extends CompositeCstNodeImpl implements RootCstNode {
    private _text;
    get text(): string;
    get fullText(): string;
    constructor(input?: string);
}
//# sourceMappingURL=cst-node-builder.d.ts.map