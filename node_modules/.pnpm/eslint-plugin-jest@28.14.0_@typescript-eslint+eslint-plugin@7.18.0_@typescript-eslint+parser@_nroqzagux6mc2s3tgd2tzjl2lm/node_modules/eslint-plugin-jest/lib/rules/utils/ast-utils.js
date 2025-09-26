"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isValidParent = exports.isTokenASemicolon = exports.getPaddingLineSequences = exports.getActualLastToken = exports.areTokensOnSameLine = void 0;
var _utils = require("@typescript-eslint/utils");
const isTokenASemicolon = token => token.value === ';' && token.type === _utils.AST_TOKEN_TYPES.Punctuator;
exports.isTokenASemicolon = isTokenASemicolon;
const areTokensOnSameLine = (left, right) => left.loc.end.line === right.loc.start.line;

// We'll only verify nodes with these parent types
exports.areTokensOnSameLine = areTokensOnSameLine;
const STATEMENT_LIST_PARENTS = new Set([_utils.AST_NODE_TYPES.Program, _utils.AST_NODE_TYPES.BlockStatement, _utils.AST_NODE_TYPES.SwitchCase, _utils.AST_NODE_TYPES.SwitchStatement]);
const isValidParent = parentType => {
  return STATEMENT_LIST_PARENTS.has(parentType);
};

/**
 * Gets the actual last token.
 *
 * If a semicolon is semicolon-less style's semicolon, this ignores it.
 * For example:
 *
 *     foo()
 *     ;[1, 2, 3].forEach(bar)
 */
exports.isValidParent = isValidParent;
const getActualLastToken = (sourceCode, node) => {
  const semiToken = sourceCode.getLastToken(node);
  const prevToken = sourceCode.getTokenBefore(semiToken);
  const nextToken = sourceCode.getTokenAfter(semiToken);
  const isSemicolonLessStyle = Boolean(prevToken && nextToken && prevToken.range[0] >= node.range[0] && isTokenASemicolon(semiToken) && semiToken.loc.start.line !== prevToken.loc.end.line && semiToken.loc.end.line === nextToken.loc.start.line);
  return isSemicolonLessStyle ? prevToken : semiToken;
};

/**
 * Gets padding line sequences between the given 2 statements.
 * Comments are separators of the padding line sequences.
 */
exports.getActualLastToken = getActualLastToken;
const getPaddingLineSequences = (prevNode, nextNode, sourceCode) => {
  const pairs = [];
  const includeComments = true;
  let prevToken = getActualLastToken(sourceCode, prevNode);
  if (nextNode.loc.start.line - prevToken.loc.end.line >= 2) {
    do {
      const token = sourceCode.getTokenAfter(prevToken, {
        includeComments
      });
      if (token.loc.start.line - prevToken.loc.end.line >= 2) {
        pairs.push([prevToken, token]);
      }
      prevToken = token;
    } while (prevToken.range[0] < nextNode.range[0]);
  }
  return pairs;
};
exports.getPaddingLineSequences = getPaddingLineSequences;