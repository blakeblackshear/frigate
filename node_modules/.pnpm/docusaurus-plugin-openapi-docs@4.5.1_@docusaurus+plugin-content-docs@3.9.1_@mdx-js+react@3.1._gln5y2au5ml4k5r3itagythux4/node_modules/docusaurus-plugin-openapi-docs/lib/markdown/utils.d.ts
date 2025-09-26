/**
 * Children in the plugin does not accept DOM elements, when compared with Children in the theme.
 * It is designed for rendering HTML a strings.
 */
export type Children = string | undefined | (string | string[] | undefined)[];
export type Props = Record<string, any> & {
    children?: Children;
};
export type Options = {
    inline?: boolean;
};
export declare function create(tag: string, props: Props, options?: Options): string;
export declare function guard<T>(value: T | undefined, cb: (value: T) => Children): string;
export declare function render(children: Children): string;
export declare const lessThan: RegExp;
export declare const greaterThan: RegExp;
export declare const codeFence: RegExp;
export declare const curlyBrackets: RegExp;
export declare const codeBlock: RegExp;
export declare function clean(value: string | undefined): string;
