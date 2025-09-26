import {
  clear,
  common_default,
  defaultConfig2 as defaultConfig,
  getAccDescription,
  getAccTitle,
  getConfig2 as getConfig,
  getDiagramTitle,
  setAccDescription,
  setAccTitle,
  setDiagramTitle,
  setupGraphViewbox
} from "./chunk-6PHMZWEM.mjs";
import {
  Tableau10_default,
  ordinal,
  select_default
} from "./chunk-2LXNVE6Q.mjs";
import {
  __name
} from "./chunk-DLQEHMXD.mjs";

// src/diagrams/sankey/parser/sankey.jison
var parser = (function() {
  var o = /* @__PURE__ */ __name(function(k, v, o2, l) {
    for (o2 = o2 || {}, l = k.length; l--; o2[k[l]] = v) ;
    return o2;
  }, "o"), $V0 = [1, 9], $V1 = [1, 10], $V2 = [1, 5, 10, 12];
  var parser2 = {
    trace: /* @__PURE__ */ __name(function trace() {
    }, "trace"),
    yy: {},
    symbols_: { "error": 2, "start": 3, "SANKEY": 4, "NEWLINE": 5, "csv": 6, "opt_eof": 7, "record": 8, "csv_tail": 9, "EOF": 10, "field[source]": 11, "COMMA": 12, "field[target]": 13, "field[value]": 14, "field": 15, "escaped": 16, "non_escaped": 17, "DQUOTE": 18, "ESCAPED_TEXT": 19, "NON_ESCAPED_TEXT": 20, "$accept": 0, "$end": 1 },
    terminals_: { 2: "error", 4: "SANKEY", 5: "NEWLINE", 10: "EOF", 11: "field[source]", 12: "COMMA", 13: "field[target]", 14: "field[value]", 18: "DQUOTE", 19: "ESCAPED_TEXT", 20: "NON_ESCAPED_TEXT" },
    productions_: [0, [3, 4], [6, 2], [9, 2], [9, 0], [7, 1], [7, 0], [8, 5], [15, 1], [15, 1], [16, 3], [17, 1]],
    performAction: /* @__PURE__ */ __name(function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$) {
      var $0 = $$.length - 1;
      switch (yystate) {
        case 7:
          const source = yy.findOrCreateNode($$[$0 - 4].trim().replaceAll('""', '"'));
          const target = yy.findOrCreateNode($$[$0 - 2].trim().replaceAll('""', '"'));
          const value2 = parseFloat($$[$0].trim());
          yy.addLink(source, target, value2);
          break;
        case 8:
        case 9:
        case 11:
          this.$ = $$[$0];
          break;
        case 10:
          this.$ = $$[$0 - 1];
          break;
      }
    }, "anonymous"),
    table: [{ 3: 1, 4: [1, 2] }, { 1: [3] }, { 5: [1, 3] }, { 6: 4, 8: 5, 15: 6, 16: 7, 17: 8, 18: $V0, 20: $V1 }, { 1: [2, 6], 7: 11, 10: [1, 12] }, o($V1, [2, 4], { 9: 13, 5: [1, 14] }), { 12: [1, 15] }, o($V2, [2, 8]), o($V2, [2, 9]), { 19: [1, 16] }, o($V2, [2, 11]), { 1: [2, 1] }, { 1: [2, 5] }, o($V1, [2, 2]), { 6: 17, 8: 5, 15: 6, 16: 7, 17: 8, 18: $V0, 20: $V1 }, { 15: 18, 16: 7, 17: 8, 18: $V0, 20: $V1 }, { 18: [1, 19] }, o($V1, [2, 3]), { 12: [1, 20] }, o($V2, [2, 10]), { 15: 21, 16: 7, 17: 8, 18: $V0, 20: $V1 }, o([1, 5, 10], [2, 7])],
    defaultActions: { 11: [2, 1], 12: [2, 5] },
    parseError: /* @__PURE__ */ __name(function parseError(str, hash) {
      if (hash.recoverable) {
        this.trace(str);
      } else {
        var error = new Error(str);
        error.hash = hash;
        throw error;
      }
    }, "parseError"),
    parse: /* @__PURE__ */ __name(function parse(input) {
      var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
      var args = lstack.slice.call(arguments, 1);
      var lexer2 = Object.create(this.lexer);
      var sharedState = { yy: {} };
      for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
          sharedState.yy[k] = this.yy[k];
        }
      }
      lexer2.setInput(input, sharedState.yy);
      sharedState.yy.lexer = lexer2;
      sharedState.yy.parser = this;
      if (typeof lexer2.yylloc == "undefined") {
        lexer2.yylloc = {};
      }
      var yyloc = lexer2.yylloc;
      lstack.push(yyloc);
      var ranges = lexer2.options && lexer2.options.ranges;
      if (typeof sharedState.yy.parseError === "function") {
        this.parseError = sharedState.yy.parseError;
      } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
      }
      function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
      }
      __name(popStack, "popStack");
      function lex() {
        var token;
        token = tstack.pop() || lexer2.lex() || EOF;
        if (typeof token !== "number") {
          if (token instanceof Array) {
            tstack = token;
            token = tstack.pop();
          }
          token = self.symbols_[token] || token;
        }
        return token;
      }
      __name(lex, "lex");
      var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
      while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
          action = this.defaultActions[state];
        } else {
          if (symbol === null || typeof symbol == "undefined") {
            symbol = lex();
          }
          action = table[state] && table[state][symbol];
        }
        if (typeof action === "undefined" || !action.length || !action[0]) {
          var errStr = "";
          expected = [];
          for (p in table[state]) {
            if (this.terminals_[p] && p > TERROR) {
              expected.push("'" + this.terminals_[p] + "'");
            }
          }
          if (lexer2.showPosition) {
            errStr = "Parse error on line " + (yylineno + 1) + ":\n" + lexer2.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
          } else {
            errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == EOF ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
          }
          this.parseError(errStr, {
            text: lexer2.match,
            token: this.terminals_[symbol] || symbol,
            line: lexer2.yylineno,
            loc: yyloc,
            expected
          });
        }
        if (action[0] instanceof Array && action.length > 1) {
          throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
        }
        switch (action[0]) {
          case 1:
            stack.push(symbol);
            vstack.push(lexer2.yytext);
            lstack.push(lexer2.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
              yyleng = lexer2.yyleng;
              yytext = lexer2.yytext;
              yylineno = lexer2.yylineno;
              yyloc = lexer2.yylloc;
              if (recovering > 0) {
                recovering--;
              }
            } else {
              symbol = preErrorSymbol;
              preErrorSymbol = null;
            }
            break;
          case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
              first_line: lstack[lstack.length - (len || 1)].first_line,
              last_line: lstack[lstack.length - 1].last_line,
              first_column: lstack[lstack.length - (len || 1)].first_column,
              last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
              yyval._$.range = [
                lstack[lstack.length - (len || 1)].range[0],
                lstack[lstack.length - 1].range[1]
              ];
            }
            r = this.performAction.apply(yyval, [
              yytext,
              yyleng,
              yylineno,
              sharedState.yy,
              action[1],
              vstack,
              lstack
            ].concat(args));
            if (typeof r !== "undefined") {
              return r;
            }
            if (len) {
              stack = stack.slice(0, -1 * len * 2);
              vstack = vstack.slice(0, -1 * len);
              lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
          case 3:
            return true;
        }
      }
      return true;
    }, "parse")
  };
  var lexer = /* @__PURE__ */ (function() {
    var lexer2 = {
      EOF: 1,
      parseError: /* @__PURE__ */ __name(function parseError(str, hash) {
        if (this.yy.parser) {
          this.yy.parser.parseError(str, hash);
        } else {
          throw new Error(str);
        }
      }, "parseError"),
      // resets the lexer, sets new input
      setInput: /* @__PURE__ */ __name(function(input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = "";
        this.conditionStack = ["INITIAL"];
        this.yylloc = {
          first_line: 1,
          first_column: 0,
          last_line: 1,
          last_column: 0
        };
        if (this.options.ranges) {
          this.yylloc.range = [0, 0];
        }
        this.offset = 0;
        return this;
      }, "setInput"),
      // consumes and returns one char from the input
      input: /* @__PURE__ */ __name(function() {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
          this.yylineno++;
          this.yylloc.last_line++;
        } else {
          this.yylloc.last_column++;
        }
        if (this.options.ranges) {
          this.yylloc.range[1]++;
        }
        this._input = this._input.slice(1);
        return ch;
      }, "input"),
      // unshifts one char (or a string) into the input
      unput: /* @__PURE__ */ __name(function(ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);
        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);
        if (lines.length - 1) {
          this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;
        this.yylloc = {
          first_line: this.yylloc.first_line,
          last_line: this.yylineno + 1,
          first_column: this.yylloc.first_column,
          last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
        };
        if (this.options.ranges) {
          this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
      }, "unput"),
      // When called from action, caches matched text and appends it on next action
      more: /* @__PURE__ */ __name(function() {
        this._more = true;
        return this;
      }, "more"),
      // When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
      reject: /* @__PURE__ */ __name(function() {
        if (this.options.backtrack_lexer) {
          this._backtrack = true;
        } else {
          return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n" + this.showPosition(), {
            text: "",
            token: null,
            line: this.yylineno
          });
        }
        return this;
      }, "reject"),
      // retain first n characters of the match
      less: /* @__PURE__ */ __name(function(n) {
        this.unput(this.match.slice(n));
      }, "less"),
      // displays already matched input, i.e. for error messages
      pastInput: /* @__PURE__ */ __name(function() {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
      }, "pastInput"),
      // displays upcoming input, i.e. for error messages
      upcomingInput: /* @__PURE__ */ __name(function() {
        var next = this.match;
        if (next.length < 20) {
          next += this._input.substr(0, 20 - next.length);
        }
        return (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
      }, "upcomingInput"),
      // displays the character position where the lexing error occurred, i.e. for error messages
      showPosition: /* @__PURE__ */ __name(function() {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
      }, "showPosition"),
      // test the lexed token: return FALSE when not a match, otherwise return token
      test_match: /* @__PURE__ */ __name(function(match, indexed_rule) {
        var token, lines, backup;
        if (this.options.backtrack_lexer) {
          backup = {
            yylineno: this.yylineno,
            yylloc: {
              first_line: this.yylloc.first_line,
              last_line: this.last_line,
              first_column: this.yylloc.first_column,
              last_column: this.yylloc.last_column
            },
            yytext: this.yytext,
            match: this.match,
            matches: this.matches,
            matched: this.matched,
            yyleng: this.yyleng,
            offset: this.offset,
            _more: this._more,
            _input: this._input,
            yy: this.yy,
            conditionStack: this.conditionStack.slice(0),
            done: this.done
          };
          if (this.options.ranges) {
            backup.yylloc.range = this.yylloc.range.slice(0);
          }
        }
        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
          this.yylineno += lines.length;
        }
        this.yylloc = {
          first_line: this.yylloc.last_line,
          last_line: this.yylineno + 1,
          first_column: this.yylloc.last_column,
          last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
          this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
          this.done = false;
        }
        if (token) {
          return token;
        } else if (this._backtrack) {
          for (var k in backup) {
            this[k] = backup[k];
          }
          return false;
        }
        return false;
      }, "test_match"),
      // return next match in input
      next: /* @__PURE__ */ __name(function() {
        if (this.done) {
          return this.EOF;
        }
        if (!this._input) {
          this.done = true;
        }
        var token, match, tempMatch, index;
        if (!this._more) {
          this.yytext = "";
          this.match = "";
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
          tempMatch = this._input.match(this.rules[rules[i]]);
          if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
            match = tempMatch;
            index = i;
            if (this.options.backtrack_lexer) {
              token = this.test_match(tempMatch, rules[i]);
              if (token !== false) {
                return token;
              } else if (this._backtrack) {
                match = false;
                continue;
              } else {
                return false;
              }
            } else if (!this.options.flex) {
              break;
            }
          }
        }
        if (match) {
          token = this.test_match(match, rules[index]);
          if (token !== false) {
            return token;
          }
          return false;
        }
        if (this._input === "") {
          return this.EOF;
        } else {
          return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), {
            text: "",
            token: null,
            line: this.yylineno
          });
        }
      }, "next"),
      // return next match that has a token
      lex: /* @__PURE__ */ __name(function lex() {
        var r = this.next();
        if (r) {
          return r;
        } else {
          return this.lex();
        }
      }, "lex"),
      // activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
      begin: /* @__PURE__ */ __name(function begin(condition) {
        this.conditionStack.push(condition);
      }, "begin"),
      // pop the previously active lexer condition state off the condition stack
      popState: /* @__PURE__ */ __name(function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
          return this.conditionStack.pop();
        } else {
          return this.conditionStack[0];
        }
      }, "popState"),
      // produce the lexer rule set which is active for the currently active lexer condition state
      _currentRules: /* @__PURE__ */ __name(function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
          return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
          return this.conditions["INITIAL"].rules;
        }
      }, "_currentRules"),
      // return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
      topState: /* @__PURE__ */ __name(function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
          return this.conditionStack[n];
        } else {
          return "INITIAL";
        }
      }, "topState"),
      // alias for begin(condition)
      pushState: /* @__PURE__ */ __name(function pushState(condition) {
        this.begin(condition);
      }, "pushState"),
      // return the number of states currently on the stack
      stateStackSize: /* @__PURE__ */ __name(function stateStackSize() {
        return this.conditionStack.length;
      }, "stateStackSize"),
      options: { "case-insensitive": true },
      performAction: /* @__PURE__ */ __name(function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {
        var YYSTATE = YY_START;
        switch ($avoiding_name_collisions) {
          case 0:
            this.pushState("csv");
            return 4;
            break;
          case 1:
            this.pushState("csv");
            return 4;
            break;
          case 2:
            return 10;
            break;
          case 3:
            return 5;
            break;
          case 4:
            return 12;
            break;
          case 5:
            this.pushState("escaped_text");
            return 18;
            break;
          case 6:
            return 20;
            break;
          case 7:
            this.popState("escaped_text");
            return 18;
            break;
          case 8:
            return 19;
            break;
        }
      }, "anonymous"),
      rules: [/^(?:sankey-beta\b)/i, /^(?:sankey\b)/i, /^(?:$)/i, /^(?:((\u000D\u000A)|(\u000A)))/i, /^(?:(\u002C))/i, /^(?:(\u0022))/i, /^(?:([\u0020-\u0021\u0023-\u002B\u002D-\u007E])*)/i, /^(?:(\u0022)(?!(\u0022)))/i, /^(?:(([\u0020-\u0021\u0023-\u002B\u002D-\u007E])|(\u002C)|(\u000D)|(\u000A)|(\u0022)(\u0022))*)/i],
      conditions: { "csv": { "rules": [2, 3, 4, 5, 6, 7, 8], "inclusive": false }, "escaped_text": { "rules": [7, 8], "inclusive": false }, "INITIAL": { "rules": [0, 1, 2, 3, 4, 5, 6, 7, 8], "inclusive": true } }
    };
    return lexer2;
  })();
  parser2.lexer = lexer;
  function Parser() {
    this.yy = {};
  }
  __name(Parser, "Parser");
  Parser.prototype = parser2;
  parser2.Parser = Parser;
  return new Parser();
})();
parser.parser = parser;
var sankey_default = parser;

