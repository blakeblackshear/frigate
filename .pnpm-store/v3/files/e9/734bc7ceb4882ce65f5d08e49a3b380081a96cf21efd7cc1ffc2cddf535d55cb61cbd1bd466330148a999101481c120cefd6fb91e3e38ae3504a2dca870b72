import { Options } from 'prettier';
import { Config as Config$1 } from 'svgo';
import { Options as Options$1 } from '@svgr/babel-preset';
import { TransformOptions } from '@babel/core';

interface State {
    filePath?: string;
    componentName: string;
    caller?: {
        name?: string;
        previousExport?: string | null;
        defaultPlugins?: ConfigPlugin[];
    };
}

interface Plugin {
    (code: string, config: Config, state: State): string;
}
type ConfigPlugin = string | Plugin;

interface Config {
    ref?: boolean;
    titleProp?: boolean;
    descProp?: boolean;
    expandProps?: boolean | 'start' | 'end';
    dimensions?: boolean;
    icon?: boolean | string | number;
    native?: boolean;
    svgProps?: {
        [key: string]: string;
    };
    replaceAttrValues?: {
        [key: string]: string;
    };
    runtimeConfig?: boolean;
    typescript?: boolean;
    prettier?: boolean;
    prettierConfig?: Options;
    svgo?: boolean;
    svgoConfig?: Config$1;
    configFile?: string;
    template?: Options$1['template'];
    memo?: boolean;
    exportType?: 'named' | 'default';
    namedExport?: string;
    jsxRuntime?: 'classic' | 'classic-preact' | 'automatic';
    jsxRuntimeImport?: {
        source: string;
        namespace?: string;
        specifiers?: string[];
        defaultSpecifier?: string;
    };
    index?: boolean;
    plugins?: ConfigPlugin[];
    jsx?: {
        babelConfig?: TransformOptions;
    };
}
declare const DEFAULT_CONFIG: Config;
declare const resolveConfig: {
    (searchFrom?: string, configFile?: string): Promise<Config | null>;
    sync(searchFrom?: string, configFile?: string): Config | null;
};
declare const resolveConfigFile: {
    (filePath: string): Promise<string | null>;
    sync(filePath: string): string | null;
};
declare const loadConfig: {
    ({ configFile, ...baseConfig }: Config, state?: Pick<State, 'filePath'>): Promise<Config>;
    sync({ configFile, ...baseConfig }: Config, state?: Pick<State, 'filePath'>): Config;
};

declare const transform: {
    (code: string, config?: Config, state?: Partial<State>): Promise<string>;
    sync(code: string, config?: Config, state?: Partial<State>): string;
};

export { Config, ConfigPlugin, DEFAULT_CONFIG, Plugin, State, loadConfig, resolveConfig, resolveConfigFile, transform };
