import type { JavaScriptLinked } from './types';
export declare class CodegenStepExecJs {
    readonly js: string;
    constructor(js: string);
}
type JsonSerializerStep = CodegenStepExecJs | unknown;
export interface CodegenOptions<Linkable = Record<string, unknown>> {
    args?: string[];
    name?: string;
    prologue?: string;
    epilogue?: string | (() => string);
    processSteps?: (steps: JsonSerializerStep[]) => CodegenStepExecJs[];
    linkable?: Linkable;
}
export type CodegenGenerateOptions = Pick<CodegenOptions, 'name' | 'args' | 'prologue' | 'epilogue'>;
export declare class Codegen<Fn extends (...deps: any[]) => any = (...deps: unknown[]) => unknown, Linkable = Record<string, unknown>> {
    protected steps: JsonSerializerStep[];
    options: Required<CodegenOptions<Linkable>>;
    constructor(opts: CodegenOptions<Linkable>);
    js(js: string): void;
    var(expression?: string): string;
    if(condition: string, then: () => void, otherwise?: () => void): void;
    while(condition: string, block: () => void): void;
    doWhile(block: () => void, condition: string): void;
    switch(expression: string, cases: [match: string | number | boolean | null, block: () => void, noBreak?: boolean][], def?: () => void): void;
    return(expression: string): void;
    step(step: unknown): void;
    protected registerCounter: number;
    getRegister(): string;
    r(): string;
    protected dependencies: unknown[];
    protected dependencyNames: string[];
    linkDependency(dep: unknown, name?: string): string;
    linkDependencies(deps: unknown[]): string[];
    protected linked: {
        [key: string]: 1;
    };
    link(name: keyof Linkable): void;
    protected constants: string[];
    protected constantNames: string[];
    addConstant(constant: string, name?: string): string;
    addConstants(constants: string[]): string[];
    generate(opts?: CodegenGenerateOptions): JavaScriptLinked<Fn>;
    compile(opts?: CodegenGenerateOptions): Fn;
}
export {};