// src/diagrams/sankey/sankeyDB.ts
var links = [];
var nodes = [];
var nodesMap = /* @__PURE__ */ new Map();
var clear2 = /* @__PURE__ */ __name(() => {
  links = [];
  nodes = [];
  nodesMap = /* @__PURE__ */ new Map();
  clear();
}, "clear");
var SankeyLink = class {
  constructor(source, target, value2 = 0) {
    this.source = source;
    this.target = target;
    this.value = value2;
  }
  static {
    __name(this, "SankeyLink");
  }
};
var addLink = /* @__PURE__ */ __name((source, target, value2) => {
  links.push(new SankeyLink(source, target, value2));
}, "addLink");
var SankeyNode = class {
  constructor(ID) {
    this.ID = ID;
  }
  static {
    __name(this, "SankeyNode");
  }
};
var findOrCreateNode = /* @__PURE__ */ __name((ID) => {
  ID = common_default.sanitizeText(ID, getConfig());
  let node = nodesMap.get(ID);
  if (node === void 0) {
    node = new SankeyNode(ID);
    nodesMap.set(ID, node);
    nodes.push(node);
  }
  return node;
}, "findOrCreateNode");
var getNodes = /* @__PURE__ */ __name(() => nodes, "getNodes");
var getLinks = /* @__PURE__ */ __name(() => links, "getLinks");
var getGraph = /* @__PURE__ */ __name(() => ({
  nodes: nodes.map((node) => ({ id: node.ID })),
  links: links.map((link2) => ({
    source: link2.source.ID,
    target: link2.target.ID,
    value: link2.value
  }))
}), "getGraph");
var sankeyDB_default = {
  nodesMap,
  getConfig: /* @__PURE__ */ __name(() => getConfig().sankey, "getConfig"),
  getNodes,
  getLinks,
  getGraph,
  addLink,
  findOrCreateNode,
  getAccTitle,
  setAccTitle,
  getAccDescription,
  setAccDescription,
  getDiagramTitle,
  setDiagramTitle,
  clear: clear2
};

