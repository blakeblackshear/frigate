"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TSError = void 0;
exports.isLogicalOperator = isLogicalOperator;
exports.isESTreeBinaryOperator = isESTreeBinaryOperator;
exports.getTextForTokenKind = getTextForTokenKind;
exports.isESTreeClassMember = isESTreeClassMember;
exports.hasModifier = hasModifier;
exports.getLastModifier = getLastModifier;
exports.isComma = isComma;
exports.isComment = isComment;
exports.getBinaryExpressionType = getBinaryExpressionType;
exports.getLineAndCharacterFor = getLineAndCharacterFor;
exports.getLocFor = getLocFor;
exports.canContainDirective = canContainDirective;
exports.getRange = getRange;
exports.isJSXToken = isJSXToken;
exports.getDeclarationKind = getDeclarationKind;
exports.getTSNodeAccessibility = getTSNodeAccessibility;
exports.findNextToken = findNextToken;
exports.findFirstMatchingAncestor = findFirstMatchingAncestor;
exports.hasJSXAncestor = hasJSXAncestor;
exports.unescapeStringLiteralText = unescapeStringLiteralText;
exports.isComputedProperty = isComputedProperty;
exports.isOptional = isOptional;
exports.isChainExpression = isChainExpression;
exports.isChildUnwrappableOptionalChain = isChildUnwrappableOptionalChain;
exports.getTokenType = getTokenType;
exports.convertToken = convertToken;
exports.convertTokens = convertTokens;
exports.createError = createError;
exports.nodeHasIllegalDecorators = nodeHasIllegalDecorators;
exports.nodeHasTokens = nodeHasTokens;
exports.firstDefined = firstDefined;
exports.identifierIsThisKeyword = identifierIsThisKeyword;
exports.isThisIdentifier = isThisIdentifier;
exports.isThisInTypeQuery = isThisInTypeQuery;
exports.nodeIsPresent = nodeIsPresent;
exports.getContainingFunction = getContainingFunction;
exports.nodeCanBeDecorated = nodeCanBeDecorated;
exports.isValidAssignmentTarget = isValidAssignmentTarget;
exports.getNamespaceModifiers = getNamespaceModifiers;
const ts = __importStar(require("typescript"));
const getModifiers_1 = require("./getModifiers");
const xhtml_entities_1 = require("./jsx/xhtml-entities");
const ts_estree_1 = require("./ts-estree");
const version_check_1 = require("./version-check");
const isAtLeast50 = version_check_1.typescriptVersionIsAtLeast['5.0'];
const SyntaxKind = ts.SyntaxKind;
const LOGICAL_OPERATORS = new Set([
    SyntaxKind.BarBarToken,
    SyntaxKind.AmpersandAmpersandToken,
    SyntaxKind.QuestionQuestionToken,
]);
const ASSIGNMENT_OPERATORS = new Set([
    ts.SyntaxKind.EqualsToken,
    ts.SyntaxKind.PlusEqualsToken,
    ts.SyntaxKind.MinusEqualsToken,
    ts.SyntaxKind.AsteriskEqualsToken,
    ts.SyntaxKind.AsteriskAsteriskEqualsToken,
    ts.SyntaxKind.SlashEqualsToken,
    ts.SyntaxKind.PercentEqualsToken,
    ts.SyntaxKind.LessThanLessThanEqualsToken,
    ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
    ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
    ts.SyntaxKind.AmpersandEqualsToken,
    ts.SyntaxKind.BarEqualsToken,
    ts.SyntaxKind.BarBarEqualsToken,
    ts.SyntaxKind.AmpersandAmpersandEqualsToken,
    ts.SyntaxKind.QuestionQuestionEqualsToken,
    ts.SyntaxKind.CaretEqualsToken,
]);
const BINARY_OPERATORS = new Set([
    SyntaxKind.InstanceOfKeyword,
    SyntaxKind.InKeyword,
    SyntaxKind.AsteriskAsteriskToken,
    SyntaxKind.AsteriskToken,
    SyntaxKind.SlashToken,
    SyntaxKind.PercentToken,
    SyntaxKind.PlusToken,
    SyntaxKind.MinusToken,
    SyntaxKind.AmpersandToken,
    SyntaxKind.BarToken,
    SyntaxKind.CaretToken,
    SyntaxKind.LessThanLessThanToken,
    SyntaxKind.GreaterThanGreaterThanToken,
    SyntaxKind.GreaterThanGreaterThanGreaterThanToken,
    SyntaxKind.AmpersandAmpersandToken,
    SyntaxKind.BarBarToken,
    SyntaxKind.LessThanToken,
    SyntaxKind.LessThanEqualsToken,
    SyntaxKind.GreaterThanToken,
    SyntaxKind.GreaterThanEqualsToken,
    SyntaxKind.EqualsEqualsToken,
    SyntaxKind.EqualsEqualsEqualsToken,
    SyntaxKind.ExclamationEqualsEqualsToken,
    SyntaxKind.ExclamationEqualsToken,
]);
/**
 * Returns true if the given ts.Token is the assignment operator
 * @param operator the operator token
 */
