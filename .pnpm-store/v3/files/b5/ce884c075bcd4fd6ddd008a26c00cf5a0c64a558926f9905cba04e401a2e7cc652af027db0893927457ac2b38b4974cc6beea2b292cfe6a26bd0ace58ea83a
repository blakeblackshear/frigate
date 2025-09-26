import { Prism, themes } from 'prism-react-renderer';
import * as React from 'react';
import React__default, { CSSProperties, PropsWithChildren, ComponentType } from 'react';

type Props$3 = {
    className?: string;
    code: string;
    disabled?: boolean;
    language: string;
    prism?: typeof Prism;
    style?: CSSProperties;
    tabMode?: "focus" | "indentation";
    theme?: typeof themes.nightOwl;
    onChange?(value: string): void;
};
declare const CodeEditor: (props: Props$3) => JSX.Element;

type Props$2 = {
    code?: string;
    disabled?: boolean;
    enableTypeScript?: boolean;
    language?: string;
    noInline?: boolean;
    scope?: Record<string, unknown>;
    theme?: typeof themes.nightOwl;
    transformCode?(code: string): void;
};
declare function LiveProvider({ children, code, language, theme, enableTypeScript, disabled, scope, transformCode, noInline, }: PropsWithChildren<Props$2>): JSX.Element;

declare function LiveEditor(props: Partial<Props$3>): JSX.Element;

declare function LiveError<T extends Record<string, unknown>>(props: T): JSX.Element | null;

type Props$1<T extends React__default.ElementType = React__default.ElementType> = {
    Component?: T;
} & React__default.ComponentPropsWithoutRef<T>;
declare function LivePreview<T extends keyof JSX.IntrinsicElements>(props: Props$1<T>): JSX.Element;
declare function LivePreview<T extends React__default.ElementType>(props: Props$1<T>): JSX.Element;

type ContextValue = {
    error?: string;
    element?: ComponentType | null;
    code: string;
    newCode?: string;
    disabled: boolean;
    language: string;
    theme?: typeof themes.nightOwl;
    onError(error: Error): void;
    onChange(value: string): void;
};
declare const LiveContext: React.Context<ContextValue>;

type Props = {
    live: Record<string, unknown>;
};
declare function withLive<T>(WrappedComponent: ComponentType<T & Props>): {
    (props: T): JSX.Element;
    displayName: string;
};

type GenerateOptions = {
    code: string;
    scope?: Record<string, unknown>;
    enableTypeScript: boolean;
};
declare const generateElement: ({ code, scope, enableTypeScript }: GenerateOptions, errorCallback: (error: Error) => void) => {
    new (props: {} | Readonly<{}>): {
        componentDidCatch(error: Error): void;
        render(): JSX.Element | null;
        context: unknown;
        setState<K extends never>(state: {} | ((prevState: Readonly<{}>, props: Readonly<{}>) => {} | Pick<{}, K> | null) | Pick<{}, K> | null, callback?: (() => void) | undefined): void;
        forceUpdate(callback?: (() => void) | undefined): void;
        readonly props: Readonly<{}>;
        state: Readonly<{}>;
        refs: {
            [key: string]: React__default.ReactInstance;
        };
        componentDidMount?(): void;
        shouldComponentUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): boolean;
        componentWillUnmount?(): void;
        getSnapshotBeforeUpdate?(prevProps: Readonly<{}>, prevState: Readonly<{}>): any;
        componentDidUpdate?(prevProps: Readonly<{}>, prevState: Readonly<{}>, snapshot?: any): void;
        componentWillMount?(): void;
        UNSAFE_componentWillMount?(): void;
        componentWillReceiveProps?(nextProps: Readonly<{}>, nextContext: any): void;
        UNSAFE_componentWillReceiveProps?(nextProps: Readonly<{}>, nextContext: any): void;
        componentWillUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): void;
        UNSAFE_componentWillUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): void;
    };
    new (props: {}, context: any): {
        componentDidCatch(error: Error): void;
        render(): JSX.Element | null;
        context: unknown;
        setState<K extends never>(state: {} | ((prevState: Readonly<{}>, props: Readonly<{}>) => {} | Pick<{}, K> | null) | Pick<{}, K> | null, callback?: (() => void) | undefined): void;
        forceUpdate(callback?: (() => void) | undefined): void;
        readonly props: Readonly<{}>;
        state: Readonly<{}>;
        refs: {
            [key: string]: React__default.ReactInstance;
        };
        componentDidMount?(): void;
        shouldComponentUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): boolean;
        componentWillUnmount?(): void;
        getSnapshotBeforeUpdate?(prevProps: Readonly<{}>, prevState: Readonly<{}>): any;
        componentDidUpdate?(prevProps: Readonly<{}>, prevState: Readonly<{}>, snapshot?: any): void;
        componentWillMount?(): void;
        UNSAFE_componentWillMount?(): void;
        componentWillReceiveProps?(nextProps: Readonly<{}>, nextContext: any): void;
        UNSAFE_componentWillReceiveProps?(nextProps: Readonly<{}>, nextContext: any): void;
        componentWillUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): void;
        UNSAFE_componentWillUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): void;
    };
    contextType?: React__default.Context<any> | undefined;
};
declare const renderElementAsync: ({ code, scope, enableTypeScript }: GenerateOptions, resultCallback: (sender: ComponentType) => void, errorCallback: (error: Error) => void) => void;

export { CodeEditor as Editor, LiveContext, LiveEditor, LiveError, LivePreview, LiveProvider, generateElement, renderElementAsync, withLive };