// ../../node_modules/.pnpm/d3-array@2.12.1/node_modules/d3-array/src/max.js
function max(values, valueof) {
  let max2;
  if (valueof === void 0) {
    for (const value2 of values) {
      if (value2 != null && (max2 < value2 || max2 === void 0 && value2 >= value2)) {
        max2 = value2;
      }
    }
  } else {
    let index = -1;
    for (let value2 of values) {
      if ((value2 = valueof(value2, ++index, values)) != null && (max2 < value2 || max2 === void 0 && value2 >= value2)) {
        max2 = value2;
      }
    }
  }
  return max2;
}
__name(max, "max");

// ../../node_modules/.pnpm/d3-array@2.12.1/node_modules/d3-array/src/min.js
function min(values, valueof) {
  let min2;
  if (valueof === void 0) {
    for (const value2 of values) {
      if (value2 != null && (min2 > value2 || min2 === void 0 && value2 >= value2)) {
        min2 = value2;
      }
    }
  } else {
    let index = -1;
    for (let value2 of values) {
      if ((value2 = valueof(value2, ++index, values)) != null && (min2 > value2 || min2 === void 0 && value2 >= value2)) {
        min2 = value2;
      }
    }
  }
  return min2;
}
__name(min, "min");

// ../../node_modules/.pnpm/d3-array@2.12.1/node_modules/d3-array/src/sum.js
function sum(values, valueof) {
  let sum2 = 0;
  if (valueof === void 0) {
    for (let value2 of values) {
      if (value2 = +value2) {
        sum2 += value2;
      }
    }
  } else {
    let index = -1;
    for (let value2 of values) {
      if (value2 = +valueof(value2, ++index, values)) {
        sum2 += value2;
      }
    }
  }
  return sum2;
}
__name(sum, "sum");

