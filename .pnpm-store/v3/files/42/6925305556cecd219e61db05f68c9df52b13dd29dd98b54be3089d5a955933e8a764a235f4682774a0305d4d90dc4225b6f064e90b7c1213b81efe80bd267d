"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createPaddingRule = exports.StatementType = exports.PaddingType = void 0;
var _utils = require("@typescript-eslint/utils");
var astUtils = _interopRequireWildcard(require("./ast-utils"));
var _misc = require("./misc");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * Require/fix newlines around jest functions
 *
 * Based on eslint/padding-line-between-statements by Toru Nagashima
 * See: https://github.com/eslint/eslint/blob/master/lib/rules/padding-line-between-statements.js
 *
 * Some helpers borrowed from eslint ast-utils by Gyandeep Singh
 * See: https://github.com/eslint/eslint/blob/master/lib/rules/utils/ast-utils.js
 */
// Statement types we'll respond to
let StatementType = exports.StatementType = /*#__PURE__*/function (StatementType) {
  StatementType[StatementType["Any"] = 0] = "Any";
  StatementType[StatementType["AfterAllToken"] = 1] = "AfterAllToken";
  StatementType[StatementType["AfterEachToken"] = 2] = "AfterEachToken";
  StatementType[StatementType["BeforeAllToken"] = 3] = "BeforeAllToken";
  StatementType[StatementType["BeforeEachToken"] = 4] = "BeforeEachToken";
  StatementType[StatementType["DescribeToken"] = 5] = "DescribeToken";
  StatementType[StatementType["ExpectToken"] = 6] = "ExpectToken";
  StatementType[StatementType["FdescribeToken"] = 7] = "FdescribeToken";
  StatementType[StatementType["FitToken"] = 8] = "FitToken";
  StatementType[StatementType["ItToken"] = 9] = "ItToken";
  StatementType[StatementType["TestToken"] = 10] = "TestToken";
  StatementType[StatementType["XdescribeToken"] = 11] = "XdescribeToken";
  StatementType[StatementType["XitToken"] = 12] = "XitToken";
  StatementType[StatementType["XtestToken"] = 13] = "XtestToken";
  return StatementType;
}({});
// Padding type to apply between statements
let PaddingType = exports.PaddingType = /*#__PURE__*/function (PaddingType) {
  PaddingType[PaddingType["Any"] = 0] = "Any";
  PaddingType[PaddingType["Always"] = 1] = "Always";
  return PaddingType;
}({}); // A configuration object for padding type and the two statement types
// Tracks position in scope and prevNode. Used to compare current and prev node
// and then to walk back up to the parent scope or down into the next one.
// And so on...
// Creates a StatementTester to test an ExpressionStatement's first token name
const createTokenTester = tokenName => {
  return (node, sourceCode) => {
    let activeNode = node;
    if (activeNode.type === _utils.AST_NODE_TYPES.ExpressionStatement) {
      // In the case of `await`, we actually care about its argument
      if (activeNode.expression.type === _utils.AST_NODE_TYPES.AwaitExpression) {
        activeNode = activeNode.expression.argument;
      }
      const token = sourceCode.getFirstToken(activeNode);
      return token?.type === _utils.AST_TOKEN_TYPES.Identifier && token.value === tokenName;
    }
    return false;
  };
};

// A mapping of StatementType to StatementTester for... testing statements
const statementTesters = {
  [StatementType.Any]: () => true,
  [StatementType.AfterAllToken]: createTokenTester('afterAll'),
  [StatementType.AfterEachToken]: createTokenTester('afterEach'),
  [StatementType.BeforeAllToken]: createTokenTester('beforeAll'),
  [StatementType.BeforeEachToken]: createTokenTester('beforeEach'),
  [StatementType.DescribeToken]: createTokenTester('describe'),
  [StatementType.ExpectToken]: createTokenTester('expect'),
  [StatementType.FdescribeToken]: createTokenTester('fdescribe'),
  [StatementType.FitToken]: createTokenTester('fit'),
  [StatementType.ItToken]: createTokenTester('it'),
  [StatementType.TestToken]: createTokenTester('test'),
  [StatementType.XdescribeToken]: createTokenTester('xdescribe'),
  [StatementType.XitToken]: createTokenTester('xit'),
  [StatementType.XtestToken]: createTokenTester('xtest')
};

/**
 * Check and report statements for `PaddingType.Always` configuration.
 * This autofix inserts a blank line between the given 2 statements.
 * If the `prevNode` has trailing comments, it inserts a blank line after the
 * trailing comments.
 */
const paddingAlwaysTester = (prevNode, nextNode, paddingContext) => {
  const {
    sourceCode,
    ruleContext
  } = paddingContext;
  const paddingLines = astUtils.getPaddingLineSequences(prevNode, nextNode, sourceCode);

  // We've got some padding lines. Great.
  if (paddingLines.length > 0) {
    return;
  }

  // Missing padding line
  ruleContext.report({
    node: nextNode,
    messageId: 'missingPadding',
    fix(fixer) {
      let prevToken = astUtils.getActualLastToken(sourceCode, prevNode);
      const nextToken = sourceCode.getFirstTokenBetween(prevToken, nextNode, {
        includeComments: true,
        /**
         * Skip the trailing comments of the previous node.
         * This inserts a blank line after the last trailing comment.
         *
         * For example:
         *
         *     foo(); // trailing comment.
         *     // comment.
         *     bar();
         *
         * Get fixed to:
         *
         *     foo(); // trailing comment.
         *
         *     // comment.
         *     bar();
         */
        filter(token) {
          if (astUtils.areTokensOnSameLine(prevToken, token)) {
            prevToken = token;
            return false;
          }
          return true;
        }
      }) || nextNode;
      const insertText = astUtils.areTokensOnSameLine(prevToken, nextToken) ? '\n\n' : '\n';
      return fixer.insertTextAfter(prevToken, insertText);
    }
  });
};

