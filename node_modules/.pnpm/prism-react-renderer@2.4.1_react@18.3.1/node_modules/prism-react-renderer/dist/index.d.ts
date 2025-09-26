import * as react from 'react';
import { CSSProperties } from 'react';
import Prism__default, { Grammar, Token as Token$1 } from 'prismjs';
import * as Prism from 'prismjs';
export { Prism };

type Language = string;
type PrismGrammar = Grammar;
type PrismLib = typeof Prism__default;
type Token = {
    types: string[];
    content: string;
    empty?: boolean;
};
type EnvConfig = {
    code: string;
    grammar: PrismGrammar;
    language: Language;
    tokens: (string | Token$1)[];
};
type StyleObj = CSSProperties;
type LineInputProps = {
    style?: StyleObj;
    className?: string;
    line: Token[];
    [key: string]: unknown;
};
type LineOutputProps = {
    style?: StyleObj;
    className: string;
    [key: string]: unknown;
};
type TokenInputProps = {
    style?: StyleObj;
    className?: string;
    token: Token;
    [key: string]: unknown;
};
type TokenOutputProps = {
    style?: StyleObj;
    className: string;
    children: string;
    [key: string]: unknown;
};
type InternalHighlightProps = {
    prism: PrismLib;
    theme: PrismTheme;
    language: Language;
    code: string;
    children: (props: RenderProps) => JSX.Element;
};
type HighlightProps = {
    prism?: PrismLib;
    theme?: PrismTheme;
    language: Language;
    code: string;
    children: (props: RenderProps) => JSX.Element;
};
type RenderProps = {
    tokens: Token[][];
    className: string;
    style: CSSProperties;
    getLineProps: (input: LineInputProps) => LineOutputProps;
    getTokenProps: (input: TokenInputProps) => TokenOutputProps;
};
type PrismThemeEntry = {
    color?: string;
    cursor?: string;
    background?: string;
    backgroundImage?: string;
    backgroundColor?: string;
    textShadow?: string;
    fontStyle?: "normal" | "italic";
    fontWeight?: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
    textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through";
    opacity?: number;
};
type PrismTheme = {
    plain: PrismThemeEntry;
    styles: Array<{
        types: string[];
        style: PrismThemeEntry;
        languages?: Language[];
    }>;
};

declare const theme$j: PrismTheme;

declare const theme$i: PrismTheme;

declare const theme$h: PrismTheme;

declare const theme$g: PrismTheme;

declare const theme$f: PrismTheme;

declare const theme$e: PrismTheme;

declare const theme$d: PrismTheme;

declare const theme$c: PrismTheme;

declare const theme$b: PrismTheme;

declare const theme$a: PrismTheme;

declare const theme$9: PrismTheme;

declare const theme$8: PrismTheme;

declare const theme$7: PrismTheme;

declare const theme$6: PrismTheme;

declare const theme$5: PrismTheme;

declare const theme$4: PrismTheme;

declare const theme$3: PrismTheme;

declare const theme$2: PrismTheme;

declare const theme$1: PrismTheme;

declare const theme: PrismTheme;

declare namespace index {
  export {
    theme$j as dracula,
    theme$i as duotoneDark,
    theme$h as duotoneLight,
    theme$g as github,
    theme$1 as gruvboxMaterialDark,
    theme as gruvboxMaterialLight,
    theme$5 as jettwaveDark,
    theme$4 as jettwaveLight,
    theme$f as nightOwl,
    theme$e as nightOwlLight,
    theme$d as oceanicNext,
    theme$c as okaidia,
    theme$3 as oneDark,
    theme$2 as oneLight,
    theme$b as palenight,
    theme$a as shadesOfPurple,
    theme$9 as synthwave84,
    theme$8 as ultramin,
    theme$7 as vsDark,
    theme$6 as vsLight,
  };
}

declare const normalizeTokens: (tokens: (Token$1 | string)[]) => Token[][];

type Options = {
    prism: PrismLib;
    code: string;
    grammar?: PrismGrammar;
    language: Language;
};
declare const useTokenize: ({ prism, code, grammar, language }: Options) => Token[][];

/**
 * Prism React Renderer requires this specific instance
 * of Prism provided to ensure the languages are correctly loaded
 */
declare const Highlight: (props: HighlightProps) => react.FunctionComponentElement<InternalHighlightProps>;

export { EnvConfig, Highlight, HighlightProps, InternalHighlightProps, Language, LineInputProps, LineOutputProps, PrismGrammar, PrismLib, PrismTheme, PrismThemeEntry, RenderProps, StyleObj, Token, TokenInputProps, TokenOutputProps, normalizeTokens, index as themes, useTokenize };