function isAssignmentOperator(operator) {
    return ASSIGNMENT_OPERATORS.has(operator.kind);
}
/**
 * Returns true if the given ts.Token is a logical operator
 * @param operator the operator token
 * @returns is a logical operator
 */
function isLogicalOperator(operator) {
    return LOGICAL_OPERATORS.has(operator.kind);
}
function isESTreeBinaryOperator(operator) {
    return BINARY_OPERATORS.has(operator.kind);
}
/**
 * Returns the string form of the given TSToken SyntaxKind
 * @param kind the token's SyntaxKind
 * @returns the token applicable token as a string
 */
function getTextForTokenKind(kind) {
    return ts.tokenToString(kind);
}
/**
 * Returns true if the given ts.Node is a valid ESTree class member
 * @param node TypeScript AST node
 * @returns is valid ESTree class member
 */
function isESTreeClassMember(node) {
    return node.kind !== SyntaxKind.SemicolonClassElement;
}
/**
 * Checks if a ts.Node has a modifier
 * @param modifierKind TypeScript SyntaxKind modifier
 * @param node TypeScript AST node
 * @returns has the modifier specified
 */
function hasModifier(modifierKind, node) {
    const modifiers = (0, getModifiers_1.getModifiers)(node);
    return modifiers?.some(modifier => modifier.kind === modifierKind) === true;
}
/**
 * Get last last modifier in ast
 * @param node TypeScript AST node
 * @returns returns last modifier if present or null
 */
function getLastModifier(node) {
    const modifiers = (0, getModifiers_1.getModifiers)(node);
    if (modifiers == null) {
        return null;
    }
    return modifiers[modifiers.length - 1] ?? null;
}
/**
 * Returns true if the given ts.Token is a comma
 * @param token the TypeScript token
 * @returns is comma
 */
function isComma(token) {
    return token.kind === SyntaxKind.CommaToken;
}
/**
 * Returns true if the given ts.Node is a comment
 * @param node the TypeScript node
 * @returns is comment
 */
function isComment(node) {
    return (node.kind === SyntaxKind.SingleLineCommentTrivia ||
        node.kind === SyntaxKind.MultiLineCommentTrivia);
}
/**
 * Returns true if the given ts.Node is a JSDoc comment
 * @param node the TypeScript node
 */
function isJSDocComment(node) {
    // eslint-disable-next-line deprecation/deprecation -- SyntaxKind.JSDoc was only added in TS4.7 so we can't use it yet
    return node.kind === SyntaxKind.JSDocComment;
}
/**
 * Returns the binary expression type of the given ts.Token
 * @param operator the operator token
 * @returns the binary expression type
 */