// A mapping of PaddingType to PaddingTester
const paddingTesters = {
  [PaddingType.Any]: () => true,
  [PaddingType.Always]: paddingAlwaysTester
};
const createScopeInfo = () => {
  let scope = null;

  // todo: explore seeing if we can refactor to a more TypeScript friendly structure
  return {
    get prevNode() {
      return scope.prevNode;
    },
    set prevNode(node) {
      scope.prevNode = node;
    },
    enter() {
      scope = {
        upper: scope,
        prevNode: null
      };
    },
    exit() {
      scope = scope.upper;
    }
  };
};

/**
 * Check whether the given node matches the statement type
 */
const nodeMatchesType = (node, statementType, paddingContext) => {
  let innerStatementNode = node;
  const {
    sourceCode
  } = paddingContext;

  // Dig into LabeledStatement body until it's not that anymore
  while (innerStatementNode.type === _utils.AST_NODE_TYPES.LabeledStatement) {
    innerStatementNode = innerStatementNode.body;
  }

  // If it's an array recursively check if any of the statement types match
  // the node
  if (Array.isArray(statementType)) {
    return statementType.some(type => nodeMatchesType(innerStatementNode, type, paddingContext));
  }
  return statementTesters[statementType](innerStatementNode, sourceCode);
};

/**
 * Executes matching padding tester for last matched padding config for given
 * nodes
 */
const testPadding = (prevNode, nextNode, paddingContext) => {
  const {
    configs
  } = paddingContext;
  const testType = type => paddingTesters[type](prevNode, nextNode, paddingContext);
  for (let i = configs.length - 1; i >= 0; --i) {
    const {
      prevStatementType: prevType,
      nextStatementType: nextType,
      paddingType
    } = configs[i];
    if (nodeMatchesType(prevNode, prevType, paddingContext) && nodeMatchesType(nextNode, nextType, paddingContext)) {
      return testType(paddingType);
    }
  }

  // There were no matching padding rules for the prevNode, nextNode,
  // paddingType combination... so we'll use PaddingType.Any which is always ok
  return testType(PaddingType.Any);
};

/**
 * Verify padding lines between the given node and the previous node.
 */
const verifyNode = (node, paddingContext) => {
  const {
    scopeInfo
  } = paddingContext;

  // NOTE: ESLint types use ESTree which provides a Node type, however
  //  ESTree.Node doesn't support the parent property which is added by
  //  ESLint during traversal. Our best bet is to ignore the property access
  //  here as it's the only place that it's checked.

  if (!astUtils.isValidParent(node.parent.type)) {
    return;
  }
  if (scopeInfo.prevNode) {
    testPadding(scopeInfo.prevNode, node, paddingContext);
  }
  scopeInfo.prevNode = node;
};

/**
 * Creates an ESLint rule for a given set of padding Config objects.
 *
 * The algorithm is approximately this:
 *
 * For each 'scope' in the program
 * - Enter the scope (store the parent scope and previous node)
 * - For each statement in the scope
 *   - Check the current node and previous node against the Config objects
 *   - If the current node and previous node match a Config, check the padding.
 *     Otherwise, ignore it.
 *   - If the padding is missing (and required), report and fix
 *   - Store the current node as the previous
 *   - Repeat
 * - Exit scope (return to parent scope and clear previous node)
 *
 * The items we're looking for with this rule are ExpressionStatement nodes
 * where the first token is an Identifier with a name matching one of the Jest
 * functions. It's not foolproof, of course, but it's probably good enough for
 * almost all cases.
 *
 * The Config objects specify a padding type, a previous statement type, and a
 * next statement type. Wildcard statement types and padding types are
 * supported. The current node and previous node are checked against the
 * statement types. If they match then the specified padding type is
 * tested/enforced.
 *
 * See src/index.ts for examples of Config usage.
 */
const createPaddingRule = (name, description, configs, deprecated = false) => {
  return (0, _misc.createRule)({
    name,
    meta: {
      docs: {
        description
      },
      fixable: 'whitespace',
      deprecated,
      messages: {
        missingPadding: 'Expected blank line before this statement.'
      },
      schema: [],
      type: 'suggestion'
    },
    defaultOptions: [],
    create(context) {
      const paddingContext = {
        ruleContext: context,
        sourceCode: (0, _misc.getSourceCode)(context),
        scopeInfo: createScopeInfo(),
        configs
      };
      const {
        scopeInfo
      } = paddingContext;
      return {
        Program: scopeInfo.enter,
        'Program:exit': scopeInfo.enter,
        BlockStatement: scopeInfo.enter,
        'BlockStatement:exit': scopeInfo.exit,
        SwitchStatement: scopeInfo.enter,
        'SwitchStatement:exit': scopeInfo.exit,
        ':statement': node => verifyNode(node, paddingContext),
        SwitchCase(node) {
          verifyNode(node, paddingContext);
          scopeInfo.enter();
        },
        'SwitchCase:exit': scopeInfo.exit
      };
    }
  });
};
exports.createPaddingRule = createPaddingRule;