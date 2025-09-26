(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.StyleToJS = factory());
})(this, (function () { 'use strict';

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var cjs$1 = {};

	var inlineStyleParser;
	var hasRequiredInlineStyleParser;

	function requireInlineStyleParser () {
		if (hasRequiredInlineStyleParser) return inlineStyleParser;
		hasRequiredInlineStyleParser = 1;
		// http://www.w3.org/TR/CSS21/grammar.html
		// https://github.com/visionmedia/css-parse/pull/49#issuecomment-30088027
		var COMMENT_REGEX = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;

		var NEWLINE_REGEX = /\n/g;
		var WHITESPACE_REGEX = /^\s*/;

		// declaration
		var PROPERTY_REGEX = /^(\*?[-#/*\\\w]+(\[[0-9a-z_-]+\])?)\s*/;
		var COLON_REGEX = /^:\s*/;
		var VALUE_REGEX = /^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};])+)/;
		var SEMICOLON_REGEX = /^[;\s]*/;

		// https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/Trim#Polyfill
		var TRIM_REGEX = /^\s+|\s+$/g;

		// strings
		var NEWLINE = '\n';
		var FORWARD_SLASH = '/';
		var ASTERISK = '*';
		var EMPTY_STRING = '';

		// types
		var TYPE_COMMENT = 'comment';
		var TYPE_DECLARATION = 'declaration';

		/**
		 * @param {String} style
		 * @param {Object} [options]
		 * @return {Object[]}
		 * @throws {TypeError}
		 * @throws {Error}
		 */
		inlineStyleParser = function (style, options) {
		  if (typeof style !== 'string') {
		    throw new TypeError('First argument must be a string');
		  }

		  if (!style) return [];

		  options = options || {};

		  /**
		   * Positional.
		   */
		  var lineno = 1;
		  var column = 1;

		  /**
		   * Update lineno and column based on `str`.
		   *
		   * @param {String} str
		   */
		  function updatePosition(str) {
		    var lines = str.match(NEWLINE_REGEX);
		    if (lines) lineno += lines.length;
		    var i = str.lastIndexOf(NEWLINE);
		    column = ~i ? str.length - i : column + str.length;
		  }

		  /**
		   * Mark position and patch `node.position`.
		   *
		   * @return {Function}
		   */
		  function position() {
		    var start = { line: lineno, column: column };
		    return function (node) {
		      node.position = new Position(start);
		      whitespace();
		      return node;
		    };
		  }

		  /**
		   * Store position information for a node.
		   *
		   * @constructor
		   * @property {Object} start
		   * @property {Object} end
		   * @property {undefined|String} source
		   */
		  function Position(start) {
		    this.start = start;
		    this.end = { line: lineno, column: column };
		    this.source = options.source;
		  }

		  /**
		   * Non-enumerable source string.
		   */
		  Position.prototype.content = style;

		  /**
		   * Error `msg`.
		   *
		   * @param {String} msg
		   * @throws {Error}
		   */
		  function error(msg) {
		    var err = new Error(
		      options.source + ':' + lineno + ':' + column + ': ' + msg
		    );
		    err.reason = msg;
		    err.filename = options.source;
		    err.line = lineno;
		    err.column = column;
		    err.source = style;

		    if (options.silent) ; else {
		      throw err;
		    }
		  }

		  /**
		   * Match `re` and return captures.
		   *
		   * @param {RegExp} re
		   * @return {undefined|Array}
		   */
		  function match(re) {
		    var m = re.exec(style);
		    if (!m) return;
		    var str = m[0];
		    updatePosition(str);
		    style = style.slice(str.length);
		    return m;
		  }

		  /**
		   * Parse whitespace.
		   */
		  function whitespace() {
		    match(WHITESPACE_REGEX);
		  }

		  /**
		   * Parse comments.
		   *
		   * @param {Object[]} [rules]
		   * @return {Object[]}
		   */
		  function comments(rules) {
		    var c;
		    rules = rules || [];
		    while ((c = comment())) {
		      if (c !== false) {
		        rules.push(c);
		      }
		    }
		    return rules;
		  }

		  /**
		   * Parse comment.
		   *
		   * @return {Object}
		   * @throws {Error}
		   */
		  function comment() {
		    var pos = position();
		    if (FORWARD_SLASH != style.charAt(0) || ASTERISK != style.charAt(1)) return;

		    var i = 2;
		    while (
		      EMPTY_STRING != style.charAt(i) &&
		      (ASTERISK != style.charAt(i) || FORWARD_SLASH != style.charAt(i + 1))
		    ) {
		      ++i;
		    }
		    i += 2;

		    if (EMPTY_STRING === style.charAt(i - 1)) {
		      return error('End of comment missing');
		    }

		    var str = style.slice(2, i - 2);
		    column += 2;
		    updatePosition(str);
		    style = style.slice(i);
		    column += 2;

		    return pos({
		      type: TYPE_COMMENT,
		      comment: str
		    });
		  }

		  /**
		   * Parse declaration.
		   *
		   * @return {Object}
		   * @throws {Error}
		   */
		  function declaration() {
		    var pos = position();

		    // prop
		    var prop = match(PROPERTY_REGEX);
		    if (!prop) return;
		    comment();

		    // :
		    if (!match(COLON_REGEX)) return error("property missing ':'");

		    // val
		    var val = match(VALUE_REGEX);

		    var ret = pos({
		      type: TYPE_DECLARATION,
		      property: trim(prop[0].replace(COMMENT_REGEX, EMPTY_STRING)),
		      value: val
		        ? trim(val[0].replace(COMMENT_REGEX, EMPTY_STRING))
		        : EMPTY_STRING
		    });

		    // ;
		    match(SEMICOLON_REGEX);

		    return ret;
		  }

		  /**
		   * Parse declarations.
		   *
		   * @return {Object[]}
		   */
		  function declarations() {
		    var decls = [];

		    comments(decls);

		    // declarations
		    var decl;
		    while ((decl = declaration())) {
		      if (decl !== false) {
		        decls.push(decl);
		        comments(decls);
		      }
		    }

		    return decls;
		  }

		  whitespace();
		  return declarations();
		};

		/**
		 * Trim `str`.
		 *
		 * @param {String} str
		 * @return {String}
		 */
		function trim(str) {
		  return str ? str.replace(TRIM_REGEX, EMPTY_STRING) : EMPTY_STRING;
		}
		return inlineStyleParser;
	}

	var hasRequiredCjs$1;

	function requireCjs$1 () {
		if (hasRequiredCjs$1) return cjs$1;
		hasRequiredCjs$1 = 1;
		var __importDefault = (cjs$1 && cjs$1.__importDefault) || function (mod) {
		    return (mod && mod.__esModule) ? mod : { "default": mod };
		};
		Object.defineProperty(cjs$1, "__esModule", { value: true });
		cjs$1.default = StyleToObject;
		var inline_style_parser_1 = __importDefault(requireInlineStyleParser());
		/**
		 * Parses inline style to object.
		 *
		 * @param style - Inline style.
		 * @param iterator - Iterator.
		 * @returns - Style object or null.
		 *
		 * @example Parsing inline style to object:
		 *
		 * ```js
		 * import parse from 'style-to-object';
		 * parse('line-height: 42;'); // { 'line-height': '42' }
		 * ```
		 */
		function StyleToObject(style, iterator) {
		    var styleObject = null;
		    if (!style || typeof style !== 'string') {
		        return styleObject;
		    }
		    var declarations = (0, inline_style_parser_1.default)(style);
		    var hasIterator = typeof iterator === 'function';
		    declarations.forEach(function (declaration) {
		        if (declaration.type !== 'declaration') {
		            return;
		        }
		        var property = declaration.property, value = declaration.value;
		        if (hasIterator) {
		            iterator(property, value, declaration);
		        }
		        else if (value) {
		            styleObject = styleObject || {};
		            styleObject[property] = value;
		        }
		    });
		    return styleObject;
		}
		
		return cjs$1;
	}

	var utilities = {};

	var hasRequiredUtilities;

	function requireUtilities () {
		if (hasRequiredUtilities) return utilities;
		hasRequiredUtilities = 1;
		Object.defineProperty(utilities, "__esModule", { value: true });
		utilities.camelCase = void 0;
		var CUSTOM_PROPERTY_REGEX = /^--[a-zA-Z0-9_-]+$/;
		var HYPHEN_REGEX = /-([a-z])/g;
		var NO_HYPHEN_REGEX = /^[^-]+$/;
		var VENDOR_PREFIX_REGEX = /^-(webkit|moz|ms|o|khtml)-/;
		var MS_VENDOR_PREFIX_REGEX = /^-(ms)-/;
		/**
		 * Checks whether to skip camelCase.
		 */
		var skipCamelCase = function (property) {
		    return !property ||
		        NO_HYPHEN_REGEX.test(property) ||
		        CUSTOM_PROPERTY_REGEX.test(property);
		};
		/**
		 * Replacer that capitalizes first character.
		 */
		var capitalize = function (match, character) {
		    return character.toUpperCase();
		};
		/**
		 * Replacer that removes beginning hyphen of vendor prefix property.
		 */
		var trimHyphen = function (match, prefix) { return "".concat(prefix, "-"); };
		/**
		 * CamelCases a CSS property.
		 */
		var camelCase = function (property, options) {
		    if (options === void 0) { options = {}; }
		    if (skipCamelCase(property)) {
		        return property;
		    }
		    property = property.toLowerCase();
		    if (options.reactCompat) {
		        // `-ms` vendor prefix should not be capitalized
		        property = property.replace(MS_VENDOR_PREFIX_REGEX, trimHyphen);
		    }
		    else {
		        // for non-React, remove first hyphen so vendor prefix is not capitalized
		        property = property.replace(VENDOR_PREFIX_REGEX, trimHyphen);
		    }
		    return property.replace(HYPHEN_REGEX, capitalize);
		};
		utilities.camelCase = camelCase;
		
		return utilities;
	}

	var cjs;
	var hasRequiredCjs;

	function requireCjs () {
		if (hasRequiredCjs) return cjs;
		hasRequiredCjs = 1;
		var __importDefault = (cjs && cjs.__importDefault) || function (mod) {
		    return (mod && mod.__esModule) ? mod : { "default": mod };
		};
		var style_to_object_1 = __importDefault(requireCjs$1());
		var utilities_1 = requireUtilities();
		/**
		 * Parses CSS inline style to JavaScript object (camelCased).
		 */
		function StyleToJS(style, options) {
		    var output = {};
		    if (!style || typeof style !== 'string') {
		        return output;
		    }
		    (0, style_to_object_1.default)(style, function (property, value) {
		        // skip CSS comment
		        if (property && value) {
		            output[(0, utilities_1.camelCase)(property, options)] = value;
		        }
		    });
		    return output;
		}
		StyleToJS.default = StyleToJS;
		cjs = StyleToJS;
		
		return cjs;
	}

	var cjsExports = requireCjs();
	var index = /*@__PURE__*/getDefaultExportFromCjs(cjsExports);

	return index;

}));
//# sourceMappingURL=style-to-js.js.map
