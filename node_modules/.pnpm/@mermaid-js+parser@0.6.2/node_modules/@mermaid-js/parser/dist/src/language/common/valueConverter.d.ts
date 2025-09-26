import type { CstNode, GrammarAST, ValueType } from 'langium';
import { DefaultValueConverter } from 'langium';
export declare abstract class AbstractMermaidValueConverter extends DefaultValueConverter {
    /**
     * A method contains convert logic to be used by class.
     *
     * @param rule - Parsed rule.
     * @param input - Matched string.
     * @param cstNode - Node in the Concrete Syntax Tree (CST).
     * @returns converted the value if it's available or `undefined` if it's not.
     */
    protected abstract runCustomConverter(rule: GrammarAST.AbstractRule, input: string, cstNode: CstNode): ValueType | undefined;
    protected runConverter(rule: GrammarAST.AbstractRule, input: string, cstNode: CstNode): ValueType;
    private runCommonConverter;
}
export declare class CommonValueConverter extends AbstractMermaidValueConverter {
    protected runCustomConverter(_rule: GrammarAST.AbstractRule, _input: string, _cstNode: CstNode): ValueType | undefined;
}