// ../../node_modules/.pnpm/d3-sankey@0.12.3/node_modules/d3-sankey/src/align.js
function targetDepth(d) {
  return d.target.depth;
}
__name(targetDepth, "targetDepth");
function left(node) {
  return node.depth;
}
__name(left, "left");
function right(node, n) {
  return n - 1 - node.height;
}
__name(right, "right");
function justify(node, n) {
  return node.sourceLinks.length ? node.depth : n - 1;
}
__name(justify, "justify");
function center(node) {
  return node.targetLinks.length ? node.depth : node.sourceLinks.length ? min(node.sourceLinks, targetDepth) - 1 : 0;
}
__name(center, "center");

// ../../node_modules/.pnpm/d3-sankey@0.12.3/node_modules/d3-sankey/src/constant.js
function constant(x2) {
  return function() {
    return x2;
  };
}
__name(constant, "constant");

// ../../node_modules/.pnpm/d3-sankey@0.12.3/node_modules/d3-sankey/src/sankey.js
function ascendingSourceBreadth(a, b) {
  return ascendingBreadth(a.source, b.source) || a.index - b.index;
}
__name(ascendingSourceBreadth, "ascendingSourceBreadth");
function ascendingTargetBreadth(a, b) {
  return ascendingBreadth(a.target, b.target) || a.index - b.index;
}
__name(ascendingTargetBreadth, "ascendingTargetBreadth");
function ascendingBreadth(a, b) {
  return a.y0 - b.y0;
}
__name(ascendingBreadth, "ascendingBreadth");
function value(d) {
  return d.value;
}
__name(value, "value");
function defaultId(d) {
  return d.index;
}
__name(defaultId, "defaultId");
function defaultNodes(graph) {
  return graph.nodes;
}
__name(defaultNodes, "defaultNodes");
function defaultLinks(graph) {
  return graph.links;
}
__name(defaultLinks, "defaultLinks");
function find(nodeById, id) {
  const node = nodeById.get(id);
  if (!node) throw new Error("missing: " + id);
  return node;
}
__name(find, "find");
function computeLinkBreadths({ nodes: nodes2 }) {
  for (const node of nodes2) {
    let y0 = node.y0;
    let y1 = y0;
    for (const link2 of node.sourceLinks) {
      link2.y0 = y0 + link2.width / 2;
      y0 += link2.width;
    }
    for (const link2 of node.targetLinks) {
      link2.y1 = y1 + link2.width / 2;
      y1 += link2.width;
    }
  }
}
__name(computeLinkBreadths, "computeLinkBreadths");
function Sankey() {
  let x0 = 0, y0 = 0, x1 = 1, y1 = 1;
  let dx = 24;
  let dy = 8, py;
  let id = defaultId;
  let align = justify;
  let sort;
  let linkSort;
  let nodes2 = defaultNodes;
  let links2 = defaultLinks;
  let iterations = 6;
  function sankey() {
    const graph = { nodes: nodes2.apply(null, arguments), links: links2.apply(null, arguments) };
    computeNodeLinks(graph);
    computeNodeValues(graph);
    computeNodeDepths(graph);
    computeNodeHeights(graph);
    computeNodeBreadths(graph);
    computeLinkBreadths(graph);
    return graph;
  }
  __name(sankey, "sankey");
  sankey.update = function(graph) {
    computeLinkBreadths(graph);
    return graph;
  };
  sankey.nodeId = function(_) {
    return arguments.length ? (id = typeof _ === "function" ? _ : constant(_), sankey) : id;
  };
  sankey.nodeAlign = function(_) {
    return arguments.length ? (align = typeof _ === "function" ? _ : constant(_), sankey) : align;
  };
  sankey.nodeSort = function(_) {
    return arguments.length ? (sort = _, sankey) : sort;
  };
  sankey.nodeWidth = function(_) {
    return arguments.length ? (dx = +_, sankey) : dx;
  };
  sankey.nodePadding = function(_) {
    return arguments.length ? (dy = py = +_, sankey) : dy;
  };
  sankey.nodes = function(_) {
    return arguments.length ? (nodes2 = typeof _ === "function" ? _ : constant(_), sankey) : nodes2;
  };
  sankey.links = function(_) {
    return arguments.length ? (links2 = typeof _ === "function" ? _ : constant(_), sankey) : links2;
  };
  sankey.linkSort = function(_) {
    return arguments.length ? (linkSort = _, sankey) : linkSort;
  };
  sankey.size = function(_) {
    return arguments.length ? (x0 = y0 = 0, x1 = +_[0], y1 = +_[1], sankey) : [x1 - x0, y1 - y0];
  };
  sankey.extent = function(_) {
    return arguments.length ? (x0 = +_[0][0], x1 = +_[1][0], y0 = +_[0][1], y1 = +_[1][1], sankey) : [[x0, y0], [x1, y1]];
  };
  sankey.iterations = function(_) {
    return arguments.length ? (iterations = +_, sankey) : iterations;
  };
  function computeNodeLinks({ nodes: nodes3, links: links3 }) {
    for (const [i, node] of nodes3.entries()) {
      node.index = i;
      node.sourceLinks = [];
      node.targetLinks = [];
    }
    const nodeById = new Map(nodes3.map((d, i) => [id(d, i, nodes3), d]));
    for (const [i, link2] of links3.entries()) {
      link2.index = i;
      let { source, target } = link2;
      if (typeof source !== "object") source = link2.source = find(nodeById, source);
      if (typeof target !== "object") target = link2.target = find(nodeById, target);
      source.sourceLinks.push(link2);
      target.targetLinks.push(link2);
    }
    if (linkSort != null) {
      for (const { sourceLinks, targetLinks } of nodes3) {
        sourceLinks.sort(linkSort);
        targetLinks.sort(linkSort);
      }
    }
  }
  __name(computeNodeLinks, "computeNodeLinks");
  function computeNodeValues({ nodes: nodes3 }) {
    for (const node of nodes3) {
      node.value = node.fixedValue === void 0 ? Math.max(sum(node.sourceLinks, value), sum(node.targetLinks, value)) : node.fixedValue;
    }
  }
  __name(computeNodeValues, "computeNodeValues");
  function computeNodeDepths({ nodes: nodes3 }) {
    const n = nodes3.length;
    let current = new Set(nodes3);
    let next = /* @__PURE__ */ new Set();
    let x2 = 0;
    while (current.size) {
      for (const node of current) {
        node.depth = x2;
        for (const { target } of node.sourceLinks) {
          next.add(target);
        }
      }
      if (++x2 > n) throw new Error("circular link");
      current = next;
      next = /* @__PURE__ */ new Set();
    }
  }
  __name(computeNodeDepths, "computeNodeDepths");
  function computeNodeHeights({ nodes: nodes3 }) {
    const n = nodes3.length;
    let current = new Set(nodes3);
    let next = /* @__PURE__ */ new Set();
    let x2 = 0;
    while (current.size) {
      for (const node of current) {
        node.height = x2;
        for (const { source } of node.targetLinks) {
          next.add(source);
        }
      }
      if (++x2 > n) throw new Error("circular link");
      current = next;
      next = /* @__PURE__ */ new Set();
    }
  }
  __name(computeNodeHeights, "computeNodeHeights");
  function computeNodeLayers({ nodes: nodes3 }) {
    const x2 = max(nodes3, (d) => d.depth) + 1;
    const kx = (x1 - x0 - dx) / (x2 - 1);
    const columns = new Array(x2);
    for (const node of nodes3) {
      const i = Math.max(0, Math.min(x2 - 1, Math.floor(align.call(null, node, x2))));
      node.layer = i;
      node.x0 = x0 + i * kx;
      node.x1 = node.x0 + dx;
      if (columns[i]) columns[i].push(node);
      else columns[i] = [node];
    }
    if (sort) for (const column of columns) {
      column.sort(sort);
    }
    return columns;
  }
  __name(computeNodeLayers, "computeNodeLayers");
  function initializeNodeBreadths(columns) {
    const ky = min(columns, (c) => (y1 - y0 - (c.length - 1) * py) / sum(c, value));
    for (const nodes3 of columns) {
      let y2 = y0;
      for (const node of nodes3) {
        node.y0 = y2;
        node.y1 = y2 + node.value * ky;
        y2 = node.y1 + py;
        for (const link2 of node.sourceLinks) {
          link2.width = link2.value * ky;
        }
      }
      y2 = (y1 - y2 + py) / (nodes3.length + 1);
      for (let i = 0; i < nodes3.length; ++i) {
        const node = nodes3[i];
        node.y0 += y2 * (i + 1);
        node.y1 += y2 * (i + 1);
      }
      reorderLinks(nodes3);
    }
  }
  __name(initializeNodeBreadths, "initializeNodeBreadths");
  function computeNodeBreadths(graph) {
    const columns = computeNodeLayers(graph);
    py = Math.min(dy, (y1 - y0) / (max(columns, (c) => c.length) - 1));
    initializeNodeBreadths(columns);
    for (let i = 0; i < iterations; ++i) {
      const alpha = Math.pow(0.99, i);
      const beta = Math.max(1 - alpha, (i + 1) / iterations);
      relaxRightToLeft(columns, alpha, beta);
      relaxLeftToRight(columns, alpha, beta);
    }
  }
  __name(computeNodeBreadths, "computeNodeBreadths");
  function relaxLeftToRight(columns, alpha, beta) {
    for (let i = 1, n = columns.length; i < n; ++i) {
      const column = columns[i];
      for (const target of column) {
        let y2 = 0;
        let w = 0;
        for (const { source, value: value2 } of target.targetLinks) {
          let v = value2 * (target.layer - source.layer);
          y2 += targetTop(source, target) * v;
          w += v;
        }
        if (!(w > 0)) continue;
        let dy2 = (y2 / w - target.y0) * alpha;
        target.y0 += dy2;
        target.y1 += dy2;
        reorderNodeLinks(target);
      }
      if (sort === void 0) column.sort(ascendingBreadth);
      resolveCollisions(column, beta);
    }
  }
  __name(relaxLeftToRight, "relaxLeftToRight");
  function relaxRightToLeft(columns, alpha, beta) {
    for (let n = columns.length, i = n - 2; i >= 0; --i) {
      const column = columns[i];
      for (const source of column) {
        let y2 = 0;
        let w = 0;
        for (const { target, value: value2 } of source.sourceLinks) {
          let v = value2 * (target.layer - source.layer);
          y2 += sourceTop(source, target) * v;
          w += v;
        }
        if (!(w > 0)) continue;
        let dy2 = (y2 / w - source.y0) * alpha;
        source.y0 += dy2;
        source.y1 += dy2;
        reorderNodeLinks(source);
      }
      if (sort === void 0) column.sort(ascendingBreadth);
      resolveCollisions(column, beta);
    }
  }
  __name(relaxRightToLeft, "relaxRightToLeft");
  function resolveCollisions(nodes3, alpha) {
    const i = nodes3.length >> 1;
    const subject = nodes3[i];
    resolveCollisionsBottomToTop(nodes3, subject.y0 - py, i - 1, alpha);
    resolveCollisionsTopToBottom(nodes3, subject.y1 + py, i + 1, alpha);
    resolveCollisionsBottomToTop(nodes3, y1, nodes3.length - 1, alpha);
    resolveCollisionsTopToBottom(nodes3, y0, 0, alpha);
  }
  __name(resolveCollisions, "resolveCollisions");
  function resolveCollisionsTopToBottom(nodes3, y2, i, alpha) {
    for (; i < nodes3.length; ++i) {
      const node = nodes3[i];
      const dy2 = (y2 - node.y0) * alpha;
      if (dy2 > 1e-6) node.y0 += dy2, node.y1 += dy2;
      y2 = node.y1 + py;
    }
  }
  __name(resolveCollisionsTopToBottom, "resolveCollisionsTopToBottom");
  function resolveCollisionsBottomToTop(nodes3, y2, i, alpha) {
    for (; i >= 0; --i) {
      const node = nodes3[i];
      const dy2 = (node.y1 - y2) * alpha;
      if (dy2 > 1e-6) node.y0 -= dy2, node.y1 -= dy2;
      y2 = node.y0 - py;
    }
  }
  __name(resolveCollisionsBottomToTop, "resolveCollisionsBottomToTop");
  function reorderNodeLinks({ sourceLinks, targetLinks }) {
    if (linkSort === void 0) {
      for (const { source: { sourceLinks: sourceLinks2 } } of targetLinks) {
        sourceLinks2.sort(ascendingTargetBreadth);
      }
      for (const { target: { targetLinks: targetLinks2 } } of sourceLinks) {
        targetLinks2.sort(ascendingSourceBreadth);
      }
    }
  }
  __name(reorderNodeLinks, "reorderNodeLinks");
  function reorderLinks(nodes3) {
    if (linkSort === void 0) {
      for (const { sourceLinks, targetLinks } of nodes3) {
        sourceLinks.sort(ascendingTargetBreadth);
        targetLinks.sort(ascendingSourceBreadth);
      }
    }
  }
  __name(reorderLinks, "reorderLinks");
  function targetTop(source, target) {
    let y2 = source.y0 - (source.sourceLinks.length - 1) * py / 2;
    for (const { target: node, width } of source.sourceLinks) {
      if (node === target) break;
      y2 += width + py;
    }
    for (const { source: node, width } of target.targetLinks) {
      if (node === source) break;
      y2 -= width;
    }
    return y2;
  }
  __name(targetTop, "targetTop");
  function sourceTop(source, target) {
    let y2 = target.y0 - (target.targetLinks.length - 1) * py / 2;
    for (const { source: node, width } of target.targetLinks) {
      if (node === source) break;
      y2 += width + py;
    }
    for (const { target: node, width } of source.sourceLinks) {
      if (node === target) break;
      y2 -= width;
    }
    return y2;
  }
  __name(sourceTop, "sourceTop");
  return sankey;
}
__name(Sankey, "Sankey");

