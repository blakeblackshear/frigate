import { ConfigAPI, NodePath, types } from '@babel/core';

interface Value {
    value: string;
    newValue: string | boolean | number;
    literal?: boolean;
}
interface Options {
    values: Value[];
}
declare const addJSXAttribute: (api: ConfigAPI, opts: Options) => {
    visitor: {
        JSXAttribute(path: NodePath<types.JSXAttribute>): void;
    };
};

export { Options, Value, addJSXAttribute as default };
