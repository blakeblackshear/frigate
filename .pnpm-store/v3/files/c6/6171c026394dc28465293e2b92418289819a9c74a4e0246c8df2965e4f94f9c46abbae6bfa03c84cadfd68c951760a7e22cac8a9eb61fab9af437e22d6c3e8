import { ConfigAPI, NodePath, types } from '@babel/core';

interface Options {
    width: number | string;
    height: number | string;
}
declare const plugin: (_: ConfigAPI, opts: Options) => {
    visitor: {
        JSXOpeningElement(path: NodePath<types.JSXOpeningElement>): void;
    };
};

export { Options, plugin as default };