// ../../node_modules/.pnpm/d3-path@1.0.9/node_modules/d3-path/src/path.js
var pi = Math.PI;
var tau = 2 * pi;
var epsilon = 1e-6;
var tauEpsilon = tau - epsilon;
function Path() {
  this._x0 = this._y0 = // start of current subpath
  this._x1 = this._y1 = null;
  this._ = "";
}
__name(Path, "Path");
function path() {
  return new Path();
}
__name(path, "path");
Path.prototype = path.prototype = {
  constructor: Path,
  moveTo: /* @__PURE__ */ __name(function(x2, y2) {
    this._ += "M" + (this._x0 = this._x1 = +x2) + "," + (this._y0 = this._y1 = +y2);
  }, "moveTo"),
  closePath: /* @__PURE__ */ __name(function() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._ += "Z";
    }
  }, "closePath"),
  lineTo: /* @__PURE__ */ __name(function(x2, y2) {
    this._ += "L" + (this._x1 = +x2) + "," + (this._y1 = +y2);
  }, "lineTo"),
  quadraticCurveTo: /* @__PURE__ */ __name(function(x1, y1, x2, y2) {
    this._ += "Q" + +x1 + "," + +y1 + "," + (this._x1 = +x2) + "," + (this._y1 = +y2);
  }, "quadraticCurveTo"),
  bezierCurveTo: /* @__PURE__ */ __name(function(x1, y1, x2, y2, x3, y3) {
    this._ += "C" + +x1 + "," + +y1 + "," + +x2 + "," + +y2 + "," + (this._x1 = +x3) + "," + (this._y1 = +y3);
  }, "bezierCurveTo"),
  arcTo: /* @__PURE__ */ __name(function(x1, y1, x2, y2, r) {
    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
    var x0 = this._x1, y0 = this._y1, x21 = x2 - x1, y21 = y2 - y1, x01 = x0 - x1, y01 = y0 - y1, l01_2 = x01 * x01 + y01 * y01;
    if (r < 0) throw new Error("negative radius: " + r);
    if (this._x1 === null) {
      this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
    } else if (!(l01_2 > epsilon)) ;
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
      this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
    } else {
      var x20 = x2 - x0, y20 = y2 - y0, l21_2 = x21 * x21 + y21 * y21, l20_2 = x20 * x20 + y20 * y20, l21 = Math.sqrt(l21_2), l01 = Math.sqrt(l01_2), l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2), t01 = l / l01, t21 = l / l21;
      if (Math.abs(t01 - 1) > epsilon) {
        this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
      }
      this._ += "A" + r + "," + r + ",0,0," + +(y01 * x20 > x01 * y20) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
    }
  }, "arcTo"),
  arc: /* @__PURE__ */ __name(function(x2, y2, r, a0, a1, ccw) {
    x2 = +x2, y2 = +y2, r = +r, ccw = !!ccw;
    var dx = r * Math.cos(a0), dy = r * Math.sin(a0), x0 = x2 + dx, y0 = y2 + dy, cw = 1 ^ ccw, da = ccw ? a0 - a1 : a1 - a0;
    if (r < 0) throw new Error("negative radius: " + r);
    if (this._x1 === null) {
      this._ += "M" + x0 + "," + y0;
    } else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
      this._ += "L" + x0 + "," + y0;
    }
    if (!r) return;
    if (da < 0) da = da % tau + tau;
    if (da > tauEpsilon) {
      this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x2 - dx) + "," + (y2 - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
    } else if (da > epsilon) {
      this._ += "A" + r + "," + r + ",0," + +(da >= pi) + "," + cw + "," + (this._x1 = x2 + r * Math.cos(a1)) + "," + (this._y1 = y2 + r * Math.sin(a1));
    }
  }, "arc"),
  rect: /* @__PURE__ */ __name(function(x2, y2, w, h) {
    this._ += "M" + (this._x0 = this._x1 = +x2) + "," + (this._y0 = this._y1 = +y2) + "h" + +w + "v" + +h + "h" + -w + "Z";
  }, "rect"),
  toString: /* @__PURE__ */ __name(function() {
    return this._;
  }, "toString")
};
var path_default = path;

