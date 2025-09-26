import { ConfigAPI } from '@babel/core';
import { Options as Options$1 } from '@svgr/babel-plugin-transform-svg-component';

interface Options extends Options$1 {
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
}
declare const plugin: (_: ConfigAPI, opts: Options) => {
    plugins: any[];
};

export { Options, plugin as default };
