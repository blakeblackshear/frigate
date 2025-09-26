import { ConfigAPI, NodePath, types } from '@babel/core';

interface Options {
    elements: string[];
    attributes: string[];
}
declare const removeJSXAttribute: (_: ConfigAPI, opts: Options) => {
    visitor: {
        JSXOpeningElement(path: NodePath<types.JSXOpeningElement>): void;
    };
};

export { Options, removeJSXAttribute as default };