// ../../node_modules/.pnpm/d3-shape@1.3.7/node_modules/d3-shape/src/constant.js
function constant_default(x2) {
  return /* @__PURE__ */ __name(function constant2() {
    return x2;
  }, "constant");
}
__name(constant_default, "default");

// ../../node_modules/.pnpm/d3-shape@1.3.7/node_modules/d3-shape/src/point.js
function x(p) {
  return p[0];
}
__name(x, "x");
function y(p) {
  return p[1];
}
__name(y, "y");

// ../../node_modules/.pnpm/d3-shape@1.3.7/node_modules/d3-shape/src/array.js
var slice = Array.prototype.slice;

// ../../node_modules/.pnpm/d3-shape@1.3.7/node_modules/d3-shape/src/link/index.js
function linkSource(d) {
  return d.source;
}
__name(linkSource, "linkSource");
function linkTarget(d) {
  return d.target;
}
__name(linkTarget, "linkTarget");
function link(curve) {
  var source = linkSource, target = linkTarget, x2 = x, y2 = y, context = null;
  function link2() {
    var buffer, argv = slice.call(arguments), s = source.apply(this, argv), t = target.apply(this, argv);
    if (!context) context = buffer = path_default();
    curve(context, +x2.apply(this, (argv[0] = s, argv)), +y2.apply(this, argv), +x2.apply(this, (argv[0] = t, argv)), +y2.apply(this, argv));
    if (buffer) return context = null, buffer + "" || null;
  }
  __name(link2, "link");
  link2.source = function(_) {
    return arguments.length ? (source = _, link2) : source;
  };
  link2.target = function(_) {
    return arguments.length ? (target = _, link2) : target;
  };
  link2.x = function(_) {
    return arguments.length ? (x2 = typeof _ === "function" ? _ : constant_default(+_), link2) : x2;
  };
  link2.y = function(_) {
    return arguments.length ? (y2 = typeof _ === "function" ? _ : constant_default(+_), link2) : y2;
  };
  link2.context = function(_) {
    return arguments.length ? (context = _ == null ? null : _, link2) : context;
  };
  return link2;
}
__name(link, "link");
function curveHorizontal(context, x0, y0, x1, y1) {
  context.moveTo(x0, y0);
  context.bezierCurveTo(x0 = (x0 + x1) / 2, y0, x0, y1, x1, y1);
}
__name(curveHorizontal, "curveHorizontal");
function linkHorizontal() {
  return link(curveHorizontal);
}
__name(linkHorizontal, "linkHorizontal");

