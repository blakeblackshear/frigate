import { NodePath, types } from '@babel/core';

interface State {
    replacedComponents: Set<string>;
    unsupportedComponents: Set<string>;
}
declare const plugin: () => {
    visitor: {
        Program(path: NodePath<types.Program>, state: Partial<State>): void;
    };
};

export { plugin as default };
