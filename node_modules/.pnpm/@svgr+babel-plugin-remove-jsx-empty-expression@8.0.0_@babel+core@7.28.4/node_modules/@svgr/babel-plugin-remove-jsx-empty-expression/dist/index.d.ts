import { NodePath, types } from '@babel/core';

declare const removeJSXEmptyExpression: () => {
    visitor: {
        JSXExpressionContainer(path: NodePath<types.JSXExpressionContainer>): void;
    };
};

export { removeJSXEmptyExpression as default };
