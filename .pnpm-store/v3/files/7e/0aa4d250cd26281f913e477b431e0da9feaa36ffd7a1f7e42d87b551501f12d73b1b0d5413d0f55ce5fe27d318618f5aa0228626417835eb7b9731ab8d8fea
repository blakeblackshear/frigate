import type { TSESTree } from '../ts-estree';
declare const isOptionalChainPunctuator: (token: TSESTree.Token | null | undefined) => token is {
    value: "?.";
} & TSESTree.PunctuatorToken;
declare const isNotOptionalChainPunctuator: (token: TSESTree.Token | null | undefined) => token is Exclude<TSESTree.Token, {
    value: "?.";
} & TSESTree.PunctuatorToken>;
declare const isNonNullAssertionPunctuator: (token: TSESTree.Token | null | undefined) => token is {
    value: "!";
} & TSESTree.PunctuatorToken;
declare const isNotNonNullAssertionPunctuator: (token: TSESTree.Token | null | undefined) => token is Exclude<TSESTree.Token, {
    value: "!";
} & TSESTree.PunctuatorToken>;
/**
 * Returns true if and only if the node represents: foo?.() or foo.bar?.()
 */
declare const isOptionalCallExpression: (node: TSESTree.Node | null | undefined) => node is {
    optional: boolean;
} & TSESTree.CallExpression;
/**
 * Returns true if and only if the node represents logical OR
 */
declare const isLogicalOrOperator: (node: TSESTree.Node | null | undefined) => node is Partial<TSESTree.LogicalExpression> & TSESTree.LogicalExpression;
/**
 * Checks if a node is a type assertion:
 * ```
 * x as foo
 * <foo>x
 * ```
 */
declare const isTypeAssertion: (node: TSESTree.Node | null | undefined) => node is Extract<TSESTree.Node, {
    type: TSESTree.AST_NODE_TYPES.TSAsExpression | TSESTree.AST_NODE_TYPES.TSTypeAssertion;
}>;
declare const isVariableDeclarator: (node: TSESTree.Node | null | undefined) => node is Extract<TSESTree.Node, {
    type: TSESTree.AST_NODE_TYPES.VariableDeclarator;
}>;
declare const isFunction: (node: TSESTree.Node | null | undefined) => node is Extract<TSESTree.Node, {
    type: TSESTree.AST_NODE_TYPES.ArrowFunctionExpression | TSESTree.AST_NODE_TYPES.FunctionDeclaration | TSESTree.AST_NODE_TYPES.FunctionExpression;
}>;
declare const isFunctionType: (node: TSESTree.Node | null | undefined) => node is Extract<TSESTree.Node, {
    type: TSESTree.AST_NODE_TYPES.TSCallSignatureDeclaration | TSESTree.AST_NODE_TYPES.TSConstructorType | TSESTree.AST_NODE_TYPES.TSConstructSignatureDeclaration | TSESTree.AST_NODE_TYPES.TSEmptyBodyFunctionExpression | TSESTree.AST_NODE_TYPES.TSFunctionType | TSESTree.AST_NODE_TYPES.TSMethodSignature;
}>;
declare const isFunctionOrFunctionType: (node: TSESTree.Node | null | undefined) => node is Extract<TSESTree.Node, {
    type: TSESTree.AST_NODE_TYPES.ArrowFunctionExpression | TSESTree.AST_NODE_TYPES.FunctionDeclaration | TSESTree.AST_NODE_TYPES.FunctionExpression | TSESTree.AST_NODE_TYPES.TSCallSignatureDeclaration | TSESTree.AST_NODE_TYPES.TSConstructorType | TSESTree.AST_NODE_TYPES.TSConstructSignatureDeclaration | TSESTree.AST_NODE_TYPES.TSEmptyBodyFunctionExpression | TSESTree.AST_NODE_TYPES.TSFunctionType | TSESTree.AST_NODE_TYPES.TSMethodSignature;
}>;
declare const isTSFunctionType: (node: TSESTree.Node | null | undefined) => node is Extract<TSESTree.Node, {
    type: TSESTree.AST_NODE_TYPES.TSFunctionType;
}>;
declare const isTSConstructorType: (node: TSESTree.Node | null | undefined) => node is Extract<TSESTree.Node, {
    type: TSESTree.AST_NODE_TYPES.TSConstructorType;
}>;
declare const isClassOrTypeElement: (node: TSESTree.Node | null | undefined) => node is Extract<TSESTree.Node, {
    type: TSESTree.AST_NODE_TYPES.FunctionExpression | TSESTree.AST_NODE_TYPES.MethodDefinition | TSESTree.AST_NODE_TYPES.PropertyDefinition | TSESTree.AST_NODE_TYPES.TSAbstractMethodDefinition | TSESTree.AST_NODE_TYPES.TSAbstractPropertyDefinition | TSESTree.AST_NODE_TYPES.TSCallSignatureDeclaration | TSESTree.AST_NODE_TYPES.TSConstructSignatureDeclaration | TSESTree.AST_NODE_TYPES.TSEmptyBodyFunctionExpression | TSESTree.AST_NODE_TYPES.TSIndexSignature | TSESTree.AST_NODE_TYPES.TSMethodSignature | TSESTree.AST_NODE_TYPES.TSPropertySignature;
}>;
/**
 * Checks if a node is a constructor method.
 */
