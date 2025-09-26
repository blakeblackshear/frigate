import { ConfigAPI, NodePath, types } from '@babel/core';

interface Attribute {
    name: string;
    value?: boolean | number | string | null;
    spread?: boolean;
    literal?: boolean;
    position?: 'start' | 'end';
}
interface Options {
    elements: string[];
    attributes: Attribute[];
}
declare const addJSXAttribute: (_: ConfigAPI, opts: Options) => {
    visitor: {
        JSXOpeningElement(path: NodePath<types.JSXOpeningElement>): void;
    };
};

export { Attribute, Options, addJSXAttribute as default };