function getBinaryExpressionType(operator) {
    if (isAssignmentOperator(operator)) {
        return {
            type: ts_estree_1.AST_NODE_TYPES.AssignmentExpression,
            operator: getTextForTokenKind(operator.kind),
        };
    }
    else if (isLogicalOperator(operator)) {
        return {
            type: ts_estree_1.AST_NODE_TYPES.LogicalExpression,
            operator: getTextForTokenKind(operator.kind),
        };
    }
    else if (isESTreeBinaryOperator(operator)) {
        return {
            type: ts_estree_1.AST_NODE_TYPES.BinaryExpression,
            operator: getTextForTokenKind(operator.kind),
        };
    }
    throw new Error(`Unexpected binary operator ${ts.tokenToString(operator.kind)}`);
}
/**
 * Returns line and column data for the given positions,
 * @param pos position to check
 * @param ast the AST object
 * @returns line and column
 */
function getLineAndCharacterFor(pos, ast) {
    const loc = ast.getLineAndCharacterOfPosition(pos);
    return {
        line: loc.line + 1,
        column: loc.character,
    };
}
/**
 * Returns line and column data for the given start and end positions,
 * for the given AST
 * @param range start end data
 * @param ast   the AST object
 * @returns the loc data
 */
function getLocFor(range, ast) {
    const [start, end] = range.map(pos => getLineAndCharacterFor(pos, ast));
    return { start, end };
}
/**
 * Check whatever node can contain directive
 * @returns returns true if node can contain directive
 */
function canContainDirective(node) {
    if (node.kind === ts.SyntaxKind.Block) {
        switch (node.parent.kind) {
            case ts.SyntaxKind.Constructor:
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.ArrowFunction:
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.MethodDeclaration:
                return true;
            default:
                return false;
        }
    }
    return true;
}
/**
 * Returns range for the given ts.Node
 * @param node the ts.Node or ts.Token
 * @param ast the AST object
 * @returns the range data
 */
function getRange(node, ast) {
    return [node.getStart(ast), node.getEnd()];
}
/**
 * Returns true if a given ts.Node is a token
 * @param node the ts.Node
 * @returns is a token
 */
function isToken(node) {
    return (node.kind >= SyntaxKind.FirstToken && node.kind <= SyntaxKind.LastToken);
}
/**
 * Returns true if a given ts.Node is a JSX token
 * @param node ts.Node to be checked
 * @returns is a JSX token
 */
function isJSXToken(node) {
    return (node.kind >= SyntaxKind.JsxElement && node.kind <= SyntaxKind.JsxAttribute);
}
/**
 * Returns the declaration kind of the given ts.Node
 * @param node TypeScript AST node
 * @returns declaration kind
 */
