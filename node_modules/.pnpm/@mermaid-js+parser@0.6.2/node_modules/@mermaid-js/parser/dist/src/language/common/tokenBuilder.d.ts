import type { GrammarAST, Stream, TokenBuilderOptions } from 'langium';
import type { TokenType } from 'chevrotain';
import { DefaultTokenBuilder } from 'langium';
export declare abstract class AbstractMermaidTokenBuilder extends DefaultTokenBuilder {
    private keywords;
    constructor(keywords: string[]);
    protected buildKeywordTokens(rules: Stream<GrammarAST.AbstractRule>, terminalTokens: TokenType[], options?: TokenBuilderOptions): TokenType[];
}
export declare class CommonTokenBuilder extends AbstractMermaidTokenBuilder {
}
