/* eslint-disable */

/*!
 * json-schema-faker library v0.5.0-rc15
 * http://json-schema-faker.js.org
 *
 * Copyright (c) 2014-2018 Alvaro Cabrera & Tomasz Ducin
 * Released under the MIT license
 *
 * Date: 2018-04-09 17:23:23.954Z
 */

var _ = require('lodash'),
  validateSchema = require('../lib/ajValidation/ajvValidation').validateSchema,
  {
    handleExclusiveMaximum,
    handleExclusiveMinimum
  } = require('./../lib/common/schemaUtilsCommon'),
  hash = require('object-hash');

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.JSONSchemaFaker = factory());
}(this, (function () { 'use strict';

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0

  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.

  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** */
  /* global Reflect, Promise */

  var extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

  function __extends(d, b) {
      extendStatics(d, b);
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  }

  var __assign = Object.assign || function __assign(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
      return t;
  };

  function __rest(s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
          t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
          for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
              t[p[i]] = s[p[i]];
      return t;
  }

  function __decorate(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
  }

  function __param(paramIndex, decorator) {
      return function (target, key) { decorator(target, key, paramIndex); }
  }

  function __metadata(metadataKey, metadataValue) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
  }

  function __awaiter(thisArg, _arguments, P, generator) {
      return new (P || (P = Promise))(function (resolve, reject) {
          function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
          function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
          function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
  }

  function __generator(thisArg, body) {
      var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
      return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
      function verb(n) { return function (v) { return step([n, v]); }; }
      function step(op) {
          if (f) throw new TypeError("Generator is already executing.");
          while (_) try {
              if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
              if (y = 0, t) op = [0, t.value];
              switch (op[0]) {
                  case 0: case 1: t = op; break;
                  case 4: _.label++; return { value: op[1], done: false };
                  case 5: _.label++; y = op[1]; op = [0]; continue;
                  case 7: op = _.ops.pop(); _.trys.pop(); continue;
                  default:
                      if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                      if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                      if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                      if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                      if (t[2]) _.ops.pop();
                      _.trys.pop(); continue;
              }
              op = body.call(thisArg, _);
          } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
          if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
      }
  }

  function __exportStar(m, exports) {
      for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
  }

  function __values(o) {
      var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
      if (m) return m.call(o);
      return {
          next: function () {
              if (o && i >= o.length) o = void 0;
              return { value: o && o[i++], done: !o };
          }
      };
  }

  function __read(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
          while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      }
      catch (error) { e = { error: error }; }
      finally {
          try {
              if (r && !r.done && (m = i["return"])) m.call(i);
          }
          finally { if (e) throw e.error; }
      }
      return ar;
  }

  function __spread() {
      for (var ar = [], i = 0; i < arguments.length; i++)
          ar = ar.concat(__read(arguments[i]));
      return ar;
  }

  function __await(v) {
      return this instanceof __await ? (this.v = v, this) : new __await(v);
  }

  function __asyncGenerator(thisArg, _arguments, generator) {
      if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
      var g = generator.apply(thisArg, _arguments || []), i, q = [];
      return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
      function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
      function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
      function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);  }
      function fulfill(value) { resume("next", value); }
      function reject(value) { resume("throw", value); }
      function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
  }

  function __asyncDelegator(o) {
      var i, p;
      return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
      function verb(n, f) { if (o[n]) i[n] = function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; }; }
  }

  function __asyncValues(o) {
      if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
      var m = o[Symbol.asyncIterator];
      return m ? m.call(o) : typeof __values === "function" ? __values(o) : o[Symbol.iterator]();
  }

  function __makeTemplateObject(cooked, raw) {
      if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
      return cooked;
  }

  var tslib_es6 = /*#__PURE__*/Object.freeze({
      __extends: __extends,
      __assign: __assign,
      __rest: __rest,
      __decorate: __decorate,
      __param: __param,
      __metadata: __metadata,
      __awaiter: __awaiter,
      __generator: __generator,
      __exportStar: __exportStar,
      __values: __values,
      __read: __read,
      __spread: __spread,
      __await: __await,
      __asyncGenerator: __asyncGenerator,
      __asyncDelegator: __asyncDelegator,
      __asyncValues: __asyncValues,
      __makeTemplateObject: __makeTemplateObject
  });

  var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function commonjsRequire () {
    throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
  }

  function createCommonjsModule(fn, module) {
    return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var types = {
    ROOT       : 0,
    GROUP      : 1,
    POSITION   : 2,
    SET        : 3,
    RANGE      : 4,
    REPETITION : 5,
    REFERENCE  : 6,
    CHAR       : 7,
  };

  var INTS = function() {
   return [{ type: types.RANGE , from: 48, to: 57 }];
  };

  var WORDS = function() {
   return [
      { type: types.CHAR, value: 95 },
      { type: types.RANGE, from: 97, to: 122 },
      { type: types.RANGE, from: 65, to: 90 }
    ].concat(INTS());
  };

  var WHITESPACE = function() {
   return [
      { type: types.CHAR, value: 9 },
      { type: types.CHAR, value: 10 },
      { type: types.CHAR, value: 11 },
      { type: types.CHAR, value: 12 },
      { type: types.CHAR, value: 13 },
      { type: types.CHAR, value: 32 },
      { type: types.CHAR, value: 160 },
      { type: types.CHAR, value: 5760 },
      { type: types.CHAR, value: 6158 },
      { type: types.CHAR, value: 8192 },
      { type: types.CHAR, value: 8193 },
      { type: types.CHAR, value: 8194 },
      { type: types.CHAR, value: 8195 },
      { type: types.CHAR, value: 8196 },
      { type: types.CHAR, value: 8197 },
      { type: types.CHAR, value: 8198 },
      { type: types.CHAR, value: 8199 },
      { type: types.CHAR, value: 8200 },
      { type: types.CHAR, value: 8201 },
      { type: types.CHAR, value: 8202 },
      { type: types.CHAR, value: 8232 },
      { type: types.CHAR, value: 8233 },
      { type: types.CHAR, value: 8239 },
      { type: types.CHAR, value: 8287 },
      { type: types.CHAR, value: 12288 },
      { type: types.CHAR, value: 65279 }
    ];
  };

  var NOTANYCHAR = function() {
    return [
      { type: types.CHAR, value: 10 },
      { type: types.CHAR, value: 13 },
      { type: types.CHAR, value: 8232 },
      { type: types.CHAR, value: 8233 },
    ];
  };

  // Predefined class objects.
  var words = function() {
    return { type: types.SET, set: WORDS(), not: false };
  };

  var notWords = function() {
    return { type: types.SET, set: WORDS(), not: true };
  };

  var ints = function() {
    return { type: types.SET, set: INTS(), not: false };
  };

  var notInts = function() {
    return { type: types.SET, set: INTS(), not: true };
  };

  var whitespace = function() {
    return { type: types.SET, set: WHITESPACE(), not: false };
  };

  var notWhitespace = function() {
    return { type: types.SET, set: WHITESPACE(), not: true };
  };

  var anyChar = function() {
    return { type: types.SET, set: NOTANYCHAR(), not: true };
  };

  var sets = {
    words: words,
    notWords: notWords,
    ints: ints,
    notInts: notInts,
    whitespace: whitespace,
    notWhitespace: notWhitespace,
    anyChar: anyChar
  };

  var util = createCommonjsModule(function (module, exports) {
  // All of these are private and only used by randexp.
  // It's assumed that they will always be called with the correct input.

  var CTRL = '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^ ?';
  var SLSH = { '0': 0, 't': 9, 'n': 10, 'v': 11, 'f': 12, 'r': 13 };

  /**
   * Finds character representations in str and convert all to
   * their respective characters
   *
   * @param {String} str
   * @return {String}
   */
  exports.strToChars = function(str) {
    /* jshint maxlen: false */
    var chars_regex = /(\[\\b\])|(\\)?\\(?:u([A-F0-9]{4})|x([A-F0-9]{2})|(0?[0-7]{2})|c([@A-Z\[\\\]\^?])|([0tnvfr]))/g;
    str = str.replace(chars_regex, function(s, b, lbs, a16, b16, c8, dctrl, eslsh) {
      if (lbs) {
        return s;
      }

      var code = b     ? 8 :
                 a16   ? parseInt(a16, 16) :
                 b16   ? parseInt(b16, 16) :
                 c8    ? parseInt(c8,   8) :
                 dctrl ? CTRL.indexOf(dctrl) :
                 SLSH[eslsh];

      var c = String.fromCharCode(code);

      // Escape special regex characters.
      if (/[\[\]{}\^$.|?*+()]/.test(c)) {
        c = '\\' + c;
      }

      return c;
    });

    return str;
  };


  /**
   * turns class into tokens
   * reads str until it encounters a ] not preceeded by a \
   *
   * @param {String} str
   * @param {String} regexpStr
   * @return {Array.<Array.<Object>, Number>}
   */
  exports.tokenizeClass = function(str, regexpStr) {
    /* jshint maxlen: false */
    var tokens = [];
    var regexp = /\\(?:(w)|(d)|(s)|(W)|(D)|(S))|((?:(?:\\)(.)|([^\]\\]))-(?:\\)?([^\]]))|(\])|(?:\\)?(.)/g;
    var rs, c;


    while ((rs = regexp.exec(str)) != null) {
      if (rs[1]) {
        tokens.push(sets.words());

      } else if (rs[2]) {
        tokens.push(sets.ints());

      } else if (rs[3]) {
        tokens.push(sets.whitespace());

      } else if (rs[4]) {
        tokens.push(sets.notWords());

      } else if (rs[5]) {
        tokens.push(sets.notInts());

      } else if (rs[6]) {
        tokens.push(sets.notWhitespace());

      } else if (rs[7]) {
        tokens.push({
          type: types.RANGE,
          from: (rs[8] || rs[9]).charCodeAt(0),
            to: rs[10].charCodeAt(0),
        });

      } else if (c = rs[12]) {
        tokens.push({
          type: types.CHAR,
          value: c.charCodeAt(0),
        });

      } else {
        return [tokens, regexp.lastIndex];
      }
    }

    exports.error(regexpStr, 'Unterminated character class');
  };


  /**
   * Shortcut to throw errors.
   *
   * @param {String} regexp
   * @param {String} msg
   */
  exports.error = function(regexp, msg) {
    throw new SyntaxError('Invalid regular expression: /' + regexp + '/: ' + msg);
  };
  });
  var util_1 = util.strToChars;
  var util_2 = util.tokenizeClass;
  var util_3 = util.error;

  var wordBoundary = function() {
    return { type: types.POSITION, value: 'b' };
  };

  var nonWordBoundary = function() {
    return { type: types.POSITION, value: 'B' };
  };

  var begin = function() {
    return { type: types.POSITION, value: '^' };
  };

  var end = function() {
    return { type: types.POSITION, value: '$' };
  };

  var positions = {
    wordBoundary: wordBoundary,
    nonWordBoundary: nonWordBoundary,
    begin: begin,
    end: end
  };

  var lib = function(regexpStr) {
    var i = 0, l, c,
        start = { type: types.ROOT, stack: []},

        // Keep track of last clause/group and stack.
        lastGroup = start,
        last = start.stack,
        groupStack = [];


    var repeatErr = function(i) {
      util.error(regexpStr, 'Nothing to repeat at column ' + (i - 1));
    };

    // Decode a few escaped characters.
    var str = util.strToChars(regexpStr);
    l = str.length;

    // Iterate through each character in string.
    while (i < l) {
      c = str[i++];

      switch (c) {
        // Handle escaped characters, inclues a few sets.
        case '\\':
          c = str[i++];

          switch (c) {
            case 'b':
              last.push(positions.wordBoundary());
              break;

            case 'B':
              last.push(positions.nonWordBoundary());
              break;

            case 'w':
              last.push(sets.words());
              break;

            case 'W':
              last.push(sets.notWords());
              break;

            case 'd':
              last.push(sets.ints());
              break;

            case 'D':
              last.push(sets.notInts());
              break;

            case 's':
              last.push(sets.whitespace());
              break;

            case 'S':
              last.push(sets.notWhitespace());
              break;

            default:
              // Check if c is integer.
              // In which case it's a reference.
              if (/\d/.test(c)) {
                last.push({ type: types.REFERENCE, value: parseInt(c, 10) });

              // Escaped character.
              } else {
                last.push({ type: types.CHAR, value: c.charCodeAt(0) });
              }
          }

          break;


        // Positionals.
        case '^':
            last.push(positions.begin());
          break;

        case '$':
            last.push(positions.end());
          break;


        // Handle custom sets.
        case '[':
          // Check if this class is 'anti' i.e. [^abc].
          var not;
          if (str[i] === '^') {
            not = true;
            i++;
          } else {
            not = false;
          }

          // Get all the characters in class.
          var classTokens = util.tokenizeClass(str.slice(i), regexpStr);

          // Increase index by length of class.
          i += classTokens[1];
          last.push({
            type: types.SET,
            set: classTokens[0],
            not: not,
          });

          break;


        // Class of any character except \n.
        case '.':
          last.push(sets.anyChar());
          break;


        // Push group onto stack.
        case '(':
          // Create group.
          var group = {
            type: types.GROUP,
            stack: [],
            remember: true,
          };

          c = str[i];

          // If if this is a special kind of group.
          if (c === '?') {
            c = str[i + 1];
            i += 2;

            // Match if followed by.
            if (c === '=') {
              group.followedBy = true;

            // Match if not followed by.
            } else if (c === '!') {
              group.notFollowedBy = true;

            } else if (c !== ':') {
              util.error(regexpStr,
                'Invalid group, character \'' + c +
                '\' after \'?\' at column ' + (i - 1));
            }

            group.remember = false;
          }

          // Insert subgroup into current group stack.
          last.push(group);

          // Remember the current group for when the group closes.
          groupStack.push(lastGroup);

          // Make this new group the current group.
          lastGroup = group;
          last = group.stack;
          break;


        // Pop group out of stack.
        case ')':
          if (groupStack.length === 0) {
            util.error(regexpStr, 'Unmatched ) at column ' + (i - 1));
          }
          lastGroup = groupStack.pop();

          // Check if this group has a PIPE.
          // To get back the correct last stack.
          last = lastGroup.options ?
            lastGroup.options[lastGroup.options.length - 1] : lastGroup.stack;
          break;


        // Use pipe character to give more choices.
        case '|':
          // Create array where options are if this is the first PIPE
          // in this clause.
          if (!lastGroup.options) {
            lastGroup.options = [lastGroup.stack];
            delete lastGroup.stack;
          }

          // Create a new stack and add to options for rest of clause.
          var stack = [];
          lastGroup.options.push(stack);
          last = stack;
          break;


        // Repetition.
        // For every repetition, remove last element from last stack
        // then insert back a RANGE object.
        // This design is chosen because there could be more than
        // one repetition symbols in a regex i.e. `a?+{2,3}`.
        case '{':
          var rs = /^(\d+)(,(\d+)?)?\}/.exec(str.slice(i)), min, max;
          if (rs !== null) {
            if (last.length === 0) {
              repeatErr(i);
            }
            min = parseInt(rs[1], 10);
            max = rs[2] ? rs[3] ? parseInt(rs[3], 10) : Infinity : min;
            i += rs[0].length;

            last.push({
              type: types.REPETITION,
              min: min,
              max: max,
              value: last.pop(),
            });
          } else {
            last.push({
              type: types.CHAR,
              value: 123,
            });
          }
          break;

        case '?':
          if (last.length === 0) {
            repeatErr(i);
          }
          last.push({
            type: types.REPETITION,
            min: 0,
            max: 1,
            value: last.pop(),
          });
          break;

        case '+':
          if (last.length === 0) {
            repeatErr(i);
          }
          last.push({
            type: types.REPETITION,
            min: 1,
            max: Infinity,
            value: last.pop(),
          });
          break;

        case '*':
          if (last.length === 0) {
            repeatErr(i);
          }
          last.push({
            type: types.REPETITION,
            min: 0,
            max: Infinity,
            value: last.pop(),
          });
          break;


        // Default is a character that is not `\[](){}?+*^$`.
        default:
          last.push({
            type: types.CHAR,
            value: c.charCodeAt(0),
          });
      }

    }

    // Check if any groups have not been closed.
    if (groupStack.length !== 0) {
      util.error(regexpStr, 'Unterminated group');
    }

    return start;
  };

  var types_1$1 = types;
  lib.types = types_1$1;

  //protected helper class
  function _SubRange(low, high) {
      this.low = low;
      this.high = high;
      this.length = 1 + high - low;
  }

  _SubRange.prototype.overlaps = function (range) {
      return !(this.high < range.low || this.low > range.high);
  };

  _SubRange.prototype.touches = function (range) {
      return !(this.high + 1 < range.low || this.low - 1 > range.high);
  };

  //returns inclusive combination of _SubRanges as a _SubRange
  _SubRange.prototype.add = function (range) {
      return this.touches(range) && new _SubRange(Math.min(this.low, range.low), Math.max(this.high, range.high));
  };

  //returns subtraction of _SubRanges as an array of _SubRanges (there's a case where subtraction divides it in 2)
  _SubRange.prototype.subtract = function (range) {
      if (!this.overlaps(range)) return false;
      if (range.low <= this.low && range.high >= this.high) return [];
      if (range.low > this.low && range.high < this.high) return [new _SubRange(this.low, range.low - 1), new _SubRange(range.high + 1, this.high)];
      if (range.low <= this.low) return [new _SubRange(range.high + 1, this.high)];
      return [new _SubRange(this.low, range.low - 1)];
  };

  _SubRange.prototype.toString = function () {
      if (this.low == this.high) return this.low.toString();
      return this.low + '-' + this.high;
  };

  _SubRange.prototype.clone = function () {
      return new _SubRange(this.low, this.high);
  };




  function DiscontinuousRange(a, b) {
      if (this instanceof DiscontinuousRange) {
          this.ranges = [];
          this.length = 0;
          if (a !== undefined) this.add(a, b);
      } else {
          return new DiscontinuousRange(a, b);
      }
  }

  function _update_length(self) {
      self.length = self.ranges.reduce(function (previous, range) {return previous + range.length}, 0);
  }

  DiscontinuousRange.prototype.add = function (a, b) {
      var self = this;
      function _add(subrange) {
          var new_ranges = [];
          var i = 0;
          while (i < self.ranges.length && !subrange.touches(self.ranges[i])) {
              new_ranges.push(self.ranges[i].clone());
              i++;
          }
          while (i < self.ranges.length && subrange.touches(self.ranges[i])) {
              subrange = subrange.add(self.ranges[i]);
              i++;
          }
          new_ranges.push(subrange);
          while (i < self.ranges.length) {
              new_ranges.push(self.ranges[i].clone());
              i++;
          }
          self.ranges = new_ranges;
          _update_length(self);
      }

      if (a instanceof DiscontinuousRange) {
          a.ranges.forEach(_add);
      } else {
          if (a instanceof _SubRange) {
              _add(a);
          } else {
              if (b === undefined) b = a;
              _add(new _SubRange(a, b));
          }
      }
      return this;
  };

  DiscontinuousRange.prototype.subtract = function (a, b) {
      var self = this;
      function _subtract(subrange) {
          var new_ranges = [];
          var i = 0;
          while (i < self.ranges.length && !subrange.overlaps(self.ranges[i])) {
              new_ranges.push(self.ranges[i].clone());
              i++;
          }
          while (i < self.ranges.length && subrange.overlaps(self.ranges[i])) {
              new_ranges = new_ranges.concat(self.ranges[i].subtract(subrange));
              i++;
          }
          while (i < self.ranges.length) {
              new_ranges.push(self.ranges[i].clone());
              i++;
          }
          self.ranges = new_ranges;
          _update_length(self);
      }
      if (a instanceof DiscontinuousRange) {
          a.ranges.forEach(_subtract);
      } else {
          if (a instanceof _SubRange) {
              _subtract(a);
          } else {
              if (b === undefined) b = a;
              _subtract(new _SubRange(a, b));
          }
      }
      return this;
  };


  DiscontinuousRange.prototype.index = function (index) {
      var i = 0;
      while (i < this.ranges.length && this.ranges[i].length <= index) {
          index -= this.ranges[i].length;
          i++;
      }
      if (i >= this.ranges.length) return null;
      return this.ranges[i].low + index;
  };


  DiscontinuousRange.prototype.toString = function () {
      return '[ ' + this.ranges.join(', ') + ' ]'
  };

  DiscontinuousRange.prototype.clone = function () {
      return new DiscontinuousRange(this);
  };

  var discontinuousRange = DiscontinuousRange;

  var randexp = createCommonjsModule(function (module) {
  var types = lib.types;


  /**
   * If code is alphabetic, converts to other case.
   * If not alphabetic, returns back code.
   *
   * @param {Number} code
   * @return {Number}
   */
  function toOtherCase(code) {
    return code + (97 <= code && code <= 122 ? -32 :
                   65 <= code && code <= 90  ?  32 : 0);
  }


  /**
   * Randomly returns a true or false value.
   *
   * @return {Boolean}
   */
  function randBool() {
    return !this.randInt(0, 1);
  }


  /**
   * Randomly selects and returns a value from the array.
   *
   * @param {Array.<Object>} arr
   * @return {Object}
   */
  function randSelect(arr) {
    if (arr instanceof discontinuousRange) {
      return arr.index(this.randInt(0, arr.length - 1));
    }
    return arr[this.randInt(0, arr.length - 1)];
  }


  /**
   * expands a token to a DiscontinuousRange of characters which has a
   * length and an index function (for random selecting)
   *
   * @param {Object} token
   * @return {DiscontinuousRange}
   */
  function expand(token) {
    if (token.type === lib.types.CHAR) {
      return new discontinuousRange(token.value);
    } else if (token.type === lib.types.RANGE) {
      return new discontinuousRange(token.from, token.to);
    } else {
      var drange = new discontinuousRange();
      for (var i = 0; i < token.set.length; i++) {
        var subrange = expand.call(this, token.set[i]);
        drange.add(subrange);
        if (this.ignoreCase) {
          for (var j = 0; j < subrange.length; j++) {
            var code = subrange.index(j);
            var otherCaseCode = toOtherCase(code);
            if (code !== otherCaseCode) {
              drange.add(otherCaseCode);
            }
          }
        }
      }
      if (token.not) {
        return this.defaultRange.clone().subtract(drange);
      } else {
        return drange;
      }
    }
  }


  /**
   * Checks if some custom properties have been set for this regexp.
   *
   * @param {RandExp} randexp
   * @param {RegExp} regexp
   */
  function checkCustom(randexp, regexp) {
    if (typeof regexp.max === 'number') {
      randexp.max = regexp.max;
    }
    if (regexp.defaultRange instanceof discontinuousRange) {
      randexp.defaultRange = regexp.defaultRange;
    }
    if (typeof regexp.randInt === 'function') {
      randexp.randInt = regexp.randInt;
    }
  }


  /**
   * @constructor
   * @param {RegExp|String} regexp
   * @param {String} m
   */
  var RandExp = module.exports = function(regexp, m) {
    this.defaultRange = this.defaultRange.clone();
    if (regexp instanceof RegExp) {
      this.ignoreCase = regexp.ignoreCase;
      this.multiline = regexp.multiline;
      checkCustom(this, regexp);
      regexp = regexp.source;

    } else if (typeof regexp === 'string') {
      this.ignoreCase = m && m.indexOf('i') !== -1;
      this.multiline = m && m.indexOf('m') !== -1;
    } else {
      throw new Error('Expected a regexp or string');
    }

    this.tokens = lib(regexp);
  };


  // When a repetitional token has its max set to Infinite,
  // randexp won't actually generate a random amount between min and Infinite
  // instead it will see Infinite as min + 100.
  RandExp.prototype.max = 100;


  // Generates the random string.
  RandExp.prototype.gen = function() {
    return gen.call(this, this.tokens, []);
  };


  // Enables use of randexp with a shorter call.
  RandExp.randexp = function(regexp, m) {
    var randexp;
    if (regexp._randexp === undefined) {
      randexp = new RandExp(regexp, m);
      regexp._randexp = randexp;
    } else {
      randexp = regexp._randexp;
    }
    checkCustom(randexp, regexp);
    return randexp.gen();
  };


  // This enables sugary /regexp/.gen syntax.
  RandExp.sugar = function() {
    /* jshint freeze:false */
    RegExp.prototype.gen = function() {
      return RandExp.randexp(this);
    };
  };

  // This allows expanding to include additional characters
  // for instance: RandExp.defaultRange.add(0, 65535);
  RandExp.prototype.defaultRange = new discontinuousRange(32, 126);


  /**
   * Randomly generates and returns a number between a and b (inclusive).
   *
   * @param {Number} a
   * @param {Number} b
   * @return {Number}
   */
  RandExp.prototype.randInt = function(a, b) {
    return a + Math.floor(Math.random() * (1 + b - a));
  };


  /**
   * Generate random string modeled after given tokens.
   *
   * @param {Object} token
   * @param {Array.<String>} groups
   * @return {String}
   */
  function gen(token, groups) {
    var stack, str, n, i, l;

    switch (token.type) {


      case types.ROOT:
      case types.GROUP:
        // Ignore lookaheads for now.
        if (token.followedBy || token.notFollowedBy) { return ''; }

        // Insert placeholder until group string is generated.
        if (token.remember && token.groupNumber === undefined) {
          token.groupNumber = groups.push(null) - 1;
        }

        stack = token.options ?
          randSelect.call(this, token.options) : token.stack;

        str = '';
        for (i = 0, l = stack.length; i < l; i++) {
          str += gen.call(this, stack[i], groups);
        }

        if (token.remember) {
          groups[token.groupNumber] = str;
        }
        return str;


      case types.POSITION:
        // Do nothing for now.
        return '';


      case types.SET:
        var expandedSet = expand.call(this, token);
        if (!expandedSet.length) { return ''; }
        return String.fromCharCode(randSelect.call(this, expandedSet));


      case types.REPETITION:
        // Randomly generate number between min and max.
        n = this.randInt(token.min,
                token.max === Infinity ? token.min + this.max : token.max);

        str = '';
        for (i = 0; i < n; i++) {
          str += gen.call(this, token.value, groups);
        }

        return str;


      case types.REFERENCE:
        return groups[token.value - 1] || '';


      case types.CHAR:
        var code = this.ignoreCase && randBool.call(this) ?
          toOtherCase(token.value) : token.value;
        return String.fromCharCode(code);
    }
  }
  });

  // https://gist.github.com/pjt33/efb2f1134bab986113fd

  function URLUtils(url, baseURL) {
    // remove leading ./
    url = url.replace(/^\.\//, '');

    var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(?:\/\/(?:([^:@]*)(?::([^:@]*))?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
    if (!m) {
      throw new RangeError();
    }
    var href = m[0] || '';
    var protocol = m[1] || '';
    var username = m[2] || '';
    var password = m[3] || '';
    var host = m[4] || '';
    var hostname = m[5] || '';
    var port = m[6] || '';
    var pathname = m[7] || '';
    var search = m[8] || '';
    var hash = m[9] || '';
    if (baseURL !== undefined) {
      var base = new URLUtils(baseURL);
      var flag = protocol === '' && host === '' && username === '';
      if (flag && pathname === '' && search === '') {
        search = base.search;
      }
      if (flag && pathname.charAt(0) !== '/') {
        pathname = (pathname !== '' ? (base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + pathname) : base.pathname);
      }
      // dot segments removal
      var output = [];

      pathname.replace(/\/?[^\/]+/g, function(p) {
        if (p === '/..') {
          output.pop();
        } else {
          output.push(p);
        }
      });

      pathname = output.join('') || '/';

      if (flag) {
        port = base.port;
        hostname = base.hostname;
        host = base.host;
        password = base.password;
        username = base.username;
      }
      if (protocol === '') {
        protocol = base.protocol;
      }
      href = protocol + (host !== '' ? '//' : '') + (username !== '' ? username + (password !== '' ? ':' + password : '') + '@' : '') + host + pathname + search + hash;
    }
    this.href = href;
    this.origin = protocol + (host !== '' ? '//' + host : '');
    this.protocol = protocol;
    this.username = username;
    this.password = password;
    this.host = host;
    this.hostname = hostname;
    this.port = port;
    this.pathname = pathname;
    this.search = search;
    this.hash = hash;
  }

  function isURL(path) {
    if (typeof path === 'string' && /^\w+:\/\//.test(path)) {
      return true;
    }
  }

  function parseURI(href, base) {
    return new URLUtils(href, base);
  }

  function resolveURL(base, href) {
    base = base || 'http://json-schema.org/schema#';

    href = parseURI(href, base);
    base = parseURI(base);

    if (base.hash && !href.hash) {
      return href.href + base.hash;
    }

    return href.href;
  }

  function getDocumentURI(uri) {
    return typeof uri === 'string' && uri.split('#')[0];
  }

  function isKeyword(prop) {
    return prop === 'enum' || prop === 'default' || prop === 'required';
  }

  var helpers = {
    isURL: isURL,
    parseURI: parseURI,
    isKeyword: isKeyword,
    resolveURL: resolveURL,
    getDocumentURI: getDocumentURI
  };

  var findReference = createCommonjsModule(function (module) {



  function get(obj, path) {
    var hash = path.split('#')[1];

    var parts = hash.split('/').slice(1);

    while (parts.length) {
      var key = decodeURIComponent(parts.shift()).replace(/~1/g, '/').replace(/~0/g, '~');

      if (typeof obj[key] === 'undefined') {
        throw new Error('JSON pointer not found: ' + path);
      }

      obj = obj[key];
    }

    return obj;
  }

  var find = module.exports = function(id, refs, filter) {
    var target = refs[id] || refs[id.split('#')[1]] || refs[helpers.getDocumentURI(id)];

    try {
      if (target) {
        target = id.indexOf('#/') > -1 ? get(target, id) : target;
      } else {
        for (var key in refs) {
          if (helpers.resolveURL(refs[key].id, id) === refs[key].id) {
            target = refs[key];
            break;
          }
        }
      }
    } catch (e) {
      if (typeof filter === 'function') {
        target = filter(id, refs);
      } else {
        throw e;
      }
    }

    if (!target) {
      throw new Error('Reference not found: ' + id);
    }

    while (target.$ref) {
      target = find(target.$ref, refs);
    }

    return target;
  };
  });

  var deepExtend_1 = createCommonjsModule(function (module) {

  function isSpecificValue(val) {
    return (
      val instanceof Buffer
      || val instanceof Date
      || val instanceof RegExp
    ) ? true : false;
  }

  function cloneSpecificValue(val) {
    if (val instanceof Buffer) {
      var x = new Buffer(val.length);
      val.copy(x);
      return x;
    } else if (val instanceof Date) {
      return new Date(val.getTime());
    } else if (val instanceof RegExp) {
      return new RegExp(val);
    } else {
      throw new Error('Unexpected situation');
    }
  }

  /**
   * Recursive cloning array.
   */
  function deepCloneArray(arr) {
    var clone = [];
    arr.forEach(function (item, index) {
      if (typeof item === 'object' && item !== null) {
        if (Array.isArray(item)) {
          clone[index] = deepCloneArray(item);
        } else if (isSpecificValue(item)) {
          clone[index] = cloneSpecificValue(item);
        } else {
          clone[index] = deepExtend({}, item);
        }
      } else {
        clone[index] = item;
      }
    });
    return clone;
  }

  /**
   * Extening object that entered in first argument.
   *
   * Returns extended object or false if have no target object or incorrect type.
   *
   * If you wish to clone source object (without modify it), just use empty new
   * object as first argument, like this:
   *   deepExtend({}, yourObj_1, [yourObj_N]);
   */
  var deepExtend = module.exports = function (/*obj_1, [obj_2], [obj_N]*/) {
    if (arguments.length < 1 || typeof arguments[0] !== 'object') {
      return false;
    }

    if (arguments.length < 2) {
      return arguments[0];
    }

    var target = arguments[0];

    // convert arguments to array and cut off target object
    var args = Array.prototype.slice.call(arguments, 1);

    var val, src;

    args.forEach(function (obj) {
      // skip argument if isn't an object, is null, or is an array
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return;
      }

      Object.keys(obj).forEach(function (key) {
        src = target[key]; // source value
        val = obj[key]; // new value

        // recursion prevention
        if (val === target) {
          return;

        /**
         * if new value isn't object then just overwrite by new value
         * instead of extending.
         */
        } else if (typeof val !== 'object' || val === null) {
          target[key] = val;
          return;

        // just clone arrays (and recursive clone objects inside)
        } else if (Array.isArray(val)) {
          target[key] = deepCloneArray(val);
          return;

        // custom cloning and overwrite for specific objects
        } else if (isSpecificValue(val)) {
          target[key] = cloneSpecificValue(val);
          return;

        // overwrite by new value if source isn't object or array
        } else if (typeof src !== 'object' || src === null || Array.isArray(src)) {
          target[key] = deepExtend({}, val);
          return;

        // source value and new value is objects both, extending...
        } else {
          target[key] = deepExtend(src, val);
          return;
        }
      });
    });

    return target;
  };
  });

  function copy(_, obj, refs, parent, resolve, callback) {
    var target =  Array.isArray(obj) ? [] : {};

    if (typeof obj.$ref === 'string') {
      var id = obj.$ref;
      var base = helpers.getDocumentURI(id);
      var local = id.indexOf('#/') > -1;

      if (local || (resolve && base !== parent)) {
        var fixed = findReference(id, refs, callback);

        deepExtend_1(obj, fixed);

        delete obj.$ref;
        delete obj.id;
      }

      if (_[id]) {
        return obj;
      }

      _[id] = 1;
    }

    for (var prop in obj) {
      if (typeof obj[prop] === 'object' && obj[prop] !== null && !helpers.isKeyword(prop)) {
        target[prop] = copy(_, obj[prop], refs, parent, resolve, callback);
      } else {
        target[prop] = obj[prop];
      }
    }

    return target;
  }

  var resolveSchema = function(obj, refs, resolve, callback) {
    var fixedId = helpers.resolveURL(obj.$schema, obj.id),
        parent = helpers.getDocumentURI(fixedId);

    return copy({}, obj, refs, parent, resolve, callback);
  };

  var cloneObj = createCommonjsModule(function (module) {

  var clone = module.exports = function(obj, seen) {
    seen = seen || [];

    if (seen.indexOf(obj) > -1) {
      throw new Error('unable dereference circular structures');
    }

    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    seen = seen.concat([obj]);

    var target = Array.isArray(obj) ? [] : {};

    function copy(key, value) {
      target[key] = clone(value, seen);
    }

    if (Array.isArray(target)) {
      obj.forEach(function(value, key) {
        copy(key, value);
      });
    } else if (Object.prototype.toString.call(obj) === '[object Object]') {
      Object.keys(obj).forEach(function(key) {
        copy(key, obj[key]);
      });
    }

    return target;
  };
  });

  var SCHEMA_URI = [
    'http://json-schema.org/schema#',
    'http://json-schema.org/draft-04/schema#'
  ];

  function expand(obj, parent, callback) {
    if (obj) {
      var id = typeof obj.id === 'string' ? obj.id : '#';

      if (!helpers.isURL(id)) {
        id = helpers.resolveURL(parent === id ? null : parent, id);
      }

      if (typeof obj.$ref === 'string' && !helpers.isURL(obj.$ref)) {
        obj.$ref = helpers.resolveURL(id, obj.$ref);
      }

      if (typeof obj.id === 'string') {
        obj.id = parent = id;
      }
    }

    for (var key in obj) {
      var value = obj[key];

      if (typeof value === 'object' && value !== null && !helpers.isKeyword(key)) {
        expand(value, parent, callback);
      }
    }

    if (typeof callback === 'function') {
      callback(obj);
    }
  }

  var normalizeSchema = function(fakeroot, schema, push) {
    if (typeof fakeroot === 'object') {
      push = schema;
      schema = fakeroot;
      fakeroot = null;
    }

    var base = fakeroot || '',
        copy = cloneObj(schema);

    if (copy.$schema && SCHEMA_URI.indexOf(copy.$schema) === -1) {
      throw new Error('Unsupported schema version (v4 only)');
    }

    base = helpers.resolveURL(copy.$schema || SCHEMA_URI[0], base);

    expand(copy, helpers.resolveURL(copy.id || '#', base), push);

    copy.id = copy.id || base;

    return copy;
  };

  var lib$1 = createCommonjsModule(function (module) {



  helpers.findByRef = findReference;
  helpers.resolveSchema = resolveSchema;
  helpers.normalizeSchema = normalizeSchema;

  var instance = module.exports = function(f) {
    function $ref(fakeroot, schema, refs, ex) {
      if (typeof fakeroot === 'object') {
        ex = refs;
        refs = schema;
        schema = fakeroot;
        fakeroot = undefined;
      }

      if (typeof schema !== 'object') {
        throw new Error('schema must be an object');
      }

      if (typeof refs === 'object' && refs !== null) {
        var aux = refs;

        refs = [];

        for (var k in aux) {
          aux[k].id = aux[k].id || k;
          refs.push(aux[k]);
        }
      }

      if (typeof refs !== 'undefined' && !Array.isArray(refs)) {
        ex = !!refs;
        refs = [];
      }

      function push(ref) {
        if (typeof ref.id === 'string') {
          var id = helpers.resolveURL(fakeroot, ref.id).replace(/\/#?$/, '');

          if (id.indexOf('#') > -1) {
            var parts = id.split('#');

            if (parts[1].charAt() === '/') {
              id = parts[0];
            } else {
              id = parts[1] || parts[0];
            }
          }

          if (!$ref.refs[id]) {
            $ref.refs[id] = ref;
          }
        }
      }

      (refs || []).concat([schema]).forEach(function(ref) {
        schema = helpers.normalizeSchema(fakeroot, ref, push);
        push(schema);
      });

      return helpers.resolveSchema(schema, $ref.refs, ex, f);
    }

    $ref.refs = {};
    $ref.util = helpers;

    return $ref;
  };

  instance.util = helpers;
  });

  var jsonpath = createCommonjsModule(function (module, exports) {
  /*! jsonpath 1.0.0 */

  (function(f){{module.exports=f();}})(function(){var define;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof commonjsRequire=="function"&&commonjsRequire;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND", f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r);}return n[o].exports}var i=typeof commonjsRequire=="function"&&commonjsRequire;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./aesprim":[function(require,module,exports){
  /*
    Copyright (C) 2013 Ariya Hidayat <ariya.hidayat@gmail.com>
    Copyright (C) 2013 Thaddee Tyl <thaddee.tyl@gmail.com>
    Copyright (C) 2013 Mathias Bynens <mathias@qiwi.be>
    Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
    Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
    Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
    Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
    Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
    Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
    Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

      * Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.
      * Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
    ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
    DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
    (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
    LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
    ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
    THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
  */

  /*jslint bitwise:true plusplus:true */
  /*global esprima:true, define:true, exports:true, window: true,
  throwErrorTolerant: true,
  throwError: true, generateStatement: true, peek: true,
  parseAssignmentExpression: true, parseBlock: true, parseExpression: true,
  parseFunctionDeclaration: true, parseFunctionExpression: true,
  parseFunctionSourceElements: true, parseVariableIdentifier: true,
  parseLeftHandSideExpression: true,
  parseUnaryExpression: true,
  parseStatement: true, parseSourceElement: true */

  (function (root, factory) {

      // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
      // Rhino, and plain browser loading.

      /* istanbul ignore next */
      if (typeof define === 'function' && define.amd) {
          define(['exports'], factory);
      } else if (typeof exports !== 'undefined') {
          factory(exports);
      } else {
          factory((root.esprima = {}));
      }
  }(this, function (exports) {

      var Token,
          TokenName,
          FnExprTokens,
          Syntax,
          PropertyKind,
          Messages,
          Regex,
          SyntaxTreeDelegate,
          source,
          strict,
          index,
          lineNumber,
          lineStart,
          length,
          delegate,
          lookahead,
          state,
          extra;

      Token = {
          BooleanLiteral: 1,
          EOF: 2,
          Identifier: 3,
          Keyword: 4,
          NullLiteral: 5,
          NumericLiteral: 6,
          Punctuator: 7,
          StringLiteral: 8,
          RegularExpression: 9
      };

      TokenName = {};
      TokenName[Token.BooleanLiteral] = 'Boolean';
      TokenName[Token.EOF] = '<end>';
      TokenName[Token.Identifier] = 'Identifier';
      TokenName[Token.Keyword] = 'Keyword';
      TokenName[Token.NullLiteral] = 'Null';
      TokenName[Token.NumericLiteral] = 'Numeric';
      TokenName[Token.Punctuator] = 'Punctuator';
      TokenName[Token.StringLiteral] = 'String';
      TokenName[Token.RegularExpression] = 'RegularExpression';

      // A function following one of those tokens is an expression.
      FnExprTokens = ['(', '{', '[', 'in', 'typeof', 'instanceof', 'new',
                      'return', 'case', 'delete', 'throw', 'void',
                      // assignment operators
                      '=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=',
                      '&=', '|=', '^=', ',',
                      // binary/unary operators
                      '+', '-', '*', '/', '%', '++', '--', '<<', '>>', '>>>', '&',
                      '|', '^', '!', '~', '&&', '||', '?', ':', '===', '==', '>=',
                      '<=', '<', '>', '!=', '!=='];

      Syntax = {
          AssignmentExpression: 'AssignmentExpression',
          ArrayExpression: 'ArrayExpression',
          BlockStatement: 'BlockStatement',
          BinaryExpression: 'BinaryExpression',
          BreakStatement: 'BreakStatement',
          CallExpression: 'CallExpression',
          CatchClause: 'CatchClause',
          ConditionalExpression: 'ConditionalExpression',
          ContinueStatement: 'ContinueStatement',
          DoWhileStatement: 'DoWhileStatement',
          DebuggerStatement: 'DebuggerStatement',
          EmptyStatement: 'EmptyStatement',
          ExpressionStatement: 'ExpressionStatement',
          ForStatement: 'ForStatement',
          ForInStatement: 'ForInStatement',
          FunctionDeclaration: 'FunctionDeclaration',
          FunctionExpression: 'FunctionExpression',
          Identifier: 'Identifier',
          IfStatement: 'IfStatement',
          Literal: 'Literal',
          LabeledStatement: 'LabeledStatement',
          LogicalExpression: 'LogicalExpression',
          MemberExpression: 'MemberExpression',
          NewExpression: 'NewExpression',
          ObjectExpression: 'ObjectExpression',
          Program: 'Program',
          Property: 'Property',
          ReturnStatement: 'ReturnStatement',
          SequenceExpression: 'SequenceExpression',
          SwitchStatement: 'SwitchStatement',
          SwitchCase: 'SwitchCase',
          ThisExpression: 'ThisExpression',
          ThrowStatement: 'ThrowStatement',
          TryStatement: 'TryStatement',
          UnaryExpression: 'UnaryExpression',
          UpdateExpression: 'UpdateExpression',
          VariableDeclaration: 'VariableDeclaration',
          VariableDeclarator: 'VariableDeclarator',
          WhileStatement: 'WhileStatement',
          WithStatement: 'WithStatement'
      };

      PropertyKind = {
          Data: 1,
          Get: 2,
          Set: 4
      };

      // Error messages should be identical to V8.
      Messages = {
          UnexpectedToken:  'Unexpected token %0',
          UnexpectedNumber:  'Unexpected number',
          UnexpectedString:  'Unexpected string',
          UnexpectedIdentifier:  'Unexpected identifier',
          UnexpectedReserved:  'Unexpected reserved word',
          UnexpectedEOS:  'Unexpected end of input',
          NewlineAfterThrow:  'Illegal newline after throw',
          InvalidRegExp: 'Invalid regular expression',
          UnterminatedRegExp:  'Invalid regular expression: missing /',
          InvalidLHSInAssignment:  'Invalid left-hand side in assignment',
          InvalidLHSInForIn:  'Invalid left-hand side in for-in',
          MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
          NoCatchOrFinally:  'Missing catch or finally after try',
          UnknownLabel: 'Undefined label \'%0\'',
          Redeclaration: '%0 \'%1\' has already been declared',
          IllegalContinue: 'Illegal continue statement',
          IllegalBreak: 'Illegal break statement',
          IllegalReturn: 'Illegal return statement',
          StrictModeWith:  'Strict mode code may not include a with statement',
          StrictCatchVariable:  'Catch variable may not be eval or arguments in strict mode',
          StrictVarName:  'Variable name may not be eval or arguments in strict mode',
          StrictParamName:  'Parameter name eval or arguments is not allowed in strict mode',
          StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
          StrictFunctionName:  'Function name may not be eval or arguments in strict mode',
          StrictOctalLiteral:  'Octal literals are not allowed in strict mode.',
          StrictDelete:  'Delete of an unqualified identifier in strict mode.',
          StrictDuplicateProperty:  'Duplicate data property in object literal not allowed in strict mode',
          AccessorDataProperty:  'Object literal may not have data and accessor property with the same name',
          AccessorGetSet:  'Object literal may not have multiple get/set accessors with the same name',
          StrictLHSAssignment:  'Assignment to eval or arguments is not allowed in strict mode',
          StrictLHSPostfix:  'Postfix increment/decrement may not have eval or arguments operand in strict mode',
          StrictLHSPrefix:  'Prefix increment/decrement may not have eval or arguments operand in strict mode',
          StrictReservedWord:  'Use of future reserved word in strict mode'
      };

      // See also tools/generate-unicode-regex.py.
      Regex = {
          NonAsciiIdentifierStart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]'),
          NonAsciiIdentifierPart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0\u08A2-\u08AC\u08E4-\u08FE\u0900-\u0963\u0966-\u096F\u0971-\u0977\u0979-\u097F\u0981-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C01-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C82\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D02\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191C\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1D00-\u1DE6\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA697\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7B\uAA80-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE26\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]')
      };

      // Ensure the condition is true, otherwise throw an error.
      // This is only to have a better contract semantic, i.e. another safety net
      // to catch a logic error. The condition shall be fulfilled in normal case.
      // Do NOT use this to enforce a certain condition on any user input.

      function assert(condition, message) {
          /* istanbul ignore if */
          if (!condition) {
              throw new Error('ASSERT: ' + message);
          }
      }

      function isDecimalDigit(ch) {
          return (ch >= 48 && ch <= 57);   // 0..9
      }

      function isHexDigit(ch) {
          return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
      }

      function isOctalDigit(ch) {
          return '01234567'.indexOf(ch) >= 0;
      }


      // 7.2 White Space

      function isWhiteSpace(ch) {
          return (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
              (ch >= 0x1680 && [0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF].indexOf(ch) >= 0);
      }

      // 7.3 Line Terminators

      function isLineTerminator(ch) {
          return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029);
      }

      // 7.6 Identifier Names and Identifiers

      function isIdentifierStart(ch) {
          return (ch == 0x40) ||  (ch === 0x24) || (ch === 0x5F) ||  // $ (dollar) and _ (underscore)
              (ch >= 0x41 && ch <= 0x5A) ||         // A..Z
              (ch >= 0x61 && ch <= 0x7A) ||         // a..z
              (ch === 0x5C) ||                      // \ (backslash)
              ((ch >= 0x80) && Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch)));
      }

      function isIdentifierPart(ch) {
          return (ch === 0x24) || (ch === 0x5F) ||  // $ (dollar) and _ (underscore)
              (ch >= 0x41 && ch <= 0x5A) ||         // A..Z
              (ch >= 0x61 && ch <= 0x7A) ||         // a..z
              (ch >= 0x30 && ch <= 0x39) ||         // 0..9
              (ch === 0x5C) ||                      // \ (backslash)
              ((ch >= 0x80) && Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch)));
      }

      // 7.6.1.2 Future Reserved Words

      function isFutureReservedWord(id) {
          switch (id) {
          case 'class':
          case 'enum':
          case 'export':
          case 'extends':
          case 'import':
          case 'super':
              return true;
          default:
              return false;
          }
      }

      function isStrictModeReservedWord(id) {
          switch (id) {
          case 'implements':
          case 'interface':
          case 'package':
          case 'private':
          case 'protected':
          case 'public':
          case 'static':
          case 'yield':
          case 'let':
              return true;
          default:
              return false;
          }
      }

      function isRestrictedWord(id) {
          return id === 'eval' || id === 'arguments';
      }

      // 7.6.1.1 Keywords

      function isKeyword(id) {
          if (strict && isStrictModeReservedWord(id)) {
              return true;
          }

          // 'const' is specialized as Keyword in V8.
          // 'yield' and 'let' are for compatiblity with SpiderMonkey and ES.next.
          // Some others are from future reserved words.

          switch (id.length) {
          case 2:
              return (id === 'if') || (id === 'in') || (id === 'do');
          case 3:
              return (id === 'var') || (id === 'for') || (id === 'new') ||
                  (id === 'try') || (id === 'let');
          case 4:
              return (id === 'this') || (id === 'else') || (id === 'case') ||
                  (id === 'void') || (id === 'with') || (id === 'enum');
          case 5:
              return (id === 'while') || (id === 'break') || (id === 'catch') ||
                  (id === 'throw') || (id === 'const') || (id === 'yield') ||
                  (id === 'class') || (id === 'super');
          case 6:
              return (id === 'return') || (id === 'typeof') || (id === 'delete') ||
                  (id === 'switch') || (id === 'export') || (id === 'import');
          case 7:
              return (id === 'default') || (id === 'finally') || (id === 'extends');
          case 8:
              return (id === 'function') || (id === 'continue') || (id === 'debugger');
          case 10:
              return (id === 'instanceof');
          default:
              return false;
          }
      }

      // 7.4 Comments

      function addComment(type, value, start, end, loc) {
          var comment;

          assert(typeof start === 'number', 'Comment must have valid position');

          // Because the way the actual token is scanned, often the comments
          // (if any) are skipped twice during the lexical analysis.
          // Thus, we need to skip adding a comment if the comment array already
          // handled it.
          if (state.lastCommentStart >= start) {
              return;
          }
          state.lastCommentStart = start;

          comment = {
              type: type,
              value: value
          };
          if (extra.range) {
              comment.range = [start, end];
          }
          if (extra.loc) {
              comment.loc = loc;
          }
          extra.comments.push(comment);
          if (extra.attachComment) {
              extra.leadingComments.push(comment);
              extra.trailingComments.push(comment);
          }
      }

      function skipSingleLineComment(offset) {
          var start, loc, ch, comment;

          start = index - offset;
          loc = {
              start: {
                  line: lineNumber,
                  column: index - lineStart - offset
              }
          };

          while (index < length) {
              ch = source.charCodeAt(index);
              ++index;
              if (isLineTerminator(ch)) {
                  if (extra.comments) {
                      comment = source.slice(start + offset, index - 1);
                      loc.end = {
                          line: lineNumber,
                          column: index - lineStart - 1
                      };
                      addComment('Line', comment, start, index - 1, loc);
                  }
                  if (ch === 13 && source.charCodeAt(index) === 10) {
                      ++index;
                  }
                  ++lineNumber;
                  lineStart = index;
                  return;
              }
          }

          if (extra.comments) {
              comment = source.slice(start + offset, index);
              loc.end = {
                  line: lineNumber,
                  column: index - lineStart
              };
              addComment('Line', comment, start, index, loc);
          }
      }

      function skipMultiLineComment() {
          var start, loc, ch, comment;

          if (extra.comments) {
              start = index - 2;
              loc = {
                  start: {
                      line: lineNumber,
                      column: index - lineStart - 2
                  }
              };
          }

          while (index < length) {
              ch = source.charCodeAt(index);
              if (isLineTerminator(ch)) {
                  if (ch === 0x0D && source.charCodeAt(index + 1) === 0x0A) {
                      ++index;
                  }
                  ++lineNumber;
                  ++index;
                  lineStart = index;
                  if (index >= length) {
                      throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                  }
              } else if (ch === 0x2A) {
                  // Block comment ends with '*/'.
                  if (source.charCodeAt(index + 1) === 0x2F) {
                      ++index;
                      ++index;
                      if (extra.comments) {
                          comment = source.slice(start + 2, index - 2);
                          loc.end = {
                              line: lineNumber,
                              column: index - lineStart
                          };
                          addComment('Block', comment, start, index, loc);
                      }
                      return;
                  }
                  ++index;
              } else {
                  ++index;
              }
          }

          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
      }

      function skipComment() {
          var ch, start;

          start = (index === 0);
          while (index < length) {
              ch = source.charCodeAt(index);

              if (isWhiteSpace(ch)) {
                  ++index;
              } else if (isLineTerminator(ch)) {
                  ++index;
                  if (ch === 0x0D && source.charCodeAt(index) === 0x0A) {
                      ++index;
                  }
                  ++lineNumber;
                  lineStart = index;
                  start = true;
              } else if (ch === 0x2F) { // U+002F is '/'
                  ch = source.charCodeAt(index + 1);
                  if (ch === 0x2F) {
                      ++index;
                      ++index;
                      skipSingleLineComment(2);
                      start = true;
                  } else if (ch === 0x2A) {  // U+002A is '*'
                      ++index;
                      ++index;
                      skipMultiLineComment();
                  } else {
                      break;
                  }
              } else if (start && ch === 0x2D) { // U+002D is '-'
                  // U+003E is '>'
                  if ((source.charCodeAt(index + 1) === 0x2D) && (source.charCodeAt(index + 2) === 0x3E)) {
                      // '-->' is a single-line comment
                      index += 3;
                      skipSingleLineComment(3);
                  } else {
                      break;
                  }
              } else if (ch === 0x3C) { // U+003C is '<'
                  if (source.slice(index + 1, index + 4) === '!--') {
                      ++index; // `<`
                      ++index; // `!`
                      ++index; // `-`
                      ++index; // `-`
                      skipSingleLineComment(4);
                  } else {
                      break;
                  }
              } else {
                  break;
              }
          }
      }

      function scanHexEscape(prefix) {
          var i, len, ch, code = 0;

          len = (prefix === 'u') ? 4 : 2;
          for (i = 0; i < len; ++i) {
              if (index < length && isHexDigit(source[index])) {
                  ch = source[index++];
                  code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
              } else {
                  return '';
              }
          }
          return String.fromCharCode(code);
      }

      function getEscapedIdentifier() {
          var ch, id;

          ch = source.charCodeAt(index++);
          id = String.fromCharCode(ch);

          // '\u' (U+005C, U+0075) denotes an escaped character.
          if (ch === 0x5C) {
              if (source.charCodeAt(index) !== 0x75) {
                  throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
              ++index;
              ch = scanHexEscape('u');
              if (!ch || ch === '\\' || !isIdentifierStart(ch.charCodeAt(0))) {
                  throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
              id = ch;
          }

          while (index < length) {
              ch = source.charCodeAt(index);
              if (!isIdentifierPart(ch)) {
                  break;
              }
              ++index;
              id += String.fromCharCode(ch);

              // '\u' (U+005C, U+0075) denotes an escaped character.
              if (ch === 0x5C) {
                  id = id.substr(0, id.length - 1);
                  if (source.charCodeAt(index) !== 0x75) {
                      throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                  }
                  ++index;
                  ch = scanHexEscape('u');
                  if (!ch || ch === '\\' || !isIdentifierPart(ch.charCodeAt(0))) {
                      throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                  }
                  id += ch;
              }
          }

          return id;
      }

      function getIdentifier() {
          var start, ch;

          start = index++;
          while (index < length) {
              ch = source.charCodeAt(index);
              if (ch === 0x5C) {
                  // Blackslash (U+005C) marks Unicode escape sequence.
                  index = start;
                  return getEscapedIdentifier();
              }
              if (isIdentifierPart(ch)) {
                  ++index;
              } else {
                  break;
              }
          }

          return source.slice(start, index);
      }

      function scanIdentifier() {
          var start, id, type;

          start = index;

          // Backslash (U+005C) starts an escaped character.
          id = (source.charCodeAt(index) === 0x5C) ? getEscapedIdentifier() : getIdentifier();

          // There is no keyword or literal with only one character.
          // Thus, it must be an identifier.
          if (id.length === 1) {
              type = Token.Identifier;
          } else if (isKeyword(id)) {
              type = Token.Keyword;
          } else if (id === 'null') {
              type = Token.NullLiteral;
          } else if (id === 'true' || id === 'false') {
              type = Token.BooleanLiteral;
          } else {
              type = Token.Identifier;
          }

          return {
              type: type,
              value: id,
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: start,
              end: index
          };
      }


      // 7.7 Punctuators

      function scanPunctuator() {
          var start = index,
              code = source.charCodeAt(index),
              code2,
              ch1 = source[index],
              ch2,
              ch3,
              ch4;

          switch (code) {

          // Check for most common single-character punctuators.
          case 0x2E:  // . dot
          case 0x28:  // ( open bracket
          case 0x29:  // ) close bracket
          case 0x3B:  // ; semicolon
          case 0x2C:  // , comma
          case 0x7B:  // { open curly brace
          case 0x7D:  // } close curly brace
          case 0x5B:  // [
          case 0x5D:  // ]
          case 0x3A:  // :
          case 0x3F:  // ?
          case 0x7E:  // ~
              ++index;
              if (extra.tokenize) {
                  if (code === 0x28) {
                      extra.openParenToken = extra.tokens.length;
                  } else if (code === 0x7B) {
                      extra.openCurlyToken = extra.tokens.length;
                  }
              }
              return {
                  type: Token.Punctuator,
                  value: String.fromCharCode(code),
                  lineNumber: lineNumber,
                  lineStart: lineStart,
                  start: start,
                  end: index
              };

          default:
              code2 = source.charCodeAt(index + 1);

              // '=' (U+003D) marks an assignment or comparison operator.
              if (code2 === 0x3D) {
                  switch (code) {
                  case 0x2B:  // +
                  case 0x2D:  // -
                  case 0x2F:  // /
                  case 0x3C:  // <
                  case 0x3E:  // >
                  case 0x5E:  // ^
                  case 0x7C:  // |
                  case 0x25:  // %
                  case 0x26:  // &
                  case 0x2A:  // *
                      index += 2;
                      return {
                          type: Token.Punctuator,
                          value: String.fromCharCode(code) + String.fromCharCode(code2),
                          lineNumber: lineNumber,
                          lineStart: lineStart,
                          start: start,
                          end: index
                      };

                  case 0x21: // !
                  case 0x3D: // =
                      index += 2;

                      // !== and ===
                      if (source.charCodeAt(index) === 0x3D) {
                          ++index;
                      }
                      return {
                          type: Token.Punctuator,
                          value: source.slice(start, index),
                          lineNumber: lineNumber,
                          lineStart: lineStart,
                          start: start,
                          end: index
                      };
                  }
              }
          }

          // 4-character punctuator: >>>=

          ch4 = source.substr(index, 4);

          if (ch4 === '>>>=') {
              index += 4;
              return {
                  type: Token.Punctuator,
                  value: ch4,
                  lineNumber: lineNumber,
                  lineStart: lineStart,
                  start: start,
                  end: index
              };
          }

          // 3-character punctuators: === !== >>> <<= >>=

          ch3 = ch4.substr(0, 3);

          if (ch3 === '>>>' || ch3 === '<<=' || ch3 === '>>=') {
              index += 3;
              return {
                  type: Token.Punctuator,
                  value: ch3,
                  lineNumber: lineNumber,
                  lineStart: lineStart,
                  start: start,
                  end: index
              };
          }

          // Other 2-character punctuators: ++ -- << >> && ||
          ch2 = ch3.substr(0, 2);

          if ((ch1 === ch2[1] && ('+-<>&|'.indexOf(ch1) >= 0)) || ch2 === '=>') {
              index += 2;
              return {
                  type: Token.Punctuator,
                  value: ch2,
                  lineNumber: lineNumber,
                  lineStart: lineStart,
                  start: start,
                  end: index
              };
          }

          // 1-character punctuators: < > = ! + - * % & | ^ /
          if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
              ++index;
              return {
                  type: Token.Punctuator,
                  value: ch1,
                  lineNumber: lineNumber,
                  lineStart: lineStart,
                  start: start,
                  end: index
              };
          }

          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
      }

      // 7.8.3 Numeric Literals

      function scanHexLiteral(start) {
          var number = '';

          while (index < length) {
              if (!isHexDigit(source[index])) {
                  break;
              }
              number += source[index++];
          }

          if (number.length === 0) {
              throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
          }

          if (isIdentifierStart(source.charCodeAt(index))) {
              throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
          }

          return {
              type: Token.NumericLiteral,
              value: parseInt('0x' + number, 16),
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: start,
              end: index
          };
      }

      function scanOctalLiteral(start) {
          var number = '0' + source[index++];
          while (index < length) {
              if (!isOctalDigit(source[index])) {
                  break;
              }
              number += source[index++];
          }

          if (isIdentifierStart(source.charCodeAt(index)) || isDecimalDigit(source.charCodeAt(index))) {
              throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
          }

          return {
              type: Token.NumericLiteral,
              value: parseInt(number, 8),
              octal: true,
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: start,
              end: index
          };
      }

      function scanNumericLiteral() {
          var number, start, ch;

          ch = source[index];
          assert(isDecimalDigit(ch.charCodeAt(0)) || (ch === '.'),
              'Numeric literal must start with a decimal digit or a decimal point');

          start = index;
          number = '';
          if (ch !== '.') {
              number = source[index++];
              ch = source[index];

              // Hex number starts with '0x'.
              // Octal number starts with '0'.
              if (number === '0') {
                  if (ch === 'x' || ch === 'X') {
                      ++index;
                      return scanHexLiteral(start);
                  }
                  if (isOctalDigit(ch)) {
                      return scanOctalLiteral(start);
                  }

                  // decimal number starts with '0' such as '09' is illegal.
                  if (ch && isDecimalDigit(ch.charCodeAt(0))) {
                      throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                  }
              }

              while (isDecimalDigit(source.charCodeAt(index))) {
                  number += source[index++];
              }
              ch = source[index];
          }

          if (ch === '.') {
              number += source[index++];
              while (isDecimalDigit(source.charCodeAt(index))) {
                  number += source[index++];
              }
              ch = source[index];
          }

          if (ch === 'e' || ch === 'E') {
              number += source[index++];

              ch = source[index];
              if (ch === '+' || ch === '-') {
                  number += source[index++];
              }
              if (isDecimalDigit(source.charCodeAt(index))) {
                  while (isDecimalDigit(source.charCodeAt(index))) {
                      number += source[index++];
                  }
              } else {
                  throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
          }

          if (isIdentifierStart(source.charCodeAt(index))) {
              throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
          }

          return {
              type: Token.NumericLiteral,
              value: parseFloat(number),
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: start,
              end: index
          };
      }

      // 7.8.4 String Literals

      function scanStringLiteral() {
          var str = '', quote, start, ch, code, unescaped, restore, octal = false, startLineNumber, startLineStart;
          startLineNumber = lineNumber;
          startLineStart = lineStart;

          quote = source[index];
          assert((quote === '\'' || quote === '"'),
              'String literal must starts with a quote');

          start = index;
          ++index;

          while (index < length) {
              ch = source[index++];

              if (ch === quote) {
                  quote = '';
                  break;
              } else if (ch === '\\') {
                  ch = source[index++];
                  if (!ch || !isLineTerminator(ch.charCodeAt(0))) {
                      switch (ch) {
                      case 'u':
                      case 'x':
                          restore = index;
                          unescaped = scanHexEscape(ch);
                          if (unescaped) {
                              str += unescaped;
                          } else {
                              index = restore;
                              str += ch;
                          }
                          break;
                      case 'n':
                          str += '\n';
                          break;
                      case 'r':
                          str += '\r';
                          break;
                      case 't':
                          str += '\t';
                          break;
                      case 'b':
                          str += '\b';
                          break;
                      case 'f':
                          str += '\f';
                          break;
                      case 'v':
                          str += '\x0B';
                          break;

                      default:
                          if (isOctalDigit(ch)) {
                              code = '01234567'.indexOf(ch);

                              // \0 is not octal escape sequence
                              if (code !== 0) {
                                  octal = true;
                              }

                              if (index < length && isOctalDigit(source[index])) {
                                  octal = true;
                                  code = code * 8 + '01234567'.indexOf(source[index++]);

                                  // 3 digits are only allowed when string starts
                                  // with 0, 1, 2, 3
                                  if ('0123'.indexOf(ch) >= 0 &&
                                          index < length &&
                                          isOctalDigit(source[index])) {
                                      code = code * 8 + '01234567'.indexOf(source[index++]);
                                  }
                              }
                              str += String.fromCharCode(code);
                          } else {
                              str += ch;
                          }
                          break;
                      }
                  } else {
                      ++lineNumber;
                      if (ch ===  '\r' && source[index] === '\n') {
                          ++index;
                      }
                      lineStart = index;
                  }
              } else if (isLineTerminator(ch.charCodeAt(0))) {
                  break;
              } else {
                  str += ch;
              }
          }

          if (quote !== '') {
              throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
          }

          return {
              type: Token.StringLiteral,
              value: str,
              octal: octal,
              startLineNumber: startLineNumber,
              startLineStart: startLineStart,
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: start,
              end: index
          };
      }

      function testRegExp(pattern, flags) {
          var value;
          try {
              value = new RegExp(pattern, flags);
          } catch (e) {
              throwError({}, Messages.InvalidRegExp);
          }
          return value;
      }

      function scanRegExpBody() {
          var ch, str, classMarker, terminated, body;

          ch = source[index];
          assert(ch === '/', 'Regular expression literal must start with a slash');
          str = source[index++];

          classMarker = false;
          terminated = false;
          while (index < length) {
              ch = source[index++];
              str += ch;
              if (ch === '\\') {
                  ch = source[index++];
                  // ECMA-262 7.8.5
                  if (isLineTerminator(ch.charCodeAt(0))) {
                      throwError({}, Messages.UnterminatedRegExp);
                  }
                  str += ch;
              } else if (isLineTerminator(ch.charCodeAt(0))) {
                  throwError({}, Messages.UnterminatedRegExp);
              } else if (classMarker) {
                  if (ch === ']') {
                      classMarker = false;
                  }
              } else {
                  if (ch === '/') {
                      terminated = true;
                      break;
                  } else if (ch === '[') {
                      classMarker = true;
                  }
              }
          }

          if (!terminated) {
              throwError({}, Messages.UnterminatedRegExp);
          }

          // Exclude leading and trailing slash.
          body = str.substr(1, str.length - 2);
          return {
              value: body,
              literal: str
          };
      }

      function scanRegExpFlags() {
          var ch, str, flags, restore;

          str = '';
          flags = '';
          while (index < length) {
              ch = source[index];
              if (!isIdentifierPart(ch.charCodeAt(0))) {
                  break;
              }

              ++index;
              if (ch === '\\' && index < length) {
                  ch = source[index];
                  if (ch === 'u') {
                      ++index;
                      restore = index;
                      ch = scanHexEscape('u');
                      if (ch) {
                          flags += ch;
                          for (str += '\\u'; restore < index; ++restore) {
                              str += source[restore];
                          }
                      } else {
                          index = restore;
                          flags += 'u';
                          str += '\\u';
                      }
                      throwErrorTolerant({}, Messages.UnexpectedToken, 'ILLEGAL');
                  } else {
                      str += '\\';
                      throwErrorTolerant({}, Messages.UnexpectedToken, 'ILLEGAL');
                  }
              } else {
                  flags += ch;
                  str += ch;
              }
          }

          return {
              value: flags,
              literal: str
          };
      }

      function scanRegExp() {
          var start, body, flags, value;

          lookahead = null;
          skipComment();
          start = index;

          body = scanRegExpBody();
          flags = scanRegExpFlags();
          value = testRegExp(body.value, flags.value);

          if (extra.tokenize) {
              return {
                  type: Token.RegularExpression,
                  value: value,
                  lineNumber: lineNumber,
                  lineStart: lineStart,
                  start: start,
                  end: index
              };
          }

          return {
              literal: body.literal + flags.literal,
              value: value,
              start: start,
              end: index
          };
      }

      function collectRegex() {
          var pos, loc, regex, token;

          skipComment();

          pos = index;
          loc = {
              start: {
                  line: lineNumber,
                  column: index - lineStart
              }
          };

          regex = scanRegExp();
          loc.end = {
              line: lineNumber,
              column: index - lineStart
          };

          /* istanbul ignore next */
          if (!extra.tokenize) {
              // Pop the previous token, which is likely '/' or '/='
              if (extra.tokens.length > 0) {
                  token = extra.tokens[extra.tokens.length - 1];
                  if (token.range[0] === pos && token.type === 'Punctuator') {
                      if (token.value === '/' || token.value === '/=') {
                          extra.tokens.pop();
                      }
                  }
              }

              extra.tokens.push({
                  type: 'RegularExpression',
                  value: regex.literal,
                  range: [pos, index],
                  loc: loc
              });
          }

          return regex;
      }

      function isIdentifierName(token) {
          return token.type === Token.Identifier ||
              token.type === Token.Keyword ||
              token.type === Token.BooleanLiteral ||
              token.type === Token.NullLiteral;
      }

      function advanceSlash() {
          var prevToken,
              checkToken;
          // Using the following algorithm:
          // https://github.com/mozilla/sweet.js/wiki/design
          prevToken = extra.tokens[extra.tokens.length - 1];
          if (!prevToken) {
              // Nothing before that: it cannot be a division.
              return collectRegex();
          }
          if (prevToken.type === 'Punctuator') {
              if (prevToken.value === ']') {
                  return scanPunctuator();
              }
              if (prevToken.value === ')') {
                  checkToken = extra.tokens[extra.openParenToken - 1];
                  if (checkToken &&
                          checkToken.type === 'Keyword' &&
                          (checkToken.value === 'if' ||
                           checkToken.value === 'while' ||
                           checkToken.value === 'for' ||
                           checkToken.value === 'with')) {
                      return collectRegex();
                  }
                  return scanPunctuator();
              }
              if (prevToken.value === '}') {
                  // Dividing a function by anything makes little sense,
                  // but we have to check for that.
                  if (extra.tokens[extra.openCurlyToken - 3] &&
                          extra.tokens[extra.openCurlyToken - 3].type === 'Keyword') {
                      // Anonymous function.
                      checkToken = extra.tokens[extra.openCurlyToken - 4];
                      if (!checkToken) {
                          return scanPunctuator();
                      }
                  } else if (extra.tokens[extra.openCurlyToken - 4] &&
                          extra.tokens[extra.openCurlyToken - 4].type === 'Keyword') {
                      // Named function.
                      checkToken = extra.tokens[extra.openCurlyToken - 5];
                      if (!checkToken) {
                          return collectRegex();
                      }
                  } else {
                      return scanPunctuator();
                  }
                  // checkToken determines whether the function is
                  // a declaration or an expression.
                  if (FnExprTokens.indexOf(checkToken.value) >= 0) {
                      // It is an expression.
                      return scanPunctuator();
                  }
                  // It is a declaration.
                  return collectRegex();
              }
              return collectRegex();
          }
          if (prevToken.type === 'Keyword') {
              return collectRegex();
          }
          return scanPunctuator();
      }

      function advance() {
          var ch;

          skipComment();

          if (index >= length) {
              return {
                  type: Token.EOF,
                  lineNumber: lineNumber,
                  lineStart: lineStart,
                  start: index,
                  end: index
              };
          }

          ch = source.charCodeAt(index);

          if (isIdentifierStart(ch)) {
              return scanIdentifier();
          }

          // Very common: ( and ) and ;
          if (ch === 0x28 || ch === 0x29 || ch === 0x3B) {
              return scanPunctuator();
          }

          // String literal starts with single quote (U+0027) or double quote (U+0022).
          if (ch === 0x27 || ch === 0x22) {
              return scanStringLiteral();
          }


          // Dot (.) U+002E can also start a floating-point number, hence the need
          // to check the next character.
          if (ch === 0x2E) {
              if (isDecimalDigit(source.charCodeAt(index + 1))) {
                  return scanNumericLiteral();
              }
              return scanPunctuator();
          }

          if (isDecimalDigit(ch)) {
              return scanNumericLiteral();
          }

          // Slash (/) U+002F can also start a regex.
          if (extra.tokenize && ch === 0x2F) {
              return advanceSlash();
          }

          return scanPunctuator();
      }

      function collectToken() {
          var loc, token, value;

          skipComment();
          loc = {
              start: {
                  line: lineNumber,
                  column: index - lineStart
              }
          };

          token = advance();
          loc.end = {
              line: lineNumber,
              column: index - lineStart
          };

          if (token.type !== Token.EOF) {
              value = source.slice(token.start, token.end);
              extra.tokens.push({
                  type: TokenName[token.type],
                  value: value,
                  range: [token.start, token.end],
                  loc: loc
              });
          }

          return token;
      }

      function lex() {
          var token;

          token = lookahead;
          index = token.end;
          lineNumber = token.lineNumber;
          lineStart = token.lineStart;

          lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();

          index = token.end;
          lineNumber = token.lineNumber;
          lineStart = token.lineStart;

          return token;
      }

      function peek() {
          var pos, line, start;

          pos = index;
          line = lineNumber;
          start = lineStart;
          lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();
          index = pos;
          lineNumber = line;
          lineStart = start;
      }

      function Position(line, column) {
          this.line = line;
          this.column = column;
      }

      function SourceLocation(startLine, startColumn, line, column) {
          this.start = new Position(startLine, startColumn);
          this.end = new Position(line, column);
      }

      SyntaxTreeDelegate = {

          name: 'SyntaxTree',

          processComment: function (node) {
              var lastChild, trailingComments;

              if (node.type === Syntax.Program) {
                  if (node.body.length > 0) {
                      return;
                  }
              }

              if (extra.trailingComments.length > 0) {
                  if (extra.trailingComments[0].range[0] >= node.range[1]) {
                      trailingComments = extra.trailingComments;
                      extra.trailingComments = [];
                  } else {
                      extra.trailingComments.length = 0;
                  }
              } else {
                  if (extra.bottomRightStack.length > 0 &&
                          extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments &&
                          extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments[0].range[0] >= node.range[1]) {
                      trailingComments = extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments;
                      delete extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments;
                  }
              }

              // Eating the stack.
              while (extra.bottomRightStack.length > 0 && extra.bottomRightStack[extra.bottomRightStack.length - 1].range[0] >= node.range[0]) {
                  lastChild = extra.bottomRightStack.pop();
              }

              if (lastChild) {
                  if (lastChild.leadingComments && lastChild.leadingComments[lastChild.leadingComments.length - 1].range[1] <= node.range[0]) {
                      node.leadingComments = lastChild.leadingComments;
                      delete lastChild.leadingComments;
                  }
              } else if (extra.leadingComments.length > 0 && extra.leadingComments[extra.leadingComments.length - 1].range[1] <= node.range[0]) {
                  node.leadingComments = extra.leadingComments;
                  extra.leadingComments = [];
              }


              if (trailingComments) {
                  node.trailingComments = trailingComments;
              }

              extra.bottomRightStack.push(node);
          },

          markEnd: function (node, startToken) {
              if (extra.range) {
                  node.range = [startToken.start, index];
              }
              if (extra.loc) {
                  node.loc = new SourceLocation(
                      startToken.startLineNumber === undefined ?  startToken.lineNumber : startToken.startLineNumber,
                      startToken.start - (startToken.startLineStart === undefined ?  startToken.lineStart : startToken.startLineStart),
                      lineNumber,
                      index - lineStart
                  );
                  this.postProcess(node);
              }

              if (extra.attachComment) {
                  this.processComment(node);
              }
              return node;
          },

          postProcess: function (node) {
              if (extra.source) {
                  node.loc.source = extra.source;
              }
              return node;
          },

          createArrayExpression: function (elements) {
              return {
                  type: Syntax.ArrayExpression,
                  elements: elements
              };
          },

          createAssignmentExpression: function (operator, left, right) {
              return {
                  type: Syntax.AssignmentExpression,
                  operator: operator,
                  left: left,
                  right: right
              };
          },

          createBinaryExpression: function (operator, left, right) {
              var type = (operator === '||' || operator === '&&') ? Syntax.LogicalExpression :
                          Syntax.BinaryExpression;
              return {
                  type: type,
                  operator: operator,
                  left: left,
                  right: right
              };
          },

          createBlockStatement: function (body) {
              return {
                  type: Syntax.BlockStatement,
                  body: body
              };
          },

          createBreakStatement: function (label) {
              return {
                  type: Syntax.BreakStatement,
                  label: label
              };
          },

          createCallExpression: function (callee, args) {
              return {
                  type: Syntax.CallExpression,
                  callee: callee,
                  'arguments': args
              };
          },

          createCatchClause: function (param, body) {
              return {
                  type: Syntax.CatchClause,
                  param: param,
                  body: body
              };
          },

          createConditionalExpression: function (test, consequent, alternate) {
              return {
                  type: Syntax.ConditionalExpression,
                  test: test,
                  consequent: consequent,
                  alternate: alternate
              };
          },

          createContinueStatement: function (label) {
              return {
                  type: Syntax.ContinueStatement,
                  label: label
              };
          },

          createDebuggerStatement: function () {
              return {
                  type: Syntax.DebuggerStatement
              };
          },

          createDoWhileStatement: function (body, test) {
              return {
                  type: Syntax.DoWhileStatement,
                  body: body,
                  test: test
              };
          },

          createEmptyStatement: function () {
              return {
                  type: Syntax.EmptyStatement
              };
          },

          createExpressionStatement: function (expression) {
              return {
                  type: Syntax.ExpressionStatement,
                  expression: expression
              };
          },

          createForStatement: function (init, test, update, body) {
              return {
                  type: Syntax.ForStatement,
                  init: init,
                  test: test,
                  update: update,
                  body: body
              };
          },

          createForInStatement: function (left, right, body) {
              return {
                  type: Syntax.ForInStatement,
                  left: left,
                  right: right,
                  body: body,
                  each: false
              };
          },

          createFunctionDeclaration: function (id, params, defaults, body) {
              return {
                  type: Syntax.FunctionDeclaration,
                  id: id,
                  params: params,
                  defaults: defaults,
                  body: body,
                  rest: null,
                  generator: false,
                  expression: false
              };
          },

          createFunctionExpression: function (id, params, defaults, body) {
              return {
                  type: Syntax.FunctionExpression,
                  id: id,
                  params: params,
                  defaults: defaults,
                  body: body,
                  rest: null,
                  generator: false,
                  expression: false
              };
          },

          createIdentifier: function (name) {
              return {
                  type: Syntax.Identifier,
                  name: name
              };
          },

          createIfStatement: function (test, consequent, alternate) {
              return {
                  type: Syntax.IfStatement,
                  test: test,
                  consequent: consequent,
                  alternate: alternate
              };
          },

          createLabeledStatement: function (label, body) {
              return {
                  type: Syntax.LabeledStatement,
                  label: label,
                  body: body
              };
          },

          createLiteral: function (token) {
              return {
                  type: Syntax.Literal,
                  value: token.value,
                  raw: source.slice(token.start, token.end)
              };
          },

          createMemberExpression: function (accessor, object, property) {
              return {
                  type: Syntax.MemberExpression,
                  computed: accessor === '[',
                  object: object,
                  property: property
              };
          },

          createNewExpression: function (callee, args) {
              return {
                  type: Syntax.NewExpression,
                  callee: callee,
                  'arguments': args
              };
          },

          createObjectExpression: function (properties) {
              return {
                  type: Syntax.ObjectExpression,
                  properties: properties
              };
          },

          createPostfixExpression: function (operator, argument) {
              return {
                  type: Syntax.UpdateExpression,
                  operator: operator,
                  argument: argument,
                  prefix: false
              };
          },

          createProgram: function (body) {
              return {
                  type: Syntax.Program,
                  body: body
              };
          },

          createProperty: function (kind, key, value) {
              return {
                  type: Syntax.Property,
                  key: key,
                  value: value,
                  kind: kind
              };
          },

          createReturnStatement: function (argument) {
              return {
                  type: Syntax.ReturnStatement,
                  argument: argument
              };
          },

          createSequenceExpression: function (expressions) {
              return {
                  type: Syntax.SequenceExpression,
                  expressions: expressions
              };
          },

          createSwitchCase: function (test, consequent) {
              return {
                  type: Syntax.SwitchCase,
                  test: test,
                  consequent: consequent
              };
          },

          createSwitchStatement: function (discriminant, cases) {
              return {
                  type: Syntax.SwitchStatement,
                  discriminant: discriminant,
                  cases: cases
              };
          },

          createThisExpression: function () {
              return {
                  type: Syntax.ThisExpression
              };
          },

          createThrowStatement: function (argument) {
              return {
                  type: Syntax.ThrowStatement,
                  argument: argument
              };
          },

          createTryStatement: function (block, guardedHandlers, handlers, finalizer) {
              return {
                  type: Syntax.TryStatement,
                  block: block,
                  guardedHandlers: guardedHandlers,
                  handlers: handlers,
                  finalizer: finalizer
              };
          },

          createUnaryExpression: function (operator, argument) {
              if (operator === '++' || operator === '--') {
                  return {
                      type: Syntax.UpdateExpression,
                      operator: operator,
                      argument: argument,
                      prefix: true
                  };
              }
              return {
                  type: Syntax.UnaryExpression,
                  operator: operator,
                  argument: argument,
                  prefix: true
              };
          },

          createVariableDeclaration: function (declarations, kind) {
              return {
                  type: Syntax.VariableDeclaration,
                  declarations: declarations,
                  kind: kind
              };
          },

          createVariableDeclarator: function (id, init) {
              return {
                  type: Syntax.VariableDeclarator,
                  id: id,
                  init: init
              };
          },

          createWhileStatement: function (test, body) {
              return {
                  type: Syntax.WhileStatement,
                  test: test,
                  body: body
              };
          },

          createWithStatement: function (object, body) {
              return {
                  type: Syntax.WithStatement,
                  object: object,
                  body: body
              };
          }
      };

      // Return true if there is a line terminator before the next token.

      function peekLineTerminator() {
          var pos, line, start, found;

          pos = index;
          line = lineNumber;
          start = lineStart;
          skipComment();
          found = lineNumber !== line;
          index = pos;
          lineNumber = line;
          lineStart = start;

          return found;
      }

      // Throw an exception

      function throwError(token, messageFormat) {
          var error,
              args = Array.prototype.slice.call(arguments, 2),
              msg = messageFormat.replace(
                  /%(\d)/g,
                  function (whole, index) {
                      assert(index < args.length, 'Message reference must be in range');
                      return args[index];
                  }
              );

          if (typeof token.lineNumber === 'number') {
              error = new Error('Line ' + token.lineNumber + ': ' + msg);
              error.index = token.start;
              error.lineNumber = token.lineNumber;
              error.column = token.start - lineStart + 1;
          } else {
              error = new Error('Line ' + lineNumber + ': ' + msg);
              error.index = index;
              error.lineNumber = lineNumber;
              error.column = index - lineStart + 1;
          }

          error.description = msg;
          throw error;
      }

      function throwErrorTolerant() {
          try {
              throwError.apply(null, arguments);
          } catch (e) {
              if (extra.errors) {
                  extra.errors.push(e);
              } else {
                  throw e;
              }
          }
      }


      // Throw an exception because of the token.

      function throwUnexpected(token) {
          if (token.type === Token.EOF) {
              throwError(token, Messages.UnexpectedEOS);
          }

          if (token.type === Token.NumericLiteral) {
              throwError(token, Messages.UnexpectedNumber);
          }

          if (token.type === Token.StringLiteral) {
              throwError(token, Messages.UnexpectedString);
          }

          if (token.type === Token.Identifier) {
              throwError(token, Messages.UnexpectedIdentifier);
          }

          if (token.type === Token.Keyword) {
              if (isFutureReservedWord(token.value)) {
                  throwError(token, Messages.UnexpectedReserved);
              } else if (strict && isStrictModeReservedWord(token.value)) {
                  throwErrorTolerant(token, Messages.StrictReservedWord);
                  return;
              }
              throwError(token, Messages.UnexpectedToken, token.value);
          }

          // BooleanLiteral, NullLiteral, or Punctuator.
          throwError(token, Messages.UnexpectedToken, token.value);
      }

      // Expect the next token to match the specified punctuator.
      // If not, an exception will be thrown.

      function expect(value) {
          var token = lex();
          if (token.type !== Token.Punctuator || token.value !== value) {
              throwUnexpected(token);
          }
      }

      // Expect the next token to match the specified keyword.
      // If not, an exception will be thrown.

      function expectKeyword(keyword) {
          var token = lex();
          if (token.type !== Token.Keyword || token.value !== keyword) {
              throwUnexpected(token);
          }
      }

      // Return true if the next token matches the specified punctuator.

      function match(value) {
          return lookahead.type === Token.Punctuator && lookahead.value === value;
      }

      // Return true if the next token matches the specified keyword

      function matchKeyword(keyword) {
          return lookahead.type === Token.Keyword && lookahead.value === keyword;
      }

      // Return true if the next token is an assignment operator

      function matchAssign() {
          var op;

          if (lookahead.type !== Token.Punctuator) {
              return false;
          }
          op = lookahead.value;
          return op === '=' ||
              op === '*=' ||
              op === '/=' ||
              op === '%=' ||
              op === '+=' ||
              op === '-=' ||
              op === '<<=' ||
              op === '>>=' ||
              op === '>>>=' ||
              op === '&=' ||
              op === '^=' ||
              op === '|=';
      }

      function consumeSemicolon() {
          var line;

          // Catch the very common case first: immediately a semicolon (U+003B).
          if (source.charCodeAt(index) === 0x3B || match(';')) {
              lex();
              return;
          }

          line = lineNumber;
          skipComment();
          if (lineNumber !== line) {
              return;
          }

          if (lookahead.type !== Token.EOF && !match('}')) {
              throwUnexpected(lookahead);
          }
      }

      // Return true if provided expression is LeftHandSideExpression

      function isLeftHandSide(expr) {
          return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
      }

      // 11.1.4 Array Initialiser

      function parseArrayInitialiser() {
          var elements = [], startToken;

          startToken = lookahead;
          expect('[');

          while (!match(']')) {
              if (match(',')) {
                  lex();
                  elements.push(null);
              } else {
                  elements.push(parseAssignmentExpression());

                  if (!match(']')) {
                      expect(',');
                  }
              }
          }

          lex();

          return delegate.markEnd(delegate.createArrayExpression(elements), startToken);
      }

      // 11.1.5 Object Initialiser

      function parsePropertyFunction(param, first) {
          var previousStrict, body, startToken;

          previousStrict = strict;
          startToken = lookahead;
          body = parseFunctionSourceElements();
          if (first && strict && isRestrictedWord(param[0].name)) {
              throwErrorTolerant(first, Messages.StrictParamName);
          }
          strict = previousStrict;
          return delegate.markEnd(delegate.createFunctionExpression(null, param, [], body), startToken);
      }

      function parseObjectPropertyKey() {
          var token, startToken;

          startToken = lookahead;
          token = lex();

          // Note: This function is called only from parseObjectProperty(), where
          // EOF and Punctuator tokens are already filtered out.

          if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
              if (strict && token.octal) {
                  throwErrorTolerant(token, Messages.StrictOctalLiteral);
              }
              return delegate.markEnd(delegate.createLiteral(token), startToken);
          }

          return delegate.markEnd(delegate.createIdentifier(token.value), startToken);
      }

      function parseObjectProperty() {
          var token, key, id, value, param, startToken;

          token = lookahead;
          startToken = lookahead;

          if (token.type === Token.Identifier) {

              id = parseObjectPropertyKey();

              // Property Assignment: Getter and Setter.

              if (token.value === 'get' && !match(':')) {
                  key = parseObjectPropertyKey();
                  expect('(');
                  expect(')');
                  value = parsePropertyFunction([]);
                  return delegate.markEnd(delegate.createProperty('get', key, value), startToken);
              }
              if (token.value === 'set' && !match(':')) {
                  key = parseObjectPropertyKey();
                  expect('(');
                  token = lookahead;
                  if (token.type !== Token.Identifier) {
                      expect(')');
                      throwErrorTolerant(token, Messages.UnexpectedToken, token.value);
                      value = parsePropertyFunction([]);
                  } else {
                      param = [ parseVariableIdentifier() ];
                      expect(')');
                      value = parsePropertyFunction(param, token);
                  }
                  return delegate.markEnd(delegate.createProperty('set', key, value), startToken);
              }
              expect(':');
              value = parseAssignmentExpression();
              return delegate.markEnd(delegate.createProperty('init', id, value), startToken);
          }
          if (token.type === Token.EOF || token.type === Token.Punctuator) {
              throwUnexpected(token);
          } else {
              key = parseObjectPropertyKey();
              expect(':');
              value = parseAssignmentExpression();
              return delegate.markEnd(delegate.createProperty('init', key, value), startToken);
          }
      }

      function parseObjectInitialiser() {
          var properties = [], property, name, key, kind, map = {}, toString = String, startToken;

          startToken = lookahead;

          expect('{');

          while (!match('}')) {
              property = parseObjectProperty();

              if (property.key.type === Syntax.Identifier) {
                  name = property.key.name;
              } else {
                  name = toString(property.key.value);
              }
              kind = (property.kind === 'init') ? PropertyKind.Data : (property.kind === 'get') ? PropertyKind.Get : PropertyKind.Set;

              key = '$' + name;
              if (Object.prototype.hasOwnProperty.call(map, key)) {
                  if (map[key] === PropertyKind.Data) {
                      if (strict && kind === PropertyKind.Data) {
                          throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                      } else if (kind !== PropertyKind.Data) {
                          throwErrorTolerant({}, Messages.AccessorDataProperty);
                      }
                  } else {
                      if (kind === PropertyKind.Data) {
                          throwErrorTolerant({}, Messages.AccessorDataProperty);
                      } else if (map[key] & kind) {
                          throwErrorTolerant({}, Messages.AccessorGetSet);
                      }
                  }
                  map[key] |= kind;
              } else {
                  map[key] = kind;
              }

              properties.push(property);

              if (!match('}')) {
                  expect(',');
              }
          }

          expect('}');

          return delegate.markEnd(delegate.createObjectExpression(properties), startToken);
      }

      // 11.1.6 The Grouping Operator

      function parseGroupExpression() {
          var expr;

          expect('(');

          expr = parseExpression();

          expect(')');

          return expr;
      }


      // 11.1 Primary Expressions

      function parsePrimaryExpression() {
          var type, token, expr, startToken;

          if (match('(')) {
              return parseGroupExpression();
          }

          if (match('[')) {
              return parseArrayInitialiser();
          }

          if (match('{')) {
              return parseObjectInitialiser();
          }

          type = lookahead.type;
          startToken = lookahead;

          if (type === Token.Identifier) {
              expr =  delegate.createIdentifier(lex().value);
          } else if (type === Token.StringLiteral || type === Token.NumericLiteral) {
              if (strict && lookahead.octal) {
                  throwErrorTolerant(lookahead, Messages.StrictOctalLiteral);
              }
              expr = delegate.createLiteral(lex());
          } else if (type === Token.Keyword) {
              if (matchKeyword('function')) {
                  return parseFunctionExpression();
              }
              if (matchKeyword('this')) {
                  lex();
                  expr = delegate.createThisExpression();
              } else {
                  throwUnexpected(lex());
              }
          } else if (type === Token.BooleanLiteral) {
              token = lex();
              token.value = (token.value === 'true');
              expr = delegate.createLiteral(token);
          } else if (type === Token.NullLiteral) {
              token = lex();
              token.value = null;
              expr = delegate.createLiteral(token);
          } else if (match('/') || match('/=')) {
              if (typeof extra.tokens !== 'undefined') {
                  expr = delegate.createLiteral(collectRegex());
              } else {
                  expr = delegate.createLiteral(scanRegExp());
              }
              peek();
          } else {
              throwUnexpected(lex());
          }

          return delegate.markEnd(expr, startToken);
      }

      // 11.2 Left-Hand-Side Expressions

      function parseArguments() {
          var args = [];

          expect('(');

          if (!match(')')) {
              while (index < length) {
                  args.push(parseAssignmentExpression());
                  if (match(')')) {
                      break;
                  }
                  expect(',');
              }
          }

          expect(')');

          return args;
      }

      function parseNonComputedProperty() {
          var token, startToken;

          startToken = lookahead;
          token = lex();

          if (!isIdentifierName(token)) {
              throwUnexpected(token);
          }

          return delegate.markEnd(delegate.createIdentifier(token.value), startToken);
      }

      function parseNonComputedMember() {
          expect('.');

          return parseNonComputedProperty();
      }

      function parseComputedMember() {
          var expr;

          expect('[');

          expr = parseExpression();

          expect(']');

          return expr;
      }

      function parseNewExpression() {
          var callee, args, startToken;

          startToken = lookahead;
          expectKeyword('new');
          callee = parseLeftHandSideExpression();
          args = match('(') ? parseArguments() : [];

          return delegate.markEnd(delegate.createNewExpression(callee, args), startToken);
      }

      function parseLeftHandSideExpressionAllowCall() {
          var previousAllowIn, expr, args, property, startToken;

          startToken = lookahead;

          previousAllowIn = state.allowIn;
          state.allowIn = true;
          expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
          state.allowIn = previousAllowIn;

          for (;;) {
              if (match('.')) {
                  property = parseNonComputedMember();
                  expr = delegate.createMemberExpression('.', expr, property);
              } else if (match('(')) {
                  args = parseArguments();
                  expr = delegate.createCallExpression(expr, args);
              } else if (match('[')) {
                  property = parseComputedMember();
                  expr = delegate.createMemberExpression('[', expr, property);
              } else {
                  break;
              }
              delegate.markEnd(expr, startToken);
          }

          return expr;
      }

      function parseLeftHandSideExpression() {
          var previousAllowIn, expr, property, startToken;

          startToken = lookahead;

          previousAllowIn = state.allowIn;
          expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
          state.allowIn = previousAllowIn;

          while (match('.') || match('[')) {
              if (match('[')) {
                  property = parseComputedMember();
                  expr = delegate.createMemberExpression('[', expr, property);
              } else {
                  property = parseNonComputedMember();
                  expr = delegate.createMemberExpression('.', expr, property);
              }
              delegate.markEnd(expr, startToken);
          }

          return expr;
      }

      // 11.3 Postfix Expressions

      function parsePostfixExpression() {
          var expr, token, startToken = lookahead;

          expr = parseLeftHandSideExpressionAllowCall();

          if (lookahead.type === Token.Punctuator) {
              if ((match('++') || match('--')) && !peekLineTerminator()) {
                  // 11.3.1, 11.3.2
                  if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                      throwErrorTolerant({}, Messages.StrictLHSPostfix);
                  }

                  if (!isLeftHandSide(expr)) {
                      throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
                  }

                  token = lex();
                  expr = delegate.markEnd(delegate.createPostfixExpression(token.value, expr), startToken);
              }
          }

          return expr;
      }

      // 11.4 Unary Operators

      function parseUnaryExpression() {
          var token, expr, startToken;

          if (lookahead.type !== Token.Punctuator && lookahead.type !== Token.Keyword) {
              expr = parsePostfixExpression();
          } else if (match('++') || match('--')) {
              startToken = lookahead;
              token = lex();
              expr = parseUnaryExpression();
              // 11.4.4, 11.4.5
              if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                  throwErrorTolerant({}, Messages.StrictLHSPrefix);
              }

              if (!isLeftHandSide(expr)) {
                  throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
              }

              expr = delegate.createUnaryExpression(token.value, expr);
              expr = delegate.markEnd(expr, startToken);
          } else if (match('+') || match('-') || match('~') || match('!')) {
              startToken = lookahead;
              token = lex();
              expr = parseUnaryExpression();
              expr = delegate.createUnaryExpression(token.value, expr);
              expr = delegate.markEnd(expr, startToken);
          } else if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
              startToken = lookahead;
              token = lex();
              expr = parseUnaryExpression();
              expr = delegate.createUnaryExpression(token.value, expr);
              expr = delegate.markEnd(expr, startToken);
              if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
                  throwErrorTolerant({}, Messages.StrictDelete);
              }
          } else {
              expr = parsePostfixExpression();
          }

          return expr;
      }

      function binaryPrecedence(token, allowIn) {
          var prec = 0;

          if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
              return 0;
          }

          switch (token.value) {
          case '||':
              prec = 1;
              break;

          case '&&':
              prec = 2;
              break;

          case '|':
              prec = 3;
              break;

          case '^':
              prec = 4;
              break;

          case '&':
              prec = 5;
              break;

          case '==':
          case '!=':
          case '===':
          case '!==':
              prec = 6;
              break;

          case '<':
          case '>':
          case '<=':
          case '>=':
          case 'instanceof':
              prec = 7;
              break;

          case 'in':
              prec = allowIn ? 7 : 0;
              break;

          case '<<':
          case '>>':
          case '>>>':
              prec = 8;
              break;

          case '+':
          case '-':
              prec = 9;
              break;

          case '*':
          case '/':
          case '%':
              prec = 11;
              break;

          default:
              break;
          }

          return prec;
      }

      // 11.5 Multiplicative Operators
      // 11.6 Additive Operators
      // 11.7 Bitwise Shift Operators
      // 11.8 Relational Operators
      // 11.9 Equality Operators
      // 11.10 Binary Bitwise Operators
      // 11.11 Binary Logical Operators

      function parseBinaryExpression() {
          var marker, markers, expr, token, prec, stack, right, operator, left, i;

          marker = lookahead;
          left = parseUnaryExpression();

          token = lookahead;
          prec = binaryPrecedence(token, state.allowIn);
          if (prec === 0) {
              return left;
          }
          token.prec = prec;
          lex();

          markers = [marker, lookahead];
          right = parseUnaryExpression();

          stack = [left, token, right];

          while ((prec = binaryPrecedence(lookahead, state.allowIn)) > 0) {

              // Reduce: make a binary expression from the three topmost entries.
              while ((stack.length > 2) && (prec <= stack[stack.length - 2].prec)) {
                  right = stack.pop();
                  operator = stack.pop().value;
                  left = stack.pop();
                  expr = delegate.createBinaryExpression(operator, left, right);
                  markers.pop();
                  marker = markers[markers.length - 1];
                  delegate.markEnd(expr, marker);
                  stack.push(expr);
              }

              // Shift.
              token = lex();
              token.prec = prec;
              stack.push(token);
              markers.push(lookahead);
              expr = parseUnaryExpression();
              stack.push(expr);
          }

          // Final reduce to clean-up the stack.
          i = stack.length - 1;
          expr = stack[i];
          markers.pop();
          while (i > 1) {
              expr = delegate.createBinaryExpression(stack[i - 1].value, stack[i - 2], expr);
              i -= 2;
              marker = markers.pop();
              delegate.markEnd(expr, marker);
          }

          return expr;
      }


      // 11.12 Conditional Operator

      function parseConditionalExpression() {
          var expr, previousAllowIn, consequent, alternate, startToken;

          startToken = lookahead;

          expr = parseBinaryExpression();

          if (match('?')) {
              lex();
              previousAllowIn = state.allowIn;
              state.allowIn = true;
              consequent = parseAssignmentExpression();
              state.allowIn = previousAllowIn;
              expect(':');
              alternate = parseAssignmentExpression();

              expr = delegate.createConditionalExpression(expr, consequent, alternate);
              delegate.markEnd(expr, startToken);
          }

          return expr;
      }

      // 11.13 Assignment Operators

      function parseAssignmentExpression() {
          var token, left, right, node, startToken;

          token = lookahead;
          startToken = lookahead;

          node = left = parseConditionalExpression();

          if (matchAssign()) {
              // LeftHandSideExpression
              if (!isLeftHandSide(left)) {
                  throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
              }

              // 11.13.1
              if (strict && left.type === Syntax.Identifier && isRestrictedWord(left.name)) {
                  throwErrorTolerant(token, Messages.StrictLHSAssignment);
              }

              token = lex();
              right = parseAssignmentExpression();
              node = delegate.markEnd(delegate.createAssignmentExpression(token.value, left, right), startToken);
          }

          return node;
      }

      // 11.14 Comma Operator

      function parseExpression() {
          var expr, startToken = lookahead;

          expr = parseAssignmentExpression();

          if (match(',')) {
              expr = delegate.createSequenceExpression([ expr ]);

              while (index < length) {
                  if (!match(',')) {
                      break;
                  }
                  lex();
                  expr.expressions.push(parseAssignmentExpression());
              }

              delegate.markEnd(expr, startToken);
          }

          return expr;
      }

      // 12.1 Block

      function parseStatementList() {
          var list = [],
              statement;

          while (index < length) {
              if (match('}')) {
                  break;
              }
              statement = parseSourceElement();
              if (typeof statement === 'undefined') {
                  break;
              }
              list.push(statement);
          }

          return list;
      }

      function parseBlock() {
          var block, startToken;

          startToken = lookahead;
          expect('{');

          block = parseStatementList();

          expect('}');

          return delegate.markEnd(delegate.createBlockStatement(block), startToken);
      }

      // 12.2 Variable Statement

      function parseVariableIdentifier() {
          var token, startToken;

          startToken = lookahead;
          token = lex();

          if (token.type !== Token.Identifier) {
              throwUnexpected(token);
          }

          return delegate.markEnd(delegate.createIdentifier(token.value), startToken);
      }

      function parseVariableDeclaration(kind) {
          var init = null, id, startToken;

          startToken = lookahead;
          id = parseVariableIdentifier();

          // 12.2.1
          if (strict && isRestrictedWord(id.name)) {
              throwErrorTolerant({}, Messages.StrictVarName);
          }

          if (kind === 'const') {
              expect('=');
              init = parseAssignmentExpression();
          } else if (match('=')) {
              lex();
              init = parseAssignmentExpression();
          }

          return delegate.markEnd(delegate.createVariableDeclarator(id, init), startToken);
      }

      function parseVariableDeclarationList(kind) {
          var list = [];

          do {
              list.push(parseVariableDeclaration(kind));
              if (!match(',')) {
                  break;
              }
              lex();
          } while (index < length);

          return list;
      }

      function parseVariableStatement() {
          var declarations;

          expectKeyword('var');

          declarations = parseVariableDeclarationList();

          consumeSemicolon();

          return delegate.createVariableDeclaration(declarations, 'var');
      }

      // kind may be `const` or `let`
      // Both are experimental and not in the specification yet.
      // see http://wiki.ecmascript.org/doku.php?id=harmony:const
      // and http://wiki.ecmascript.org/doku.php?id=harmony:let
      function parseConstLetDeclaration(kind) {
          var declarations, startToken;

          startToken = lookahead;

          expectKeyword(kind);

          declarations = parseVariableDeclarationList(kind);

          consumeSemicolon();

          return delegate.markEnd(delegate.createVariableDeclaration(declarations, kind), startToken);
      }

      // 12.3 Empty Statement

      function parseEmptyStatement() {
          expect(';');
          return delegate.createEmptyStatement();
      }

      // 12.4 Expression Statement

      function parseExpressionStatement() {
          var expr = parseExpression();
          consumeSemicolon();
          return delegate.createExpressionStatement(expr);
      }

      // 12.5 If statement

      function parseIfStatement() {
          var test, consequent, alternate;

          expectKeyword('if');

          expect('(');

          test = parseExpression();

          expect(')');

          consequent = parseStatement();

          if (matchKeyword('else')) {
              lex();
              alternate = parseStatement();
          } else {
              alternate = null;
          }

          return delegate.createIfStatement(test, consequent, alternate);
      }

      // 12.6 Iteration Statements

      function parseDoWhileStatement() {
          var body, test, oldInIteration;

          expectKeyword('do');

          oldInIteration = state.inIteration;
          state.inIteration = true;

          body = parseStatement();

          state.inIteration = oldInIteration;

          expectKeyword('while');

          expect('(');

          test = parseExpression();

          expect(')');

          if (match(';')) {
              lex();
          }

          return delegate.createDoWhileStatement(body, test);
      }

      function parseWhileStatement() {
          var test, body, oldInIteration;

          expectKeyword('while');

          expect('(');

          test = parseExpression();

          expect(')');

          oldInIteration = state.inIteration;
          state.inIteration = true;

          body = parseStatement();

          state.inIteration = oldInIteration;

          return delegate.createWhileStatement(test, body);
      }

      function parseForVariableDeclaration() {
          var token, declarations, startToken;

          startToken = lookahead;
          token = lex();
          declarations = parseVariableDeclarationList();

          return delegate.markEnd(delegate.createVariableDeclaration(declarations, token.value), startToken);
      }

      function parseForStatement() {
          var init, test, update, left, right, body, oldInIteration;

          init = test = update = null;

          expectKeyword('for');

          expect('(');

          if (match(';')) {
              lex();
          } else {
              if (matchKeyword('var') || matchKeyword('let')) {
                  state.allowIn = false;
                  init = parseForVariableDeclaration();
                  state.allowIn = true;

                  if (init.declarations.length === 1 && matchKeyword('in')) {
                      lex();
                      left = init;
                      right = parseExpression();
                      init = null;
                  }
              } else {
                  state.allowIn = false;
                  init = parseExpression();
                  state.allowIn = true;

                  if (matchKeyword('in')) {
                      // LeftHandSideExpression
                      if (!isLeftHandSide(init)) {
                          throwErrorTolerant({}, Messages.InvalidLHSInForIn);
                      }

                      lex();
                      left = init;
                      right = parseExpression();
                      init = null;
                  }
              }

              if (typeof left === 'undefined') {
                  expect(';');
              }
          }

          if (typeof left === 'undefined') {

              if (!match(';')) {
                  test = parseExpression();
              }
              expect(';');

              if (!match(')')) {
                  update = parseExpression();
              }
          }

          expect(')');

          oldInIteration = state.inIteration;
          state.inIteration = true;

          body = parseStatement();

          state.inIteration = oldInIteration;

          return (typeof left === 'undefined') ?
                  delegate.createForStatement(init, test, update, body) :
                  delegate.createForInStatement(left, right, body);
      }

      // 12.7 The continue statement

      function parseContinueStatement() {
          var label = null, key;

          expectKeyword('continue');

          // Optimize the most common form: 'continue;'.
          if (source.charCodeAt(index) === 0x3B) {
              lex();

              if (!state.inIteration) {
                  throwError({}, Messages.IllegalContinue);
              }

              return delegate.createContinueStatement(null);
          }

          if (peekLineTerminator()) {
              if (!state.inIteration) {
                  throwError({}, Messages.IllegalContinue);
              }

              return delegate.createContinueStatement(null);
          }

          if (lookahead.type === Token.Identifier) {
              label = parseVariableIdentifier();

              key = '$' + label.name;
              if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
                  throwError({}, Messages.UnknownLabel, label.name);
              }
          }

          consumeSemicolon();

          if (label === null && !state.inIteration) {
              throwError({}, Messages.IllegalContinue);
          }

          return delegate.createContinueStatement(label);
      }

      // 12.8 The break statement

      function parseBreakStatement() {
          var label = null, key;

          expectKeyword('break');

          // Catch the very common case first: immediately a semicolon (U+003B).
          if (source.charCodeAt(index) === 0x3B) {
              lex();

              if (!(state.inIteration || state.inSwitch)) {
                  throwError({}, Messages.IllegalBreak);
              }

              return delegate.createBreakStatement(null);
          }

          if (peekLineTerminator()) {
              if (!(state.inIteration || state.inSwitch)) {
                  throwError({}, Messages.IllegalBreak);
              }

              return delegate.createBreakStatement(null);
          }

          if (lookahead.type === Token.Identifier) {
              label = parseVariableIdentifier();

              key = '$' + label.name;
              if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
                  throwError({}, Messages.UnknownLabel, label.name);
              }
          }

          consumeSemicolon();

          if (label === null && !(state.inIteration || state.inSwitch)) {
              throwError({}, Messages.IllegalBreak);
          }

          return delegate.createBreakStatement(label);
      }

      // 12.9 The return statement

      function parseReturnStatement() {
          var argument = null;

          expectKeyword('return');

          if (!state.inFunctionBody) {
              throwErrorTolerant({}, Messages.IllegalReturn);
          }

          // 'return' followed by a space and an identifier is very common.
          if (source.charCodeAt(index) === 0x20) {
              if (isIdentifierStart(source.charCodeAt(index + 1))) {
                  argument = parseExpression();
                  consumeSemicolon();
                  return delegate.createReturnStatement(argument);
              }
          }

          if (peekLineTerminator()) {
              return delegate.createReturnStatement(null);
          }

          if (!match(';')) {
              if (!match('}') && lookahead.type !== Token.EOF) {
                  argument = parseExpression();
              }
          }

          consumeSemicolon();

          return delegate.createReturnStatement(argument);
      }

      // 12.10 The with statement

      function parseWithStatement() {
          var object, body;

          if (strict) {
              // TODO(ikarienator): Should we update the test cases instead?
              skipComment();
              throwErrorTolerant({}, Messages.StrictModeWith);
          }

          expectKeyword('with');

          expect('(');

          object = parseExpression();

          expect(')');

          body = parseStatement();

          return delegate.createWithStatement(object, body);
      }

      // 12.10 The swith statement

      function parseSwitchCase() {
          var test, consequent = [], statement, startToken;

          startToken = lookahead;
          if (matchKeyword('default')) {
              lex();
              test = null;
          } else {
              expectKeyword('case');
              test = parseExpression();
          }
          expect(':');

          while (index < length) {
              if (match('}') || matchKeyword('default') || matchKeyword('case')) {
                  break;
              }
              statement = parseStatement();
              consequent.push(statement);
          }

          return delegate.markEnd(delegate.createSwitchCase(test, consequent), startToken);
      }

      function parseSwitchStatement() {
          var discriminant, cases, clause, oldInSwitch, defaultFound;

          expectKeyword('switch');

          expect('(');

          discriminant = parseExpression();

          expect(')');

          expect('{');

          cases = [];

          if (match('}')) {
              lex();
              return delegate.createSwitchStatement(discriminant, cases);
          }

          oldInSwitch = state.inSwitch;
          state.inSwitch = true;
          defaultFound = false;

          while (index < length) {
              if (match('}')) {
                  break;
              }
              clause = parseSwitchCase();
              if (clause.test === null) {
                  if (defaultFound) {
                      throwError({}, Messages.MultipleDefaultsInSwitch);
                  }
                  defaultFound = true;
              }
              cases.push(clause);
          }

          state.inSwitch = oldInSwitch;

          expect('}');

          return delegate.createSwitchStatement(discriminant, cases);
      }

      // 12.13 The throw statement

      function parseThrowStatement() {
          var argument;

          expectKeyword('throw');

          if (peekLineTerminator()) {
              throwError({}, Messages.NewlineAfterThrow);
          }

          argument = parseExpression();

          consumeSemicolon();

          return delegate.createThrowStatement(argument);
      }

      // 12.14 The try statement

      function parseCatchClause() {
          var param, body, startToken;

          startToken = lookahead;
          expectKeyword('catch');

          expect('(');
          if (match(')')) {
              throwUnexpected(lookahead);
          }

          param = parseVariableIdentifier();
          // 12.14.1
          if (strict && isRestrictedWord(param.name)) {
              throwErrorTolerant({}, Messages.StrictCatchVariable);
          }

          expect(')');
          body = parseBlock();
          return delegate.markEnd(delegate.createCatchClause(param, body), startToken);
      }

      function parseTryStatement() {
          var block, handlers = [], finalizer = null;

          expectKeyword('try');

          block = parseBlock();

          if (matchKeyword('catch')) {
              handlers.push(parseCatchClause());
          }

          if (matchKeyword('finally')) {
              lex();
              finalizer = parseBlock();
          }

          if (handlers.length === 0 && !finalizer) {
              throwError({}, Messages.NoCatchOrFinally);
          }

          return delegate.createTryStatement(block, [], handlers, finalizer);
      }

      // 12.15 The debugger statement

      function parseDebuggerStatement() {
          expectKeyword('debugger');

          consumeSemicolon();

          return delegate.createDebuggerStatement();
      }

      // 12 Statements

      function parseStatement() {
          var type = lookahead.type,
              expr,
              labeledBody,
              key,
              startToken;

          if (type === Token.EOF) {
              throwUnexpected(lookahead);
          }

          if (type === Token.Punctuator && lookahead.value === '{') {
              return parseBlock();
          }

          startToken = lookahead;

          if (type === Token.Punctuator) {
              switch (lookahead.value) {
              case ';':
                  return delegate.markEnd(parseEmptyStatement(), startToken);
              case '(':
                  return delegate.markEnd(parseExpressionStatement(), startToken);
              default:
                  break;
              }
          }

          if (type === Token.Keyword) {
              switch (lookahead.value) {
              case 'break':
                  return delegate.markEnd(parseBreakStatement(), startToken);
              case 'continue':
                  return delegate.markEnd(parseContinueStatement(), startToken);
              case 'debugger':
                  return delegate.markEnd(parseDebuggerStatement(), startToken);
              case 'do':
                  return delegate.markEnd(parseDoWhileStatement(), startToken);
              case 'for':
                  return delegate.markEnd(parseForStatement(), startToken);
              case 'function':
                  return delegate.markEnd(parseFunctionDeclaration(), startToken);
              case 'if':
                  return delegate.markEnd(parseIfStatement(), startToken);
              case 'return':
                  return delegate.markEnd(parseReturnStatement(), startToken);
              case 'switch':
                  return delegate.markEnd(parseSwitchStatement(), startToken);
              case 'throw':
                  return delegate.markEnd(parseThrowStatement(), startToken);
              case 'try':
                  return delegate.markEnd(parseTryStatement(), startToken);
              case 'var':
                  return delegate.markEnd(parseVariableStatement(), startToken);
              case 'while':
                  return delegate.markEnd(parseWhileStatement(), startToken);
              case 'with':
                  return delegate.markEnd(parseWithStatement(), startToken);
              default:
                  break;
              }
          }

          expr = parseExpression();

          // 12.12 Labelled Statements
          if ((expr.type === Syntax.Identifier) && match(':')) {
              lex();

              key = '$' + expr.name;
              if (Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
                  throwError({}, Messages.Redeclaration, 'Label', expr.name);
              }

              state.labelSet[key] = true;
              labeledBody = parseStatement();
              delete state.labelSet[key];
              return delegate.markEnd(delegate.createLabeledStatement(expr, labeledBody), startToken);
          }

          consumeSemicolon();

          return delegate.markEnd(delegate.createExpressionStatement(expr), startToken);
      }

      // 13 Function Definition

      function parseFunctionSourceElements() {
          var sourceElement, sourceElements = [], token, directive, firstRestricted,
              oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody, startToken;

          startToken = lookahead;
          expect('{');

          while (index < length) {
              if (lookahead.type !== Token.StringLiteral) {
                  break;
              }
              token = lookahead;

              sourceElement = parseSourceElement();
              sourceElements.push(sourceElement);
              if (sourceElement.expression.type !== Syntax.Literal) {
                  // this is not directive
                  break;
              }
              directive = source.slice(token.start + 1, token.end - 1);
              if (directive === 'use strict') {
                  strict = true;
                  if (firstRestricted) {
                      throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                  }
              } else {
                  if (!firstRestricted && token.octal) {
                      firstRestricted = token;
                  }
              }
          }

          oldLabelSet = state.labelSet;
          oldInIteration = state.inIteration;
          oldInSwitch = state.inSwitch;
          oldInFunctionBody = state.inFunctionBody;

          state.labelSet = {};
          state.inIteration = false;
          state.inSwitch = false;
          state.inFunctionBody = true;

          while (index < length) {
              if (match('}')) {
                  break;
              }
              sourceElement = parseSourceElement();
              if (typeof sourceElement === 'undefined') {
                  break;
              }
              sourceElements.push(sourceElement);
          }

          expect('}');

          state.labelSet = oldLabelSet;
          state.inIteration = oldInIteration;
          state.inSwitch = oldInSwitch;
          state.inFunctionBody = oldInFunctionBody;

          return delegate.markEnd(delegate.createBlockStatement(sourceElements), startToken);
      }

      function parseParams(firstRestricted) {
          var param, params = [], token, stricted, paramSet, key, message;
          expect('(');

          if (!match(')')) {
              paramSet = {};
              while (index < length) {
                  token = lookahead;
                  param = parseVariableIdentifier();
                  key = '$' + token.value;
                  if (strict) {
                      if (isRestrictedWord(token.value)) {
                          stricted = token;
                          message = Messages.StrictParamName;
                      }
                      if (Object.prototype.hasOwnProperty.call(paramSet, key)) {
                          stricted = token;
                          message = Messages.StrictParamDupe;
                      }
                  } else if (!firstRestricted) {
                      if (isRestrictedWord(token.value)) {
                          firstRestricted = token;
                          message = Messages.StrictParamName;
                      } else if (isStrictModeReservedWord(token.value)) {
                          firstRestricted = token;
                          message = Messages.StrictReservedWord;
                      } else if (Object.prototype.hasOwnProperty.call(paramSet, key)) {
                          firstRestricted = token;
                          message = Messages.StrictParamDupe;
                      }
                  }
                  params.push(param);
                  paramSet[key] = true;
                  if (match(')')) {
                      break;
                  }
                  expect(',');
              }
          }

          expect(')');

          return {
              params: params,
              stricted: stricted,
              firstRestricted: firstRestricted,
              message: message
          };
      }

      function parseFunctionDeclaration() {
          var id, params = [], body, token, stricted, tmp, firstRestricted, message, previousStrict, startToken;

          startToken = lookahead;

          expectKeyword('function');
          token = lookahead;
          id = parseVariableIdentifier();
          if (strict) {
              if (isRestrictedWord(token.value)) {
                  throwErrorTolerant(token, Messages.StrictFunctionName);
              }
          } else {
              if (isRestrictedWord(token.value)) {
                  firstRestricted = token;
                  message = Messages.StrictFunctionName;
              } else if (isStrictModeReservedWord(token.value)) {
                  firstRestricted = token;
                  message = Messages.StrictReservedWord;
              }
          }

          tmp = parseParams(firstRestricted);
          params = tmp.params;
          stricted = tmp.stricted;
          firstRestricted = tmp.firstRestricted;
          if (tmp.message) {
              message = tmp.message;
          }

          previousStrict = strict;
          body = parseFunctionSourceElements();
          if (strict && firstRestricted) {
              throwError(firstRestricted, message);
          }
          if (strict && stricted) {
              throwErrorTolerant(stricted, message);
          }
          strict = previousStrict;

          return delegate.markEnd(delegate.createFunctionDeclaration(id, params, [], body), startToken);
      }

      function parseFunctionExpression() {
          var token, id = null, stricted, firstRestricted, message, tmp, params = [], body, previousStrict, startToken;

          startToken = lookahead;
          expectKeyword('function');

          if (!match('(')) {
              token = lookahead;
              id = parseVariableIdentifier();
              if (strict) {
                  if (isRestrictedWord(token.value)) {
                      throwErrorTolerant(token, Messages.StrictFunctionName);
                  }
              } else {
                  if (isRestrictedWord(token.value)) {
                      firstRestricted = token;
                      message = Messages.StrictFunctionName;
                  } else if (isStrictModeReservedWord(token.value)) {
                      firstRestricted = token;
                      message = Messages.StrictReservedWord;
                  }
              }
          }

          tmp = parseParams(firstRestricted);
          params = tmp.params;
          stricted = tmp.stricted;
          firstRestricted = tmp.firstRestricted;
          if (tmp.message) {
              message = tmp.message;
          }

          previousStrict = strict;
          body = parseFunctionSourceElements();
          if (strict && firstRestricted) {
              throwError(firstRestricted, message);
          }
          if (strict && stricted) {
              throwErrorTolerant(stricted, message);
          }
          strict = previousStrict;

          return delegate.markEnd(delegate.createFunctionExpression(id, params, [], body), startToken);
      }

      // 14 Program

      function parseSourceElement() {
          if (lookahead.type === Token.Keyword) {
              switch (lookahead.value) {
              case 'const':
              case 'let':
                  return parseConstLetDeclaration(lookahead.value);
              case 'function':
                  return parseFunctionDeclaration();
              default:
                  return parseStatement();
              }
          }

          if (lookahead.type !== Token.EOF) {
              return parseStatement();
          }
      }

      function parseSourceElements() {
          var sourceElement, sourceElements = [], token, directive, firstRestricted;

          while (index < length) {
              token = lookahead;
              if (token.type !== Token.StringLiteral) {
                  break;
              }

              sourceElement = parseSourceElement();
              sourceElements.push(sourceElement);
              if (sourceElement.expression.type !== Syntax.Literal) {
                  // this is not directive
                  break;
              }
              directive = source.slice(token.start + 1, token.end - 1);
              if (directive === 'use strict') {
                  strict = true;
                  if (firstRestricted) {
                      throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                  }
              } else {
                  if (!firstRestricted && token.octal) {
                      firstRestricted = token;
                  }
              }
          }

          while (index < length) {
              sourceElement = parseSourceElement();
              /* istanbul ignore if */
              if (typeof sourceElement === 'undefined') {
                  break;
              }
              sourceElements.push(sourceElement);
          }
          return sourceElements;
      }

      function parseProgram() {
          var body, startToken;

          skipComment();
          peek();
          startToken = lookahead;
          strict = false;

          body = parseSourceElements();
          return delegate.markEnd(delegate.createProgram(body), startToken);
      }

      function filterTokenLocation() {
          var i, entry, token, tokens = [];

          for (i = 0; i < extra.tokens.length; ++i) {
              entry = extra.tokens[i];
              token = {
                  type: entry.type,
                  value: entry.value
              };
              if (extra.range) {
                  token.range = entry.range;
              }
              if (extra.loc) {
                  token.loc = entry.loc;
              }
              tokens.push(token);
          }

          extra.tokens = tokens;
      }

      function tokenize(code, options) {
          var toString,
              token,
              tokens;

          toString = String;
          if (typeof code !== 'string' && !(code instanceof String)) {
              code = toString(code);
          }

          delegate = SyntaxTreeDelegate;
          source = code;
          index = 0;
          lineNumber = (source.length > 0) ? 1 : 0;
          lineStart = 0;
          length = source.length;
          lookahead = null;
          state = {
              allowIn: true,
              labelSet: {},
              inFunctionBody: false,
              inIteration: false,
              inSwitch: false,
              lastCommentStart: -1
          };

          extra = {};

          // Options matching.
          options = options || {};

          // Of course we collect tokens here.
          options.tokens = true;
          extra.tokens = [];
          extra.tokenize = true;
          // The following two fields are necessary to compute the Regex tokens.
          extra.openParenToken = -1;
          extra.openCurlyToken = -1;

          extra.range = (typeof options.range === 'boolean') && options.range;
          extra.loc = (typeof options.loc === 'boolean') && options.loc;

          if (typeof options.comment === 'boolean' && options.comment) {
              extra.comments = [];
          }
          if (typeof options.tolerant === 'boolean' && options.tolerant) {
              extra.errors = [];
          }

          try {
              peek();
              if (lookahead.type === Token.EOF) {
                  return extra.tokens;
              }

              token = lex();
              while (lookahead.type !== Token.EOF) {
                  try {
                      token = lex();
                  } catch (lexError) {
                      token = lookahead;
                      if (extra.errors) {
                          extra.errors.push(lexError);
                          // We have to break on the first error
                          // to avoid infinite loops.
                          break;
                      } else {
                          throw lexError;
                      }
                  }
              }

              filterTokenLocation();
              tokens = extra.tokens;
              if (typeof extra.comments !== 'undefined') {
                  tokens.comments = extra.comments;
              }
              if (typeof extra.errors !== 'undefined') {
                  tokens.errors = extra.errors;
              }
          } catch (e) {
              throw e;
          } finally {
              extra = {};
          }
          return tokens;
      }

      function parse(code, options) {
          var program, toString;

          toString = String;
          if (typeof code !== 'string' && !(code instanceof String)) {
              code = toString(code);
          }

          delegate = SyntaxTreeDelegate;
          source = code;
          index = 0;
          lineNumber = (source.length > 0) ? 1 : 0;
          lineStart = 0;
          length = source.length;
          lookahead = null;
          state = {
              allowIn: true,
              labelSet: {},
              inFunctionBody: false,
              inIteration: false,
              inSwitch: false,
              lastCommentStart: -1
          };

          extra = {};
          if (typeof options !== 'undefined') {
              extra.range = (typeof options.range === 'boolean') && options.range;
              extra.loc = (typeof options.loc === 'boolean') && options.loc;
              extra.attachComment = (typeof options.attachComment === 'boolean') && options.attachComment;

              if (extra.loc && options.source !== null && options.source !== undefined) {
                  extra.source = toString(options.source);
              }

              if (typeof options.tokens === 'boolean' && options.tokens) {
                  extra.tokens = [];
              }
              if (typeof options.comment === 'boolean' && options.comment) {
                  extra.comments = [];
              }
              if (typeof options.tolerant === 'boolean' && options.tolerant) {
                  extra.errors = [];
              }
              if (extra.attachComment) {
                  extra.range = true;
                  extra.comments = [];
                  extra.bottomRightStack = [];
                  extra.trailingComments = [];
                  extra.leadingComments = [];
              }
          }

          try {
              program = parseProgram();
              if (typeof extra.comments !== 'undefined') {
                  program.comments = extra.comments;
              }
              if (typeof extra.tokens !== 'undefined') {
                  filterTokenLocation();
                  program.tokens = extra.tokens;
              }
              if (typeof extra.errors !== 'undefined') {
                  program.errors = extra.errors;
              }
          } catch (e) {
              throw e;
          } finally {
              extra = {};
          }

          return program;
      }

      // Sync with *.json manifests.
      exports.version = '1.2.2';

      exports.tokenize = tokenize;

      exports.parse = parse;

      // Deep copy.
     /* istanbul ignore next */
      exports.Syntax = (function () {
          var name, types = {};

          if (typeof Object.create === 'function') {
              types = Object.create(null);
          }

          for (name in Syntax) {
              if (Syntax.hasOwnProperty(name)) {
                  types[name] = Syntax[name];
              }
          }

          if (typeof Object.freeze === 'function') {
              Object.freeze(types);
          }

          return types;
      }());

  }));
  /* vim: set sw=4 ts=4 et tw=80 : */

  },{}],1:[function(require,module,exports){
  (function (process){
  /* parser generated by jison 0.4.13 */
  /*
    Returns a Parser object of the following structure:

    Parser: {
      yy: {}
    }

    Parser.prototype: {
      yy: {},
      trace: function(),
      symbols_: {associative list: name ==> number},
      terminals_: {associative list: number ==> name},
      productions_: [...],
      performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
      table: [...],
      defaultActions: {...},
      parseError: function(str, hash),
      parse: function(input),

      lexer: {
          EOF: 1,
          parseError: function(str, hash),
          setInput: function(input),
          input: function(),
          unput: function(str),
          more: function(),
          less: function(n),
          pastInput: function(),
          upcomingInput: function(),
          showPosition: function(),
          test_match: function(regex_match_array, rule_index),
          next: function(),
          lex: function(),
          begin: function(condition),
          popState: function(),
          _currentRules: function(),
          topState: function(),
          pushState: function(condition),

          options: {
              ranges: boolean           (optional: true ==> token location info will include a .range[] member)
              flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
              backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
          },

          performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
          rules: [...],
          conditions: {associative list: name ==> set},
      }
    }


    token location info (@$, _$, etc.): {
      first_line: n,
      last_line: n,
      first_column: n,
      last_column: n,
      range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
    }


    the parseError function receives a 'hash' object with these members for lexer and parser errors: {
      text:        (matched text)
      token:       (the produced terminal token, if any)
      line:        (yylineno)
    }
    while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
      loc:         (yylloc)
      expected:    (string describing the set of expected tokens)
      recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
    }
  */
  var parser = (function(){
  var parser = {trace: function trace() { },
  yy: {},
  symbols_: {"error":2,"JSON_PATH":3,"DOLLAR":4,"PATH_COMPONENTS":5,"LEADING_CHILD_MEMBER_EXPRESSION":6,"PATH_COMPONENT":7,"MEMBER_COMPONENT":8,"SUBSCRIPT_COMPONENT":9,"CHILD_MEMBER_COMPONENT":10,"DESCENDANT_MEMBER_COMPONENT":11,"DOT":12,"MEMBER_EXPRESSION":13,"DOT_DOT":14,"STAR":15,"IDENTIFIER":16,"SCRIPT_EXPRESSION":17,"INTEGER":18,"END":19,"CHILD_SUBSCRIPT_COMPONENT":20,"DESCENDANT_SUBSCRIPT_COMPONENT":21,"[":22,"SUBSCRIPT":23,"]":24,"SUBSCRIPT_EXPRESSION":25,"SUBSCRIPT_EXPRESSION_LIST":26,"SUBSCRIPT_EXPRESSION_LISTABLE":27,",":28,"STRING_LITERAL":29,"ARRAY_SLICE":30,"FILTER_EXPRESSION":31,"QQ_STRING":32,"Q_STRING":33,"$accept":0,"$end":1},
  terminals_: {2:"error",4:"DOLLAR",12:"DOT",14:"DOT_DOT",15:"STAR",16:"IDENTIFIER",17:"SCRIPT_EXPRESSION",18:"INTEGER",19:"END",22:"[",24:"]",28:",",30:"ARRAY_SLICE",31:"FILTER_EXPRESSION",32:"QQ_STRING",33:"Q_STRING"},
  productions_: [0,[3,1],[3,2],[3,1],[3,2],[5,1],[5,2],[7,1],[7,1],[8,1],[8,1],[10,2],[6,1],[11,2],[13,1],[13,1],[13,1],[13,1],[13,1],[9,1],[9,1],[20,3],[21,4],[23,1],[23,1],[26,1],[26,3],[27,1],[27,1],[27,1],[25,1],[25,1],[25,1],[29,1],[29,1]],
  performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */
  /**/) {
  /* this == yyval */
  if (!yy.ast) {
      yy.ast = _ast;
      _ast.initialize();
  }

  var $0 = $$.length - 1;
  switch (yystate) {
  case 1:yy.ast.set({ expression: { type: "root", value: $$[$0] } }); yy.ast.unshift(); return yy.ast.yield()
  break;
  case 2:yy.ast.set({ expression: { type: "root", value: $$[$0-1] } }); yy.ast.unshift(); return yy.ast.yield()
  break;
  case 3:yy.ast.unshift(); return yy.ast.yield()
  break;
  case 4:yy.ast.set({ operation: "member", scope: "child", expression: { type: "identifier", value: $$[$0-1] }}); yy.ast.unshift(); return yy.ast.yield()
  break;
  case 5:
  break;
  case 6:
  break;
  case 7:yy.ast.set({ operation: "member" }); yy.ast.push();
  break;
  case 8:yy.ast.set({ operation: "subscript" }); yy.ast.push();
  break;
  case 9:yy.ast.set({ scope: "child" });
  break;
  case 10:yy.ast.set({ scope: "descendant" });
  break;
  case 11:
  break;
  case 12:yy.ast.set({ scope: "child", operation: "member" });
  break;
  case 13:
  break;
  case 14:yy.ast.set({ expression: { type: "wildcard", value: $$[$0] } });
  break;
  case 15:yy.ast.set({ expression: { type: "identifier", value: $$[$0] } });
  break;
  case 16:yy.ast.set({ expression: { type: "script_expression", value: $$[$0] } });
  break;
  case 17:yy.ast.set({ expression: { type: "numeric_literal", value: parseInt($$[$0]) } });
  break;
  case 18:
  break;
  case 19:yy.ast.set({ scope: "child" });
  break;
  case 20:yy.ast.set({ scope: "descendant" });
  break;
  case 21:
  break;
  case 22:
  break;
  case 23:
  break;
  case 24:$$[$0].length > 1? yy.ast.set({ expression: { type: "union", value: $$[$0] } }) : this.$ = $$[$0];
  break;
  case 25:this.$ = [$$[$0]];
  break;
  case 26:this.$ = $$[$0-2].concat($$[$0]);
  break;
  case 27:this.$ = { expression: { type: "numeric_literal", value: parseInt($$[$0]) } }; yy.ast.set(this.$);
  break;
  case 28:this.$ = { expression: { type: "string_literal", value: $$[$0] } }; yy.ast.set(this.$);
  break;
  case 29:this.$ = { expression: { type: "slice", value: $$[$0] } }; yy.ast.set(this.$);
  break;
  case 30:this.$ = { expression: { type: "wildcard", value: $$[$0] } }; yy.ast.set(this.$);
  break;
  case 31:this.$ = { expression: { type: "script_expression", value: $$[$0] } }; yy.ast.set(this.$);
  break;
  case 32:this.$ = { expression: { type: "filter_expression", value: $$[$0] } }; yy.ast.set(this.$);
  break;
  case 33:this.$ = $$[$0];
  break;
  case 34:this.$ = $$[$0];
  break;
  }
  },
  table: [{3:1,4:[1,2],6:3,13:4,15:[1,5],16:[1,6],17:[1,7],18:[1,8],19:[1,9]},{1:[3]},{1:[2,1],5:10,7:11,8:12,9:13,10:14,11:15,12:[1,18],14:[1,19],20:16,21:17,22:[1,20]},{1:[2,3],5:21,7:11,8:12,9:13,10:14,11:15,12:[1,18],14:[1,19],20:16,21:17,22:[1,20]},{1:[2,12],12:[2,12],14:[2,12],22:[2,12]},{1:[2,14],12:[2,14],14:[2,14],22:[2,14]},{1:[2,15],12:[2,15],14:[2,15],22:[2,15]},{1:[2,16],12:[2,16],14:[2,16],22:[2,16]},{1:[2,17],12:[2,17],14:[2,17],22:[2,17]},{1:[2,18],12:[2,18],14:[2,18],22:[2,18]},{1:[2,2],7:22,8:12,9:13,10:14,11:15,12:[1,18],14:[1,19],20:16,21:17,22:[1,20]},{1:[2,5],12:[2,5],14:[2,5],22:[2,5]},{1:[2,7],12:[2,7],14:[2,7],22:[2,7]},{1:[2,8],12:[2,8],14:[2,8],22:[2,8]},{1:[2,9],12:[2,9],14:[2,9],22:[2,9]},{1:[2,10],12:[2,10],14:[2,10],22:[2,10]},{1:[2,19],12:[2,19],14:[2,19],22:[2,19]},{1:[2,20],12:[2,20],14:[2,20],22:[2,20]},{13:23,15:[1,5],16:[1,6],17:[1,7],18:[1,8],19:[1,9]},{13:24,15:[1,5],16:[1,6],17:[1,7],18:[1,8],19:[1,9],22:[1,25]},{15:[1,29],17:[1,30],18:[1,33],23:26,25:27,26:28,27:32,29:34,30:[1,35],31:[1,31],32:[1,36],33:[1,37]},{1:[2,4],7:22,8:12,9:13,10:14,11:15,12:[1,18],14:[1,19],20:16,21:17,22:[1,20]},{1:[2,6],12:[2,6],14:[2,6],22:[2,6]},{1:[2,11],12:[2,11],14:[2,11],22:[2,11]},{1:[2,13],12:[2,13],14:[2,13],22:[2,13]},{15:[1,29],17:[1,30],18:[1,33],23:38,25:27,26:28,27:32,29:34,30:[1,35],31:[1,31],32:[1,36],33:[1,37]},{24:[1,39]},{24:[2,23]},{24:[2,24],28:[1,40]},{24:[2,30]},{24:[2,31]},{24:[2,32]},{24:[2,25],28:[2,25]},{24:[2,27],28:[2,27]},{24:[2,28],28:[2,28]},{24:[2,29],28:[2,29]},{24:[2,33],28:[2,33]},{24:[2,34],28:[2,34]},{24:[1,41]},{1:[2,21],12:[2,21],14:[2,21],22:[2,21]},{18:[1,33],27:42,29:34,30:[1,35],32:[1,36],33:[1,37]},{1:[2,22],12:[2,22],14:[2,22],22:[2,22]},{24:[2,26],28:[2,26]}],
  defaultActions: {27:[2,23],29:[2,30],30:[2,31],31:[2,32]},
  parseError: function parseError(str, hash) {
      if (hash.recoverable) {
          this.trace(str);
      } else {
          throw new Error(str);
      }
  },
  parse: function parse(input) {
      var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, TERROR = 2, EOF = 1;
      var args = lstack.slice.call(arguments, 1);
      this.lexer.setInput(input);
      this.lexer.yy = this.yy;
      this.yy.lexer = this.lexer;
      this.yy.parser = this;
      if (typeof this.lexer.yylloc == 'undefined') {
          this.lexer.yylloc = {};
      }
      var yyloc = this.lexer.yylloc;
      lstack.push(yyloc);
      var ranges = this.lexer.options && this.lexer.options.ranges;
      if (typeof this.yy.parseError === 'function') {
          this.parseError = this.yy.parseError;
      } else {
          this.parseError = Object.getPrototypeOf(this).parseError;
      }
      function lex() {
          var token;
          token = self.lexer.lex() || EOF;
          if (typeof token !== 'number') {
              token = self.symbols_[token] || token;
          }
          return token;
      }
      var symbol, preErrorSymbol, state, action, r, yyval = {}, p, len, newState, expected;
      while (true) {
          state = stack[stack.length - 1];
          if (this.defaultActions[state]) {
              action = this.defaultActions[state];
          } else {
              if (symbol === null || typeof symbol == 'undefined') {
                  symbol = lex();
              }
              action = table[state] && table[state][symbol];
          }
                      if (typeof action === 'undefined' || !action.length || !action[0]) {
                  var errStr = '';
                  expected = [];
                  for (p in table[state]) {
                      if (this.terminals_[p] && p > TERROR) {
                          expected.push('\'' + this.terminals_[p] + '\'');
                      }
                  }
                  if (this.lexer.showPosition) {
                      errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + this.lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                  } else {
                      errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                  }
                  this.parseError(errStr, {
                      text: this.lexer.match,
                      token: this.terminals_[symbol] || symbol,
                      line: this.lexer.yylineno,
                      loc: yyloc,
                      expected: expected
                  });
              }
          if (action[0] instanceof Array && action.length > 1) {
              throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
          }
          switch (action[0]) {
          case 1:
              stack.push(symbol);
              vstack.push(this.lexer.yytext);
              lstack.push(this.lexer.yylloc);
              stack.push(action[1]);
              symbol = null;
              if (!preErrorSymbol) {
                  yyleng = this.lexer.yyleng;
                  yytext = this.lexer.yytext;
                  yylineno = this.lexer.yylineno;
                  yyloc = this.lexer.yylloc;
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
                  this.yy,
                  action[1],
                  vstack,
                  lstack
              ].concat(args));
              if (typeof r !== 'undefined') {
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
  }};
  var _ast = {

    initialize: function() {
      this._nodes = [];
      this._node = {};
      this._stash = [];
    },

    set: function(props) {
      for (var k in props) this._node[k] = props[k];
      return this._node;
    },

    node: function(obj) {
      if (arguments.length) this._node = obj;
      return this._node;
    },

    push: function() {
      this._nodes.push(this._node);
      this._node = {};
    },

    unshift: function() {
      this._nodes.unshift(this._node);
      this._node = {};
    },

    yield: function() {
      var _nodes = this._nodes;
      this.initialize();
      return _nodes;
    }
  };
  /* generated by jison-lex 0.2.1 */
  var lexer = (function(){
  var lexer = {

  EOF:1,

  parseError:function parseError(str, hash) {
          if (this.yy.parser) {
              this.yy.parser.parseError(str, hash);
          } else {
              throw new Error(str);
          }
      },

  // resets the lexer, sets new input
  setInput:function (input) {
          this._input = input;
          this._more = this._backtrack = this.done = false;
          this.yylineno = this.yyleng = 0;
          this.yytext = this.matched = this.match = '';
          this.conditionStack = ['INITIAL'];
          this.yylloc = {
              first_line: 1,
              first_column: 0,
              last_line: 1,
              last_column: 0
          };
          if (this.options.ranges) {
              this.yylloc.range = [0,0];
          }
          this.offset = 0;
          return this;
      },

  // consumes and returns one char from the input
  input:function () {
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
      },

  // unshifts one char (or a string) into the input
  unput:function (ch) {
          var len = ch.length;
          var lines = ch.split(/(?:\r\n?|\n)/g);

          this._input = ch + this._input;
          this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
          //this.yyleng -= len;
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
              last_column: lines ?
                  (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                   + oldLines[oldLines.length - lines.length].length - lines[0].length :
                this.yylloc.first_column - len
          };

          if (this.options.ranges) {
              this.yylloc.range = [r[0], r[0] + this.yyleng - len];
          }
          this.yyleng = this.yytext.length;
          return this;
      },

  // When called from action, caches matched text and appends it on next action
  more:function () {
          this._more = true;
          return this;
      },

  // When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
  reject:function () {
          if (this.options.backtrack_lexer) {
              this._backtrack = true;
          } else {
              return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                  text: "",
                  token: null,
                  line: this.yylineno
              });

          }
          return this;
      },

  // retain first n characters of the match
  less:function (n) {
          this.unput(this.match.slice(n));
      },

  // displays already matched input, i.e. for error messages
  pastInput:function () {
          var past = this.matched.substr(0, this.matched.length - this.match.length);
          return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
      },

  // displays upcoming input, i.e. for error messages
  upcomingInput:function () {
          var next = this.match;
          if (next.length < 20) {
              next += this._input.substr(0, 20-next.length);
          }
          return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
      },

  // displays the character position where the lexing error occurred, i.e. for error messages
  showPosition:function () {
          var pre = this.pastInput();
          var c = new Array(pre.length + 1).join("-");
          return pre + this.upcomingInput() + "\n" + c + "^";
      },

  // test the lexed token: return FALSE when not a match, otherwise return token
  test_match:function (match, indexed_rule) {
          var token,
              lines,
              backup;

          if (this.options.backtrack_lexer) {
              // save context
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
              last_column: lines ?
                           lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                           this.yylloc.last_column + match[0].length
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
              // recover context
              for (var k in backup) {
                  this[k] = backup[k];
              }
              return false; // rule action called reject() implying the next rule should be tested instead.
          }
          return false;
      },

  // return next match in input
  next:function () {
          if (this.done) {
              return this.EOF;
          }
          if (!this._input) {
              this.done = true;
          }

          var token,
              match,
              tempMatch,
              index;
          if (!this._more) {
              this.yytext = '';
              this.match = '';
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
                          continue; // rule action called reject() implying a rule MISmatch.
                      } else {
                          // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
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
              // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
              return false;
          }
          if (this._input === "") {
              return this.EOF;
          } else {
              return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                  text: "",
                  token: null,
                  line: this.yylineno
              });
          }
      },

  // return next match that has a token
  lex:function lex() {
          var r = this.next();
          if (r) {
              return r;
          } else {
              return this.lex();
          }
      },

  // activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
  begin:function begin(condition) {
          this.conditionStack.push(condition);
      },

  // pop the previously active lexer condition state off the condition stack
  popState:function popState() {
          var n = this.conditionStack.length - 1;
          if (n > 0) {
              return this.conditionStack.pop();
          } else {
              return this.conditionStack[0];
          }
      },

  // produce the lexer rule set which is active for the currently active lexer condition state
  _currentRules:function _currentRules() {
          if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
              return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
          } else {
              return this.conditions["INITIAL"].rules;
          }
      },

  // return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
  topState:function topState(n) {
          n = this.conditionStack.length - 1 - Math.abs(n || 0);
          if (n >= 0) {
              return this.conditionStack[n];
          } else {
              return "INITIAL";
          }
      },

  // alias for begin(condition)
  pushState:function pushState(condition) {
          this.begin(condition);
      },

  // return the number of states currently on the stack
  stateStackSize:function stateStackSize() {
          return this.conditionStack.length;
      },
  options: {},
  performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START
  /**/) {
  switch($avoiding_name_collisions) {
  case 0:return 4
  break;
  case 1:return 14
  break;
  case 2:return 12
  break;
  case 3:return 15
  break;
  case 4:return 16
  break;
  case 5:return 22
  break;
  case 6:return 24
  break;
  case 7:return 28
  break;
  case 8:return 30
  break;
  case 9:return 18
  break;
  case 10:yy_.yytext = yy_.yytext.substr(1,yy_.yyleng-2); return 32;
  break;
  case 11:yy_.yytext = yy_.yytext.substr(1,yy_.yyleng-2); return 33;
  break;
  case 12:return 17
  break;
  case 13:return 31
  break;
  }
  },
  rules: [/^(?:\$)/,/^(?:\.\.)/,/^(?:\.)/,/^(?:\*)/,/^(?:[a-zA-Z_]+[a-zA-Z0-9_]*)/,/^(?:\[)/,/^(?:\])/,/^(?:,)/,/^(?:((-?(?:0|[1-9][0-9]*)))?\:((-?(?:0|[1-9][0-9]*)))?(\:((-?(?:0|[1-9][0-9]*)))?)?)/,/^(?:(-?(?:0|[1-9][0-9]*)))/,/^(?:"(?:\\["bfnrt/\\]|\\u[a-fA-F0-9]{4}|[^"\\])*")/,/^(?:'(?:\\['bfnrt/\\]|\\u[a-fA-F0-9]{4}|[^'\\])*')/,/^(?:\(.+?\)(?=\]))/,/^(?:\?\(.+?\)(?=\]))/],
  conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13],"inclusive":true}}
  };
  return lexer;
  })();
  parser.lexer = lexer;
  function Parser () {
    this.yy = {};
  }
  Parser.prototype = parser;parser.Parser = Parser;
  return new Parser;
  })();


  if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
  exports.parser = parser;
  exports.Parser = parser.Parser;
  exports.parse = function () { return parser.parse.apply(parser, arguments); };
  exports.main = function commonjsMain(args) {
      if (!args[1]) {
          console.log('Usage: '+args[0]+' FILE');
          process.exit(1);
      }
      var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
      return exports.parser.parse(source);
  };
  if (typeof module !== 'undefined' && require.main === module) {
    exports.main(process.argv.slice(1));
  }
  }

  }).call(this,require('_process'));
  },{"_process":12,"fs":8,"path":11}],2:[function(require,module,exports){
  module.exports = {
    identifier: "[a-zA-Z_]+[a-zA-Z0-9_]*",
    integer: "-?(?:0|[1-9][0-9]*)",
    qq_string: "\"(?:\\\\[\"bfnrt/\\\\]|\\\\u[a-fA-F0-9]{4}|[^\"\\\\])*\"",
    q_string: "'(?:\\\\[\'bfnrt/\\\\]|\\\\u[a-fA-F0-9]{4}|[^\'\\\\])*'"
  };

  },{}],3:[function(require,module,exports){
  var dict = require('./dict');
  var fs = require('fs');
  var grammar = {

      lex: {

          macros: {
              esc: "\\\\",
              int: dict.integer
          },

          rules: [
              ["\\$", "return 'DOLLAR'"],
              ["\\.\\.", "return 'DOT_DOT'"],
              ["\\.", "return 'DOT'"],
              ["\\*", "return 'STAR'"],
              [dict.identifier, "return 'IDENTIFIER'"],
              ["\\[", "return '['"],
              ["\\]", "return ']'"],
              [",", "return ','"],
              ["({int})?\\:({int})?(\\:({int})?)?", "return 'ARRAY_SLICE'"],
              ["{int}", "return 'INTEGER'"],
              [dict.qq_string, "yytext = yytext.substr(1,yyleng-2); return 'QQ_STRING';"],
              [dict.q_string, "yytext = yytext.substr(1,yyleng-2); return 'Q_STRING';"],
              ["\\(.+?\\)(?=\\])", "return 'SCRIPT_EXPRESSION'"],
              ["\\?\\(.+?\\)(?=\\])", "return 'FILTER_EXPRESSION'"]
          ]
      },

      start: "JSON_PATH",

      bnf: {

          JSON_PATH: [
                  [ 'DOLLAR',                 'yy.ast.set({ expression: { type: "root", value: $1 } }); yy.ast.unshift(); return yy.ast.yield()' ],
                  [ 'DOLLAR PATH_COMPONENTS', 'yy.ast.set({ expression: { type: "root", value: $1 } }); yy.ast.unshift(); return yy.ast.yield()' ],
                  [ 'LEADING_CHILD_MEMBER_EXPRESSION',                 'yy.ast.unshift(); return yy.ast.yield()' ],
                  [ 'LEADING_CHILD_MEMBER_EXPRESSION PATH_COMPONENTS', 'yy.ast.set({ operation: "member", scope: "child", expression: { type: "identifier", value: $1 }}); yy.ast.unshift(); return yy.ast.yield()' ] ],

          PATH_COMPONENTS: [
                  [ 'PATH_COMPONENT',                 '' ],
                  [ 'PATH_COMPONENTS PATH_COMPONENT', '' ] ],

          PATH_COMPONENT: [
                  [ 'MEMBER_COMPONENT',    'yy.ast.set({ operation: "member" }); yy.ast.push()' ],
                  [ 'SUBSCRIPT_COMPONENT', 'yy.ast.set({ operation: "subscript" }); yy.ast.push() ' ] ],

          MEMBER_COMPONENT: [
                  [ 'CHILD_MEMBER_COMPONENT',      'yy.ast.set({ scope: "child" })' ],
                  [ 'DESCENDANT_MEMBER_COMPONENT', 'yy.ast.set({ scope: "descendant" })' ] ],

          CHILD_MEMBER_COMPONENT: [
                  [ 'DOT MEMBER_EXPRESSION', '' ] ],

          LEADING_CHILD_MEMBER_EXPRESSION: [
                  [ 'MEMBER_EXPRESSION', 'yy.ast.set({ scope: "child", operation: "member" })' ] ],

          DESCENDANT_MEMBER_COMPONENT: [
                  [ 'DOT_DOT MEMBER_EXPRESSION', '' ] ],

          MEMBER_EXPRESSION: [
                  [ 'STAR',              'yy.ast.set({ expression: { type: "wildcard", value: $1 } })' ],
                  [ 'IDENTIFIER',        'yy.ast.set({ expression: { type: "identifier", value: $1 } })' ],
                  [ 'SCRIPT_EXPRESSION', 'yy.ast.set({ expression: { type: "script_expression", value: $1 } })' ],
                  [ 'INTEGER',           'yy.ast.set({ expression: { type: "numeric_literal", value: parseInt($1) } })' ],
                  [ 'END',               '' ] ],

          SUBSCRIPT_COMPONENT: [
                  [ 'CHILD_SUBSCRIPT_COMPONENT',      'yy.ast.set({ scope: "child" })' ],
                  [ 'DESCENDANT_SUBSCRIPT_COMPONENT', 'yy.ast.set({ scope: "descendant" })' ] ],

          CHILD_SUBSCRIPT_COMPONENT: [
                  [ '[ SUBSCRIPT ]', '' ] ],

          DESCENDANT_SUBSCRIPT_COMPONENT: [
                  [ 'DOT_DOT [ SUBSCRIPT ]', '' ] ],

          SUBSCRIPT: [
                  [ 'SUBSCRIPT_EXPRESSION', '' ],
                  [ 'SUBSCRIPT_EXPRESSION_LIST', '$1.length > 1? yy.ast.set({ expression: { type: "union", value: $1 } }) : $$ = $1' ] ],

          SUBSCRIPT_EXPRESSION_LIST: [
                  [ 'SUBSCRIPT_EXPRESSION_LISTABLE', '$$ = [$1]'],
                  [ 'SUBSCRIPT_EXPRESSION_LIST , SUBSCRIPT_EXPRESSION_LISTABLE', '$$ = $1.concat($3)' ] ],

          SUBSCRIPT_EXPRESSION_LISTABLE: [
                  [ 'INTEGER',           '$$ = { expression: { type: "numeric_literal", value: parseInt($1) } }; yy.ast.set($$)' ],
                  [ 'STRING_LITERAL',    '$$ = { expression: { type: "string_literal", value: $1 } }; yy.ast.set($$)' ],
                  [ 'ARRAY_SLICE',       '$$ = { expression: { type: "slice", value: $1 } }; yy.ast.set($$)' ] ],

          SUBSCRIPT_EXPRESSION: [
                  [ 'STAR',              '$$ = { expression: { type: "wildcard", value: $1 } }; yy.ast.set($$)' ],
                  [ 'SCRIPT_EXPRESSION', '$$ = { expression: { type: "script_expression", value: $1 } }; yy.ast.set($$)' ],
                  [ 'FILTER_EXPRESSION', '$$ = { expression: { type: "filter_expression", value: $1 } }; yy.ast.set($$)' ] ],

          STRING_LITERAL: [
                  [ 'QQ_STRING', "$$ = $1" ],
                  [ 'Q_STRING',  "$$ = $1" ] ]
      }
  };
  if (fs.readFileSync) {
    grammar.moduleInclude = fs.readFileSync(require.resolve("../include/module.js"));
    grammar.actionInclude = fs.readFileSync(require.resolve("../include/action.js"));
  }

  module.exports = grammar;

  },{"./dict":2,"fs":8}],4:[function(require,module,exports){
  var aesprim = require('./aesprim');
  var slice = require('./slice');
  var _evaluate = require('static-eval');
  var _uniq = require('underscore').uniq;

  var Handlers = function() {
    return this.initialize.apply(this, arguments);
  };

  Handlers.prototype.initialize = function() {
    this.traverse = traverser(true);
    this.descend = traverser();
  };

  Handlers.prototype.keys = Object.keys;

  Handlers.prototype.resolve = function(component) {

    var key = [ component.operation, component.scope, component.expression.type ].join('-');
    var method = this._fns[key];

    if (!method) throw new Error("couldn't resolve key: " + key);
    return method.bind(this);
  };

  Handlers.prototype.register = function(key, handler) {

    if (!handler instanceof Function) {
      throw new Error("handler must be a function");
    }

    this._fns[key] = handler;
  };

  Handlers.prototype._fns = {

    'member-child-identifier': function(component, partial) {
      var key = component.expression.value;
      var value = partial.value;
      if (value instanceof Object && key in value) {
        return [ { value: value[key], path: partial.path.concat(key) } ]
      }
    },

    'member-descendant-identifier':
      _traverse(function(key, value, ref) { return key == ref }),

    'subscript-child-numeric_literal':
      _descend(function(key, value, ref) { return key === ref }),

    'member-child-numeric_literal':
      _descend(function(key, value, ref) { return String(key) === String(ref) }),

    'subscript-descendant-numeric_literal':
      _traverse(function(key, value, ref) { return key === ref }),

    'member-child-wildcard':
      _descend(function() { return true }),

    'member-descendant-wildcard':
      _traverse(function() { return true }),

    'subscript-descendant-wildcard':
      _traverse(function() { return true }),

    'subscript-child-wildcard':
      _descend(function() { return true }),

    'subscript-child-slice': function(component, partial) {
      if (is_array(partial.value)) {
        var args = component.expression.value.split(':').map(_parse_nullable_int);
        var values = partial.value.map(function(v, i) { return { value: v, path: partial.path.concat(i) } });
        return slice.apply(null, [values].concat(args));
      }
    },

    'subscript-child-union': function(component, partial) {
      var results = [];
      component.expression.value.forEach(function(component) {
        var _component = { operation: 'subscript', scope: 'child', expression: component.expression };
        var handler = this.resolve(_component);
        var _results = handler(_component, partial);
        if (_results) {
          results = results.concat(_results);
        }
      }, this);

      return unique(results);
    },

    'subscript-descendant-union': function(component, partial, count) {

      var jp = require('..');
      var self = this;

      var results = [];
      var nodes = jp.nodes(partial, '$..*').slice(1);

      nodes.forEach(function(node) {
        if (results.length >= count) return;
        component.expression.value.forEach(function(component) {
          var _component = { operation: 'subscript', scope: 'child', expression: component.expression };
          var handler = self.resolve(_component);
          var _results = handler(_component, node);
          results = results.concat(_results);
        });
      });

      return unique(results);
    },

    'subscript-child-filter_expression': function(component, partial, count) {

      // slice out the expression from ?(expression)
      var src = component.expression.value.slice(2, -1);
      var ast = aesprim.parse(src).body[0].expression;

      var passable = function(key, value) {
        return evaluate(ast, { '@': value });
      };

      return this.descend(partial, null, passable, count);

    },

    'subscript-descendant-filter_expression': function(component, partial, count) {

      // slice out the expression from ?(expression)
      var src = component.expression.value.slice(2, -1);
      var ast = aesprim.parse(src).body[0].expression;

      var passable = function(key, value) {
        return evaluate(ast, { '@': value });
      };

      return this.traverse(partial, null, passable, count);
    },

    'subscript-child-script_expression': function(component, partial) {
      var exp = component.expression.value.slice(1, -1);
      return eval_recurse(partial, exp, '$[{{value}}]');
    },

    'member-child-script_expression': function(component, partial) {
      var exp = component.expression.value.slice(1, -1);
      return eval_recurse(partial, exp, '$.{{value}}');
    },

    'member-descendant-script_expression': function(component, partial) {
      var exp = component.expression.value.slice(1, -1);
      return eval_recurse(partial, exp, '$..value');
    }
  };

  Handlers.prototype._fns['subscript-child-string_literal'] =
    Handlers.prototype._fns['member-child-identifier'];

  Handlers.prototype._fns['member-descendant-numeric_literal'] =
      Handlers.prototype._fns['subscript-descendant-string_literal'] =
      Handlers.prototype._fns['member-descendant-identifier'];

  function eval_recurse(partial, src, template) {

    var jp = require('./index');
    var ast = aesprim.parse(src).body[0].expression;
    var value = evaluate(ast, { '@': partial.value });
    var path = template.replace(/\{\{\s*value\s*\}\}/g, value);

    var results = jp.nodes(partial.value, path);
    results.forEach(function(r) {
      r.path = partial.path.concat(r.path.slice(1));
    });

    return results;
  }

  function is_array(val) {
    return Array.isArray(val);
  }

  function is_object(val) {
    // is this a non-array, non-null object?
    return val && !(val instanceof Array) && val instanceof Object;
  }

  function traverser(recurse) {

    return function(partial, ref, passable, count) {

      var value = partial.value;
      var path = partial.path;

      var results = [];

      var descend = function(value, path) {

        if (is_array(value)) {
          value.forEach(function(element, index) {
            if (results.length >= count) { return }
            if (passable(index, element, ref)) {
              results.push({ path: path.concat(index), value: element });
            }
          });
          value.forEach(function(element, index) {
            if (results.length >= count) { return }
            if (recurse) {
              descend(element, path.concat(index));
            }
          });
        } else if (is_object(value)) {
          this.keys(value).forEach(function(k) {
            if (results.length >= count) { return }
            if (passable(k, value[k], ref)) {
              results.push({ path: path.concat(k), value: value[k] });
            }
          });
          this.keys(value).forEach(function(k) {
            if (results.length >= count) { return }
            if (recurse) {
              descend(value[k], path.concat(k));
            }
          });
        }
      }.bind(this);
      descend(value, path);
      return results;
    }
  }

  function _descend(passable) {
    return function(component, partial, count) {
      return this.descend(partial, component.expression.value, passable, count);
    }
  }

  function _traverse(passable) {
    return function(component, partial, count) {
      return this.traverse(partial, component.expression.value, passable, count);
    }
  }

  function evaluate() {
    try { return _evaluate.apply(this, arguments) }
    catch (e) { }
  }

  function unique(results) {
    results = results.filter(function(d) { return d });
    return _uniq(
      results,
      function(r) { return r.path.map(function(c) { return String(c).replace('-', '--') }).join('-') }
    );
  }

  function _parse_nullable_int(val) {
    var sval = String(val);
    return sval.match(/^-?[0-9]+$/) ? parseInt(sval) : null;
  }

  module.exports = Handlers;

  },{"..":"jsonpath","./aesprim":"./aesprim","./index":5,"./slice":7,"static-eval":15,"underscore":8}],5:[function(require,module,exports){
  var assert = require('assert');
  var dict = require('./dict');
  var Parser = require('./parser');
  var Handlers = require('./handlers');

  var JSONPath = function() {
    this.initialize.apply(this, arguments);
  };

  JSONPath.prototype.initialize = function() {
    this.parser = new Parser();
    this.handlers = new Handlers();
  };

  JSONPath.prototype.parse = function(string) {
    assert.ok(_is_string(string), "we need a path");
    return this.parser.parse(string);
  };

  JSONPath.prototype.parent = function(obj, string) {

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(string, "we need a path");

    var node = this.nodes(obj, string)[0];
    var key = node.path.pop(); /* jshint unused:false */
    return this.value(obj, node.path);
  };

  JSONPath.prototype.apply = function(obj, string, fn) {

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(string, "we need a path");
    assert.equal(typeof fn, "function", "fn needs to be function");

    var nodes = this.nodes(obj, string).sort(function(a, b) {
      // sort nodes so we apply from the bottom up
      return b.path.length - a.path.length;
    });

    nodes.forEach(function(node) {
      var key = node.path.pop();
      var parent = this.value(obj, this.stringify(node.path));
      var val = node.value = fn.call(obj, parent[key]);
      parent[key] = val;
    }, this);

    return nodes;
  };

  JSONPath.prototype.value = function(obj, path, value) {

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(path, "we need a path");

    if (arguments.length >= 3) {
      var node = this.nodes(obj, path).shift();
      if (!node) return this._vivify(obj, path, value);
      var key = node.path.slice(-1).shift();
      var parent = this.parent(obj, this.stringify(node.path));
      parent[key] = value;
    }
    return this.query(obj, this.stringify(path), 1).shift();
  };

  JSONPath.prototype._vivify = function(obj, string, value) {

    var self = this;

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(string, "we need a path");

    var path = this.parser.parse(string)
      .map(function(component) { return component.expression.value });

    var setValue = function(path, value) {
      var key = path.pop();
      var node = self.value(obj, path);
      if (!node) {
        setValue(path.concat(), typeof key === 'string' ? {} : []);
        node = self.value(obj, path);
      }
      node[key] = value;
    };
    setValue(path, value);
    return this.query(obj, string)[0];
  };

  JSONPath.prototype.query = function(obj, string, count) {

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(_is_string(string), "we need a path");

    var results = this.nodes(obj, string, count)
      .map(function(r) { return r.value });

    return results;
  };

  JSONPath.prototype.paths = function(obj, string, count) {

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(string, "we need a path");

    var results = this.nodes(obj, string, count)
      .map(function(r) { return r.path });

    return results;
  };

  JSONPath.prototype.nodes = function(obj, string, count) {

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(string, "we need a path");

    if (count === 0) return [];

    var path = this.parser.parse(string);
    var handlers = this.handlers;

    var partials = [ { path: ['$'], value: obj } ];
    var matches = [];

    if (path.length && path[0].expression.type == 'root') path.shift();

    if (!path.length) return partials;

    path.forEach(function(component, index) {

      if (matches.length >= count) return;
      var handler = handlers.resolve(component);
      var _partials = [];

      partials.forEach(function(p) {

        if (matches.length >= count) return;
        var results = handler(component, p, count);

        if (index == path.length - 1) {
          // if we're through the components we're done
          matches = matches.concat(results || []);
        } else {
          // otherwise accumulate and carry on through
          _partials = _partials.concat(results || []);
        }
      });

      partials = _partials;

    });

    return count ? matches.slice(0, count) : matches;
  };

  JSONPath.prototype.stringify = function(path) {

    assert.ok(path, "we need a path");

    var string = '$';

    var templates = {
      'descendant-member': '..{{value}}',
      'child-member': '.{{value}}',
      'descendant-subscript': '..[{{value}}]',
      'child-subscript': '[{{value}}]'
    };

    path = this._normalize(path);

    path.forEach(function(component) {

      if (component.expression.type == 'root') return;

      var key = [component.scope, component.operation].join('-');
      var template = templates[key];
      var value;

      if (component.expression.type == 'string_literal') {
        value = JSON.stringify(component.expression.value);
      } else {
        value = component.expression.value;
      }

      if (!template) throw new Error("couldn't find template " + key);

      string += template.replace(/{{value}}/, value);
    });

    return string;
  };

  JSONPath.prototype._normalize = function(path) {

    assert.ok(path, "we need a path");

    if (typeof path == "string") {

      return this.parser.parse(path);

    } else if (Array.isArray(path) && typeof path[0] == "string") {

      var _path = [ { expression: { type: "root", value: "$" } } ];

      path.forEach(function(component, index) {

        if (component == '$' && index === 0) return;

        if (typeof component == "string" && component.match("^" + dict.identifier + "$")) {

          _path.push({
            operation: 'member',
            scope: 'child',
            expression: { value: component, type: 'identifier' }
          });

        } else {

          var type = typeof component == "number" ?
            'numeric_literal' : 'string_literal';

          _path.push({
            operation: 'subscript',
            scope: 'child',
            expression: { value: component, type: type }
          });
        }
      });

      return _path;

    } else if (Array.isArray(path) && typeof path[0] == "object") {

      return path
    }

    throw new Error("couldn't understand path " + path);
  };

  function _is_string(obj) {
    return Object.prototype.toString.call(obj) == '[object String]';
  }

  JSONPath.Handlers = Handlers;
  JSONPath.Parser = Parser;

  var instance = new JSONPath;
  instance.JSONPath = JSONPath;

  module.exports = instance;

  },{"./dict":2,"./handlers":4,"./parser":6,"assert":9}],6:[function(require,module,exports){
  var grammar = require('./grammar');
  var gparser = require('../generated/parser');

  var Parser = function() {

    var parser = new gparser.Parser();

    var _parseError = parser.parseError;
    parser.yy.parseError = function() {
      if (parser.yy.ast) {
        parser.yy.ast.initialize();
      }
      _parseError.apply(parser, arguments);
    };

    return parser;

  };

  Parser.grammar = grammar;
  module.exports = Parser;

  },{"../generated/parser":1,"./grammar":3}],7:[function(require,module,exports){
  module.exports = function(arr, start, end, step) {

    if (typeof start == 'string') throw new Error("start cannot be a string");
    if (typeof end == 'string') throw new Error("end cannot be a string");
    if (typeof step == 'string') throw new Error("step cannot be a string");

    var len = arr.length;

    if (step === 0) throw new Error("step cannot be zero");
    step = step ? integer(step) : 1;

    // normalize negative values
    start = start < 0 ? len + start : start;
    end = end < 0 ? len + end : end;

    // default extents to extents
    start = integer(start === 0 ? 0 : !start ? (step > 0 ? 0 : len - 1) : start);
    end = integer(end === 0 ? 0 : !end ? (step > 0 ? len : -1) : end);

    // clamp extents
    start = step > 0 ? Math.max(0, start) : Math.min(len, start);
    end = step > 0 ? Math.min(end, len) : Math.max(-1, end);

    // return empty if extents are backwards
    if (step > 0 && end <= start) return [];
    if (step < 0 && start <= end) return [];

    var result = [];

    for (var i = start; i != end; i += step) {
      if ((step < 0 && i <= end) || (step > 0 && i >= end)) break;
      result.push(arr[i]);
    }

    return result;
  };

  function integer(val) {
    return String(val).match(/^[0-9]+$/) ? parseInt(val) :
      Number.isFinite(val) ? parseInt(val, 10) : 0;
  }

  },{}],8:[function(require,module,exports){

  },{}],9:[function(require,module,exports){
  // http://wiki.commonjs.org/wiki/Unit_Testing/1.0
  //
  // THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
  //
  // Originally from narwhal.js (http://narwhaljs.org)
  // Copyright (c) 2009 Thomas Robinson <280north.com>
  //
  // Permission is hereby granted, free of charge, to any person obtaining a copy
  // of this software and associated documentation files (the 'Software'), to
  // deal in the Software without restriction, including without limitation the
  // rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
  // sell copies of the Software, and to permit persons to whom the Software is
  // furnished to do so, subject to the following conditions:
  //
  // The above copyright notice and this permission notice shall be included in
  // all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  // AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  // ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
  // WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

  // when used in node, this will actually load the util module we depend on
  // versus loading the builtin util module as happens otherwise
  // this is a bug in node module loading as far as I am concerned
  var util = require('util/');

  var pSlice = Array.prototype.slice;
  var hasOwn = Object.prototype.hasOwnProperty;

  // 1. The assert module provides functions that throw
  // AssertionError's when particular conditions are not met. The
  // assert module must conform to the following interface.

  var assert = module.exports = ok;

  // 2. The AssertionError is defined in assert.
  // new assert.AssertionError({ message: message,
  //                             actual: actual,
  //                             expected: expected })

  assert.AssertionError = function AssertionError(options) {
    this.name = 'AssertionError';
    this.actual = options.actual;
    this.expected = options.expected;
    this.operator = options.operator;
    if (options.message) {
      this.message = options.message;
      this.generatedMessage = false;
    } else {
      this.message = getMessage(this);
      this.generatedMessage = true;
    }
    var stackStartFunction = options.stackStartFunction || fail;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, stackStartFunction);
    }
    else {
      // non v8 browsers so we can have a stacktrace
      var err = new Error();
      if (err.stack) {
        var out = err.stack;

        // try to strip useless frames
        var fn_name = stackStartFunction.name;
        var idx = out.indexOf('\n' + fn_name);
        if (idx >= 0) {
          // once we have located the function frame
          // we need to strip out everything before it (and its line)
          var next_line = out.indexOf('\n', idx + 1);
          out = out.substring(next_line + 1);
        }

        this.stack = out;
      }
    }
  };

  // assert.AssertionError instanceof Error
  util.inherits(assert.AssertionError, Error);

  function replacer(key, value) {
    if (util.isUndefined(value)) {
      return '' + value;
    }
    if (util.isNumber(value) && !isFinite(value)) {
      return value.toString();
    }
    if (util.isFunction(value) || util.isRegExp(value)) {
      return value.toString();
    }
    return value;
  }

  function truncate(s, n) {
    if (util.isString(s)) {
      return s.length < n ? s : s.slice(0, n);
    } else {
      return s;
    }
  }

  function getMessage(self) {
    return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
           self.operator + ' ' +
           truncate(JSON.stringify(self.expected, replacer), 128);
  }

  // At present only the three keys mentioned above are used and
  // understood by the spec. Implementations or sub modules can pass
  // other keys to the AssertionError's constructor - they will be
  // ignored.

  // 3. All of the following functions must throw an AssertionError
  // when a corresponding condition is not met, with a message that
  // may be undefined if not provided.  All assertion methods provide
  // both the actual and expected values to the assertion error for
  // display purposes.

  function fail(actual, expected, message, operator, stackStartFunction) {
    throw new assert.AssertionError({
      message: message,
      actual: actual,
      expected: expected,
      operator: operator,
      stackStartFunction: stackStartFunction
    });
  }

  // EXTENSION! allows for well behaved errors defined elsewhere.
  assert.fail = fail;

  // 4. Pure assertion tests whether a value is truthy, as determined
  // by !!guard.
  // assert.ok(guard, message_opt);
  // This statement is equivalent to assert.equal(true, !!guard,
  // message_opt);. To test strictly for the value true, use
  // assert.strictEqual(true, guard, message_opt);.

  function ok(value, message) {
    if (!value) fail(value, true, message, '==', assert.ok);
  }
  assert.ok = ok;

  // 5. The equality assertion tests shallow, coercive equality with
  // ==.
  // assert.equal(actual, expected, message_opt);

  assert.equal = function equal(actual, expected, message) {
    if (actual != expected) fail(actual, expected, message, '==', assert.equal);
  };

  // 6. The non-equality assertion tests for whether two objects are not equal
  // with != assert.notEqual(actual, expected, message_opt);

  assert.notEqual = function notEqual(actual, expected, message) {
    if (actual == expected) {
      fail(actual, expected, message, '!=', assert.notEqual);
    }
  };

  // 7. The equivalence assertion tests a deep equality relation.
  // assert.deepEqual(actual, expected, message_opt);

  assert.deepEqual = function deepEqual(actual, expected, message) {
    if (!_deepEqual(actual, expected)) {
      fail(actual, expected, message, 'deepEqual', assert.deepEqual);
    }
  };

  function _deepEqual(actual, expected) {
    // 7.1. All identical values are equivalent, as determined by ===.
    if (actual === expected) {
      return true;

    } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
      if (actual.length != expected.length) return false;

      for (var i = 0; i < actual.length; i++) {
        if (actual[i] !== expected[i]) return false;
      }

      return true;

    // 7.2. If the expected value is a Date object, the actual value is
    // equivalent if it is also a Date object that refers to the same time.
    } else if (util.isDate(actual) && util.isDate(expected)) {
      return actual.getTime() === expected.getTime();

    // 7.3 If the expected value is a RegExp object, the actual value is
    // equivalent if it is also a RegExp object with the same source and
    // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
    } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
      return actual.source === expected.source &&
             actual.global === expected.global &&
             actual.multiline === expected.multiline &&
             actual.lastIndex === expected.lastIndex &&
             actual.ignoreCase === expected.ignoreCase;

    // 7.4. Other pairs that do not both pass typeof value == 'object',
    // equivalence is determined by ==.
    } else if (!util.isObject(actual) && !util.isObject(expected)) {
      return actual == expected;

    // 7.5 For all other Object pairs, including Array objects, equivalence is
    // determined by having the same number of owned properties (as verified
    // with Object.prototype.hasOwnProperty.call), the same set of keys
    // (although not necessarily the same order), equivalent values for every
    // corresponding key, and an identical 'prototype' property. Note: this
    // accounts for both named and indexed properties on Arrays.
    } else {
      return objEquiv(actual, expected);
    }
  }

  function isArguments(object) {
    return Object.prototype.toString.call(object) == '[object Arguments]';
  }

  function objEquiv(a, b) {
    if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
      return false;
    // an identical 'prototype' property.
    if (a.prototype !== b.prototype) return false;
    // if one is a primitive, the other must be same
    if (util.isPrimitive(a) || util.isPrimitive(b)) {
      return a === b;
    }
    var aIsArgs = isArguments(a),
        bIsArgs = isArguments(b);
    if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
      return false;
    if (aIsArgs) {
      a = pSlice.call(a);
      b = pSlice.call(b);
      return _deepEqual(a, b);
    }
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
    // having the same number of owned properties (keys incorporates
    // hasOwnProperty)
    if (ka.length != kb.length)
      return false;
    //the same set of keys (although not necessarily the same order),
    ka.sort();
    kb.sort();
    //~~~cheap key test
    for (i = ka.length - 1; i >= 0; i--) {
      if (ka[i] != kb[i])
        return false;
    }
    //equivalent values for every corresponding key, and
    //~~~possibly expensive deep test
    for (i = ka.length - 1; i >= 0; i--) {
      key = ka[i];
      if (!_deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  // 8. The non-equivalence assertion tests for any deep inequality.
  // assert.notDeepEqual(actual, expected, message_opt);

  assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
    if (_deepEqual(actual, expected)) {
      fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
    }
  };

  // 9. The strict equality assertion tests strict equality, as determined by ===.
  // assert.strictEqual(actual, expected, message_opt);

  assert.strictEqual = function strictEqual(actual, expected, message) {
    if (actual !== expected) {
      fail(actual, expected, message, '===', assert.strictEqual);
    }
  };

  // 10. The strict non-equality assertion tests for strict inequality, as
  // determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

  assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
    if (actual === expected) {
      fail(actual, expected, message, '!==', assert.notStrictEqual);
    }
  };

  function expectedException(actual, expected) {
    if (!actual || !expected) {
      return false;
    }

    if (Object.prototype.toString.call(expected) == '[object RegExp]') {
      return expected.test(actual);
    } else if (actual instanceof expected) {
      return true;
    } else if (expected.call({}, actual) === true) {
      return true;
    }

    return false;
  }

  function _throws(shouldThrow, block, expected, message) {
    var actual;

    if (util.isString(expected)) {
      message = expected;
      expected = null;
    }

    try {
      block();
    } catch (e) {
      actual = e;
    }

    message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
              (message ? ' ' + message : '.');

    if (shouldThrow && !actual) {
      fail(actual, expected, 'Missing expected exception' + message);
    }

    if (!shouldThrow && expectedException(actual, expected)) {
      fail(actual, expected, 'Got unwanted exception' + message);
    }

    if ((shouldThrow && actual && expected &&
        !expectedException(actual, expected)) || (!shouldThrow && actual)) {
      throw actual;
    }
  }

  // 11. Expected to throw an error:
  // assert.throws(block, Error_opt, message_opt);

  assert.throws = function(block, /*optional*/error, /*optional*/message) {
    _throws.apply(this, [true].concat(pSlice.call(arguments)));
  };

  // EXTENSION! This is annoying to write outside this module.
  assert.doesNotThrow = function(block, /*optional*/message) {
    _throws.apply(this, [false].concat(pSlice.call(arguments)));
  };

  assert.ifError = function(err) { if (err) {throw err;}};

  var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) {
      if (hasOwn.call(obj, key)) keys.push(key);
    }
    return keys;
  };

  },{"util/":14}],10:[function(require,module,exports){
  if (typeof Object.create === 'function') {
    // implementation from standard node.js 'util' module
    module.exports = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    };
  } else {
    // old school shim for old browsers
    module.exports = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function () {};
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    };
  }

  },{}],11:[function(require,module,exports){
  (function (process){
  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.

  // resolves . and .. elements in a path array with directory names there
  // must be no slashes, empty elements, or device names (c:\) in the array
  // (so also no leading and trailing slashes - it does not distinguish
  // relative and absolute paths)
  function normalizeArray(parts, allowAboveRoot) {
    // if the path tries to go above the root, `up` ends up > 0
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === '.') {
        parts.splice(i, 1);
      } else if (last === '..') {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }

    // if the path is allowed to go above the root, restore leading ..s
    if (allowAboveRoot) {
      for (; up--; up) {
        parts.unshift('..');
      }
    }

    return parts;
  }

  // Split a filename into [root, dir, basename, ext], unix version
  // 'root' is just a slash, or nothing.
  var splitPathRe =
      /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
  var splitPath = function(filename) {
    return splitPathRe.exec(filename).slice(1);
  };

  // path.resolve([from ...], to)
  // posix version
  exports.resolve = function() {
    var resolvedPath = '',
        resolvedAbsolute = false;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = (i >= 0) ? arguments[i] : process.cwd();

      // Skip empty and invalid entries
      if (typeof path !== 'string') {
        throw new TypeError('Arguments to path.resolve must be strings');
      } else if (!path) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charAt(0) === '/';
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
      return !!p;
    }), !resolvedAbsolute).join('/');

    return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
  };

  // path.normalize(path)
  // posix version
  exports.normalize = function(path) {
    var isAbsolute = exports.isAbsolute(path),
        trailingSlash = substr(path, -1) === '/';

    // Normalize the path
    path = normalizeArray(filter(path.split('/'), function(p) {
      return !!p;
    }), !isAbsolute).join('/');

    if (!path && !isAbsolute) {
      path = '.';
    }
    if (path && trailingSlash) {
      path += '/';
    }

    return (isAbsolute ? '/' : '') + path;
  };

  // posix version
  exports.isAbsolute = function(path) {
    return path.charAt(0) === '/';
  };

  // posix version
  exports.join = function() {
    var paths = Array.prototype.slice.call(arguments, 0);
    return exports.normalize(filter(paths, function(p, index) {
      if (typeof p !== 'string') {
        throw new TypeError('Arguments to path.join must be strings');
      }
      return p;
    }).join('/'));
  };


  // path.relative(from, to)
  // posix version
  exports.relative = function(from, to) {
    from = exports.resolve(from).substr(1);
    to = exports.resolve(to).substr(1);

    function trim(arr) {
      var start = 0;
      for (; start < arr.length; start++) {
        if (arr[start] !== '') break;
      }

      var end = arr.length - 1;
      for (; end >= 0; end--) {
        if (arr[end] !== '') break;
      }

      if (start > end) return [];
      return arr.slice(start, end - start + 1);
    }

    var fromParts = trim(from.split('/'));
    var toParts = trim(to.split('/'));

    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break;
      }
    }

    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push('..');
    }

    outputParts = outputParts.concat(toParts.slice(samePartsLength));

    return outputParts.join('/');
  };

  exports.sep = '/';
  exports.delimiter = ':';

  exports.dirname = function(path) {
    var result = splitPath(path),
        root = result[0],
        dir = result[1];

    if (!root && !dir) {
      // No dirname whatsoever
      return '.';
    }

    if (dir) {
      // It has a dirname, strip trailing slash
      dir = dir.substr(0, dir.length - 1);
    }

    return root + dir;
  };


  exports.basename = function(path, ext) {
    var f = splitPath(path)[2];
    // TODO: make this comparison case-insensitive on windows?
    if (ext && f.substr(-1 * ext.length) === ext) {
      f = f.substr(0, f.length - ext.length);
    }
    return f;
  };


  exports.extname = function(path) {
    return splitPath(path)[3];
  };

  function filter (xs, f) {
      if (xs.filter) return xs.filter(f);
      var res = [];
      for (var i = 0; i < xs.length; i++) {
          if (f(xs[i], i, xs)) res.push(xs[i]);
      }
      return res;
  }

  // String.prototype.substr - negative index don't work in IE8
  var substr = 'ab'.substr(-1) === 'b'
      ? function (str, start, len) { return str.substr(start, len) }
      : function (str, start, len) {
          if (start < 0) start = str.length + start;
          return str.substr(start, len);
      }
  ;

  }).call(this,require('_process'));
  },{"_process":12}],12:[function(require,module,exports){
  // shim for using process in browser

  var process = module.exports = {};
  var queue = [];
  var draining = false;
  var currentQueue;
  var queueIndex = -1;

  function cleanUpNextTick() {
      draining = false;
      if (currentQueue.length) {
          queue = currentQueue.concat(queue);
      } else {
          queueIndex = -1;
      }
      if (queue.length) {
          drainQueue();
      }
  }

  function drainQueue() {
      if (draining) {
          return;
      }
      var timeout = setTimeout(cleanUpNextTick);
      draining = true;

      var len = queue.length;
      while(len) {
          currentQueue = queue;
          queue = [];
          while (++queueIndex < len) {
              if (currentQueue) {
                  currentQueue[queueIndex].run();
              }
          }
          queueIndex = -1;
          len = queue.length;
      }
      currentQueue = null;
      draining = false;
      clearTimeout(timeout);
  }

  process.nextTick = function (fun) {
      var args = new Array(arguments.length - 1);
      if (arguments.length > 1) {
          for (var i = 1; i < arguments.length; i++) {
              args[i - 1] = arguments[i];
          }
      }
      queue.push(new Item(fun, args));
      if (queue.length === 1 && !draining) {
          setTimeout(drainQueue, 0);
      }
  };

  // v8 likes predictible objects
  function Item(fun, array) {
      this.fun = fun;
      this.array = array;
  }
  Item.prototype.run = function () {
      this.fun.apply(null, this.array);
  };
  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];
  process.version = ''; // empty string to avoid regexp issues
  process.versions = {};

  function noop() {}

  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;

  process.binding = function (name) {
      throw new Error('process.binding is not supported');
  };

  process.cwd = function () { return '/' };
  process.chdir = function (dir) {
      throw new Error('process.chdir is not supported');
  };
  process.umask = function() { return 0; };

  },{}],13:[function(require,module,exports){
  module.exports = function isBuffer(arg) {
    return arg && typeof arg === 'object'
      && typeof arg.copy === 'function'
      && typeof arg.fill === 'function'
      && typeof arg.readUInt8 === 'function';
  };
  },{}],14:[function(require,module,exports){
  (function (process,global){
  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.

  var formatRegExp = /%[sdj%]/g;
  exports.format = function(f) {
    if (!isString(f)) {
      var objects = [];
      for (var i = 0; i < arguments.length; i++) {
        objects.push(inspect(arguments[i]));
      }
      return objects.join(' ');
    }

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function(x) {
      if (x === '%%') return '%';
      if (i >= len) return x;
      switch (x) {
        case '%s': return String(args[i++]);
        case '%d': return Number(args[i++]);
        case '%j':
          try {
            return JSON.stringify(args[i++]);
          } catch (_) {
            return '[Circular]';
          }
        default:
          return x;
      }
    });
    for (var x = args[i]; i < len; x = args[++i]) {
      if (isNull(x) || !isObject(x)) {
        str += ' ' + x;
      } else {
        str += ' ' + inspect(x);
      }
    }
    return str;
  };


  // Mark that a method should not be used.
  // Returns a modified function which warns once by default.
  // If --no-deprecation is set, then it is a no-op.
  exports.deprecate = function(fn, msg) {
    // Allow for deprecating things in the process of starting up.
    if (isUndefined(global.process)) {
      return function() {
        return exports.deprecate(fn, msg).apply(this, arguments);
      };
    }

    if (process.noDeprecation === true) {
      return fn;
    }

    var warned = false;
    function deprecated() {
      if (!warned) {
        if (process.throwDeprecation) {
          throw new Error(msg);
        } else if (process.traceDeprecation) {
          console.trace(msg);
        } else {
          console.warn(msg);
        }
        warned = true;
      }
      return fn.apply(this, arguments);
    }

    return deprecated;
  };


  var debugs = {};
  var debugEnviron;
  exports.debuglog = function(set) {
    if (isUndefined(debugEnviron))
      debugEnviron = process.env.NODE_DEBUG || '';
    set = set.toUpperCase();
    if (!debugs[set]) {
      if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
        var pid = process.pid;
        debugs[set] = function() {
          var msg = exports.format.apply(exports, arguments);
          console.warn('%s %d: %s', set, pid, msg);
        };
      } else {
        debugs[set] = function() {};
      }
    }
    return debugs[set];
  };


  /**
   * Echos the value of a value. Trys to print the value out
   * in the best way possible given the different types.
   *
   * @param {Object} obj The object to print out.
   * @param {Object} opts Optional options object that alters the output.
   */
  /* legacy: obj, showHidden, depth, colors*/
  function inspect(obj, opts) {
    // default options
    var ctx = {
      seen: [],
      stylize: stylizeNoColor
    };
    // legacy...
    if (arguments.length >= 3) ctx.depth = arguments[2];
    if (arguments.length >= 4) ctx.colors = arguments[3];
    if (isBoolean(opts)) {
      // legacy...
      ctx.showHidden = opts;
    } else if (opts) {
      // got an "options" object
      exports._extend(ctx, opts);
    }
    // set default options
    if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
    if (isUndefined(ctx.depth)) ctx.depth = 2;
    if (isUndefined(ctx.colors)) ctx.colors = false;
    if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
    if (ctx.colors) ctx.stylize = stylizeWithColor;
    return formatValue(ctx, obj, ctx.depth);
  }
  exports.inspect = inspect;


  // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
  inspect.colors = {
    'bold' : [1, 22],
    'italic' : [3, 23],
    'underline' : [4, 24],
    'inverse' : [7, 27],
    'white' : [37, 39],
    'grey' : [90, 39],
    'black' : [30, 39],
    'blue' : [34, 39],
    'cyan' : [36, 39],
    'green' : [32, 39],
    'magenta' : [35, 39],
    'red' : [31, 39],
    'yellow' : [33, 39]
  };

  // Don't use 'blue' not visible on cmd.exe
  inspect.styles = {
    'special': 'cyan',
    'number': 'yellow',
    'boolean': 'yellow',
    'undefined': 'grey',
    'null': 'bold',
    'string': 'green',
    'date': 'magenta',
    // "name": intentionally not styling
    'regexp': 'red'
  };


  function stylizeWithColor(str, styleType) {
    var style = inspect.styles[styleType];

    if (style) {
      return '\u001b[' + inspect.colors[style][0] + 'm' + str +
             '\u001b[' + inspect.colors[style][1] + 'm';
    } else {
      return str;
    }
  }


  function stylizeNoColor(str, styleType) {
    return str;
  }


  function arrayToHash(array) {
    var hash = {};

    array.forEach(function(val, idx) {
      hash[val] = true;
    });

    return hash;
  }


  function formatValue(ctx, value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (ctx.customInspect &&
        value &&
        isFunction(value.inspect) &&
        // Filter out the util module, it's inspect function is special
        value.inspect !== exports.inspect &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      var ret = value.inspect(recurseTimes, ctx);
      if (!isString(ret)) {
        ret = formatValue(ctx, ret, recurseTimes);
      }
      return ret;
    }

    // Primitive types cannot have properties
    var primitive = formatPrimitive(ctx, value);
    if (primitive) {
      return primitive;
    }

    // Look up the keys of the object.
    var keys = Object.keys(value);
    var visibleKeys = arrayToHash(keys);

    if (ctx.showHidden) {
      keys = Object.getOwnPropertyNames(value);
    }

    // IE doesn't make error fields non-enumerable
    // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
    if (isError(value)
        && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
      return formatError(value);
    }

    // Some type of object without properties can be shortcutted.
    if (keys.length === 0) {
      if (isFunction(value)) {
        var name = value.name ? ': ' + value.name : '';
        return ctx.stylize('[Function' + name + ']', 'special');
      }
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      }
      if (isDate(value)) {
        return ctx.stylize(Date.prototype.toString.call(value), 'date');
      }
      if (isError(value)) {
        return formatError(value);
      }
    }

    var base = '', array = false, braces = ['{', '}'];

    // Make Array say that they are Array
    if (isArray(value)) {
      array = true;
      braces = ['[', ']'];
    }

    // Make functions say that they are functions
    if (isFunction(value)) {
      var n = value.name ? ': ' + value.name : '';
      base = ' [Function' + n + ']';
    }

    // Make RegExps say that they are RegExps
    if (isRegExp(value)) {
      base = ' ' + RegExp.prototype.toString.call(value);
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + Date.prototype.toUTCString.call(value);
    }

    // Make error with message first say the error
    if (isError(value)) {
      base = ' ' + formatError(value);
    }

    if (keys.length === 0 && (!array || value.length == 0)) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      } else {
        return ctx.stylize('[Object]', 'special');
      }
    }

    ctx.seen.push(value);

    var output;
    if (array) {
      output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
    } else {
      output = keys.map(function(key) {
        return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
      });
    }

    ctx.seen.pop();

    return reduceToSingleString(output, base, braces);
  }


  function formatPrimitive(ctx, value) {
    if (isUndefined(value))
      return ctx.stylize('undefined', 'undefined');
    if (isString(value)) {
      var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                               .replace(/'/g, "\\'")
                                               .replace(/\\"/g, '"') + '\'';
      return ctx.stylize(simple, 'string');
    }
    if (isNumber(value))
      return ctx.stylize('' + value, 'number');
    if (isBoolean(value))
      return ctx.stylize('' + value, 'boolean');
    // For some reason typeof null is "object", so special case here.
    if (isNull(value))
      return ctx.stylize('null', 'null');
  }


  function formatError(value) {
    return '[' + Error.prototype.toString.call(value) + ']';
  }


  function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
    var output = [];
    for (var i = 0, l = value.length; i < l; ++i) {
      if (hasOwnProperty(value, String(i))) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
            String(i), true));
      } else {
        output.push('');
      }
    }
    keys.forEach(function(key) {
      if (!key.match(/^\d+$/)) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
            key, true));
      }
    });
    return output;
  }


  function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
    var name, str, desc;
    desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
    if (desc.get) {
      if (desc.set) {
        str = ctx.stylize('[Getter/Setter]', 'special');
      } else {
        str = ctx.stylize('[Getter]', 'special');
      }
    } else {
      if (desc.set) {
        str = ctx.stylize('[Setter]', 'special');
      }
    }
    if (!hasOwnProperty(visibleKeys, key)) {
      name = '[' + key + ']';
    }
    if (!str) {
      if (ctx.seen.indexOf(desc.value) < 0) {
        if (isNull(recurseTimes)) {
          str = formatValue(ctx, desc.value, null);
        } else {
          str = formatValue(ctx, desc.value, recurseTimes - 1);
        }
        if (str.indexOf('\n') > -1) {
          if (array) {
            str = str.split('\n').map(function(line) {
              return '  ' + line;
            }).join('\n').substr(2);
          } else {
            str = '\n' + str.split('\n').map(function(line) {
              return '   ' + line;
            }).join('\n');
          }
        }
      } else {
        str = ctx.stylize('[Circular]', 'special');
      }
    }
    if (isUndefined(name)) {
      if (array && key.match(/^\d+$/)) {
        return str;
      }
      name = JSON.stringify('' + key);
      if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
        name = name.substr(1, name.length - 2);
        name = ctx.stylize(name, 'name');
      } else {
        name = name.replace(/'/g, "\\'")
                   .replace(/\\"/g, '"')
                   .replace(/(^"|"$)/g, "'");
        name = ctx.stylize(name, 'string');
      }
    }

    return name + ': ' + str;
  }


  function reduceToSingleString(output, base, braces) {
    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
    }, 0);

    if (length > 60) {
      return braces[0] +
             (base === '' ? '' : base + '\n ') +
             ' ' +
             output.join(',\n  ') +
             ' ' +
             braces[1];
    }

    return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
  }


  // NOTE: These type checking functions intentionally don't use `instanceof`
  // because it is fragile and can be easily faked with `Object.create()`.
  function isArray(ar) {
    return Array.isArray(ar);
  }
  exports.isArray = isArray;

  function isBoolean(arg) {
    return typeof arg === 'boolean';
  }
  exports.isBoolean = isBoolean;

  function isNull(arg) {
    return arg === null;
  }
  exports.isNull = isNull;

  function isNullOrUndefined(arg) {
    return arg == null;
  }
  exports.isNullOrUndefined = isNullOrUndefined;

  function isNumber(arg) {
    return typeof arg === 'number';
  }
  exports.isNumber = isNumber;

  function isString(arg) {
    return typeof arg === 'string';
  }
  exports.isString = isString;

  function isSymbol(arg) {
    return typeof arg === 'symbol';
  }
  exports.isSymbol = isSymbol;

  function isUndefined(arg) {
    return arg === void 0;
  }
  exports.isUndefined = isUndefined;

  function isRegExp(re) {
    return isObject(re) && objectToString(re) === '[object RegExp]';
  }
  exports.isRegExp = isRegExp;

  function isObject(arg) {
    return typeof arg === 'object' && arg !== null;
  }
  exports.isObject = isObject;

  function isDate(d) {
    return isObject(d) && objectToString(d) === '[object Date]';
  }
  exports.isDate = isDate;

  function isError(e) {
    return isObject(e) &&
        (objectToString(e) === '[object Error]' || e instanceof Error);
  }
  exports.isError = isError;

  function isFunction(arg) {
    return typeof arg === 'function';
  }
  exports.isFunction = isFunction;

  function isPrimitive(arg) {
    return arg === null ||
           typeof arg === 'boolean' ||
           typeof arg === 'number' ||
           typeof arg === 'string' ||
           typeof arg === 'symbol' ||  // ES6 symbol
           typeof arg === 'undefined';
  }
  exports.isPrimitive = isPrimitive;

  exports.isBuffer = require('./support/isBuffer');

  function objectToString(o) {
    return Object.prototype.toString.call(o);
  }


  function pad(n) {
    return n < 10 ? '0' + n.toString(10) : n.toString(10);
  }


  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
                'Oct', 'Nov', 'Dec'];

  // 26 Feb 16:19:34
  function timestamp() {
    var d = new Date();
    var time = [pad(d.getHours()),
                pad(d.getMinutes()),
                pad(d.getSeconds())].join(':');
    return [d.getDate(), months[d.getMonth()], time].join(' ');
  }


  // log is just a thin wrapper to console.log that prepends a timestamp
  exports.log = function() {
    console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
  };


  /**
   * Inherit the prototype methods from one constructor into another.
   *
   * The Function.prototype.inherits from lang.js rewritten as a standalone
   * function (not on Function.prototype). NOTE: If this file is to be loaded
   * during bootstrapping this function needs to be rewritten using some native
   * functions as prototype setup using normal JavaScript does not work as
   * expected during bootstrapping (see mirror.js in r114903).
   *
   * @param {function} ctor Constructor function which needs to inherit the
   *     prototype.
   * @param {function} superCtor Constructor function to inherit prototype from.
   */
  exports.inherits = require('inherits');

  exports._extend = function(origin, add) {
    // Don't do anything if add isn't an object
    if (!add || !isObject(add)) return origin;

    var keys = Object.keys(add);
    var i = keys.length;
    while (i--) {
      origin[keys[i]] = add[keys[i]];
    }
    return origin;
  };

  function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }

  }).call(this,require('_process'),typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
  },{"./support/isBuffer":13,"_process":12,"inherits":10}],15:[function(require,module,exports){
  var unparse = require('escodegen').generate;

  module.exports = function (ast, vars) {
      if (!vars) vars = {};
      var FAIL = {};

      var result = (function walk (node) {
          if (node.type === 'Literal') {
              return node.value;
          }
          else if (node.type === 'UnaryExpression'){
              var val = walk(node.argument);
              if (node.operator === '+') return +val
              if (node.operator === '-') return -val
              if (node.operator === '~') return ~val
              if (node.operator === '!') return !val
              return FAIL
          }
          else if (node.type === 'ArrayExpression') {
              var xs = [];
              for (var i = 0, l = node.elements.length; i < l; i++) {
                  var x = walk(node.elements[i]);
                  if (x === FAIL) return FAIL;
                  xs.push(x);
              }
              return xs;
          }
          else if (node.type === 'ObjectExpression') {
              var obj = {};
              for (var i = 0; i < node.properties.length; i++) {
                  var prop = node.properties[i];
                  var value = prop.value === null
                      ? prop.value
                      : walk(prop.value)
                  ;
                  if (value === FAIL) return FAIL;
                  obj[prop.key.value || prop.key.name] = value;
              }
              return obj;
          }
          else if (node.type === 'BinaryExpression' ||
                   node.type === 'LogicalExpression') {
              var l = walk(node.left);
              if (l === FAIL) return FAIL;
              var r = walk(node.right);
              if (r === FAIL) return FAIL;

              var op = node.operator;
              if (op === '==') return l == r;
              if (op === '===') return l === r;
              if (op === '!=') return l != r;
              if (op === '!==') return l !== r;
              if (op === '+') return l + r;
              if (op === '-') return l - r;
              if (op === '*') return l * r;
              if (op === '/') return l / r;
              if (op === '%') return l % r;
              if (op === '<') return l < r;
              if (op === '<=') return l <= r;
              if (op === '>') return l > r;
              if (op === '>=') return l >= r;
              if (op === '|') return l | r;
              if (op === '&') return l & r;
              if (op === '^') return l ^ r;
              if (op === '&&') return l && r;
              if (op === '||') return l || r;

              return FAIL;
          }
          else if (node.type === 'Identifier') {
              if ({}.hasOwnProperty.call(vars, node.name)) {
                  return vars[node.name];
              }
              else return FAIL;
          }
          else if (node.type === 'CallExpression') {
              var callee = walk(node.callee);
              if (callee === FAIL) return FAIL;

              var ctx = node.callee.object ? walk(node.callee.object) : FAIL;
              if (ctx === FAIL) ctx = null;

              var args = [];
              for (var i = 0, l = node.arguments.length; i < l; i++) {
                  var x = walk(node.arguments[i]);
                  if (x === FAIL) return FAIL;
                  args.push(x);
              }
              return callee.apply(ctx, args);
          }
          else if (node.type === 'MemberExpression') {
              var obj = walk(node.object);
              if (obj === FAIL) return FAIL;
              if (node.property.type === 'Identifier') {
                  return obj[node.property.name];
              }
              var prop = walk(node.property);
              if (prop === FAIL) return FAIL;
              return obj[prop];
          }
          else if (node.type === 'ConditionalExpression') {
              var val = walk(node.test);
              if (val === FAIL) return FAIL;
              return val ? walk(node.consequent) : walk(node.alternate)
          }
          else if (node.type === 'FunctionExpression') {
              return Function('return ' + unparse(node))();
          }
          else return FAIL;
      })(ast);

      return result === FAIL ? undefined : result;
  };

  },{"escodegen":8}],"jsonpath":[function(require,module,exports){
  module.exports = require('./lib/index');

  },{"./lib/index":5}]},{},["jsonpath"])("jsonpath")
  });
  });

  var jsonSchemaRefParser = createCommonjsModule(function(module, exports) {/*!
* JSON Schema $Ref Parser v5.0.0 (March 18th 2018)
*
* https://github.com/BigstickCarpet/json-schema-ref-parser
*
* @author  James Messinger (http://bigstickcarpet.com)
* @license MIT
*/
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.$RefParser = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

var $Ref = _dereq_('./ref'),
  Pointer = _dereq_('./pointer'),
  debug = _dereq_('./util/debug'),
  url = _dereq_('./util/url');

module.exports = bundle;

/**
* Bundles all external JSON references into the main JSON schema, thus resulting in a schema that
* only has *internal* references, not any *external* references.
* This method mutates the JSON schema object, adding new references and re-mapping existing ones.
*
* @param {$RefParser} parser
* @param {$RefParserOptions} options
*/
function bundle (parser, options) {
debug('Bundling $ref pointers in %s', parser.$refs._root$Ref.path);

// Build an inventory of all $ref pointers in the JSON Schema
var inventory = [];
crawl(parser, 'schema', parser.$refs._root$Ref.path + '#', '#', 0, inventory, parser.$refs, options);

// Remap all $ref pointers
remap(inventory);
}

/**
* Recursively crawls the given value, and inventories all JSON references.
*
* @param {object} parent - The object containing the value to crawl. If the value is not an object or array, it will be ignored.
* @param {string} key - The property key of `parent` to be crawled
* @param {string} path - The full path of the property being crawled, possibly with a JSON Pointer in the hash
* @param {string} pathFromRoot - The path of the property being crawled, from the schema root
* @param {object[]} inventory - An array of already-inventoried $ref pointers
* @param {$Refs} $refs
* @param {$RefParserOptions} options
*/
function crawl (parent, key, path, pathFromRoot, indirections, inventory, $refs, options) {
var obj = key === null ? parent : parent[key];

if (obj && typeof obj === 'object') {
  if ($Ref.isAllowed$Ref(obj)) {
    inventory$Ref(parent, key, path, pathFromRoot, indirections, inventory, $refs, options);
  }
  else {
    var keys = Object.keys(obj);

    // Most people will expect references to be bundled into the the "definitions" property,
    // so we always crawl that property first, if it exists.
    var defs = keys.indexOf('definitions');
    if (defs > 0) {
      keys.splice(0, 0, keys.splice(defs, 1)[0]);
    }

    keys.forEach(function (key) {
      var keyPath = Pointer.join(path, key);
      var keyPathFromRoot = Pointer.join(pathFromRoot, key);
      var value = obj[key];

      if ($Ref.isAllowed$Ref(value)) {
        inventory$Ref(obj, key, path, keyPathFromRoot, indirections, inventory, $refs, options);
      }
      else {
        crawl(obj, key, keyPath, keyPathFromRoot, indirections, inventory, $refs, options);
      }
    });
  }
}
}

/**
* Inventories the given JSON Reference (i.e. records detailed information about it so we can
* optimize all $refs in the schema), and then crawls the resolved value.
*
* @param {object} $refParent - The object that contains a JSON Reference as one of its keys
* @param {string} $refKey - The key in `$refParent` that is a JSON Reference
* @param {string} path - The full path of the JSON Reference at `$refKey`, possibly with a JSON Pointer in the hash
* @param {string} pathFromRoot - The path of the JSON Reference at `$refKey`, from the schema root
* @param {object[]} inventory - An array of already-inventoried $ref pointers
* @param {$Refs} $refs
* @param {$RefParserOptions} options
*/
function inventory$Ref ($refParent, $refKey, path, pathFromRoot, indirections, inventory, $refs, options) {
var $ref = $refKey === null ? $refParent : $refParent[$refKey];
var $refPath = url.resolve(path, $ref.$ref);
var pointer = $refs._resolve($refPath, options);
var depth = Pointer.parse(pathFromRoot).length;
var file = url.stripHash(pointer.path);
var hash = url.getHash(pointer.path);
var external = file !== $refs._root$Ref.path;
var extended = $Ref.isExtended$Ref($ref);
indirections += pointer.indirections;

var existingEntry = findInInventory(inventory, $refParent, $refKey);
if (existingEntry) {
  // This $Ref has already been inventoried, so we don't need to process it again
  if (depth < existingEntry.depth || indirections < existingEntry.indirections) {
    removeFromInventory(inventory, existingEntry);
  }
  else {
    return;
  }
}

inventory.push({
  $ref: $ref,                   // The JSON Reference (e.g. {$ref: string})
  parent: $refParent,           // The object that contains this $ref pointer
  key: $refKey,                 // The key in `parent` that is the $ref pointer
  pathFromRoot: pathFromRoot,   // The path to the $ref pointer, from the JSON Schema root
  depth: depth,                 // How far from the JSON Schema root is this $ref pointer?
  file: file,                   // The file that the $ref pointer resolves to
  hash: hash,                   // The hash within `file` that the $ref pointer resolves to
  value: pointer.value,         // The resolved value of the $ref pointer
  circular: pointer.circular,   // Is this $ref pointer DIRECTLY circular? (i.e. it references itself)
  extended: extended,           // Does this $ref extend its resolved value? (i.e. it has extra properties, in addition to "$ref")
  external: external,           // Does this $ref pointer point to a file other than the main JSON Schema file?
  indirections: indirections,   // The number of indirect references that were traversed to resolve the value
});

// Recursively crawl the resolved value
crawl(pointer.value, null, pointer.path, pathFromRoot, indirections + 1, inventory, $refs, options);
}

/**
* Re-maps every $ref pointer, so that they're all relative to the root of the JSON Schema.
* Each referenced value is dereferenced EXACTLY ONCE.  All subsequent references to the same
* value are re-mapped to point to the first reference.
*
* @example:
*  {
*    first: { $ref: somefile.json#/some/part },
*    second: { $ref: somefile.json#/another/part },
*    third: { $ref: somefile.json },
*    fourth: { $ref: somefile.json#/some/part/sub/part }
*  }
*
* In this example, there are four references to the same file, but since the third reference points
* to the ENTIRE file, that's the only one we need to dereference.  The other three can just be
* remapped to point inside the third one.
*
* On the other hand, if the third reference DIDN'T exist, then the first and second would both need
* to be dereferenced, since they point to different parts of the file. The fourth reference does NOT
* need to be dereferenced, because it can be remapped to point inside the first one.
*
* @param {object[]} inventory
*/
function remap (inventory) {
// Group & sort all the $ref pointers, so they're in the order that we need to dereference/remap them
inventory.sort(function (a, b) {
  if (a.file !== b.file) {
    return a.file < b.file ? -1 : +1;       // Group all the $refs that point to the same file
  }
  else if (a.hash !== b.hash) {
    return a.hash < b.hash ? -1 : +1;       // Group all the $refs that point to the same part of the file
  }
  else if (a.circular !== b.circular) {
    return a.circular ? -1 : +1;            // If the $ref points to itself, then sort it higher than other $refs that point to this $ref
  }
  else if (a.extended !== b.extended) {
    return a.extended ? +1 : -1;            // If the $ref extends the resolved value, then sort it lower than other $refs that don't extend the value
  }
  else if (a.indirections !== b.indirections) {
    return a.indirections - b.indirections; // Sort direct references higher than indirect references
  }
  else if (a.depth !== b.depth) {
    return a.depth - b.depth;               // Sort $refs by how close they are to the JSON Schema root
  }
  else {
    // If all else is equal, use the $ref that's in the "definitions" property
    return b.pathFromRoot.lastIndexOf('/definitions') - a.pathFromRoot.lastIndexOf('/definitions');
  }
});

var file, hash, pathFromRoot;
inventory.forEach(function (entry) {
  debug('Re-mapping $ref pointer "%s" at %s', entry.$ref.$ref, entry.pathFromRoot);

  if (!entry.external) {
    // This $ref already resolves to the main JSON Schema file
    entry.$ref.$ref = entry.hash;
  }
  else if (entry.file === file && entry.hash === hash) {
    // This $ref points to the same value as the prevous $ref, so remap it to the same path
    entry.$ref.$ref = pathFromRoot;
  }
  else if (entry.file === file && entry.hash.indexOf(hash + '/') === 0) {
    // This $ref points to the a sub-value as the prevous $ref, so remap it beneath that path
    entry.$ref.$ref = Pointer.join(pathFromRoot, Pointer.parse(entry.hash));
  }
  else {
    // We've moved to a new file or new hash
    file = entry.file;
    hash = entry.hash;
    pathFromRoot = entry.pathFromRoot;

    // This is the first $ref to point to this value, so dereference the value.
    // Any other $refs that point to the same value will point to this $ref instead
    entry.$ref = entry.parent[entry.key] = $Ref.dereference(entry.$ref, entry.value);

    if (entry.circular) {
      // This $ref points to itself
      entry.$ref.$ref = entry.pathFromRoot;
    }
  }

  debug('    new value: %s', (entry.$ref && entry.$ref.$ref) ? entry.$ref.$ref : '[object Object]');
});
}

/**
* TODO
*/
function findInInventory (inventory, $refParent, $refKey) {
for (var i = 0; i < inventory.length; i++) {
  var existingEntry = inventory[i];
  if (existingEntry.parent === $refParent && existingEntry.key === $refKey) {
    return existingEntry;
  }
}
}

function removeFromInventory (inventory, entry) {
var index = inventory.indexOf(entry);
inventory.splice(index, 1);
}

},{"./pointer":11,"./ref":12,"./util/debug":17,"./util/url":19}],2:[function(_dereq_,module,exports){
'use strict';

var $Ref = _dereq_('./ref'),
  Pointer = _dereq_('./pointer'),
  ono = _dereq_('ono'),
  debug = _dereq_('./util/debug'),
  url = _dereq_('./util/url');

module.exports = dereference;

/**
* Crawls the JSON schema, finds all JSON references, and dereferences them.
* This method mutates the JSON schema object, replacing JSON references with their resolved value.
*
* @param {$RefParser} parser
* @param {$RefParserOptions} options
*/
function dereference (parser, options) {
debug('Dereferencing $ref pointers in %s', parser.$refs._root$Ref.path);
var dereferenced = crawl(parser.schema, parser.$refs._root$Ref.path, '#', [], parser.$refs, options);
parser.$refs.circular = dereferenced.circular;
parser.schema = dereferenced.value;
}

/**
* Recursively crawls the given value, and dereferences any JSON references.
*
* @param {*} obj - The value to crawl. If it's not an object or array, it will be ignored.
* @param {string} path - The full path of `obj`, possibly with a JSON Pointer in the hash
* @param {string} pathFromRoot - The path of `obj` from the schema root
* @param {object[]} parents - An array of the parent objects that have already been dereferenced
* @param {$Refs} $refs
* @param {$RefParserOptions} options
* @returns {{value: object, circular: boolean}}
*/
function crawl (obj, path, pathFromRoot, parents, $refs, options) {
var dereferenced;
var result = {
  value: obj,
  circular: false
};

if (obj && typeof obj === 'object') {
  parents.push(obj);

  if ($Ref.isAllowed$Ref(obj, options)) {
    dereferenced = dereference$Ref(obj, path, pathFromRoot, parents, $refs, options);
    result.circular = dereferenced.circular;
    result.value = dereferenced.value;
  }
  else {
    Object.keys(obj).forEach(function (key) {
      var keyPath = Pointer.join(path, key);
      var keyPathFromRoot = Pointer.join(pathFromRoot, key);
      var value = obj[key];
      var circular = false;

      if ($Ref.isAllowed$Ref(value, options)) {
        dereferenced = dereference$Ref(value, keyPath, keyPathFromRoot, parents, $refs, options);
        circular = dereferenced.circular;
        obj[key] = dereferenced.value;
      }
      else {
        if (parents.indexOf(value) === -1) {
          dereferenced = crawl(value, keyPath, keyPathFromRoot, parents, $refs, options);
          circular = dereferenced.circular;
          obj[key] = dereferenced.value;
        }
        else {
          circular = foundCircularReference(keyPath, $refs, options);
        }
      }

      // Set the "isCircular" flag if this or any other property is circular
      result.circular = result.circular || circular;
    });
  }

  parents.pop();
}

return result;
}

/**
* Dereferences the given JSON Reference, and then crawls the resulting value.
*
* @param {{$ref: string}} $ref - The JSON Reference to resolve
* @param {string} path - The full path of `$ref`, possibly with a JSON Pointer in the hash
* @param {string} pathFromRoot - The path of `$ref` from the schema root
* @param {object[]} parents - An array of the parent objects that have already been dereferenced
* @param {$Refs} $refs
* @param {$RefParserOptions} options
* @returns {{value: object, circular: boolean}}
*/
function dereference$Ref ($ref, path, pathFromRoot, parents, $refs, options) {
debug('Dereferencing $ref pointer "%s" at %s', $ref.$ref, path);

var $refPath = url.resolve(path, $ref.$ref);
var pointer = $refs._resolve($refPath, options);

// Check for circular references
var directCircular = pointer.circular;
var circular = directCircular || parents.indexOf(pointer.value) !== -1;
circular && foundCircularReference(path, $refs, options);

// Dereference the JSON reference
var dereferencedValue = $Ref.dereference($ref, pointer.value);

// Crawl the dereferenced value (unless it's circular)
if (!circular) {
  // Determine if the dereferenced value is circular
  var dereferenced = crawl(dereferencedValue, pointer.path, pathFromRoot, parents, $refs, options);
  circular = dereferenced.circular;
  dereferencedValue = dereferenced.value;
}

if (circular && !directCircular && options.dereference.circular === 'ignore') {
  // The user has chosen to "ignore" circular references, so don't change the value
  dereferencedValue = $ref;
}

if (directCircular) {
  // The pointer is a DIRECT circular reference (i.e. it references itself).
  // So replace the $ref path with the absolute path from the JSON Schema root
  dereferencedValue.$ref = pathFromRoot;
}

return {
  circular: circular,
  value: dereferencedValue
};
}

/**
* Called when a circular reference is found.
* It sets the {@link $Refs#circular} flag, and throws an error if options.dereference.circular is false.
*
* @param {string} keyPath - The JSON Reference path of the circular reference
* @param {$Refs} $refs
* @param {$RefParserOptions} options
* @returns {boolean} - always returns true, to indicate that a circular reference was found
*/
function foundCircularReference (keyPath, $refs, options) {
$refs.circular = true;
if (!options.dereference.circular) {
  throw ono.reference('Circular $ref pointer found at %s', keyPath);
}
return true;
}

},{"./pointer":11,"./ref":12,"./util/debug":17,"./util/url":19,"ono":67}],3:[function(_dereq_,module,exports){
(function (Buffer){
'use strict';

var Options = _dereq_('./options'),
  $Refs = _dereq_('./refs'),
  parse = _dereq_('./parse'),
  normalizeArgs = _dereq_('./normalize-args'),
  resolveExternal = _dereq_('./resolve-external'),
  bundle = _dereq_('./bundle'),
  dereference = _dereq_('./dereference'),
  url = _dereq_('./util/url'),
  maybe = _dereq_('call-me-maybe'),
  ono = _dereq_('ono');

module.exports = $RefParser;
module.exports.YAML = _dereq_('./util/yaml');

/**
* This class parses a JSON schema, builds a map of its JSON references and their resolved values,
* and provides methods for traversing, manipulating, and dereferencing those references.
*
* @constructor
*/
function $RefParser () {
/**
 * The parsed (and possibly dereferenced) JSON schema object
 *
 * @type {object}
 * @readonly
 */
this.schema = null;

/**
 * The resolved JSON references
 *
 * @type {$Refs}
 * @readonly
 */
this.$refs = new $Refs();
}

/**
* Parses the given JSON schema.
* This method does not resolve any JSON references.
* It just reads a single file in JSON or YAML format, and parse it as a JavaScript object.
*
* @param {string} [path] - The file path or URL of the JSON schema
* @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
* @param {$RefParserOptions} [options] - Options that determine how the schema is parsed
* @param {function} [callback] - An error-first callback. The second parameter is the parsed JSON schema object.
* @returns {Promise} - The returned promise resolves with the parsed JSON schema object.
*/
$RefParser.parse = function (path, schema, options, callback) {
var Class = this; // eslint-disable-line consistent-this
var instance = new Class();
return instance.parse.apply(instance, arguments);
};

/**
* Parses the given JSON schema.
* This method does not resolve any JSON references.
* It just reads a single file in JSON or YAML format, and parse it as a JavaScript object.
*
* @param {string} [path] - The file path or URL of the JSON schema
* @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
* @param {$RefParserOptions} [options] - Options that determine how the schema is parsed
* @param {function} [callback] - An error-first callback. The second parameter is the parsed JSON schema object.
* @returns {Promise} - The returned promise resolves with the parsed JSON schema object.
*/
$RefParser.prototype.parse = function (path, schema, options, callback) {
var args = normalizeArgs(arguments);
var promise;

if (!args.path && !args.schema) {
  var err = ono('Expected a file path, URL, or object. Got %s', args.path || args.schema);
  return maybe(args.callback, Promise.reject(err));
}

// Reset everything
this.schema = null;
this.$refs = new $Refs();

// If the path is a filesystem path, then convert it to a URL.
// NOTE: According to the JSON Reference spec, these should already be URLs,
// but, in practice, many people use local filesystem paths instead.
// So we're being generous here and doing the conversion automatically.
// This is not intended to be a 100% bulletproof solution.
// If it doesn't work for your use-case, then use a URL instead.
var pathType = 'http';
if (url.isFileSystemPath(args.path)) {
  args.path = url.fromFileSystemPath(args.path);
  pathType = 'file';
}

// Resolve the absolute path of the schema
args.path = url.resolve(url.cwd(), args.path);

if (args.schema && typeof args.schema === 'object') {
  // A schema object was passed-in.
  // So immediately add a new $Ref with the schema object as its value
  var $ref = this.$refs._add(args.path);
  $ref.value = args.schema;
  $ref.pathType = pathType;
  promise = Promise.resolve(args.schema);
}
else {
  // Parse the schema file/url
  promise = parse(args.path, this.$refs, args.options);
}

var me = this;
return promise
  .then(function (result) {
    if (!result || typeof result !== 'object' || Buffer.isBuffer(result)) {
      throw ono.syntax('"%s" is not a valid JSON Schema', me.$refs._root$Ref.path || result);
    }
    else {
      me.schema = result;
      return maybe(args.callback, Promise.resolve(me.schema));
    }
  })
  .catch(function (e) {
    return maybe(args.callback, Promise.reject(e));
  });
};

/**
* Parses the given JSON schema and resolves any JSON references, including references in
* externally-referenced files.
*
* @param {string} [path] - The file path or URL of the JSON schema
* @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
* @param {$RefParserOptions} [options] - Options that determine how the schema is parsed and resolved
* @param {function} [callback]
* - An error-first callback. The second parameter is a {@link $Refs} object containing the resolved JSON references
*
* @returns {Promise}
* The returned promise resolves with a {@link $Refs} object containing the resolved JSON references
*/
$RefParser.resolve = function (path, schema, options, callback) {
var Class = this; // eslint-disable-line consistent-this
var instance = new Class();
return instance.resolve.apply(instance, arguments);
};

/**
* Parses the given JSON schema and resolves any JSON references, including references in
* externally-referenced files.
*
* @param {string} [path] - The file path or URL of the JSON schema
* @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
* @param {$RefParserOptions} [options] - Options that determine how the schema is parsed and resolved
* @param {function} [callback]
* - An error-first callback. The second parameter is a {@link $Refs} object containing the resolved JSON references
*
* @returns {Promise}
* The returned promise resolves with a {@link $Refs} object containing the resolved JSON references
*/
$RefParser.prototype.resolve = function (path, schema, options, callback) {
var me = this;
var args = normalizeArgs(arguments);

return this.parse(args.path, args.schema, args.options)
  .then(function () {
    return resolveExternal(me, args.options);
  })
  .then(function () {
    return maybe(args.callback, Promise.resolve(me.$refs));
  })
  .catch(function (err) {
    return maybe(args.callback, Promise.reject(err));
  });
};

/**
* Parses the given JSON schema, resolves any JSON references, and bundles all external references
* into the main JSON schema. This produces a JSON schema that only has *internal* references,
* not any *external* references.
*
* @param {string} [path] - The file path or URL of the JSON schema
* @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
* @param {$RefParserOptions} [options] - Options that determine how the schema is parsed, resolved, and dereferenced
* @param {function} [callback] - An error-first callback. The second parameter is the bundled JSON schema object
* @returns {Promise} - The returned promise resolves with the bundled JSON schema object.
*/
$RefParser.bundle = function (path, schema, options, callback) {
var Class = this; // eslint-disable-line consistent-this
var instance = new Class();
return instance.bundle.apply(instance, arguments);
};

/**
* Parses the given JSON schema, resolves any JSON references, and bundles all external references
* into the main JSON schema. This produces a JSON schema that only has *internal* references,
* not any *external* references.
*
* @param {string} [path] - The file path or URL of the JSON schema
* @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
* @param {$RefParserOptions} [options] - Options that determine how the schema is parsed, resolved, and dereferenced
* @param {function} [callback] - An error-first callback. The second parameter is the bundled JSON schema object
* @returns {Promise} - The returned promise resolves with the bundled JSON schema object.
*/
$RefParser.prototype.bundle = function (path, schema, options, callback) {
var me = this;
var args = normalizeArgs(arguments);

return this.resolve(args.path, args.schema, args.options)
  .then(function () {
    bundle(me, args.options);
    return maybe(args.callback, Promise.resolve(me.schema));
  })
  .catch(function (err) {
    return maybe(args.callback, Promise.reject(err));
  });
};

/**
* Parses the given JSON schema, resolves any JSON references, and dereferences the JSON schema.
* That is, all JSON references are replaced with their resolved values.
*
* @param {string} [path] - The file path or URL of the JSON schema
* @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
* @param {$RefParserOptions} [options] - Options that determine how the schema is parsed, resolved, and dereferenced
* @param {function} [callback] - An error-first callback. The second parameter is the dereferenced JSON schema object
* @returns {Promise} - The returned promise resolves with the dereferenced JSON schema object.
*/
$RefParser.dereference = function (path, schema, options, callback) {
var Class = this; // eslint-disable-line consistent-this
var instance = new Class();
return instance.dereference.apply(instance, arguments);
};

/**
* Parses the given JSON schema, resolves any JSON references, and dereferences the JSON schema.
* That is, all JSON references are replaced with their resolved values.
*
* @param {string} [path] - The file path or URL of the JSON schema
* @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
* @param {$RefParserOptions} [options] - Options that determine how the schema is parsed, resolved, and dereferenced
* @param {function} [callback] - An error-first callback. The second parameter is the dereferenced JSON schema object
* @returns {Promise} - The returned promise resolves with the dereferenced JSON schema object.
*/
$RefParser.prototype.dereference = function (path, schema, options, callback) {
var me = this;
var args = normalizeArgs(arguments);

return this.resolve(args.path, args.schema, args.options)
  .then(function () {
    dereference(me, args.options);
    return maybe(args.callback, Promise.resolve(me.schema));
  })
  .catch(function (err) {
    return maybe(args.callback, Promise.reject(err));
  });
};

}).call(this,{"isBuffer":_dereq_("../node_modules/is-buffer/index.js")})

},{"../node_modules/is-buffer/index.js":34,"./bundle":1,"./dereference":2,"./normalize-args":4,"./options":5,"./parse":6,"./refs":13,"./resolve-external":14,"./util/url":19,"./util/yaml":20,"call-me-maybe":25,"ono":67}],4:[function(_dereq_,module,exports){
'use strict';

var Options = _dereq_('./options');

module.exports = normalizeArgs;

/**
* Normalizes the given arguments, accounting for optional args.
*
* @param {Arguments} args
* @returns {object}
*/
function normalizeArgs (args) {
var path, schema, options, callback;
args = Array.prototype.slice.call(args);

if (typeof args[args.length - 1] === 'function') {
  // The last parameter is a callback function
  callback = args.pop();
}

if (typeof args[0] === 'string') {
  // The first parameter is the path
  path = args[0];
  if (typeof args[2] === 'object') {
    // The second parameter is the schema, and the third parameter is the options
    schema = args[1];
    options = args[2];
  }
  else {
    // The second parameter is the options
    schema = undefined;
    options = args[1];
  }
}
else {
  // The first parameter is the schema
  path = '';
  schema = args[0];
  options = args[1];
}

if (!(options instanceof Options)) {
  options = new Options(options);
}

return {
  path: path,
  schema: schema,
  options: options,
  callback: callback
};
}

},{"./options":5}],5:[function(_dereq_,module,exports){
/* eslint lines-around-comment: [2, {beforeBlockComment: false}] */
'use strict';

var jsonParser = _dereq_('./parsers/json'),
  yamlParser = _dereq_('./parsers/yaml'),
  textParser = _dereq_('./parsers/text'),
  binaryParser = _dereq_('./parsers/binary'),
  fileResolver = _dereq_('./resolvers/file'),
  httpResolver = _dereq_('./resolvers/http');

module.exports = $RefParserOptions;

/**
* Options that determine how JSON schemas are parsed, resolved, and dereferenced.
*
* @param {object|$RefParserOptions} [options] - Overridden options
* @constructor
*/
function $RefParserOptions (options) {
merge(this, $RefParserOptions.defaults);
merge(this, options);
}

$RefParserOptions.defaults = {
/**
 * Determines how different types of files will be parsed.
 *
 * You can add additional parsers of your own, replace an existing one with
 * your own implemenation, or disable any parser by setting it to false.
 */
parse: {
  json: jsonParser,
  yaml: yamlParser,
  text: textParser,
  binary: binaryParser,
},

/**
 * Determines how JSON References will be resolved.
 *
 * You can add additional resolvers of your own, replace an existing one with
 * your own implemenation, or disable any resolver by setting it to false.
 */
resolve: {
  file: fileResolver,
  http: httpResolver,

  /**
   * Determines whether external $ref pointers will be resolved.
   * If this option is disabled, then none of above resolvers will be called.
   * Instead, external $ref pointers will simply be ignored.
   *
   * @type {boolean}
   */
  external: true,
},

/**
 * Determines the types of JSON references that are allowed.
 */
dereference: {
  /**
   * Dereference circular (recursive) JSON references?
   * If false, then a {@link ReferenceError} will be thrown if a circular reference is found.
   * If "ignore", then circular references will not be dereferenced.
   *
   * @type {boolean|string}
   */
  circular: true
},
};

/**
* Merges the properties of the source object into the target object.
*
* @param {object} target - The object that we're populating
* @param {?object} source - The options that are being merged
* @returns {object}
*/
function merge (target, source) {
if (isMergeable(source)) {
  var keys = Object.keys(source);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var sourceSetting = source[key];
    var targetSetting = target[key];

    if (isMergeable(sourceSetting)) {
      // It's a nested object, so merge it recursively
      target[key] = merge(targetSetting || {}, sourceSetting);
    }
    else if (sourceSetting !== undefined) {
      // It's a scalar value, function, or array. No merging necessary. Just overwrite the target value.
      target[key] = sourceSetting;
    }
  }
}
return target;
}

/**
* Determines whether the given value can be merged,
* or if it is a scalar value that should just override the target value.
*
* @param   {*}  val
* @returns {Boolean}
*/
function isMergeable (val) {
return val &&
  (typeof val === 'object') &&
  !Array.isArray(val) &&
  !(val instanceof RegExp) &&
  !(val instanceof Date);
}

},{"./parsers/binary":7,"./parsers/json":8,"./parsers/text":9,"./parsers/yaml":10,"./resolvers/file":15,"./resolvers/http":16}],6:[function(_dereq_,module,exports){
(function (Buffer){
'use strict';

var ono = _dereq_('ono'),
  debug = _dereq_('./util/debug'),
  url = _dereq_('./util/url'),
  plugins = _dereq_('./util/plugins');

module.exports = parse;

/**
* Reads and parses the specified file path or URL.
*
* @param {string} path - This path MUST already be resolved, since `read` doesn't know the resolution context
* @param {$Refs} $refs
* @param {$RefParserOptions} options
*
* @returns {Promise}
* The promise resolves with the parsed file contents, NOT the raw (Buffer) contents.
*/
function parse (path, $refs, options) {
try {
  // Remove the URL fragment, if any
  path = url.stripHash(path);

  // Add a new $Ref for this file, even though we don't have the value yet.
  // This ensures that we don't simultaneously read & parse the same file multiple times
  var $ref = $refs._add(path);

  // This "file object" will be passed to all resolvers and parsers.
  var file = {
    url: path,
    extension: url.getExtension(path),
  };

  // Read the file and then parse the data
  return readFile(file, options)
    .then(function (resolver) {
      $ref.pathType = resolver.plugin.name;
      file.data = resolver.result;
      return parseFile(file, options);
    })
    .then(function (parser) {
      $ref.value = parser.result;
      return parser.result;
    });
}
catch (e) {
  return Promise.reject(e);
}
}

/**
* Reads the given file, using the configured resolver plugins
*
* @param {object} file           - An object containing information about the referenced file
* @param {string} file.url       - The full URL of the referenced file
* @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
* @param {$RefParserOptions} options
*
* @returns {Promise}
* The promise resolves with the raw file contents and the resolver that was used.
*/
function readFile (file, options) {
return new Promise(function (resolve, reject) {
  debug('Reading %s', file.url);

  // Find the resolvers that can read this file
  var resolvers = plugins.all(options.resolve);
  resolvers = plugins.filter(resolvers, 'canRead', file);

  // Run the resolvers, in order, until one of them succeeds
  plugins.sort(resolvers);
  plugins.run(resolvers, 'read', file)
    .then(resolve, onError);

  function onError (err) {
    // Throw the original error, if it's one of our own (user-friendly) errors.
    // Otherwise, throw a generic, friendly error.
    if (err && !(err instanceof SyntaxError)) {
      reject(err);
    }
    else {
      reject(ono.syntax('Unable to resolve $ref pointer "%s"', file.url));
    }
  }
});
}

/**
* Parses the given file's contents, using the configured parser plugins.
*
* @param {object} file           - An object containing information about the referenced file
* @param {string} file.url       - The full URL of the referenced file
* @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
* @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
* @param {$RefParserOptions} options
*
* @returns {Promise}
* The promise resolves with the parsed file contents and the parser that was used.
*/
function parseFile (file, options) {
return new Promise(function (resolve, reject) {
  debug('Parsing %s', file.url);

  // Find the parsers that can read this file type.
  // If none of the parsers are an exact match for this file, then we'll try ALL of them.
  // This handles situations where the file IS a supported type, just with an unknown extension.
  var allParsers = plugins.all(options.parse);
  var filteredParsers = plugins.filter(allParsers, 'canParse', file);
  var parsers = filteredParsers.length > 0 ? filteredParsers : allParsers;

  // Run the parsers, in order, until one of them succeeds
  plugins.sort(parsers);
  plugins.run(parsers, 'parse', file)
    .then(onParsed, onError);

  function onParsed (parser) {
    if (!parser.plugin.allowEmpty && isEmpty(parser.result)) {
      reject(ono.syntax('Error parsing "%s" as %s. \nParsed value is empty', file.url, parser.plugin.name));
    }
    else {
      resolve(parser);
    }
  }

  function onError (err) {
    if (err) {
      err = err instanceof Error ? err : new Error(err);
      reject(ono.syntax(err, 'Error parsing %s', file.url));
    }
    else {
      reject(ono.syntax('Unable to parse %s', file.url));
    }
  }
});
}

/**
* Determines whether the parsed value is "empty".
*
* @param {*} value
* @returns {boolean}
*/
function isEmpty (value) {
return value === undefined ||
  (typeof value === 'object' && Object.keys(value).length === 0) ||
  (typeof value === 'string' && value.trim().length === 0) ||
  (Buffer.isBuffer(value) && value.length === 0);
}

}).call(this,{"isBuffer":_dereq_("../node_modules/is-buffer/index.js")})

},{"../node_modules/is-buffer/index.js":34,"./util/debug":17,"./util/plugins":18,"./util/url":19,"ono":67}],7:[function(_dereq_,module,exports){
(function (Buffer){
'use strict';

var BINARY_REGEXP = /\.(jpeg|jpg|gif|png|bmp|ico)$/i;

module.exports = {
/**
 * The order that this parser will run, in relation to other parsers.
 *
 * @type {number}
 */
order: 400,

/**
 * Whether to allow "empty" files (zero bytes).
 *
 * @type {boolean}
 */
allowEmpty: true,

/**
 * Determines whether this parser can parse a given file reference.
 * Parsers that return true will be tried, in order, until one successfully parses the file.
 * Parsers that return false will be skipped, UNLESS all parsers returned false, in which case
 * every parser will be tried.
 *
 * @param {object} file           - An object containing information about the referenced file
 * @param {string} file.url       - The full URL of the referenced file
 * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
 * @returns {boolean}
 */
canParse: function isBinary (file) {
  // Use this parser if the file is a Buffer, and has a known binary extension
  return Buffer.isBuffer(file.data) && BINARY_REGEXP.test(file.url);
},

/**
 * Parses the given data as a Buffer (byte array).
 *
 * @param {object} file           - An object containing information about the referenced file
 * @param {string} file.url       - The full URL of the referenced file
 * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
 * @returns {Promise<Buffer>}
 */
parse: function parseBinary (file) {
  if (Buffer.isBuffer(file.data)) {
    return file.data;
  }
  else {
    // This will reject if data is anything other than a string or typed array
    return new Buffer(file.data);
  }
}
};

}).call(this,_dereq_("buffer").Buffer)

},{"buffer":23}],8:[function(_dereq_,module,exports){
(function (Buffer){
'use strict';

module.exports = {
/**
 * The order that this parser will run, in relation to other parsers.
 *
 * @type {number}
 */
order: 100,

/**
 * Whether to allow "empty" files. This includes zero-byte files, as well as empty JSON objects.
 *
 * @type {boolean}
 */
allowEmpty: true,

/**
 * Determines whether this parser can parse a given file reference.
 * Parsers that match will be tried, in order, until one successfully parses the file.
 * Parsers that don't match will be skipped, UNLESS none of the parsers match, in which case
 * every parser will be tried.
 *
 * @type {RegExp|string[]|function}
 */
canParse: '.json',

/**
 * Parses the given file as JSON
 *
 * @param {object} file           - An object containing information about the referenced file
 * @param {string} file.url       - The full URL of the referenced file
 * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
 * @returns {Promise}
 */
parse: function parseJSON (file) {
  return new Promise(function (resolve, reject) {
    var data = file.data;
    if (Buffer.isBuffer(data)) {
      data = data.toString();
    }

    if (typeof data === 'string') {
      if (data.trim().length === 0) {
        resolve(undefined);  // This mirrors the YAML behavior
      }
      else {
        resolve(JSON.parse(data));
      }
    }
    else {
      // data is already a JavaScript value (object, array, number, null, NaN, etc.)
      resolve(data);
    }
  });
}
};

}).call(this,{"isBuffer":_dereq_("../../node_modules/is-buffer/index.js")})

},{"../../node_modules/is-buffer/index.js":34}],9:[function(_dereq_,module,exports){
(function (Buffer){
'use strict';

var TEXT_REGEXP = /\.(txt|htm|html|md|xml|js|min|map|css|scss|less|svg)$/i;

module.exports = {
/**
 * The order that this parser will run, in relation to other parsers.
 *
 * @type {number}
 */
order: 300,

/**
 * Whether to allow "empty" files (zero bytes).
 *
 * @type {boolean}
 */
allowEmpty: true,

/**
 * The encoding that the text is expected to be in.
 *
 * @type {string}
 */
encoding: 'utf8',

/**
 * Determines whether this parser can parse a given file reference.
 * Parsers that return true will be tried, in order, until one successfully parses the file.
 * Parsers that return false will be skipped, UNLESS all parsers returned false, in which case
 * every parser will be tried.
 *
 * @param {object} file           - An object containing information about the referenced file
 * @param {string} file.url       - The full URL of the referenced file
 * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
 * @returns {boolean}
 */
canParse: function isText (file) {
  // Use this parser if the file is a string or Buffer, and has a known text-based extension
  return (typeof file.data === 'string' || Buffer.isBuffer(file.data)) && TEXT_REGEXP.test(file.url);
},

/**
 * Parses the given file as text
 *
 * @param {object} file           - An object containing information about the referenced file
 * @param {string} file.url       - The full URL of the referenced file
 * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
 * @returns {Promise<string>}
 */
parse: function parseText (file) {
  if (typeof file.data === 'string') {
    return file.data;
  }
  else if (Buffer.isBuffer(file.data)) {
    return file.data.toString(this.encoding);
  }
  else {
    throw new Error('data is not text');
  }
}
};

}).call(this,{"isBuffer":_dereq_("../../node_modules/is-buffer/index.js")})

},{"../../node_modules/is-buffer/index.js":34}],10:[function(_dereq_,module,exports){
(function (Buffer){
'use strict';

var YAML = _dereq_('../util/yaml');

module.exports = {
/**
 * The order that this parser will run, in relation to other parsers.
 *
 * @type {number}
 */
order: 200,

/**
 * Whether to allow "empty" files. This includes zero-byte files, as well as empty JSON objects.
 *
 * @type {boolean}
 */
allowEmpty: true,

/**
 * Determines whether this parser can parse a given file reference.
 * Parsers that match will be tried, in order, until one successfully parses the file.
 * Parsers that don't match will be skipped, UNLESS none of the parsers match, in which case
 * every parser will be tried.
 *
 * @type {RegExp|string[]|function}
 */
canParse: ['.yaml', '.yml', '.json'],  // JSON is valid YAML

/**
 * Parses the given file as YAML
 *
 * @param {object} file           - An object containing information about the referenced file
 * @param {string} file.url       - The full URL of the referenced file
 * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
 * @returns {Promise}
 */
parse: function parseYAML (file) {
  return new Promise(function (resolve, reject) {
    var data = file.data;
    if (Buffer.isBuffer(data)) {
      data = data.toString();
    }

    if (typeof data === 'string') {
      resolve(YAML.parse(data));
    }
    else {
      // data is already a JavaScript value (object, array, number, null, NaN, etc.)
      resolve(data);
    }
  });
}
};

}).call(this,{"isBuffer":_dereq_("../../node_modules/is-buffer/index.js")})

},{"../../node_modules/is-buffer/index.js":34,"../util/yaml":20}],11:[function(_dereq_,module,exports){
'use strict';

module.exports = Pointer;

var $Ref = _dereq_('./ref'),
  url = _dereq_('./util/url'),
  ono = _dereq_('ono'),
  slashes = /\//g,
  tildes = /~/g,
  escapedSlash = /~1/g,
  escapedTilde = /~0/g;

/**
* This class represents a single JSON pointer and its resolved value.
*
* @param {$Ref} $ref
* @param {string} path
* @param {string} [friendlyPath] - The original user-specified path (used for error messages)
* @constructor
*/
function Pointer ($ref, path, friendlyPath) {
/**
 * The {@link $Ref} object that contains this {@link Pointer} object.
 * @type {$Ref}
 */
this.$ref = $ref;

/**
 * The file path or URL, containing the JSON pointer in the hash.
 * This path is relative to the path of the main JSON schema file.
 * @type {string}
 */
this.path = path;

/**
 * The original path or URL, used for error messages.
 * @type {string}
 */
this.originalPath = friendlyPath || path;

/**
 * The value of the JSON pointer.
 * Can be any JSON type, not just objects. Unknown file types are represented as Buffers (byte arrays).
 * @type {?*}
 */
this.value = undefined;

/**
 * Indicates whether the pointer references itself.
 * @type {boolean}
 */
this.circular = false;

/**
 * The number of indirect references that were traversed to resolve the value.
 * Resolving a single pointer may _dereq_ resolving multiple $Refs.
 * @type {number}
 */
this.indirections = 0;
}

/**
* Resolves the value of a nested property within the given object.
*
* @param {*} obj - The object that will be crawled
* @param {$RefParserOptions} options
*
* @returns {Pointer}
* Returns a JSON pointer whose {@link Pointer#value} is the resolved value.
* If resolving this value required resolving other JSON references, then
* the {@link Pointer#$ref} and {@link Pointer#path} will reflect the resolution path
* of the resolved value.
*/
Pointer.prototype.resolve = function (obj, options) {
var tokens = Pointer.parse(this.path);

// Crawl the object, one token at a time
this.value = obj;
for (var i = 0; i < tokens.length; i++) {
  if (resolveIf$Ref(this, options)) {
    // The $ref path has changed, so append the remaining tokens to the path
    this.path = Pointer.join(this.path, tokens.slice(i));
  }

  var token = tokens[i];
  if (this.value[token] === undefined) {
    throw ono.syntax('Error resolving $ref pointer "%s". \nToken "%s" does not exist.', this.originalPath, token);
  }
  else {
    this.value = this.value[token];
  }
}

// Resolve the final value
resolveIf$Ref(this, options);
return this;
};

/**
* Sets the value of a nested property within the given object.
*
* @param {*} obj - The object that will be crawled
* @param {*} value - the value to assign
* @param {$RefParserOptions} options
*
* @returns {*}
* Returns the modified object, or an entirely new object if the entire object is overwritten.
*/
Pointer.prototype.set = function (obj, value, options) {
var tokens = Pointer.parse(this.path);
var token;

if (tokens.length === 0) {
  // There are no tokens, replace the entire object with the new value
  this.value = value;
  return value;
}

// Crawl the object, one token at a time
this.value = obj;
for (var i = 0; i < tokens.length - 1; i++) {
  resolveIf$Ref(this, options);

  token = tokens[i];
  if (this.value && this.value[token] !== undefined) {
    // The token exists
    this.value = this.value[token];
  }
  else {
    // The token doesn't exist, so create it
    this.value = setValue(this, token, {});
  }
}

// Set the value of the final token
resolveIf$Ref(this, options);
token = tokens[tokens.length - 1];
setValue(this, token, value);

// Return the updated object
return obj;
};

/**
* Parses a JSON pointer (or a path containing a JSON pointer in the hash)
* and returns an array of the pointer's tokens.
* (e.g. "schema.json#/definitions/person/name" => ["definitions", "person", "name"])
*
* The pointer is parsed according to RFC 6901
* {@link https://tools.ietf.org/html/rfc6901#section-3}
*
* @param {string} path
* @returns {string[]}
*/
Pointer.parse = function (path) {
// Get the JSON pointer from the path's hash
var pointer = url.getHash(path).substr(1);

// If there's no pointer, then there are no tokens,
// so return an empty array
if (!pointer) {
  return [];
}

// Split into an array
pointer = pointer.split('/');

// Decode each part, according to RFC 6901
for (var i = 0; i < pointer.length; i++) {
  pointer[i] = decodeURI(pointer[i].replace(escapedSlash, '/').replace(escapedTilde, '~'));
}

if (pointer[0] !== '') {
  throw ono.syntax('Invalid $ref pointer "%s". Pointers must begin with "#/"', pointer);
}

return pointer.slice(1);
};

/**
* Creates a JSON pointer path, by joining one or more tokens to a base path.
*
* @param {string} base - The base path (e.g. "schema.json#/definitions/person")
* @param {string|string[]} tokens - The token(s) to append (e.g. ["name", "first"])
* @returns {string}
*/
Pointer.join = function (base, tokens) {
// Ensure that the base path contains a hash
if (base.indexOf('#') === -1) {
  base += '#';
}

// Append each token to the base path
tokens = Array.isArray(tokens) ? tokens : [tokens];
for (var i = 0; i < tokens.length; i++) {
  var token = tokens[i];
  // Encode the token, according to RFC 6901
  base += '/' + encodeURI(token.replace(tildes, '~0').replace(slashes, '~1'));
}

return base;
};

/**
* If the given pointer's {@link Pointer#value} is a JSON reference,
* then the reference is resolved and {@link Pointer#value} is replaced with the resolved value.
* In addition, {@link Pointer#path} and {@link Pointer#$ref} are updated to reflect the
* resolution path of the new value.
*
* @param {Pointer} pointer
* @param {$RefParserOptions} options
* @returns {boolean} - Returns `true` if the resolution path changed
*/
function resolveIf$Ref (pointer, options) {
// Is the value a JSON reference? (and allowed?)

if ($Ref.isAllowed$Ref(pointer.value, options)) {
  var $refPath = url.resolve(pointer.path, pointer.value.$ref);

  if ($refPath === pointer.path) {
    // The value is a reference to itself, so there's nothing to do.
    pointer.circular = true;
  }
  else {
    var resolved = pointer.$ref.$refs._resolve($refPath, options);
    pointer.indirections += resolved.indirections + 1;

    if ($Ref.isExtended$Ref(pointer.value)) {
      // This JSON reference "extends" the resolved value, rather than simply pointing to it.
      // So the resolved path does NOT change.  Just the value does.
      pointer.value = $Ref.dereference(pointer.value, resolved.value);
      return false;
    }
    else {
      // Resolve the reference
      pointer.$ref = resolved.$ref;
      pointer.path = resolved.path;
      pointer.value = resolved.value;
    }

    return true;
  }
}
}

/**
* Sets the specified token value of the {@link Pointer#value}.
*
* The token is evaluated according to RFC 6901.
* {@link https://tools.ietf.org/html/rfc6901#section-4}
*
* @param {Pointer} pointer - The JSON Pointer whose value will be modified
* @param {string} token - A JSON Pointer token that indicates how to modify `obj`
* @param {*} value - The value to assign
* @returns {*} - Returns the assigned value
*/
function setValue (pointer, token, value) {
if (pointer.value && typeof pointer.value === 'object') {
  if (token === '-' && Array.isArray(pointer.value)) {
    pointer.value.push(value);
  }
  else {
    pointer.value[token] = value;
  }
}
else {
  throw ono.syntax('Error assigning $ref pointer "%s". \nCannot set "%s" of a non-object.', pointer.path, token);
}
return value;
}

},{"./ref":12,"./util/url":19,"ono":67}],12:[function(_dereq_,module,exports){
'use strict';

module.exports = $Ref;

var Pointer = _dereq_('./pointer');

/**
* This class represents a single JSON reference and its resolved value.
*
* @constructor
*/
function $Ref () {
/**
 * The file path or URL of the referenced file.
 * This path is relative to the path of the main JSON schema file.
 *
 * This path does NOT contain document fragments (JSON pointers). It always references an ENTIRE file.
 * Use methods such as {@link $Ref#get}, {@link $Ref#resolve}, and {@link $Ref#exists} to get
 * specific JSON pointers within the file.
 *
 * @type {string}
 */
this.path = undefined;

/**
 * The resolved value of the JSON reference.
 * Can be any JSON type, not just objects. Unknown file types are represented as Buffers (byte arrays).
 * @type {?*}
 */
this.value = undefined;

/**
 * The {@link $Refs} object that contains this {@link $Ref} object.
 * @type {$Refs}
 */
this.$refs = undefined;

/**
 * Indicates the type of {@link $Ref#path} (e.g. "file", "http", etc.)
 * @type {?string}
 */
this.pathType = undefined;
}

/**
* Determines whether the given JSON reference exists within this {@link $Ref#value}.
*
* @param {string} path - The full path being resolved, optionally with a JSON pointer in the hash
* @param {$RefParserOptions} options
* @returns {boolean}
*/
$Ref.prototype.exists = function (path, options) {
try {
  this.resolve(path, options);
  return true;
}
catch (e) {
  return false;
}
};

/**
* Resolves the given JSON reference within this {@link $Ref#value} and returns the resolved value.
*
* @param {string} path - The full path being resolved, optionally with a JSON pointer in the hash
* @param {$RefParserOptions} options
* @returns {*} - Returns the resolved value
*/
$Ref.prototype.get = function (path, options) {
return this.resolve(path, options).value;
};

/**
* Resolves the given JSON reference within this {@link $Ref#value}.
*
* @param {string} path - The full path being resolved, optionally with a JSON pointer in the hash
* @param {$RefParserOptions} options
* @param {string} [friendlyPath] - The original user-specified path (used for error messages)
* @returns {Pointer}
*/
$Ref.prototype.resolve = function (path, options, friendlyPath) {
var pointer = new Pointer(this, path, friendlyPath);
return pointer.resolve(this.value, options);
};

/**
* Sets the value of a nested property within this {@link $Ref#value}.
* If the property, or any of its parents don't exist, they will be created.
*
* @param {string} path - The full path of the property to set, optionally with a JSON pointer in the hash
* @param {*} value - The value to assign
*/
$Ref.prototype.set = function (path, value) {
var pointer = new Pointer(this, path);
this.value = pointer.set(this.value, value);
};

/**
* Determines whether the given value is a JSON reference.
*
* @param {*} value - The value to inspect
* @returns {boolean}
*/
$Ref.is$Ref = function (value) {
return value && typeof value === 'object' && typeof value.$ref === 'string' && value.$ref.length > 0;
};

/**
* Determines whether the given value is an external JSON reference.
*
* @param {*} value - The value to inspect
* @returns {boolean}
*/
$Ref.isExternal$Ref = function (value) {
return $Ref.is$Ref(value) && value.$ref[0] !== '#';
};

/**
* Determines whether the given value is a JSON reference, and whether it is allowed by the options.
* For example, if it references an external file, then options.resolve.external must be true.
*
* @param {*} value - The value to inspect
* @param {$RefParserOptions} options
* @returns {boolean}
*/
$Ref.isAllowed$Ref = function (value, options) {
if ($Ref.is$Ref(value)) {
  if (value.$ref.substr(0, 2) === '#/' || value.$ref === '#') {
    // It's a JSON Pointer reference, which is always allowed
    return true;
  }
  else if (value.$ref[0] !== '#' && (!options || options.resolve.external)) {
    // It's an external reference, which is allowed by the options
    return true;
  }
}
};

/**
* Determines whether the given value is a JSON reference that "extends" its resolved value.
* That is, it has extra properties (in addition to "$ref"), so rather than simply pointing to
* an existing value, this $ref actually creates a NEW value that is a shallow copy of the resolved
* value, plus the extra properties.
*
* @example:
*  {
*    person: {
*      properties: {
*        firstName: { type: string }
*        lastName: { type: string }
*      }
*    }
*    employee: {
*      properties: {
*        $ref: #/person/properties
*        salary: { type: number }
*      }
*    }
*  }
*
*  In this example, "employee" is an extended $ref, since it extends "person" with an additional
*  property (salary).  The result is a NEW value that looks like this:
*
*  {
*    properties: {
*      firstName: { type: string }
*      lastName: { type: string }
*      salary: { type: number }
*    }
*  }
*
* @param {*} value - The value to inspect
* @returns {boolean}
*/
$Ref.isExtended$Ref = function (value) {
return $Ref.is$Ref(value) && Object.keys(value).length > 1;
};

/**
* Returns the resolved value of a JSON Reference.
* If necessary, the resolved value is merged with the JSON Reference to create a new object
*
* @example:
*  {
*    person: {
*      properties: {
*        firstName: { type: string }
*        lastName: { type: string }
*      }
*    }
*    employee: {
*      properties: {
*        $ref: #/person/properties
*        salary: { type: number }
*      }
*    }
*  }
*
*  When "person" and "employee" are merged, you end up with the following object:
*
*  {
*    properties: {
*      firstName: { type: string }
*      lastName: { type: string }
*      salary: { type: number }
*    }
*  }
*
* @param {object} $ref - The JSON reference object (the one with the "$ref" property)
* @param {*} resolvedValue - The resolved value, which can be any type
* @returns {*} - Returns the dereferenced value
*/
$Ref.dereference = function ($ref, resolvedValue) {
if (resolvedValue && typeof resolvedValue === 'object' && $Ref.isExtended$Ref($ref)) {
  var merged = {};
  Object.keys($ref).forEach(function (key) {
    if (key !== '$ref') {
      merged[key] = $ref[key];
    }
  });
  Object.keys(resolvedValue).forEach(function (key) {
    if (!(key in merged)) {
      merged[key] = resolvedValue[key];
    }
  });
  return merged;
}
else {
  // Completely replace the original reference with the resolved value
  return resolvedValue;
}
};

},{"./pointer":11}],13:[function(_dereq_,module,exports){
'use strict';

var ono = _dereq_('ono'),
  $Ref = _dereq_('./ref'),
  url = _dereq_('./util/url');

module.exports = $Refs;

/**
* This class is a map of JSON references and their resolved values.
*/
function $Refs () {
/**
 * Indicates whether the schema contains any circular references.
 *
 * @type {boolean}
 */
this.circular = false;

/**
 * A map of paths/urls to {@link $Ref} objects
 *
 * @type {object}
 * @protected
 */
this._$refs = {};

/**
 * The {@link $Ref} object that is the root of the JSON schema.
 *
 * @type {$Ref}
 * @protected
 */
this._root$Ref = null;
}

/**
* Returns the paths of all the files/URLs that are referenced by the JSON schema,
* including the schema itself.
*
* @param {...string|string[]} [types] - Only return paths of the given types ("file", "http", etc.)
* @returns {string[]}
*/
$Refs.prototype.paths = function (types) {
var paths = getPaths(this._$refs, arguments);
return paths.map(function (path) {
  return path.decoded;
});
};

/**
* Returns the map of JSON references and their resolved values.
*
* @param {...string|string[]} [types] - Only return references of the given types ("file", "http", etc.)
* @returns {object}
*/
$Refs.prototype.values = function (types) {
var $refs = this._$refs;
var paths = getPaths($refs, arguments);
return paths.reduce(function (obj, path) {
  obj[path.decoded] = $refs[path.encoded].value;
  return obj;
}, {});
};

/**
* Returns a POJO (plain old JavaScript object) for serialization as JSON.
*
* @returns {object}
*/
$Refs.prototype.toJSON = $Refs.prototype.values;

/**
* Determines whether the given JSON reference exists.
*
* @param {string} path - The path being resolved, optionally with a JSON pointer in the hash
* @param {$RefParserOptions} [options]
* @returns {boolean}
*/
$Refs.prototype.exists = function (path, options) {
try {
  this._resolve(path, options);
  return true;
}
catch (e) {
  return false;
}
};

/**
* Resolves the given JSON reference and returns the resolved value.
*
* @param {string} path - The path being resolved, with a JSON pointer in the hash
* @param {$RefParserOptions} [options]
* @returns {*} - Returns the resolved value
*/
$Refs.prototype.get = function (path, options) {
return this._resolve(path, options).value;
};

/**
* Sets the value of a nested property within this {@link $Ref#value}.
* If the property, or any of its parents don't exist, they will be created.
*
* @param {string} path - The path of the property to set, optionally with a JSON pointer in the hash
* @param {*} value - The value to assign
*/
$Refs.prototype.set = function (path, value) {
var absPath = url.resolve(this._root$Ref.path, path);
var withoutHash = url.stripHash(absPath);
var $ref = this._$refs[withoutHash];

if (!$ref) {
  throw ono('Error resolving $ref pointer "%s". \n"%s" not found.', path, withoutHash);
}

$ref.set(absPath, value);
};

/**
* Creates a new {@link $Ref} object and adds it to this {@link $Refs} object.
*
* @param {string} path  - The file path or URL of the referenced file
*/
$Refs.prototype._add = function (path) {
var withoutHash = url.stripHash(path);

var $ref = new $Ref();
$ref.path = withoutHash;
$ref.$refs = this;

this._$refs[withoutHash] = $ref;
this._root$Ref = this._root$Ref || $ref;

return $ref;
};

/**
* Resolves the given JSON reference.
*
* @param {string} path - The path being resolved, optionally with a JSON pointer in the hash
* @param {$RefParserOptions} [options]
* @returns {Pointer}
* @protected
*/
$Refs.prototype._resolve = function (path, options) {
var absPath = url.resolve(this._root$Ref.path, path);
var withoutHash = url.stripHash(absPath);
var $ref = this._$refs[withoutHash];

if (!$ref) {
  throw ono('Error resolving $ref pointer "%s". \n"%s" not found.', path, withoutHash);
}

return $ref.resolve(absPath, options, path);
};

/**
* Returns the specified {@link $Ref} object, or undefined.
*
* @param {string} path - The path being resolved, optionally with a JSON pointer in the hash
* @returns {$Ref|undefined}
* @protected
*/
$Refs.prototype._get$Ref = function (path) {
path = url.resolve(this._root$Ref.path, path);
var withoutHash = url.stripHash(path);
return this._$refs[withoutHash];
};

/**
* Returns the encoded and decoded paths keys of the given object.
*
* @param {object} $refs - The object whose keys are URL-encoded paths
* @param {...string|string[]} [types] - Only return paths of the given types ("file", "http", etc.)
* @returns {object[]}
*/
function getPaths ($refs, types) {
var paths = Object.keys($refs);

// Filter the paths by type
types = Array.isArray(types[0]) ? types[0] : Array.prototype.slice.call(types);
if (types.length > 0 && types[0]) {
  paths = paths.filter(function (key) {
    return types.indexOf($refs[key].pathType) !== -1;
  });
}

// Decode local filesystem paths
return paths.map(function (path) {
  return {
    encoded: path,
    decoded: $refs[path].pathType === 'file' ? url.toFileSystemPath(path, true) : path
  };
});
}

},{"./ref":12,"./util/url":19,"ono":67}],14:[function(_dereq_,module,exports){
'use strict';

var $Ref = _dereq_('./ref'),
  Pointer = _dereq_('./pointer'),
  parse = _dereq_('./parse'),
  debug = _dereq_('./util/debug'),
  url = _dereq_('./util/url');

module.exports = resolveExternal;

/**
* Crawls the JSON schema, finds all external JSON references, and resolves their values.
* This method does not mutate the JSON schema. The resolved values are added to {@link $RefParser#$refs}.
*
* NOTE: We only care about EXTERNAL references here. INTERNAL references are only relevant when dereferencing.
*
* @param {$RefParser} parser
* @param {$RefParserOptions} options
*
* @returns {Promise}
* The promise resolves once all JSON references in the schema have been resolved,
* including nested references that are contained in externally-referenced files.
*/
function resolveExternal (parser, options) {
if (!options.resolve.external) {
  // Nothing to resolve, so exit early
  return Promise.resolve();
}

try {
  debug('Resolving $ref pointers in %s', parser.$refs._root$Ref.path);
  var promises = crawl(parser.schema, parser.$refs._root$Ref.path + '#', parser.$refs, options);
  return Promise.all(promises);
}
catch (e) {
  return Promise.reject(e);
}
}

/**
* Recursively crawls the given value, and resolves any external JSON references.
*
* @param {*} obj - The value to crawl. If it's not an object or array, it will be ignored.
* @param {string} path - The full path of `obj`, possibly with a JSON Pointer in the hash
* @param {$Refs} $refs
* @param {$RefParserOptions} options
*
* @returns {Promise[]}
* Returns an array of promises. There will be one promise for each JSON reference in `obj`.
* If `obj` does not contain any JSON references, then the array will be empty.
* If any of the JSON references point to files that contain additional JSON references,
* then the corresponding promise will internally reference an array of promises.
*/
function crawl (obj, path, $refs, options) {
var promises = [];

if (obj && typeof obj === 'object') {
  if ($Ref.isExternal$Ref(obj)) {
    promises.push(resolve$Ref(obj, path, $refs, options));
  }
  else {
    Object.keys(obj).forEach(function (key) {
      var keyPath = Pointer.join(path, key);
      var value = obj[key];

      if ($Ref.isExternal$Ref(value)) {
        promises.push(resolve$Ref(value, keyPath, $refs, options));
      }
      else {
        promises = promises.concat(crawl(value, keyPath, $refs, options));
      }
    });
  }
}

return promises;
}

/**
* Resolves the given JSON Reference, and then crawls the resulting value.
*
* @param {{$ref: string}} $ref - The JSON Reference to resolve
* @param {string} path - The full path of `$ref`, possibly with a JSON Pointer in the hash
* @param {$Refs} $refs
* @param {$RefParserOptions} options
*
* @returns {Promise}
* The promise resolves once all JSON references in the object have been resolved,
* including nested references that are contained in externally-referenced files.
*/
function resolve$Ref ($ref, path, $refs, options) {
debug('Resolving $ref pointer "%s" at %s', $ref.$ref, path);

var resolvedPath = url.resolve(path, $ref.$ref);
var withoutHash = url.stripHash(resolvedPath);

// Do we already have this $ref?
$ref = $refs._$refs[withoutHash];
if ($ref) {
  // We've already parsed this $ref, so use the existing value
  return Promise.resolve($ref.value);
}

// Parse the $referenced file/url
return parse(resolvedPath, $refs, options)
  .then(function (result) {
    // Crawl the parsed value
    debug('Resolving $ref pointers in %s', withoutHash);
    var promises = crawl(result, withoutHash + '#', $refs, options);
    return Promise.all(promises);
  });
}

},{"./parse":6,"./pointer":11,"./ref":12,"./util/debug":17,"./util/url":19}],15:[function(_dereq_,module,exports){
'use strict';
var fs = _dereq_('fs'),
  ono = _dereq_('ono'),
  url = _dereq_('../util/url'),
  debug = _dereq_('../util/debug');

module.exports = {
/**
 * The order that this resolver will run, in relation to other resolvers.
 *
 * @type {number}
 */
order: 100,

/**
 * Determines whether this resolver can read a given file reference.
 * Resolvers that return true will be tried, in order, until one successfully resolves the file.
 * Resolvers that return false will not be given a chance to resolve the file.
 *
 * @param {object} file           - An object containing information about the referenced file
 * @param {string} file.url       - The full URL of the referenced file
 * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @returns {boolean}
 */
canRead: function isFile (file) {
  return url.isFileSystemPath(file.url);
},

/**
 * Reads the given file and returns its raw contents as a Buffer.
 *
 * @param {object} file           - An object containing information about the referenced file
 * @param {string} file.url       - The full URL of the referenced file
 * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @returns {Promise<Buffer>}
 */
read: function readFile (file) {
  return new Promise(function (resolve, reject) {
    var path;
    try {
      path = url.toFileSystemPath(file.url);
    }
    catch (err) {
      reject(ono.uri(err, 'Malformed URI: %s', file.url));
    }

    debug('Opening file: %s', path);

    try {
      fs.readFile(path, function (err, data) {
        if (err) {
          reject(ono(err, 'Error opening file "%s"', path));
        }
        else {
          resolve(data);
        }
      });
    }
    catch (err) {
      reject(ono(err, 'Error opening file "%s"', path));
    }
  });
}
};

},{"../util/debug":17,"../util/url":19,"fs":22,"ono":67}],16:[function(_dereq_,module,exports){
(function (process,Buffer){
'use strict';

var http = _dereq_('http'),
  https = _dereq_('https'),
  ono = _dereq_('ono'),
  url = _dereq_('../util/url'),
  debug = _dereq_('../util/debug');

module.exports = {
/**
 * The order that this resolver will run, in relation to other resolvers.
 *
 * @type {number}
 */
order: 200,

/**
 * HTTP headers to send when downloading files.
 *
 * @example:
 * {
 *   "User-Agent": "JSON Schema $Ref Parser",
 *   Accept: "application/json"
 * }
 *
 * @type {object}
 */
headers: null,

/**
 * HTTP request timeout (in milliseconds).
 *
 * @type {number}
 */
timeout: 5000, // 5 seconds

/**
 * The maximum number of HTTP redirects to follow.
 * To disable automatic following of redirects, set this to zero.
 *
 * @type {number}
 */
redirects: 5,

/**
 * The `withCredentials` option of XMLHttpRequest.
 * Set this to `true` if you're downloading files from a CORS-enabled server that requires authentication
 *
 * @type {boolean}
 */
withCredentials: false,

/**
 * Determines whether this resolver can read a given file reference.
 * Resolvers that return true will be tried in order, until one successfully resolves the file.
 * Resolvers that return false will not be given a chance to resolve the file.
 *
 * @param {object} file           - An object containing information about the referenced file
 * @param {string} file.url       - The full URL of the referenced file
 * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @returns {boolean}
 */
canRead: function isHttp (file) {
  return url.isHttp(file.url);
},

/**
 * Reads the given URL and returns its raw contents as a Buffer.
 *
 * @param {object} file           - An object containing information about the referenced file
 * @param {string} file.url       - The full URL of the referenced file
 * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @returns {Promise<Buffer>}
 */
read: function readHttp (file) {
  var u = url.parse(file.url);

  if (process.browser && !u.protocol) {
    // Use the protocol of the current page
    u.protocol = url.parse(location.href).protocol;
  }

  return download(u, this);
}
};

/**
* Downloads the given file.
*
* @param {Url|string} u        - The url to download (can be a parsed {@link Url} object)
* @param {object} httpOptions  - The `options.resolve.http` object
* @param {number} [redirects]  - The redirect URLs that have already been followed
*
* @returns {Promise<Buffer>}
* The promise resolves with the raw downloaded data, or rejects if there is an HTTP error.
*/
function download (u, httpOptions, redirects) {
return new Promise(function (resolve, reject) {
  u = url.parse(u);
  redirects = redirects || [];
  redirects.push(u.href);

  get(u, httpOptions)
    .then(function (res) {
      if (res.statusCode >= 400) {
        throw ono({ status: res.statusCode }, 'HTTP ERROR %d', res.statusCode);
      }
      else if (res.statusCode >= 300) {
        if (redirects.length > httpOptions.redirects) {
          reject(ono({ status: res.statusCode }, 'Error downloading %s. \nToo many redirects: \n  %s',
            redirects[0], redirects.join(' \n  ')));
        }
        else if (!res.headers.location) {
          throw ono({ status: res.statusCode }, 'HTTP %d redirect with no location header', res.statusCode);
        }
        else {
          debug('HTTP %d redirect %s -> %s', res.statusCode, u.href, res.headers.location);
          var redirectTo = url.resolve(u, res.headers.location);
          download(redirectTo, httpOptions, redirects).then(resolve, reject);
        }
      }
      else {
        resolve(res.body || new Buffer(0));
      }
    })
    .catch(function (err) {
      reject(ono(err, 'Error downloading', u.href));
    });
});
}

/**
* Sends an HTTP GET request.
*
* @param {Url} u - A parsed {@link Url} object
* @param {object} httpOptions - The `options.resolve.http` object
*
* @returns {Promise<Response>}
* The promise resolves with the HTTP Response object.
*/
function get (u, httpOptions) {
return new Promise(function (resolve, reject) {
  debug('GET', u.href);

  var protocol = u.protocol === 'https:' ? https : http;
  var req = protocol.get({
    hostname: u.hostname,
    port: u.port,
    path: u.path,
    auth: u.auth,
    protocol: u.protocol,
    headers: httpOptions.headers || {},
    withCredentials: httpOptions.withCredentials
  });

  if (typeof req.setTimeout === 'function') {
    req.setTimeout(httpOptions.timeout);
  }

  req.on('timeout', function () {
    req.abort();
  });

  req.on('error', reject);

  req.once('response', function (res) {
    res.body = new Buffer(0);

    res.on('data', function (data) {
      res.body = Buffer.concat([res.body, new Buffer(data)]);
    });

    res.on('error', reject);

    res.on('end', function () {
      resolve(res);
    });
  });
});
}

}).call(this,_dereq_('_process'),_dereq_("buffer").Buffer)

},{"../util/debug":17,"../util/url":19,"_process":69,"buffer":23,"http":84,"https":31,"ono":67}],17:[function(_dereq_,module,exports){
'use strict';

var debug = _dereq_('debug');

/**
* Writes messages to stdout.
* Log messages are suppressed by default, but can be enabled by setting the DEBUG variable.
* @type {function}
*/
module.exports = debug('json-schema-ref-parser');

},{"debug":27}],18:[function(_dereq_,module,exports){
'use strict';

var debug = _dereq_('./debug');

/**
* Returns the given plugins as an array, rather than an object map.
* All other methods in this module expect an array of plugins rather than an object map.
*
* @param  {object} plugins - A map of plugin objects
* @return {object[]}
*/
exports.all = function (plugins) {
return Object.keys(plugins)
  .filter(function (key) {
    return typeof plugins[key] === 'object';
  })
  .map(function (key) {
    plugins[key].name = key;
    return plugins[key];
  });
};

/**
* Filters the given plugins, returning only the ones return `true` for the given method.
*
* @param  {object[]} plugins - An array of plugin objects
* @param  {string}   method  - The name of the filter method to invoke for each plugin
* @param  {object}   file    - A file info object, which will be passed to each method
* @return {object[]}
*/
exports.filter = function (plugins, method, file) {
return plugins
  .filter(function (plugin) {
    return !!getResult(plugin, method, file);
  });
};

/**
* Sorts the given plugins, in place, by their `order` property.
*
* @param {object[]} plugins - An array of plugin objects
* @returns {object[]}
*/
exports.sort = function (plugins) {
plugins.forEach(function (plugin) {
  plugin.order = plugin.order || Number.MAX_SAFE_INTEGER;
});

return plugins.sort(function (a, b) { return a.order - b.order; });
};

/**
* Runs the specified method of the given plugins, in order, until one of them returns a successful result.
* Each method can return a synchronous value, a Promise, or call an error-first callback.
* If the promise resolves successfully, or the callback is called without an error, then the result
* is immediately returned and no further plugins are called.
* If the promise rejects, or the callback is called with an error, then the next plugin is called.
* If ALL plugins fail, then the last error is thrown.
*
* @param {object[]}  plugins - An array of plugin objects
* @param {string}    method  - The name of the method to invoke for each plugin
* @param {object}    file    - A file info object, which will be passed to each method
* @returns {Promise}
*/
exports.run = function (plugins, method, file) {
var plugin, lastError, index = 0;

return new Promise(function (resolve, reject) {
  runNextPlugin();

  function runNextPlugin () {
    plugin = plugins[index++];
    if (!plugin) {
      // There are no more functions, so re-throw the last error
      return reject(lastError);
    }

    try {
      debug('  %s', plugin.name);
      var result = getResult(plugin, method, file, callback);
      if (result && typeof result.then === 'function') {
        // A promise was returned
        result.then(onSuccess, onError);
      }
      else if (result !== undefined) {
        // A synchronous result was returned
        onSuccess(result);
      }
      // else { the callback will be called }
    }
    catch (e) {
      onError(e);
    }
  }

  function callback (err, result) {
    if (err) {
      onError(err);
    }
    else {
      onSuccess(result);
    }
  }

  function onSuccess (result) {
    debug('    success');
    resolve({
      plugin: plugin,
      result: result
    });
  }

  function onError (err) {
    debug('    %s', err.message || err);
    lastError = err;
    runNextPlugin();
  }
});
};

/**
* Returns the value of the given property.
* If the property is a function, then the result of the function is returned.
* If the value is a RegExp, then it will be tested against the file URL.
* If the value is an aray, then it will be compared against the file extension.
*
* @param   {object}   obj        - The object whose property/method is called
* @param   {string}   prop       - The name of the property/method to invoke
* @param   {object}   file       - A file info object, which will be passed to the method
* @param   {function} [callback] - A callback function, which will be passed to the method
* @returns {*}
*/
function getResult (obj, prop, file, callback) {
var value = obj[prop];

if (typeof value === 'function') {
  return value.apply(obj, [file, callback]);
}

if (!callback) {
  // The synchronous plugin functions (canParse and canRead)
  // allow a "shorthand" syntax, where the user can match
  // files by RegExp or by file extension.
  if (value instanceof RegExp) {
    return value.test(file.url);
  }
  else if (typeof value === 'string') {
    return value === file.extension;
  }
  else if (Array.isArray(value)) {
    return value.indexOf(file.extension) !== -1;
  }
}

return value;
}

},{"./debug":17}],19:[function(_dereq_,module,exports){
(function (process){
'use strict';

var isWindows = /^win/.test(process.platform),
  forwardSlashPattern = /\//g,
  protocolPattern = /^([a-z0-9.+-]+):\/\//i,
  url = module.exports;

// RegExp patterns to URL-encode special characters in local filesystem paths
var urlEncodePatterns = [
/\?/g, '%3F',
/\#/g, '%23',
isWindows ? /\\/g : /\//, '/'
];

// RegExp patterns to URL-decode special characters for local filesystem paths
var urlDecodePatterns = [
/\%23/g, '#',
/\%24/g, '$',
/\%26/g, '&',
/\%2C/g, ',',
/\%40/g, '@'
];

exports.parse = _dereq_('url').parse;
exports.resolve = _dereq_('url').resolve;

/**
* Returns the current working directory (in Node) or the current page URL (in browsers).
*
* @returns {string}
*/
exports.cwd = function cwd () {
return process.browser ? location.href : process.cwd() + '/';
};

/**
* Returns the protocol of the given URL, or `undefined` if it has no protocol.
*
* @param   {string} path
* @returns {?string}
*/
exports.getProtocol = function getProtocol (path) {
var match = protocolPattern.exec(path);
if (match) {
  return match[1].toLowerCase();
}
};

/**
* Returns the lowercased file extension of the given URL,
* or an empty string if it has no extension.
*
* @param   {string} path
* @returns {string}
*/
exports.getExtension = function getExtension (path) {
var lastDot = path.lastIndexOf('.');
if (lastDot >= 0) {
  return path.substr(lastDot).toLowerCase();
}
return '';
};

/**
* Returns the hash (URL fragment), of the given path.
* If there is no hash, then the root hash ("#") is returned.
*
* @param   {string} path
* @returns {string}
*/
exports.getHash = function getHash (path) {
var hashIndex = path.indexOf('#');
if (hashIndex >= 0) {
  return path.substr(hashIndex);
}
return '#';
};

/**
* Removes the hash (URL fragment), if any, from the given path.
*
* @param   {string} path
* @returns {string}
*/
exports.stripHash = function stripHash (path) {
var hashIndex = path.indexOf('#');
if (hashIndex >= 0) {
  path = path.substr(0, hashIndex);
}
return path;
};

/**
* Determines whether the given path is an HTTP(S) URL.
*
* @param   {string} path
* @returns {boolean}
*/
exports.isHttp = function isHttp (path) {
var protocol = url.getProtocol(path);
if (protocol === 'http' || protocol === 'https') {
  return true;
}
else if (protocol === undefined) {
  // There is no protocol.  If we're running in a browser, then assume it's HTTP.
  return process.browser;
}
else {
  // It's some other protocol, such as "ftp://", "mongodb://", etc.
  return false;
}
};

/**
* Determines whether the given path is a filesystem path.
* This includes "file://" URLs.
*
* @param   {string} path
* @returns {boolean}
*/
exports.isFileSystemPath = function isFileSystemPath (path) {
if (process.browser) {
  // We're running in a browser, so assume that all paths are URLs.
  // This way, even relative paths will be treated as URLs rather than as filesystem paths
  return false;
}

var protocol = url.getProtocol(path);
return protocol === undefined || protocol === 'file';
};

/**
* Converts a filesystem path to a properly-encoded URL.
*
* This is intended to handle situations where JSON Schema $Ref Parser is called
* with a filesystem path that contains characters which are not allowed in URLs.
*
* @example
* The following filesystem paths would be converted to the following URLs:
*
*    <"!@#$%^&*+=?'>.json              ==>   %3C%22!@%23$%25%5E&*+=%3F\'%3E.json
*    C:\\My Documents\\File (1).json   ==>   C:/My%20Documents/File%20(1).json
*    file://Project #42/file.json      ==>   file://Project%20%2342/file.json
*
* @param {string} path
* @returns {string}
*/
exports.fromFileSystemPath = function fromFileSystemPath (path) {
// Step 1: Manually encode characters that are not encoded by `encodeURI`.
// This includes characters such as "#" and "?", which have special meaning in URLs,
// but are just normal characters in a filesystem path.
// On Windows, this will also replace backslashes with forward slashes,
// rather than encoding them as special characters.
for (var i = 0; i < urlEncodePatterns.length; i += 2) {
  path = path.replace(urlEncodePatterns[i], urlEncodePatterns[i + 1]);
}

// Step 2: `encodeURI` will take care of all other characters
return encodeURI(path);
};

/**
* Converts a URL to a local filesystem path.
*
* @param {string}  path
* @param {boolean} [keepFileProtocol] - If true, then "file://" will NOT be stripped
* @returns {string}
*/
exports.toFileSystemPath = function toFileSystemPath (path, keepFileProtocol) {
// Step 1: `decodeURI` will decode characters such as Cyrillic characters, spaces, etc.
path = decodeURI(path);

// Step 2: Manually decode characters that are not decoded by `decodeURI`.
// This includes characters such as "#" and "?", which have special meaning in URLs,
// but are just normal characters in a filesystem path.
for (var i = 0; i < urlDecodePatterns.length; i += 2) {
  path = path.replace(urlDecodePatterns[i], urlDecodePatterns[i + 1]);
}

// Step 3: If it's a "file://" URL, then format it consistently
// or convert it to a local filesystem path
var isFileUrl = path.substr(0, 7).toLowerCase() === 'file://';
if (isFileUrl) {
  // Strip-off the protocol, and the initial "/", if there is one
  path = path[7] === '/' ? path.substr(8) : path.substr(7);

  // insert a colon (":") after the drive letter on Windows
  if (isWindows && path[1] === '/') {
    path = path[0] + ':' + path.substr(1);
  }

  if (keepFileProtocol) {
    // Return the consistently-formatted "file://" URL
    path = 'file:///' + path;
  }
  else {
    // Convert the "file://" URL to a local filesystem path.
    // On Windows, it will start with something like "C:/".
    // On Posix, it will start with "/"
    isFileUrl = false;
    path = isWindows ? path : '/' + path;
  }
}

// Step 4: Normalize Windows paths (unless it's a "file://" URL)
if (isWindows && !isFileUrl) {
  // Replace forward slashes with backslashes
  path = path.replace(forwardSlashPattern, '\\');

  // Capitalize the drive letter
  if (path.substr(1, 2) === ':\\') {
    path = path[0].toUpperCase() + path.substr(1);
  }
}

return path;
};

}).call(this,_dereq_('_process'))

},{"_process":69,"url":90}],20:[function(_dereq_,module,exports){
/* eslint lines-around-comment: [2, {beforeBlockComment: false}] */
'use strict';

var yaml = _dereq_('js-yaml'),
  ono = _dereq_('ono');

/**
* Simple YAML parsing functions, similar to {@link JSON.parse} and {@link JSON.stringify}
*/
module.exports = {
/**
 * Parses a YAML string and returns the value.
 *
 * @param {string} text - The YAML string to be parsed
 * @param {function} [reviver] - Not currently supported. Provided for consistency with {@link JSON.parse}
 * @returns {*}
 */
parse: function yamlParse (text, reviver) {
  try {
    return yaml.load(text);
  }
  catch (e) {
    if (e instanceof Error) {
      throw e;
    }
    else {
      // https://github.com/nodeca/js-yaml/issues/153
      throw ono(e, e.message);
    }
  }
},

/**
 * Converts a JavaScript value to a YAML string.
 *
 * @param   {*} value - The value to convert to YAML
 * @param   {function|array} replacer - Not currently supported. Provided for consistency with {@link JSON.stringify}
 * @param   {string|number} space - The number of spaces to use for indentation, or a string containing the number of spaces.
 * @returns {string}
 */
stringify: function yamlStringify (value, replacer, space) {
  try {
    var indent = (typeof space === 'string' ? space.length : space) || 2;
    return yaml.safeDump(value, { indent: indent });
  }
  catch (e) {
    if (e instanceof Error) {
      throw e;
    }
    else {
      // https://github.com/nodeca/js-yaml/issues/153
      throw ono(e, e.message);
    }
  }
}
};

},{"js-yaml":36,"ono":67}],21:[function(_dereq_,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
lookup[i] = code[i]
revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
var len = b64.length
if (len % 4 > 0) {
  throw new Error('Invalid string. Length must be a multiple of 4')
}

// the number of equal signs (place holders)
// if there are two placeholders, than the two characters before it
// represent one byte
// if there is only one, then the three characters before it represent 2 bytes
// this is just a cheap hack to not do indexOf twice
return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
// base64 is 4/3 + up to two characters of the original data
return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
var i, l, tmp, placeHolders, arr
var len = b64.length
placeHolders = placeHoldersCount(b64)

arr = new Arr((len * 3 / 4) - placeHolders)

// if there are placeholders, only get up to the last complete 4 chars
l = placeHolders > 0 ? len - 4 : len

var L = 0

for (i = 0; i < l; i += 4) {
  tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
  arr[L++] = (tmp >> 16) & 0xFF
  arr[L++] = (tmp >> 8) & 0xFF
  arr[L++] = tmp & 0xFF
}

if (placeHolders === 2) {
  tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
  arr[L++] = tmp & 0xFF
} else if (placeHolders === 1) {
  tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
  arr[L++] = (tmp >> 8) & 0xFF
  arr[L++] = tmp & 0xFF
}

return arr
}

function tripletToBase64 (num) {
return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
var tmp
var output = []
for (var i = start; i < end; i += 3) {
  tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
  output.push(tripletToBase64(tmp))
}
return output.join('')
}

function fromByteArray (uint8) {
var tmp
var len = uint8.length
var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
var output = ''
var parts = []
var maxChunkLength = 16383 // must be multiple of 3

// go through the array every three bytes, we'll deal with trailing stuff later
for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
  parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
}

// pad the end with zeros, but make sure to not forget the extra bytes
if (extraBytes === 1) {
  tmp = uint8[len - 1]
  output += lookup[tmp >> 2]
  output += lookup[(tmp << 4) & 0x3F]
  output += '=='
} else if (extraBytes === 2) {
  tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
  output += lookup[tmp >> 10]
  output += lookup[(tmp >> 4) & 0x3F]
  output += lookup[(tmp << 2) & 0x3F]
  output += '='
}

parts.push(output)

return parts.join('')
}

},{}],22:[function(_dereq_,module,exports){

},{}],23:[function(_dereq_,module,exports){
/*!
* The buffer module from node.js, for the browser.
*
* @author   Feross Aboukhadijeh <https://feross.org>
* @license  MIT
*/
/* eslint-disable no-proto */

'use strict'

var base64 = _dereq_('base64-js')
var ieee754 = _dereq_('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
* If `Buffer.TYPED_ARRAY_SUPPORT`:
*   === true    Use Uint8Array implementation (fastest)
*   === false   Print warning and recommend using `buffer` v4.x which has an Object
*               implementation (most compatible, even IE6)
*
* Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
* Opera 11.6+, iOS 4.2+.
*
* We report that the browser does not support typed arrays if the are not subclassable
* using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
* (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
* for __proto__ and has a buggy typed array implementation.
*/
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
  typeof console.warn === 'function') {
console.warn(
  'This browser lacks typed array (Uint8Array) support which is required by ' +
  '`buffer` v5.x. Use `buffer` v4.x if you _dereq_ old browser support.'
)
}

function typedArraySupport () {
// Can typed array instances can be augmented?
try {
  var arr = new Uint8Array(1)
  arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
  return arr.foo() === 42
} catch (e) {
  return false
}
}

function createBuffer (length) {
if (length > K_MAX_LENGTH) {
  throw new RangeError('Invalid typed array length')
}
// Return an augmented `Uint8Array` instance
var buf = new Uint8Array(length)
buf.__proto__ = Buffer.prototype
return buf
}

/**
* The Buffer constructor returns instances of `Uint8Array` that have their
* prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
* `Uint8Array`, so the returned instances will have all the node `Buffer` methods
* and the `Uint8Array` methods. Square bracket notation works as expected -- it
* returns a single octet.
*
* The `Uint8Array` prototype remains unmodified.
*/

function Buffer (arg, encodingOrOffset, length) {
// Common case.
if (typeof arg === 'number') {
  if (typeof encodingOrOffset === 'string') {
    throw new Error(
      'If encoding is specified then the first argument must be a string'
    )
  }
  return allocUnsafe(arg)
}
return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
  Buffer[Symbol.species] === Buffer) {
Object.defineProperty(Buffer, Symbol.species, {
  value: null,
  configurable: true,
  enumerable: false,
  writable: false
})
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
if (typeof value === 'number') {
  throw new TypeError('"value" argument must not be a number')
}

if (isArrayBuffer(value)) {
  return fromArrayBuffer(value, encodingOrOffset, length)
}

if (typeof value === 'string') {
  return fromString(value, encodingOrOffset)
}

return fromObject(value)
}

/**
* Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
* if value is a number.
* Buffer.from(str[, encoding])
* Buffer.from(array)
* Buffer.from(buffer)
* Buffer.from(arrayBuffer[, byteOffset[, length]])
**/
Buffer.from = function (value, encodingOrOffset, length) {
return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
if (typeof size !== 'number') {
  throw new TypeError('"size" argument must be a number')
} else if (size < 0) {
  throw new RangeError('"size" argument must not be negative')
}
}

function alloc (size, fill, encoding) {
assertSize(size)
if (size <= 0) {
  return createBuffer(size)
}
if (fill !== undefined) {
  // Only pay attention to encoding if it's a string. This
  // prevents accidentally sending in a number that would
  // be interpretted as a start offset.
  return typeof encoding === 'string'
    ? createBuffer(size).fill(fill, encoding)
    : createBuffer(size).fill(fill)
}
return createBuffer(size)
}

/**
* Creates a new filled Buffer instance.
* alloc(size[, fill[, encoding]])
**/
Buffer.alloc = function (size, fill, encoding) {
return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
assertSize(size)
return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
* Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
* */
Buffer.allocUnsafe = function (size) {
return allocUnsafe(size)
}
/**
* Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
*/
Buffer.allocUnsafeSlow = function (size) {
return allocUnsafe(size)
}

function fromString (string, encoding) {
if (typeof encoding !== 'string' || encoding === '') {
  encoding = 'utf8'
}

if (!Buffer.isEncoding(encoding)) {
  throw new TypeError('"encoding" must be a valid string encoding')
}

var length = byteLength(string, encoding) | 0
var buf = createBuffer(length)

var actual = buf.write(string, encoding)

if (actual !== length) {
  // Writing a hex string, for example, that contains invalid characters will
  // cause everything after the first invalid character to be ignored. (e.g.
  // 'abxxcd' will be treated as 'ab')
  buf = buf.slice(0, actual)
}

return buf
}

function fromArrayLike (array) {
var length = array.length < 0 ? 0 : checked(array.length) | 0
var buf = createBuffer(length)
for (var i = 0; i < length; i += 1) {
  buf[i] = array[i] & 255
}
return buf
}

function fromArrayBuffer (array, byteOffset, length) {
if (byteOffset < 0 || array.byteLength < byteOffset) {
  throw new RangeError('\'offset\' is out of bounds')
}

if (array.byteLength < byteOffset + (length || 0)) {
  throw new RangeError('\'length\' is out of bounds')
}

var buf
if (byteOffset === undefined && length === undefined) {
  buf = new Uint8Array(array)
} else if (length === undefined) {
  buf = new Uint8Array(array, byteOffset)
} else {
  buf = new Uint8Array(array, byteOffset, length)
}

// Return an augmented `Uint8Array` instance
buf.__proto__ = Buffer.prototype
return buf
}

function fromObject (obj) {
if (Buffer.isBuffer(obj)) {
  var len = checked(obj.length) | 0
  var buf = createBuffer(len)

  if (buf.length === 0) {
    return buf
  }

  obj.copy(buf, 0, 0, len)
  return buf
}

if (obj) {
  if (isArrayBufferView(obj) || 'length' in obj) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
// Note: cannot use `length < K_MAX_LENGTH` here because that fails when
// length is NaN (which is otherwise coerced to zero.)
if (length >= K_MAX_LENGTH) {
  throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                       'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
}
return length | 0
}

function SlowBuffer (length) {
if (+length != length) { // eslint-disable-line eqeqeq
  length = 0
}
return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
  throw new TypeError('Arguments must be Buffers')
}

if (a === b) return 0

var x = a.length
var y = b.length

for (var i = 0, len = Math.min(x, y); i < len; ++i) {
  if (a[i] !== b[i]) {
    x = a[i]
    y = b[i]
    break
  }
}

if (x < y) return -1
if (y < x) return 1
return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
switch (String(encoding).toLowerCase()) {
  case 'hex':
  case 'utf8':
  case 'utf-8':
  case 'ascii':
  case 'latin1':
  case 'binary':
  case 'base64':
  case 'ucs2':
  case 'ucs-2':
  case 'utf16le':
  case 'utf-16le':
    return true
  default:
    return false
}
}

Buffer.concat = function concat (list, length) {
if (!Array.isArray(list)) {
  throw new TypeError('"list" argument must be an Array of Buffers')
}

if (list.length === 0) {
  return Buffer.alloc(0)
}

var i
if (length === undefined) {
  length = 0
  for (i = 0; i < list.length; ++i) {
    length += list[i].length
  }
}

var buffer = Buffer.allocUnsafe(length)
var pos = 0
for (i = 0; i < list.length; ++i) {
  var buf = list[i]
  if (!Buffer.isBuffer(buf)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }
  buf.copy(buffer, pos)
  pos += buf.length
}
return buffer
}

function byteLength (string, encoding) {
if (Buffer.isBuffer(string)) {
  return string.length
}
if (isArrayBufferView(string) || isArrayBuffer(string)) {
  return string.byteLength
}
if (typeof string !== 'string') {
  string = '' + string
}

var len = string.length
if (len === 0) return 0

// Use a for loop to avoid recursion
var loweredCase = false
for (;;) {
  switch (encoding) {
    case 'ascii':
    case 'latin1':
    case 'binary':
      return len
    case 'utf8':
    case 'utf-8':
    case undefined:
      return utf8ToBytes(string).length
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return len * 2
    case 'hex':
      return len >>> 1
    case 'base64':
      return base64ToBytes(string).length
    default:
      if (loweredCase) return utf8ToBytes(string).length // assume utf8
      encoding = ('' + encoding).toLowerCase()
      loweredCase = true
  }
}
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
var loweredCase = false

// No need to verify that "this.length <= MAX_UINT32" since it's a read-only
// property of a typed array.

// This behaves neither like String nor Uint8Array in that we set start/end
// to their upper/lower bounds if the value passed is out of range.
// undefined is handled specially as per ECMA-262 6th Edition,
// Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
if (start === undefined || start < 0) {
  start = 0
}
// Return early if start > this.length. Done here to prevent potential uint32
// coercion fail below.
if (start > this.length) {
  return ''
}

if (end === undefined || end > this.length) {
  end = this.length
}

if (end <= 0) {
  return ''
}

// Force coersion to uint32. This will also coerce falsey/NaN values to 0.
end >>>= 0
start >>>= 0

if (end <= start) {
  return ''
}

if (!encoding) encoding = 'utf8'

while (true) {
  switch (encoding) {
    case 'hex':
      return hexSlice(this, start, end)

    case 'utf8':
    case 'utf-8':
      return utf8Slice(this, start, end)

    case 'ascii':
      return asciiSlice(this, start, end)

    case 'latin1':
    case 'binary':
      return latin1Slice(this, start, end)

    case 'base64':
      return base64Slice(this, start, end)

    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return utf16leSlice(this, start, end)

    default:
      if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
      encoding = (encoding + '').toLowerCase()
      loweredCase = true
  }
}
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
var i = b[n]
b[n] = b[m]
b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
var len = this.length
if (len % 2 !== 0) {
  throw new RangeError('Buffer size must be a multiple of 16-bits')
}
for (var i = 0; i < len; i += 2) {
  swap(this, i, i + 1)
}
return this
}

Buffer.prototype.swap32 = function swap32 () {
var len = this.length
if (len % 4 !== 0) {
  throw new RangeError('Buffer size must be a multiple of 32-bits')
}
for (var i = 0; i < len; i += 4) {
  swap(this, i, i + 3)
  swap(this, i + 1, i + 2)
}
return this
}

Buffer.prototype.swap64 = function swap64 () {
var len = this.length
if (len % 8 !== 0) {
  throw new RangeError('Buffer size must be a multiple of 64-bits')
}
for (var i = 0; i < len; i += 8) {
  swap(this, i, i + 7)
  swap(this, i + 1, i + 6)
  swap(this, i + 2, i + 5)
  swap(this, i + 3, i + 4)
}
return this
}

Buffer.prototype.toString = function toString () {
var length = this.length
if (length === 0) return ''
if (arguments.length === 0) return utf8Slice(this, 0, length)
return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
if (this === b) return true
return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
var str = ''
var max = exports.INSPECT_MAX_BYTES
if (this.length > 0) {
  str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
  if (this.length > max) str += ' ... '
}
return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
if (!Buffer.isBuffer(target)) {
  throw new TypeError('Argument must be a Buffer')
}

if (start === undefined) {
  start = 0
}
if (end === undefined) {
  end = target ? target.length : 0
}
if (thisStart === undefined) {
  thisStart = 0
}
if (thisEnd === undefined) {
  thisEnd = this.length
}

if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
  throw new RangeError('out of range index')
}

if (thisStart >= thisEnd && start >= end) {
  return 0
}
if (thisStart >= thisEnd) {
  return -1
}
if (start >= end) {
  return 1
}

start >>>= 0
end >>>= 0
thisStart >>>= 0
thisEnd >>>= 0

if (this === target) return 0

var x = thisEnd - thisStart
var y = end - start
var len = Math.min(x, y)

var thisCopy = this.slice(thisStart, thisEnd)
var targetCopy = target.slice(start, end)

for (var i = 0; i < len; ++i) {
  if (thisCopy[i] !== targetCopy[i]) {
    x = thisCopy[i]
    y = targetCopy[i]
    break
  }
}

if (x < y) return -1
if (y < x) return 1
return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
// Empty buffer means no match
if (buffer.length === 0) return -1

// Normalize byteOffset
if (typeof byteOffset === 'string') {
  encoding = byteOffset
  byteOffset = 0
} else if (byteOffset > 0x7fffffff) {
  byteOffset = 0x7fffffff
} else if (byteOffset < -0x80000000) {
  byteOffset = -0x80000000
}
byteOffset = +byteOffset  // Coerce to Number.
if (numberIsNaN(byteOffset)) {
  // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
  byteOffset = dir ? 0 : (buffer.length - 1)
}

// Normalize byteOffset: negative offsets start from the end of the buffer
if (byteOffset < 0) byteOffset = buffer.length + byteOffset
if (byteOffset >= buffer.length) {
  if (dir) return -1
  else byteOffset = buffer.length - 1
} else if (byteOffset < 0) {
  if (dir) byteOffset = 0
  else return -1
}

// Normalize val
if (typeof val === 'string') {
  val = Buffer.from(val, encoding)
}

// Finally, search either indexOf (if dir is true) or lastIndexOf
if (Buffer.isBuffer(val)) {
  // Special case: looking for empty string/buffer always fails
  if (val.length === 0) {
    return -1
  }
  return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
} else if (typeof val === 'number') {
  val = val & 0xFF // Search for a byte value [0-255]
  if (typeof Uint8Array.prototype.indexOf === 'function') {
    if (dir) {
      return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
    } else {
      return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
    }
  }
  return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
}

throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
var indexSize = 1
var arrLength = arr.length
var valLength = val.length

if (encoding !== undefined) {
  encoding = String(encoding).toLowerCase()
  if (encoding === 'ucs2' || encoding === 'ucs-2' ||
      encoding === 'utf16le' || encoding === 'utf-16le') {
    if (arr.length < 2 || val.length < 2) {
      return -1
    }
    indexSize = 2
    arrLength /= 2
    valLength /= 2
    byteOffset /= 2
  }
}

function read (buf, i) {
  if (indexSize === 1) {
    return buf[i]
  } else {
    return buf.readUInt16BE(i * indexSize)
  }
}

var i
if (dir) {
  var foundIndex = -1
  for (i = byteOffset; i < arrLength; i++) {
    if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
      if (foundIndex === -1) foundIndex = i
      if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
    } else {
      if (foundIndex !== -1) i -= i - foundIndex
      foundIndex = -1
    }
  }
} else {
  if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
  for (i = byteOffset; i >= 0; i--) {
    var found = true
    for (var j = 0; j < valLength; j++) {
      if (read(arr, i + j) !== read(val, j)) {
        found = false
        break
      }
    }
    if (found) return i
  }
}

return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
offset = Number(offset) || 0
var remaining = buf.length - offset
if (!length) {
  length = remaining
} else {
  length = Number(length)
  if (length > remaining) {
    length = remaining
  }
}

// must be an even number of digits
var strLen = string.length
if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

if (length > strLen / 2) {
  length = strLen / 2
}
for (var i = 0; i < length; ++i) {
  var parsed = parseInt(string.substr(i * 2, 2), 16)
  if (numberIsNaN(parsed)) return i
  buf[offset + i] = parsed
}
return i
}

function utf8Write (buf, string, offset, length) {
return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
// Buffer#write(string)
if (offset === undefined) {
  encoding = 'utf8'
  length = this.length
  offset = 0
// Buffer#write(string, encoding)
} else if (length === undefined && typeof offset === 'string') {
  encoding = offset
  length = this.length
  offset = 0
// Buffer#write(string, offset[, length][, encoding])
} else if (isFinite(offset)) {
  offset = offset >>> 0
  if (isFinite(length)) {
    length = length >>> 0
    if (encoding === undefined) encoding = 'utf8'
  } else {
    encoding = length
    length = undefined
  }
} else {
  throw new Error(
    'Buffer.write(string, encoding, offset[, length]) is no longer supported'
  )
}

var remaining = this.length - offset
if (length === undefined || length > remaining) length = remaining

if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
  throw new RangeError('Attempt to write outside buffer bounds')
}

if (!encoding) encoding = 'utf8'

var loweredCase = false
for (;;) {
  switch (encoding) {
    case 'hex':
      return hexWrite(this, string, offset, length)

    case 'utf8':
    case 'utf-8':
      return utf8Write(this, string, offset, length)

    case 'ascii':
      return asciiWrite(this, string, offset, length)

    case 'latin1':
    case 'binary':
      return latin1Write(this, string, offset, length)

    case 'base64':
      // Warning: maxLength not taken into account in base64Write
      return base64Write(this, string, offset, length)

    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return ucs2Write(this, string, offset, length)

    default:
      if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
      encoding = ('' + encoding).toLowerCase()
      loweredCase = true
  }
}
}

Buffer.prototype.toJSON = function toJSON () {
return {
  type: 'Buffer',
  data: Array.prototype.slice.call(this._arr || this, 0)
}
}

function base64Slice (buf, start, end) {
if (start === 0 && end === buf.length) {
  return base64.fromByteArray(buf)
} else {
  return base64.fromByteArray(buf.slice(start, end))
}
}

function utf8Slice (buf, start, end) {
end = Math.min(buf.length, end)
var res = []

var i = start
while (i < end) {
  var firstByte = buf[i]
  var codePoint = null
  var bytesPerSequence = (firstByte > 0xEF) ? 4
    : (firstByte > 0xDF) ? 3
    : (firstByte > 0xBF) ? 2
    : 1

  if (i + bytesPerSequence <= end) {
    var secondByte, thirdByte, fourthByte, tempCodePoint

    switch (bytesPerSequence) {
      case 1:
        if (firstByte < 0x80) {
          codePoint = firstByte
        }
        break
      case 2:
        secondByte = buf[i + 1]
        if ((secondByte & 0xC0) === 0x80) {
          tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
          if (tempCodePoint > 0x7F) {
            codePoint = tempCodePoint
          }
        }
        break
      case 3:
        secondByte = buf[i + 1]
        thirdByte = buf[i + 2]
        if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
          tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
          if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
            codePoint = tempCodePoint
          }
        }
        break
      case 4:
        secondByte = buf[i + 1]
        thirdByte = buf[i + 2]
        fourthByte = buf[i + 3]
        if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
          tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
          if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
            codePoint = tempCodePoint
          }
        }
    }
  }

  if (codePoint === null) {
    // we did not generate a valid codePoint so insert a
    // replacement char (U+FFFD) and advance only 1 byte
    codePoint = 0xFFFD
    bytesPerSequence = 1
  } else if (codePoint > 0xFFFF) {
    // encode to utf16 (surrogate pair dance)
    codePoint -= 0x10000
    res.push(codePoint >>> 10 & 0x3FF | 0xD800)
    codePoint = 0xDC00 | codePoint & 0x3FF
  }

  res.push(codePoint)
  i += bytesPerSequence
}

return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
var len = codePoints.length
if (len <= MAX_ARGUMENTS_LENGTH) {
  return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
}

// Decode in chunks to avoid "call stack size exceeded".
var res = ''
var i = 0
while (i < len) {
  res += String.fromCharCode.apply(
    String,
    codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
  )
}
return res
}

function asciiSlice (buf, start, end) {
var ret = ''
end = Math.min(buf.length, end)

for (var i = start; i < end; ++i) {
  ret += String.fromCharCode(buf[i] & 0x7F)
}
return ret
}

function latin1Slice (buf, start, end) {
var ret = ''
end = Math.min(buf.length, end)

for (var i = start; i < end; ++i) {
  ret += String.fromCharCode(buf[i])
}
return ret
}

function hexSlice (buf, start, end) {
var len = buf.length

if (!start || start < 0) start = 0
if (!end || end < 0 || end > len) end = len

var out = ''
for (var i = start; i < end; ++i) {
  out += toHex(buf[i])
}
return out
}

function utf16leSlice (buf, start, end) {
var bytes = buf.slice(start, end)
var res = ''
for (var i = 0; i < bytes.length; i += 2) {
  res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
}
return res
}

Buffer.prototype.slice = function slice (start, end) {
var len = this.length
start = ~~start
end = end === undefined ? len : ~~end

if (start < 0) {
  start += len
  if (start < 0) start = 0
} else if (start > len) {
  start = len
}

if (end < 0) {
  end += len
  if (end < 0) end = 0
} else if (end > len) {
  end = len
}

if (end < start) end = start

var newBuf = this.subarray(start, end)
// Return an augmented `Uint8Array` instance
newBuf.__proto__ = Buffer.prototype
return newBuf
}

/*
* Need to make sure that buffer isn't trying to write out of bounds.
*/
function checkOffset (offset, ext, length) {
if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
offset = offset >>> 0
byteLength = byteLength >>> 0
if (!noAssert) checkOffset(offset, byteLength, this.length)

var val = this[offset]
var mul = 1
var i = 0
while (++i < byteLength && (mul *= 0x100)) {
  val += this[offset + i] * mul
}

return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
offset = offset >>> 0
byteLength = byteLength >>> 0
if (!noAssert) {
  checkOffset(offset, byteLength, this.length)
}

var val = this[offset + --byteLength]
var mul = 1
while (byteLength > 0 && (mul *= 0x100)) {
  val += this[offset + --byteLength] * mul
}

return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 1, this.length)
return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 2, this.length)
return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 2, this.length)
return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 4, this.length)

return ((this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16)) +
    (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 4, this.length)

return (this[offset] * 0x1000000) +
  ((this[offset + 1] << 16) |
  (this[offset + 2] << 8) |
  this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
offset = offset >>> 0
byteLength = byteLength >>> 0
if (!noAssert) checkOffset(offset, byteLength, this.length)

var val = this[offset]
var mul = 1
var i = 0
while (++i < byteLength && (mul *= 0x100)) {
  val += this[offset + i] * mul
}
mul *= 0x80

if (val >= mul) val -= Math.pow(2, 8 * byteLength)

return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
offset = offset >>> 0
byteLength = byteLength >>> 0
if (!noAssert) checkOffset(offset, byteLength, this.length)

var i = byteLength
var mul = 1
var val = this[offset + --i]
while (i > 0 && (mul *= 0x100)) {
  val += this[offset + --i] * mul
}
mul *= 0x80

if (val >= mul) val -= Math.pow(2, 8 * byteLength)

return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 1, this.length)
if (!(this[offset] & 0x80)) return (this[offset])
return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 2, this.length)
var val = this[offset] | (this[offset + 1] << 8)
return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 2, this.length)
var val = this[offset + 1] | (this[offset] << 8)
return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 4, this.length)

return (this[offset]) |
  (this[offset + 1] << 8) |
  (this[offset + 2] << 16) |
  (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 4, this.length)

return (this[offset] << 24) |
  (this[offset + 1] << 16) |
  (this[offset + 2] << 8) |
  (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 4, this.length)
return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 4, this.length)
return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 8, this.length)
return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
offset = offset >>> 0
if (!noAssert) checkOffset(offset, 8, this.length)
return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
value = +value
offset = offset >>> 0
byteLength = byteLength >>> 0
if (!noAssert) {
  var maxBytes = Math.pow(2, 8 * byteLength) - 1
  checkInt(this, value, offset, byteLength, maxBytes, 0)
}

var mul = 1
var i = 0
this[offset] = value & 0xFF
while (++i < byteLength && (mul *= 0x100)) {
  this[offset + i] = (value / mul) & 0xFF
}

return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
value = +value
offset = offset >>> 0
byteLength = byteLength >>> 0
if (!noAssert) {
  var maxBytes = Math.pow(2, 8 * byteLength) - 1
  checkInt(this, value, offset, byteLength, maxBytes, 0)
}

var i = byteLength - 1
var mul = 1
this[offset + i] = value & 0xFF
while (--i >= 0 && (mul *= 0x100)) {
  this[offset + i] = (value / mul) & 0xFF
}

return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
this[offset] = (value & 0xff)
return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
this[offset] = (value & 0xff)
this[offset + 1] = (value >>> 8)
return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
this[offset] = (value >>> 8)
this[offset + 1] = (value & 0xff)
return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
this[offset + 3] = (value >>> 24)
this[offset + 2] = (value >>> 16)
this[offset + 1] = (value >>> 8)
this[offset] = (value & 0xff)
return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
this[offset] = (value >>> 24)
this[offset + 1] = (value >>> 16)
this[offset + 2] = (value >>> 8)
this[offset + 3] = (value & 0xff)
return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) {
  var limit = Math.pow(2, (8 * byteLength) - 1)

  checkInt(this, value, offset, byteLength, limit - 1, -limit)
}

var i = 0
var mul = 1
var sub = 0
this[offset] = value & 0xFF
while (++i < byteLength && (mul *= 0x100)) {
  if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
    sub = 1
  }
  this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
}

return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) {
  var limit = Math.pow(2, (8 * byteLength) - 1)

  checkInt(this, value, offset, byteLength, limit - 1, -limit)
}

var i = byteLength - 1
var mul = 1
var sub = 0
this[offset + i] = value & 0xFF
while (--i >= 0 && (mul *= 0x100)) {
  if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
    sub = 1
  }
  this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
}

return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
if (value < 0) value = 0xff + value + 1
this[offset] = (value & 0xff)
return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
this[offset] = (value & 0xff)
this[offset + 1] = (value >>> 8)
return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
this[offset] = (value >>> 8)
this[offset + 1] = (value & 0xff)
return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
this[offset] = (value & 0xff)
this[offset + 1] = (value >>> 8)
this[offset + 2] = (value >>> 16)
this[offset + 3] = (value >>> 24)
return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
if (value < 0) value = 0xffffffff + value + 1
this[offset] = (value >>> 24)
this[offset + 1] = (value >>> 16)
this[offset + 2] = (value >>> 8)
this[offset + 3] = (value & 0xff)
return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
if (offset + ext > buf.length) throw new RangeError('Index out of range')
if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) {
  checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
}
ieee754.write(buf, value, offset, littleEndian, 23, 4)
return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
value = +value
offset = offset >>> 0
if (!noAssert) {
  checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
}
ieee754.write(buf, value, offset, littleEndian, 52, 8)
return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
if (!start) start = 0
if (!end && end !== 0) end = this.length
if (targetStart >= target.length) targetStart = target.length
if (!targetStart) targetStart = 0
if (end > 0 && end < start) end = start

// Copy 0 bytes; we're done
if (end === start) return 0
if (target.length === 0 || this.length === 0) return 0

// Fatal error conditions
if (targetStart < 0) {
  throw new RangeError('targetStart out of bounds')
}
if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
if (end < 0) throw new RangeError('sourceEnd out of bounds')

// Are we oob?
if (end > this.length) end = this.length
if (target.length - targetStart < end - start) {
  end = target.length - targetStart + start
}

var len = end - start
var i

if (this === target && start < targetStart && targetStart < end) {
  // descending copy from end
  for (i = len - 1; i >= 0; --i) {
    target[i + targetStart] = this[i + start]
  }
} else if (len < 1000) {
  // ascending copy from start
  for (i = 0; i < len; ++i) {
    target[i + targetStart] = this[i + start]
  }
} else {
  Uint8Array.prototype.set.call(
    target,
    this.subarray(start, start + len),
    targetStart
  )
}

return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
// Handle string cases:
if (typeof val === 'string') {
  if (typeof start === 'string') {
    encoding = start
    start = 0
    end = this.length
  } else if (typeof end === 'string') {
    encoding = end
    end = this.length
  }
  if (val.length === 1) {
    var code = val.charCodeAt(0)
    if (code < 256) {
      val = code
    }
  }
  if (encoding !== undefined && typeof encoding !== 'string') {
    throw new TypeError('encoding must be a string')
  }
  if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }
} else if (typeof val === 'number') {
  val = val & 255
}

// Invalid ranges are not set to a default, so can range check early.
if (start < 0 || this.length < start || this.length < end) {
  throw new RangeError('Out of range index')
}

if (end <= start) {
  return this
}

start = start >>> 0
end = end === undefined ? this.length : end >>> 0

if (!val) val = 0

var i
if (typeof val === 'number') {
  for (i = start; i < end; ++i) {
    this[i] = val
  }
} else {
  var bytes = Buffer.isBuffer(val)
    ? val
    : new Buffer(val, encoding)
  var len = bytes.length
  for (i = 0; i < end - start; ++i) {
    this[i + start] = bytes[i % len]
  }
}

return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
// Node strips out invalid characters like \n and \t from the string, base64-js does not
str = str.trim().replace(INVALID_BASE64_RE, '')
// Node converts strings with length < 2 to ''
if (str.length < 2) return ''
// Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
while (str.length % 4 !== 0) {
  str = str + '='
}
return str
}

function toHex (n) {
if (n < 16) return '0' + n.toString(16)
return n.toString(16)
}

function utf8ToBytes (string, units) {
units = units || Infinity
var codePoint
var length = string.length
var leadSurrogate = null
var bytes = []

for (var i = 0; i < length; ++i) {
  codePoint = string.charCodeAt(i)

  // is surrogate component
  if (codePoint > 0xD7FF && codePoint < 0xE000) {
    // last char was a lead
    if (!leadSurrogate) {
      // no lead yet
      if (codePoint > 0xDBFF) {
        // unexpected trail
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        continue
      } else if (i + 1 === length) {
        // unpaired lead
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        continue
      }

      // valid lead
      leadSurrogate = codePoint

      continue
    }

    // 2 leads in a row
    if (codePoint < 0xDC00) {
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = codePoint
      continue
    }

    // valid surrogate pair
    codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
  } else if (leadSurrogate) {
    // valid bmp char, but last char was a lead
    if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
  }

  leadSurrogate = null

  // encode utf8
  if (codePoint < 0x80) {
    if ((units -= 1) < 0) break
    bytes.push(codePoint)
  } else if (codePoint < 0x800) {
    if ((units -= 2) < 0) break
    bytes.push(
      codePoint >> 0x6 | 0xC0,
      codePoint & 0x3F | 0x80
    )
  } else if (codePoint < 0x10000) {
    if ((units -= 3) < 0) break
    bytes.push(
      codePoint >> 0xC | 0xE0,
      codePoint >> 0x6 & 0x3F | 0x80,
      codePoint & 0x3F | 0x80
    )
  } else if (codePoint < 0x110000) {
    if ((units -= 4) < 0) break
    bytes.push(
      codePoint >> 0x12 | 0xF0,
      codePoint >> 0xC & 0x3F | 0x80,
      codePoint >> 0x6 & 0x3F | 0x80,
      codePoint & 0x3F | 0x80
    )
  } else {
    throw new Error('Invalid code point')
  }
}

return bytes
}

function asciiToBytes (str) {
var byteArray = []
for (var i = 0; i < str.length; ++i) {
  // Node's code seems to be doing this and not & 0x7F..
  byteArray.push(str.charCodeAt(i) & 0xFF)
}
return byteArray
}

function utf16leToBytes (str, units) {
var c, hi, lo
var byteArray = []
for (var i = 0; i < str.length; ++i) {
  if ((units -= 2) < 0) break

  c = str.charCodeAt(i)
  hi = c >> 8
  lo = c % 256
  byteArray.push(lo)
  byteArray.push(hi)
}

return byteArray
}

function base64ToBytes (str) {
return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
for (var i = 0; i < length; ++i) {
  if ((i + offset >= dst.length) || (i >= src.length)) break
  dst[i + offset] = src[i]
}
return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
return obj instanceof ArrayBuffer ||
  (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
    typeof obj.byteLength === 'number')
}

// Node 0.10 supports `ArrayBuffer` but lacks `ArrayBuffer.isView`
function isArrayBufferView (obj) {
return (typeof ArrayBuffer.isView === 'function') && ArrayBuffer.isView(obj)
}

function numberIsNaN (obj) {
return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":21,"ieee754":32}],24:[function(_dereq_,module,exports){
module.exports = {
"100": "Continue",
"101": "Switching Protocols",
"102": "Processing",
"200": "OK",
"201": "Created",
"202": "Accepted",
"203": "Non-Authoritative Information",
"204": "No Content",
"205": "Reset Content",
"206": "Partial Content",
"207": "Multi-Status",
"208": "Already Reported",
"226": "IM Used",
"300": "Multiple Choices",
"301": "Moved Permanently",
"302": "Found",
"303": "See Other",
"304": "Not Modified",
"305": "Use Proxy",
"307": "Temporary Redirect",
"308": "Permanent Redirect",
"400": "Bad Request",
"401": "Unauthorized",
"402": "Payment Required",
"403": "Forbidden",
"404": "Not Found",
"405": "Method Not Allowed",
"406": "Not Acceptable",
"407": "Proxy Authentication Required",
"408": "Request Timeout",
"409": "Conflict",
"410": "Gone",
"411": "Length Required",
"412": "Precondition Failed",
"413": "Payload Too Large",
"414": "URI Too Long",
"415": "Unsupported Media Type",
"416": "Range Not Satisfiable",
"417": "Expectation Failed",
"418": "I'm a teapot",
"421": "Misdirected Request",
"422": "Unprocessable Entity",
"423": "Locked",
"424": "Failed Dependency",
"425": "Unordered Collection",
"426": "Upgrade Required",
"428": "Precondition Required",
"429": "Too Many Requests",
"431": "Request Header Fields Too Large",
"451": "Unavailable For Legal Reasons",
"500": "Internal Server Error",
"501": "Not Implemented",
"502": "Bad Gateway",
"503": "Service Unavailable",
"504": "Gateway Timeout",
"505": "HTTP Version Not Supported",
"506": "Variant Also Negotiates",
"507": "Insufficient Storage",
"508": "Loop Detected",
"509": "Bandwidth Limit Exceeded",
"510": "Not Extended",
"511": "Network Authentication Required"
}

},{}],25:[function(_dereq_,module,exports){
(function (process,global){
"use strict"

var next = (global.process && process.nextTick) || global.setImmediate || function (f) {
setTimeout(f, 0)
}

module.exports = function maybe (cb, promise) {
if (cb) {
  promise
    .then(function (result) {
      next(function () { cb(null, result) })
    }, function (err) {
      next(function () { cb(err) })
    })
  return undefined
}
else {
  return promise
}
}

}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":69}],26:[function(_dereq_,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
if (Array.isArray) {
  return Array.isArray(arg);
}
return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
return arg === null ||
       typeof arg === 'boolean' ||
       typeof arg === 'number' ||
       typeof arg === 'string' ||
       typeof arg === 'symbol' ||  // ES6 symbol
       typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":_dereq_("../../is-buffer/index.js")})

},{"../../is-buffer/index.js":34}],27:[function(_dereq_,module,exports){
(function (process){
/**
* This is the web browser implementation of `debug()`.
*
* Expose `debug()` as the module.
*/

exports = module.exports = _dereq_('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
             && 'undefined' != typeof chrome.storage
                ? chrome.storage.local
                : localstorage();

/**
* Colors.
*/

exports.colors = [
'#0000CC', '#0000FF', '#0033CC', '#0033FF', '#0066CC', '#0066FF', '#0099CC',
'#0099FF', '#00CC00', '#00CC33', '#00CC66', '#00CC99', '#00CCCC', '#00CCFF',
'#3300CC', '#3300FF', '#3333CC', '#3333FF', '#3366CC', '#3366FF', '#3399CC',
'#3399FF', '#33CC00', '#33CC33', '#33CC66', '#33CC99', '#33CCCC', '#33CCFF',
'#6600CC', '#6600FF', '#6633CC', '#6633FF', '#66CC00', '#66CC33', '#9900CC',
'#9900FF', '#9933CC', '#9933FF', '#99CC00', '#99CC33', '#CC0000', '#CC0033',
'#CC0066', '#CC0099', '#CC00CC', '#CC00FF', '#CC3300', '#CC3333', '#CC3366',
'#CC3399', '#CC33CC', '#CC33FF', '#CC6600', '#CC6633', '#CC9900', '#CC9933',
'#CCCC00', '#CCCC33', '#FF0000', '#FF0033', '#FF0066', '#FF0099', '#FF00CC',
'#FF00FF', '#FF3300', '#FF3333', '#FF3366', '#FF3399', '#FF33CC', '#FF33FF',
'#FF6600', '#FF6633', '#FF9900', '#FF9933', '#FFCC00', '#FFCC33'
];

/**
* Currently only WebKit-based Web Inspectors, Firefox >= v31,
* and the Firebug extension (any Firefox version) are known
* to support "%c" CSS customizations.
*
* TODO: add a `localStorage` variable to explicitly enable/disable colors
*/

function useColors() {
// NB: In an Electron preload script, document will be defined but not fully
// initialized. Since we know we're in Chrome, we'll just detect this case
// explicitly
if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
  return true;
}

// Internet Explorer and Edge do not support colors.
if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
  return false;
}

// is webkit? http://stackoverflow.com/a/16459606/376773
// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
  // is firebug? http://stackoverflow.com/a/398120/376773
  (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
  // is firefox >= v31?
  // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
  (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
  // double check webkit in userAgent just in case we are in a worker
  (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
* Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
*/

exports.formatters.j = function(v) {
try {
  return JSON.stringify(v);
} catch (err) {
  return '[UnexpectedJSONParseError]: ' + err.message;
}
};


/**
* Colorize log arguments if enabled.
*
* @api public
*/

function formatArgs(args) {
var useColors = this.useColors;

args[0] = (useColors ? '%c' : '')
  + this.namespace
  + (useColors ? ' %c' : ' ')
  + args[0]
  + (useColors ? '%c ' : ' ')
  + '+' + exports.humanize(this.diff);

if (!useColors) return;

var c = 'color: ' + this.color;
args.splice(1, 0, c, 'color: inherit')

// the final "%c" is somewhat tricky, because there could be other
// arguments passed either before or after the %c, so we need to
// figure out the correct index to insert the CSS into
var index = 0;
var lastC = 0;
args[0].replace(/%[a-zA-Z%]/g, function(match) {
  if ('%%' === match) return;
  index++;
  if ('%c' === match) {
    // we only are interested in the *last* %c
    // (the user may have provided their own)
    lastC = index;
  }
});

args.splice(lastC, 0, c);
}

/**
* Invokes `console.log()` when available.
* No-op when `console.log` is not a "function".
*
* @api public
*/

function log() {
// this hackery is required for IE8/9, where
// the `console.log` function doesn't have 'apply'
return 'object' === typeof console
  && console.log
  && Function.prototype.apply.call(console.log, console, arguments);
}

/**
* Save `namespaces`.
*
* @param {String} namespaces
* @api private
*/

function save(namespaces) {
try {
  if (null == namespaces) {
    exports.storage.removeItem('debug');
  } else {
    exports.storage.debug = namespaces;
  }
} catch(e) {}
}

/**
* Load `namespaces`.
*
* @return {String} returns the previously persisted debug modes
* @api private
*/

function load() {
var r;
try {
  r = exports.storage.debug;
} catch(e) {}

// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
if (!r && typeof process !== 'undefined' && 'env' in process) {
  r = process.env.DEBUG;
}

return r;
}

/**
* Enable namespaces listed in `localStorage.debug` initially.
*/

exports.enable(load());

/**
* Localstorage attempts to return the localstorage.
*
* This is necessary because safari throws
* when a user disables cookies/localstorage
* and you attempt to access it.
*
* @return {LocalStorage}
* @api private
*/

function localstorage() {
try {
  return window.localStorage;
} catch (e) {}
}

}).call(this,_dereq_('_process'))

},{"./debug":28,"_process":69}],28:[function(_dereq_,module,exports){

/**
* This is the common logic for both the Node.js and web browser
* implementations of `debug()`.
*
* Expose `debug()` as the module.
*/

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = _dereq_('ms');

/**
* Active `debug` instances.
*/
exports.instances = [];

/**
* The currently active debug mode names, and names to skip.
*/

exports.names = [];
exports.skips = [];

/**
* Map of special "%n" handling functions, for the debug "format" argument.
*
* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
*/

exports.formatters = {};

/**
* Select a color.
* @param {String} namespace
* @return {Number}
* @api private
*/

function selectColor(namespace) {
var hash = 0, i;

for (i in namespace) {
  hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
  hash |= 0; // Convert to 32bit integer
}

return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
* Create a debugger with the given `namespace`.
*
* @param {String} namespace
* @return {Function}
* @api public
*/

function createDebug(namespace) {

var prevTime;

function debug() {
  // disabled?
  if (!debug.enabled) return;

  var self = debug;

  // set `diff` timestamp
  var curr = +new Date();
  var ms = curr - (prevTime || curr);
  self.diff = ms;
  self.prev = prevTime;
  self.curr = curr;
  prevTime = curr;

  // turn the `arguments` into a proper Array
  var args = new Array(arguments.length);
  for (var i = 0; i < args.length; i++) {
    args[i] = arguments[i];
  }

  args[0] = exports.coerce(args[0]);

  if ('string' !== typeof args[0]) {
    // anything else let's inspect with %O
    args.unshift('%O');
  }

  // apply any `formatters` transformations
  var index = 0;
  args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
    // if we encounter an escaped % then don't increase the array index
    if (match === '%%') return match;
    index++;
    var formatter = exports.formatters[format];
    if ('function' === typeof formatter) {
      var val = args[index];
      match = formatter.call(self, val);

      // now we need to remove `args[index]` since it's inlined in the `format`
      args.splice(index, 1);
      index--;
    }
    return match;
  });

  // apply env-specific formatting (colors, etc.)
  exports.formatArgs.call(self, args);

  var logFn = debug.log || exports.log || console.log.bind(console);
  logFn.apply(self, args);
}

debug.namespace = namespace;
debug.enabled = exports.enabled(namespace);
debug.useColors = exports.useColors();
debug.color = selectColor(namespace);
debug.destroy = destroy;

// env-specific initialization logic for debug instances
if ('function' === typeof exports.init) {
  exports.init(debug);
}

exports.instances.push(debug);

return debug;
}

function destroy () {
var index = exports.instances.indexOf(this);
if (index !== -1) {
  exports.instances.splice(index, 1);
  return true;
} else {
  return false;
}
}

/**
* Enables a debug mode by namespaces. This can include modes
* separated by a colon and wildcards.
*
* @param {String} namespaces
* @api public
*/

function enable(namespaces) {
exports.save(namespaces);

exports.names = [];
exports.skips = [];

var i;
var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
var len = split.length;

for (i = 0; i < len; i++) {
  if (!split[i]) continue; // ignore empty strings
  namespaces = split[i].replace(/\*/g, '.*?');
  if (namespaces[0] === '-') {
    exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
  } else {
    exports.names.push(new RegExp('^' + namespaces + '$'));
  }
}

for (i = 0; i < exports.instances.length; i++) {
  var instance = exports.instances[i];
  instance.enabled = exports.enabled(instance.namespace);
}
}

/**
* Disable debug output.
*
* @api public
*/

function disable() {
exports.enable('');
}

/**
* Returns true if the given mode name is enabled, false otherwise.
*
* @param {String} name
* @return {Boolean}
* @api public
*/

function enabled(name) {
if (name[name.length - 1] === '*') {
  return true;
}
var i, len;
for (i = 0, len = exports.skips.length; i < len; i++) {
  if (exports.skips[i].test(name)) {
    return false;
  }
}
for (i = 0, len = exports.names.length; i < len; i++) {
  if (exports.names[i].test(name)) {
    return true;
  }
}
return false;
}

/**
* Coerce `val`.
*
* @param {Mixed} val
* @return {Mixed}
* @api private
*/

function coerce(val) {
if (val instanceof Error) return val.stack || val.message;
return val;
}

},{"ms":66}],29:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
this._events = this._events || {};
this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
if (!isNumber(n) || n < 0 || isNaN(n))
  throw TypeError('n must be a positive number');
this._maxListeners = n;
return this;
};

EventEmitter.prototype.emit = function(type) {
var er, handler, len, args, i, listeners;

if (!this._events)
  this._events = {};

// If there is no 'error' event listener then throw.
if (type === 'error') {
  if (!this._events.error ||
      (isObject(this._events.error) && !this._events.error.length)) {
    er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
  }
}

handler = this._events[type];

if (isUndefined(handler))
  return false;

if (isFunction(handler)) {
  switch (arguments.length) {
    // fast cases
    case 1:
      handler.call(this);
      break;
    case 2:
      handler.call(this, arguments[1]);
      break;
    case 3:
      handler.call(this, arguments[1], arguments[2]);
      break;
    // slower
    default:
      args = Array.prototype.slice.call(arguments, 1);
      handler.apply(this, args);
  }
} else if (isObject(handler)) {
  args = Array.prototype.slice.call(arguments, 1);
  listeners = handler.slice();
  len = listeners.length;
  for (i = 0; i < len; i++)
    listeners[i].apply(this, args);
}

return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
var m;

if (!isFunction(listener))
  throw TypeError('listener must be a function');

if (!this._events)
  this._events = {};

// To avoid recursion in the case that type === "newListener"! Before
// adding it to the listeners, first emit "newListener".
if (this._events.newListener)
  this.emit('newListener', type,
            isFunction(listener.listener) ?
            listener.listener : listener);

if (!this._events[type])
  // Optimize the case of one listener. Don't need the extra array object.
  this._events[type] = listener;
else if (isObject(this._events[type]))
  // If we've already got an array, just append.
  this._events[type].push(listener);
else
  // Adding the second element, need to change to array.
  this._events[type] = [this._events[type], listener];

// Check for listener leak
if (isObject(this._events[type]) && !this._events[type].warned) {
  if (!isUndefined(this._maxListeners)) {
    m = this._maxListeners;
  } else {
    m = EventEmitter.defaultMaxListeners;
  }

  if (m && m > 0 && this._events[type].length > m) {
    this._events[type].warned = true;
    console.warn('(node) warning: possible EventEmitter memory ' +
                  'leak detected. %d listeners added. ' +
                  'Use emitter.setMaxListeners() to increase limit.',
                  this._events[type].length);
    if (typeof console.trace === 'function') {
      // not supported in IE 10
      console.trace();
    }
  }
}

return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
if (!isFunction(listener))
  throw TypeError('listener must be a function');

var fired = false;

function g() {
  this.removeListener(type, g);

  if (!fired) {
    fired = true;
    listener.apply(this, arguments);
  }
}

g.listener = listener;
this.on(type, g);

return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
var list, position, length, i;

if (!isFunction(listener))
  throw TypeError('listener must be a function');

if (!this._events || !this._events[type])
  return this;

list = this._events[type];
length = list.length;
position = -1;

if (list === listener ||
    (isFunction(list.listener) && list.listener === listener)) {
  delete this._events[type];
  if (this._events.removeListener)
    this.emit('removeListener', type, listener);

} else if (isObject(list)) {
  for (i = length; i-- > 0;) {
    if (list[i] === listener ||
        (list[i].listener && list[i].listener === listener)) {
      position = i;
      break;
    }
  }

  if (position < 0)
    return this;

  if (list.length === 1) {
    list.length = 0;
    delete this._events[type];
  } else {
    list.splice(position, 1);
  }

  if (this._events.removeListener)
    this.emit('removeListener', type, listener);
}

return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
var key, listeners;

if (!this._events)
  return this;

// not listening for removeListener, no need to emit
if (!this._events.removeListener) {
  if (arguments.length === 0)
    this._events = {};
  else if (this._events[type])
    delete this._events[type];
  return this;
}

// emit removeListener for all listeners on all events
if (arguments.length === 0) {
  for (key in this._events) {
    if (key === 'removeListener') continue;
    this.removeAllListeners(key);
  }
  this.removeAllListeners('removeListener');
  this._events = {};
  return this;
}

listeners = this._events[type];

if (isFunction(listeners)) {
  this.removeListener(type, listeners);
} else if (listeners) {
  // LIFO order
  while (listeners.length)
    this.removeListener(type, listeners[listeners.length - 1]);
}
delete this._events[type];

return this;
};

EventEmitter.prototype.listeners = function(type) {
var ret;
if (!this._events || !this._events[type])
  ret = [];
else if (isFunction(this._events[type]))
  ret = [this._events[type]];
else
  ret = this._events[type].slice();
return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
if (this._events) {
  var evlistener = this._events[type];

  if (isFunction(evlistener))
    return 1;
  else if (evlistener)
    return evlistener.length;
}
return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
return emitter.listenerCount(type);
};

function isFunction(arg) {
return typeof arg === 'function';
}

function isNumber(arg) {
return typeof arg === 'number';
}

function isObject(arg) {
return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
return arg === void 0;
}

},{}],30:[function(_dereq_,module,exports){
function format(fmt) {
var re = /(%?)(%([jds]))/g
  , args = Array.prototype.slice.call(arguments, 1);
if(args.length) {
  fmt = fmt.replace(re, function(match, escaped, ptn, flag) {
    var arg = args.shift();
    switch(flag) {
      case 's':
        arg = '' + arg;
        break;
      case 'd':
        arg = Number(arg);
        break;
      case 'j':
        arg = JSON.stringify(arg);
        break;
    }
    if(!escaped) {
      return arg;
    }
    args.unshift(arg);
    return match;
  })
}

// arguments remain after formatting
if(args.length) {
  fmt += ' ' + args.join(' ');
}

// update escaped %% values
fmt = fmt.replace(/%{2,2}/g, '%');

return '' + fmt;
}

module.exports = format;

},{}],31:[function(_dereq_,module,exports){
var http = _dereq_('http')
var url = _dereq_('url')

var https = module.exports

for (var key in http) {
if (http.hasOwnProperty(key)) https[key] = http[key]
}

https.request = function (params, cb) {
params = validateParams(params)
return http.request.call(this, params, cb)
}

https.get = function (params, cb) {
params = validateParams(params)
return http.get.call(this, params, cb)
}

function validateParams (params) {
if (typeof params === 'string') {
  params = url.parse(params)
}
if (!params.protocol) {
  params.protocol = 'https:'
}
if (params.protocol !== 'https:') {
  throw new Error('Protocol "' + params.protocol + '" not supported. Expected "https:"')
}
return params
}

},{"http":84,"url":90}],32:[function(_dereq_,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
var e, m
var eLen = nBytes * 8 - mLen - 1
var eMax = (1 << eLen) - 1
var eBias = eMax >> 1
var nBits = -7
var i = isLE ? (nBytes - 1) : 0
var d = isLE ? -1 : 1
var s = buffer[offset + i]

i += d

e = s & ((1 << (-nBits)) - 1)
s >>= (-nBits)
nBits += eLen
for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

m = e & ((1 << (-nBits)) - 1)
e >>= (-nBits)
nBits += mLen
for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

if (e === 0) {
  e = 1 - eBias
} else if (e === eMax) {
  return m ? NaN : ((s ? -1 : 1) * Infinity)
} else {
  m = m + Math.pow(2, mLen)
  e = e - eBias
}
return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
var e, m, c
var eLen = nBytes * 8 - mLen - 1
var eMax = (1 << eLen) - 1
var eBias = eMax >> 1
var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
var i = isLE ? 0 : (nBytes - 1)
var d = isLE ? 1 : -1
var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

value = Math.abs(value)

if (isNaN(value) || value === Infinity) {
  m = isNaN(value) ? 1 : 0
  e = eMax
} else {
  e = Math.floor(Math.log(value) / Math.LN2)
  if (value * (c = Math.pow(2, -e)) < 1) {
    e--
    c *= 2
  }
  if (e + eBias >= 1) {
    value += rt / c
  } else {
    value += rt * Math.pow(2, 1 - eBias)
  }
  if (value * c >= 2) {
    e++
    c /= 2
  }

  if (e + eBias >= eMax) {
    m = 0
    e = eMax
  } else if (e + eBias >= 1) {
    m = (value * c - 1) * Math.pow(2, mLen)
    e = e + eBias
  } else {
    m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
    e = 0
  }
}

for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

e = (e << mLen) | m
eLen += mLen
for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

buffer[offset + i - d] |= s * 128
}

},{}],33:[function(_dereq_,module,exports){
if (typeof Object.create === 'function') {
// implementation from standard node.js 'util' module
module.exports = function inherits(ctor, superCtor) {
  ctor.super_ = superCtor
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};
} else {
// old school shim for old browsers
module.exports = function inherits(ctor, superCtor) {
  ctor.super_ = superCtor
  var TempCtor = function () {}
  TempCtor.prototype = superCtor.prototype
  ctor.prototype = new TempCtor()
  ctor.prototype.constructor = ctor
}
}

},{}],34:[function(_dereq_,module,exports){
/*!
* Determine if an object is a Buffer
*
* @author   Feross Aboukhadijeh <https://feross.org>
* @license  MIT
*/

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],35:[function(_dereq_,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
return toString.call(arr) == '[object Array]';
};

},{}],36:[function(_dereq_,module,exports){
'use strict';


var yaml = _dereq_('./lib/js-yaml.js');


module.exports = yaml;

},{"./lib/js-yaml.js":37}],37:[function(_dereq_,module,exports){
'use strict';


var loader = _dereq_('./js-yaml/loader');
var dumper = _dereq_('./js-yaml/dumper');


function deprecated(name) {
return function () {
  throw new Error('Function ' + name + ' is deprecated and cannot be used.');
};
}


module.exports.Type                = _dereq_('./js-yaml/type');
module.exports.Schema              = _dereq_('./js-yaml/schema');
module.exports.FAILSAFE_SCHEMA     = _dereq_('./js-yaml/schema/failsafe');
module.exports.JSON_SCHEMA         = _dereq_('./js-yaml/schema/json');
module.exports.CORE_SCHEMA         = _dereq_('./js-yaml/schema/core');
module.exports.DEFAULT_SAFE_SCHEMA = _dereq_('./js-yaml/schema/default_safe');
module.exports.DEFAULT_FULL_SCHEMA = _dereq_('./js-yaml/schema/default_full');
module.exports.load                = loader.load;
module.exports.loadAll             = loader.loadAll;
module.exports.safeLoad            = loader.safeLoad;
module.exports.safeLoadAll         = loader.safeLoadAll;
module.exports.dump                = dumper.dump;
module.exports.safeDump            = dumper.safeDump;
module.exports.YAMLException       = _dereq_('./js-yaml/exception');

// Deprecated schema names from JS-YAML 2.0.x
module.exports.MINIMAL_SCHEMA = _dereq_('./js-yaml/schema/failsafe');
module.exports.SAFE_SCHEMA    = _dereq_('./js-yaml/schema/default_safe');
module.exports.DEFAULT_SCHEMA = _dereq_('./js-yaml/schema/default_full');

// Deprecated functions from JS-YAML 1.x.x
module.exports.scan           = deprecated('scan');
module.exports.parse          = deprecated('parse');
module.exports.compose        = deprecated('compose');
module.exports.addConstructor = deprecated('addConstructor');

},{"./js-yaml/dumper":39,"./js-yaml/exception":40,"./js-yaml/loader":41,"./js-yaml/schema":43,"./js-yaml/schema/core":44,"./js-yaml/schema/default_full":45,"./js-yaml/schema/default_safe":46,"./js-yaml/schema/failsafe":47,"./js-yaml/schema/json":48,"./js-yaml/type":49}],38:[function(_dereq_,module,exports){
'use strict';


function isNothing(subject) {
return (typeof subject === 'undefined') || (subject === null);
}


function isObject(subject) {
return (typeof subject === 'object') && (subject !== null);
}


function toArray(sequence) {
if (Array.isArray(sequence)) return sequence;
else if (isNothing(sequence)) return [];

return [ sequence ];
}


function extend(target, source) {
var index, length, key, sourceKeys;

if (source) {
  sourceKeys = Object.keys(source);

  for (index = 0, length = sourceKeys.length; index < length; index += 1) {
    key = sourceKeys[index];
    target[key] = source[key];
  }
}

return target;
}


function repeat(string, count) {
var result = '', cycle;

for (cycle = 0; cycle < count; cycle += 1) {
  result += string;
}

return result;
}


function isNegativeZero(number) {
return (number === 0) && (Number.NEGATIVE_INFINITY === 1 / number);
}


module.exports.isNothing      = isNothing;
module.exports.isObject       = isObject;
module.exports.toArray        = toArray;
module.exports.repeat         = repeat;
module.exports.isNegativeZero = isNegativeZero;
module.exports.extend         = extend;

},{}],39:[function(_dereq_,module,exports){
'use strict';

/*eslint-disable no-use-before-define*/

var common              = _dereq_('./common');
var YAMLException       = _dereq_('./exception');
var DEFAULT_FULL_SCHEMA = _dereq_('./schema/default_full');
var DEFAULT_SAFE_SCHEMA = _dereq_('./schema/default_safe');

var _toString       = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;

var CHAR_TAB                  = 0x09; /* Tab */
var CHAR_LINE_FEED            = 0x0A; /* LF */
var CHAR_SPACE                = 0x20; /* Space */
var CHAR_EXCLAMATION          = 0x21; /* ! */
var CHAR_DOUBLE_QUOTE         = 0x22; /* " */
var CHAR_SHARP                = 0x23; /* # */
var CHAR_PERCENT              = 0x25; /* % */
var CHAR_AMPERSAND            = 0x26; /* & */
var CHAR_SINGLE_QUOTE         = 0x27; /* ' */
var CHAR_ASTERISK             = 0x2A; /* * */
var CHAR_COMMA                = 0x2C; /* , */
var CHAR_MINUS                = 0x2D; /* - */
var CHAR_COLON                = 0x3A; /* : */
var CHAR_GREATER_THAN         = 0x3E; /* > */
var CHAR_QUESTION             = 0x3F; /* ? */
var CHAR_COMMERCIAL_AT        = 0x40; /* @ */
var CHAR_LEFT_SQUARE_BRACKET  = 0x5B; /* [ */
var CHAR_RIGHT_SQUARE_BRACKET = 0x5D; /* ] */
var CHAR_GRAVE_ACCENT         = 0x60; /* ` */
var CHAR_LEFT_CURLY_BRACKET   = 0x7B; /* { */
var CHAR_VERTICAL_LINE        = 0x7C; /* | */
var CHAR_RIGHT_CURLY_BRACKET  = 0x7D; /* } */

var ESCAPE_SEQUENCES = {};

ESCAPE_SEQUENCES[0x00]   = '\\0';
ESCAPE_SEQUENCES[0x07]   = '\\a';
ESCAPE_SEQUENCES[0x08]   = '\\b';
ESCAPE_SEQUENCES[0x09]   = '\\t';
ESCAPE_SEQUENCES[0x0A]   = '\\n';
ESCAPE_SEQUENCES[0x0B]   = '\\v';
ESCAPE_SEQUENCES[0x0C]   = '\\f';
ESCAPE_SEQUENCES[0x0D]   = '\\r';
ESCAPE_SEQUENCES[0x1B]   = '\\e';
ESCAPE_SEQUENCES[0x22]   = '\\"';
ESCAPE_SEQUENCES[0x5C]   = '\\\\';
ESCAPE_SEQUENCES[0x85]   = '\\N';
ESCAPE_SEQUENCES[0xA0]   = '\\_';
ESCAPE_SEQUENCES[0x2028] = '\\L';
ESCAPE_SEQUENCES[0x2029] = '\\P';

var DEPRECATED_BOOLEANS_SYNTAX = [
'y', 'Y', 'yes', 'Yes', 'YES', 'on', 'On', 'ON',
'n', 'N', 'no', 'No', 'NO', 'off', 'Off', 'OFF'
];

function compileStyleMap(schema, map) {
var result, keys, index, length, tag, style, type;

if (map === null) return {};

result = {};
keys = Object.keys(map);

for (index = 0, length = keys.length; index < length; index += 1) {
  tag = keys[index];
  style = String(map[tag]);

  if (tag.slice(0, 2) === '!!') {
    tag = 'tag:yaml.org,2002:' + tag.slice(2);
  }
  type = schema.compiledTypeMap['fallback'][tag];

  if (type && _hasOwnProperty.call(type.styleAliases, style)) {
    style = type.styleAliases[style];
  }

  result[tag] = style;
}

return result;
}

function encodeHex(character) {
var string, handle, length;

string = character.toString(16).toUpperCase();

if (character <= 0xFF) {
  handle = 'x';
  length = 2;
} else if (character <= 0xFFFF) {
  handle = 'u';
  length = 4;
} else if (character <= 0xFFFFFFFF) {
  handle = 'U';
  length = 8;
} else {
  throw new YAMLException('code point within a string may not be greater than 0xFFFFFFFF');
}

return '\\' + handle + common.repeat('0', length - string.length) + string;
}

function State(options) {
this.schema       = options['schema'] || DEFAULT_FULL_SCHEMA;
this.indent       = Math.max(1, (options['indent'] || 2));
this.skipInvalid  = options['skipInvalid'] || false;
this.flowLevel    = (common.isNothing(options['flowLevel']) ? -1 : options['flowLevel']);
this.styleMap     = compileStyleMap(this.schema, options['styles'] || null);
this.sortKeys     = options['sortKeys'] || false;
this.lineWidth    = options['lineWidth'] || 80;
this.noRefs       = options['noRefs'] || false;
this.noCompatMode = options['noCompatMode'] || false;
this.condenseFlow = options['condenseFlow'] || false;

this.implicitTypes = this.schema.compiledImplicit;
this.explicitTypes = this.schema.compiledExplicit;

this.tag = null;
this.result = '';

this.duplicates = [];
this.usedDuplicates = null;
}

// Indents every line in a string. Empty lines (\n only) are not indented.
function indentString(string, spaces) {
var ind = common.repeat(' ', spaces),
    position = 0,
    next = -1,
    result = '',
    line,
    length = string.length;

while (position < length) {
  next = string.indexOf('\n', position);
  if (next === -1) {
    line = string.slice(position);
    position = length;
  } else {
    line = string.slice(position, next + 1);
    position = next + 1;
  }

  if (line.length && line !== '\n') result += ind;

  result += line;
}

return result;
}

function generateNextLine(state, level) {
return '\n' + common.repeat(' ', state.indent * level);
}

function testImplicitResolving(state, str) {
var index, length, type;

for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
  type = state.implicitTypes[index];

  if (type.resolve(str)) {
    return true;
  }
}

return false;
}

// [33] s-white ::= s-space | s-tab
function isWhitespace(c) {
return c === CHAR_SPACE || c === CHAR_TAB;
}

// Returns true if the character can be printed without escaping.
// From YAML 1.2: "any allowed characters known to be non-printable
// should also be escaped. [However,] This isn’t mandatory"
// Derived from nb-char - \t - #x85 - #xA0 - #x2028 - #x2029.
function isPrintable(c) {
return  (0x00020 <= c && c <= 0x00007E)
    || ((0x000A1 <= c && c <= 0x00D7FF) && c !== 0x2028 && c !== 0x2029)
    || ((0x0E000 <= c && c <= 0x00FFFD) && c !== 0xFEFF /* BOM */)
    ||  (0x10000 <= c && c <= 0x10FFFF);
}

// Simplified test for values allowed after the first character in plain style.
function isPlainSafe(c) {
// Uses a subset of nb-char - c-flow-indicator - ":" - "#"
// where nb-char ::= c-printable - b-char - c-byte-order-mark.
return isPrintable(c) && c !== 0xFEFF
  // - c-flow-indicator
  && c !== CHAR_COMMA
  && c !== CHAR_LEFT_SQUARE_BRACKET
  && c !== CHAR_RIGHT_SQUARE_BRACKET
  && c !== CHAR_LEFT_CURLY_BRACKET
  && c !== CHAR_RIGHT_CURLY_BRACKET
  // - ":" - "#"
  && c !== CHAR_COLON
  && c !== CHAR_SHARP;
}

// Simplified test for values allowed as the first character in plain style.
function isPlainSafeFirst(c) {
// Uses a subset of ns-char - c-indicator
// where ns-char = nb-char - s-white.
return isPrintable(c) && c !== 0xFEFF
  && !isWhitespace(c) // - s-white
  // - (c-indicator ::=
  // “-” | “?” | “:” | “,” | “[” | “]” | “{” | “}”
  && c !== CHAR_MINUS
  && c !== CHAR_QUESTION
  && c !== CHAR_COLON
  && c !== CHAR_COMMA
  && c !== CHAR_LEFT_SQUARE_BRACKET
  && c !== CHAR_RIGHT_SQUARE_BRACKET
  && c !== CHAR_LEFT_CURLY_BRACKET
  && c !== CHAR_RIGHT_CURLY_BRACKET
  // | “#” | “&” | “*” | “!” | “|” | “>” | “'” | “"”
  && c !== CHAR_SHARP
  && c !== CHAR_AMPERSAND
  && c !== CHAR_ASTERISK
  && c !== CHAR_EXCLAMATION
  && c !== CHAR_VERTICAL_LINE
  && c !== CHAR_GREATER_THAN
  && c !== CHAR_SINGLE_QUOTE
  && c !== CHAR_DOUBLE_QUOTE
  // | “%” | “@” | “`”)
  && c !== CHAR_PERCENT
  && c !== CHAR_COMMERCIAL_AT
  && c !== CHAR_GRAVE_ACCENT;
}

var STYLE_PLAIN   = 1,
  STYLE_SINGLE  = 2,
  STYLE_LITERAL = 3,
  STYLE_FOLDED  = 4,
  STYLE_DOUBLE  = 5;

// Determines which scalar styles are possible and returns the preferred style.
// lineWidth = -1 => no limit.
// Pre-conditions: str.length > 0.
// Post-conditions:
//    STYLE_PLAIN or STYLE_SINGLE => no \n are in the string.
//    STYLE_LITERAL => no lines are suitable for folding (or lineWidth is -1).
//    STYLE_FOLDED => a line > lineWidth and can be folded (and lineWidth != -1).
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType) {
var i;
var char;
var hasLineBreak = false;
var hasFoldableLine = false; // only checked if shouldTrackWidth
var shouldTrackWidth = lineWidth !== -1;
var previousLineBreak = -1; // count the first line correctly
var plain = isPlainSafeFirst(string.charCodeAt(0))
        && !isWhitespace(string.charCodeAt(string.length - 1));

if (singleLineOnly) {
  // Case: no block styles.
  // Check for disallowed characters to rule out plain and single.
  for (i = 0; i < string.length; i++) {
    char = string.charCodeAt(i);
    if (!isPrintable(char)) {
      return STYLE_DOUBLE;
    }
    plain = plain && isPlainSafe(char);
  }
} else {
  // Case: block styles permitted.
  for (i = 0; i < string.length; i++) {
    char = string.charCodeAt(i);
    if (char === CHAR_LINE_FEED) {
      hasLineBreak = true;
      // Check if any line can be folded.
      if (shouldTrackWidth) {
        hasFoldableLine = hasFoldableLine ||
          // Foldable line = too long, and not more-indented.
          (i - previousLineBreak - 1 > lineWidth &&
           string[previousLineBreak + 1] !== ' ');
        previousLineBreak = i;
      }
    } else if (!isPrintable(char)) {
      return STYLE_DOUBLE;
    }
    plain = plain && isPlainSafe(char);
  }
  // in case the end is missing a \n
  hasFoldableLine = hasFoldableLine || (shouldTrackWidth &&
    (i - previousLineBreak - 1 > lineWidth &&
     string[previousLineBreak + 1] !== ' '));
}
// Although every style can represent \n without escaping, prefer block styles
// for multiline, since they're more readable and they don't add empty lines.
// Also prefer folding a super-long line.
if (!hasLineBreak && !hasFoldableLine) {
  // Strings interpretable as another type have to be quoted;
  // e.g. the string 'true' vs. the boolean true.
  return plain && !testAmbiguousType(string)
    ? STYLE_PLAIN : STYLE_SINGLE;
}
// Edge case: block indentation indicator can only have one digit.
if (string[0] === ' ' && indentPerLevel > 9) {
  return STYLE_DOUBLE;
}
// At this point we know block styles are valid.
// Prefer literal style unless we want to fold.
return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
}

// Note: line breaking/folding is implemented for only the folded style.
// NB. We drop the last trailing newline (if any) of a returned block scalar
//  since the dumper adds its own newline. This always works:
//    • No ending newline => unaffected; already using strip "-" chomping.
//    • Ending newline    => removed then restored.
//  Importantly, this keeps the "+" chomp indicator from gaining an extra line.
function writeScalar(state, string, level, iskey) {
state.dump = (function () {
  if (string.length === 0) {
    return "''";
  }
  if (!state.noCompatMode &&
      DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1) {
    return "'" + string + "'";
  }

  var indent = state.indent * Math.max(1, level); // no 0-indent scalars
  // As indentation gets deeper, let the width decrease monotonically
  // to the lower bound min(state.lineWidth, 40).
  // Note that this implies
  //  state.lineWidth ≤ 40 + state.indent: width is fixed at the lower bound.
  //  state.lineWidth > 40 + state.indent: width decreases until the lower bound.
  // This behaves better than a constant minimum width which disallows narrower options,
  // or an indent threshold which causes the width to suddenly increase.
  var lineWidth = state.lineWidth === -1
    ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);

  // Without knowing if keys are implicit/explicit, assume implicit for safety.
  var singleLineOnly = iskey
    // No block styles in flow mode.
    || (state.flowLevel > -1 && level >= state.flowLevel);
  function testAmbiguity(string) {
    return testImplicitResolving(state, string);
  }

  switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity)) {
    case STYLE_PLAIN:
      return string;
    case STYLE_SINGLE:
      return "'" + string.replace(/'/g, "''") + "'";
    case STYLE_LITERAL:
      return '|' + blockHeader(string, state.indent)
        + dropEndingNewline(indentString(string, indent));
    case STYLE_FOLDED:
      return '>' + blockHeader(string, state.indent)
        + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
    case STYLE_DOUBLE:
      return '"' + escapeString(string, lineWidth) + '"';
    default:
      throw new YAMLException('impossible error: invalid scalar style');
  }
}());
}

// Pre-conditions: string is valid for a block scalar, 1 <= indentPerLevel <= 9.
function blockHeader(string, indentPerLevel) {
var indentIndicator = (string[0] === ' ') ? String(indentPerLevel) : '';

// note the special case: the string '\n' counts as a "trailing" empty line.
var clip =          string[string.length - 1] === '\n';
var keep = clip && (string[string.length - 2] === '\n' || string === '\n');
var chomp = keep ? '+' : (clip ? '' : '-');

return indentIndicator + chomp + '\n';
}

// (See the note for writeScalar.)
function dropEndingNewline(string) {
return string[string.length - 1] === '\n' ? string.slice(0, -1) : string;
}

// Note: a long line without a suitable break point will exceed the width limit.
// Pre-conditions: every char in str isPrintable, str.length > 0, width > 0.
function foldString(string, width) {
// In folded style, $k$ consecutive newlines output as $k+1$ newlines—
// unless they're before or after a more-indented line, or at the very
// beginning or end, in which case $k$ maps to $k$.
// Therefore, parse each chunk as newline(s) followed by a content line.
var lineRe = /(\n+)([^\n]*)/g;

// first line (possibly an empty line)
var result = (function () {
  var nextLF = string.indexOf('\n');
  nextLF = nextLF !== -1 ? nextLF : string.length;
  lineRe.lastIndex = nextLF;
  return foldLine(string.slice(0, nextLF), width);
}());
// If we haven't reached the first content line yet, don't add an extra \n.
var prevMoreIndented = string[0] === '\n' || string[0] === ' ';
var moreIndented;

// rest of the lines
var match;
while ((match = lineRe.exec(string))) {
  var prefix = match[1], line = match[2];
  moreIndented = (line[0] === ' ');
  result += prefix
    + (!prevMoreIndented && !moreIndented && line !== ''
      ? '\n' : '')
    + foldLine(line, width);
  prevMoreIndented = moreIndented;
}

return result;
}

// Greedy line breaking.
// Picks the longest line under the limit each time,
// otherwise settles for the shortest line over the limit.
// NB. More-indented lines *cannot* be folded, as that would add an extra \n.
function foldLine(line, width) {
if (line === '' || line[0] === ' ') return line;

// Since a more-indented line adds a \n, breaks can't be followed by a space.
var breakRe = / [^ ]/g; // note: the match index will always be <= length-2.
var match;
// start is an inclusive index. end, curr, and next are exclusive.
var start = 0, end, curr = 0, next = 0;
var result = '';

// Invariants: 0 <= start <= length-1.
//   0 <= curr <= next <= max(0, length-2). curr - start <= width.
// Inside the loop:
//   A match implies length >= 2, so curr and next are <= length-2.
while ((match = breakRe.exec(line))) {
  next = match.index;
  // maintain invariant: curr - start <= width
  if (next - start > width) {
    end = (curr > start) ? curr : next; // derive end <= length-2
    result += '\n' + line.slice(start, end);
    // skip the space that was output as \n
    start = end + 1;                    // derive start <= length-1
  }
  curr = next;
}

// By the invariants, start <= length-1, so there is something left over.
// It is either the whole string or a part starting from non-whitespace.
result += '\n';
// Insert a break if the remainder is too long and there is a break available.
if (line.length - start > width && curr > start) {
  result += line.slice(start, curr) + '\n' + line.slice(curr + 1);
} else {
  result += line.slice(start);
}

return result.slice(1); // drop extra \n joiner
}

// Escapes a double-quoted string.
function escapeString(string) {
var result = '';
var char, nextChar;
var escapeSeq;

for (var i = 0; i < string.length; i++) {
  char = string.charCodeAt(i);
  // Check for surrogate pairs (reference Unicode 3.0 section "3.7 Surrogates").
  if (char >= 0xD800 && char <= 0xDBFF/* high surrogate */) {
    nextChar = string.charCodeAt(i + 1);
    if (nextChar >= 0xDC00 && nextChar <= 0xDFFF/* low surrogate */) {
      // Combine the surrogate pair and store it escaped.
      result += encodeHex((char - 0xD800) * 0x400 + nextChar - 0xDC00 + 0x10000);
      // Advance index one extra since we already used that char here.
      i++; continue;
    }
  }
  escapeSeq = ESCAPE_SEQUENCES[char];
  result += !escapeSeq && isPrintable(char)
    ? string[i]
    : escapeSeq || encodeHex(char);
}

return result;
}

function writeFlowSequence(state, level, object) {
var _result = '',
    _tag    = state.tag,
    index,
    length;

for (index = 0, length = object.length; index < length; index += 1) {
  // Write only valid elements.
  if (writeNode(state, level, object[index], false, false)) {
    if (index !== 0) _result += ',' + (!state.condenseFlow ? ' ' : '');
    _result += state.dump;
  }
}

state.tag = _tag;
state.dump = '[' + _result + ']';
}

function writeBlockSequence(state, level, object, compact) {
var _result = '',
    _tag    = state.tag,
    index,
    length;

for (index = 0, length = object.length; index < length; index += 1) {
  // Write only valid elements.
  if (writeNode(state, level + 1, object[index], true, true)) {
    if (!compact || index !== 0) {
      _result += generateNextLine(state, level);
    }

    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      _result += '-';
    } else {
      _result += '- ';
    }

    _result += state.dump;
  }
}

state.tag = _tag;
state.dump = _result || '[]'; // Empty sequence if no valid values.
}

function writeFlowMapping(state, level, object) {
var _result       = '',
    _tag          = state.tag,
    objectKeyList = Object.keys(object),
    index,
    length,
    objectKey,
    objectValue,
    pairBuffer;

for (index = 0, length = objectKeyList.length; index < length; index += 1) {
  pairBuffer = state.condenseFlow ? '"' : '';

  if (index !== 0) pairBuffer += ', ';

  objectKey = objectKeyList[index];
  objectValue = object[objectKey];

  if (!writeNode(state, level, objectKey, false, false)) {
    continue; // Skip this pair because of invalid key;
  }

  if (state.dump.length > 1024) pairBuffer += '? ';

  pairBuffer += state.dump + (state.condenseFlow ? '"' : '') + ':' + (state.condenseFlow ? '' : ' ');

  if (!writeNode(state, level, objectValue, false, false)) {
    continue; // Skip this pair because of invalid value.
  }

  pairBuffer += state.dump;

  // Both key and value are valid.
  _result += pairBuffer;
}

state.tag = _tag;
state.dump = '{' + _result + '}';
}

function writeBlockMapping(state, level, object, compact) {
var _result       = '',
    _tag          = state.tag,
    objectKeyList = Object.keys(object),
    index,
    length,
    objectKey,
    objectValue,
    explicitPair,
    pairBuffer;

// Allow sorting keys so that the output file is deterministic
if (state.sortKeys === true) {
  // Default sorting
  objectKeyList.sort();
} else if (typeof state.sortKeys === 'function') {
  // Custom sort function
  objectKeyList.sort(state.sortKeys);
} else if (state.sortKeys) {
  // Something is wrong
  throw new YAMLException('sortKeys must be a boolean or a function');
}

for (index = 0, length = objectKeyList.length; index < length; index += 1) {
  pairBuffer = '';

  if (!compact || index !== 0) {
    pairBuffer += generateNextLine(state, level);
  }

  objectKey = objectKeyList[index];
  objectValue = object[objectKey];

  if (!writeNode(state, level + 1, objectKey, true, true, true)) {
    continue; // Skip this pair because of invalid key.
  }

  explicitPair = (state.tag !== null && state.tag !== '?') ||
                 (state.dump && state.dump.length > 1024);

  if (explicitPair) {
    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      pairBuffer += '?';
    } else {
      pairBuffer += '? ';
    }
  }

  pairBuffer += state.dump;

  if (explicitPair) {
    pairBuffer += generateNextLine(state, level);
  }

  if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
    continue; // Skip this pair because of invalid value.
  }

  if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
    pairBuffer += ':';
  } else {
    pairBuffer += ': ';
  }

  pairBuffer += state.dump;

  // Both key and value are valid.
  _result += pairBuffer;
}

state.tag = _tag;
state.dump = _result || '{}'; // Empty mapping if no valid pairs.
}

function detectType(state, object, explicit) {
var _result, typeList, index, length, type, style;

typeList = explicit ? state.explicitTypes : state.implicitTypes;

for (index = 0, length = typeList.length; index < length; index += 1) {
  type = typeList[index];

  if ((type.instanceOf  || type.predicate) &&
      (!type.instanceOf || ((typeof object === 'object') && (object instanceof type.instanceOf))) &&
      (!type.predicate  || type.predicate(object))) {

    state.tag = explicit ? type.tag : '?';

    if (type.represent) {
      style = state.styleMap[type.tag] || type.defaultStyle;

      if (_toString.call(type.represent) === '[object Function]') {
        _result = type.represent(object, style);
      } else if (_hasOwnProperty.call(type.represent, style)) {
        _result = type.represent[style](object, style);
      } else {
        throw new YAMLException('!<' + type.tag + '> tag resolver accepts not "' + style + '" style');
      }

      state.dump = _result;
    }

    return true;
  }
}

return false;
}

// Serializes `object` and writes it to global `result`.
// Returns true on success, or false on invalid object.
//
function writeNode(state, level, object, block, compact, iskey) {
state.tag = null;
state.dump = object;

if (!detectType(state, object, false)) {
  detectType(state, object, true);
}

var type = _toString.call(state.dump);

if (block) {
  block = (state.flowLevel < 0 || state.flowLevel > level);
}

var objectOrArray = type === '[object Object]' || type === '[object Array]',
    duplicateIndex,
    duplicate;

if (objectOrArray) {
  duplicateIndex = state.duplicates.indexOf(object);
  duplicate = duplicateIndex !== -1;
}

if ((state.tag !== null && state.tag !== '?') || duplicate || (state.indent !== 2 && level > 0)) {
  compact = false;
}

if (duplicate && state.usedDuplicates[duplicateIndex]) {
  state.dump = '*ref_' + duplicateIndex;
} else {
  if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
    state.usedDuplicates[duplicateIndex] = true;
  }
  if (type === '[object Object]') {
    if (block && (Object.keys(state.dump).length !== 0)) {
      writeBlockMapping(state, level, state.dump, compact);
      if (duplicate) {
        state.dump = '&ref_' + duplicateIndex + state.dump;
      }
    } else {
      writeFlowMapping(state, level, state.dump);
      if (duplicate) {
        state.dump = '&ref_' + duplicateIndex + ' ' + state.dump;
      }
    }
  } else if (type === '[object Array]') {
    if (block && (state.dump.length !== 0)) {
      writeBlockSequence(state, level, state.dump, compact);
      if (duplicate) {
        state.dump = '&ref_' + duplicateIndex + state.dump;
      }
    } else {
      writeFlowSequence(state, level, state.dump);
      if (duplicate) {
        state.dump = '&ref_' + duplicateIndex + ' ' + state.dump;
      }
    }
  } else if (type === '[object String]') {
    if (state.tag !== '?') {
      writeScalar(state, state.dump, level, iskey);
    }
  } else {
    if (state.skipInvalid) return false;
    throw new YAMLException('unacceptable kind of an object to dump ' + type);
  }

  if (state.tag !== null && state.tag !== '?') {
    state.dump = '!<' + state.tag + '> ' + state.dump;
  }
}

return true;
}

function getDuplicateReferences(object, state) {
var objects = [],
    duplicatesIndexes = [],
    index,
    length;

inspectNode(object, objects, duplicatesIndexes);

for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
  state.duplicates.push(objects[duplicatesIndexes[index]]);
}
state.usedDuplicates = new Array(length);
}

function inspectNode(object, objects, duplicatesIndexes) {
var objectKeyList,
    index,
    length;

if (object !== null && typeof object === 'object') {
  index = objects.indexOf(object);
  if (index !== -1) {
    if (duplicatesIndexes.indexOf(index) === -1) {
      duplicatesIndexes.push(index);
    }
  } else {
    objects.push(object);

    if (Array.isArray(object)) {
      for (index = 0, length = object.length; index < length; index += 1) {
        inspectNode(object[index], objects, duplicatesIndexes);
      }
    } else {
      objectKeyList = Object.keys(object);

      for (index = 0, length = objectKeyList.length; index < length; index += 1) {
        inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
      }
    }
  }
}
}

function dump(input, options) {
options = options || {};

var state = new State(options);

if (!state.noRefs) getDuplicateReferences(input, state);

if (writeNode(state, 0, input, true, true)) return state.dump + '\n';

return '';
}

function safeDump(input, options) {
return dump(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
}

module.exports.dump     = dump;
module.exports.safeDump = safeDump;

},{"./common":38,"./exception":40,"./schema/default_full":45,"./schema/default_safe":46}],40:[function(_dereq_,module,exports){
// YAML error class. http://stackoverflow.com/questions/8458984
//
'use strict';

function YAMLException(reason, mark) {
// Super constructor
Error.call(this);

this.name = 'YAMLException';
this.reason = reason;
this.mark = mark;
this.message = (this.reason || '(unknown reason)') + (this.mark ? ' ' + this.mark.toString() : '');

// Include stack trace in error object
if (Error.captureStackTrace) {
  // Chrome and NodeJS
  Error.captureStackTrace(this, this.constructor);
} else {
  // FF, IE 10+ and Safari 6+. Fallback for others
  this.stack = (new Error()).stack || '';
}
}


// Inherit from Error
YAMLException.prototype = Object.create(Error.prototype);
YAMLException.prototype.constructor = YAMLException;


YAMLException.prototype.toString = function toString(compact) {
var result = this.name + ': ';

result += this.reason || '(unknown reason)';

if (!compact && this.mark) {
  result += ' ' + this.mark.toString();
}

return result;
};


module.exports = YAMLException;

},{}],41:[function(_dereq_,module,exports){
'use strict';

/*eslint-disable max-len,no-use-before-define*/

var common              = _dereq_('./common');
var YAMLException       = _dereq_('./exception');
var Mark                = _dereq_('./mark');
var DEFAULT_SAFE_SCHEMA = _dereq_('./schema/default_safe');
var DEFAULT_FULL_SCHEMA = _dereq_('./schema/default_full');


var _hasOwnProperty = Object.prototype.hasOwnProperty;


var CONTEXT_FLOW_IN   = 1;
var CONTEXT_FLOW_OUT  = 2;
var CONTEXT_BLOCK_IN  = 3;
var CONTEXT_BLOCK_OUT = 4;


var CHOMPING_CLIP  = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP  = 3;


var PATTERN_NON_PRINTABLE         = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS       = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE            = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI               = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;


function is_EOL(c) {
return (c === 0x0A/* LF */) || (c === 0x0D/* CR */);
}

function is_WHITE_SPACE(c) {
return (c === 0x09/* Tab */) || (c === 0x20/* Space */);
}

function is_WS_OR_EOL(c) {
return (c === 0x09/* Tab */) ||
       (c === 0x20/* Space */) ||
       (c === 0x0A/* LF */) ||
       (c === 0x0D/* CR */);
}

function is_FLOW_INDICATOR(c) {
return c === 0x2C/* , */ ||
       c === 0x5B/* [ */ ||
       c === 0x5D/* ] */ ||
       c === 0x7B/* { */ ||
       c === 0x7D/* } */;
}

function fromHexCode(c) {
var lc;

if ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) {
  return c - 0x30;
}

/*eslint-disable no-bitwise*/
lc = c | 0x20;

if ((0x61/* a */ <= lc) && (lc <= 0x66/* f */)) {
  return lc - 0x61 + 10;
}

return -1;
}

function escapedHexLen(c) {
if (c === 0x78/* x */) { return 2; }
if (c === 0x75/* u */) { return 4; }
if (c === 0x55/* U */) { return 8; }
return 0;
}

function fromDecimalCode(c) {
if ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) {
  return c - 0x30;
}

return -1;
}

function simpleEscapeSequence(c) {
/* eslint-disable indent */
return (c === 0x30/* 0 */) ? '\x00' :
      (c === 0x61/* a */) ? '\x07' :
      (c === 0x62/* b */) ? '\x08' :
      (c === 0x74/* t */) ? '\x09' :
      (c === 0x09/* Tab */) ? '\x09' :
      (c === 0x6E/* n */) ? '\x0A' :
      (c === 0x76/* v */) ? '\x0B' :
      (c === 0x66/* f */) ? '\x0C' :
      (c === 0x72/* r */) ? '\x0D' :
      (c === 0x65/* e */) ? '\x1B' :
      (c === 0x20/* Space */) ? ' ' :
      (c === 0x22/* " */) ? '\x22' :
      (c === 0x2F/* / */) ? '/' :
      (c === 0x5C/* \ */) ? '\x5C' :
      (c === 0x4E/* N */) ? '\x85' :
      (c === 0x5F/* _ */) ? '\xA0' :
      (c === 0x4C/* L */) ? '\u2028' :
      (c === 0x50/* P */) ? '\u2029' : '';
}

function charFromCodepoint(c) {
if (c <= 0xFFFF) {
  return String.fromCharCode(c);
}
// Encode UTF-16 surrogate pair
// https://en.wikipedia.org/wiki/UTF-16#Code_points_U.2B010000_to_U.2B10FFFF
return String.fromCharCode(
  ((c - 0x010000) >> 10) + 0xD800,
  ((c - 0x010000) & 0x03FF) + 0xDC00
);
}

var simpleEscapeCheck = new Array(256); // integer, for fast access
var simpleEscapeMap = new Array(256);
for (var i = 0; i < 256; i++) {
simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
simpleEscapeMap[i] = simpleEscapeSequence(i);
}


function State(input, options) {
this.input = input;

this.filename  = options['filename']  || null;
this.schema    = options['schema']    || DEFAULT_FULL_SCHEMA;
this.onWarning = options['onWarning'] || null;
this.legacy    = options['legacy']    || false;
this.json      = options['json']      || false;
this.listener  = options['listener']  || null;

this.implicitTypes = this.schema.compiledImplicit;
this.typeMap       = this.schema.compiledTypeMap;

this.length     = input.length;
this.position   = 0;
this.line       = 0;
this.lineStart  = 0;
this.lineIndent = 0;

this.documents = [];

/*
this.version;
this.checkLineBreaks;
this.tagMap;
this.anchorMap;
this.tag;
this.anchor;
this.kind;
this.result;*/

}


function generateError(state, message) {
return new YAMLException(
  message,
  new Mark(state.filename, state.input, state.position, state.line, (state.position - state.lineStart)));
}

function throwError(state, message) {
throw generateError(state, message);
}

function throwWarning(state, message) {
if (state.onWarning) {
  state.onWarning.call(null, generateError(state, message));
}
}


var directiveHandlers = {

YAML: function handleYamlDirective(state, name, args) {

  var match, major, minor;

  if (state.version !== null) {
    throwError(state, 'duplication of %YAML directive');
  }

  if (args.length !== 1) {
    throwError(state, 'YAML directive accepts exactly one argument');
  }

  match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);

  if (match === null) {
    throwError(state, 'ill-formed argument of the YAML directive');
  }

  major = parseInt(match[1], 10);
  minor = parseInt(match[2], 10);

  if (major !== 1) {
    throwError(state, 'unacceptable YAML version of the document');
  }

  state.version = args[0];
  state.checkLineBreaks = (minor < 2);

  if (minor !== 1 && minor !== 2) {
    throwWarning(state, 'unsupported YAML version of the document');
  }
},

TAG: function handleTagDirective(state, name, args) {

  var handle, prefix;

  if (args.length !== 2) {
    throwError(state, 'TAG directive accepts exactly two arguments');
  }

  handle = args[0];
  prefix = args[1];

  if (!PATTERN_TAG_HANDLE.test(handle)) {
    throwError(state, 'ill-formed tag handle (first argument) of the TAG directive');
  }

  if (_hasOwnProperty.call(state.tagMap, handle)) {
    throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
  }

  if (!PATTERN_TAG_URI.test(prefix)) {
    throwError(state, 'ill-formed tag prefix (second argument) of the TAG directive');
  }

  state.tagMap[handle] = prefix;
}
};


function captureSegment(state, start, end, checkJson) {
var _position, _length, _character, _result;

if (start < end) {
  _result = state.input.slice(start, end);

  if (checkJson) {
    for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
      _character = _result.charCodeAt(_position);
      if (!(_character === 0x09 ||
            (0x20 <= _character && _character <= 0x10FFFF))) {
        throwError(state, 'expected valid JSON character');
      }
    }
  } else if (PATTERN_NON_PRINTABLE.test(_result)) {
    throwError(state, 'the stream contains non-printable characters');
  }

  state.result += _result;
}
}

function mergeMappings(state, destination, source, overridableKeys) {
var sourceKeys, key, index, quantity;

if (!common.isObject(source)) {
  throwError(state, 'cannot merge mappings; the provided source object is unacceptable');
}

sourceKeys = Object.keys(source);

for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
  key = sourceKeys[index];

  if (!_hasOwnProperty.call(destination, key)) {
    destination[key] = source[key];
    overridableKeys[key] = true;
  }
}
}

function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
var index, quantity;

keyNode = String(keyNode);

if (_result === null) {
  _result = {};
}

if (keyTag === 'tag:yaml.org,2002:merge') {
  if (Array.isArray(valueNode)) {
    for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
      mergeMappings(state, _result, valueNode[index], overridableKeys);
    }
  } else {
    mergeMappings(state, _result, valueNode, overridableKeys);
  }
} else {
  if (!state.json &&
      !_hasOwnProperty.call(overridableKeys, keyNode) &&
      _hasOwnProperty.call(_result, keyNode)) {
    state.line = startLine || state.line;
    state.position = startPos || state.position;
    throwError(state, 'duplicated mapping key');
  }
  _result[keyNode] = valueNode;
  delete overridableKeys[keyNode];
}

return _result;
}

function readLineBreak(state) {
var ch;

ch = state.input.charCodeAt(state.position);

if (ch === 0x0A/* LF */) {
  state.position++;
} else if (ch === 0x0D/* CR */) {
  state.position++;
  if (state.input.charCodeAt(state.position) === 0x0A/* LF */) {
    state.position++;
  }
} else {
  throwError(state, 'a line break is expected');
}

state.line += 1;
state.lineStart = state.position;
}

function skipSeparationSpace(state, allowComments, checkIndent) {
var lineBreaks = 0,
    ch = state.input.charCodeAt(state.position);

while (ch !== 0) {
  while (is_WHITE_SPACE(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }

  if (allowComments && ch === 0x23/* # */) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (ch !== 0x0A/* LF */ && ch !== 0x0D/* CR */ && ch !== 0);
  }

  if (is_EOL(ch)) {
    readLineBreak(state);

    ch = state.input.charCodeAt(state.position);
    lineBreaks++;
    state.lineIndent = 0;

    while (ch === 0x20/* Space */) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
  } else {
    break;
  }
}

if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
  throwWarning(state, 'deficient indentation');
}

return lineBreaks;
}

function testDocumentSeparator(state) {
var _position = state.position,
    ch;

ch = state.input.charCodeAt(_position);

// Condition state.position === state.lineStart is tested
// in parent on each call, for efficiency. No needs to test here again.
if ((ch === 0x2D/* - */ || ch === 0x2E/* . */) &&
    ch === state.input.charCodeAt(_position + 1) &&
    ch === state.input.charCodeAt(_position + 2)) {

  _position += 3;

  ch = state.input.charCodeAt(_position);

  if (ch === 0 || is_WS_OR_EOL(ch)) {
    return true;
  }
}

return false;
}

function writeFoldedLines(state, count) {
if (count === 1) {
  state.result += ' ';
} else if (count > 1) {
  state.result += common.repeat('\n', count - 1);
}
}


function readPlainScalar(state, nodeIndent, withinFlowCollection) {
var preceding,
    following,
    captureStart,
    captureEnd,
    hasPendingContent,
    _line,
    _lineStart,
    _lineIndent,
    _kind = state.kind,
    _result = state.result,
    ch;

ch = state.input.charCodeAt(state.position);

if (is_WS_OR_EOL(ch)      ||
    is_FLOW_INDICATOR(ch) ||
    ch === 0x23/* # */    ||
    ch === 0x26/* & */    ||
    ch === 0x2A/* * */    ||
    ch === 0x21/* ! */    ||
    ch === 0x7C/* | */    ||
    ch === 0x3E/* > */    ||
    ch === 0x27/* ' */    ||
    ch === 0x22/* " */    ||
    ch === 0x25/* % */    ||
    ch === 0x40/* @ */    ||
    ch === 0x60/* ` */) {
  return false;
}

if (ch === 0x3F/* ? */ || ch === 0x2D/* - */) {
  following = state.input.charCodeAt(state.position + 1);

  if (is_WS_OR_EOL(following) ||
      withinFlowCollection && is_FLOW_INDICATOR(following)) {
    return false;
  }
}

state.kind = 'scalar';
state.result = '';
captureStart = captureEnd = state.position;
hasPendingContent = false;

while (ch !== 0) {
  if (ch === 0x3A/* : */) {
    following = state.input.charCodeAt(state.position + 1);

    if (is_WS_OR_EOL(following) ||
        withinFlowCollection && is_FLOW_INDICATOR(following)) {
      break;
    }

  } else if (ch === 0x23/* # */) {
    preceding = state.input.charCodeAt(state.position - 1);

    if (is_WS_OR_EOL(preceding)) {
      break;
    }

  } else if ((state.position === state.lineStart && testDocumentSeparator(state)) ||
             withinFlowCollection && is_FLOW_INDICATOR(ch)) {
    break;

  } else if (is_EOL(ch)) {
    _line = state.line;
    _lineStart = state.lineStart;
    _lineIndent = state.lineIndent;
    skipSeparationSpace(state, false, -1);

    if (state.lineIndent >= nodeIndent) {
      hasPendingContent = true;
      ch = state.input.charCodeAt(state.position);
      continue;
    } else {
      state.position = captureEnd;
      state.line = _line;
      state.lineStart = _lineStart;
      state.lineIndent = _lineIndent;
      break;
    }
  }

  if (hasPendingContent) {
    captureSegment(state, captureStart, captureEnd, false);
    writeFoldedLines(state, state.line - _line);
    captureStart = captureEnd = state.position;
    hasPendingContent = false;
  }

  if (!is_WHITE_SPACE(ch)) {
    captureEnd = state.position + 1;
  }

  ch = state.input.charCodeAt(++state.position);
}

captureSegment(state, captureStart, captureEnd, false);

if (state.result) {
  return true;
}

state.kind = _kind;
state.result = _result;
return false;
}

function readSingleQuotedScalar(state, nodeIndent) {
var ch,
    captureStart, captureEnd;

ch = state.input.charCodeAt(state.position);

if (ch !== 0x27/* ' */) {
  return false;
}

state.kind = 'scalar';
state.result = '';
state.position++;
captureStart = captureEnd = state.position;

while ((ch = state.input.charCodeAt(state.position)) !== 0) {
  if (ch === 0x27/* ' */) {
    captureSegment(state, captureStart, state.position, true);
    ch = state.input.charCodeAt(++state.position);

    if (ch === 0x27/* ' */) {
      captureStart = state.position;
      state.position++;
      captureEnd = state.position;
    } else {
      return true;
    }

  } else if (is_EOL(ch)) {
    captureSegment(state, captureStart, captureEnd, true);
    writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
    captureStart = captureEnd = state.position;

  } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
    throwError(state, 'unexpected end of the document within a single quoted scalar');

  } else {
    state.position++;
    captureEnd = state.position;
  }
}

throwError(state, 'unexpected end of the stream within a single quoted scalar');
}

function readDoubleQuotedScalar(state, nodeIndent) {
var captureStart,
    captureEnd,
    hexLength,
    hexResult,
    tmp,
    ch;

ch = state.input.charCodeAt(state.position);

if (ch !== 0x22/* " */) {
  return false;
}

state.kind = 'scalar';
state.result = '';
state.position++;
captureStart = captureEnd = state.position;

while ((ch = state.input.charCodeAt(state.position)) !== 0) {
  if (ch === 0x22/* " */) {
    captureSegment(state, captureStart, state.position, true);
    state.position++;
    return true;

  } else if (ch === 0x5C/* \ */) {
    captureSegment(state, captureStart, state.position, true);
    ch = state.input.charCodeAt(++state.position);

    if (is_EOL(ch)) {
      skipSeparationSpace(state, false, nodeIndent);

      // TODO: rework to inline fn with no type cast?
    } else if (ch < 256 && simpleEscapeCheck[ch]) {
      state.result += simpleEscapeMap[ch];
      state.position++;

    } else if ((tmp = escapedHexLen(ch)) > 0) {
      hexLength = tmp;
      hexResult = 0;

      for (; hexLength > 0; hexLength--) {
        ch = state.input.charCodeAt(++state.position);

        if ((tmp = fromHexCode(ch)) >= 0) {
          hexResult = (hexResult << 4) + tmp;

        } else {
          throwError(state, 'expected hexadecimal character');
        }
      }

      state.result += charFromCodepoint(hexResult);

      state.position++;

    } else {
      throwError(state, 'unknown escape sequence');
    }

    captureStart = captureEnd = state.position;

  } else if (is_EOL(ch)) {
    captureSegment(state, captureStart, captureEnd, true);
    writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
    captureStart = captureEnd = state.position;

  } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
    throwError(state, 'unexpected end of the document within a double quoted scalar');

  } else {
    state.position++;
    captureEnd = state.position;
  }
}

throwError(state, 'unexpected end of the stream within a double quoted scalar');
}

function readFlowCollection(state, nodeIndent) {
var readNext = true,
    _line,
    _tag     = state.tag,
    _result,
    _anchor  = state.anchor,
    following,
    terminator,
    isPair,
    isExplicitPair,
    isMapping,
    overridableKeys = {},
    keyNode,
    keyTag,
    valueNode,
    ch;

ch = state.input.charCodeAt(state.position);

if (ch === 0x5B/* [ */) {
  terminator = 0x5D;/* ] */
  isMapping = false;
  _result = [];
} else if (ch === 0x7B/* { */) {
  terminator = 0x7D;/* } */
  isMapping = true;
  _result = {};
} else {
  return false;
}

if (state.anchor !== null) {
  state.anchorMap[state.anchor] = _result;
}

ch = state.input.charCodeAt(++state.position);

while (ch !== 0) {
  skipSeparationSpace(state, true, nodeIndent);

  ch = state.input.charCodeAt(state.position);

  if (ch === terminator) {
    state.position++;
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = isMapping ? 'mapping' : 'sequence';
    state.result = _result;
    return true;
  } else if (!readNext) {
    throwError(state, 'missed comma between flow collection entries');
  }

  keyTag = keyNode = valueNode = null;
  isPair = isExplicitPair = false;

  if (ch === 0x3F/* ? */) {
    following = state.input.charCodeAt(state.position + 1);

    if (is_WS_OR_EOL(following)) {
      isPair = isExplicitPair = true;
      state.position++;
      skipSeparationSpace(state, true, nodeIndent);
    }
  }

  _line = state.line;
  composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
  keyTag = state.tag;
  keyNode = state.result;
  skipSeparationSpace(state, true, nodeIndent);

  ch = state.input.charCodeAt(state.position);

  if ((isExplicitPair || state.line === _line) && ch === 0x3A/* : */) {
    isPair = true;
    ch = state.input.charCodeAt(++state.position);
    skipSeparationSpace(state, true, nodeIndent);
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    valueNode = state.result;
  }

  if (isMapping) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode);
  } else if (isPair) {
    _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode));
  } else {
    _result.push(keyNode);
  }

  skipSeparationSpace(state, true, nodeIndent);

  ch = state.input.charCodeAt(state.position);

  if (ch === 0x2C/* , */) {
    readNext = true;
    ch = state.input.charCodeAt(++state.position);
  } else {
    readNext = false;
  }
}

throwError(state, 'unexpected end of the stream within a flow collection');
}

function readBlockScalar(state, nodeIndent) {
var captureStart,
    folding,
    chomping       = CHOMPING_CLIP,
    didReadContent = false,
    detectedIndent = false,
    textIndent     = nodeIndent,
    emptyLines     = 0,
    atMoreIndented = false,
    tmp,
    ch;

ch = state.input.charCodeAt(state.position);

if (ch === 0x7C/* | */) {
  folding = false;
} else if (ch === 0x3E/* > */) {
  folding = true;
} else {
  return false;
}

state.kind = 'scalar';
state.result = '';

while (ch !== 0) {
  ch = state.input.charCodeAt(++state.position);

  if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
    if (CHOMPING_CLIP === chomping) {
      chomping = (ch === 0x2B/* + */) ? CHOMPING_KEEP : CHOMPING_STRIP;
    } else {
      throwError(state, 'repeat of a chomping mode identifier');
    }

  } else if ((tmp = fromDecimalCode(ch)) >= 0) {
    if (tmp === 0) {
      throwError(state, 'bad explicit indentation width of a block scalar; it cannot be less than one');
    } else if (!detectedIndent) {
      textIndent = nodeIndent + tmp - 1;
      detectedIndent = true;
    } else {
      throwError(state, 'repeat of an indentation width identifier');
    }

  } else {
    break;
  }
}

if (is_WHITE_SPACE(ch)) {
  do { ch = state.input.charCodeAt(++state.position); }
  while (is_WHITE_SPACE(ch));

  if (ch === 0x23/* # */) {
    do { ch = state.input.charCodeAt(++state.position); }
    while (!is_EOL(ch) && (ch !== 0));
  }
}

while (ch !== 0) {
  readLineBreak(state);
  state.lineIndent = 0;

  ch = state.input.charCodeAt(state.position);

  while ((!detectedIndent || state.lineIndent < textIndent) &&
         (ch === 0x20/* Space */)) {
    state.lineIndent++;
    ch = state.input.charCodeAt(++state.position);
  }

  if (!detectedIndent && state.lineIndent > textIndent) {
    textIndent = state.lineIndent;
  }

  if (is_EOL(ch)) {
    emptyLines++;
    continue;
  }

  // End of the scalar.
  if (state.lineIndent < textIndent) {

    // Perform the chomping.
    if (chomping === CHOMPING_KEEP) {
      state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);
    } else if (chomping === CHOMPING_CLIP) {
      if (didReadContent) { // i.e. only if the scalar is not empty.
        state.result += '\n';
      }
    }

    // Break this `while` cycle and go to the funciton's epilogue.
    break;
  }

  // Folded style: use fancy rules to handle line breaks.
  if (folding) {

    // Lines starting with white space characters (more-indented lines) are not folded.
    if (is_WHITE_SPACE(ch)) {
      atMoreIndented = true;
      // except for the first content line (cf. Example 8.1)
      state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);

    // End of more-indented block.
    } else if (atMoreIndented) {
      atMoreIndented = false;
      state.result += common.repeat('\n', emptyLines + 1);

    // Just one line break - perceive as the same line.
    } else if (emptyLines === 0) {
      if (didReadContent) { // i.e. only if we have already read some scalar content.
        state.result += ' ';
      }

    // Several line breaks - perceive as different lines.
    } else {
      state.result += common.repeat('\n', emptyLines);
    }

  // Literal style: just add exact number of line breaks between content lines.
  } else {
    // Keep all line breaks except the header line break.
    state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);
  }

  didReadContent = true;
  detectedIndent = true;
  emptyLines = 0;
  captureStart = state.position;

  while (!is_EOL(ch) && (ch !== 0)) {
    ch = state.input.charCodeAt(++state.position);
  }

  captureSegment(state, captureStart, state.position, false);
}

return true;
}

function readBlockSequence(state, nodeIndent) {
var _line,
    _tag      = state.tag,
    _anchor   = state.anchor,
    _result   = [],
    following,
    detected  = false,
    ch;

if (state.anchor !== null) {
  state.anchorMap[state.anchor] = _result;
}

ch = state.input.charCodeAt(state.position);

while (ch !== 0) {

  if (ch !== 0x2D/* - */) {
    break;
  }

  following = state.input.charCodeAt(state.position + 1);

  if (!is_WS_OR_EOL(following)) {
    break;
  }

  detected = true;
  state.position++;

  if (skipSeparationSpace(state, true, -1)) {
    if (state.lineIndent <= nodeIndent) {
      _result.push(null);
      ch = state.input.charCodeAt(state.position);
      continue;
    }
  }

  _line = state.line;
  composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
  _result.push(state.result);
  skipSeparationSpace(state, true, -1);

  ch = state.input.charCodeAt(state.position);

  if ((state.line === _line || state.lineIndent > nodeIndent) && (ch !== 0)) {
    throwError(state, 'bad indentation of a sequence entry');
  } else if (state.lineIndent < nodeIndent) {
    break;
  }
}

if (detected) {
  state.tag = _tag;
  state.anchor = _anchor;
  state.kind = 'sequence';
  state.result = _result;
  return true;
}
return false;
}

function readBlockMapping(state, nodeIndent, flowIndent) {
var following,
    allowCompact,
    _line,
    _pos,
    _tag          = state.tag,
    _anchor       = state.anchor,
    _result       = {},
    overridableKeys = {},
    keyTag        = null,
    keyNode       = null,
    valueNode     = null,
    atExplicitKey = false,
    detected      = false,
    ch;

if (state.anchor !== null) {
  state.anchorMap[state.anchor] = _result;
}

ch = state.input.charCodeAt(state.position);

while (ch !== 0) {
  following = state.input.charCodeAt(state.position + 1);
  _line = state.line; // Save the current line.
  _pos = state.position;

  //
  // Explicit notation case. There are two separate blocks:
  // first for the key (denoted by "?") and second for the value (denoted by ":")
  //
  if ((ch === 0x3F/* ? */ || ch === 0x3A/* : */) && is_WS_OR_EOL(following)) {

    if (ch === 0x3F/* ? */) {
      if (atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
        keyTag = keyNode = valueNode = null;
      }

      detected = true;
      atExplicitKey = true;
      allowCompact = true;

    } else if (atExplicitKey) {
      // i.e. 0x3A/* : */ === character after the explicit key.
      atExplicitKey = false;
      allowCompact = true;

    } else {
      throwError(state, 'incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line');
    }

    state.position += 1;
    ch = following;

  //
  // Implicit notation case. Flow-style node as the key first, then ":", and the value.
  //
  } else if (composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {

    if (state.line === _line) {
      ch = state.input.charCodeAt(state.position);

      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }

      if (ch === 0x3A/* : */) {
        ch = state.input.charCodeAt(++state.position);

        if (!is_WS_OR_EOL(ch)) {
          throwError(state, 'a whitespace character is expected after the key-value separator within a block mapping');
        }

        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
          keyTag = keyNode = valueNode = null;
        }

        detected = true;
        atExplicitKey = false;
        allowCompact = false;
        keyTag = state.tag;
        keyNode = state.result;

      } else if (detected) {
        throwError(state, 'can not read an implicit mapping pair; a colon is missed');

      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true; // Keep the result of `composeNode`.
      }

    } else if (detected) {
      throwError(state, 'can not read a block mapping entry; a multiline key may not be an implicit key');

    } else {
      state.tag = _tag;
      state.anchor = _anchor;
      return true; // Keep the result of `composeNode`.
    }

  } else {
    break; // Reading is done. Go to the epilogue.
  }

  //
  // Common reading code for both explicit and implicit notations.
  //
  if (state.line === _line || state.lineIndent > nodeIndent) {
    if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
      if (atExplicitKey) {
        keyNode = state.result;
      } else {
        valueNode = state.result;
      }
    }

    if (!atExplicitKey) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _pos);
      keyTag = keyNode = valueNode = null;
    }

    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
  }

  if (state.lineIndent > nodeIndent && (ch !== 0)) {
    throwError(state, 'bad indentation of a mapping entry');
  } else if (state.lineIndent < nodeIndent) {
    break;
  }
}

//
// Epilogue.
//

// Special case: last mapping's node contains only the key in explicit notation.
if (atExplicitKey) {
  storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
}

// Expose the resulting mapping.
if (detected) {
  state.tag = _tag;
  state.anchor = _anchor;
  state.kind = 'mapping';
  state.result = _result;
}

return detected;
}

function readTagProperty(state) {
var _position,
    isVerbatim = false,
    isNamed    = false,
    tagHandle,
    tagName,
    ch;

ch = state.input.charCodeAt(state.position);

if (ch !== 0x21/* ! */) return false;

if (state.tag !== null) {
  throwError(state, 'duplication of a tag property');
}

ch = state.input.charCodeAt(++state.position);

if (ch === 0x3C/* < */) {
  isVerbatim = true;
  ch = state.input.charCodeAt(++state.position);

} else if (ch === 0x21/* ! */) {
  isNamed = true;
  tagHandle = '!!';
  ch = state.input.charCodeAt(++state.position);

} else {
  tagHandle = '!';
}

_position = state.position;

if (isVerbatim) {
  do { ch = state.input.charCodeAt(++state.position); }
  while (ch !== 0 && ch !== 0x3E/* > */);

  if (state.position < state.length) {
    tagName = state.input.slice(_position, state.position);
    ch = state.input.charCodeAt(++state.position);
  } else {
    throwError(state, 'unexpected end of the stream within a verbatim tag');
  }
} else {
  while (ch !== 0 && !is_WS_OR_EOL(ch)) {

    if (ch === 0x21/* ! */) {
      if (!isNamed) {
        tagHandle = state.input.slice(_position - 1, state.position + 1);

        if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
          throwError(state, 'named tag handle cannot contain such characters');
        }

        isNamed = true;
        _position = state.position + 1;
      } else {
        throwError(state, 'tag suffix cannot contain exclamation marks');
      }
    }

    ch = state.input.charCodeAt(++state.position);
  }

  tagName = state.input.slice(_position, state.position);

  if (PATTERN_FLOW_INDICATORS.test(tagName)) {
    throwError(state, 'tag suffix cannot contain flow indicator characters');
  }
}

if (tagName && !PATTERN_TAG_URI.test(tagName)) {
  throwError(state, 'tag name cannot contain such characters: ' + tagName);
}

if (isVerbatim) {
  state.tag = tagName;

} else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
  state.tag = state.tagMap[tagHandle] + tagName;

} else if (tagHandle === '!') {
  state.tag = '!' + tagName;

} else if (tagHandle === '!!') {
  state.tag = 'tag:yaml.org,2002:' + tagName;

} else {
  throwError(state, 'undeclared tag handle "' + tagHandle + '"');
}

return true;
}

function readAnchorProperty(state) {
var _position,
    ch;

ch = state.input.charCodeAt(state.position);

if (ch !== 0x26/* & */) return false;

if (state.anchor !== null) {
  throwError(state, 'duplication of an anchor property');
}

ch = state.input.charCodeAt(++state.position);
_position = state.position;

while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
  ch = state.input.charCodeAt(++state.position);
}

if (state.position === _position) {
  throwError(state, 'name of an anchor node must contain at least one character');
}

state.anchor = state.input.slice(_position, state.position);
return true;
}

function readAlias(state) {
var _position, alias,
    ch;

ch = state.input.charCodeAt(state.position);

if (ch !== 0x2A/* * */) return false;

ch = state.input.charCodeAt(++state.position);
_position = state.position;

while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
  ch = state.input.charCodeAt(++state.position);
}

if (state.position === _position) {
  throwError(state, 'name of an alias node must contain at least one character');
}

alias = state.input.slice(_position, state.position);

if (!state.anchorMap.hasOwnProperty(alias)) {
  throwError(state, 'unidentified alias "' + alias + '"');
}

state.result = state.anchorMap[alias];
skipSeparationSpace(state, true, -1);
return true;
}

function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
var allowBlockStyles,
    allowBlockScalars,
    allowBlockCollections,
    indentStatus = 1, // 1: this>parent, 0: this=parent, -1: this<parent
    atNewLine  = false,
    hasContent = false,
    typeIndex,
    typeQuantity,
    type,
    flowIndent,
    blockIndent;

if (state.listener !== null) {
  state.listener('open', state);
}

state.tag    = null;
state.anchor = null;
state.kind   = null;
state.result = null;

allowBlockStyles = allowBlockScalars = allowBlockCollections =
  CONTEXT_BLOCK_OUT === nodeContext ||
  CONTEXT_BLOCK_IN  === nodeContext;

if (allowToSeek) {
  if (skipSeparationSpace(state, true, -1)) {
    atNewLine = true;

    if (state.lineIndent > parentIndent) {
      indentStatus = 1;
    } else if (state.lineIndent === parentIndent) {
      indentStatus = 0;
    } else if (state.lineIndent < parentIndent) {
      indentStatus = -1;
    }
  }
}

if (indentStatus === 1) {
  while (readTagProperty(state) || readAnchorProperty(state)) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;
      allowBlockCollections = allowBlockStyles;

      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    } else {
      allowBlockCollections = false;
    }
  }
}

if (allowBlockCollections) {
  allowBlockCollections = atNewLine || allowCompact;
}

if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
  if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
    flowIndent = parentIndent;
  } else {
    flowIndent = parentIndent + 1;
  }

  blockIndent = state.position - state.lineStart;

  if (indentStatus === 1) {
    if (allowBlockCollections &&
        (readBlockSequence(state, blockIndent) ||
         readBlockMapping(state, blockIndent, flowIndent)) ||
        readFlowCollection(state, flowIndent)) {
      hasContent = true;
    } else {
      if ((allowBlockScalars && readBlockScalar(state, flowIndent)) ||
          readSingleQuotedScalar(state, flowIndent) ||
          readDoubleQuotedScalar(state, flowIndent)) {
        hasContent = true;

      } else if (readAlias(state)) {
        hasContent = true;

        if (state.tag !== null || state.anchor !== null) {
          throwError(state, 'alias node should not have any properties');
        }

      } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
        hasContent = true;

        if (state.tag === null) {
          state.tag = '?';
        }
      }

      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    }
  } else if (indentStatus === 0) {
    // Special case: block sequences are allowed to have same indentation level as the parent.
    // http://www.yaml.org/spec/1.2/spec.html#id2799784
    hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
  }
}

if (state.tag !== null && state.tag !== '!') {
  if (state.tag === '?') {
    for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
      type = state.implicitTypes[typeIndex];

      // Implicit resolving is not allowed for non-scalar types, and '?'
      // non-specific tag is only assigned to plain scalars. So, it isn't
      // needed to check for 'kind' conformity.

      if (type.resolve(state.result)) { // `state.result` updated in resolver if matched
        state.result = type.construct(state.result);
        state.tag = type.tag;
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
        break;
      }
    }
  } else if (_hasOwnProperty.call(state.typeMap[state.kind || 'fallback'], state.tag)) {
    type = state.typeMap[state.kind || 'fallback'][state.tag];

    if (state.result !== null && type.kind !== state.kind) {
      throwError(state, 'unacceptable node kind for !<' + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
    }

    if (!type.resolve(state.result)) { // `state.result` updated in resolver if matched
      throwError(state, 'cannot resolve a node with !<' + state.tag + '> explicit tag');
    } else {
      state.result = type.construct(state.result);
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    }
  } else {
    throwError(state, 'unknown tag !<' + state.tag + '>');
  }
}

if (state.listener !== null) {
  state.listener('close', state);
}
return state.tag !== null ||  state.anchor !== null || hasContent;
}

function readDocument(state) {
var documentStart = state.position,
    _position,
    directiveName,
    directiveArgs,
    hasDirectives = false,
    ch;

state.version = null;
state.checkLineBreaks = state.legacy;
state.tagMap = {};
state.anchorMap = {};

while ((ch = state.input.charCodeAt(state.position)) !== 0) {
  skipSeparationSpace(state, true, -1);

  ch = state.input.charCodeAt(state.position);

  if (state.lineIndent > 0 || ch !== 0x25/* % */) {
    break;
  }

  hasDirectives = true;
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;

  while (ch !== 0 && !is_WS_OR_EOL(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }

  directiveName = state.input.slice(_position, state.position);
  directiveArgs = [];

  if (directiveName.length < 1) {
    throwError(state, 'directive name must not be less than one character in length');
  }

  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }

    if (ch === 0x23/* # */) {
      do { ch = state.input.charCodeAt(++state.position); }
      while (ch !== 0 && !is_EOL(ch));
      break;
    }

    if (is_EOL(ch)) break;

    _position = state.position;

    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }

    directiveArgs.push(state.input.slice(_position, state.position));
  }

  if (ch !== 0) readLineBreak(state);

  if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
    directiveHandlers[directiveName](state, directiveName, directiveArgs);
  } else {
    throwWarning(state, 'unknown document directive "' + directiveName + '"');
  }
}

skipSeparationSpace(state, true, -1);

if (state.lineIndent === 0 &&
    state.input.charCodeAt(state.position)     === 0x2D/* - */ &&
    state.input.charCodeAt(state.position + 1) === 0x2D/* - */ &&
    state.input.charCodeAt(state.position + 2) === 0x2D/* - */) {
  state.position += 3;
  skipSeparationSpace(state, true, -1);

} else if (hasDirectives) {
  throwError(state, 'directives end mark is expected');
}

composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
skipSeparationSpace(state, true, -1);

if (state.checkLineBreaks &&
    PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
  throwWarning(state, 'non-ASCII line breaks are interpreted as content');
}

state.documents.push(state.result);

if (state.position === state.lineStart && testDocumentSeparator(state)) {

  if (state.input.charCodeAt(state.position) === 0x2E/* . */) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);
  }
  return;
}

if (state.position < (state.length - 1)) {
  throwError(state, 'end of the stream or a document separator is expected');
} else {
  return;
}
}


function loadDocuments(input, options) {
input = String(input);
options = options || {};

if (input.length !== 0) {

  // Add tailing `\n` if not exists
  if (input.charCodeAt(input.length - 1) !== 0x0A/* LF */ &&
      input.charCodeAt(input.length - 1) !== 0x0D/* CR */) {
    input += '\n';
  }

  // Strip BOM
  if (input.charCodeAt(0) === 0xFEFF) {
    input = input.slice(1);
  }
}

var state = new State(input, options);

// Use 0 as string terminator. That significantly simplifies bounds check.
state.input += '\0';

while (state.input.charCodeAt(state.position) === 0x20/* Space */) {
  state.lineIndent += 1;
  state.position += 1;
}

while (state.position < (state.length - 1)) {
  readDocument(state);
}

return state.documents;
}


function loadAll(input, iterator, options) {
var documents = loadDocuments(input, options), index, length;

if (typeof iterator !== 'function') {
  return documents;
}

for (index = 0, length = documents.length; index < length; index += 1) {
  iterator(documents[index]);
}
}


function load(input, options) {
var documents = loadDocuments(input, options);

if (documents.length === 0) {
  /*eslint-disable no-undefined*/
  return undefined;
} else if (documents.length === 1) {
  return documents[0];
}
throw new YAMLException('expected a single document in the stream, but found more');
}


function safeLoadAll(input, output, options) {
if (typeof output === 'function') {
  loadAll(input, output, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
} else {
  return loadAll(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
}
}


function safeLoad(input, options) {
return load(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
}


module.exports.loadAll     = loadAll;
module.exports.load        = load;
module.exports.safeLoadAll = safeLoadAll;
module.exports.safeLoad    = safeLoad;

},{"./common":38,"./exception":40,"./mark":42,"./schema/default_full":45,"./schema/default_safe":46}],42:[function(_dereq_,module,exports){
'use strict';


var common = _dereq_('./common');


function Mark(name, buffer, position, line, column) {
this.name     = name;
this.buffer   = buffer;
this.position = position;
this.line     = line;
this.column   = column;
}


Mark.prototype.getSnippet = function getSnippet(indent, maxLength) {
var head, start, tail, end, snippet;

if (!this.buffer) return null;

indent = indent || 4;
maxLength = maxLength || 75;

head = '';
start = this.position;

while (start > 0 && '\x00\r\n\x85\u2028\u2029'.indexOf(this.buffer.charAt(start - 1)) === -1) {
  start -= 1;
  if (this.position - start > (maxLength / 2 - 1)) {
    head = ' ... ';
    start += 5;
    break;
  }
}

tail = '';
end = this.position;

while (end < this.buffer.length && '\x00\r\n\x85\u2028\u2029'.indexOf(this.buffer.charAt(end)) === -1) {
  end += 1;
  if (end - this.position > (maxLength / 2 - 1)) {
    tail = ' ... ';
    end -= 5;
    break;
  }
}

snippet = this.buffer.slice(start, end);

return common.repeat(' ', indent) + head + snippet + tail + '\n' +
       common.repeat(' ', indent + this.position - start + head.length) + '^';
};


Mark.prototype.toString = function toString(compact) {
var snippet, where = '';

if (this.name) {
  where += 'in "' + this.name + '" ';
}

where += 'at line ' + (this.line + 1) + ', column ' + (this.column + 1);

if (!compact) {
  snippet = this.getSnippet();

  if (snippet) {
    where += ':\n' + snippet;
  }
}

return where;
};


module.exports = Mark;

},{"./common":38}],43:[function(_dereq_,module,exports){
'use strict';

/*eslint-disable max-len*/

var common        = _dereq_('./common');
var YAMLException = _dereq_('./exception');
var Type          = _dereq_('./type');


function compileList(schema, name, result) {
var exclude = [];

schema.include.forEach(function (includedSchema) {
  result = compileList(includedSchema, name, result);
});

schema[name].forEach(function (currentType) {
  result.forEach(function (previousType, previousIndex) {
    if (previousType.tag === currentType.tag && previousType.kind === currentType.kind) {
      exclude.push(previousIndex);
    }
  });

  result.push(currentType);
});

return result.filter(function (type, index) {
  return exclude.indexOf(index) === -1;
});
}


function compileMap(/* lists... */) {
var result = {
      scalar: {},
      sequence: {},
      mapping: {},
      fallback: {}
    }, index, length;

function collectType(type) {
  result[type.kind][type.tag] = result['fallback'][type.tag] = type;
}

for (index = 0, length = arguments.length; index < length; index += 1) {
  arguments[index].forEach(collectType);
}
return result;
}


function Schema(definition) {
this.include  = definition.include  || [];
this.implicit = definition.implicit || [];
this.explicit = definition.explicit || [];

this.implicit.forEach(function (type) {
  if (type.loadKind && type.loadKind !== 'scalar') {
    throw new YAMLException('There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.');
  }
});

this.compiledImplicit = compileList(this, 'implicit', []);
this.compiledExplicit = compileList(this, 'explicit', []);
this.compiledTypeMap  = compileMap(this.compiledImplicit, this.compiledExplicit);
}


Schema.DEFAULT = null;


Schema.create = function createSchema() {
var schemas, types;

switch (arguments.length) {
  case 1:
    schemas = Schema.DEFAULT;
    types = arguments[0];
    break;

  case 2:
    schemas = arguments[0];
    types = arguments[1];
    break;

  default:
    throw new YAMLException('Wrong number of arguments for Schema.create function');
}

schemas = common.toArray(schemas);
types = common.toArray(types);

if (!schemas.every(function (schema) { return schema instanceof Schema; })) {
  throw new YAMLException('Specified list of super schemas (or a single Schema object) contains a non-Schema object.');
}

if (!types.every(function (type) { return type instanceof Type; })) {
  throw new YAMLException('Specified list of YAML types (or a single Type object) contains a non-Type object.');
}

return new Schema({
  include: schemas,
  explicit: types
});
};


module.exports = Schema;

},{"./common":38,"./exception":40,"./type":49}],44:[function(_dereq_,module,exports){
// Standard YAML's Core schema.
// http://www.yaml.org/spec/1.2/spec.html#id2804923
//
// NOTE: JS-YAML does not support schema-specific tag resolution restrictions.
// So, Core schema has no distinctions from JSON schema is JS-YAML.


'use strict';


var Schema = _dereq_('../schema');


module.exports = new Schema({
include: [
  _dereq_('./json')
]
});

},{"../schema":43,"./json":48}],45:[function(_dereq_,module,exports){
// JS-YAML's default schema for `load` function.
// It is not described in the YAML specification.
//
// This schema is based on JS-YAML's default safe schema and includes
// JavaScript-specific types: !!js/undefined, !!js/regexp and !!js/function.
//
// Also this schema is used as default base schema at `Schema.create` function.


'use strict';


var Schema = _dereq_('../schema');


module.exports = Schema.DEFAULT = new Schema({
include: [
  _dereq_('./default_safe')
],
explicit: [
  _dereq_('../type/js/undefined'),
  _dereq_('../type/js/regexp'),
  _dereq_('../type/js/function')
]
});

},{"../schema":43,"../type/js/function":54,"../type/js/regexp":55,"../type/js/undefined":56,"./default_safe":46}],46:[function(_dereq_,module,exports){
// JS-YAML's default schema for `safeLoad` function.
// It is not described in the YAML specification.
//
// This schema is based on standard YAML's Core schema and includes most of
// extra types described at YAML tag repository. (http://yaml.org/type/)


'use strict';


var Schema = _dereq_('../schema');


module.exports = new Schema({
include: [
  _dereq_('./core')
],
implicit: [
  _dereq_('../type/timestamp'),
  _dereq_('../type/merge')
],
explicit: [
  _dereq_('../type/binary'),
  _dereq_('../type/omap'),
  _dereq_('../type/pairs'),
  _dereq_('../type/set')
]
});

},{"../schema":43,"../type/binary":50,"../type/merge":58,"../type/omap":60,"../type/pairs":61,"../type/set":63,"../type/timestamp":65,"./core":44}],47:[function(_dereq_,module,exports){
// Standard YAML's Failsafe schema.
// http://www.yaml.org/spec/1.2/spec.html#id2802346


'use strict';


var Schema = _dereq_('../schema');


module.exports = new Schema({
explicit: [
  _dereq_('../type/str'),
  _dereq_('../type/seq'),
  _dereq_('../type/map')
]
});

},{"../schema":43,"../type/map":57,"../type/seq":62,"../type/str":64}],48:[function(_dereq_,module,exports){
// Standard YAML's JSON schema.
// http://www.yaml.org/spec/1.2/spec.html#id2803231
//
// NOTE: JS-YAML does not support schema-specific tag resolution restrictions.
// So, this schema is not such strict as defined in the YAML specification.
// It allows numbers in binary notaion, use `Null` and `NULL` as `null`, etc.


'use strict';


var Schema = _dereq_('../schema');


module.exports = new Schema({
include: [
  _dereq_('./failsafe')
],
implicit: [
  _dereq_('../type/null'),
  _dereq_('../type/bool'),
  _dereq_('../type/int'),
  _dereq_('../type/float')
]
});

},{"../schema":43,"../type/bool":51,"../type/float":52,"../type/int":53,"../type/null":59,"./failsafe":47}],49:[function(_dereq_,module,exports){
'use strict';

var YAMLException = _dereq_('./exception');

var TYPE_CONSTRUCTOR_OPTIONS = [
'kind',
'resolve',
'construct',
'instanceOf',
'predicate',
'represent',
'defaultStyle',
'styleAliases'
];

var YAML_NODE_KINDS = [
'scalar',
'sequence',
'mapping'
];

function compileStyleAliases(map) {
var result = {};

if (map !== null) {
  Object.keys(map).forEach(function (style) {
    map[style].forEach(function (alias) {
      result[String(alias)] = style;
    });
  });
}

return result;
}

function Type(tag, options) {
options = options || {};

Object.keys(options).forEach(function (name) {
  if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
    throw new YAMLException('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
  }
});

// TODO: Add tag format check.
this.tag          = tag;
this.kind         = options['kind']         || null;
this.resolve      = options['resolve']      || function () { return true; };
this.construct    = options['construct']    || function (data) { return data; };
this.instanceOf   = options['instanceOf']   || null;
this.predicate    = options['predicate']    || null;
this.represent    = options['represent']    || null;
this.defaultStyle = options['defaultStyle'] || null;
this.styleAliases = compileStyleAliases(options['styleAliases'] || null);

if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
  throw new YAMLException('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
}
}

module.exports = Type;

},{"./exception":40}],50:[function(_dereq_,module,exports){
'use strict';

/*eslint-disable no-bitwise*/

var NodeBuffer;

try {
// A trick for browserified version, to not include `Buffer` shim
var _require = _dereq_;
NodeBuffer = _require('buffer').Buffer;
} catch (__) {}

var Type       = _dereq_('../type');


// [ 64, 65, 66 ] -> [ padding, CR, LF ]
var BASE64_MAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r';


function resolveYamlBinary(data) {
if (data === null) return false;

var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;

// Convert one by one.
for (idx = 0; idx < max; idx++) {
  code = map.indexOf(data.charAt(idx));

  // Skip CR/LF
  if (code > 64) continue;

  // Fail on illegal characters
  if (code < 0) return false;

  bitlen += 6;
}

// If there are any bits left, source was corrupted
return (bitlen % 8) === 0;
}

function constructYamlBinary(data) {
var idx, tailbits,
    input = data.replace(/[\r\n=]/g, ''), // remove CR/LF & padding to simplify scan
    max = input.length,
    map = BASE64_MAP,
    bits = 0,
    result = [];

// Collect by 6*4 bits (3 bytes)

for (idx = 0; idx < max; idx++) {
  if ((idx % 4 === 0) && idx) {
    result.push((bits >> 16) & 0xFF);
    result.push((bits >> 8) & 0xFF);
    result.push(bits & 0xFF);
  }

  bits = (bits << 6) | map.indexOf(input.charAt(idx));
}

// Dump tail

tailbits = (max % 4) * 6;

if (tailbits === 0) {
  result.push((bits >> 16) & 0xFF);
  result.push((bits >> 8) & 0xFF);
  result.push(bits & 0xFF);
} else if (tailbits === 18) {
  result.push((bits >> 10) & 0xFF);
  result.push((bits >> 2) & 0xFF);
} else if (tailbits === 12) {
  result.push((bits >> 4) & 0xFF);
}

// Wrap into Buffer for NodeJS and leave Array for browser
if (NodeBuffer) {
  // Support node 6.+ Buffer API when available
  return NodeBuffer.from ? NodeBuffer.from(result) : new NodeBuffer(result);
}

return result;
}

function representYamlBinary(object /*, style*/) {
var result = '', bits = 0, idx, tail,
    max = object.length,
    map = BASE64_MAP;

// Convert every three bytes to 4 ASCII characters.

for (idx = 0; idx < max; idx++) {
  if ((idx % 3 === 0) && idx) {
    result += map[(bits >> 18) & 0x3F];
    result += map[(bits >> 12) & 0x3F];
    result += map[(bits >> 6) & 0x3F];
    result += map[bits & 0x3F];
  }

  bits = (bits << 8) + object[idx];
}

// Dump tail

tail = max % 3;

if (tail === 0) {
  result += map[(bits >> 18) & 0x3F];
  result += map[(bits >> 12) & 0x3F];
  result += map[(bits >> 6) & 0x3F];
  result += map[bits & 0x3F];
} else if (tail === 2) {
  result += map[(bits >> 10) & 0x3F];
  result += map[(bits >> 4) & 0x3F];
  result += map[(bits << 2) & 0x3F];
  result += map[64];
} else if (tail === 1) {
  result += map[(bits >> 2) & 0x3F];
  result += map[(bits << 4) & 0x3F];
  result += map[64];
  result += map[64];
}

return result;
}

function isBinary(object) {
return NodeBuffer && NodeBuffer.isBuffer(object);
}

module.exports = new Type('tag:yaml.org,2002:binary', {
kind: 'scalar',
resolve: resolveYamlBinary,
construct: constructYamlBinary,
predicate: isBinary,
represent: representYamlBinary
});

},{"../type":49}],51:[function(_dereq_,module,exports){
'use strict';

var Type = _dereq_('../type');

function resolveYamlBoolean(data) {
if (data === null) return false;

var max = data.length;

return (max === 4 && (data === 'true' || data === 'True' || data === 'TRUE')) ||
       (max === 5 && (data === 'false' || data === 'False' || data === 'FALSE'));
}

function constructYamlBoolean(data) {
return data === 'true' ||
       data === 'True' ||
       data === 'TRUE';
}

function isBoolean(object) {
return Object.prototype.toString.call(object) === '[object Boolean]';
}

module.exports = new Type('tag:yaml.org,2002:bool', {
kind: 'scalar',
resolve: resolveYamlBoolean,
construct: constructYamlBoolean,
predicate: isBoolean,
represent: {
  lowercase: function (object) { return object ? 'true' : 'false'; },
  uppercase: function (object) { return object ? 'TRUE' : 'FALSE'; },
  camelcase: function (object) { return object ? 'True' : 'False'; }
},
defaultStyle: 'lowercase'
});

},{"../type":49}],52:[function(_dereq_,module,exports){
'use strict';

var common = _dereq_('../common');
var Type   = _dereq_('../type');

var YAML_FLOAT_PATTERN = new RegExp(
// 2.5e4, 2.5 and integers
'^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?' +
// .2e4, .2
// special case, seems not from spec
'|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?' +
// 20:59
'|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*' +
// .inf
'|[-+]?\\.(?:inf|Inf|INF)' +
// .nan
'|\\.(?:nan|NaN|NAN))$');

function resolveYamlFloat(data) {
if (data === null) return false;

if (!YAML_FLOAT_PATTERN.test(data) ||
    // Quick hack to not allow integers end with `_`
    // Probably should update regexp & check speed
    data[data.length - 1] === '_') {
  return false;
}

return true;
}

function constructYamlFloat(data) {
var value, sign, base, digits;

value  = data.replace(/_/g, '').toLowerCase();
sign   = value[0] === '-' ? -1 : 1;
digits = [];

if ('+-'.indexOf(value[0]) >= 0) {
  value = value.slice(1);
}

if (value === '.inf') {
  return (sign === 1) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

} else if (value === '.nan') {
  return NaN;

} else if (value.indexOf(':') >= 0) {
  value.split(':').forEach(function (v) {
    digits.unshift(parseFloat(v, 10));
  });

  value = 0.0;
  base = 1;

  digits.forEach(function (d) {
    value += d * base;
    base *= 60;
  });

  return sign * value;

}
return sign * parseFloat(value, 10);
}


var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;

function representYamlFloat(object, style) {
var res;

if (isNaN(object)) {
  switch (style) {
    case 'lowercase': return '.nan';
    case 'uppercase': return '.NAN';
    case 'camelcase': return '.NaN';
  }
} else if (Number.POSITIVE_INFINITY === object) {
  switch (style) {
    case 'lowercase': return '.inf';
    case 'uppercase': return '.INF';
    case 'camelcase': return '.Inf';
  }
} else if (Number.NEGATIVE_INFINITY === object) {
  switch (style) {
    case 'lowercase': return '-.inf';
    case 'uppercase': return '-.INF';
    case 'camelcase': return '-.Inf';
  }
} else if (common.isNegativeZero(object)) {
  return '-0.0';
}

res = object.toString(10);

// JS stringifier can build scientific format without dots: 5e-100,
// while YAML requres dot: 5.e-100. Fix it with simple hack

return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace('e', '.e') : res;
}

function isFloat(object) {
return (Object.prototype.toString.call(object) === '[object Number]') &&
       (object % 1 !== 0 || common.isNegativeZero(object));
}

module.exports = new Type('tag:yaml.org,2002:float', {
kind: 'scalar',
resolve: resolveYamlFloat,
construct: constructYamlFloat,
predicate: isFloat,
represent: representYamlFloat,
defaultStyle: 'lowercase'
});

},{"../common":38,"../type":49}],53:[function(_dereq_,module,exports){
'use strict';

var common = _dereq_('../common');
var Type   = _dereq_('../type');

function isHexCode(c) {
return ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) ||
       ((0x41/* A */ <= c) && (c <= 0x46/* F */)) ||
       ((0x61/* a */ <= c) && (c <= 0x66/* f */));
}

function isOctCode(c) {
return ((0x30/* 0 */ <= c) && (c <= 0x37/* 7 */));
}

function isDecCode(c) {
return ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */));
}

function resolveYamlInteger(data) {
if (data === null) return false;

var max = data.length,
    index = 0,
    hasDigits = false,
    ch;

if (!max) return false;

ch = data[index];

// sign
if (ch === '-' || ch === '+') {
  ch = data[++index];
}

if (ch === '0') {
  // 0
  if (index + 1 === max) return true;
  ch = data[++index];

  // base 2, base 8, base 16

  if (ch === 'b') {
    // base 2
    index++;

    for (; index < max; index++) {
      ch = data[index];
      if (ch === '_') continue;
      if (ch !== '0' && ch !== '1') return false;
      hasDigits = true;
    }
    return hasDigits && ch !== '_';
  }


  if (ch === 'x') {
    // base 16
    index++;

    for (; index < max; index++) {
      ch = data[index];
      if (ch === '_') continue;
      if (!isHexCode(data.charCodeAt(index))) return false;
      hasDigits = true;
    }
    return hasDigits && ch !== '_';
  }

  // base 8
  for (; index < max; index++) {
    ch = data[index];
    if (ch === '_') continue;
    if (!isOctCode(data.charCodeAt(index))) return false;
    hasDigits = true;
  }
  return hasDigits && ch !== '_';
}

// base 10 (except 0) or base 60

// value should not start with `_`;
if (ch === '_') return false;

for (; index < max; index++) {
  ch = data[index];
  if (ch === '_') continue;
  if (ch === ':') break;
  if (!isDecCode(data.charCodeAt(index))) {
    return false;
  }
  hasDigits = true;
}

// Should have digits and should not end with `_`
if (!hasDigits || ch === '_') return false;

// if !base60 - done;
if (ch !== ':') return true;

// base60 almost not used, no needs to optimize
return /^(:[0-5]?[0-9])+$/.test(data.slice(index));
}

function constructYamlInteger(data) {
var value = data, sign = 1, ch, base, digits = [];

if (value.indexOf('_') !== -1) {
  value = value.replace(/_/g, '');
}

ch = value[0];

if (ch === '-' || ch === '+') {
  if (ch === '-') sign = -1;
  value = value.slice(1);
  ch = value[0];
}

if (value === '0') return 0;

if (ch === '0') {
  if (value[1] === 'b') return sign * parseInt(value.slice(2), 2);
  if (value[1] === 'x') return sign * parseInt(value, 16);
  return sign * parseInt(value, 8);
}

if (value.indexOf(':') !== -1) {
  value.split(':').forEach(function (v) {
    digits.unshift(parseInt(v, 10));
  });

  value = 0;
  base = 1;

  digits.forEach(function (d) {
    value += (d * base);
    base *= 60;
  });

  return sign * value;

}

return sign * parseInt(value, 10);
}

function isInteger(object) {
return (Object.prototype.toString.call(object)) === '[object Number]' &&
       (object % 1 === 0 && !common.isNegativeZero(object));
}

module.exports = new Type('tag:yaml.org,2002:int', {
kind: 'scalar',
resolve: resolveYamlInteger,
construct: constructYamlInteger,
predicate: isInteger,
represent: {
  binary:      function (obj) { return obj >= 0 ? '0b' + obj.toString(2) : '-0b' + obj.toString(2).slice(1); },
  octal:       function (obj) { return obj >= 0 ? '0'  + obj.toString(8) : '-0'  + obj.toString(8).slice(1); },
  decimal:     function (obj) { return obj.toString(10); },
  /* eslint-disable max-len */
  hexadecimal: function (obj) { return obj >= 0 ? '0x' + obj.toString(16).toUpperCase() :  '-0x' + obj.toString(16).toUpperCase().slice(1); }
},
defaultStyle: 'decimal',
styleAliases: {
  binary:      [ 2,  'bin' ],
  octal:       [ 8,  'oct' ],
  decimal:     [ 10, 'dec' ],
  hexadecimal: [ 16, 'hex' ]
}
});

},{"../common":38,"../type":49}],54:[function(_dereq_,module,exports){
'use strict';

var esprima;

// Browserified version does not have esprima
//
// 1. For node.js just _dereq_ module as deps
// 2. For browser try to _dereq_ mudule via external AMD system.
//    If not found - try to fallback to window.esprima. If not
//    found too - then fail to parse.
//
try {
// workaround to exclude package from browserify list.
var _require = _dereq_;
esprima = _require('esprima');
} catch (_) {
/*global window */
if (typeof window !== 'undefined') esprima = window.esprima;
}

var Type = _dereq_('../../type');

function resolveJavascriptFunction(data) {
if (data === null) return false;

try {
  var source = '(' + data + ')',
      ast    = esprima.parse(source, { range: true });

  if (ast.type                    !== 'Program'             ||
      ast.body.length             !== 1                     ||
      ast.body[0].type            !== 'ExpressionStatement' ||
      (ast.body[0].expression.type !== 'ArrowFunctionExpression' &&
        ast.body[0].expression.type !== 'FunctionExpression')) {
    return false;
  }

  return true;
} catch (err) {
  return false;
}
}

function constructJavascriptFunction(data) {
/*jslint evil:true*/

var source = '(' + data + ')',
    ast    = esprima.parse(source, { range: true }),
    params = [],
    body;

if (ast.type                    !== 'Program'             ||
    ast.body.length             !== 1                     ||
    ast.body[0].type            !== 'ExpressionStatement' ||
    (ast.body[0].expression.type !== 'ArrowFunctionExpression' &&
      ast.body[0].expression.type !== 'FunctionExpression')) {
  throw new Error('Failed to resolve function');
}

ast.body[0].expression.params.forEach(function (param) {
  params.push(param.name);
});

body = ast.body[0].expression.body.range;

// Esprima's ranges include the first '{' and the last '}' characters on
// function expressions. So cut them out.
/*eslint-disable no-new-func*/
return new Function(params, source.slice(body[0] + 1, body[1] - 1));
}

function representJavascriptFunction(object /*, style*/) {
return object.toString();
}

function isFunction(object) {
return Object.prototype.toString.call(object) === '[object Function]';
}

module.exports = new Type('tag:yaml.org,2002:js/function', {
kind: 'scalar',
resolve: resolveJavascriptFunction,
construct: constructJavascriptFunction,
predicate: isFunction,
represent: representJavascriptFunction
});

},{"../../type":49}],55:[function(_dereq_,module,exports){
'use strict';

var Type = _dereq_('../../type');

function resolveJavascriptRegExp(data) {
if (data === null) return false;
if (data.length === 0) return false;

var regexp = data,
    tail   = /\/([gim]*)$/.exec(data),
    modifiers = '';

// if regexp starts with '/' it can have modifiers and must be properly closed
// `/foo/gim` - modifiers tail can be maximum 3 chars
if (regexp[0] === '/') {
  if (tail) modifiers = tail[1];

  if (modifiers.length > 3) return false;
  // if expression starts with /, is should be properly terminated
  if (regexp[regexp.length - modifiers.length - 1] !== '/') return false;
}

return true;
}

function constructJavascriptRegExp(data) {
var regexp = data,
    tail   = /\/([gim]*)$/.exec(data),
    modifiers = '';

// `/foo/gim` - tail can be maximum 4 chars
if (regexp[0] === '/') {
  if (tail) modifiers = tail[1];
  regexp = regexp.slice(1, regexp.length - modifiers.length - 1);
}

return new RegExp(regexp, modifiers);
}

function representJavascriptRegExp(object /*, style*/) {
var result = '/' + object.source + '/';

if (object.global) result += 'g';
if (object.multiline) result += 'm';
if (object.ignoreCase) result += 'i';

return result;
}

function isRegExp(object) {
return Object.prototype.toString.call(object) === '[object RegExp]';
}

module.exports = new Type('tag:yaml.org,2002:js/regexp', {
kind: 'scalar',
resolve: resolveJavascriptRegExp,
construct: constructJavascriptRegExp,
predicate: isRegExp,
represent: representJavascriptRegExp
});

},{"../../type":49}],56:[function(_dereq_,module,exports){
'use strict';

var Type = _dereq_('../../type');

function resolveJavascriptUndefined() {
return true;
}

function constructJavascriptUndefined() {
/*eslint-disable no-undefined*/
return undefined;
}

function representJavascriptUndefined() {
return '';
}

function isUndefined(object) {
return typeof object === 'undefined';
}

module.exports = new Type('tag:yaml.org,2002:js/undefined', {
kind: 'scalar',
resolve: resolveJavascriptUndefined,
construct: constructJavascriptUndefined,
predicate: isUndefined,
represent: representJavascriptUndefined
});

},{"../../type":49}],57:[function(_dereq_,module,exports){
'use strict';

var Type = _dereq_('../type');

module.exports = new Type('tag:yaml.org,2002:map', {
kind: 'mapping',
construct: function (data) { return data !== null ? data : {}; }
});

},{"../type":49}],58:[function(_dereq_,module,exports){
'use strict';

var Type = _dereq_('../type');

function resolveYamlMerge(data) {
return data === '<<' || data === null;
}

module.exports = new Type('tag:yaml.org,2002:merge', {
kind: 'scalar',
resolve: resolveYamlMerge
});

},{"../type":49}],59:[function(_dereq_,module,exports){
'use strict';

var Type = _dereq_('../type');

function resolveYamlNull(data) {
if (data === null) return true;

var max = data.length;

return (max === 1 && data === '~') ||
       (max === 4 && (data === 'null' || data === 'Null' || data === 'NULL'));
}

function constructYamlNull() {
return null;
}

function isNull(object) {
return object === null;
}

module.exports = new Type('tag:yaml.org,2002:null', {
kind: 'scalar',
resolve: resolveYamlNull,
construct: constructYamlNull,
predicate: isNull,
represent: {
  canonical: function () { return '~';    },
  lowercase: function () { return 'null'; },
  uppercase: function () { return 'NULL'; },
  camelcase: function () { return 'Null'; }
},
defaultStyle: 'lowercase'
});

},{"../type":49}],60:[function(_dereq_,module,exports){
'use strict';

var Type = _dereq_('../type');

var _hasOwnProperty = Object.prototype.hasOwnProperty;
var _toString       = Object.prototype.toString;

function resolveYamlOmap(data) {
if (data === null) return true;

var objectKeys = [], index, length, pair, pairKey, pairHasKey,
    object = data;

for (index = 0, length = object.length; index < length; index += 1) {
  pair = object[index];
  pairHasKey = false;

  if (_toString.call(pair) !== '[object Object]') return false;

  for (pairKey in pair) {
    if (_hasOwnProperty.call(pair, pairKey)) {
      if (!pairHasKey) pairHasKey = true;
      else return false;
    }
  }

  if (!pairHasKey) return false;

  if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
  else return false;
}

return true;
}

function constructYamlOmap(data) {
return data !== null ? data : [];
}

module.exports = new Type('tag:yaml.org,2002:omap', {
kind: 'sequence',
resolve: resolveYamlOmap,
construct: constructYamlOmap
});

},{"../type":49}],61:[function(_dereq_,module,exports){
'use strict';

var Type = _dereq_('../type');

var _toString = Object.prototype.toString;

function resolveYamlPairs(data) {
if (data === null) return true;

var index, length, pair, keys, result,
    object = data;

result = new Array(object.length);

for (index = 0, length = object.length; index < length; index += 1) {
  pair = object[index];

  if (_toString.call(pair) !== '[object Object]') return false;

  keys = Object.keys(pair);

  if (keys.length !== 1) return false;

  result[index] = [ keys[0], pair[keys[0]] ];
}

return true;
}

function constructYamlPairs(data) {
if (data === null) return [];

var index, length, pair, keys, result,
    object = data;

result = new Array(object.length);

for (index = 0, length = object.length; index < length; index += 1) {
  pair = object[index];

  keys = Object.keys(pair);

  result[index] = [ keys[0], pair[keys[0]] ];
}

return result;
}

module.exports = new Type('tag:yaml.org,2002:pairs', {
kind: 'sequence',
resolve: resolveYamlPairs,
construct: constructYamlPairs
});

},{"../type":49}],62:[function(_dereq_,module,exports){
'use strict';

var Type = _dereq_('../type');

module.exports = new Type('tag:yaml.org,2002:seq', {
kind: 'sequence',
construct: function (data) { return data !== null ? data : []; }
});

},{"../type":49}],63:[function(_dereq_,module,exports){
'use strict';

var Type = _dereq_('../type');

var _hasOwnProperty = Object.prototype.hasOwnProperty;

function resolveYamlSet(data) {
if (data === null) return true;

var key, object = data;

for (key in object) {
  if (_hasOwnProperty.call(object, key)) {
    if (object[key] !== null) return false;
  }
}

return true;
}

function constructYamlSet(data) {
return data !== null ? data : {};
}

module.exports = new Type('tag:yaml.org,2002:set', {
kind: 'mapping',
resolve: resolveYamlSet,
construct: constructYamlSet
});

},{"../type":49}],64:[function(_dereq_,module,exports){
'use strict';

var Type = _dereq_('../type');

module.exports = new Type('tag:yaml.org,2002:str', {
kind: 'scalar',
construct: function (data) { return data !== null ? data : ''; }
});

},{"../type":49}],65:[function(_dereq_,module,exports){
'use strict';

var Type = _dereq_('../type');

var YAML_DATE_REGEXP = new RegExp(
'^([0-9][0-9][0-9][0-9])'          + // [1] year
'-([0-9][0-9])'                    + // [2] month
'-([0-9][0-9])$');                   // [3] day

var YAML_TIMESTAMP_REGEXP = new RegExp(
'^([0-9][0-9][0-9][0-9])'          + // [1] year
'-([0-9][0-9]?)'                   + // [2] month
'-([0-9][0-9]?)'                   + // [3] day
'(?:[Tt]|[ \\t]+)'                 + // ...
'([0-9][0-9]?)'                    + // [4] hour
':([0-9][0-9])'                    + // [5] minute
':([0-9][0-9])'                    + // [6] second
'(?:\\.([0-9]*))?'                 + // [7] fraction
'(?:[ \\t]*(Z|([-+])([0-9][0-9]?)' + // [8] tz [9] tz_sign [10] tz_hour
'(?::([0-9][0-9]))?))?$');           // [11] tz_minute

function resolveYamlTimestamp(data) {
if (data === null) return false;
if (YAML_DATE_REGEXP.exec(data) !== null) return true;
if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
return false;
}

function constructYamlTimestamp(data) {
var match, year, month, day, hour, minute, second, fraction = 0,
    delta = null, tz_hour, tz_minute, date;

match = YAML_DATE_REGEXP.exec(data);
if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);

if (match === null) throw new Error('Date resolve error');

// match: [1] year [2] month [3] day

year = +(match[1]);
month = +(match[2]) - 1; // JS month starts with 0
day = +(match[3]);

if (!match[4]) { // no hour
  return new Date(Date.UTC(year, month, day));
}

// match: [4] hour [5] minute [6] second [7] fraction

hour = +(match[4]);
minute = +(match[5]);
second = +(match[6]);

if (match[7]) {
  fraction = match[7].slice(0, 3);
  while (fraction.length < 3) { // milli-seconds
    fraction += '0';
  }
  fraction = +fraction;
}

// match: [8] tz [9] tz_sign [10] tz_hour [11] tz_minute

if (match[9]) {
  tz_hour = +(match[10]);
  tz_minute = +(match[11] || 0);
  delta = (tz_hour * 60 + tz_minute) * 60000; // delta in mili-seconds
  if (match[9] === '-') delta = -delta;
}

date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));

if (delta) date.setTime(date.getTime() - delta);

return date;
}

function representYamlTimestamp(object /*, style*/) {
return object.toISOString();
}

module.exports = new Type('tag:yaml.org,2002:timestamp', {
kind: 'scalar',
resolve: resolveYamlTimestamp,
construct: constructYamlTimestamp,
instanceOf: Date,
represent: representYamlTimestamp
});

},{"../type":49}],66:[function(_dereq_,module,exports){
/**
* Helpers.
*/

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
* Parse or format the given `val`.
*
* Options:
*
*  - `long` verbose formatting [false]
*
* @param {String|Number} val
* @param {Object} [options]
* @throws {Error} throw an error if val is not a non-empty string or a number
* @return {String|Number}
* @api public
*/

module.exports = function(val, options) {
options = options || {};
var type = typeof val;
if (type === 'string' && val.length > 0) {
  return parse(val);
} else if (type === 'number' && isNaN(val) === false) {
  return options.long ? fmtLong(val) : fmtShort(val);
}
throw new Error(
  'val is not a non-empty string or a valid number. val=' +
    JSON.stringify(val)
);
};

/**
* Parse the given `str` and return milliseconds.
*
* @param {String} str
* @return {Number}
* @api private
*/

function parse(str) {
str = String(str);
if (str.length > 100) {
  return;
}
var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
  str
);
if (!match) {
  return;
}
var n = parseFloat(match[1]);
var type = (match[2] || 'ms').toLowerCase();
switch (type) {
  case 'years':
  case 'year':
  case 'yrs':
  case 'yr':
  case 'y':
    return n * y;
  case 'days':
  case 'day':
  case 'd':
    return n * d;
  case 'hours':
  case 'hour':
  case 'hrs':
  case 'hr':
  case 'h':
    return n * h;
  case 'minutes':
  case 'minute':
  case 'mins':
  case 'min':
  case 'm':
    return n * m;
  case 'seconds':
  case 'second':
  case 'secs':
  case 'sec':
  case 's':
    return n * s;
  case 'milliseconds':
  case 'millisecond':
  case 'msecs':
  case 'msec':
  case 'ms':
    return n;
  default:
    return undefined;
}
}

/**
* Short format for `ms`.
*
* @param {Number} ms
* @return {String}
* @api private
*/

function fmtShort(ms) {
if (ms >= d) {
  return Math.round(ms / d) + 'd';
}
if (ms >= h) {
  return Math.round(ms / h) + 'h';
}
if (ms >= m) {
  return Math.round(ms / m) + 'm';
}
if (ms >= s) {
  return Math.round(ms / s) + 's';
}
return ms + 'ms';
}

/**
* Long format for `ms`.
*
* @param {Number} ms
* @return {String}
* @api private
*/

function fmtLong(ms) {
return plural(ms, d, 'day') ||
  plural(ms, h, 'hour') ||
  plural(ms, m, 'minute') ||
  plural(ms, s, 'second') ||
  ms + ' ms';
}

/**
* Pluralization helper.
*/

function plural(ms, n, name) {
if (ms < n) {
  return;
}
if (ms < n * 1.5) {
  return Math.floor(ms / n) + ' ' + name;
}
return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],67:[function(_dereq_,module,exports){
'use strict';

var format = _dereq_('format-util');
var slice = Array.prototype.slice;
var protectedProperties = ['name', 'message', 'stack'];
var errorPrototypeProperties = [
'name', 'message', 'description', 'number', 'code', 'fileName', 'lineNumber', 'columnNumber',
'sourceURL', 'line', 'column', 'stack'
];

module.exports = create(Error);
module.exports.error = create(Error);
module.exports.eval = create(EvalError);
module.exports.range = create(RangeError);
module.exports.reference = create(ReferenceError);
module.exports.syntax = create(SyntaxError);
module.exports.type = create(TypeError);
module.exports.uri = create(URIError);
module.exports.formatter = format;

/**
* Creates a new {@link ono} function that creates the given Error class.
*
* @param {Class} Klass - The Error subclass to create
* @returns {ono}
*/
function create (Klass) {
/**
 * @param {Error}   [err]     - The original error, if any
 * @param {object}  [props]   - An object whose properties will be added to the error object
 * @param {string}  [message] - The error message. May contain {@link util#format} placeholders
 * @param {...*}    [params]  - Parameters that map to the `message` placeholders
 * @returns {Error}
 */
return function onoFactory (err, props, message, params) {   // eslint-disable-line no-unused-vars
  var formatArgs = [];
  var formattedMessage = '';

  // Determine which arguments were actually specified
  if (typeof err === 'string') {
    formatArgs = slice.call(arguments);
    err = props = undefined;
  }
  else if (typeof props === 'string') {
    formatArgs = slice.call(arguments, 1);
    props = undefined;
  }
  else if (typeof message === 'string') {
    formatArgs = slice.call(arguments, 2);
  }

  // If there are any format arguments, then format the error message
  if (formatArgs.length > 0) {
    formattedMessage = module.exports.formatter.apply(null, formatArgs);
  }

  if (err && err.message) {
    // The inner-error's message will be added to the new message
    formattedMessage += (formattedMessage ? ' \n' : '') + err.message;
  }

  // Create the new error
  // NOTE: DON'T move this to a separate function! We don't want to pollute the stack trace
  var newError = new Klass(formattedMessage);

  // Extend the new error with the additional properties
  extendError(newError, err);   // Copy properties of the original error
  extendToJSON(newError);       // Replace the original toJSON method
  extend(newError, props);      // Copy custom properties, possibly including a custom toJSON method

  return newError;
};
}

/**
* Extends the targetError with the properties of the source error.
*
* @param {Error}   targetError - The error object to extend
* @param {?Error}  sourceError - The source error object, if any
*/
function extendError (targetError, sourceError) {
extendStack(targetError, sourceError);
extend(targetError, sourceError);
}

/**
* JavaScript engines differ in how errors are serialized to JSON - especially when it comes
* to custom error properties and stack traces.  So we add our own toJSON method that ALWAYS
* outputs every property of the error.
*/
function extendToJSON (error) {
error.toJSON = errorToJSON;

// Also add an inspect() method, for compatibility with Node.js' `util.inspect()` method
error.inspect = errorToString;
}

/**
* Extends the target object with the properties of the source object.
*
* @param {object}  target - The object to extend
* @param {?source} source - The object whose properties are copied
*/
function extend (target, source) {
if (source && typeof source === 'object') {
  var keys = Object.keys(source);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];

    // Don't copy "protected" properties, since they have special meaning/behavior
    // and are set by the onoFactory function
    if (protectedProperties.indexOf(key) >= 0) {
      continue;
    }

    try {
      target[key] = source[key];
    }
    catch (e) {
      // This property is read-only, so it can't be copied
    }
  }
}
}

/**
* Custom JSON serializer for Error objects.
* Returns all built-in error properties, as well as extended properties.
*
* @returns {object}
*/
function errorToJSON () {
var json = {};

// Get all the properties of this error
var keys = Object.keys(this);

// Also include properties from the Error prototype
keys = keys.concat(errorPrototypeProperties);

for (var i = 0; i < keys.length; i++) {
  var key = keys[i];
  var value = this[key];
  var type = typeof value;
  if (type !== 'undefined' && type !== 'function') {
    json[key] = value;
  }
}

return json;
}

/**
* Serializes Error objects as human-readable JSON strings for debugging/logging purposes.
*
* @returns {string}
*/
function errorToString () {
return JSON.stringify(this, null, 2).replace(/\\n/g, '\n');
}

/**
* Extend the error stack to include its cause
*
* @param {Error} targetError
* @param {Error} sourceError
*/
function extendStack (targetError, sourceError) {
if (hasLazyStack(targetError)) {
  if (sourceError) {
    lazyJoinStacks(targetError, sourceError);
  }
  else {
    lazyPopStack(targetError);
  }
}
else {
  if (sourceError) {
    targetError.stack = joinStacks(targetError.stack, sourceError.stack);
  }
  else {
    targetError.stack = popStack(targetError.stack);
  }
}
}

/**
* Appends the original {@link Error#stack} property to the new Error's stack.
*
* @param {string} newStack
* @param {string} originalStack
* @returns {string}
*/
function joinStacks (newStack, originalStack) {
newStack = popStack(newStack);

if (newStack && originalStack) {
  return newStack + '\n\n' + originalStack;
}
else {
  return newStack || originalStack;
}
}

/**
* Removes Ono from the stack, so that the stack starts at the original error location
*
* @param {string} stack
* @returns {string}
*/
function popStack (stack) {
if (stack) {
  var lines = stack.split('\n');

  if (lines.length < 2) {
    // The stack only has one line, so there's nothing we can remove
    return stack;
  }

  // Find the `onoFactory` call in the stack, and remove it
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.indexOf('onoFactory') >= 0) {
      lines.splice(i, 1);
      return lines.join('\n');
    }
  }

  // If we get here, then the stack doesn't contain a call to `onoFactory`.
  // This may be due to minification or some optimization of the JS engine.
  // So just return the stack as-is.
  return stack;
}
}

/**
* Does a one-time determination of whether this JavaScript engine
* supports lazy `Error.stack` properties.
*/
var supportsLazyStack = (function () {
return !!(
  // ES5 property descriptors must be supported
  Object.getOwnPropertyDescriptor && Object.defineProperty &&

  // Chrome on Android doesn't support lazy stacks :(
  (typeof navigator === 'undefined' || !/Android/.test(navigator.userAgent))
);
}());

/**
* Does this error have a lazy stack property?
*
* @param {Error} err
* @returns {boolean}
*/
function hasLazyStack (err) {
if (!supportsLazyStack) {
  return false;
}

var descriptor = Object.getOwnPropertyDescriptor(err, 'stack');
if (!descriptor) {
  return false;
}
return typeof descriptor.get === 'function';
}

/**
* Calls {@link joinStacks} lazily, when the {@link Error#stack} property is accessed.
*
* @param {Error} targetError
* @param {Error} sourceError
*/
function lazyJoinStacks (targetError, sourceError) {
var targetStack = Object.getOwnPropertyDescriptor(targetError, 'stack');

Object.defineProperty(targetError, 'stack', {
  get: function () {
    return joinStacks(targetStack.get.apply(targetError), sourceError.stack);
  },
  enumerable: false,
  configurable: true
});
}

/**
* Calls {@link popStack} lazily, when the {@link Error#stack} property is accessed.
*
* @param {Error} error
*/
function lazyPopStack (error) {
var targetStack = Object.getOwnPropertyDescriptor(error, 'stack');

Object.defineProperty(error, 'stack', {
  get: function () {
    return popStack(targetStack.get.apply(error));
  },
  enumerable: false,
  configurable: true
});
}

},{"format-util":30}],68:[function(_dereq_,module,exports){
(function (process){
'use strict';

if (!process.version ||
  process.version.indexOf('v0.') === 0 ||
  process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
module.exports = nextTick;
} else {
module.exports = process.nextTick;
}

function nextTick(fn, arg1, arg2, arg3) {
if (typeof fn !== 'function') {
  throw new TypeError('"callback" argument must be a function');
}
var len = arguments.length;
var args, i;
switch (len) {
case 0:
case 1:
  return process.nextTick(fn);
case 2:
  return process.nextTick(function afterTickOne() {
    fn.call(null, arg1);
  });
case 3:
  return process.nextTick(function afterTickTwo() {
    fn.call(null, arg1, arg2);
  });
case 4:
  return process.nextTick(function afterTickThree() {
    fn.call(null, arg1, arg2, arg3);
  });
default:
  args = new Array(len - 1);
  i = 0;
  while (i < args.length) {
    args[i++] = arguments[i];
  }
  return process.nextTick(function afterTick() {
    fn.apply(null, args);
  });
}
}

}).call(this,_dereq_('_process'))

},{"_process":69}],69:[function(_dereq_,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
  throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
  throw new Error('clearTimeout has not been defined');
}
(function () {
  try {
      if (typeof setTimeout === 'function') {
          cachedSetTimeout = setTimeout;
      } else {
          cachedSetTimeout = defaultSetTimout;
      }
  } catch (e) {
      cachedSetTimeout = defaultSetTimout;
  }
  try {
      if (typeof clearTimeout === 'function') {
          cachedClearTimeout = clearTimeout;
      } else {
          cachedClearTimeout = defaultClearTimeout;
      }
  } catch (e) {
      cachedClearTimeout = defaultClearTimeout;
  }
} ())
function runTimeout(fun) {
  if (cachedSetTimeout === setTimeout) {
      //normal enviroments in sane situations
      return setTimeout(fun, 0);
  }
  // if setTimeout wasn't available but was latter defined
  if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
      cachedSetTimeout = setTimeout;
      return setTimeout(fun, 0);
  }
  try {
      // when when somebody has screwed with setTimeout but no I.E. maddness
      return cachedSetTimeout(fun, 0);
  } catch(e){
      try {
          // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
          return cachedSetTimeout.call(null, fun, 0);
      } catch(e){
          // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
          return cachedSetTimeout.call(this, fun, 0);
      }
  }


}
function runClearTimeout(marker) {
  if (cachedClearTimeout === clearTimeout) {
      //normal enviroments in sane situations
      return clearTimeout(marker);
  }
  // if clearTimeout wasn't available but was latter defined
  if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
      cachedClearTimeout = clearTimeout;
      return clearTimeout(marker);
  }
  try {
      // when when somebody has screwed with setTimeout but no I.E. maddness
      return cachedClearTimeout(marker);
  } catch (e){
      try {
          // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
          return cachedClearTimeout.call(null, marker);
      } catch (e){
          // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
          // Some versions of I.E. have different rules for clearTimeout vs setTimeout
          return cachedClearTimeout.call(this, marker);
      }
  }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
  if (!draining || !currentQueue) {
      return;
  }
  draining = false;
  if (currentQueue.length) {
      queue = currentQueue.concat(queue);
  } else {
      queueIndex = -1;
  }
  if (queue.length) {
      drainQueue();
  }
}

function drainQueue() {
  if (draining) {
      return;
  }
  var timeout = runTimeout(cleanUpNextTick);
  draining = true;

  var len = queue.length;
  while(len) {
      currentQueue = queue;
      queue = [];
      while (++queueIndex < len) {
          if (currentQueue) {
              currentQueue[queueIndex].run();
          }
      }
      queueIndex = -1;
      len = queue.length;
  }
  currentQueue = null;
  draining = false;
  runClearTimeout(timeout);
}

process.nextTick = function (fun) {
  var args = new Array(arguments.length - 1);
  if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
          args[i - 1] = arguments[i];
      }
  }
  queue.push(new Item(fun, args));
  if (queue.length === 1 && !draining) {
      runTimeout(drainQueue);
  }
};

// v8 likes predictible objects
function Item(fun, array) {
  this.fun = fun;
  this.array = array;
}
Item.prototype.run = function () {
  this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
  throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
  throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],70:[function(_dereq_,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

/** Detect free variables */
var freeExports = typeof exports == 'object' && exports &&
  !exports.nodeType && exports;
var freeModule = typeof module == 'object' && module &&
  !module.nodeType && module;
var freeGlobal = typeof global == 'object' && global;
if (
  freeGlobal.global === freeGlobal ||
  freeGlobal.window === freeGlobal ||
  freeGlobal.self === freeGlobal
) {
  root = freeGlobal;
}

/**
 * The `punycode` object.
 * @name punycode
 * @type Object
 */
var punycode,

/** Highest positive signed 32-bit float value */
maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

/** Bootstring parameters */
base = 36,
tMin = 1,
tMax = 26,
skew = 38,
damp = 700,
initialBias = 72,
initialN = 128, // 0x80
delimiter = '-', // '\x2D'

/** Regular expressions */
regexPunycode = /^xn--/,
regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

/** Error messages */
errors = {
  'overflow': 'Overflow: input needs wider integers to process',
  'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
  'invalid-input': 'Invalid input'
},

/** Convenience shortcuts */
baseMinusTMin = base - tMin,
floor = Math.floor,
stringFromCharCode = String.fromCharCode,

/** Temporary variable */
key;

/*--------------------------------------------------------------------------*/

/**
 * A generic error utility function.
 * @private
 * @param {String} type The error type.
 * @returns {Error} Throws a `RangeError` with the applicable error message.
 */
function error(type) {
  throw new RangeError(errors[type]);
}

/**
 * A generic `Array#map` utility function.
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} callback The function that gets called for every array
 * item.
 * @returns {Array} A new array of values returned by the callback function.
 */
function map(array, fn) {
  var length = array.length;
  var result = [];
  while (length--) {
    result[length] = fn(array[length]);
  }
  return result;
}

/**
 * A simple `Array#map`-like wrapper to work with domain name strings or email
 * addresses.
 * @private
 * @param {String} domain The domain name or email address.
 * @param {Function} callback The function that gets called for every
 * character.
 * @returns {Array} A new string of characters returned by the callback
 * function.
 */
function mapDomain(string, fn) {
  var parts = string.split('@');
  var result = '';
  if (parts.length > 1) {
    // In email addresses, only the domain name should be punycoded. Leave
    // the local part (i.e. everything up to `@`) intact.
    result = parts[0] + '@';
    string = parts[1];
  }
  // Avoid `split(regex)` for IE8 compatibility. See #17.
  string = string.replace(regexSeparators, '\x2E');
  var labels = string.split('.');
  var encoded = map(labels, fn).join('.');
  return result + encoded;
}

/**
 * Creates an array containing the numeric code points of each Unicode
 * character in the string. While JavaScript uses UCS-2 internally,
 * this function will convert a pair of surrogate halves (each of which
 * UCS-2 exposes as separate characters) into a single code point,
 * matching UTF-16.
 * @see `punycode.ucs2.encode`
 * @see <https://mathiasbynens.be/notes/javascript-encoding>
 * @memberOf punycode.ucs2
 * @name decode
 * @param {String} string The Unicode input string (UCS-2).
 * @returns {Array} The new array of code points.
 */
function ucs2decode(string) {
  var output = [],
      counter = 0,
      length = string.length,
      value,
      extra;
  while (counter < length) {
    value = string.charCodeAt(counter++);
    if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
      // high surrogate, and there is a next character
      extra = string.charCodeAt(counter++);
      if ((extra & 0xFC00) == 0xDC00) { // low surrogate
        output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
      } else {
        // unmatched surrogate; only append this code unit, in case the next
        // code unit is the high surrogate of a surrogate pair
        output.push(value);
        counter--;
      }
    } else {
      output.push(value);
    }
  }
  return output;
}

/**
 * Creates a string based on an array of numeric code points.
 * @see `punycode.ucs2.decode`
 * @memberOf punycode.ucs2
 * @name encode
 * @param {Array} codePoints The array of numeric code points.
 * @returns {String} The new Unicode string (UCS-2).
 */
function ucs2encode(array) {
  return map(array, function(value) {
    var output = '';
    if (value > 0xFFFF) {
      value -= 0x10000;
      output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
      value = 0xDC00 | value & 0x3FF;
    }
    output += stringFromCharCode(value);
    return output;
  }).join('');
}

/**
 * Converts a basic code point into a digit/integer.
 * @see `digitToBasic()`
 * @private
 * @param {Number} codePoint The basic numeric code point value.
 * @returns {Number} The numeric value of a basic code point (for use in
 * representing integers) in the range `0` to `base - 1`, or `base` if
 * the code point does not represent a value.
 */
function basicToDigit(codePoint) {
  if (codePoint - 48 < 10) {
    return codePoint - 22;
  }
  if (codePoint - 65 < 26) {
    return codePoint - 65;
  }
  if (codePoint - 97 < 26) {
    return codePoint - 97;
  }
  return base;
}

/**
 * Converts a digit/integer into a basic code point.
 * @see `basicToDigit()`
 * @private
 * @param {Number} digit The numeric value of a basic code point.
 * @returns {Number} The basic code point whose value (when used for
 * representing integers) is `digit`, which needs to be in the range
 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
 * used; else, the lowercase form is used. The behavior is undefined
 * if `flag` is non-zero and `digit` has no uppercase form.
 */
function digitToBasic(digit, flag) {
  //  0..25 map to ASCII a..z or A..Z
  // 26..35 map to ASCII 0..9
  return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
}

/**
 * Bias adaptation function as per section 3.4 of RFC 3492.
 * https://tools.ietf.org/html/rfc3492#section-3.4
 * @private
 */
function adapt(delta, numPoints, firstTime) {
  var k = 0;
  delta = firstTime ? floor(delta / damp) : delta >> 1;
  delta += floor(delta / numPoints);
  for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
    delta = floor(delta / baseMinusTMin);
  }
  return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
}

/**
 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
 * symbols.
 * @memberOf punycode
 * @param {String} input The Punycode string of ASCII-only symbols.
 * @returns {String} The resulting string of Unicode symbols.
 */
function decode(input) {
  // Don't use UCS-2
  var output = [],
      inputLength = input.length,
      out,
      i = 0,
      n = initialN,
      bias = initialBias,
      basic,
      j,
      index,
      oldi,
      w,
      k,
      digit,
      t,
      /** Cached calculation results */
      baseMinusT;

  // Handle the basic code points: let `basic` be the number of input code
  // points before the last delimiter, or `0` if there is none, then copy
  // the first basic code points to the output.

  basic = input.lastIndexOf(delimiter);
  if (basic < 0) {
    basic = 0;
  }

  for (j = 0; j < basic; ++j) {
    // if it's not a basic code point
    if (input.charCodeAt(j) >= 0x80) {
      error('not-basic');
    }
    output.push(input.charCodeAt(j));
  }

  // Main decoding loop: start just after the last delimiter if any basic code
  // points were copied; start at the beginning otherwise.

  for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

    // `index` is the index of the next character to be consumed.
    // Decode a generalized variable-length integer into `delta`,
    // which gets added to `i`. The overflow checking is easier
    // if we increase `i` as we go, then subtract off its starting
    // value at the end to obtain `delta`.
    for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

      if (index >= inputLength) {
        error('invalid-input');
      }

      digit = basicToDigit(input.charCodeAt(index++));

      if (digit >= base || digit > floor((maxInt - i) / w)) {
        error('overflow');
      }

      i += digit * w;
      t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

      if (digit < t) {
        break;
      }

      baseMinusT = base - t;
      if (w > floor(maxInt / baseMinusT)) {
        error('overflow');
      }

      w *= baseMinusT;

    }

    out = output.length + 1;
    bias = adapt(i - oldi, out, oldi == 0);

    // `i` was supposed to wrap around from `out` to `0`,
    // incrementing `n` each time, so we'll fix that now:
    if (floor(i / out) > maxInt - n) {
      error('overflow');
    }

    n += floor(i / out);
    i %= out;

    // Insert `n` at position `i` of the output
    output.splice(i++, 0, n);

  }

  return ucs2encode(output);
}

/**
 * Converts a string of Unicode symbols (e.g. a domain name label) to a
 * Punycode string of ASCII-only symbols.
 * @memberOf punycode
 * @param {String} input The string of Unicode symbols.
 * @returns {String} The resulting Punycode string of ASCII-only symbols.
 */
function encode(input) {
  var n,
      delta,
      handledCPCount,
      basicLength,
      bias,
      j,
      m,
      q,
      k,
      t,
      currentValue,
      output = [],
      /** `inputLength` will hold the number of code points in `input`. */
      inputLength,
      /** Cached calculation results */
      handledCPCountPlusOne,
      baseMinusT,
      qMinusT;

  // Convert the input in UCS-2 to Unicode
  input = ucs2decode(input);

  // Cache the length
  inputLength = input.length;

  // Initialize the state
  n = initialN;
  delta = 0;
  bias = initialBias;

  // Handle the basic code points
  for (j = 0; j < inputLength; ++j) {
    currentValue = input[j];
    if (currentValue < 0x80) {
      output.push(stringFromCharCode(currentValue));
    }
  }

  handledCPCount = basicLength = output.length;

  // `handledCPCount` is the number of code points that have been handled;
  // `basicLength` is the number of basic code points.

  // Finish the basic string - if it is not empty - with a delimiter
  if (basicLength) {
    output.push(delimiter);
  }

  // Main encoding loop:
  while (handledCPCount < inputLength) {

    // All non-basic code points < n have been handled already. Find the next
    // larger one:
    for (m = maxInt, j = 0; j < inputLength; ++j) {
      currentValue = input[j];
      if (currentValue >= n && currentValue < m) {
        m = currentValue;
      }
    }

    // Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
    // but guard against overflow
    handledCPCountPlusOne = handledCPCount + 1;
    if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
      error('overflow');
    }

    delta += (m - n) * handledCPCountPlusOne;
    n = m;

    for (j = 0; j < inputLength; ++j) {
      currentValue = input[j];

      if (currentValue < n && ++delta > maxInt) {
        error('overflow');
      }

      if (currentValue == n) {
        // Represent delta as a generalized variable-length integer
        for (q = delta, k = base; /* no condition */; k += base) {
          t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
          if (q < t) {
            break;
          }
          qMinusT = q - t;
          baseMinusT = base - t;
          output.push(
            stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
          );
          q = floor(qMinusT / baseMinusT);
        }

        output.push(stringFromCharCode(digitToBasic(q, 0)));
        bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
        delta = 0;
        ++handledCPCount;
      }
    }

    ++delta;
    ++n;

  }
  return output.join('');
}

/**
 * Converts a Punycode string representing a domain name or an email address
 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
 * it doesn't matter if you call it on a string that has already been
 * converted to Unicode.
 * @memberOf punycode
 * @param {String} input The Punycoded domain name or email address to
 * convert to Unicode.
 * @returns {String} The Unicode representation of the given Punycode
 * string.
 */
function toUnicode(input) {
  return mapDomain(input, function(string) {
    return regexPunycode.test(string)
      ? decode(string.slice(4).toLowerCase())
      : string;
  });
}

/**
 * Converts a Unicode string representing a domain name or an email address to
 * Punycode. Only the non-ASCII parts of the domain name will be converted,
 * i.e. it doesn't matter if you call it with a domain that's already in
 * ASCII.
 * @memberOf punycode
 * @param {String} input The domain name or email address to convert, as a
 * Unicode string.
 * @returns {String} The Punycode representation of the given domain name or
 * email address.
 */
function toASCII(input) {
  return mapDomain(input, function(string) {
    return regexNonASCII.test(string)
      ? 'xn--' + encode(string)
      : string;
  });
}

/*--------------------------------------------------------------------------*/

/** Define the public API */
punycode = {
  /**
   * A string representing the current Punycode.js version number.
   * @memberOf punycode
   * @type String
   */
  'version': '1.4.1',
  /**
   * An object of methods to convert from JavaScript's internal character
   * representation (UCS-2) to Unicode code points, and back.
   * @see <https://mathiasbynens.be/notes/javascript-encoding>
   * @memberOf punycode
   * @type Object
   */
  'ucs2': {
    'decode': ucs2decode,
    'encode': ucs2encode
  },
  'decode': decode,
  'encode': encode,
  'toASCII': toASCII,
  'toUnicode': toUnicode
};

/** Expose `punycode` */
// Some AMD build optimizers, like r.js, check for specific condition patterns
// like the following:
if (
  typeof define == 'function' &&
  typeof define.amd == 'object' &&
  define.amd
) {
  define('punycode', function() {
    return punycode;
  });
} else if (freeExports && freeModule) {
  if (module.exports == freeExports) {
    // in Node.js, io.js, or RingoJS v0.8.0+
    freeModule.exports = punycode;
  } else {
    // in Narwhal or RingoJS v0.7.0-
    for (key in punycode) {
      punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
    }
  }
} else {
  // in Rhino or a web browser
  root.punycode = punycode;
}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],71:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
sep = sep || '&';
eq = eq || '=';
var obj = {};

if (typeof qs !== 'string' || qs.length === 0) {
  return obj;
}

var regexp = /\+/g;
qs = qs.split(sep);

var maxKeys = 1000;
if (options && typeof options.maxKeys === 'number') {
  maxKeys = options.maxKeys;
}

var len = qs.length;
// maxKeys <= 0 means that we should not limit keys count
if (maxKeys > 0 && len > maxKeys) {
  len = maxKeys;
}

for (var i = 0; i < len; ++i) {
  var x = qs[i].replace(regexp, '%20'),
      idx = x.indexOf(eq),
      kstr, vstr, k, v;

  if (idx >= 0) {
    kstr = x.substr(0, idx);
    vstr = x.substr(idx + 1);
  } else {
    kstr = x;
    vstr = '';
  }

  k = decodeURIComponent(kstr);
  v = decodeURIComponent(vstr);

  if (!hasOwnProperty(obj, k)) {
    obj[k] = v;
  } else if (isArray(obj[k])) {
    obj[k].push(v);
  } else {
    obj[k] = [obj[k], v];
  }
}

return obj;
};

var isArray = Array.isArray || function (xs) {
return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],72:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
switch (typeof v) {
  case 'string':
    return v;

  case 'boolean':
    return v ? 'true' : 'false';

  case 'number':
    return isFinite(v) ? v : '';

  default:
    return '';
}
};

module.exports = function(obj, sep, eq, name) {
sep = sep || '&';
eq = eq || '=';
if (obj === null) {
  obj = undefined;
}

if (typeof obj === 'object') {
  return map(objectKeys(obj), function(k) {
    var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
    if (isArray(obj[k])) {
      return map(obj[k], function(v) {
        return ks + encodeURIComponent(stringifyPrimitive(v));
      }).join(sep);
    } else {
      return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
    }
  }).join(sep);

}

if (!name) return '';
return encodeURIComponent(stringifyPrimitive(name)) + eq +
       encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
if (xs.map) return xs.map(f);
var res = [];
for (var i = 0; i < xs.length; i++) {
  res.push(f(xs[i], i));
}
return res;
}

var objectKeys = Object.keys || function (obj) {
var res = [];
for (var key in obj) {
  if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
}
return res;
};

},{}],73:[function(_dereq_,module,exports){
'use strict';

exports.decode = exports.parse = _dereq_('./decode');
exports.encode = exports.stringify = _dereq_('./encode');

},{"./decode":71,"./encode":72}],74:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var processNextTick = _dereq_('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
var keys = [];
for (var key in obj) {
  keys.push(key);
}return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var util = _dereq_('core-util-is');
util.inherits = _dereq_('inherits');
/*</replacement>*/

var Readable = _dereq_('./_stream_readable');
var Writable = _dereq_('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
var method = keys[v];
if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
if (!(this instanceof Duplex)) return new Duplex(options);

Readable.call(this, options);
Writable.call(this, options);

if (options && options.readable === false) this.readable = false;

if (options && options.writable === false) this.writable = false;

this.allowHalfOpen = true;
if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
// if we allow half-open state, or if the writable side ended,
// then we're ok.
if (this.allowHalfOpen || this._writableState.ended) return;

// no more data can be written.
// But allow more writes to happen in this tick.
processNextTick(onEndNT, this);
}

function onEndNT(self) {
self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
get: function () {
  if (this._readableState === undefined || this._writableState === undefined) {
    return false;
  }
  return this._readableState.destroyed && this._writableState.destroyed;
},
set: function (value) {
  // we ignore the value if the stream
  // has not been initialized yet
  if (this._readableState === undefined || this._writableState === undefined) {
    return;
  }

  // backward compatibility, the user is explicitly
  // managing destroyed
  this._readableState.destroyed = value;
  this._writableState.destroyed = value;
}
});

Duplex.prototype._destroy = function (err, cb) {
this.push(null);
this.end();

processNextTick(cb, err);
};

function forEach(xs, f) {
for (var i = 0, l = xs.length; i < l; i++) {
  f(xs[i], i);
}
}
},{"./_stream_readable":76,"./_stream_writable":78,"core-util-is":26,"inherits":33,"process-nextick-args":68}],75:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = _dereq_('./_stream_transform');

/*<replacement>*/
var util = _dereq_('core-util-is');
util.inherits = _dereq_('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
if (!(this instanceof PassThrough)) return new PassThrough(options);

Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
cb(null, chunk);
};
},{"./_stream_transform":77,"core-util-is":26,"inherits":33}],76:[function(_dereq_,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var processNextTick = _dereq_('process-nextick-args');
/*</replacement>*/

module.exports = Readable;

/*<replacement>*/
var isArray = _dereq_('isarray');
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = _dereq_('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = _dereq_('./internal/streams/stream');
/*</replacement>*/

// TODO(bmeurer): Change this back to const once hole checks are
// properly optimized away early in Ignition+TurboFan.
/*<replacement>*/
var Buffer = _dereq_('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
return Buffer.from(chunk);
}
function _isUint8Array(obj) {
return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
/*</replacement>*/

/*<replacement>*/
var util = _dereq_('core-util-is');
util.inherits = _dereq_('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = _dereq_('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
debug = debugUtil.debuglog('stream');
} else {
debug = function () {};
}
/*</replacement>*/

var BufferList = _dereq_('./internal/streams/BufferList');
var destroyImpl = _dereq_('./internal/streams/destroy');
var StringDecoder;

util.inherits(Readable, Stream);

var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
// Sadly this is not cacheable as some libraries bundle their own
// event emitter implementation with them.
if (typeof emitter.prependListener === 'function') {
  return emitter.prependListener(event, fn);
} else {
  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}
}

function ReadableState(options, stream) {
Duplex = Duplex || _dereq_('./_stream_duplex');

options = options || {};

// object stream flag. Used to make read(n) ignore n and to
// make all the buffer merging and length checks go away
this.objectMode = !!options.objectMode;

if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

// the point at which it stops calling _read() to fill the buffer
// Note: 0 is a valid value, means "don't call _read preemptively ever"
var hwm = options.highWaterMark;
var defaultHwm = this.objectMode ? 16 : 16 * 1024;
this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

// cast to ints.
this.highWaterMark = Math.floor(this.highWaterMark);

// A linked list is used to store data chunks instead of an array because the
// linked list can remove elements from the beginning faster than
// array.shift()
this.buffer = new BufferList();
this.length = 0;
this.pipes = null;
this.pipesCount = 0;
this.flowing = null;
this.ended = false;
this.endEmitted = false;
this.reading = false;

// a flag to be able to tell if the event 'readable'/'data' is emitted
// immediately, or on a later tick.  We set this to true at first, because
// any actions that shouldn't happen until "later" should generally also
// not happen before the first read call.
this.sync = true;

// whenever we return null, then we set a flag to say
// that we're awaiting a 'readable' event emission.
this.needReadable = false;
this.emittedReadable = false;
this.readableListening = false;
this.resumeScheduled = false;

// has it been destroyed
this.destroyed = false;

// Crypto is kind of old and crusty.  Historically, its default string
// encoding is 'binary' so we have to make this configurable.
// Everything else in the universe uses 'utf8', though.
this.defaultEncoding = options.defaultEncoding || 'utf8';

// the number of writers that are awaiting a drain event in .pipe()s
this.awaitDrain = 0;

// if true, a maybeReadMore has been scheduled
this.readingMore = false;

this.decoder = null;
this.encoding = null;
if (options.encoding) {
  if (!StringDecoder) StringDecoder = _dereq_('string_decoder/').StringDecoder;
  this.decoder = new StringDecoder(options.encoding);
  this.encoding = options.encoding;
}
}

function Readable(options) {
Duplex = Duplex || _dereq_('./_stream_duplex');

if (!(this instanceof Readable)) return new Readable(options);

this._readableState = new ReadableState(options, this);

// legacy
this.readable = true;

if (options) {
  if (typeof options.read === 'function') this._read = options.read;

  if (typeof options.destroy === 'function') this._destroy = options.destroy;
}

Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
get: function () {
  if (this._readableState === undefined) {
    return false;
  }
  return this._readableState.destroyed;
},
set: function (value) {
  // we ignore the value if the stream
  // has not been initialized yet
  if (!this._readableState) {
    return;
  }

  // backward compatibility, the user is explicitly
  // managing destroyed
  this._readableState.destroyed = value;
}
});

Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
this.push(null);
cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
var state = this._readableState;
var skipChunkCheck;

if (!state.objectMode) {
  if (typeof chunk === 'string') {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = Buffer.from(chunk, encoding);
      encoding = '';
    }
    skipChunkCheck = true;
  }
} else {
  skipChunkCheck = true;
}

return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
var state = stream._readableState;
if (chunk === null) {
  state.reading = false;
  onEofChunk(stream, state);
} else {
  var er;
  if (!skipChunkCheck) er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
      chunk = _uint8ArrayToBuffer(chunk);
    }

    if (addToFront) {
      if (state.endEmitted) stream.emit('error', new Error('stream.unshift() after end event'));else addChunk(stream, state, chunk, true);
    } else if (state.ended) {
      stream.emit('error', new Error('stream.push() after EOF'));
    } else {
      state.reading = false;
      if (state.decoder && !encoding) {
        chunk = state.decoder.write(chunk);
        if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
      } else {
        addChunk(stream, state, chunk, false);
      }
    }
  } else if (!addToFront) {
    state.reading = false;
  }
}

return needMoreData(state);
}

function addChunk(stream, state, chunk, addToFront) {
if (state.flowing && state.length === 0 && !state.sync) {
  stream.emit('data', chunk);
  stream.read(0);
} else {
  // update the buffer info.
  state.length += state.objectMode ? 1 : chunk.length;
  if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

  if (state.needReadable) emitReadable(stream);
}
maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
var er;
if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
  er = new TypeError('Invalid non-string/buffer chunk');
}
return er;
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

Readable.prototype.isPaused = function () {
return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
if (!StringDecoder) StringDecoder = _dereq_('string_decoder/').StringDecoder;
this._readableState.decoder = new StringDecoder(enc);
this._readableState.encoding = enc;
return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
if (n >= MAX_HWM) {
  n = MAX_HWM;
} else {
  // Get the next highest power of 2 to prevent increasing hwm excessively in
  // tiny amounts
  n--;
  n |= n >>> 1;
  n |= n >>> 2;
  n |= n >>> 4;
  n |= n >>> 8;
  n |= n >>> 16;
  n++;
}
return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
if (n <= 0 || state.length === 0 && state.ended) return 0;
if (state.objectMode) return 1;
if (n !== n) {
  // Only flow one buffer at a time
  if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
}
// If we're asking for more than the current hwm, then raise the hwm.
if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
if (n <= state.length) return n;
// Don't have enough
if (!state.ended) {
  state.needReadable = true;
  return 0;
}
return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
debug('read', n);
n = parseInt(n, 10);
var state = this._readableState;
var nOrig = n;

if (n !== 0) state.emittedReadable = false;

// if we're doing read(0) to trigger a readable event, but we
// already have a bunch of data in the buffer, then just trigger
// the 'readable' event and move on.
if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
  debug('read: emitReadable', state.length, state.ended);
  if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
  return null;
}

n = howMuchToRead(n, state);

// if we've ended, and we're now clear, then finish it up.
if (n === 0 && state.ended) {
  if (state.length === 0) endReadable(this);
  return null;
}

// All the actual chunk generation logic needs to be
// *below* the call to _read.  The reason is that in certain
// synthetic stream cases, such as passthrough streams, _read
// may be a completely synchronous operation which may change
// the state of the read buffer, providing enough data when
// before there was *not* enough.
//
// So, the steps are:
// 1. Figure out what the state of things will be after we do
// a read from the buffer.
//
// 2. If that resulting state will trigger a _read, then call _read.
// Note that this may be asynchronous, or synchronous.  Yes, it is
// deeply ugly to write APIs this way, but that still doesn't mean
// that the Readable class should behave improperly, as streams are
// designed to be sync/async agnostic.
// Take note if the _read call is sync or async (ie, if the read call
// has returned yet), so that we know whether or not it's safe to emit
// 'readable' etc.
//
// 3. Actually pull the requested chunks out of the buffer and return.

// if we need a readable event, then we need to do some reading.
var doRead = state.needReadable;
debug('need readable', doRead);

// if we currently have less than the highWaterMark, then also read some
if (state.length === 0 || state.length - n < state.highWaterMark) {
  doRead = true;
  debug('length less than watermark', doRead);
}

// however, if we've ended, then there's no point, and if we're already
// reading, then it's unnecessary.
if (state.ended || state.reading) {
  doRead = false;
  debug('reading or ended', doRead);
} else if (doRead) {
  debug('do read');
  state.reading = true;
  state.sync = true;
  // if the length is currently zero, then we *need* a readable event.
  if (state.length === 0) state.needReadable = true;
  // call internal read method
  this._read(state.highWaterMark);
  state.sync = false;
  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (!state.reading) n = howMuchToRead(nOrig, state);
}

var ret;
if (n > 0) ret = fromList(n, state);else ret = null;

if (ret === null) {
  state.needReadable = true;
  n = 0;
} else {
  state.length -= n;
}

if (state.length === 0) {
  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (!state.ended) state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended) endReadable(this);
}

if (ret !== null) this.emit('data', ret);

return ret;
};

function onEofChunk(stream, state) {
if (state.ended) return;
if (state.decoder) {
  var chunk = state.decoder.end();
  if (chunk && chunk.length) {
    state.buffer.push(chunk);
    state.length += state.objectMode ? 1 : chunk.length;
  }
}
state.ended = true;

// emit 'readable' now to make sure it gets picked up.
emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
var state = stream._readableState;
state.needReadable = false;
if (!state.emittedReadable) {
  debug('emitReadable', state.flowing);
  state.emittedReadable = true;
  if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
}
}

function emitReadable_(stream) {
debug('emit readable');
stream.emit('readable');
flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
if (!state.readingMore) {
  state.readingMore = true;
  processNextTick(maybeReadMore_, stream, state);
}
}

function maybeReadMore_(stream, state) {
var len = state.length;
while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
  debug('maybeReadMore read 0');
  stream.read(0);
  if (len === state.length)
    // didn't get any data, stop spinning.
    break;else len = state.length;
}
state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
this.emit('error', new Error('_read() is not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
var src = this;
var state = this._readableState;

switch (state.pipesCount) {
  case 0:
    state.pipes = dest;
    break;
  case 1:
    state.pipes = [state.pipes, dest];
    break;
  default:
    state.pipes.push(dest);
    break;
}
state.pipesCount += 1;
debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

var endFn = doEnd ? onend : unpipe;
if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

dest.on('unpipe', onunpipe);
function onunpipe(readable, unpipeInfo) {
  debug('onunpipe');
  if (readable === src) {
    if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
      unpipeInfo.hasUnpiped = true;
      cleanup();
    }
  }
}

function onend() {
  debug('onend');
  dest.end();
}

// when the dest drains, it reduces the awaitDrain counter
// on the source.  This would be more elegant with a .once()
// handler in flow(), but adding and removing repeatedly is
// too slow.
var ondrain = pipeOnDrain(src);
dest.on('drain', ondrain);

var cleanedUp = false;
function cleanup() {
  debug('cleanup');
  // cleanup event handlers once the pipe is broken
  dest.removeListener('close', onclose);
  dest.removeListener('finish', onfinish);
  dest.removeListener('drain', ondrain);
  dest.removeListener('error', onerror);
  dest.removeListener('unpipe', onunpipe);
  src.removeListener('end', onend);
  src.removeListener('end', unpipe);
  src.removeListener('data', ondata);

  cleanedUp = true;

  // if the reader is waiting for a drain event from this
  // specific writer, then it would cause it to never start
  // flowing again.
  // So, if this is awaiting a drain, then we just call it now.
  // If we don't know, then assume that we are waiting for one.
  if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
}

// If the user pushes more data while we're writing to dest then we'll end up
// in ondata again. However, we only want to increase awaitDrain once because
// dest will only emit one 'drain' event for the multiple writes.
// => Introduce a guard on increasing awaitDrain.
var increasedAwaitDrain = false;
src.on('data', ondata);
function ondata(chunk) {
  debug('ondata');
  increasedAwaitDrain = false;
  var ret = dest.write(chunk);
  if (false === ret && !increasedAwaitDrain) {
    // If the user unpiped during `dest.write()`, it is possible
    // to get stuck in a permanently paused state if that write
    // also returned false.
    // => Check whether `dest` is still a piping destination.
    if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
      debug('false write response, pause', src._readableState.awaitDrain);
      src._readableState.awaitDrain++;
      increasedAwaitDrain = true;
    }
    src.pause();
  }
}

// if the dest has an error, then stop piping into it.
// however, don't suppress the throwing behavior for this.
function onerror(er) {
  debug('onerror', er);
  unpipe();
  dest.removeListener('error', onerror);
  if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
}

// Make sure our error handler is attached before userland ones.
prependListener(dest, 'error', onerror);

// Both close and finish should trigger unpipe, but only once.
function onclose() {
  dest.removeListener('finish', onfinish);
  unpipe();
}
dest.once('close', onclose);
function onfinish() {
  debug('onfinish');
  dest.removeListener('close', onclose);
  unpipe();
}
dest.once('finish', onfinish);

function unpipe() {
  debug('unpipe');
  src.unpipe(dest);
}

// tell the dest that it's being piped to
dest.emit('pipe', src);

// start the flow if it hasn't been started already.
if (!state.flowing) {
  debug('pipe resume');
  src.resume();
}

return dest;
};

function pipeOnDrain(src) {
return function () {
  var state = src._readableState;
  debug('pipeOnDrain', state.awaitDrain);
  if (state.awaitDrain) state.awaitDrain--;
  if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
    state.flowing = true;
    flow(src);
  }
};
}

Readable.prototype.unpipe = function (dest) {
var state = this._readableState;
var unpipeInfo = { hasUnpiped: false };

// if we're not piping anywhere, then do nothing.
if (state.pipesCount === 0) return this;

// just one destination.  most common case.
if (state.pipesCount === 1) {
  // passed in one, but it's not the right one.
  if (dest && dest !== state.pipes) return this;

  if (!dest) dest = state.pipes;

  // got a match.
  state.pipes = null;
  state.pipesCount = 0;
  state.flowing = false;
  if (dest) dest.emit('unpipe', this, unpipeInfo);
  return this;
}

// slow case. multiple pipe destinations.

if (!dest) {
  // remove all.
  var dests = state.pipes;
  var len = state.pipesCount;
  state.pipes = null;
  state.pipesCount = 0;
  state.flowing = false;

  for (var i = 0; i < len; i++) {
    dests[i].emit('unpipe', this, unpipeInfo);
  }return this;
}

// try to find the right one.
var index = indexOf(state.pipes, dest);
if (index === -1) return this;

state.pipes.splice(index, 1);
state.pipesCount -= 1;
if (state.pipesCount === 1) state.pipes = state.pipes[0];

dest.emit('unpipe', this, unpipeInfo);

return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
var res = Stream.prototype.on.call(this, ev, fn);

if (ev === 'data') {
  // Start flowing on next tick if stream isn't explicitly paused
  if (this._readableState.flowing !== false) this.resume();
} else if (ev === 'readable') {
  var state = this._readableState;
  if (!state.endEmitted && !state.readableListening) {
    state.readableListening = state.needReadable = true;
    state.emittedReadable = false;
    if (!state.reading) {
      processNextTick(nReadingNextTick, this);
    } else if (state.length) {
      emitReadable(this);
    }
  }
}

return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
debug('readable nexttick read 0');
self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
var state = this._readableState;
if (!state.flowing) {
  debug('resume');
  state.flowing = true;
  resume(this, state);
}
return this;
};

function resume(stream, state) {
if (!state.resumeScheduled) {
  state.resumeScheduled = true;
  processNextTick(resume_, stream, state);
}
}

function resume_(stream, state) {
if (!state.reading) {
  debug('resume read 0');
  stream.read(0);
}

state.resumeScheduled = false;
state.awaitDrain = 0;
stream.emit('resume');
flow(stream);
if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
debug('call pause flowing=%j', this._readableState.flowing);
if (false !== this._readableState.flowing) {
  debug('pause');
  this._readableState.flowing = false;
  this.emit('pause');
}
return this;
};

function flow(stream) {
var state = stream._readableState;
debug('flow', state.flowing);
while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
var state = this._readableState;
var paused = false;

var self = this;
stream.on('end', function () {
  debug('wrapped end');
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) self.push(chunk);
  }

  self.push(null);
});

stream.on('data', function (chunk) {
  debug('wrapped data');
  if (state.decoder) chunk = state.decoder.write(chunk);

  // don't skip over falsy values in objectMode
  if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

  var ret = self.push(chunk);
  if (!ret) {
    paused = true;
    stream.pause();
  }
});

// proxy all the other methods.
// important when wrapping filters and duplexes.
for (var i in stream) {
  if (this[i] === undefined && typeof stream[i] === 'function') {
    this[i] = function (method) {
      return function () {
        return stream[method].apply(stream, arguments);
      };
    }(i);
  }
}

// proxy certain important events.
for (var n = 0; n < kProxyEvents.length; n++) {
  stream.on(kProxyEvents[n], self.emit.bind(self, kProxyEvents[n]));
}

// when we try to consume some more bytes, simply unpause the
// underlying stream.
self._read = function (n) {
  debug('wrapped _read', n);
  if (paused) {
    paused = false;
    stream.resume();
  }
};

return self;
};

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
// nothing buffered
if (state.length === 0) return null;

var ret;
if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
  // read it all, truncate the list
  if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
  state.buffer.clear();
} else {
  // read part of list
  ret = fromListPartial(n, state.buffer, state.decoder);
}

return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
var ret;
if (n < list.head.data.length) {
  // slice is the same for buffers and strings
  ret = list.head.data.slice(0, n);
  list.head.data = list.head.data.slice(n);
} else if (n === list.head.data.length) {
  // first chunk is a perfect match
  ret = list.shift();
} else {
  // result spans more than one buffer
  ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
}
return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
var p = list.head;
var c = 1;
var ret = p.data;
n -= ret.length;
while (p = p.next) {
  var str = p.data;
  var nb = n > str.length ? str.length : n;
  if (nb === str.length) ret += str;else ret += str.slice(0, n);
  n -= nb;
  if (n === 0) {
    if (nb === str.length) {
      ++c;
      if (p.next) list.head = p.next;else list.head = list.tail = null;
    } else {
      list.head = p;
      p.data = str.slice(nb);
    }
    break;
  }
  ++c;
}
list.length -= c;
return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
var ret = Buffer.allocUnsafe(n);
var p = list.head;
var c = 1;
p.data.copy(ret);
n -= p.data.length;
while (p = p.next) {
  var buf = p.data;
  var nb = n > buf.length ? buf.length : n;
  buf.copy(ret, ret.length - n, 0, nb);
  n -= nb;
  if (n === 0) {
    if (nb === buf.length) {
      ++c;
      if (p.next) list.head = p.next;else list.head = list.tail = null;
    } else {
      list.head = p;
      p.data = buf.slice(nb);
    }
    break;
  }
  ++c;
}
list.length -= c;
return ret;
}

function endReadable(stream) {
var state = stream._readableState;

// If we get here before consuming all the bytes, then that is a
// bug in node.  Should never happen.
if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

if (!state.endEmitted) {
  state.ended = true;
  processNextTick(endReadableNT, state, stream);
}
}

function endReadableNT(state, stream) {
// Check that we didn't get one last unshift.
if (!state.endEmitted && state.length === 0) {
  state.endEmitted = true;
  stream.readable = false;
  stream.emit('end');
}
}

function forEach(xs, f) {
for (var i = 0, l = xs.length; i < l; i++) {
  f(xs[i], i);
}
}

function indexOf(xs, x) {
for (var i = 0, l = xs.length; i < l; i++) {
  if (xs[i] === x) return i;
}
return -1;
}
}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./_stream_duplex":74,"./internal/streams/BufferList":79,"./internal/streams/destroy":80,"./internal/streams/stream":81,"_process":69,"core-util-is":26,"events":29,"inherits":33,"isarray":35,"process-nextick-args":68,"safe-buffer":83,"string_decoder/":88,"util":22}],77:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = _dereq_('./_stream_duplex');

/*<replacement>*/
var util = _dereq_('core-util-is');
util.inherits = _dereq_('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function TransformState(stream) {
this.afterTransform = function (er, data) {
  return afterTransform(stream, er, data);
};

this.needTransform = false;
this.transforming = false;
this.writecb = null;
this.writechunk = null;
this.writeencoding = null;
}

function afterTransform(stream, er, data) {
var ts = stream._transformState;
ts.transforming = false;

var cb = ts.writecb;

if (!cb) {
  return stream.emit('error', new Error('write callback called multiple times'));
}

ts.writechunk = null;
ts.writecb = null;

if (data !== null && data !== undefined) stream.push(data);

cb(er);

var rs = stream._readableState;
rs.reading = false;
if (rs.needReadable || rs.length < rs.highWaterMark) {
  stream._read(rs.highWaterMark);
}
}

function Transform(options) {
if (!(this instanceof Transform)) return new Transform(options);

Duplex.call(this, options);

this._transformState = new TransformState(this);

var stream = this;

// start out asking for a readable event once data is transformed.
this._readableState.needReadable = true;

// we have implemented the _read method, and done the other things
// that Readable wants before the first _read call, so unset the
// sync guard flag.
this._readableState.sync = false;

if (options) {
  if (typeof options.transform === 'function') this._transform = options.transform;

  if (typeof options.flush === 'function') this._flush = options.flush;
}

// When the writable side finishes, then flush out anything remaining.
this.once('prefinish', function () {
  if (typeof this._flush === 'function') this._flush(function (er, data) {
    done(stream, er, data);
  });else done(stream);
});
}

Transform.prototype.push = function (chunk, encoding) {
this._transformState.needTransform = false;
return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
throw new Error('_transform() is not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
var ts = this._transformState;
ts.writecb = cb;
ts.writechunk = chunk;
ts.writeencoding = encoding;
if (!ts.transforming) {
  var rs = this._readableState;
  if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
}
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
var ts = this._transformState;

if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
  ts.transforming = true;
  this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
} else {
  // mark that we need a transform, so that any data that comes in
  // will get processed, now that we've asked for it.
  ts.needTransform = true;
}
};

Transform.prototype._destroy = function (err, cb) {
var _this = this;

Duplex.prototype._destroy.call(this, err, function (err2) {
  cb(err2);
  _this.emit('close');
});
};

function done(stream, er, data) {
if (er) return stream.emit('error', er);

if (data !== null && data !== undefined) stream.push(data);

// if there's nothing in the write buffer, then that means
// that nothing more will ever be provided
var ws = stream._writableState;
var ts = stream._transformState;

if (ws.length) throw new Error('Calling transform done when ws.length != 0');

if (ts.transforming) throw new Error('Calling transform done when still transforming');

return stream.push(null);
}
},{"./_stream_duplex":74,"core-util-is":26,"inherits":33}],78:[function(_dereq_,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

/*<replacement>*/

var processNextTick = _dereq_('process-nextick-args');
/*</replacement>*/

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
this.chunk = chunk;
this.encoding = encoding;
this.callback = cb;
this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
var _this = this;

this.next = null;
this.entry = null;
this.finish = function () {
  onCorkedFinish(_this, state);
};
}
/* </replacement> */

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = _dereq_('core-util-is');
util.inherits = _dereq_('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
deprecate: _dereq_('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = _dereq_('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/
var Buffer = _dereq_('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
return Buffer.from(chunk);
}
function _isUint8Array(obj) {
return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
/*</replacement>*/

var destroyImpl = _dereq_('./internal/streams/destroy');

util.inherits(Writable, Stream);

function nop() {}

function WritableState(options, stream) {
Duplex = Duplex || _dereq_('./_stream_duplex');

options = options || {};

// object stream flag to indicate whether or not this stream
// contains buffers or objects.
this.objectMode = !!options.objectMode;

if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

// the point at which write() starts returning false
// Note: 0 is a valid value, means that we always return false if
// the entire buffer is not flushed immediately on write()
var hwm = options.highWaterMark;
var defaultHwm = this.objectMode ? 16 : 16 * 1024;
this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

// cast to ints.
this.highWaterMark = Math.floor(this.highWaterMark);

// if _final has been called
this.finalCalled = false;

// drain event flag.
this.needDrain = false;
// at the start of calling end()
this.ending = false;
// when end() has been called, and returned
this.ended = false;
// when 'finish' is emitted
this.finished = false;

// has it been destroyed
this.destroyed = false;

// should we decode strings into buffers before passing to _write?
// this is here so that some node-core streams can optimize string
// handling at a lower level.
var noDecode = options.decodeStrings === false;
this.decodeStrings = !noDecode;

// Crypto is kind of old and crusty.  Historically, its default string
// encoding is 'binary' so we have to make this configurable.
// Everything else in the universe uses 'utf8', though.
this.defaultEncoding = options.defaultEncoding || 'utf8';

// not an actual buffer we keep track of, but a measurement
// of how much we're waiting to get pushed to some underlying
// socket or file.
this.length = 0;

// a flag to see when we're in the middle of a write.
this.writing = false;

// when true all writes will be buffered until .uncork() call
this.corked = 0;

// a flag to be able to tell if the onwrite cb is called immediately,
// or on a later tick.  We set this to true at first, because any
// actions that shouldn't happen until "later" should generally also
// not happen before the first write call.
this.sync = true;

// a flag to know if we're processing previously buffered items, which
// may call the _write() callback in the same tick, so that we don't
// end up in an overlapped onwrite situation.
this.bufferProcessing = false;

// the callback that's passed to _write(chunk,cb)
this.onwrite = function (er) {
  onwrite(stream, er);
};

// the callback that the user supplies to write(chunk,encoding,cb)
this.writecb = null;

// the amount that is being written when _write is called.
this.writelen = 0;

this.bufferedRequest = null;
this.lastBufferedRequest = null;

// number of pending user-supplied write callbacks
// this must be 0 before 'finish' can be emitted
this.pendingcb = 0;

// emit prefinish if the only thing we're waiting for is _write cbs
// This is relevant for synchronous Transform streams
this.prefinished = false;

// True if the error was already emitted and should not be thrown again
this.errorEmitted = false;

// count buffered requests
this.bufferedRequestCount = 0;

// allocate the first CorkedRequest, there is always
// one allocated and free to use, and we maintain at most two
this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
var current = this.bufferedRequest;
var out = [];
while (current) {
  out.push(current);
  current = current.next;
}
return out;
};

(function () {
try {
  Object.defineProperty(WritableState.prototype, 'buffer', {
    get: internalUtil.deprecate(function () {
      return this.getBuffer();
    }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
  });
} catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
realHasInstance = Function.prototype[Symbol.hasInstance];
Object.defineProperty(Writable, Symbol.hasInstance, {
  value: function (object) {
    if (realHasInstance.call(this, object)) return true;

    return object && object._writableState instanceof WritableState;
  }
});
} else {
realHasInstance = function (object) {
  return object instanceof this;
};
}

function Writable(options) {
Duplex = Duplex || _dereq_('./_stream_duplex');

// Writable ctor is applied to Duplexes, too.
// `realHasInstance` is necessary because using plain `instanceof`
// would return false, as no `_writableState` property is attached.

// Trying to use the custom `instanceof` for Writable here will also break the
// Node.js LazyTransform implementation, which has a non-trivial getter for
// `_writableState` that would lead to infinite recursion.
if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
  return new Writable(options);
}

this._writableState = new WritableState(options, this);

// legacy.
this.writable = true;

if (options) {
  if (typeof options.write === 'function') this._write = options.write;

  if (typeof options.writev === 'function') this._writev = options.writev;

  if (typeof options.destroy === 'function') this._destroy = options.destroy;

  if (typeof options.final === 'function') this._final = options.final;
}

Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
var er = new Error('write after end');
// TODO: defer error events consistently everywhere, not just the cb
stream.emit('error', er);
processNextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
var valid = true;
var er = false;

if (chunk === null) {
  er = new TypeError('May not write null values to stream');
} else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
  er = new TypeError('Invalid non-string/buffer chunk');
}
if (er) {
  stream.emit('error', er);
  processNextTick(cb, er);
  valid = false;
}
return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
var state = this._writableState;
var ret = false;
var isBuf = _isUint8Array(chunk) && !state.objectMode;

if (isBuf && !Buffer.isBuffer(chunk)) {
  chunk = _uint8ArrayToBuffer(chunk);
}

if (typeof encoding === 'function') {
  cb = encoding;
  encoding = null;
}

if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

if (typeof cb !== 'function') cb = nop;

if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
  state.pendingcb++;
  ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
}

return ret;
};

Writable.prototype.cork = function () {
var state = this._writableState;

state.corked++;
};

Writable.prototype.uncork = function () {
var state = this._writableState;

if (state.corked) {
  state.corked--;

  if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
}
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
// node::ParseEncoding() requires lower case.
if (typeof encoding === 'string') encoding = encoding.toLowerCase();
if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
this._writableState.defaultEncoding = encoding;
return this;
};

function decodeChunk(state, chunk, encoding) {
if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
  chunk = Buffer.from(chunk, encoding);
}
return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
if (!isBuf) {
  var newChunk = decodeChunk(state, chunk, encoding);
  if (chunk !== newChunk) {
    isBuf = true;
    encoding = 'buffer';
    chunk = newChunk;
  }
}
var len = state.objectMode ? 1 : chunk.length;

state.length += len;

var ret = state.length < state.highWaterMark;
// we must ensure that previous needDrain will not be reset to false.
if (!ret) state.needDrain = true;

if (state.writing || state.corked) {
  var last = state.lastBufferedRequest;
  state.lastBufferedRequest = {
    chunk: chunk,
    encoding: encoding,
    isBuf: isBuf,
    callback: cb,
    next: null
  };
  if (last) {
    last.next = state.lastBufferedRequest;
  } else {
    state.bufferedRequest = state.lastBufferedRequest;
  }
  state.bufferedRequestCount += 1;
} else {
  doWrite(stream, state, false, len, chunk, encoding, cb);
}

return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
state.writelen = len;
state.writecb = cb;
state.writing = true;
state.sync = true;
if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
--state.pendingcb;

if (sync) {
  // defer the callback if we are being called synchronously
  // to avoid piling up things on the stack
  processNextTick(cb, er);
  // this can emit finish, and it will always happen
  // after error
  processNextTick(finishMaybe, stream, state);
  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
} else {
  // the caller expect this to happen before if
  // it is async
  cb(er);
  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
  // this can emit finish, but finish must
  // always follow error
  finishMaybe(stream, state);
}
}

function onwriteStateUpdate(state) {
state.writing = false;
state.writecb = null;
state.length -= state.writelen;
state.writelen = 0;
}

function onwrite(stream, er) {
var state = stream._writableState;
var sync = state.sync;
var cb = state.writecb;

onwriteStateUpdate(state);

if (er) onwriteError(stream, state, sync, er, cb);else {
  // Check if we're actually ready to finish, but don't emit yet
  var finished = needFinish(state);

  if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
    clearBuffer(stream, state);
  }

  if (sync) {
    /*<replacement>*/
    asyncWrite(afterWrite, stream, state, finished, cb);
    /*</replacement>*/
  } else {
    afterWrite(stream, state, finished, cb);
  }
}
}

function afterWrite(stream, state, finished, cb) {
if (!finished) onwriteDrain(stream, state);
state.pendingcb--;
cb();
finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
if (state.length === 0 && state.needDrain) {
  state.needDrain = false;
  stream.emit('drain');
}
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
state.bufferProcessing = true;
var entry = state.bufferedRequest;

if (stream._writev && entry && entry.next) {
  // Fast case, write everything using _writev()
  var l = state.bufferedRequestCount;
  var buffer = new Array(l);
  var holder = state.corkedRequestsFree;
  holder.entry = entry;

  var count = 0;
  var allBuffers = true;
  while (entry) {
    buffer[count] = entry;
    if (!entry.isBuf) allBuffers = false;
    entry = entry.next;
    count += 1;
  }
  buffer.allBuffers = allBuffers;

  doWrite(stream, state, true, state.length, buffer, '', holder.finish);

  // doWrite is almost always async, defer these to save a bit of time
  // as the hot path ends with doWrite
  state.pendingcb++;
  state.lastBufferedRequest = null;
  if (holder.next) {
    state.corkedRequestsFree = holder.next;
    holder.next = null;
  } else {
    state.corkedRequestsFree = new CorkedRequest(state);
  }
} else {
  // Slow case, write chunks one-by-one
  while (entry) {
    var chunk = entry.chunk;
    var encoding = entry.encoding;
    var cb = entry.callback;
    var len = state.objectMode ? 1 : chunk.length;

    doWrite(stream, state, false, len, chunk, encoding, cb);
    entry = entry.next;
    // if we didn't call the onwrite immediately, then
    // it means that we need to wait until it does.
    // also, that means that the chunk and cb are currently
    // being processed, so move the buffer counter past them.
    if (state.writing) {
      break;
    }
  }

  if (entry === null) state.lastBufferedRequest = null;
}

state.bufferedRequestCount = 0;
state.bufferedRequest = entry;
state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
cb(new Error('_write() is not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
var state = this._writableState;

if (typeof chunk === 'function') {
  cb = chunk;
  chunk = null;
  encoding = null;
} else if (typeof encoding === 'function') {
  cb = encoding;
  encoding = null;
}

if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

// .end() fully uncorks
if (state.corked) {
  state.corked = 1;
  this.uncork();
}

// ignore unnecessary end() calls.
if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
stream._final(function (err) {
  state.pendingcb--;
  if (err) {
    stream.emit('error', err);
  }
  state.prefinished = true;
  stream.emit('prefinish');
  finishMaybe(stream, state);
});
}
function prefinish(stream, state) {
if (!state.prefinished && !state.finalCalled) {
  if (typeof stream._final === 'function') {
    state.pendingcb++;
    state.finalCalled = true;
    processNextTick(callFinal, stream, state);
  } else {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}
}

function finishMaybe(stream, state) {
var need = needFinish(state);
if (need) {
  prefinish(stream, state);
  if (state.pendingcb === 0) {
    state.finished = true;
    stream.emit('finish');
  }
}
return need;
}

function endWritable(stream, state, cb) {
state.ending = true;
finishMaybe(stream, state);
if (cb) {
  if (state.finished) processNextTick(cb);else stream.once('finish', cb);
}
state.ended = true;
stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
var entry = corkReq.entry;
corkReq.entry = null;
while (entry) {
  var cb = entry.callback;
  state.pendingcb--;
  cb(err);
  entry = entry.next;
}
if (state.corkedRequestsFree) {
  state.corkedRequestsFree.next = corkReq;
} else {
  state.corkedRequestsFree = corkReq;
}
}

Object.defineProperty(Writable.prototype, 'destroyed', {
get: function () {
  if (this._writableState === undefined) {
    return false;
  }
  return this._writableState.destroyed;
},
set: function (value) {
  // we ignore the value if the stream
  // has not been initialized yet
  if (!this._writableState) {
    return;
  }

  // backward compatibility, the user is explicitly
  // managing destroyed
  this._writableState.destroyed = value;
}
});

Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
this.end();
cb(err);
};
}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./_stream_duplex":74,"./internal/streams/destroy":80,"./internal/streams/stream":81,"_process":69,"core-util-is":26,"inherits":33,"process-nextick-args":68,"safe-buffer":83,"util-deprecate":92}],79:[function(_dereq_,module,exports){
'use strict';

/*<replacement>*/

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Buffer = _dereq_('safe-buffer').Buffer;
/*</replacement>*/

function copyBuffer(src, target, offset) {
src.copy(target, offset);
}

module.exports = function () {
function BufferList() {
  _classCallCheck(this, BufferList);

  this.head = null;
  this.tail = null;
  this.length = 0;
}

BufferList.prototype.push = function push(v) {
  var entry = { data: v, next: null };
  if (this.length > 0) this.tail.next = entry;else this.head = entry;
  this.tail = entry;
  ++this.length;
};

BufferList.prototype.unshift = function unshift(v) {
  var entry = { data: v, next: this.head };
  if (this.length === 0) this.tail = entry;
  this.head = entry;
  ++this.length;
};

BufferList.prototype.shift = function shift() {
  if (this.length === 0) return;
  var ret = this.head.data;
  if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
  --this.length;
  return ret;
};

BufferList.prototype.clear = function clear() {
  this.head = this.tail = null;
  this.length = 0;
};

BufferList.prototype.join = function join(s) {
  if (this.length === 0) return '';
  var p = this.head;
  var ret = '' + p.data;
  while (p = p.next) {
    ret += s + p.data;
  }return ret;
};

BufferList.prototype.concat = function concat(n) {
  if (this.length === 0) return Buffer.alloc(0);
  if (this.length === 1) return this.head.data;
  var ret = Buffer.allocUnsafe(n >>> 0);
  var p = this.head;
  var i = 0;
  while (p) {
    copyBuffer(p.data, ret, i);
    i += p.data.length;
    p = p.next;
  }
  return ret;
};

return BufferList;
}();
},{"safe-buffer":83}],80:[function(_dereq_,module,exports){
'use strict';

/*<replacement>*/

var processNextTick = _dereq_('process-nextick-args');
/*</replacement>*/

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
var _this = this;

var readableDestroyed = this._readableState && this._readableState.destroyed;
var writableDestroyed = this._writableState && this._writableState.destroyed;

if (readableDestroyed || writableDestroyed) {
  if (cb) {
    cb(err);
  } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
    processNextTick(emitErrorNT, this, err);
  }
  return;
}

// we set destroyed to true before firing error callbacks in order
// to make it re-entrance safe in case destroy() is called within callbacks

if (this._readableState) {
  this._readableState.destroyed = true;
}

// if this is a duplex stream mark the writable part as destroyed as well
if (this._writableState) {
  this._writableState.destroyed = true;
}

this._destroy(err || null, function (err) {
  if (!cb && err) {
    processNextTick(emitErrorNT, _this, err);
    if (_this._writableState) {
      _this._writableState.errorEmitted = true;
    }
  } else if (cb) {
    cb(err);
  }
});
}

function undestroy() {
if (this._readableState) {
  this._readableState.destroyed = false;
  this._readableState.reading = false;
  this._readableState.ended = false;
  this._readableState.endEmitted = false;
}

if (this._writableState) {
  this._writableState.destroyed = false;
  this._writableState.ended = false;
  this._writableState.ending = false;
  this._writableState.finished = false;
  this._writableState.errorEmitted = false;
}
}

function emitErrorNT(self, err) {
self.emit('error', err);
}

module.exports = {
destroy: destroy,
undestroy: undestroy
};
},{"process-nextick-args":68}],81:[function(_dereq_,module,exports){
module.exports = _dereq_('events').EventEmitter;

},{"events":29}],82:[function(_dereq_,module,exports){
exports = module.exports = _dereq_('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = _dereq_('./lib/_stream_writable.js');
exports.Duplex = _dereq_('./lib/_stream_duplex.js');
exports.Transform = _dereq_('./lib/_stream_transform.js');
exports.PassThrough = _dereq_('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":74,"./lib/_stream_passthrough.js":75,"./lib/_stream_readable.js":76,"./lib/_stream_transform.js":77,"./lib/_stream_writable.js":78}],83:[function(_dereq_,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = _dereq_('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
for (var key in src) {
  dst[key] = src[key]
}
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
module.exports = buffer
} else {
// Copy properties from _dereq_('buffer')
copyProps(buffer, exports)
exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
if (typeof arg === 'number') {
  throw new TypeError('Argument must not be a number')
}
return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
if (typeof size !== 'number') {
  throw new TypeError('Argument must be a number')
}
var buf = Buffer(size)
if (fill !== undefined) {
  if (typeof encoding === 'string') {
    buf.fill(fill, encoding)
  } else {
    buf.fill(fill)
  }
} else {
  buf.fill(0)
}
return buf
}

SafeBuffer.allocUnsafe = function (size) {
if (typeof size !== 'number') {
  throw new TypeError('Argument must be a number')
}
return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
if (typeof size !== 'number') {
  throw new TypeError('Argument must be a number')
}
return buffer.SlowBuffer(size)
}

},{"buffer":23}],84:[function(_dereq_,module,exports){
(function (global){
var ClientRequest = _dereq_('./lib/request')
var extend = _dereq_('xtend')
var statusCodes = _dereq_('builtin-status-codes')
var url = _dereq_('url')

var http = exports

http.request = function (opts, cb) {
if (typeof opts === 'string')
  opts = url.parse(opts)
else
  opts = extend(opts)

// Normally, the page is loaded from http or https, so not specifying a protocol
// will result in a (valid) protocol-relative url. However, this won't work if
// the protocol is something else, like 'file:'
var defaultProtocol = global.location.protocol.search(/^https?:$/) === -1 ? 'http:' : ''

var protocol = opts.protocol || defaultProtocol
var host = opts.hostname || opts.host
var port = opts.port
var path = opts.path || '/'

// Necessary for IPv6 addresses
if (host && host.indexOf(':') !== -1)
  host = '[' + host + ']'

// This may be a relative url. The browser should always be able to interpret it correctly.
opts.url = (host ? (protocol + '//' + host) : '') + (port ? ':' + port : '') + path
opts.method = (opts.method || 'GET').toUpperCase()
opts.headers = opts.headers || {}

// Also valid opts.auth, opts.mode

var req = new ClientRequest(opts)
if (cb)
  req.on('response', cb)
return req
}

http.get = function get (opts, cb) {
var req = http.request(opts, cb)
req.end()
return req
}

http.Agent = function () {}
http.Agent.defaultMaxSockets = 4

http.STATUS_CODES = statusCodes

http.METHODS = [
'CHECKOUT',
'CONNECT',
'COPY',
'DELETE',
'GET',
'HEAD',
'LOCK',
'M-SEARCH',
'MERGE',
'MKACTIVITY',
'MKCOL',
'MOVE',
'NOTIFY',
'OPTIONS',
'PATCH',
'POST',
'PROPFIND',
'PROPPATCH',
'PURGE',
'PUT',
'REPORT',
'SEARCH',
'SUBSCRIBE',
'TRACE',
'UNLOCK',
'UNSUBSCRIBE'
]
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./lib/request":86,"builtin-status-codes":24,"url":90,"xtend":93}],85:[function(_dereq_,module,exports){
(function (global){
exports.fetch = isFunction(global.fetch) && isFunction(global.ReadableStream)

exports.blobConstructor = false
try {
new Blob([new ArrayBuffer(1)])
exports.blobConstructor = true
} catch (e) {}

// The xhr request to example.com may violate some restrictive CSP configurations,
// so if we're running in a browser that supports `fetch`, avoid calling getXHR()
// and assume support for certain features below.
var xhr
function getXHR () {
// Cache the xhr value
if (xhr !== undefined) return xhr

if (global.XMLHttpRequest) {
  xhr = new global.XMLHttpRequest()
  // If XDomainRequest is available (ie only, where xhr might not work
  // cross domain), use the page location. Otherwise use example.com
  // Note: this doesn't actually make an http request.
  try {
    xhr.open('GET', global.XDomainRequest ? '/' : 'https://example.com')
  } catch(e) {
    xhr = null
  }
} else {
  // Service workers don't have XHR
  xhr = null
}
return xhr
}

function checkTypeSupport (type) {
var xhr = getXHR()
if (!xhr) return false
try {
  xhr.responseType = type
  return xhr.responseType === type
} catch (e) {}
return false
}

// For some strange reason, Safari 7.0 reports typeof global.ArrayBuffer === 'object'.
// Safari 7.1 appears to have fixed this bug.
var haveArrayBuffer = typeof global.ArrayBuffer !== 'undefined'
var haveSlice = haveArrayBuffer && isFunction(global.ArrayBuffer.prototype.slice)

// If fetch is supported, then arraybuffer will be supported too. Skip calling
// checkTypeSupport(), since that calls getXHR().
exports.arraybuffer = exports.fetch || (haveArrayBuffer && checkTypeSupport('arraybuffer'))

// These next two tests unavoidably show warnings in Chrome. Since fetch will always
// be used if it's available, just return false for these to avoid the warnings.
exports.msstream = !exports.fetch && haveSlice && checkTypeSupport('ms-stream')
exports.mozchunkedarraybuffer = !exports.fetch && haveArrayBuffer &&
checkTypeSupport('moz-chunked-arraybuffer')

// If fetch is supported, then overrideMimeType will be supported too. Skip calling
// getXHR().
exports.overrideMimeType = exports.fetch || (getXHR() ? isFunction(getXHR().overrideMimeType) : false)

exports.vbArray = isFunction(global.VBArray)

function isFunction (value) {
return typeof value === 'function'
}

xhr = null // Help gc

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],86:[function(_dereq_,module,exports){
(function (process,global,Buffer){
var capability = _dereq_('./capability')
var inherits = _dereq_('inherits')
var response = _dereq_('./response')
var stream = _dereq_('readable-stream')
var toArrayBuffer = _dereq_('to-arraybuffer')

var IncomingMessage = response.IncomingMessage
var rStates = response.readyStates

function decideMode (preferBinary, useFetch) {
if (capability.fetch && useFetch) {
  return 'fetch'
} else if (capability.mozchunkedarraybuffer) {
  return 'moz-chunked-arraybuffer'
} else if (capability.msstream) {
  return 'ms-stream'
} else if (capability.arraybuffer && preferBinary) {
  return 'arraybuffer'
} else if (capability.vbArray && preferBinary) {
  return 'text:vbarray'
} else {
  return 'text'
}
}

var ClientRequest = module.exports = function (opts) {
var self = this
stream.Writable.call(self)

self._opts = opts
self._body = []
self._headers = {}
if (opts.auth)
  self.setHeader('Authorization', 'Basic ' + new Buffer(opts.auth).toString('base64'))
Object.keys(opts.headers).forEach(function (name) {
  self.setHeader(name, opts.headers[name])
})

var preferBinary
var useFetch = true
if (opts.mode === 'disable-fetch' || 'timeout' in opts) {
  // If the use of XHR should be preferred and includes preserving the 'content-type' header.
  // Force XHR to be used since the Fetch API does not yet support timeouts.
  useFetch = false
  preferBinary = true
} else if (opts.mode === 'prefer-streaming') {
  // If streaming is a high priority but binary compatibility and
  // the accuracy of the 'content-type' header aren't
  preferBinary = false
} else if (opts.mode === 'allow-wrong-content-type') {
  // If streaming is more important than preserving the 'content-type' header
  preferBinary = !capability.overrideMimeType
} else if (!opts.mode || opts.mode === 'default' || opts.mode === 'prefer-fast') {
  // Use binary if text streaming may corrupt data or the content-type header, or for speed
  preferBinary = true
} else {
  throw new Error('Invalid value for opts.mode')
}
self._mode = decideMode(preferBinary, useFetch)

self.on('finish', function () {
  self._onFinish()
})
}

inherits(ClientRequest, stream.Writable)

ClientRequest.prototype.setHeader = function (name, value) {
var self = this
var lowerName = name.toLowerCase()
// This check is not necessary, but it prevents warnings from browsers about setting unsafe
// headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
// http-browserify did it, so I will too.
if (unsafeHeaders.indexOf(lowerName) !== -1)
  return

self._headers[lowerName] = {
  name: name,
  value: value
}
}

ClientRequest.prototype.getHeader = function (name) {
var header = this._headers[name.toLowerCase()]
if (header)
  return header.value
return null
}

ClientRequest.prototype.removeHeader = function (name) {
var self = this
delete self._headers[name.toLowerCase()]
}

ClientRequest.prototype._onFinish = function () {
var self = this

if (self._destroyed)
  return
var opts = self._opts

var headersObj = self._headers
var body = null
if (opts.method !== 'GET' && opts.method !== 'HEAD') {
  if (capability.blobConstructor) {
    body = new global.Blob(self._body.map(function (buffer) {
      return toArrayBuffer(buffer)
    }), {
      type: (headersObj['content-type'] || {}).value || ''
    })
  } else {
    // get utf8 string
    body = Buffer.concat(self._body).toString()
  }
}

// create flattened list of headers
var headersList = []
Object.keys(headersObj).forEach(function (keyName) {
  var name = headersObj[keyName].name
  var value = headersObj[keyName].value
  if (Array.isArray(value)) {
    value.forEach(function (v) {
      headersList.push([name, v])
    })
  } else {
    headersList.push([name, value])
  }
})

if (self._mode === 'fetch') {
  global.fetch(self._opts.url, {
    method: self._opts.method,
    headers: headersList,
    body: body || undefined,
    mode: 'cors',
    credentials: opts.withCredentials ? 'include' : 'same-origin'
  }).then(function (response) {
    self._fetchResponse = response
    self._connect()
  }, function (reason) {
    self.emit('error', reason)
  })
} else {
  var xhr = self._xhr = new global.XMLHttpRequest()
  try {
    xhr.open(self._opts.method, self._opts.url, true)
  } catch (err) {
    process.nextTick(function () {
      self.emit('error', err)
    })
    return
  }

  // Can't set responseType on really old browsers
  if ('responseType' in xhr)
    xhr.responseType = self._mode.split(':')[0]

  if ('withCredentials' in xhr)
    xhr.withCredentials = !!opts.withCredentials

  if (self._mode === 'text' && 'overrideMimeType' in xhr)
    xhr.overrideMimeType('text/plain; charset=x-user-defined')

  if ('timeout' in opts) {
    xhr.timeout = opts.timeout
    xhr.ontimeout = function () {
      self.emit('timeout')
    }
  }

  headersList.forEach(function (header) {
    xhr.setRequestHeader(header[0], header[1])
  })

  self._response = null
  xhr.onreadystatechange = function () {
    switch (xhr.readyState) {
      case rStates.LOADING:
      case rStates.DONE:
        self._onXHRProgress()
        break
    }
  }
  // Necessary for streaming in Firefox, since xhr.response is ONLY defined
  // in onprogress, not in onreadystatechange with xhr.readyState = 3
  if (self._mode === 'moz-chunked-arraybuffer') {
    xhr.onprogress = function () {
      self._onXHRProgress()
    }
  }

  xhr.onerror = function () {
    if (self._destroyed)
      return
    self.emit('error', new Error('XHR error'))
  }

  try {
    xhr.send(body)
  } catch (err) {
    process.nextTick(function () {
      self.emit('error', err)
    })
    return
  }
}
}

/**
* Checks if xhr.status is readable and non-zero, indicating no error.
* Even though the spec says it should be available in readyState 3,
* accessing it throws an exception in IE8
*/
function statusValid (xhr) {
try {
  var status = xhr.status
  return (status !== null && status !== 0)
} catch (e) {
  return false
}
}

ClientRequest.prototype._onXHRProgress = function () {
var self = this

if (!statusValid(self._xhr) || self._destroyed)
  return

if (!self._response)
  self._connect()

self._response._onXHRProgress()
}

ClientRequest.prototype._connect = function () {
var self = this

if (self._destroyed)
  return

self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode)
self._response.on('error', function(err) {
  self.emit('error', err)
})

self.emit('response', self._response)
}

ClientRequest.prototype._write = function (chunk, encoding, cb) {
var self = this

self._body.push(chunk)
cb()
}

ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function () {
var self = this
self._destroyed = true
if (self._response)
  self._response._destroyed = true
if (self._xhr)
  self._xhr.abort()
// Currently, there isn't a way to truly abort a fetch.
// If you like bikeshedding, see https://github.com/whatwg/fetch/issues/27
}

ClientRequest.prototype.end = function (data, encoding, cb) {
var self = this
if (typeof data === 'function') {
  cb = data
  data = undefined
}

stream.Writable.prototype.end.call(self, data, encoding, cb)
}

ClientRequest.prototype.flushHeaders = function () {}
ClientRequest.prototype.setTimeout = function () {}
ClientRequest.prototype.setNoDelay = function () {}
ClientRequest.prototype.setSocketKeepAlive = function () {}

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
var unsafeHeaders = [
'accept-charset',
'accept-encoding',
'access-control-request-headers',
'access-control-request-method',
'connection',
'content-length',
'cookie',
'cookie2',
'date',
'dnt',
'expect',
'host',
'keep-alive',
'origin',
'referer',
'te',
'trailer',
'transfer-encoding',
'upgrade',
'user-agent',
'via'
]

}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},_dereq_("buffer").Buffer)

},{"./capability":85,"./response":87,"_process":69,"buffer":23,"inherits":33,"readable-stream":82,"to-arraybuffer":89}],87:[function(_dereq_,module,exports){
(function (process,global,Buffer){
var capability = _dereq_('./capability')
var inherits = _dereq_('inherits')
var stream = _dereq_('readable-stream')

var rStates = exports.readyStates = {
UNSENT: 0,
OPENED: 1,
HEADERS_RECEIVED: 2,
LOADING: 3,
DONE: 4
}

var IncomingMessage = exports.IncomingMessage = function (xhr, response, mode) {
var self = this
stream.Readable.call(self)

self._mode = mode
self.headers = {}
self.rawHeaders = []
self.trailers = {}
self.rawTrailers = []

// Fake the 'close' event, but only once 'end' fires
self.on('end', function () {
  // The nextTick is necessary to prevent the 'request' module from causing an infinite loop
  process.nextTick(function () {
    self.emit('close')
  })
})

if (mode === 'fetch') {
  self._fetchResponse = response

  self.url = response.url
  self.statusCode = response.status
  self.statusMessage = response.statusText

  response.headers.forEach(function(header, key){
    self.headers[key.toLowerCase()] = header
    self.rawHeaders.push(key, header)
  })


  // TODO: this doesn't respect backpressure. Once WritableStream is available, this can be fixed
  var reader = response.body.getReader()
  function read () {
    reader.read().then(function (result) {
      if (self._destroyed)
        return
      if (result.done) {
        self.push(null)
        return
      }
      self.push(new Buffer(result.value))
      read()
    }).catch(function(err) {
      self.emit('error', err)
    })
  }
  read()

} else {
  self._xhr = xhr
  self._pos = 0

  self.url = xhr.responseURL
  self.statusCode = xhr.status
  self.statusMessage = xhr.statusText
  var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
  headers.forEach(function (header) {
    var matches = header.match(/^([^:]+):\s*(.*)/)
    if (matches) {
      var key = matches[1].toLowerCase()
      if (key === 'set-cookie') {
        if (self.headers[key] === undefined) {
          self.headers[key] = []
        }
        self.headers[key].push(matches[2])
      } else if (self.headers[key] !== undefined) {
        self.headers[key] += ', ' + matches[2]
      } else {
        self.headers[key] = matches[2]
      }
      self.rawHeaders.push(matches[1], matches[2])
    }
  })

  self._charset = 'x-user-defined'
  if (!capability.overrideMimeType) {
    var mimeType = self.rawHeaders['mime-type']
    if (mimeType) {
      var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
      if (charsetMatch) {
        self._charset = charsetMatch[1].toLowerCase()
      }
    }
    if (!self._charset)
      self._charset = 'utf-8' // best guess
  }
}
}

inherits(IncomingMessage, stream.Readable)

IncomingMessage.prototype._read = function () {}

IncomingMessage.prototype._onXHRProgress = function () {
var self = this

var xhr = self._xhr

var response = null
switch (self._mode) {
  case 'text:vbarray': // For IE9
    if (xhr.readyState !== rStates.DONE)
      break
    try {
      // This fails in IE8
      response = new global.VBArray(xhr.responseBody).toArray()
    } catch (e) {}
    if (response !== null) {
      self.push(new Buffer(response))
      break
    }
    // Falls through in IE8
  case 'text':
    try { // This will fail when readyState = 3 in IE9. Switch mode and wait for readyState = 4
      response = xhr.responseText
    } catch (e) {
      self._mode = 'text:vbarray'
      break
    }
    if (response.length > self._pos) {
      var newData = response.substr(self._pos)
      if (self._charset === 'x-user-defined') {
        var buffer = new Buffer(newData.length)
        for (var i = 0; i < newData.length; i++)
          buffer[i] = newData.charCodeAt(i) & 0xff

        self.push(buffer)
      } else {
        self.push(newData, self._charset)
      }
      self._pos = response.length
    }
    break
  case 'arraybuffer':
    if (xhr.readyState !== rStates.DONE || !xhr.response)
      break
    response = xhr.response
    self.push(new Buffer(new Uint8Array(response)))
    break
  case 'moz-chunked-arraybuffer': // take whole
    response = xhr.response
    if (xhr.readyState !== rStates.LOADING || !response)
      break
    self.push(new Buffer(new Uint8Array(response)))
    break
  case 'ms-stream':
    response = xhr.response
    if (xhr.readyState !== rStates.LOADING)
      break
    var reader = new global.MSStreamReader()
    reader.onprogress = function () {
      if (reader.result.byteLength > self._pos) {
        self.push(new Buffer(new Uint8Array(reader.result.slice(self._pos))))
        self._pos = reader.result.byteLength
      }
    }
    reader.onload = function () {
      self.push(null)
    }
    // reader.onerror = ??? // TODO: this
    reader.readAsArrayBuffer(response)
    break
}

// The ms-stream case handles end separately in reader.onload()
if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
  self.push(null)
}
}

}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},_dereq_("buffer").Buffer)

},{"./capability":85,"_process":69,"buffer":23,"inherits":33,"readable-stream":82}],88:[function(_dereq_,module,exports){
'use strict';

var Buffer = _dereq_('safe-buffer').Buffer;

var isEncoding = Buffer.isEncoding || function (encoding) {
encoding = '' + encoding;
switch (encoding && encoding.toLowerCase()) {
  case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
    return true;
  default:
    return false;
}
};

function _normalizeEncoding(enc) {
if (!enc) return 'utf8';
var retried;
while (true) {
  switch (enc) {
    case 'utf8':
    case 'utf-8':
      return 'utf8';
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return 'utf16le';
    case 'latin1':
    case 'binary':
      return 'latin1';
    case 'base64':
    case 'ascii':
    case 'hex':
      return enc;
    default:
      if (retried) return; // undefined
      enc = ('' + enc).toLowerCase();
      retried = true;
  }
}
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
var nenc = _normalizeEncoding(enc);
if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
this.encoding = normalizeEncoding(encoding);
var nb;
switch (this.encoding) {
  case 'utf16le':
    this.text = utf16Text;
    this.end = utf16End;
    nb = 4;
    break;
  case 'utf8':
    this.fillLast = utf8FillLast;
    nb = 4;
    break;
  case 'base64':
    this.text = base64Text;
    this.end = base64End;
    nb = 3;
    break;
  default:
    this.write = simpleWrite;
    this.end = simpleEnd;
    return;
}
this.lastNeed = 0;
this.lastTotal = 0;
this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
if (buf.length === 0) return '';
var r;
var i;
if (this.lastNeed) {
  r = this.fillLast(buf);
  if (r === undefined) return '';
  i = this.lastNeed;
  this.lastNeed = 0;
} else {
  i = 0;
}
if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
if (this.lastNeed <= buf.length) {
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
  return this.lastChar.toString(this.encoding, 0, this.lastTotal);
}
buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte.
function utf8CheckByte(byte) {
if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
return -1;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
var j = buf.length - 1;
if (j < i) return 0;
var nb = utf8CheckByte(buf[j]);
if (nb >= 0) {
  if (nb > 0) self.lastNeed = nb - 1;
  return nb;
}
if (--j < i) return 0;
nb = utf8CheckByte(buf[j]);
if (nb >= 0) {
  if (nb > 0) self.lastNeed = nb - 2;
  return nb;
}
if (--j < i) return 0;
nb = utf8CheckByte(buf[j]);
if (nb >= 0) {
  if (nb > 0) {
    if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
  }
  return nb;
}
return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// UTF-8 replacement characters ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
if ((buf[0] & 0xC0) !== 0x80) {
  self.lastNeed = 0;
  return '\ufffd'.repeat(p);
}
if (self.lastNeed > 1 && buf.length > 1) {
  if ((buf[1] & 0xC0) !== 0x80) {
    self.lastNeed = 1;
    return '\ufffd'.repeat(p + 1);
  }
  if (self.lastNeed > 2 && buf.length > 2) {
    if ((buf[2] & 0xC0) !== 0x80) {
      self.lastNeed = 2;
      return '\ufffd'.repeat(p + 2);
    }
  }
}
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
var p = this.lastTotal - this.lastNeed;
var r = utf8CheckExtraBytes(this, buf, p);
if (r !== undefined) return r;
if (this.lastNeed <= buf.length) {
  buf.copy(this.lastChar, p, 0, this.lastNeed);
  return this.lastChar.toString(this.encoding, 0, this.lastTotal);
}
buf.copy(this.lastChar, p, 0, buf.length);
this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
var total = utf8CheckIncomplete(this, buf, i);
if (!this.lastNeed) return buf.toString('utf8', i);
this.lastTotal = total;
var end = buf.length - (total - this.lastNeed);
buf.copy(this.lastChar, 0, end);
return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character for each buffered byte of a (partial)
// character needs to be added to the output.
function utf8End(buf) {
var r = buf && buf.length ? this.write(buf) : '';
if (this.lastNeed) return r + '\ufffd'.repeat(this.lastTotal - this.lastNeed);
return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
if ((buf.length - i) % 2 === 0) {
  var r = buf.toString('utf16le', i);
  if (r) {
    var c = r.charCodeAt(r.length - 1);
    if (c >= 0xD800 && c <= 0xDBFF) {
      this.lastNeed = 2;
      this.lastTotal = 4;
      this.lastChar[0] = buf[buf.length - 2];
      this.lastChar[1] = buf[buf.length - 1];
      return r.slice(0, -1);
    }
  }
  return r;
}
this.lastNeed = 1;
this.lastTotal = 2;
this.lastChar[0] = buf[buf.length - 1];
return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
var r = buf && buf.length ? this.write(buf) : '';
if (this.lastNeed) {
  var end = this.lastTotal - this.lastNeed;
  return r + this.lastChar.toString('utf16le', 0, end);
}
return r;
}

function base64Text(buf, i) {
var n = (buf.length - i) % 3;
if (n === 0) return buf.toString('base64', i);
this.lastNeed = 3 - n;
this.lastTotal = 3;
if (n === 1) {
  this.lastChar[0] = buf[buf.length - 1];
} else {
  this.lastChar[0] = buf[buf.length - 2];
  this.lastChar[1] = buf[buf.length - 1];
}
return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
var r = buf && buf.length ? this.write(buf) : '';
if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
return buf.toString(this.encoding);
}

function simpleEnd(buf) {
return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":83}],89:[function(_dereq_,module,exports){
var Buffer = _dereq_('buffer').Buffer

module.exports = function (buf) {
// If the buffer is backed by a Uint8Array, a faster version will work
if (buf instanceof Uint8Array) {
  // If the buffer isn't a subarray, return the underlying ArrayBuffer
  if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
    return buf.buffer
  } else if (typeof buf.buffer.slice === 'function') {
    // Otherwise we need to get a proper copy
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  }
}

if (Buffer.isBuffer(buf)) {
  // This is the slow version that will work with any Buffer
  // implementation (even in old browsers)
  var arrayCopy = new Uint8Array(buf.length)
  var len = buf.length
  for (var i = 0; i < len; i++) {
    arrayCopy[i] = buf[i]
  }
  return arrayCopy.buffer
} else {
  throw new Error('Argument must be a Buffer')
}
}

},{"buffer":23}],90:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = _dereq_('punycode');
var util = _dereq_('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
this.protocol = null;
this.slashes = null;
this.auth = null;
this.host = null;
this.port = null;
this.hostname = null;
this.hash = null;
this.search = null;
this.query = null;
this.pathname = null;
this.path = null;
this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
  portPattern = /:[0-9]*$/,

  // Special case for a simple path URL
  simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

  // RFC 2396: characters reserved for delimiting URLs.
  // We actually just auto-escape these.
  delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

  // RFC 2396: characters not allowed for various reasons.
  unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

  // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
  autoEscape = ['\''].concat(unwise),
  // Characters that are never ever allowed in a hostname.
  // Note that any invalid chars are also handled, but these
  // are the ones that are *expected* to be seen, so we fast-path
  // them.
  nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
  hostEndingChars = ['/', '?', '#'],
  hostnameMaxLen = 255,
  hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
  hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
  // protocols that can allow "unsafe" and "unwise" chars.
  unsafeProtocol = {
    'javascript': true,
    'javascript:': true
  },
  // protocols that never have a hostname.
  hostlessProtocol = {
    'javascript': true,
    'javascript:': true
  },
  // protocols that always contain a // bit.
  slashedProtocol = {
    'http': true,
    'https': true,
    'ftp': true,
    'gopher': true,
    'file': true,
    'http:': true,
    'https:': true,
    'ftp:': true,
    'gopher:': true,
    'file:': true
  },
  querystring = _dereq_('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
if (url && util.isObject(url) && url instanceof Url) return url;

var u = new Url;
u.parse(url, parseQueryString, slashesDenoteHost);
return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
if (!util.isString(url)) {
  throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
}

// Copy chrome, IE, opera backslash-handling behavior.
// Back slashes before the query string get converted to forward slashes
// See: https://code.google.com/p/chromium/issues/detail?id=25916
var queryIndex = url.indexOf('?'),
    splitter =
        (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
    uSplit = url.split(splitter),
    slashRegex = /\\/g;
uSplit[0] = uSplit[0].replace(slashRegex, '/');
url = uSplit.join(splitter);

var rest = url;

// trim before proceeding.
// This is to support parse stuff like "  http://foo.com  \n"
rest = rest.trim();

if (!slashesDenoteHost && url.split('#').length === 1) {
  // Try fast path regexp
  var simplePath = simplePathPattern.exec(rest);
  if (simplePath) {
    this.path = rest;
    this.href = rest;
    this.pathname = simplePath[1];
    if (simplePath[2]) {
      this.search = simplePath[2];
      if (parseQueryString) {
        this.query = querystring.parse(this.search.substr(1));
      } else {
        this.query = this.search.substr(1);
      }
    } else if (parseQueryString) {
      this.search = '';
      this.query = {};
    }
    return this;
  }
}

var proto = protocolPattern.exec(rest);
if (proto) {
  proto = proto[0];
  var lowerProto = proto.toLowerCase();
  this.protocol = lowerProto;
  rest = rest.substr(proto.length);
}

// figure out if it's got a host
// user@server is *always* interpreted as a hostname, and url
// resolution will treat //foo/bar as host=foo,path=bar because that's
// how the browser resolves relative URLs.
if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
  var slashes = rest.substr(0, 2) === '//';
  if (slashes && !(proto && hostlessProtocol[proto])) {
    rest = rest.substr(2);
    this.slashes = true;
  }
}

if (!hostlessProtocol[proto] &&
    (slashes || (proto && !slashedProtocol[proto]))) {

  // there's a hostname.
  // the first instance of /, ?, ;, or # ends the host.
  //
  // If there is an @ in the hostname, then non-host chars *are* allowed
  // to the left of the last @ sign, unless some host-ending character
  // comes *before* the @-sign.
  // URLs are obnoxious.
  //
  // ex:
  // http://a@b@c/ => user:a@b host:c
  // http://a@b?@c => user:a host:c path:/?@c

  // v0.12 TODO(isaacs): This is not quite how Chrome does things.
  // Review our test case against browsers more comprehensively.

  // find the first instance of any hostEndingChars
  var hostEnd = -1;
  for (var i = 0; i < hostEndingChars.length; i++) {
    var hec = rest.indexOf(hostEndingChars[i]);
    if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
      hostEnd = hec;
  }

  // at this point, either we have an explicit point where the
  // auth portion cannot go past, or the last @ char is the decider.
  var auth, atSign;
  if (hostEnd === -1) {
    // atSign can be anywhere.
    atSign = rest.lastIndexOf('@');
  } else {
    // atSign must be in auth portion.
    // http://a@b/c@d => host:b auth:a path:/c@d
    atSign = rest.lastIndexOf('@', hostEnd);
  }

  // Now we have a portion which is definitely the auth.
  // Pull that off.
  if (atSign !== -1) {
    auth = rest.slice(0, atSign);
    rest = rest.slice(atSign + 1);
    this.auth = decodeURIComponent(auth);
  }

  // the host is the remaining to the left of the first non-host char
  hostEnd = -1;
  for (var i = 0; i < nonHostChars.length; i++) {
    var hec = rest.indexOf(nonHostChars[i]);
    if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
      hostEnd = hec;
  }
  // if we still have not hit it, then the entire thing is a host.
  if (hostEnd === -1)
    hostEnd = rest.length;

  this.host = rest.slice(0, hostEnd);
  rest = rest.slice(hostEnd);

  // pull out port.
  this.parseHost();

  // we've indicated that there is a hostname,
  // so even if it's empty, it has to be present.
  this.hostname = this.hostname || '';

  // if hostname begins with [ and ends with ]
  // assume that it's an IPv6 address.
  var ipv6Hostname = this.hostname[0] === '[' &&
      this.hostname[this.hostname.length - 1] === ']';

  // validate a little.
  if (!ipv6Hostname) {
    var hostparts = this.hostname.split(/\./);
    for (var i = 0, l = hostparts.length; i < l; i++) {
      var part = hostparts[i];
      if (!part) continue;
      if (!part.match(hostnamePartPattern)) {
        var newpart = '';
        for (var j = 0, k = part.length; j < k; j++) {
          if (part.charCodeAt(j) > 127) {
            // we replace non-ASCII char with a temporary placeholder
            // we need this to make sure size of hostname is not
            // broken by replacing non-ASCII by nothing
            newpart += 'x';
          } else {
            newpart += part[j];
          }
        }
        // we test again with ASCII char only
        if (!newpart.match(hostnamePartPattern)) {
          var validParts = hostparts.slice(0, i);
          var notHost = hostparts.slice(i + 1);
          var bit = part.match(hostnamePartStart);
          if (bit) {
            validParts.push(bit[1]);
            notHost.unshift(bit[2]);
          }
          if (notHost.length) {
            rest = '/' + notHost.join('.') + rest;
          }
          this.hostname = validParts.join('.');
          break;
        }
      }
    }
  }

  if (this.hostname.length > hostnameMaxLen) {
    this.hostname = '';
  } else {
    // hostnames are always lower case.
    this.hostname = this.hostname.toLowerCase();
  }

  if (!ipv6Hostname) {
    // IDNA Support: Returns a punycoded representation of "domain".
    // It only converts parts of the domain name that
    // have non-ASCII characters, i.e. it doesn't matter if
    // you call it with a domain that already is ASCII-only.
    this.hostname = punycode.toASCII(this.hostname);
  }

  var p = this.port ? ':' + this.port : '';
  var h = this.hostname || '';
  this.host = h + p;
  this.href += this.host;

  // strip [ and ] from the hostname
  // the host field still retains them, though
  if (ipv6Hostname) {
    this.hostname = this.hostname.substr(1, this.hostname.length - 2);
    if (rest[0] !== '/') {
      rest = '/' + rest;
    }
  }
}

// now rest is set to the post-host stuff.
// chop off any delim chars.
if (!unsafeProtocol[lowerProto]) {

  // First, make 100% sure that any "autoEscape" chars get
  // escaped, even if encodeURIComponent doesn't think they
  // need to be.
  for (var i = 0, l = autoEscape.length; i < l; i++) {
    var ae = autoEscape[i];
    if (rest.indexOf(ae) === -1)
      continue;
    var esc = encodeURIComponent(ae);
    if (esc === ae) {
      esc = escape(ae);
    }
    rest = rest.split(ae).join(esc);
  }
}


// chop off from the tail first.
var hash = rest.indexOf('#');
if (hash !== -1) {
  // got a fragment string.
  this.hash = rest.substr(hash);
  rest = rest.slice(0, hash);
}
var qm = rest.indexOf('?');
if (qm !== -1) {
  this.search = rest.substr(qm);
  this.query = rest.substr(qm + 1);
  if (parseQueryString) {
    this.query = querystring.parse(this.query);
  }
  rest = rest.slice(0, qm);
} else if (parseQueryString) {
  // no query string, but parseQueryString still requested
  this.search = '';
  this.query = {};
}
if (rest) this.pathname = rest;
if (slashedProtocol[lowerProto] &&
    this.hostname && !this.pathname) {
  this.pathname = '/';
}

//to support http.request
if (this.pathname || this.search) {
  var p = this.pathname || '';
  var s = this.search || '';
  this.path = p + s;
}

// finally, reconstruct the href based on what has been validated.
this.href = this.format();
return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
// ensure it's an object, and not a string url.
// If it's an obj, this is a no-op.
// this way, you can call url_format() on strings
// to clean up potentially wonky urls.
if (util.isString(obj)) obj = urlParse(obj);
if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
return obj.format();
}

Url.prototype.format = function() {
var auth = this.auth || '';
if (auth) {
  auth = encodeURIComponent(auth);
  auth = auth.replace(/%3A/i, ':');
  auth += '@';
}

var protocol = this.protocol || '',
    pathname = this.pathname || '',
    hash = this.hash || '',
    host = false,
    query = '';

if (this.host) {
  host = auth + this.host;
} else if (this.hostname) {
  host = auth + (this.hostname.indexOf(':') === -1 ?
      this.hostname :
      '[' + this.hostname + ']');
  if (this.port) {
    host += ':' + this.port;
  }
}

if (this.query &&
    util.isObject(this.query) &&
    Object.keys(this.query).length) {
  query = querystring.stringify(this.query);
}

var search = this.search || (query && ('?' + query)) || '';

if (protocol && protocol.substr(-1) !== ':') protocol += ':';

// only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
// unless they had them to begin with.
if (this.slashes ||
    (!protocol || slashedProtocol[protocol]) && host !== false) {
  host = '//' + (host || '');
  if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
} else if (!host) {
  host = '';
}

if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
if (search && search.charAt(0) !== '?') search = '?' + search;

pathname = pathname.replace(/[?#]/g, function(match) {
  return encodeURIComponent(match);
});
search = search.replace('#', '%23');

return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
if (!source) return relative;
return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
if (util.isString(relative)) {
  var rel = new Url();
  rel.parse(relative, false, true);
  relative = rel;
}

var result = new Url();
var tkeys = Object.keys(this);
for (var tk = 0; tk < tkeys.length; tk++) {
  var tkey = tkeys[tk];
  result[tkey] = this[tkey];
}

// hash is always overridden, no matter what.
// even href="" will remove it.
result.hash = relative.hash;

// if the relative url is empty, then there's nothing left to do here.
if (relative.href === '') {
  result.href = result.format();
  return result;
}

// hrefs like //foo/bar always cut to the protocol.
if (relative.slashes && !relative.protocol) {
  // take everything except the protocol from relative
  var rkeys = Object.keys(relative);
  for (var rk = 0; rk < rkeys.length; rk++) {
    var rkey = rkeys[rk];
    if (rkey !== 'protocol')
      result[rkey] = relative[rkey];
  }

  //urlParse appends trailing / to urls like http://www.example.com
  if (slashedProtocol[result.protocol] &&
      result.hostname && !result.pathname) {
    result.path = result.pathname = '/';
  }

  result.href = result.format();
  return result;
}

if (relative.protocol && relative.protocol !== result.protocol) {
  // if it's a known url protocol, then changing
  // the protocol does weird things
  // first, if it's not file:, then we MUST have a host,
  // and if there was a path
  // to begin with, then we MUST have a path.
  // if it is file:, then the host is dropped,
  // because that's known to be hostless.
  // anything else is assumed to be absolute.
  if (!slashedProtocol[relative.protocol]) {
    var keys = Object.keys(relative);
    for (var v = 0; v < keys.length; v++) {
      var k = keys[v];
      result[k] = relative[k];
    }
    result.href = result.format();
    return result;
  }

  result.protocol = relative.protocol;
  if (!relative.host && !hostlessProtocol[relative.protocol]) {
    var relPath = (relative.pathname || '').split('/');
    while (relPath.length && !(relative.host = relPath.shift()));
    if (!relative.host) relative.host = '';
    if (!relative.hostname) relative.hostname = '';
    if (relPath[0] !== '') relPath.unshift('');
    if (relPath.length < 2) relPath.unshift('');
    result.pathname = relPath.join('/');
  } else {
    result.pathname = relative.pathname;
  }
  result.search = relative.search;
  result.query = relative.query;
  result.host = relative.host || '';
  result.auth = relative.auth;
  result.hostname = relative.hostname || relative.host;
  result.port = relative.port;
  // to support http.request
  if (result.pathname || result.search) {
    var p = result.pathname || '';
    var s = result.search || '';
    result.path = p + s;
  }
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
}

var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
    isRelAbs = (
        relative.host ||
        relative.pathname && relative.pathname.charAt(0) === '/'
    ),
    mustEndAbs = (isRelAbs || isSourceAbs ||
                  (result.host && relative.pathname)),
    removeAllDots = mustEndAbs,
    srcPath = result.pathname && result.pathname.split('/') || [],
    relPath = relative.pathname && relative.pathname.split('/') || [],
    psychotic = result.protocol && !slashedProtocol[result.protocol];

// if the url is a non-slashed url, then relative
// links like ../.. should be able
// to crawl up to the hostname, as well.  This is strange.
// result.protocol has already been set by now.
// Later on, put the first path part into the host field.
if (psychotic) {
  result.hostname = '';
  result.port = null;
  if (result.host) {
    if (srcPath[0] === '') srcPath[0] = result.host;
    else srcPath.unshift(result.host);
  }
  result.host = '';
  if (relative.protocol) {
    relative.hostname = null;
    relative.port = null;
    if (relative.host) {
      if (relPath[0] === '') relPath[0] = relative.host;
      else relPath.unshift(relative.host);
    }
    relative.host = null;
  }
  mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
}

if (isRelAbs) {
  // it's absolute.
  result.host = (relative.host || relative.host === '') ?
                relative.host : result.host;
  result.hostname = (relative.hostname || relative.hostname === '') ?
                    relative.hostname : result.hostname;
  result.search = relative.search;
  result.query = relative.query;
  srcPath = relPath;
  // fall through to the dot-handling below.
} else if (relPath.length) {
  // it's relative
  // throw away the existing file, and take the new path instead.
  if (!srcPath) srcPath = [];
  srcPath.pop();
  srcPath = srcPath.concat(relPath);
  result.search = relative.search;
  result.query = relative.query;
} else if (!util.isNullOrUndefined(relative.search)) {
  // just pull out the search.
  // like href='?foo'.
  // Put this after the other two cases because it simplifies the booleans
  if (psychotic) {
    result.hostname = result.host = srcPath.shift();
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }
  result.search = relative.search;
  result.query = relative.query;
  //to support http.request
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.href = result.format();
  return result;
}

if (!srcPath.length) {
  // no path at all.  easy.
  // we've already handled the other stuff above.
  result.pathname = null;
  //to support http.request
  if (result.search) {
    result.path = '/' + result.search;
  } else {
    result.path = null;
  }
  result.href = result.format();
  return result;
}

// if a url ENDs in . or .., then it must get a trailing slash.
// however, if it ends in anything else non-slashy,
// then it must NOT get a trailing slash.
var last = srcPath.slice(-1)[0];
var hasTrailingSlash = (
    (result.host || relative.host || srcPath.length > 1) &&
    (last === '.' || last === '..') || last === '');

// strip single dots, resolve double dots to parent dir
// if the path tries to go above the root, `up` ends up > 0
var up = 0;
for (var i = srcPath.length; i >= 0; i--) {
  last = srcPath[i];
  if (last === '.') {
    srcPath.splice(i, 1);
  } else if (last === '..') {
    srcPath.splice(i, 1);
    up++;
  } else if (up) {
    srcPath.splice(i, 1);
    up--;
  }
}

// if the path is allowed to go above the root, restore leading ..s
if (!mustEndAbs && !removeAllDots) {
  for (; up--; up) {
    srcPath.unshift('..');
  }
}

if (mustEndAbs && srcPath[0] !== '' &&
    (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
  srcPath.unshift('');
}

if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
  srcPath.push('');
}

var isAbsolute = srcPath[0] === '' ||
    (srcPath[0] && srcPath[0].charAt(0) === '/');

// put the host back
if (psychotic) {
  result.hostname = result.host = isAbsolute ? '' :
                                  srcPath.length ? srcPath.shift() : '';
  //occationaly the auth can get stuck only in host
  //this especially happens in cases like
  //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
  var authInHost = result.host && result.host.indexOf('@') > 0 ?
                   result.host.split('@') : false;
  if (authInHost) {
    result.auth = authInHost.shift();
    result.host = result.hostname = authInHost.shift();
  }
}

mustEndAbs = mustEndAbs || (result.host && srcPath.length);

if (mustEndAbs && !isAbsolute) {
  srcPath.unshift('');
}

if (!srcPath.length) {
  result.pathname = null;
  result.path = null;
} else {
  result.pathname = srcPath.join('/');
}

//to support request.http
if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
  result.path = (result.pathname ? result.pathname : '') +
                (result.search ? result.search : '');
}
result.auth = relative.auth || result.auth;
result.slashes = result.slashes || relative.slashes;
result.href = result.format();
return result;
};

Url.prototype.parseHost = function() {
var host = this.host;
var port = portPattern.exec(host);
if (port) {
  port = port[0];
  if (port !== ':') {
    this.port = port.substr(1);
  }
  host = host.substr(0, host.length - port.length);
}
if (host) this.hostname = host;
};

},{"./util":91,"punycode":70,"querystring":73}],91:[function(_dereq_,module,exports){
'use strict';

module.exports = {
isString: function(arg) {
  return typeof(arg) === 'string';
},
isObject: function(arg) {
  return typeof(arg) === 'object' && arg !== null;
},
isNull: function(arg) {
  return arg === null;
},
isNullOrUndefined: function(arg) {
  return arg == null;
}
};

},{}],92:[function(_dereq_,module,exports){
(function (global){

/**
* Module exports.
*/

module.exports = deprecate;

/**
* Mark that a method should not be used.
* Returns a modified function which warns once by default.
*
* If `localStorage.noDeprecation = true` is set, then it is a no-op.
*
* If `localStorage.throwDeprecation = true` is set, then deprecated functions
* will throw an Error when invoked.
*
* If `localStorage.traceDeprecation = true` is set, then deprecated functions
* will invoke `console.trace()` instead of `console.warn()`.
*
* @param {Function} fn - the function to deprecate
* @param {String} msg - the string to print to the console when `fn` is invoked
* @returns {Function} a new "deprecated" version of `fn`
* @api public
*/

function deprecate (fn, msg) {
if (config('noDeprecation')) {
  return fn;
}

var warned = false;
function deprecated() {
  if (!warned) {
    if (config('throwDeprecation')) {
      throw new Error(msg);
    } else if (config('traceDeprecation')) {
      console.trace(msg);
    } else {
      console.warn(msg);
    }
    warned = true;
  }
  return fn.apply(this, arguments);
}

return deprecated;
}

/**
* Checks `localStorage` for boolean values for the given `name`.
*
* @param {String} name
* @returns {Boolean}
* @api private
*/

function config (name) {
// accessing global.localStorage can trigger a DOMException in sandboxed iframes
try {
  if (!global.localStorage) return false;
} catch (_) {
  return false;
}
var val = global.localStorage[name];
if (null == val) return false;
return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],93:[function(_dereq_,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
  var target = {}

  for (var i = 0; i < arguments.length; i++) {
      var source = arguments[i]

      for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
              target[key] = source[key]
          }
      }
  }

  return target
}

},{}]},{},[3])(3)
});
//# sourceMappingURL=ref-parser.js.map
});

  var jsonSchemaRefParser$1 = /*#__PURE__*/Object.freeze({
      default: jsonSchemaRefParser
  });

  var require$$3 = ( jsonSchemaRefParser$1 && jsonSchemaRefParser ) || jsonSchemaRefParser$1;

  function _interopDefault$1 (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }


  var RandExp = _interopDefault$1(randexp);
  var deref = _interopDefault$1(lib$1);
  var jsonpath$1 = _interopDefault$1(jsonpath);
  var $RefParser = _interopDefault$1(require$$3);

  function template(value, schema) {
      if (Array.isArray(value)) {
          return value.map(function (x) { return template(x, schema); });
      }
      if (typeof value === 'string') {
          value = value.replace(/#\{([\w.-]+)\}/g, function (_, $1) { return schema[$1]; });
      }
      return value;
  }
  // dynamic proxy for custom generators
  function proxy(gen) {
      return function (value, schema, property, rootSchema) {
          var fn = value;
          var args = [];
          // support for nested object, first-key is the generator
          if (typeof value === 'object') {
              fn = Object.keys(value)[0];
              // treat the given array as arguments,
              if (Array.isArray(value[fn])) {
                  // if the generator is expecting arrays they should be nested, e.g. `[[1, 2, 3], true, ...]`
                  args = value[fn];
              }
              else {
                  args.push(value[fn]);
              }
          }
          // support for keypaths, e.g. "internet.email"
          var props = fn.split('.');
          // retrieve a fresh dependency
          var ctx = gen();
          while (props.length > 1) {
              ctx = ctx[props.shift()];
          }
          // retrieve last value from context object
          value = typeof ctx === 'object' ? ctx[props[0]] : ctx;
          // invoke dynamic generators
          if (typeof value === 'function') {
              value = value.apply(ctx, args.map(function (x) { return template(x, rootSchema); }));
          }
          // test for pending callbacks
          if (Object.prototype.toString.call(value) === '[object Object]') {
              for (var key in value) {
                  if (typeof value[key] === 'function') {
                      throw new Error('Cannot resolve value for "' + property + ': ' + fn + '", given: ' + value);
                  }
              }
          }
          return value;
      };
  }
  /**
   * Container is used to wrap external generators (faker, chance, casual, etc.) and its dependencies.
   *
   * - `jsf.extend('faker')` will enhance or define the given dependency.
   * - `jsf.define('faker')` will provide the "faker" keyword support.
   *
   * RandExp is not longer considered an "extension".
   */
  var Container = /** @class */ (function () {
      function Container() {
          // dynamic requires - handle all dependencies
          // they will NOT be included on the bundle
          this.registry = {};
          this.support = {};
      }
      /**
       * Override dependency given by name
       * @param name
       * @param callback
       */
      Container.prototype.extend = function (name, callback) {
          var _this = this;
          this.registry[name] = callback(this.registry[name]);
          // built-in proxy (can be overridden)
          if (!this.support[name]) {
              this.support[name] = proxy(function () { return _this.registry[name]; });
          }
      };
      /**
       * Set keyword support by name
       * @param name
       * @param callback
       */
      Container.prototype.define = function (name, callback) {
          this.support[name] = callback;
      };
      /**
       * Returns dependency given by name
       * @param name
       * @returns {Dependency}
       */
      Container.prototype.get = function (name) {
          if (typeof this.registry[name] === 'undefined') {
              throw new ReferenceError('"' + name + '" dependency doesn\'t exist.');
          }
          return this.registry[name];
      };
      /**
       * Apply a custom keyword
       * @param schema
       */
      Container.prototype.wrap = function (schema) {
          var keys = Object.keys(schema);
          var length = keys.length;
          var context = {};
          while (length--) {
              var fn = keys[length].replace(/^x-/, '');

              /**
               * CHANGE: This Makes sure that we're not using Object's prototype properties,
               * while accessing certain keys like 'constructor'
               */
              var gen = this.support.hasOwnProperty(fn) && this.support[fn];
              if (typeof gen === 'function') {
                if (typeof schema[fn] === 'object' && schema[fn].hasOwnProperty('type')) {
                  continue;
                }
                  Object.defineProperty(schema, 'generate', {
                      configurable: false,
                      enumerable: false,
                      writable: false,
                      value: function (rootSchema) { return gen.call(context, schema[keys[length]], schema, keys[length], rootSchema); },
                  });
                  break;
              }
          }
          return schema;
      };
      return Container;
  }());

  /**
   * This class defines a registry for custom formats used within JSF.
   */
  var Registry = /** @class */ (function () {
      function Registry() {
          // empty by default
          this.data = {};
      }
      /**
       * Registers custom format
       */
      Registry.prototype.register = function (name, callback) {
          this.data[name] = callback;
      };
      /**
       * Register many formats at one shot
       */
      Registry.prototype.registerMany = function (formats) {
          for (var name in formats) {
              this.data[name] = formats[name];
          }
      };
      /**
       * Returns element by registry key
       */
      Registry.prototype.get = function (name) {
          var format = this.data[name];
          return format;
      };
      /**
       * Returns the whole registry content
       */
      Registry.prototype.list = function () {
          return this.data;
      };
      return Registry;
  }());

  // instantiate
  var registry = new Registry();
  /**
   * Custom format API
   *
   * @see https://github.com/json-schema-faker/json-schema-faker#custom-formats
   * @param nameOrFormatMap
   * @param callback
   * @returns {any}
   */
  function formatAPI(nameOrFormatMap, callback) {
      if (typeof nameOrFormatMap === 'undefined') {
          return registry.list();
      }
      else if (typeof nameOrFormatMap === 'string') {
          if (typeof callback === 'function') {
              registry.register(nameOrFormatMap, callback);
          }
          else {
              return registry.get(nameOrFormatMap);
          }
      }
      else {
          registry.registerMany(nameOrFormatMap);
      }
  }

  /**
   * This class defines a registry for custom settings used within JSF.
   */
  var OptionRegistry = /** @class */ (function (_super) {
      tslib_es6.__extends(OptionRegistry, _super);
      function OptionRegistry() {
          var _this = _super.call(this) || this;
          _this.data = _this.defaults;
          return _this;
      }
      Object.defineProperty(OptionRegistry.prototype, "defaults", {
          get: function () {
              var data = {};
              data['defaultInvalidTypeProduct'] = null;
              data['defaultRandExpMax'] = 10;
              data['ignoreProperties'] = [];
              data['ignoreMissingRefs'] = false;
              data['failOnInvalidTypes'] = true;
              data['failOnInvalidFormat'] = true;
              data['alwaysFakeOptionals'] = false;
              data['fixedProbabilities'] = true;
              data['optionalsProbability'] = 0.0;
              data['useDefaultValue'] = false;
              data['useExamplesValue'] = false;
              data['avoidExampleItemsLength'] = false;
              data['requiredOnly'] = false;
              data['minItems'] = 0;
              data['maxItems'] = null;
              data['defaultMinItems'] = 2;
              data['defaultMaxItems'] = 2;
              data['maxLength'] = null;
              data['resolveJsonPath'] = false;
              data['reuseProperties'] = false;
              data['fillProperties'] = true;
              data['random'] = Math.random;
              return data;
          },
          enumerable: true,
          configurable: true
      });
      return OptionRegistry;
  }(Registry));

  // instantiate
  var registry$1 = new OptionRegistry();
  /**
   * Custom option API
   *
   * @param nameOrOptionMap
   * @returns {any}
   */
  function optionAPI(nameOrOptionMap) {
      if (typeof nameOrOptionMap === 'string') {
          return registry$1.get(nameOrOptionMap);
      }
      else {
          return registry$1.registerMany(nameOrOptionMap);
      }
  }
  optionAPI.getDefaults = function () { return registry$1.defaults; };

  var ALL_TYPES = ['array', 'object', 'integer', 'number', 'string', 'boolean', 'null'];
  var MOST_NEAR_DATETIME = 2524608000000;
  var MIN_INTEGER = -100000000;
  var MAX_INTEGER = 100000000;
  var MIN_NUMBER = -100;
  var MAX_NUMBER = 100;
  var env = {
      ALL_TYPES: ALL_TYPES,
      MIN_NUMBER: MIN_NUMBER,
      MAX_NUMBER: MAX_NUMBER,
      MIN_INTEGER: MIN_INTEGER,
      MAX_INTEGER: MAX_INTEGER,
      MOST_NEAR_DATETIME: MOST_NEAR_DATETIME,
  };

  /// <reference path="../index.d.ts" />
  function _randexp(value) {
      // set maximum default, see #193
      RandExp.prototype.max = optionAPI('defaultRandExpMax');
      // same implementation as the original except using our random
      RandExp.prototype.randInt = function (a, b) {
          return a + Math.floor(optionAPI('random')() * (1 + b - a));
      };
      var re = new RandExp(value);
      return re.gen();
  }
  /**
   * Returns random element of a collection
   *
   * @param collection
   * @returns {T}
   */
  function pick(collection) {
      return collection[Math.floor(optionAPI('random')() * collection.length)];
  }
  /**
   * Returns shuffled collection of elements
   *
   * @param collection
   * @returns {T[]}
   */
  function shuffle(collection) {
      var tmp, key, copy = collection.slice(), length = collection.length;
      for (; length > 0;) {
          key = Math.floor(optionAPI('random')() * length);
          // swap
          tmp = copy[--length];
          copy[length] = copy[key];
          copy[key] = tmp;
      }
      return copy;
  }
  /**
   * Returns a random integer between min (inclusive) and max (inclusive)
   * Using Math.round() will give you a non-uniform distribution!
   * @see http://stackoverflow.com/a/1527820/769384
   */
  function getRandom(min, max) {
      return optionAPI('random')() * (max - min) + min;
  }
  /**
   * Generates random number according to parameters passed
   *
   * @param min
   * @param max
   * @param defMin
   * @param defMax
   * @param hasPrecision
   * @returns {number}
   */
  function number(min, max, defMin, defMax, hasPrecision) {
      if (hasPrecision === void 0) { hasPrecision = false; }
      defMin = typeof defMin === 'undefined' ? env.MIN_NUMBER : defMin;
      defMax = typeof defMax === 'undefined' ? env.MAX_NUMBER : defMax;
      min = typeof min === 'undefined' ? defMin : min;
      max = typeof max === 'undefined' ? defMax : max;
      if (max < min) {
          max += min;
      }
      var result = getRandom(min, max);
      if (!hasPrecision) {
          return Math.round(result);
      }
      return result;
  }
  function by(type) {
      switch (type) {
          case 'seconds':
              return number(0, 60) * 60;
          case 'minutes':
              return number(15, 50) * 612;
          case 'hours':
              return number(12, 72) * 36123;
          case 'days':
              return number(7, 30) * 86412345;
          case 'weeks':
              return number(4, 52) * 604812345;
          case 'months':
              return number(2, 13) * 2592012345;
          case 'years':
              return number(1, 20) * 31104012345;
      }
  }
  function date(step) {
      if (step) {
          return by(step);
      }
      var now = new Date();
      var days = number(-1000, env.MOST_NEAR_DATETIME);
      now.setTime(now.getTime() - days);
      return now;
  }
  var random = {
      pick: pick,
      date: date,
      randexp: _randexp,
      shuffle: shuffle,
      number: number,
  };

  function getSubAttribute(obj, dotSeparatedKey) {
      var keyElements = dotSeparatedKey.split('.');
      while (keyElements.length) {
          var prop = keyElements.shift();
          if (!obj[prop]) {
              break;
          }
          obj = obj[prop];
      }
      return obj;
  }
  /**
   * Returns true/false whether the object parameter has its own properties defined
   *
   * @param obj
   * @param properties
   * @returns {boolean}
   */
  function hasProperties(obj) {
      var properties = [];
      for (var _i = 1; _i < arguments.length; _i++) {
          properties[_i - 1] = arguments[_i];
      }
      return properties.filter(function (key) {
          return typeof obj[key] !== 'undefined';
      }).length > 0;
  }
  /**
   * Returns typecasted value.
   * External generators (faker, chance, casual) may return data in non-expected formats, such as string, when you might expect an
   * integer. This function is used to force the typecast. This is the base formatter for all result values.
   *
   * @param schema
   * @param callback
   * @returns {any}
   */
  function typecast(schema, callback) {
      var params = {};
      // normalize constraints
      switch (schema.type) {
          case 'integer':
          case 'number':
              if (typeof schema.minimum !== 'undefined') {
                  params.minimum = schema.minimum;
              }
              if (typeof schema.maximum !== 'undefined') {
                  params.maximum = schema.maximum;
              }
              if (schema.enum) {
                  var min = Math.max(params.minimum || 0, 0);
                  var max = Math.min(params.maximum || Infinity, Infinity);
                  min = handleExclusiveMinimum(schema, min);
                  max = handleExclusiveMaximum(schema, max);
                  // discard out-of-bounds enumerations
                  schema.enum = schema.enum.filter(function (x) {
                      if (x >= min && x <= max) {
                          return true;
                      }
                      return false;
                  });
              }
              break;
          case 'string':
              if (typeof schema.minLength !== 'undefined') {
                  params.minLength = schema.minLength;
              }
              if (typeof schema.maxLength !== 'undefined') {
                  params.maxLength = schema.maxLength;
              }
              var _maxLength = optionAPI('maxLength');
              var _minLength = optionAPI('minLength');
              // Don't allow user to set max length above our maximum
              if (_maxLength && params.maxLength > _maxLength) {
                  params.maxLength = _maxLength;
              }
              // Don't allow user to set min length above our maximum
              if (_minLength && params.minLength < _minLength) {
                  params.minLength = _minLength;
              }
              break;
      }
      // execute generator
      var value = callback(params);

      /**
       * CHANGE: This Makes sure that we're not typecasting null to "null"
       */
      if (_.get(schema, 'nullable') && value === null) {
        return value;
      }

      // normalize output value
      switch (schema.type) {
          case 'number':
              value = parseFloat(value);
              break;
          case 'integer':
              value = parseInt(value, 10);
              break;
          case 'boolean':
              value = !!value;
              break;
          case 'string':
              value = String(value);
              var min = Math.max(params.minLength || 0, 0);
              var max = Math.min(params.maxLength || Infinity, Infinity);
              while (value.length < min) {
                  /**
                   * CHANGE: This Makes sure that we're not adding extra spaces in generated value,
                   * As such behaviour generates invalid data when pattern is mentioned.
                   *
                   * To avoid infinite loop, make sure we keep adding spaces in cases where value is empty string
                   */
                  value += ((schema.pattern && value.length !== 0) ? '' : ' ') + value;
              }
              if (value.length > max) {
                  value = value.substr(0, max);
              }
              break;
      }
      return value;
  }
  function merge(a, b) {
      for (var key in b) {
          if (typeof b[key] !== 'object' || b[key] === null) {
              a[key] = b[key];
          }
          else if (Array.isArray(b[key])) {
              a[key] = a[key] || [];
              // fix #292 - skip duplicated values from merge object (b)
              b[key].forEach(function (value) {
                  if (a[key].indexOf(value) === -1) {
                      a[key].push(value);
                  }
              });
          }
          else if (typeof a[key] !== 'object' || a[key] === null || Array.isArray(a[key])) {
              a[key] = merge({}, b[key]);
          }
          else {
              a[key] = merge(a[key], b[key]);
          }
      }
      return a;
  }
  function clean(obj, isArray, requiredProps) {
      if (!obj || typeof obj !== 'object') {
          return obj;
      }
      if (Array.isArray(obj)) {
          obj = obj
              .map(function (value) { return clean(value, true, requiredProps); })
              .filter(function (value) { return typeof value !== 'undefined'; });
          return obj;
      }
      Object.keys(obj).forEach(function (k) {
          if (!requiredProps || requiredProps.indexOf(k) === -1) {
              if (Array.isArray(obj[k]) && !obj[k].length) {
                  delete obj[k];
              }
          }
          else {
              obj[k] = clean(obj[k]);
          }
      });
      if (!Object.keys(obj).length && isArray) {
          return undefined;
      }
      return obj;
  }
  function short(schema) {
      var s = JSON.stringify(schema);
      var l = JSON.stringify(schema, null, 2);
      return s.length > 400 ? l.substr(0, 400) + '...' : l;
  }
  function anyValue() {
      return random.pick([
          false,
          true,
          null,
          -1,
          NaN,
          Math.PI,
          Infinity,
          undefined,
          [],
          {},
          Math.random(),
          Math.random().toString(36).substr(2),
      ]);
  }
  function notValue(schema, parent) {
      var copy = merge({}, parent);
      if (typeof schema.minimum !== 'undefined') {
          copy.maximum = schema.minimum;
          copy.exclusiveMaximum = true;
      }
      if (typeof schema.maximum !== 'undefined') {
          copy.minimum = schema.maximum > copy.maximum ? 0 : schema.maximum;
          copy.exclusiveMinimum = true;
      }
      if (typeof schema.minLength !== 'undefined') {
          copy.maxLength = schema.minLength;
      }
      if (typeof schema.maxLength !== 'undefined') {
          copy.minLength = schema.maxLength > copy.maxLength ? 0 : schema.maxLength;
      }
      if (schema.type) {
          copy.type = random.pick(env.ALL_TYPES.filter(function (x) {
              // treat both types as _similar enough_ to be skipped equal
              if (x === 'number' || x === 'integer') {
                  return schema.type !== 'number' && schema.type !== 'integer';
              }
              return x !== schema.type;
          }));
      }
      else if (schema.enum) {
          do {
              var value = anyValue();
          } while (schema.enum.indexOf(value) !== -1);
          copy.enum = [value];
      }
      if (schema.required && copy.properties) {
          schema.required.forEach(function (prop) {
              delete copy.properties[prop];
          });
      }
      // TODO: explore more scenarios
      return copy;
  }
  // FIXME: evaluate more constraints?
  function validate(value, schemas) {
      return !schemas.every(function (x) {
          if (typeof x.minimum !== 'undefined' && value >= x.minimum) {
              return true;
          }
          if (typeof x.maximum !== 'undefined' && value <= x.maximum) {
              return true;
          }
      });
  }
  function isKey(prop) {
      return prop === 'enum' || prop === 'default' || prop === 'required' || prop === 'definitions';
  }
  function omitProps(obj, props) {
      var copy = {};
      Object.keys(obj).forEach(function (k) {
          if (props.indexOf(k) === -1) {
              if (Array.isArray(obj[k])) {
                  copy[k] = obj[k].slice();
              }
              else {
                  copy[k] = typeof obj[k] === 'object'
                      ? merge({}, obj[k])
                      : obj[k];
              }
          }
      });
      return copy;
  }
  var utils = {
      getSubAttribute: getSubAttribute,
      hasProperties: hasProperties,
      omitProps: omitProps,
      typecast: typecast,
      merge: merge,
      clean: clean,
      short: short,
      notValue: notValue,
      anyValue: anyValue,
      validate: validate,
      isKey: isKey,
  };

  var ParseError = /** @class */ (function (_super) {
      tslib_es6.__extends(ParseError, _super);
      function ParseError(message, path) {
          var _this = _super.call(this) || this;
          _this.path = path;
          if (Error.captureStackTrace) {
              Error.captureStackTrace(_this, _this.constructor);
          }
          _this.name = 'ParseError';
          _this.message = message;
          _this.path = path;
          return _this;
      }
      return ParseError;
  }(Error));

  var inferredProperties = {
      array: [
          'additionalItems',
          'items',
          'maxItems',
          'minItems',
          'uniqueItems'
      ],
      integer: [
          'exclusiveMaximum',
          'exclusiveMinimum',
          'maximum',
          'minimum',
          'multipleOf'
      ],
      object: [
          'additionalProperties',
          'dependencies',
          'maxProperties',
          'minProperties',
          'patternProperties',
          'properties',
          'required'
      ],
      string: [
          'maxLength',
          'minLength',
          'pattern'
      ]
  };
  inferredProperties.number = inferredProperties.integer;
  var subschemaProperties = [
      'additionalItems',
      'items',
      'additionalProperties',
      'dependencies',
      'patternProperties',
      'properties'
  ];
  /**
   * Iterates through all keys of `obj` and:
   * - checks whether those keys match properties of a given inferred type
   * - makes sure that `obj` is not a subschema; _Do not attempt to infer properties named as subschema containers. The
   * reason for this is that any property name within those containers that matches one of the properties used for
   * inferring missing type values causes the container itself to get processed which leads to invalid output. (Issue 62)_
   *
   * @returns {boolean}
   */
  function matchesType(obj, lastElementInPath, inferredTypeProperties) {
      return Object.keys(obj).filter(function (prop) {
          var isSubschema = subschemaProperties.indexOf(lastElementInPath) > -1, inferredPropertyFound = inferredTypeProperties.indexOf(prop) > -1;
          if (inferredPropertyFound && !isSubschema) {
              return true;
          }
      }).length > 0;
  }
  /**
   * Checks whether given `obj` type might be inferred. The mechanism iterates through all inferred types definitions,
   * tries to match allowed properties with properties of given `obj`. Returns type name, if inferred, or null.
   *
   * @returns {string|null}
   */
  function inferType(obj, schemaPath) {
      for (var typeName in inferredProperties) {
          var lastElementInPath = schemaPath[schemaPath.length - 1];
          if (matchesType(obj, lastElementInPath, inferredProperties[typeName])) {
              return typeName;
          }
      }
  }

  /**
   * Generates randomized boolean value.
   *
   * @returns {boolean}
   */
  function booleanGenerator() {
      return optionAPI('random')() > 0.5;
  }

  var booleanType = booleanGenerator;

  /**
   * Generates null value.
   *
   * @returns {null}
   */
  function nullGenerator() {
      return null;
  }

  var nullType = nullGenerator;

  // TODO provide types
  function unique(path, items, value, sample, resolve, traverseCallback, seenSchemaCache) {
      var tmp = [], seen = [];
      function walk(obj) {
          var json = JSON.stringify(obj);
          if (seen.indexOf(json) === -1) {
              seen.push(json);
              tmp.push(obj);
          }
      }
      items.forEach(walk);
      // TODO: find a better solution?
      var limit = 10;
      while (tmp.length !== items.length) {
          walk(traverseCallback(value.items || sample, path, resolve, null, seenSchemaCache));
          if (!limit--) {
              break;
          }
      }
      return tmp;
  }
  // TODO provide types
  var arrayType = function arrayType(value, path, resolve, traverseCallback, seenSchemaCache) {
      var items = [];
      if (!(value.items || value.additionalItems)) {
          if (utils.hasProperties(value, 'minItems', 'maxItems', 'uniqueItems')) {
              throw new ParseError('missing items for ' + utils.short(value), path);
          }
          return items;
      }
      // see http://stackoverflow.com/a/38355228/769384
      // after type guards support subproperties (in TS 2.0) we can simplify below to (value.items instanceof Array)
      // so that value.items.map becomes recognized for typescript compiler
      var tmpItems = value.items;
      if (tmpItems instanceof Array) {
          return Array.prototype.concat.call(items, tmpItems.map(function (item, key) {
              var itemSubpath = path.concat(['items', key + '']);
              return traverseCallback(item, itemSubpath, resolve, null, seenSchemaCache);
          }));
      }
      var minItems = value.minItems;
      var maxItems = value.maxItems;

      /**
       * Json schema faker fakes exactly maxItems # of elements in array if present.
       * Hence we're keeping maxItems as minimum and valid as possible for schema faking (to lessen faked items)
       * Maximum allowed maxItems is set to 20, set by Json schema faker option.
       */
      // Override minItems to defaultMinItems if no minItems present
      if (typeof minItems !== 'number' && maxItems && maxItems >= optionAPI('defaultMinItems')) {
        minItems = optionAPI('defaultMinItems');
      }

      // Override maxItems to minItems if minItems is available
      if (typeof minItems === 'number' && minItems > 0) {
        maxItems = minItems;
      }

      // If no maxItems is defined than override with defaultMaxItems
      typeof maxItems !== 'number' && (maxItems = optionAPI('defaultMaxItems'));

      if (optionAPI('minItems') && minItems === undefined) {
          // fix boundaries
          minItems = !maxItems
              ? optionAPI('minItems')
              : Math.min(optionAPI('minItems'), maxItems);
      }
      if (optionAPI('maxItems')) {
          // Don't allow user to set max items above our maximum
          if (maxItems && maxItems > optionAPI('maxItems')) {
              maxItems = optionAPI('maxItems');
          }
          // Don't allow user to set min items above our maximum
          if (minItems && minItems > optionAPI('maxItems')) {
              minItems = maxItems;
          }
      }
      var optionalsProbability = optionAPI('alwaysFakeOptionals') === true ? 1.0 : optionAPI('optionalsProbability');
      var length = (maxItems != null && optionalsProbability)
          ? Math.round(maxItems * optionalsProbability)
          : random.number(minItems, maxItems, 1, 5),
      // TODO below looks bad. Should additionalItems be copied as-is?
      sample = typeof value.additionalItems === 'object' ? value.additionalItems : {};
      for (var current = items.length; current < length; current++) {
          var itemSubpath = path.concat(['items', current + '']);
          var element = traverseCallback(value.items || sample, itemSubpath, resolve, null, seenSchemaCache);
          items.push(element);
      }

      /**
       * Below condition puts more computation load to check unique data across multiple items by
       * traversing through all data and making sure it's unique.
       * As such only apply unique constraint when parameter resolution is set to "example".
       * As in other case, i.e. "schema", generated value for will be same anyways.
       */
      if (value.uniqueItems && optionAPI('useExamplesValue')) {
          return unique(path.concat(['items']), items, value, sample, resolve, traverseCallback, seenSchemaCache);
      }
      return items;
  };

  var numberType = function numberType(value) {
      var min = typeof value.minimum === 'undefined' ? env.MIN_INTEGER : value.minimum, max = typeof value.maximum === 'undefined' ? env.MAX_INTEGER : value.maximum, multipleOf = value.multipleOf;
      if (multipleOf) {
          max = Math.floor(max / multipleOf) * multipleOf;
          min = Math.ceil(min / multipleOf) * multipleOf;
      }
      min = handleExclusiveMinimum(value, min);
      max = handleExclusiveMaximum(value, max);
      if (min > max) {
          return NaN;
      }
      if (multipleOf) {
          if (String(multipleOf).indexOf('.') === -1) {
              var base = random.number(Math.floor(min / multipleOf), Math.floor(max / multipleOf)) * multipleOf;
              while (base < min) {
                  base += value.multipleOf;
              }
              return base;
          }
          var boundary = (max - min) / multipleOf;
          do {
              var num = random.number(0, boundary) * multipleOf;
              var fix = (num / multipleOf) % 1;
          } while (fix !== 0);
          return num;
      }
      return random.number(min, max, undefined, undefined, true);
  };

  // The `integer` type is just a wrapper for the `number` type. The `number` type
  // returns floating point numbers, and `integer` type truncates the fraction
  // part, leaving the result as an integer.
  var integerType = function integerType(value) {
      var generated = numberType(value);
      // whether the generated number is positive or negative, need to use either
      // floor (positive) or ceil (negative) function to get rid of the fraction
      return generated > 0 ? Math.floor(generated) : Math.ceil(generated);
  };

  var LIPSUM_WORDS = ('Lorem ipsum dolor sit amet consectetur adipisicing elit sed do eiusmod tempor incididunt ut labore'
      + ' et dolore magna aliqua Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea'
      + ' commodo consequat Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla'
      + ' pariatur Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est'
      + ' laborum').split(' ');
  /**
   * Generates randomized array of single lorem ipsum words.
   *
   * @param length
   * @returns {Array.<string>}
   */
  function wordsGenerator(length) {
      var words = random.shuffle(LIPSUM_WORDS);
      return words.slice(0, length);
  }

  // fallback generator
  var anyType = { type: ['string', 'number', 'integer', 'boolean'] };
  // TODO provide types
  // Updated objectType definition to latest version (0.5.0-rcv.41)
  var objectType = function objectType(value, path, resolve, traverseCallback, seenSchemaCache) {
    const props = {};

    const properties = value.properties || {};
    const patternProperties = value.patternProperties || {};
    const requiredProperties = (!Array.isArray(value.required)) ? [] : (value.required || []).slice();
    const allowsAdditional = value.additionalProperties !== false;

    const propertyKeys = Object.keys(properties);
    const patternPropertyKeys = Object.keys(patternProperties);
    const optionalProperties = propertyKeys.concat(patternPropertyKeys).reduce((_response, _key) => {
      if (requiredProperties.indexOf(_key) === -1) _response.push(_key);
      return _response;
    }, []);
    const allProperties = requiredProperties.concat(optionalProperties);

    const additionalProperties = allowsAdditional // eslint-disable-line
      ? (value.additionalProperties === true ? anyType : value.additionalProperties)
      : value.additionalProperties;

    if (!allowsAdditional
      && propertyKeys.length === 0
      && patternPropertyKeys.length === 0
      && utils.hasProperties(value, 'minProperties', 'maxProperties', 'dependencies', 'required')
    ) {
      // just nothing
      return null;
    }

    if (optionAPI('requiredOnly') === true) {
      requiredProperties.forEach(key => {
        if (properties[key]) {
          props[key] = properties[key];
        }
      });

      return traverseCallback(props, path.concat(['properties']), resolve, value, seenSchemaCache);
    }

    const optionalsProbability = optionAPI('alwaysFakeOptionals') === true ? 1.0 : optionAPI('optionalsProbability');
    const fixedProbabilities = optionAPI('alwaysFakeOptionals') || optionAPI('fixedProbabilities') || false;
    const ignoreProperties = optionAPI('ignoreProperties') || [];
    const reuseProps = optionAPI('reuseProperties');
    const fillProps = optionAPI('fillProperties');

    const max = value.maxProperties || (allProperties.length + (allowsAdditional ? random.number(1, 5) : 0));

    let min = Math.max(value.minProperties || 0, requiredProperties.length);
    let neededExtras = Math.max(0, allProperties.length - min);

    if (optionalsProbability !== null) {
      if (fixedProbabilities === true) {
        neededExtras = Math.round((min - requiredProperties.length) + (optionalsProbability * (allProperties.length - min)));
      } else {
        neededExtras = random.number(min - requiredProperties.length, optionalsProbability * (allProperties.length - min));
      }
    }

    const extraPropertiesRandomOrder = random.shuffle(optionalProperties).slice(0, neededExtras);
    const extraProperties = optionalProperties.filter(_item => {
      return extraPropertiesRandomOrder.indexOf(_item) !== -1;
    });

    // properties are read from right-to-left
    const _limit = optionalsProbability !== null || requiredProperties.length === max ? max : random.number(0, max);
    const _props = requiredProperties.concat(extraProperties).slice(0, max);
    const _defns = [];

    if (value.dependencies) {
      Object.keys(value.dependencies).forEach(prop => {
        const _required = value.dependencies[prop];

        if (_props.indexOf(prop) !== -1) {
          if (Array.isArray(_required)) {
            // property-dependencies
            _required.forEach(sub => {
              if (_props.indexOf(sub) === -1) {
                _props.push(sub);
              }
            });
          } else {
            _defns.push(_required);
          }
        }
      });

      // schema-dependencies
      if (_defns.length) {
        delete value.dependencies;

        return traverseCallback({
          allOf: _defns.concat(value),
        }, path.concat(['properties']), resolve, value, seenSchemaCache);
      }
    }

    const skipped = [];
    const missing = [];

    _props.forEach(key => {
      for (let i = 0; i < ignoreProperties.length; i += 1) {
        if ((ignoreProperties[i] instanceof RegExp && ignoreProperties[i].test(key))
          || (typeof ignoreProperties[i] === 'string' && ignoreProperties[i] === key)
          || (typeof ignoreProperties[i] === 'function' && ignoreProperties[i](properties[key], key))) {
          skipped.push(key);
          return;
        }
      }

      if (additionalProperties === false) {
        if (requiredProperties.indexOf(key) !== -1) {
          props[key] = properties[key];
        }
      }

      if (properties[key]) {
        props[key] = properties[key];
      }

      let found;

      // then try patternProperties
      patternPropertyKeys.forEach(_key => {
        if (key.match(new RegExp(_key))) {
          found = true;

          if (props[key]) {
            utils.merge(props[key], patternProperties[_key]);
          } else {
            props[random.randexp(key)] = patternProperties[_key];
          }
        }
      });

      if (!found) {
        // try patternProperties again,
        const subschema = patternProperties[key] || additionalProperties;

        // FIXME: allow anyType as fallback when no subschema is given?

        if (subschema && additionalProperties !== false) {
          // otherwise we can use additionalProperties?
          props[patternProperties[key] ? random.randexp(key) : key] = properties[key] || subschema;
        } else {
          missing.push(key);
        }
      }
    });

    // discard already ignored props if they're not required to be filled...
    let current = Object.keys(props).length + (fillProps ? 0 : skipped.length);

    // generate dynamic suffix for additional props...
    const hash = suffix => random.randexp(`_?[_a-f\\d]{1,3}${suffix ? '\\$?' : ''}`);

    function get(from) {
      let one;

      do {
        if (!from.length) break;
        one = from.shift();
      } while (props[one]);

      return one;
    }

    let minProps = min;
    if (allowsAdditional && !requiredProperties.length) {
      minProps = Math.max(optionalsProbability === null || additionalProperties ? random.number(fillProps ? 1 : 0, max) : 0, min);
    }

    while (fillProps) {
      if (!(patternPropertyKeys.length || allowsAdditional)) {
        break;
      }

      if (current >= minProps) {
        break;
      }

      if (allowsAdditional) {
        if (reuseProps && ((propertyKeys.length - current) > minProps)) {
          let count = 0;
          let key;

          do {
            count += 1;

            // skip large objects
            if (count > 1000) {
              break;
            }

            key = get(requiredProperties) || random.pick(propertyKeys);
          } while (typeof props[key] !== 'undefined');

          if (typeof props[key] === 'undefined') {
            props[key] = properties[key];
            current += 1;
          }
        } else if (patternPropertyKeys.length && !additionalProperties) {
          const prop = random.pick(patternPropertyKeys);
          const word = random.randexp(prop);

          if (!props[word]) {
            props[word] = patternProperties[prop];
            current += 1;
          }
        } else {
          const word = get(requiredProperties) || (wordsGenerator(1) + hash());

          if (!props[word]) {
            props[word] = additionalProperties || anyType;
            current += 1;
          }
        }
      }

      for (let i = 0; current < min && i < patternPropertyKeys.length; i += 1) {
        const _key = patternPropertyKeys[i];
        const word = random.randexp(_key);


        if (!props[word]) {
          props[word] = patternProperties[_key];
          current += 1;
        }
      }
    }

    // fill up-to this value and no more!
    if (requiredProperties.length === 0 && (!allowsAdditional || optionalsProbability === false)) {
      const maximum = random.number(min, max);

      for (; current < maximum;) {
        const word = get(propertyKeys);

        if (word) {
          props[word] = properties[word];
        }

        current += 1;
      }
    }

    return traverseCallback(props, path.concat(['properties']), resolve, value, seenSchemaCache);
  };

  /**
   * Helper function used by thunkGenerator to produce some words for the final result.
   *
   * @returns {string}
   */
  function produce() {
      var length = random.number(1, 5);
      return wordsGenerator(length).join(' ');
  }
  /**
   * Generates randomized concatenated string based on words generator.
   *
   * @returns {string}
   */
  function thunkGenerator(min, max) {
      if (min === void 0) { min = 0; }
      if (max === void 0) { max = 140; }
      var min = Math.max(0, min), max = random.number(min, max), result = produce();
      // append until length is reached
      while (result.length < min) {
          result += produce();
      }
      // cut if needed
      if (result.length > max) {
          result = result.substr(0, max);
      }
      return result;
  }

  /**
   * Generates randomized ipv4 address.
   *
   * @returns {string}
   */
  function ipv4Generator() {
      return [0, 0, 0, 0].map(function () {
          return random.number(0, 255);
      }).join('.');
  }

  /**
   * Generates randomized date time ISO format string.
   *
   * @returns {string}
   */
  function dateTimeGenerator() {
      return random.date().toISOString();
  }

  /**
   * Generates randomized date format string.
   *
   * @returns {string}
   */
  function dateGenerator() {
      return dateTimeGenerator().slice(0, 10);
  }

  /**
   * Generates randomized time format string.
   *
   * @returns {string}
   */
  function timeGenerator() {
      return dateTimeGenerator().slice(11);
  }

  /**
   * Added few formats from latest json-schema-faker. see below for source
   * https://github.com/json-schema-faker/json-schema-faker/blob/master/src/lib/generators/coreFormat.js
   *
   */
  const FRAGMENT = '[a-zA-Z][a-zA-Z0-9+-.]*';
  const URI_PATTERN = `https?://{hostname}(?:${FRAGMENT})+`;
  const PARAM_PATTERN = '(?:\\?([a-z]{1,7}(=\\w{1,5})?&){0,3})?';

  /**
   * Predefined core formats
   * @type {[key: string]: string}
   */
  var regexps = {
      email: '[a-zA-Z\\d][a-zA-Z\\d-]{1,13}[a-zA-Z\\d]@{hostname}',
      hostname: '[a-zA-Z]{1,33}\\.[a-z]{2,4}',
      ipv6: '[a-f\\d]{4}(:[a-f\\d]{4}){7}',
      uri: URI_PATTERN,
      slug: '[a-zA-Z\\d_-]+',

      // types from draft-0[67] (?)
      'uri-reference': `${URI_PATTERN}${PARAM_PATTERN}`,
      /**
       * CHANGE: Corrected uri-template format to be inline with RFC-6570
       * https://www.rfc-editor.org/rfc/rfc6570#section-2
       */
      'uri-template': URI_PATTERN.replace('(?:', '(?:/\\{[a-z][a-zA-Z0-9]*\\}|'),
      'json-pointer': `(/(?:${FRAGMENT.replace(']*', '/]*')}|~[01]))+`,

      // some types from https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#data-types (?)
      uuid: '^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$',
  };

  regexps.iri = regexps['uri-reference'];
  regexps['iri-reference'] = regexps['uri-reference'];

  regexps['idn-email'] = regexps.email;
  regexps['idn-hostname'] = regexps.hostname;

  /**
   * Generates randomized string basing on a built-in regex format
   *
   * @param coreFormat
   * @returns {string}
   */
  function coreFormatGenerator(coreFormat) {
      return random.randexp(regexps[coreFormat]).replace(/\{(\w+)\}/, function (match, key) {
          return random.randexp(regexps[key]);
      });
  }

  function generateFormat(value, invalid) {
      var callback = formatAPI(value.format);
      if (typeof callback === 'function') {
          return callback(value);
      }
      switch (value.format) {
          case 'date-time':
          case 'datetime':
              return dateTimeGenerator();
          case 'date':
              return dateGenerator();
          case 'time':
              return timeGenerator();
          case 'ipv4':
              return ipv4Generator();
          case 'regex':
              // TODO: discuss
              return '.+?';
          case 'email':
          case 'hostname':
          case 'ipv6':
          case 'uri':
          case 'uri-reference':
          case 'iri':
          case 'iri-reference':
          case 'idn-email':
          case 'idn-hostname':
          case 'json-pointer':
          case 'slug':
          case 'uri-template':
          case 'uuid':
              return coreFormatGenerator(value.format);
          default:
              if (typeof callback === 'undefined') {
                  if (optionAPI('failOnInvalidFormat')) {
                      throw new Error('unknown registry key ' + utils.short(value.format));
                  }
                  else {
                      return invalid();
                  }
              }
              throw new Error('unsupported format "' + value.format + '"');
      }
  }
  var stringType = function stringType(value) {
      var output;
      output = utils.typecast(value, function (opts) {
          if (value.format) {
              return generateFormat(value, function () { return thunkGenerator(opts.minLength, opts.maxLength); });
          }
          if (value.pattern) {
              return random.randexp(value.pattern);
          }
          return thunkGenerator(opts.minLength, opts.maxLength);
      });
      return output;
  };

  var typeMap = {
      boolean: booleanType,
      null: nullType,
      array: arrayType,
      integer: integerType,
      number: numberType,
      object: objectType,
      string: stringType
  };

  // TODO provide types
  function traverse(schema, path, resolve, rootSchema, seenSchemaCache) {
      schema = resolve(schema);
      if (!schema) {
        return;
      }
      if (optionAPI('useExamplesValue') && 'example' in schema) {
        var clonedSchema,
          result,
          isExampleValid,
          hashSchema = hash(schema);

        if(seenSchemaCache && seenSchemaCache.has(hashSchema)) {
          isExampleValid = seenSchemaCache.get(hashSchema);
        }
        else {
          // avoid minItems and maxItems while checking for valid examples
          if (optionAPI('avoidExampleItemsLength') && _.get(schema, 'type') === 'array') {
            clonedSchema = _.clone(schema);
            _.unset(clonedSchema, 'minItems');
            _.unset(clonedSchema, 'maxItems');

            // avoid validation of values that are in pm variable format (i.e. '{{userId}}')
            result = validateSchema(clonedSchema, schema.example, { ignoreUnresolvedVariables: true });
          }
          else {
            // avoid validation of values that are in pm variable format (i.e. '{{userId}}')
            result = validateSchema(schema, schema.example, { ignoreUnresolvedVariables: true });
          }

          // Store the final result that needs to be used in the seen map
          isExampleValid = result && result.length === 0;
          seenSchemaCache && seenSchemaCache.set(hashSchema, isExampleValid);
        }

        // Use example only if valid
        if (isExampleValid) {
          return schema.example;
        }
      }
      // use default as faked value if found as keyword in schema
      if (optionAPI('useDefaultValue') && 'default' in schema) {
        // to not use default as faked value in case it is actual property of schema
        if (!(_.has(schema.default, 'type') && _.includes(ALL_TYPES, schema.default.type))) {
          return schema.default;
        }
      }
      if (schema.not && typeof schema.not === 'object') {
          schema = utils.notValue(schema.not, utils.omitProps(schema, ['not']));
      }
      if (Array.isArray(schema.enum)) {
          return utils.typecast(schema, function () { return random.pick(schema.enum); });
      }
      // thunks can return sub-schemas
      if (typeof schema.thunk === 'function') {
          return traverse(schema.thunk(), path, resolve, null, seenSchemaCache);
      }
      if (typeof schema.generate === 'function') {
          return utils.typecast(schema, function () { return schema.generate(rootSchema); });
      }
      // TODO remove the ugly overcome
      var type = schema.type;
      if (Array.isArray(type)) {
          type = random.pick(type);
      }
      else if (typeof type === 'undefined') {
          // Attempt to infer the type
          type = inferType(schema, path) || type;
          if (type) {
              schema.type = type;
          }
      }
      if (typeof type === 'string') {
          if (!typeMap[type]) {
              if (optionAPI('failOnInvalidTypes')) {
                  throw new ParseError('unknown primitive ' + utils.short(type), path.concat(['type']));
              }
              else {
                  return optionAPI('defaultInvalidTypeProduct');
              }
          }
          else {
              try {
                  var result = typeMap[type](schema, path, resolve, traverse, seenSchemaCache);
                  var required = schema.items
                      ? schema.items.required
                      : schema.required;
                  return utils.clean(result, null, required);
              }
              catch (e) {
                  if (typeof e.path === 'undefined') {
                      throw new ParseError(e.message, path);
                  }
                  throw e;
              }
          }
      }
      var copy = {};
      if (Array.isArray(schema)) {
          copy = [];
      }
      for (var prop in schema) {
          if (typeof schema[prop] === 'object' && prop !== 'definitions') {
              copy[prop] = traverse(schema[prop], path.concat([prop]), resolve, copy, seenSchemaCache);
          }
          else {
              copy[prop] = schema[prop];
          }
      }
      return copy;
  }

  function pick$1(data) {
      return Array.isArray(data)
          ? random.pick(data)
          : data;
  }
  function cycle(data, reverse) {
      if (!Array.isArray(data)) {
          return data;
      }
      var value = reverse
          ? data.pop()
          : data.shift();
      if (reverse) {
          data.unshift(value);
      }
      else {
          data.push(value);
      }
      return value;
  }
  function resolve(obj, data, values, property) {
      if (!obj || typeof obj !== 'object') {
          return obj;
      }
      if (!values) {
          values = {};
      }
      if (!data) {
          data = obj;
      }
      if (Array.isArray(obj)) {
          return obj.map(function (x) { return resolve(x, data, values, property); });
      }
      if (obj.jsonPath) {
          var params = typeof obj.jsonPath !== 'object'
              ? { path: obj.jsonPath }
              : obj.jsonPath;
          params.group = obj.group || params.group || property;
          params.cycle = obj.cycle || params.cycle || false;
          params.reverse = obj.reverse || params.reverse || false;
          params.count = obj.count || params.count || 1;
          var key = params.group + "__" + params.path;
          if (!values[key]) {
              if (params.count > 1) {
                  values[key] = jsonpath$1.query(data, params.path, params.count);
              }
              else {
                  values[key] = jsonpath$1.value(data, params.path);
              }
          }
          if (params.cycle || params.reverse) {
              return cycle(values[key], params.reverse);
          }
          return pick$1(values[key]);
      }
      Object.keys(obj).forEach(function (k) {
          obj[k] = resolve(obj[k], data, values, k);
      });
      return obj;
  }
  // TODO provide types
  function run(refs, schema, container, seenSchemaCache) {
      try {
          var result = traverse(schema, [], function reduce(sub, maxReduceDepth) {
              if (typeof maxReduceDepth === 'undefined') {
                  maxReduceDepth = random.number(1, 3);
              }
              if (!sub) {
                  return null;
              }
              if (typeof sub.generate === 'function') {
                  return sub;
              }
              // cleanup
              if (sub.id && typeof sub.id === 'string') {
                  delete sub.id;
                  delete sub.$schema;
              }
              if (typeof sub.$ref === 'string') {
                  if (sub.$ref === '#') {
                      delete sub.$ref;
                      return sub;
                  }
                  if (sub.$ref.indexOf('#/') === -1) {
                      var ref = deref.util.findByRef(sub.$ref, refs);
                      if (!ref) {
                          throw new Error('Reference not found: ' + sub.$ref);
                      }
                      return ref;
                  }
                  // just remove the reference
                  delete sub.$ref;
                  return sub;
              }
              if (Array.isArray(sub.allOf)) {
                  var schemas = sub.allOf;
                  delete sub.allOf;
                  // this is the only case where all sub-schemas
                  // must be resolved before any merge
                  schemas.forEach(function (subSchema) {
                      var _sub = reduce(subSchema, maxReduceDepth + 1);
                      // call given thunks if present
                      utils.merge(sub, typeof _sub.thunk === 'function'
                          ? _sub.thunk()
                          : _sub);
                  });
              }
              if (Array.isArray(sub.oneOf || sub.anyOf)) {
                  var mix = sub.oneOf || sub.anyOf;
                  // test every value from the enum against each-oneOf
                  // schema, only values that validate once are kept
                  if (sub.enum && sub.oneOf) {
                      sub.enum = sub.enum.filter(function (x) { return utils.validate(x, mix); });
                  }
                  delete sub.anyOf;
                  delete sub.oneOf;
                  return {
                      thunk: function () {
                          var copy = utils.merge({}, sub);
                          utils.merge(copy, random.pick(mix));
                          return copy;
                      },
                  };
              }
              for (var prop in sub) {
                  if ((Array.isArray(sub[prop]) || typeof sub[prop] === 'object') && !utils.isKey(prop)) {
                      sub[prop] = reduce(sub[prop], maxReduceDepth);
                  }
              }
              return container.wrap(sub);
          }, null, seenSchemaCache);
          if (optionAPI('resolveJsonPath')) {
              return resolve(result);
          }
          return result;
      }
      catch (e) {
          if (e.path) {
              throw new Error(e.message + ' in ' + '/' + e.path.join('/'));
          }
          else {
              throw e;
          }
      }
  }

  var container = new Container();
  function getRefs(refs) {
      var $refs = {};
      if (Array.isArray(refs)) {
          refs.map(deref.util.normalizeSchema).forEach(function (schema) {
              $refs[schema.id] = schema;
          });
      }
      else {
          $refs = refs || {};
      }
      return $refs;
  }
  function walk(obj, cb) {
      var keys = Object.keys(obj);
      var retval;
      for (var i = 0; i < keys.length; i += 1) {
          retval = cb(obj[keys[i]], keys[i], obj);
          if (!retval && obj[keys[i]] && !Array.isArray(obj[keys[i]]) && typeof obj[keys[i]] === 'object') {
              retval = walk(obj[keys[i]], cb);
          }
          if (typeof retval !== 'undefined') {
              return retval;
          }
      }
  }
  var jsf = function (schema, refs, seenSchemaCache) {
      var ignore = optionAPI('ignoreMissingRefs');
      var $ = deref(function (id, refs) {
          // FIXME: allow custom callback?
          if (ignore) {
              return {};
          }
      });
      var $refs = getRefs(refs);
      return run($refs, $(schema, $refs, true), container, seenSchemaCache);
  };
  jsf.resolve = function (schema, refs, cwd) {
      if (typeof refs === 'string') {
          cwd = refs;
          refs = {};
      }
      // normalize basedir (browser aware)
      cwd = cwd || (typeof process !== 'undefined' ? process.cwd() : '');
      cwd = cwd.replace(/\/+$/, '') + '/';
      var $refs = getRefs(refs);
      // identical setup as json-schema-sequelizer
      var fixedRefs = {
          order: 300,
          canRead: true,
          read: function (file, callback) {
              var id = cwd !== '/'
                  ? file.url.replace(cwd, '')
                  : file.url;
              try {
                  callback(null, deref.util.findByRef(id, $refs));
              }
              catch (e) {
                  var result = walk(schema, function (v, k, sub) {
                      if (k === 'id' && v === id) {
                          return sub;
                      }
                  });
                  if (!result) {
                      return callback(e);
                  }
                  callback(null, result);
              }
          },
      };
      return $RefParser
          .dereference(cwd, schema, {
          resolve: { fixedRefs: fixedRefs },
          dereference: {
              circular: 'ignore',
          },
      }).then(function (sub) { return run($refs, sub, container); });
  };
  jsf.format = formatAPI;
  jsf.option = optionAPI;
  jsf.random = random;
  // built-in support
  container.define('pattern', random.randexp);
  // skip default generators
  container.define('jsonPath', function (value, schema) {
      delete schema.type;
      return schema;
  });
  // safe auto-increment values
  container.define('autoIncrement', function (value, schema) {
      if (!this.offset) {
          var min = schema.minimum || 1;
          var max = min + env.MAX_NUMBER;
          var offset = value.initialOffset || schema.initialOffset;
          this.offset = offset || random.number(min, max);
      }
      if (value === true) {
          return this.offset++;
      }
      return schema;
  });
  // safe-and-sequential dates
  container.define('sequentialDate', function (value, schema) {
      if (!this.now) {
          this.now = random.date();
      }
      if (value) {
          schema = this.now.toISOString();
          value = value === true
              ? 'days'
              : value;
          if (['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'].indexOf(value) === -1) {
              throw new Error("Unsupported increment by " + utils.short(value));
          }
          this.now.setTime(this.now.getTime() + random.date(value));
      }
      return schema;
  });
  // returns itself for chaining
  jsf.extend = function (name, cb) {
      container.extend(name, cb);
      return jsf;
  };
  jsf.define = function (name, cb) {
      container.define(name, cb);
      return jsf;
  };
  jsf.locate = function (name) {
      return container.get(name);
  };
  var VERSION="0.5.0-rc15";
  jsf.version = VERSION;

  var lib$2 = jsf;

  return lib$2;

})));