declare const isConstructor: (node: TSESTree.Node | null | undefined) => node is Partial<TSESTree.MethodDefinitionComputedName | TSESTree.MethodDefinitionNonComputedName> & (TSESTree.MethodDefinitionComputedName | TSESTree.MethodDefinitionNonComputedName);
/**
 * Checks if a node is a setter method.
 */
declare function isSetter(node: TSESTree.Node | undefined): node is {
    kind: 'set';
} & (TSESTree.MethodDefinition | TSESTree.Property);
declare const isIdentifier: (node: TSESTree.Node | null | undefined) => node is Extract<TSESTree.Node, {
    type: TSESTree.AST_NODE_TYPES.Identifier;
}>;
/**
 * Checks if a node represents an `await …` expression.
 */
declare const isAwaitExpression: (node: TSESTree.Node | null | undefined) => node is Extract<TSESTree.Node, {
    type: TSESTree.AST_NODE_TYPES.AwaitExpression;
}>;
/**
 * Checks if a possible token is the `await` keyword.
 */
declare const isAwaitKeyword: (token: TSESTree.Token | null | undefined) => token is {
    value: "await";
} & TSESTree.IdentifierToken;
/**
 * Checks if a possible token is the `type` keyword.
 */
declare const isTypeKeyword: (token: TSESTree.Token | null | undefined) => token is {
    value: "type";
} & TSESTree.IdentifierToken;
/**
 * Checks if a possible token is the `import` keyword.
 */
declare const isImportKeyword: (token: TSESTree.Token | null | undefined) => token is {
    value: "import";
} & TSESTree.KeywordToken;
declare const isLoop: (node: TSESTree.Node | null | undefined) => node is Extract<TSESTree.Node, {
    type: TSESTree.AST_NODE_TYPES.DoWhileStatement | TSESTree.AST_NODE_TYPES.ForInStatement | TSESTree.AST_NODE_TYPES.ForOfStatement | TSESTree.AST_NODE_TYPES.ForStatement | TSESTree.AST_NODE_TYPES.WhileStatement;
}>;
export { isAwaitExpression, isAwaitKeyword, isConstructor, isClassOrTypeElement, isFunction, isFunctionOrFunctionType, isFunctionType, isIdentifier, isImportKeyword, isLoop, isLogicalOrOperator, isNonNullAssertionPunctuator, isNotNonNullAssertionPunctuator, isNotOptionalChainPunctuator, isOptionalChainPunctuator, isOptionalCallExpression, isSetter, isTSConstructorType, isTSFunctionType, isTypeAssertion, isTypeKeyword, isVariableDeclarator, };
//# sourceMappingURL=predicates.d.ts.map