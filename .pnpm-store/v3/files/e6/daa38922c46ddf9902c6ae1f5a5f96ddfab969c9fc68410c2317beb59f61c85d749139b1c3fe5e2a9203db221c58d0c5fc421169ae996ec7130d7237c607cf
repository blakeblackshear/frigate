import { NodePath, types } from '@babel/core';

type tag = 'title' | 'desc';
interface Options {
    tag: tag | null;
}
interface State {
    opts: Options;
}
declare const plugin: () => {
    visitor: {
        JSXElement(path: NodePath<types.JSXElement>, state: State): void;
    };
};

export { Options, plugin as default };
