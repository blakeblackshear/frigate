import { types, ConfigAPI, NodePath } from '@babel/core';
import { TemplateBuilder } from '@babel/template';

interface TemplateVariables {
    componentName: string;
    interfaces: types.TSInterfaceDeclaration[];
    props: (types.ObjectPattern | types.Identifier)[];
    imports: types.ImportDeclaration[];
    exports: (types.VariableDeclaration | types.ExportDeclaration | types.Statement)[];
    jsx: types.JSXElement;
}
interface TemplateContext {
    options: Options;
    tpl: TemplateBuilder<types.Statement | types.Statement[]>['ast'];
}
interface Template {
    (variables: TemplateVariables, context: TemplateContext): types.Statement | types.Statement[];
}
interface State {
    componentName: string;
    caller?: {
        previousExport?: string | null;
    };
}
interface JSXRuntimeImport {
    source: string;
    namespace?: string;
    defaultSpecifier?: string;
    specifiers?: string[];
}
interface Options {
    typescript?: boolean;
    titleProp?: boolean;
    descProp?: boolean;
    expandProps?: boolean | 'start' | 'end';
    ref?: boolean;
    template?: Template;
    state: State;
    native?: boolean;
    memo?: boolean;
    exportType?: 'named' | 'default';
    namedExport?: string;
    jsxRuntime?: 'automatic' | 'classic';
    jsxRuntimeImport?: JSXRuntimeImport;
    importSource?: string;
}

declare const plugin: (_: ConfigAPI, opts: Options) => {
    visitor: {
        Program(path: NodePath<types.Program>): void;
    };
};

export { Options, Template, plugin as default };
