/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { TokenType } from 'chevrotain';
import { type AbstractElement, type Grammar } from '../languages/generated/ast.js';
import type { Linker } from '../references/linker.js';
import type { Lexer } from '../parser/lexer.js';
import type { LangiumCoreServices } from '../services.js';
import type { ParseResult } from '../parser/langium-parser.js';
import type { Reference, AstNode, CstNode, LeafCstNode } from '../syntax-tree.js';
import { BiMap } from '../utils/collections.js';
import type { LexingReport } from '../parser/token-builder.js';
/**
 * The hydrator service is responsible for allowing AST parse results to be sent across worker threads.
 */
export interface Hydrator {
    /**
     * Converts a parse result to a plain object. The resulting object can be sent across worker threads.
     */
    dehydrate(result: ParseResult<AstNode>): ParseResult<object>;
    /**
     * Converts a plain object to a parse result. The included AST node can then be used in the main thread.
     * Calling this method on objects that have not been dehydrated first will result in undefined behavior.
     */
    hydrate<T extends AstNode = AstNode>(result: ParseResult<object>): ParseResult<T>;
}
export interface DehydrateContext {
    astNodes: Map<AstNode, any>;
    cstNodes: Map<CstNode, any>;
}
export interface HydrateContext {
    astNodes: Map<any, AstNode>;
    cstNodes: Map<any, CstNode>;
}
export declare class DefaultHydrator implements Hydrator {
    protected readonly grammar: Grammar;
    protected readonly lexer: Lexer;
    protected readonly linker: Linker;
    protected readonly grammarElementIdMap: BiMap<AbstractElement, number>;
    protected readonly tokenTypeIdMap: BiMap<number, TokenType>;
    constructor(services: LangiumCoreServices);
    dehydrate(result: ParseResult<AstNode>): ParseResult<object>;
    protected dehydrateLexerReport(lexerReport: LexingReport): LexingReport;
    protected createDehyrationContext(node: AstNode): DehydrateContext;
    protected dehydrateAstNode(node: AstNode, context: DehydrateContext): object;
    protected dehydrateReference(reference: Reference, context: DehydrateContext): any;
    protected dehydrateCstNode(node: CstNode, context: DehydrateContext): any;
    hydrate<T extends AstNode = AstNode>(result: ParseResult<object>): ParseResult<T>;
    protected createHydrationContext(node: any): HydrateContext;
    protected hydrateAstNode(node: any, context: HydrateContext): AstNode;
    protected setParent(node: any, parent: any): any;
    protected hydrateReference(reference: any, node: AstNode, name: string, context: HydrateContext): Reference;
    protected hydrateCstNode(cstNode: any, context: HydrateContext, num?: number): CstNode;
    protected hydrateCstLeafNode(cstNode: any): LeafCstNode;
    protected getTokenType(name: string): TokenType;
    protected getGrammarElementId(node: AbstractElement | undefined): number | undefined;
    protected getGrammarElement(id: number): AbstractElement | undefined;
    protected createGrammarElementIdMap(): void;
}
//# sourceMappingURL=hydrator.d.ts.map