function getDeclarationKind(node) {
    if (node.flags & ts.NodeFlags.Let) {
        return 'let';
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if ((node.flags & ts.NodeFlags.AwaitUsing) === ts.NodeFlags.AwaitUsing) {
        return 'await using';
    }
    if (node.flags & ts.NodeFlags.Const) {
        return 'const';
    }
    if (node.flags & ts.NodeFlags.Using) {
        return 'using';
    }
    return 'var';
}
/**
 * Gets a ts.Node's accessibility level
 * @param node The ts.Node
 * @returns accessibility "public", "protected", "private", or null
 */
function getTSNodeAccessibility(node) {
    const modifiers = (0, getModifiers_1.getModifiers)(node);
    if (modifiers == null) {
        return undefined;
    }
    for (const modifier of modifiers) {
        switch (modifier.kind) {
            case SyntaxKind.PublicKeyword:
                return 'public';
            case SyntaxKind.ProtectedKeyword:
                return 'protected';
            case SyntaxKind.PrivateKeyword:
                return 'private';
            default:
                break;
        }
    }
    return undefined;
}
/**
 * Finds the next token based on the previous one and its parent
 * Had to copy this from TS instead of using TS's version because theirs doesn't pass the ast to getChildren
 * @param previousToken The previous TSToken
 * @param parent The parent TSNode
 * @param ast The TS AST
 * @returns the next TSToken
 */
function findNextToken(previousToken, parent, ast) {
    return find(parent);
    function find(n) {
        if (ts.isToken(n) && n.pos === previousToken.end) {
            // this is token that starts at the end of previous token - return it
            return n;
        }
        return firstDefined(n.getChildren(ast), (child) => {
            const shouldDiveInChildNode = 
            // previous token is enclosed somewhere in the child
            (child.pos <= previousToken.pos && child.end > previousToken.end) ||
                // previous token ends exactly at the beginning of child
                child.pos === previousToken.end;
            return shouldDiveInChildNode && nodeHasTokens(child, ast)
                ? find(child)
                : undefined;
        });
    }
}
/**
 * Find the first matching ancestor based on the given predicate function.
 * @param node The current ts.Node
 * @param predicate The predicate function to apply to each checked ancestor
 * @returns a matching parent ts.Node
 */
function findFirstMatchingAncestor(node, predicate) {
    let current = node;
    while (current) {
        if (predicate(current)) {
            return current;
        }
        current = current.parent;
    }
    return undefined;
}
/**
 * Returns true if a given ts.Node has a JSX token within its hierarchy
 * @param node ts.Node to be checked
 * @returns has JSX ancestor
 */
function hasJSXAncestor(node) {
    return !!findFirstMatchingAncestor(node, isJSXToken);
}
/**
 * Unescape the text content of string literals, e.g. &amp; -> &
 * @param text The escaped string literal text.
 * @returns The unescaped string literal text.
 */
function unescapeStringLiteralText(text) {
    return text.replace(/&(?:#\d+|#x[\da-fA-F]+|[0-9a-zA-Z]+);/g, entity => {
        const item = entity.slice(1, -1);
        if (item[0] === '#') {
            const codePoint = item[1] === 'x'
                ? parseInt(item.slice(2), 16)
                : parseInt(item.slice(1), 10);
            return codePoint > 0x10ffff // RangeError: Invalid code point
                ? entity
                : String.fromCodePoint(codePoint);
        }
        return xhtml_entities_1.xhtmlEntities[item] || entity;
    });
}
/**
 * Returns true if a given ts.Node is a computed property
 * @param node ts.Node to be checked
 * @returns is Computed Property
 */
function isComputedProperty(node) {
    return node.kind === SyntaxKind.ComputedPropertyName;
}
/**
 * Returns true if a given ts.Node is optional (has QuestionToken)
 * @param node ts.Node to be checked
 * @returns is Optional
 */
function isOptional(node) {
    return !!node.questionToken;
}
/**
 * Returns true if the node is an optional chain node
 */
function isChainExpression(node) {
    return node.type === ts_estree_1.AST_NODE_TYPES.ChainExpression;
}
/**
 * Returns true of the child of property access expression is an optional chain
 */
function isChildUnwrappableOptionalChain(node, child) {
    return (isChainExpression(child) &&
        // (x?.y).z is semantically different, and as such .z is no longer optional
        node.expression.kind !== ts.SyntaxKind.ParenthesizedExpression);
}
/**
 * Returns the type of a given ts.Token
 * @param token the ts.Token
 * @returns the token type
 */
function getTokenType(token) {
    let keywordKind;
    if (isAtLeast50 && token.kind === SyntaxKind.Identifier) {
        keywordKind = ts.identifierToKeywordKind(token);
    }
    else if ('originalKeywordKind' in token) {
        // @ts-expect-error -- intentional fallback for older TS versions <=4.9
        keywordKind = token.originalKeywordKind;
    }
    if (keywordKind) {
        if (keywordKind === SyntaxKind.NullKeyword) {
            return ts_estree_1.AST_TOKEN_TYPES.Null;
        }
        else if (keywordKind >= SyntaxKind.FirstFutureReservedWord &&
            keywordKind <= SyntaxKind.LastKeyword) {
            return ts_estree_1.AST_TOKEN_TYPES.Identifier;
        }
        return ts_estree_1.AST_TOKEN_TYPES.Keyword;
    }
    if (token.kind >= SyntaxKind.FirstKeyword &&
        token.kind <= SyntaxKind.LastFutureReservedWord) {
        if (token.kind === SyntaxKind.FalseKeyword ||
            token.kind === SyntaxKind.TrueKeyword) {
            return ts_estree_1.AST_TOKEN_TYPES.Boolean;
        }
        return ts_estree_1.AST_TOKEN_TYPES.Keyword;
    }
    if (token.kind >= SyntaxKind.FirstPunctuation &&
        token.kind <= SyntaxKind.LastPunctuation) {
        return ts_estree_1.AST_TOKEN_TYPES.Punctuator;
    }
    if (token.kind >= SyntaxKind.NoSubstitutionTemplateLiteral &&
        token.kind <= SyntaxKind.TemplateTail) {
        return ts_estree_1.AST_TOKEN_TYPES.Template;
    }
    switch (token.kind) {
        case SyntaxKind.NumericLiteral:
            return ts_estree_1.AST_TOKEN_TYPES.Numeric;
        case SyntaxKind.JsxText:
            return ts_estree_1.AST_TOKEN_TYPES.JSXText;
        case SyntaxKind.StringLiteral:
            // A TypeScript-StringLiteral token with a TypeScript-JsxAttribute or TypeScript-JsxElement parent,
            // must actually be an ESTree-JSXText token
            if (token.parent.kind === SyntaxKind.JsxAttribute ||
                token.parent.kind === SyntaxKind.JsxElement) {
                return ts_estree_1.AST_TOKEN_TYPES.JSXText;
            }
            return ts_estree_1.AST_TOKEN_TYPES.String;
        case SyntaxKind.RegularExpressionLiteral:
            return ts_estree_1.AST_TOKEN_TYPES.RegularExpression;
        case SyntaxKind.Identifier:
        case SyntaxKind.ConstructorKeyword:
        case SyntaxKind.GetKeyword:
        case SyntaxKind.SetKeyword:
        // intentional fallthrough
        default:
    }
    // Some JSX tokens have to be determined based on their parent
    if (token.kind === SyntaxKind.Identifier) {
        if (isJSXToken(token.parent)) {
            return ts_estree_1.AST_TOKEN_TYPES.JSXIdentifier;
        }
        if (token.parent.kind === SyntaxKind.PropertyAccessExpression &&
            hasJSXAncestor(token)) {
            return ts_estree_1.AST_TOKEN_TYPES.JSXIdentifier;
        }
    }
    return ts_estree_1.AST_TOKEN_TYPES.Identifier;
}
/**
 * Extends and formats a given ts.Token, for a given AST
 * @param token the ts.Token
 * @param ast   the AST object
 * @returns the converted Token
 */
function convertToken(token, ast) {
    const start = token.kind === SyntaxKind.JsxText
        ? token.getFullStart()
        : token.getStart(ast);
    const end = token.getEnd();
    const value = ast.text.slice(start, end);
    const tokenType = getTokenType(token);
    const range = [start, end];
    const loc = getLocFor(range, ast);
    if (tokenType === ts_estree_1.AST_TOKEN_TYPES.RegularExpression) {
        return {
            type: tokenType,
            value,
            range,
            loc,
            regex: {
                pattern: value.slice(1, value.lastIndexOf('/')),
                flags: value.slice(value.lastIndexOf('/') + 1),
            },
        };
    }
    // @ts-expect-error TS is complaining about `value` not being the correct
    // type but it is
    return {
        type: tokenType,
        value,
        range,
        loc,
    };
}
/**
 * Converts all tokens for the given AST
 * @param ast the AST object
 * @returns the converted Tokens
 */
function convertTokens(ast) {
    const result = [];
    /**
     * @param node the ts.Node
     */
    function walk(node) {
        // TypeScript generates tokens for types in JSDoc blocks. Comment tokens
        // and their children should not be walked or added to the resulting tokens list.
        if (isComment(node) || isJSDocComment(node)) {
            return;
        }
        if (isToken(node) && node.kind !== SyntaxKind.EndOfFileToken) {
            result.push(convertToken(node, ast));
        }
        else {
            node.getChildren(ast).forEach(walk);
        }
    }
    walk(ast);
    return result;
}
class TSError extends Error {
    constructor(message, fileName, location) {
        super(message);
        this.fileName = fileName;
        this.location = location;
        Object.defineProperty(this, 'name', {
            value: new.target.name,
            enumerable: false,
            configurable: true,
        });
    }
    // For old version of ESLint https://github.com/typescript-eslint/typescript-eslint/pull/6556#discussion_r1123237311
    get index() {
        return this.location.start.offset;
    }
    // https://github.com/eslint/eslint/blob/b09a512107249a4eb19ef5a37b0bd672266eafdb/lib/linter/linter.js#L853
    get lineNumber() {
        return this.location.start.line;
    }
    // https://github.com/eslint/eslint/blob/b09a512107249a4eb19ef5a37b0bd672266eafdb/lib/linter/linter.js#L854
    get column() {
        return this.location.start.column;
    }
}
exports.TSError = TSError;
/**
 * @param message the error message
 * @param ast the AST object
 * @param startIndex the index at which the error starts
 * @param endIndex the index at which the error ends
 * @returns converted error object
 */
function createError(message, ast, startIndex, endIndex = startIndex) {
    const [start, end] = [startIndex, endIndex].map(offset => {
        const { line, character: column } = ast.getLineAndCharacterOfPosition(offset);
        return { line: line + 1, column, offset };
    });
    return new TSError(message, ast.fileName, { start, end });
}
function nodeHasIllegalDecorators(node) {
    return !!('illegalDecorators' in node &&
        node.illegalDecorators?.length);
}
/**
 * @param n the TSNode
 * @param ast the TS AST
 */
function nodeHasTokens(n, ast) {
    // If we have a token or node that has a non-zero width, it must have tokens.
    // Note: getWidth() does not take trivia into account.
    return n.kind === SyntaxKind.EndOfFileToken
        ? !!n.jsDoc
        : n.getWidth(ast) !== 0;
}
/**
 * Like `forEach`, but suitable for use with numbers and strings (which may be falsy).
 */
function firstDefined(array, callback) {
    if (array === undefined) {
        return undefined;
    }
    for (let i = 0; i < array.length; i++) {
        const result = callback(array[i], i);
        if (result !== undefined) {
            return result;
        }
    }
    return undefined;
}
function identifierIsThisKeyword(id) {
    return ((isAtLeast50
        ? ts.identifierToKeywordKind(id)
        : // @ts-expect-error -- intentional fallback for older TS versions <=4.9
            id.originalKeywordKind) === SyntaxKind.ThisKeyword);
}
function isThisIdentifier(node) {
    return (!!node &&
        node.kind === SyntaxKind.Identifier &&
        identifierIsThisKeyword(node));
}
function isThisInTypeQuery(node) {
    if (!isThisIdentifier(node)) {
        return false;
    }
    while (ts.isQualifiedName(node.parent) && node.parent.left === node) {
        node = node.parent;
    }
    return node.parent.kind === SyntaxKind.TypeQuery;
}
// `ts.nodeIsMissing`
function nodeIsMissing(node) {
    if (node === undefined) {
        return true;
    }
    return (node.pos === node.end &&
        node.pos >= 0 &&
        node.kind !== SyntaxKind.EndOfFileToken);
}
// `ts.nodeIsPresent`
function nodeIsPresent(node) {
    return !nodeIsMissing(node);
}
// `ts.getContainingFunction`
function getContainingFunction(node) {
    return ts.findAncestor(node.parent, ts.isFunctionLike);
}
// `ts.hasAbstractModifier`
function hasAbstractModifier(node) {
    return hasModifier(SyntaxKind.AbstractKeyword, node);
}
// `ts.getThisParameter`
function getThisParameter(signature) {
    if (signature.parameters.length && !ts.isJSDocSignature(signature)) {
        const thisParameter = signature.parameters[0];
        if (parameterIsThisKeyword(thisParameter)) {
            return thisParameter;
        }
    }
    return null;
}
// `ts.parameterIsThisKeyword`
function parameterIsThisKeyword(parameter) {
    return isThisIdentifier(parameter.name);
}
// Rewrite version of `ts.nodeCanBeDecorated`
// Returns `true` for both `useLegacyDecorators: true` and `useLegacyDecorators: false`
function nodeCanBeDecorated(node) {
    switch (node.kind) {
        case SyntaxKind.ClassDeclaration:
            return true;
        case SyntaxKind.ClassExpression:
            // `ts.nodeCanBeDecorated` returns `false` if `useLegacyDecorators: true`
            return true;
        case SyntaxKind.PropertyDeclaration: {
            const { parent } = node;
            // `ts.nodeCanBeDecorated` uses this if `useLegacyDecorators: true`
            if (ts.isClassDeclaration(parent)) {
                return true;
            }
            // `ts.nodeCanBeDecorated` uses this if `useLegacyDecorators: false`
            if (ts.isClassLike(parent) && !hasAbstractModifier(node)) {
                return true;
            }
            return false;
        }
        case SyntaxKind.GetAccessor:
        case SyntaxKind.SetAccessor:
        case SyntaxKind.MethodDeclaration: {
            const { parent } = node;
            // In `ts.nodeCanBeDecorated`
            // when `useLegacyDecorators: true` uses `ts.isClassDeclaration`
            // when `useLegacyDecorators: true` uses `ts.isClassLike`
            return (Boolean(node.body) &&
                (ts.isClassDeclaration(parent) || ts.isClassLike(parent)));
        }
        case SyntaxKind.Parameter: {
            // `ts.nodeCanBeDecorated` returns `false` if `useLegacyDecorators: false`
            const { parent } = node;
            const grandparent = parent.parent;
            return (Boolean(parent) &&
                'body' in parent &&
                Boolean(parent.body) &&
                (parent.kind === SyntaxKind.Constructor ||
                    parent.kind === SyntaxKind.MethodDeclaration ||
                    parent.kind === SyntaxKind.SetAccessor) &&
                getThisParameter(parent) !== node &&
                Boolean(grandparent) &&
                grandparent.kind === SyntaxKind.ClassDeclaration);
        }
    }
    return false;
}
function isValidAssignmentTarget(node) {
    switch (node.kind) {
        case SyntaxKind.Identifier:
            return true;
        case SyntaxKind.PropertyAccessExpression:
        case SyntaxKind.ElementAccessExpression:
            if (node.flags & ts.NodeFlags.OptionalChain) {
                return false;
            }
            return true;
        case SyntaxKind.ParenthesizedExpression:
        case SyntaxKind.TypeAssertionExpression:
        case SyntaxKind.AsExpression:
        case SyntaxKind.SatisfiesExpression:
        case SyntaxKind.NonNullExpression:
            return isValidAssignmentTarget(node.expression);
        default:
            return false;
    }
}
function getNamespaceModifiers(node) {
    // For following nested namespaces, use modifiers given to the topmost namespace
    //   export declare namespace foo.bar.baz {}
    let modifiers = (0, getModifiers_1.getModifiers)(node);
    let moduleDeclaration = node;
    while ((!modifiers || modifiers.length === 0) &&
        ts.isModuleDeclaration(moduleDeclaration.parent)) {
        const parentModifiers = (0, getModifiers_1.getModifiers)(moduleDeclaration.parent);
        if (parentModifiers?.length) {
            modifiers = parentModifiers;
        }
        moduleDeclaration = moduleDeclaration.parent;
    }
    return modifiers;
}
//# sourceMappingURL=node-utils.js.map