// ../../node_modules/.pnpm/d3-sankey@0.12.3/node_modules/d3-sankey/src/sankeyLinkHorizontal.js
function horizontalSource(d) {
  return [d.source.x1, d.y0];
}
__name(horizontalSource, "horizontalSource");
function horizontalTarget(d) {
  return [d.target.x0, d.y1];
}
__name(horizontalTarget, "horizontalTarget");
function sankeyLinkHorizontal_default() {
  return linkHorizontal().source(horizontalSource).target(horizontalTarget);
}
__name(sankeyLinkHorizontal_default, "default");

// src/rendering-util/uid.ts
var Uid = class _Uid {
  static {
    __name(this, "Uid");
  }
  static {
    this.count = 0;
  }
  static next(name) {
    return new _Uid(name + ++_Uid.count);
  }
  constructor(id) {
    this.id = id;
    this.href = `#${id}`;
  }
  toString() {
    return "url(" + this.href + ")";
  }
};

// src/diagrams/sankey/sankeyRenderer.ts
var alignmentsMap = {
  left,
  right,
  center,
  justify
};
var draw = /* @__PURE__ */ __name(function(text, id, _version, diagObj) {
  const { securityLevel, sankey: conf } = getConfig();
  const defaultSankeyConfig = defaultConfig.sankey;
  let sandboxElement;
  if (securityLevel === "sandbox") {
    sandboxElement = select_default("#i" + id);
  }
  const root = securityLevel === "sandbox" ? select_default(sandboxElement.nodes()[0].contentDocument.body) : select_default("body");
  const svg = securityLevel === "sandbox" ? root.select(`[id="${id}"]`) : select_default(`[id="${id}"]`);
  const width = conf?.width ?? defaultSankeyConfig.width;
  const height = conf?.height ?? defaultSankeyConfig.width;
  const useMaxWidth = conf?.useMaxWidth ?? defaultSankeyConfig.useMaxWidth;
  const nodeAlignment = conf?.nodeAlignment ?? defaultSankeyConfig.nodeAlignment;
  const prefix = conf?.prefix ?? defaultSankeyConfig.prefix;
  const suffix = conf?.suffix ?? defaultSankeyConfig.suffix;
  const showValues = conf?.showValues ?? defaultSankeyConfig.showValues;
  const graph = diagObj.db.getGraph();
  const nodeAlign = alignmentsMap[nodeAlignment];
  const nodeWidth = 10;
  const sankey = Sankey().nodeId((d) => d.id).nodeWidth(nodeWidth).nodePadding(10 + (showValues ? 15 : 0)).nodeAlign(nodeAlign).extent([
    [0, 0],
    [width, height]
  ]);
  sankey(graph);
  const colorScheme = ordinal(Tableau10_default);
  svg.append("g").attr("class", "nodes").selectAll(".node").data(graph.nodes).join("g").attr("class", "node").attr("id", (d) => (d.uid = Uid.next("node-")).id).attr("transform", function(d) {
    return "translate(" + d.x0 + "," + d.y0 + ")";
  }).attr("x", (d) => d.x0).attr("y", (d) => d.y0).append("rect").attr("height", (d) => {
    return d.y1 - d.y0;
  }).attr("width", (d) => d.x1 - d.x0).attr("fill", (d) => colorScheme(d.id));
  const getText = /* @__PURE__ */ __name(({ id: id2, value: value2 }) => {
    if (!showValues) {
      return id2;
    }
    return `${id2}
${prefix}${Math.round(value2 * 100) / 100}${suffix}`;
  }, "getText");
  svg.append("g").attr("class", "node-labels").attr("font-size", 14).selectAll("text").data(graph.nodes).join("text").attr("x", (d) => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6).attr("y", (d) => (d.y1 + d.y0) / 2).attr("dy", `${showValues ? "0" : "0.35"}em`).attr("text-anchor", (d) => d.x0 < width / 2 ? "start" : "end").text(getText);
  const link2 = svg.append("g").attr("class", "links").attr("fill", "none").attr("stroke-opacity", 0.5).selectAll(".link").data(graph.links).join("g").attr("class", "link").style("mix-blend-mode", "multiply");
  const linkColor = conf?.linkColor ?? "gradient";
  if (linkColor === "gradient") {
    const gradient = link2.append("linearGradient").attr("id", (d) => (d.uid = Uid.next("linearGradient-")).id).attr("gradientUnits", "userSpaceOnUse").attr("x1", (d) => d.source.x1).attr("x2", (d) => d.target.x0);
    gradient.append("stop").attr("offset", "0%").attr("stop-color", (d) => colorScheme(d.source.id));
    gradient.append("stop").attr("offset", "100%").attr("stop-color", (d) => colorScheme(d.target.id));
  }
  let coloring;
  switch (linkColor) {
    case "gradient":
      coloring = /* @__PURE__ */ __name((d) => d.uid, "coloring");
      break;
    case "source":
      coloring = /* @__PURE__ */ __name((d) => colorScheme(d.source.id), "coloring");
      break;
    case "target":
      coloring = /* @__PURE__ */ __name((d) => colorScheme(d.target.id), "coloring");
      break;
    default:
      coloring = linkColor;
  }
  link2.append("path").attr("d", sankeyLinkHorizontal_default()).attr("stroke", coloring).attr("stroke-width", (d) => Math.max(1, d.width));
  setupGraphViewbox(void 0, svg, 0, useMaxWidth);
}, "draw");
var sankeyRenderer_default = {
  draw
};

// src/diagrams/sankey/sankeyUtils.ts
var prepareTextForParsing = /* @__PURE__ */ __name((text) => {
  const textToParse = text.replaceAll(/^[^\S\n\r]+|[^\S\n\r]+$/g, "").replaceAll(/([\n\r])+/g, "\n").trim();
  return textToParse;
}, "prepareTextForParsing");

// src/diagrams/sankey/styles.js
var getStyles = /* @__PURE__ */ __name((options) => `.label {
      font-family: ${options.fontFamily};
    }`, "getStyles");
var styles_default = getStyles;

// src/diagrams/sankey/sankeyDiagram.ts
var originalParse = sankey_default.parse.bind(sankey_default);
sankey_default.parse = (text) => originalParse(prepareTextForParsing(text));
var diagram = {
  styles: styles_default,
  parser: sankey_default,
  db: sankeyDB_default,
  renderer: sankeyRenderer_default
};
export {
  diagram
};
