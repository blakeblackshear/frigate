// src/yaml.worker.ts
import { initialize } from "monaco-worker-manager/worker";
import { TextDocument } from "vscode-languageserver-textdocument";

// node_modules/vscode-json-languageservice/lib/esm/services/jsonSchemaService.js
import * as Json2 from "jsonc-parser";
import { URI } from "vscode-uri";

// node_modules/vscode-json-languageservice/lib/esm/utils/strings.js
function startsWith(haystack, needle) {
  if (haystack.length < needle.length) {
    return false;
  }
  for (var i = 0; i < needle.length; i++) {
    if (haystack[i] !== needle[i]) {
      return false;
    }
  }
  return true;
}
function endsWith(haystack, needle) {
  var diff = haystack.length - needle.length;
  if (diff > 0) {
    return haystack.lastIndexOf(needle) === diff;
  } else if (diff === 0) {
    return haystack === needle;
  } else {
    return false;
  }
}
function extendedRegExp(pattern) {
  if (startsWith(pattern, "(?i)")) {
    return new RegExp(pattern.substring(4), "i");
  } else {
    return new RegExp(pattern);
  }
}

// node_modules/vscode-json-languageservice/lib/esm/parser/jsonParser.js
import * as Json from "jsonc-parser";

// node_modules/vscode-json-languageservice/lib/esm/utils/objects.js
function equals(one, other) {
  if (one === other) {
    return true;
  }
  if (one === null || one === void 0 || other === null || other === void 0) {
    return false;
  }
  if (typeof one !== typeof other) {
    return false;
  }
  if (typeof one !== "object") {
    return false;
  }
  if (Array.isArray(one) !== Array.isArray(other)) {
    return false;
  }
  var i, key;
  if (Array.isArray(one)) {
    if (one.length !== other.length) {
      return false;
    }
    for (i = 0; i < one.length; i++) {
      if (!equals(one[i], other[i])) {
        return false;
      }
    }
  } else {
    var oneKeys = [];
    for (key in one) {
      oneKeys.push(key);
    }
    oneKeys.sort();
    var otherKeys = [];
    for (key in other) {
      otherKeys.push(key);
    }
    otherKeys.sort();
    if (!equals(oneKeys, otherKeys)) {
      return false;
    }
    for (i = 0; i < oneKeys.length; i++) {
      if (!equals(one[oneKeys[i]], other[oneKeys[i]])) {
        return false;
      }
    }
  }
  return true;
}
function isNumber(val) {
  return typeof val === "number";
}
function isDefined(val) {
  return typeof val !== "undefined";
}
function isBoolean(val) {
  return typeof val === "boolean";
}
function isString(val) {
  return typeof val === "string";
}

// node_modules/vscode-json-languageservice/lib/esm/jsonLanguageTypes.js
import { Range, Position, MarkupContent, MarkupKind, Color, ColorInformation, ColorPresentation, FoldingRange, FoldingRangeKind, SelectionRange, Diagnostic, DiagnosticSeverity, CompletionItem, CompletionItemKind, CompletionList, CompletionItemTag, InsertTextFormat, SymbolInformation, SymbolKind, DocumentSymbol, Location, Hover, MarkedString, CodeActionContext, Command, CodeAction, DocumentHighlight, DocumentLink, WorkspaceEdit, TextEdit, CodeActionKind, TextDocumentEdit, VersionedTextDocumentIdentifier, DocumentHighlightKind } from "vscode-languageserver-types";
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2[ErrorCode2["Undefined"] = 0] = "Undefined";
  ErrorCode2[ErrorCode2["EnumValueMismatch"] = 1] = "EnumValueMismatch";
  ErrorCode2[ErrorCode2["Deprecated"] = 2] = "Deprecated";
  ErrorCode2[ErrorCode2["UnexpectedEndOfComment"] = 257] = "UnexpectedEndOfComment";
  ErrorCode2[ErrorCode2["UnexpectedEndOfString"] = 258] = "UnexpectedEndOfString";
  ErrorCode2[ErrorCode2["UnexpectedEndOfNumber"] = 259] = "UnexpectedEndOfNumber";
  ErrorCode2[ErrorCode2["InvalidUnicode"] = 260] = "InvalidUnicode";
  ErrorCode2[ErrorCode2["InvalidEscapeCharacter"] = 261] = "InvalidEscapeCharacter";
  ErrorCode2[ErrorCode2["InvalidCharacter"] = 262] = "InvalidCharacter";
  ErrorCode2[ErrorCode2["PropertyExpected"] = 513] = "PropertyExpected";
  ErrorCode2[ErrorCode2["CommaExpected"] = 514] = "CommaExpected";
  ErrorCode2[ErrorCode2["ColonExpected"] = 515] = "ColonExpected";
  ErrorCode2[ErrorCode2["ValueExpected"] = 516] = "ValueExpected";
  ErrorCode2[ErrorCode2["CommaOrCloseBacketExpected"] = 517] = "CommaOrCloseBacketExpected";
  ErrorCode2[ErrorCode2["CommaOrCloseBraceExpected"] = 518] = "CommaOrCloseBraceExpected";
  ErrorCode2[ErrorCode2["TrailingComma"] = 519] = "TrailingComma";
  ErrorCode2[ErrorCode2["DuplicateKey"] = 520] = "DuplicateKey";
  ErrorCode2[ErrorCode2["CommentNotPermitted"] = 521] = "CommentNotPermitted";
  ErrorCode2[ErrorCode2["SchemaResolveError"] = 768] = "SchemaResolveError";
})(ErrorCode || (ErrorCode = {}));
var ClientCapabilities;
(function(ClientCapabilities2) {
  ClientCapabilities2.LATEST = {
    textDocument: {
      completion: {
        completionItem: {
          documentationFormat: [MarkupKind.Markdown, MarkupKind.PlainText],
          commitCharactersSupport: true
        }
      }
    }
  };
})(ClientCapabilities || (ClientCapabilities = {}));

// fillers/vscode-nls.ts
var localize = (key, message, ...args) => args.length === 0 ? message : message.replaceAll(
  /{(\d+)}/g,
  (match, [index]) => index in args ? String(args[index]) : match
);
function loadMessageBundle() {
  return localize;
}

// node_modules/vscode-json-languageservice/lib/esm/parser/jsonParser.js
var __extends = /* @__PURE__ */ function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();
var localize2 = loadMessageBundle();
var formats = {
  "color-hex": { errorMessage: localize2("colorHexFormatWarning", "Invalid color format. Use #RGB, #RGBA, #RRGGBB or #RRGGBBAA."), pattern: /^#([0-9A-Fa-f]{3,4}|([0-9A-Fa-f]{2}){3,4})$/ },
  "date-time": { errorMessage: localize2("dateTimeFormatWarning", "String is not a RFC3339 date-time."), pattern: /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)([01][0-9]|2[0-3]):([0-5][0-9]))$/i },
  "date": { errorMessage: localize2("dateFormatWarning", "String is not a RFC3339 date."), pattern: /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/i },
  "time": { errorMessage: localize2("timeFormatWarning", "String is not a RFC3339 time."), pattern: /^([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)([01][0-9]|2[0-3]):([0-5][0-9]))$/i },
  "email": { errorMessage: localize2("emailFormatWarning", "String is not an e-mail address."), pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/ }
};
var ASTNodeImpl = (
  /** @class */
  function() {
    function ASTNodeImpl3(parent, offset, length) {
      if (length === void 0) {
        length = 0;
      }
      this.offset = offset;
      this.length = length;
      this.parent = parent;
    }
    Object.defineProperty(ASTNodeImpl3.prototype, "children", {
      get: function() {
        return [];
      },
      enumerable: false,
      configurable: true
    });
    ASTNodeImpl3.prototype.toString = function() {
      return "type: " + this.type + " (" + this.offset + "/" + this.length + ")" + (this.parent ? " parent: {" + this.parent.toString() + "}" : "");
    };
    return ASTNodeImpl3;
  }()
);
var NullASTNodeImpl = (
  /** @class */
  function(_super) {
    __extends(NullASTNodeImpl3, _super);
    function NullASTNodeImpl3(parent, offset) {
      var _this = _super.call(this, parent, offset) || this;
      _this.type = "null";
      _this.value = null;
      return _this;
    }
    return NullASTNodeImpl3;
  }(ASTNodeImpl)
);
var BooleanASTNodeImpl = (
  /** @class */
  function(_super) {
    __extends(BooleanASTNodeImpl3, _super);
    function BooleanASTNodeImpl3(parent, boolValue, offset) {
      var _this = _super.call(this, parent, offset) || this;
      _this.type = "boolean";
      _this.value = boolValue;
      return _this;
    }
    return BooleanASTNodeImpl3;
  }(ASTNodeImpl)
);
var ArrayASTNodeImpl = (
  /** @class */
  function(_super) {
    __extends(ArrayASTNodeImpl3, _super);
    function ArrayASTNodeImpl3(parent, offset) {
      var _this = _super.call(this, parent, offset) || this;
      _this.type = "array";
      _this.items = [];
      return _this;
    }
    Object.defineProperty(ArrayASTNodeImpl3.prototype, "children", {
      get: function() {
        return this.items;
      },
      enumerable: false,
      configurable: true
    });
    return ArrayASTNodeImpl3;
  }(ASTNodeImpl)
);
var NumberASTNodeImpl = (
  /** @class */
  function(_super) {
    __extends(NumberASTNodeImpl3, _super);
    function NumberASTNodeImpl3(parent, offset) {
      var _this = _super.call(this, parent, offset) || this;
      _this.type = "number";
      _this.isInteger = true;
      _this.value = Number.NaN;
      return _this;
    }
    return NumberASTNodeImpl3;
  }(ASTNodeImpl)
);
var StringASTNodeImpl = (
  /** @class */
  function(_super) {
    __extends(StringASTNodeImpl3, _super);
    function StringASTNodeImpl3(parent, offset, length) {
      var _this = _super.call(this, parent, offset, length) || this;
      _this.type = "string";
      _this.value = "";
      return _this;
    }
    return StringASTNodeImpl3;
  }(ASTNodeImpl)
);
var PropertyASTNodeImpl = (
  /** @class */
  function(_super) {
    __extends(PropertyASTNodeImpl3, _super);
    function PropertyASTNodeImpl3(parent, offset, keyNode) {
      var _this = _super.call(this, parent, offset) || this;
      _this.type = "property";
      _this.colonOffset = -1;
      _this.keyNode = keyNode;
      return _this;
    }
    Object.defineProperty(PropertyASTNodeImpl3.prototype, "children", {
      get: function() {
        return this.valueNode ? [this.keyNode, this.valueNode] : [this.keyNode];
      },
      enumerable: false,
      configurable: true
    });
    return PropertyASTNodeImpl3;
  }(ASTNodeImpl)
);
var ObjectASTNodeImpl = (
  /** @class */
  function(_super) {
    __extends(ObjectASTNodeImpl3, _super);
    function ObjectASTNodeImpl3(parent, offset) {
      var _this = _super.call(this, parent, offset) || this;
      _this.type = "object";
      _this.properties = [];
      return _this;
    }
    Object.defineProperty(ObjectASTNodeImpl3.prototype, "children", {
      get: function() {
        return this.properties;
      },
      enumerable: false,
      configurable: true
    });
    return ObjectASTNodeImpl3;
  }(ASTNodeImpl)
);
function asSchema(schema) {
  if (isBoolean(schema)) {
    return schema ? {} : { "not": {} };
  }
  return schema;
}
var EnumMatch;
(function(EnumMatch3) {
  EnumMatch3[EnumMatch3["Key"] = 0] = "Key";
  EnumMatch3[EnumMatch3["Enum"] = 1] = "Enum";
})(EnumMatch || (EnumMatch = {}));
var SchemaCollector = (
  /** @class */
  function() {
    function SchemaCollector3(focusOffset, exclude) {
      if (focusOffset === void 0) {
        focusOffset = -1;
      }
      this.focusOffset = focusOffset;
      this.exclude = exclude;
      this.schemas = [];
    }
    SchemaCollector3.prototype.add = function(schema) {
      this.schemas.push(schema);
    };
    SchemaCollector3.prototype.merge = function(other) {
      Array.prototype.push.apply(this.schemas, other.schemas);
    };
    SchemaCollector3.prototype.include = function(node) {
      return (this.focusOffset === -1 || contains(node, this.focusOffset)) && node !== this.exclude;
    };
    SchemaCollector3.prototype.newSub = function() {
      return new SchemaCollector3(-1, this.exclude);
    };
    return SchemaCollector3;
  }()
);
var NoOpSchemaCollector = (
  /** @class */
  function() {
    function NoOpSchemaCollector3() {
    }
    Object.defineProperty(NoOpSchemaCollector3.prototype, "schemas", {
      get: function() {
        return [];
      },
      enumerable: false,
      configurable: true
    });
    NoOpSchemaCollector3.prototype.add = function(schema) {
    };
    NoOpSchemaCollector3.prototype.merge = function(other) {
    };
    NoOpSchemaCollector3.prototype.include = function(node) {
      return true;
    };
    NoOpSchemaCollector3.prototype.newSub = function() {
      return this;
    };
    NoOpSchemaCollector3.instance = new NoOpSchemaCollector3();
    return NoOpSchemaCollector3;
  }()
);
var ValidationResult = (
  /** @class */
  function() {
    function ValidationResult3() {
      this.problems = [];
      this.propertiesMatches = 0;
      this.propertiesValueMatches = 0;
      this.primaryValueMatches = 0;
      this.enumValueMatch = false;
      this.enumValues = void 0;
    }
    ValidationResult3.prototype.hasProblems = function() {
      return !!this.problems.length;
    };
    ValidationResult3.prototype.mergeAll = function(validationResults) {
      for (var _i = 0, validationResults_1 = validationResults; _i < validationResults_1.length; _i++) {
        var validationResult = validationResults_1[_i];
        this.merge(validationResult);
      }
    };
    ValidationResult3.prototype.merge = function(validationResult) {
      this.problems = this.problems.concat(validationResult.problems);
    };
    ValidationResult3.prototype.mergeEnumValues = function(validationResult) {
      if (!this.enumValueMatch && !validationResult.enumValueMatch && this.enumValues && validationResult.enumValues) {
        this.enumValues = this.enumValues.concat(validationResult.enumValues);
        for (var _i = 0, _a = this.problems; _i < _a.length; _i++) {
          var error = _a[_i];
          if (error.code === ErrorCode.EnumValueMismatch) {
            error.message = localize2("enumWarning", "Value is not accepted. Valid values: {0}.", this.enumValues.map(function(v) {
              return JSON.stringify(v);
            }).join(", "));
          }
        }
      }
    };
    ValidationResult3.prototype.mergePropertyMatch = function(propertyValidationResult) {
      this.merge(propertyValidationResult);
      this.propertiesMatches++;
      if (propertyValidationResult.enumValueMatch || !propertyValidationResult.hasProblems() && propertyValidationResult.propertiesMatches) {
        this.propertiesValueMatches++;
      }
      if (propertyValidationResult.enumValueMatch && propertyValidationResult.enumValues && propertyValidationResult.enumValues.length === 1) {
        this.primaryValueMatches++;
      }
    };
    ValidationResult3.prototype.compare = function(other) {
      var hasProblems = this.hasProblems();
      if (hasProblems !== other.hasProblems()) {
        return hasProblems ? -1 : 1;
      }
      if (this.enumValueMatch !== other.enumValueMatch) {
        return other.enumValueMatch ? -1 : 1;
      }
      if (this.primaryValueMatches !== other.primaryValueMatches) {
        return this.primaryValueMatches - other.primaryValueMatches;
      }
      if (this.propertiesValueMatches !== other.propertiesValueMatches) {
        return this.propertiesValueMatches - other.propertiesValueMatches;
      }
      return this.propertiesMatches - other.propertiesMatches;
    };
    return ValidationResult3;
  }()
);
function getNodeValue2(node) {
  return Json.getNodeValue(node);
}
function contains(node, offset, includeRightBound) {
  if (includeRightBound === void 0) {
    includeRightBound = false;
  }
  return offset >= node.offset && offset < node.offset + node.length || includeRightBound && offset === node.offset + node.length;
}
var JSONDocument = (
  /** @class */
  function() {
    function JSONDocument3(root, syntaxErrors, comments) {
      if (syntaxErrors === void 0) {
        syntaxErrors = [];
      }
      if (comments === void 0) {
        comments = [];
      }
      this.root = root;
      this.syntaxErrors = syntaxErrors;
      this.comments = comments;
    }
    JSONDocument3.prototype.getNodeFromOffset = function(offset, includeRightBound) {
      if (includeRightBound === void 0) {
        includeRightBound = false;
      }
      if (this.root) {
        return Json.findNodeAtOffset(this.root, offset, includeRightBound);
      }
      return void 0;
    };
    JSONDocument3.prototype.visit = function(visitor) {
      if (this.root) {
        var doVisit_1 = function(node) {
          var ctn = visitor(node);
          var children = node.children;
          if (Array.isArray(children)) {
            for (var i = 0; i < children.length && ctn; i++) {
              ctn = doVisit_1(children[i]);
            }
          }
          return ctn;
        };
        doVisit_1(this.root);
      }
    };
    JSONDocument3.prototype.validate = function(textDocument, schema, severity) {
      if (severity === void 0) {
        severity = DiagnosticSeverity.Warning;
      }
      if (this.root && schema) {
        var validationResult = new ValidationResult();
        validate(this.root, schema, validationResult, NoOpSchemaCollector.instance);
        return validationResult.problems.map(function(p) {
          var _a;
          var range = Range.create(textDocument.positionAt(p.location.offset), textDocument.positionAt(p.location.offset + p.location.length));
          return Diagnostic.create(range, p.message, (_a = p.severity) !== null && _a !== void 0 ? _a : severity, p.code);
        });
      }
      return void 0;
    };
    JSONDocument3.prototype.getMatchingSchemas = function(schema, focusOffset, exclude) {
      if (focusOffset === void 0) {
        focusOffset = -1;
      }
      var matchingSchemas = new SchemaCollector(focusOffset, exclude);
      if (this.root && schema) {
        validate(this.root, schema, new ValidationResult(), matchingSchemas);
      }
      return matchingSchemas.schemas;
    };
    return JSONDocument3;
  }()
);
function validate(n, schema, validationResult, matchingSchemas) {
  if (!n || !matchingSchemas.include(n)) {
    return;
  }
  var node = n;
  switch (node.type) {
    case "object":
      _validateObjectNode(node, schema, validationResult, matchingSchemas);
      break;
    case "array":
      _validateArrayNode(node, schema, validationResult, matchingSchemas);
      break;
    case "string":
      _validateStringNode(node, schema, validationResult, matchingSchemas);
      break;
    case "number":
      _validateNumberNode(node, schema, validationResult, matchingSchemas);
      break;
    case "property":
      return validate(node.valueNode, schema, validationResult, matchingSchemas);
  }
  _validateNode();
  matchingSchemas.add({ node, schema });
  function _validateNode() {
    function matchesType(type) {
      return node.type === type || type === "integer" && node.type === "number" && node.isInteger;
    }
    if (Array.isArray(schema.type)) {
      if (!schema.type.some(matchesType)) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          message: schema.errorMessage || localize2("typeArrayMismatchWarning", "Incorrect type. Expected one of {0}.", schema.type.join(", "))
        });
      }
    } else if (schema.type) {
      if (!matchesType(schema.type)) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          message: schema.errorMessage || localize2("typeMismatchWarning", 'Incorrect type. Expected "{0}".', schema.type)
        });
      }
    }
    if (Array.isArray(schema.allOf)) {
      for (var _i = 0, _a = schema.allOf; _i < _a.length; _i++) {
        var subSchemaRef = _a[_i];
        validate(node, asSchema(subSchemaRef), validationResult, matchingSchemas);
      }
    }
    var notSchema = asSchema(schema.not);
    if (notSchema) {
      var subValidationResult = new ValidationResult();
      var subMatchingSchemas = matchingSchemas.newSub();
      validate(node, notSchema, subValidationResult, subMatchingSchemas);
      if (!subValidationResult.hasProblems()) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          message: localize2("notSchemaWarning", "Matches a schema that is not allowed.")
        });
      }
      for (var _b = 0, _c = subMatchingSchemas.schemas; _b < _c.length; _b++) {
        var ms = _c[_b];
        ms.inverted = !ms.inverted;
        matchingSchemas.add(ms);
      }
    }
    var testAlternatives = function(alternatives, maxOneMatch) {
      var matches = [];
      var bestMatch = void 0;
      for (var _i2 = 0, alternatives_1 = alternatives; _i2 < alternatives_1.length; _i2++) {
        var subSchemaRef2 = alternatives_1[_i2];
        var subSchema = asSchema(subSchemaRef2);
        var subValidationResult2 = new ValidationResult();
        var subMatchingSchemas2 = matchingSchemas.newSub();
        validate(node, subSchema, subValidationResult2, subMatchingSchemas2);
        if (!subValidationResult2.hasProblems()) {
          matches.push(subSchema);
        }
        if (!bestMatch) {
          bestMatch = { schema: subSchema, validationResult: subValidationResult2, matchingSchemas: subMatchingSchemas2 };
        } else {
          if (!maxOneMatch && !subValidationResult2.hasProblems() && !bestMatch.validationResult.hasProblems()) {
            bestMatch.matchingSchemas.merge(subMatchingSchemas2);
            bestMatch.validationResult.propertiesMatches += subValidationResult2.propertiesMatches;
            bestMatch.validationResult.propertiesValueMatches += subValidationResult2.propertiesValueMatches;
          } else {
            var compareResult = subValidationResult2.compare(bestMatch.validationResult);
            if (compareResult > 0) {
              bestMatch = { schema: subSchema, validationResult: subValidationResult2, matchingSchemas: subMatchingSchemas2 };
            } else if (compareResult === 0) {
              bestMatch.matchingSchemas.merge(subMatchingSchemas2);
              bestMatch.validationResult.mergeEnumValues(subValidationResult2);
            }
          }
        }
      }
      if (matches.length > 1 && maxOneMatch) {
        validationResult.problems.push({
          location: { offset: node.offset, length: 1 },
          message: localize2("oneOfWarning", "Matches multiple schemas when only one must validate.")
        });
      }
      if (bestMatch) {
        validationResult.merge(bestMatch.validationResult);
        validationResult.propertiesMatches += bestMatch.validationResult.propertiesMatches;
        validationResult.propertiesValueMatches += bestMatch.validationResult.propertiesValueMatches;
        matchingSchemas.merge(bestMatch.matchingSchemas);
      }
      return matches.length;
    };
    if (Array.isArray(schema.anyOf)) {
      testAlternatives(schema.anyOf, false);
    }
    if (Array.isArray(schema.oneOf)) {
      testAlternatives(schema.oneOf, true);
    }
    var testBranch = function(schema2) {
      var subValidationResult2 = new ValidationResult();
      var subMatchingSchemas2 = matchingSchemas.newSub();
      validate(node, asSchema(schema2), subValidationResult2, subMatchingSchemas2);
      validationResult.merge(subValidationResult2);
      validationResult.propertiesMatches += subValidationResult2.propertiesMatches;
      validationResult.propertiesValueMatches += subValidationResult2.propertiesValueMatches;
      matchingSchemas.merge(subMatchingSchemas2);
    };
    var testCondition = function(ifSchema2, thenSchema, elseSchema) {
      var subSchema = asSchema(ifSchema2);
      var subValidationResult2 = new ValidationResult();
      var subMatchingSchemas2 = matchingSchemas.newSub();
      validate(node, subSchema, subValidationResult2, subMatchingSchemas2);
      matchingSchemas.merge(subMatchingSchemas2);
      if (!subValidationResult2.hasProblems()) {
        if (thenSchema) {
          testBranch(thenSchema);
        }
      } else if (elseSchema) {
        testBranch(elseSchema);
      }
    };
    var ifSchema = asSchema(schema.if);
    if (ifSchema) {
      testCondition(ifSchema, asSchema(schema.then), asSchema(schema.else));
    }
    if (Array.isArray(schema.enum)) {
      var val = getNodeValue2(node);
      var enumValueMatch = false;
      for (var _d = 0, _e = schema.enum; _d < _e.length; _d++) {
        var e = _e[_d];
        if (equals(val, e)) {
          enumValueMatch = true;
          break;
        }
      }
      validationResult.enumValues = schema.enum;
      validationResult.enumValueMatch = enumValueMatch;
      if (!enumValueMatch) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          code: ErrorCode.EnumValueMismatch,
          message: schema.errorMessage || localize2("enumWarning", "Value is not accepted. Valid values: {0}.", schema.enum.map(function(v) {
            return JSON.stringify(v);
          }).join(", "))
        });
      }
    }
    if (isDefined(schema.const)) {
      var val = getNodeValue2(node);
      if (!equals(val, schema.const)) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          code: ErrorCode.EnumValueMismatch,
          message: schema.errorMessage || localize2("constWarning", "Value must be {0}.", JSON.stringify(schema.const))
        });
        validationResult.enumValueMatch = false;
      } else {
        validationResult.enumValueMatch = true;
      }
      validationResult.enumValues = [schema.const];
    }
    if (schema.deprecationMessage && node.parent) {
      validationResult.problems.push({
        location: { offset: node.parent.offset, length: node.parent.length },
        severity: DiagnosticSeverity.Warning,
        message: schema.deprecationMessage,
        code: ErrorCode.Deprecated
      });
    }
  }
  function _validateNumberNode(node2, schema2, validationResult2, matchingSchemas2) {
    var val = node2.value;
    function normalizeFloats(float) {
      var _a;
      var parts = /^(-?\d+)(?:\.(\d+))?(?:e([-+]\d+))?$/.exec(float.toString());
      return parts && {
        value: Number(parts[1] + (parts[2] || "")),
        multiplier: (((_a = parts[2]) === null || _a === void 0 ? void 0 : _a.length) || 0) - (parseInt(parts[3]) || 0)
      };
    }
    ;
    if (isNumber(schema2.multipleOf)) {
      var remainder = -1;
      if (Number.isInteger(schema2.multipleOf)) {
        remainder = val % schema2.multipleOf;
      } else {
        var normMultipleOf = normalizeFloats(schema2.multipleOf);
        var normValue = normalizeFloats(val);
        if (normMultipleOf && normValue) {
          var multiplier = Math.pow(10, Math.abs(normValue.multiplier - normMultipleOf.multiplier));
          if (normValue.multiplier < normMultipleOf.multiplier) {
            normValue.value *= multiplier;
          } else {
            normMultipleOf.value *= multiplier;
          }
          remainder = normValue.value % normMultipleOf.value;
        }
      }
      if (remainder !== 0) {
        validationResult2.problems.push({
          location: { offset: node2.offset, length: node2.length },
          message: localize2("multipleOfWarning", "Value is not divisible by {0}.", schema2.multipleOf)
        });
      }
    }
    function getExclusiveLimit(limit, exclusive) {
      if (isNumber(exclusive)) {
        return exclusive;
      }
      if (isBoolean(exclusive) && exclusive) {
        return limit;
      }
      return void 0;
    }
    function getLimit(limit, exclusive) {
      if (!isBoolean(exclusive) || !exclusive) {
        return limit;
      }
      return void 0;
    }
    var exclusiveMinimum = getExclusiveLimit(schema2.minimum, schema2.exclusiveMinimum);
    if (isNumber(exclusiveMinimum) && val <= exclusiveMinimum) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        message: localize2("exclusiveMinimumWarning", "Value is below the exclusive minimum of {0}.", exclusiveMinimum)
      });
    }
    var exclusiveMaximum = getExclusiveLimit(schema2.maximum, schema2.exclusiveMaximum);
    if (isNumber(exclusiveMaximum) && val >= exclusiveMaximum) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        message: localize2("exclusiveMaximumWarning", "Value is above the exclusive maximum of {0}.", exclusiveMaximum)
      });
    }
    var minimum = getLimit(schema2.minimum, schema2.exclusiveMinimum);
    if (isNumber(minimum) && val < minimum) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        message: localize2("minimumWarning", "Value is below the minimum of {0}.", minimum)
      });
    }
    var maximum = getLimit(schema2.maximum, schema2.exclusiveMaximum);
    if (isNumber(maximum) && val > maximum) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        message: localize2("maximumWarning", "Value is above the maximum of {0}.", maximum)
      });
    }
  }
  function _validateStringNode(node2, schema2, validationResult2, matchingSchemas2) {
    if (isNumber(schema2.minLength) && node2.value.length < schema2.minLength) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        message: localize2("minLengthWarning", "String is shorter than the minimum length of {0}.", schema2.minLength)
      });
    }
    if (isNumber(schema2.maxLength) && node2.value.length > schema2.maxLength) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        message: localize2("maxLengthWarning", "String is longer than the maximum length of {0}.", schema2.maxLength)
      });
    }
    if (isString(schema2.pattern)) {
      var regex = extendedRegExp(schema2.pattern);
      if (!regex.test(node2.value)) {
        validationResult2.problems.push({
          location: { offset: node2.offset, length: node2.length },
          message: schema2.patternErrorMessage || schema2.errorMessage || localize2("patternWarning", 'String does not match the pattern of "{0}".', schema2.pattern)
        });
      }
    }
    if (schema2.format) {
      switch (schema2.format) {
        case "uri":
        case "uri-reference":
          {
            var errorMessage = void 0;
            if (!node2.value) {
              errorMessage = localize2("uriEmpty", "URI expected.");
            } else {
              var match = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/.exec(node2.value);
              if (!match) {
                errorMessage = localize2("uriMissing", "URI is expected.");
              } else if (!match[2] && schema2.format === "uri") {
                errorMessage = localize2("uriSchemeMissing", "URI with a scheme is expected.");
              }
            }
            if (errorMessage) {
              validationResult2.problems.push({
                location: { offset: node2.offset, length: node2.length },
                message: schema2.patternErrorMessage || schema2.errorMessage || localize2("uriFormatWarning", "String is not a URI: {0}", errorMessage)
              });
            }
          }
          break;
        case "color-hex":
        case "date-time":
        case "date":
        case "time":
        case "email":
          var format2 = formats[schema2.format];
          if (!node2.value || !format2.pattern.exec(node2.value)) {
            validationResult2.problems.push({
              location: { offset: node2.offset, length: node2.length },
              message: schema2.patternErrorMessage || schema2.errorMessage || format2.errorMessage
            });
          }
        default:
      }
    }
  }
  function _validateArrayNode(node2, schema2, validationResult2, matchingSchemas2) {
    if (Array.isArray(schema2.items)) {
      var subSchemas = schema2.items;
      for (var index = 0; index < subSchemas.length; index++) {
        var subSchemaRef = subSchemas[index];
        var subSchema = asSchema(subSchemaRef);
        var itemValidationResult = new ValidationResult();
        var item = node2.items[index];
        if (item) {
          validate(item, subSchema, itemValidationResult, matchingSchemas2);
          validationResult2.mergePropertyMatch(itemValidationResult);
        } else if (node2.items.length >= subSchemas.length) {
          validationResult2.propertiesValueMatches++;
        }
      }
      if (node2.items.length > subSchemas.length) {
        if (typeof schema2.additionalItems === "object") {
          for (var i = subSchemas.length; i < node2.items.length; i++) {
            var itemValidationResult = new ValidationResult();
            validate(node2.items[i], schema2.additionalItems, itemValidationResult, matchingSchemas2);
            validationResult2.mergePropertyMatch(itemValidationResult);
          }
        } else if (schema2.additionalItems === false) {
          validationResult2.problems.push({
            location: { offset: node2.offset, length: node2.length },
            message: localize2("additionalItemsWarning", "Array has too many items according to schema. Expected {0} or fewer.", subSchemas.length)
          });
        }
      }
    } else {
      var itemSchema = asSchema(schema2.items);
      if (itemSchema) {
        for (var _i = 0, _a = node2.items; _i < _a.length; _i++) {
          var item = _a[_i];
          var itemValidationResult = new ValidationResult();
          validate(item, itemSchema, itemValidationResult, matchingSchemas2);
          validationResult2.mergePropertyMatch(itemValidationResult);
        }
      }
    }
    var containsSchema = asSchema(schema2.contains);
    if (containsSchema) {
      var doesContain = node2.items.some(function(item2) {
        var itemValidationResult2 = new ValidationResult();
        validate(item2, containsSchema, itemValidationResult2, NoOpSchemaCollector.instance);
        return !itemValidationResult2.hasProblems();
      });
      if (!doesContain) {
        validationResult2.problems.push({
          location: { offset: node2.offset, length: node2.length },
          message: schema2.errorMessage || localize2("requiredItemMissingWarning", "Array does not contain required item.")
        });
      }
    }
    if (isNumber(schema2.minItems) && node2.items.length < schema2.minItems) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        message: localize2("minItemsWarning", "Array has too few items. Expected {0} or more.", schema2.minItems)
      });
    }
    if (isNumber(schema2.maxItems) && node2.items.length > schema2.maxItems) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        message: localize2("maxItemsWarning", "Array has too many items. Expected {0} or fewer.", schema2.maxItems)
      });
    }
    if (schema2.uniqueItems === true) {
      var values_1 = getNodeValue2(node2);
      var duplicates = values_1.some(function(value, index2) {
        return index2 !== values_1.lastIndexOf(value);
      });
      if (duplicates) {
        validationResult2.problems.push({
          location: { offset: node2.offset, length: node2.length },
          message: localize2("uniqueItemsWarning", "Array has duplicate items.")
        });
      }
    }
  }
  function _validateObjectNode(node2, schema2, validationResult2, matchingSchemas2) {
    var seenKeys = /* @__PURE__ */ Object.create(null);
    var unprocessedProperties = [];
    for (var _i = 0, _a = node2.properties; _i < _a.length; _i++) {
      var propertyNode = _a[_i];
      var key = propertyNode.keyNode.value;
      seenKeys[key] = propertyNode.valueNode;
      unprocessedProperties.push(key);
    }
    if (Array.isArray(schema2.required)) {
      for (var _b = 0, _c = schema2.required; _b < _c.length; _b++) {
        var propertyName = _c[_b];
        if (!seenKeys[propertyName]) {
          var keyNode = node2.parent && node2.parent.type === "property" && node2.parent.keyNode;
          var location = keyNode ? { offset: keyNode.offset, length: keyNode.length } : { offset: node2.offset, length: 1 };
          validationResult2.problems.push({
            location,
            message: localize2("MissingRequiredPropWarning", 'Missing property "{0}".', propertyName)
          });
        }
      }
    }
    var propertyProcessed = function(prop2) {
      var index = unprocessedProperties.indexOf(prop2);
      while (index >= 0) {
        unprocessedProperties.splice(index, 1);
        index = unprocessedProperties.indexOf(prop2);
      }
    };
    if (schema2.properties) {
      for (var _d = 0, _e = Object.keys(schema2.properties); _d < _e.length; _d++) {
        var propertyName = _e[_d];
        propertyProcessed(propertyName);
        var propertySchema = schema2.properties[propertyName];
        var child = seenKeys[propertyName];
        if (child) {
          if (isBoolean(propertySchema)) {
            if (!propertySchema) {
              var propertyNode = child.parent;
              validationResult2.problems.push({
                location: { offset: propertyNode.keyNode.offset, length: propertyNode.keyNode.length },
                message: schema2.errorMessage || localize2("DisallowedExtraPropWarning", "Property {0} is not allowed.", propertyName)
              });
            } else {
              validationResult2.propertiesMatches++;
              validationResult2.propertiesValueMatches++;
            }
          } else {
            var propertyValidationResult = new ValidationResult();
            validate(child, propertySchema, propertyValidationResult, matchingSchemas2);
            validationResult2.mergePropertyMatch(propertyValidationResult);
          }
        }
      }
    }
    if (schema2.patternProperties) {
      for (var _f = 0, _g = Object.keys(schema2.patternProperties); _f < _g.length; _f++) {
        var propertyPattern = _g[_f];
        var regex = extendedRegExp(propertyPattern);
        for (var _h = 0, _j = unprocessedProperties.slice(0); _h < _j.length; _h++) {
          var propertyName = _j[_h];
          if (regex.test(propertyName)) {
            propertyProcessed(propertyName);
            var child = seenKeys[propertyName];
            if (child) {
              var propertySchema = schema2.patternProperties[propertyPattern];
              if (isBoolean(propertySchema)) {
                if (!propertySchema) {
                  var propertyNode = child.parent;
                  validationResult2.problems.push({
                    location: { offset: propertyNode.keyNode.offset, length: propertyNode.keyNode.length },
                    message: schema2.errorMessage || localize2("DisallowedExtraPropWarning", "Property {0} is not allowed.", propertyName)
                  });
                } else {
                  validationResult2.propertiesMatches++;
                  validationResult2.propertiesValueMatches++;
                }
              } else {
                var propertyValidationResult = new ValidationResult();
                validate(child, propertySchema, propertyValidationResult, matchingSchemas2);
                validationResult2.mergePropertyMatch(propertyValidationResult);
              }
            }
          }
        }
      }
    }
    if (typeof schema2.additionalProperties === "object") {
      for (var _k = 0, unprocessedProperties_1 = unprocessedProperties; _k < unprocessedProperties_1.length; _k++) {
        var propertyName = unprocessedProperties_1[_k];
        var child = seenKeys[propertyName];
        if (child) {
          var propertyValidationResult = new ValidationResult();
          validate(child, schema2.additionalProperties, propertyValidationResult, matchingSchemas2);
          validationResult2.mergePropertyMatch(propertyValidationResult);
        }
      }
    } else if (schema2.additionalProperties === false) {
      if (unprocessedProperties.length > 0) {
        for (var _l = 0, unprocessedProperties_2 = unprocessedProperties; _l < unprocessedProperties_2.length; _l++) {
          var propertyName = unprocessedProperties_2[_l];
          var child = seenKeys[propertyName];
          if (child) {
            var propertyNode = child.parent;
            validationResult2.problems.push({
              location: { offset: propertyNode.keyNode.offset, length: propertyNode.keyNode.length },
              message: schema2.errorMessage || localize2("DisallowedExtraPropWarning", "Property {0} is not allowed.", propertyName)
            });
          }
        }
      }
    }
    if (isNumber(schema2.maxProperties)) {
      if (node2.properties.length > schema2.maxProperties) {
        validationResult2.problems.push({
          location: { offset: node2.offset, length: node2.length },
          message: localize2("MaxPropWarning", "Object has more properties than limit of {0}.", schema2.maxProperties)
        });
      }
    }
    if (isNumber(schema2.minProperties)) {
      if (node2.properties.length < schema2.minProperties) {
        validationResult2.problems.push({
          location: { offset: node2.offset, length: node2.length },
          message: localize2("MinPropWarning", "Object has fewer properties than the required number of {0}", schema2.minProperties)
        });
      }
    }
    if (schema2.dependencies) {
      for (var _m = 0, _o = Object.keys(schema2.dependencies); _m < _o.length; _m++) {
        var key = _o[_m];
        var prop = seenKeys[key];
        if (prop) {
          var propertyDep = schema2.dependencies[key];
          if (Array.isArray(propertyDep)) {
            for (var _p = 0, propertyDep_1 = propertyDep; _p < propertyDep_1.length; _p++) {
              var requiredProp = propertyDep_1[_p];
              if (!seenKeys[requiredProp]) {
                validationResult2.problems.push({
                  location: { offset: node2.offset, length: node2.length },
                  message: localize2("RequiredDependentPropWarning", "Object is missing property {0} required by property {1}.", requiredProp, key)
                });
              } else {
                validationResult2.propertiesValueMatches++;
              }
            }
          } else {
            var propertySchema = asSchema(propertyDep);
            if (propertySchema) {
              var propertyValidationResult = new ValidationResult();
              validate(node2, propertySchema, propertyValidationResult, matchingSchemas2);
              validationResult2.mergePropertyMatch(propertyValidationResult);
            }
          }
        }
      }
    }
    var propertyNames = asSchema(schema2.propertyNames);
    if (propertyNames) {
      for (var _q = 0, _r = node2.properties; _q < _r.length; _q++) {
        var f2 = _r[_q];
        var key = f2.keyNode;
        if (key) {
          validate(key, propertyNames, validationResult2, NoOpSchemaCollector.instance);
        }
      }
    }
  }
}

// node_modules/vscode-json-languageservice/lib/esm/utils/glob.js
function createRegex(glob, opts) {
  if (typeof glob !== "string") {
    throw new TypeError("Expected a string");
  }
  var str = String(glob);
  var reStr = "";
  var extended = opts ? !!opts.extended : false;
  var globstar = opts ? !!opts.globstar : false;
  var inGroup = false;
  var flags = opts && typeof opts.flags === "string" ? opts.flags : "";
  var c;
  for (var i = 0, len = str.length; i < len; i++) {
    c = str[i];
    switch (c) {
      case "/":
      case "$":
      case "^":
      case "+":
      case ".":
      case "(":
      case ")":
      case "=":
      case "!":
      case "|":
        reStr += "\\" + c;
        break;
      case "?":
        if (extended) {
          reStr += ".";
          break;
        }
      case "[":
      case "]":
        if (extended) {
          reStr += c;
          break;
        }
      case "{":
        if (extended) {
          inGroup = true;
          reStr += "(";
          break;
        }
      case "}":
        if (extended) {
          inGroup = false;
          reStr += ")";
          break;
        }
      case ",":
        if (inGroup) {
          reStr += "|";
          break;
        }
        reStr += "\\" + c;
        break;
      case "*":
        var prevChar = str[i - 1];
        var starCount = 1;
        while (str[i + 1] === "*") {
          starCount++;
          i++;
        }
        var nextChar = str[i + 1];
        if (!globstar) {
          reStr += ".*";
        } else {
          var isGlobstar = starCount > 1 && (prevChar === "/" || prevChar === void 0 || prevChar === "{" || prevChar === ",") && (nextChar === "/" || nextChar === void 0 || nextChar === "," || nextChar === "}");
          if (isGlobstar) {
            if (nextChar === "/") {
              i++;
            } else if (prevChar === "/" && reStr.endsWith("\\/")) {
              reStr = reStr.substr(0, reStr.length - 2);
            }
            reStr += "((?:[^/]*(?:/|$))*)";
          } else {
            reStr += "([^/]*)";
          }
        }
        break;
      default:
        reStr += c;
    }
  }
  if (!flags || !~flags.indexOf("g")) {
    reStr = "^" + reStr + "$";
  }
  return new RegExp(reStr, flags);
}

// node_modules/vscode-json-languageservice/lib/esm/services/jsonSchemaService.js
var localize3 = loadMessageBundle();
var BANG = "!";
var PATH_SEP = "/";
var FilePatternAssociation = (
  /** @class */
  function() {
    function FilePatternAssociation3(pattern, uris) {
      this.globWrappers = [];
      try {
        for (var _i = 0, pattern_1 = pattern; _i < pattern_1.length; _i++) {
          var patternString = pattern_1[_i];
          var include = patternString[0] !== BANG;
          if (!include) {
            patternString = patternString.substring(1);
          }
          if (patternString.length > 0) {
            if (patternString[0] === PATH_SEP) {
              patternString = patternString.substring(1);
            }
            this.globWrappers.push({
              regexp: createRegex("**/" + patternString, { extended: true, globstar: true }),
              include
            });
          }
        }
        ;
        this.uris = uris;
      } catch (e) {
        this.globWrappers.length = 0;
        this.uris = [];
      }
    }
    FilePatternAssociation3.prototype.matchesPattern = function(fileName) {
      var match = false;
      for (var _i = 0, _a = this.globWrappers; _i < _a.length; _i++) {
        var _b = _a[_i], regexp = _b.regexp, include = _b.include;
        if (regexp.test(fileName)) {
          match = include;
        }
      }
      return match;
    };
    FilePatternAssociation3.prototype.getURIs = function() {
      return this.uris;
    };
    return FilePatternAssociation3;
  }()
);
var SchemaHandle = (
  /** @class */
  function() {
    function SchemaHandle2(service, url, unresolvedSchemaContent) {
      this.service = service;
      this.url = url;
      this.dependencies = {};
      if (unresolvedSchemaContent) {
        this.unresolvedSchema = this.service.promise.resolve(new UnresolvedSchema(unresolvedSchemaContent));
      }
    }
    SchemaHandle2.prototype.getUnresolvedSchema = function() {
      if (!this.unresolvedSchema) {
        this.unresolvedSchema = this.service.loadSchema(this.url);
      }
      return this.unresolvedSchema;
    };
    SchemaHandle2.prototype.getResolvedSchema = function() {
      var _this = this;
      if (!this.resolvedSchema) {
        this.resolvedSchema = this.getUnresolvedSchema().then(function(unresolved) {
          return _this.service.resolveSchemaContent(unresolved, _this.url, _this.dependencies);
        });
      }
      return this.resolvedSchema;
    };
    SchemaHandle2.prototype.clearSchema = function() {
      this.resolvedSchema = void 0;
      this.unresolvedSchema = void 0;
      this.dependencies = {};
    };
    return SchemaHandle2;
  }()
);
var UnresolvedSchema = (
  /** @class */
  /* @__PURE__ */ function() {
    function UnresolvedSchema2(schema, errors) {
      if (errors === void 0) {
        errors = [];
      }
      this.schema = schema;
      this.errors = errors;
    }
    return UnresolvedSchema2;
  }()
);
var ResolvedSchema = (
  /** @class */
  function() {
    function ResolvedSchema2(schema, errors) {
      if (errors === void 0) {
        errors = [];
      }
      this.schema = schema;
      this.errors = errors;
    }
    ResolvedSchema2.prototype.getSection = function(path5) {
      var schemaRef = this.getSectionRecursive(path5, this.schema);
      if (schemaRef) {
        return asSchema(schemaRef);
      }
      return void 0;
    };
    ResolvedSchema2.prototype.getSectionRecursive = function(path5, schema) {
      if (!schema || typeof schema === "boolean" || path5.length === 0) {
        return schema;
      }
      var next = path5.shift();
      if (schema.properties && typeof schema.properties[next]) {
        return this.getSectionRecursive(path5, schema.properties[next]);
      } else if (schema.patternProperties) {
        for (var _i = 0, _a = Object.keys(schema.patternProperties); _i < _a.length; _i++) {
          var pattern = _a[_i];
          var regex = extendedRegExp(pattern);
          if (regex.test(next)) {
            return this.getSectionRecursive(path5, schema.patternProperties[pattern]);
          }
        }
      } else if (typeof schema.additionalProperties === "object") {
        return this.getSectionRecursive(path5, schema.additionalProperties);
      } else if (next.match("[0-9]+")) {
        if (Array.isArray(schema.items)) {
          var index = parseInt(next, 10);
          if (!isNaN(index) && schema.items[index]) {
            return this.getSectionRecursive(path5, schema.items[index]);
          }
        } else if (schema.items) {
          return this.getSectionRecursive(path5, schema.items);
        }
      }
      return void 0;
    };
    return ResolvedSchema2;
  }()
);
var JSONSchemaService = (
  /** @class */
  function() {
    function JSONSchemaService2(requestService, contextService, promiseConstructor) {
      this.contextService = contextService;
      this.requestService = requestService;
      this.promiseConstructor = promiseConstructor || Promise;
      this.callOnDispose = [];
      this.contributionSchemas = {};
      this.contributionAssociations = [];
      this.schemasById = {};
      this.filePatternAssociations = [];
      this.registeredSchemasIds = {};
    }
    JSONSchemaService2.prototype.getRegisteredSchemaIds = function(filter) {
      return Object.keys(this.registeredSchemasIds).filter(function(id) {
        var scheme = URI.parse(id).scheme;
        return scheme !== "schemaservice" && (!filter || filter(scheme));
      });
    };
    Object.defineProperty(JSONSchemaService2.prototype, "promise", {
      get: function() {
        return this.promiseConstructor;
      },
      enumerable: false,
      configurable: true
    });
    JSONSchemaService2.prototype.dispose = function() {
      while (this.callOnDispose.length > 0) {
        this.callOnDispose.pop()();
      }
    };
    JSONSchemaService2.prototype.onResourceChange = function(uri) {
      var _this = this;
      this.cachedSchemaForResource = void 0;
      var hasChanges = false;
      uri = normalizeId(uri);
      var toWalk = [uri];
      var all = Object.keys(this.schemasById).map(function(key) {
        return _this.schemasById[key];
      });
      while (toWalk.length) {
        var curr = toWalk.pop();
        for (var i = 0; i < all.length; i++) {
          var handle = all[i];
          if (handle && (handle.url === curr || handle.dependencies[curr])) {
            if (handle.url !== curr) {
              toWalk.push(handle.url);
            }
            handle.clearSchema();
            all[i] = void 0;
            hasChanges = true;
          }
        }
      }
      return hasChanges;
    };
    JSONSchemaService2.prototype.setSchemaContributions = function(schemaContributions) {
      if (schemaContributions.schemas) {
        var schemas = schemaContributions.schemas;
        for (var id in schemas) {
          var normalizedId = normalizeId(id);
          this.contributionSchemas[normalizedId] = this.addSchemaHandle(normalizedId, schemas[id]);
        }
      }
      if (Array.isArray(schemaContributions.schemaAssociations)) {
        var schemaAssociations = schemaContributions.schemaAssociations;
        for (var _i = 0, schemaAssociations_1 = schemaAssociations; _i < schemaAssociations_1.length; _i++) {
          var schemaAssociation = schemaAssociations_1[_i];
          var uris = schemaAssociation.uris.map(normalizeId);
          var association = this.addFilePatternAssociation(schemaAssociation.pattern, uris);
          this.contributionAssociations.push(association);
        }
      }
    };
    JSONSchemaService2.prototype.addSchemaHandle = function(id, unresolvedSchemaContent) {
      var schemaHandle = new SchemaHandle(this, id, unresolvedSchemaContent);
      this.schemasById[id] = schemaHandle;
      return schemaHandle;
    };
    JSONSchemaService2.prototype.getOrAddSchemaHandle = function(id, unresolvedSchemaContent) {
      return this.schemasById[id] || this.addSchemaHandle(id, unresolvedSchemaContent);
    };
    JSONSchemaService2.prototype.addFilePatternAssociation = function(pattern, uris) {
      var fpa = new FilePatternAssociation(pattern, uris);
      this.filePatternAssociations.push(fpa);
      return fpa;
    };
    JSONSchemaService2.prototype.registerExternalSchema = function(uri, filePatterns, unresolvedSchemaContent) {
      var id = normalizeId(uri);
      this.registeredSchemasIds[id] = true;
      this.cachedSchemaForResource = void 0;
      if (filePatterns) {
        this.addFilePatternAssociation(filePatterns, [uri]);
      }
      return unresolvedSchemaContent ? this.addSchemaHandle(id, unresolvedSchemaContent) : this.getOrAddSchemaHandle(id);
    };
    JSONSchemaService2.prototype.clearExternalSchemas = function() {
      this.schemasById = {};
      this.filePatternAssociations = [];
      this.registeredSchemasIds = {};
      this.cachedSchemaForResource = void 0;
      for (var id in this.contributionSchemas) {
        this.schemasById[id] = this.contributionSchemas[id];
        this.registeredSchemasIds[id] = true;
      }
      for (var _i = 0, _a = this.contributionAssociations; _i < _a.length; _i++) {
        var contributionAssociation = _a[_i];
        this.filePatternAssociations.push(contributionAssociation);
      }
    };
    JSONSchemaService2.prototype.getResolvedSchema = function(schemaId) {
      var id = normalizeId(schemaId);
      var schemaHandle = this.schemasById[id];
      if (schemaHandle) {
        return schemaHandle.getResolvedSchema();
      }
      return this.promise.resolve(void 0);
    };
    JSONSchemaService2.prototype.loadSchema = function(url) {
      if (!this.requestService) {
        var errorMessage = localize3("json.schema.norequestservice", "Unable to load schema from '{0}'. No schema request service available", toDisplayString(url));
        return this.promise.resolve(new UnresolvedSchema({}, [errorMessage]));
      }
      return this.requestService(url).then(function(content) {
        if (!content) {
          var errorMessage2 = localize3("json.schema.nocontent", "Unable to load schema from '{0}': No content.", toDisplayString(url));
          return new UnresolvedSchema({}, [errorMessage2]);
        }
        var schemaContent = {};
        var jsonErrors = [];
        schemaContent = Json2.parse(content, jsonErrors);
        var errors = jsonErrors.length ? [localize3("json.schema.invalidFormat", "Unable to parse content from '{0}': Parse error at offset {1}.", toDisplayString(url), jsonErrors[0].offset)] : [];
        return new UnresolvedSchema(schemaContent, errors);
      }, function(error) {
        var errorMessage2 = error.toString();
        var errorSplit = error.toString().split("Error: ");
        if (errorSplit.length > 1) {
          errorMessage2 = errorSplit[1];
        }
        if (endsWith(errorMessage2, ".")) {
          errorMessage2 = errorMessage2.substr(0, errorMessage2.length - 1);
        }
        return new UnresolvedSchema({}, [localize3("json.schema.nocontent", "Unable to load schema from '{0}': {1}.", toDisplayString(url), errorMessage2)]);
      });
    };
    JSONSchemaService2.prototype.resolveSchemaContent = function(schemaToResolve, schemaURL, dependencies) {
      var _this = this;
      var resolveErrors = schemaToResolve.errors.slice(0);
      var schema = schemaToResolve.schema;
      if (schema.$schema) {
        var id = normalizeId(schema.$schema);
        if (id === "http://json-schema.org/draft-03/schema") {
          return this.promise.resolve(new ResolvedSchema({}, [localize3("json.schema.draft03.notsupported", "Draft-03 schemas are not supported.")]));
        } else if (id === "https://json-schema.org/draft/2019-09/schema") {
          resolveErrors.push(localize3("json.schema.draft201909.notsupported", "Draft 2019-09 schemas are not yet fully supported."));
        }
      }
      var contextService = this.contextService;
      var findSection = function(schema2, path5) {
        if (!path5) {
          return schema2;
        }
        var current = schema2;
        if (path5[0] === "/") {
          path5 = path5.substr(1);
        }
        path5.split("/").some(function(part) {
          part = part.replace(/~1/g, "/").replace(/~0/g, "~");
          current = current[part];
          return !current;
        });
        return current;
      };
      var merge = function(target, sourceRoot, sourceURI, refSegment) {
        var path5 = refSegment ? decodeURIComponent(refSegment) : void 0;
        var section = findSection(sourceRoot, path5);
        if (section) {
          for (var key in section) {
            if (section.hasOwnProperty(key) && !target.hasOwnProperty(key)) {
              target[key] = section[key];
            }
          }
        } else {
          resolveErrors.push(localize3("json.schema.invalidref", "$ref '{0}' in '{1}' can not be resolved.", path5, sourceURI));
        }
      };
      var resolveExternalLink = function(node, uri, refSegment, parentSchemaURL, parentSchemaDependencies) {
        if (contextService && !/^[A-Za-z][A-Za-z0-9+\-.+]*:\/\/.*/.test(uri)) {
          uri = contextService.resolveRelativePath(uri, parentSchemaURL);
        }
        uri = normalizeId(uri);
        var referencedHandle = _this.getOrAddSchemaHandle(uri);
        return referencedHandle.getUnresolvedSchema().then(function(unresolvedSchema) {
          parentSchemaDependencies[uri] = true;
          if (unresolvedSchema.errors.length) {
            var loc = refSegment ? uri + "#" + refSegment : uri;
            resolveErrors.push(localize3("json.schema.problemloadingref", "Problems loading reference '{0}': {1}", loc, unresolvedSchema.errors[0]));
          }
          merge(node, unresolvedSchema.schema, uri, refSegment);
          return resolveRefs(node, unresolvedSchema.schema, uri, referencedHandle.dependencies);
        });
      };
      var resolveRefs = function(node, parentSchema, parentSchemaURL, parentSchemaDependencies) {
        if (!node || typeof node !== "object") {
          return Promise.resolve(null);
        }
        var toWalk = [node];
        var seen = [];
        var openPromises = [];
        var collectEntries = function() {
          var entries = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            entries[_i] = arguments[_i];
          }
          for (var _a = 0, entries_1 = entries; _a < entries_1.length; _a++) {
            var entry = entries_1[_a];
            if (typeof entry === "object") {
              toWalk.push(entry);
            }
          }
        };
        var collectMapEntries = function() {
          var maps = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            maps[_i] = arguments[_i];
          }
          for (var _a = 0, maps_1 = maps; _a < maps_1.length; _a++) {
            var map = maps_1[_a];
            if (typeof map === "object") {
              for (var k in map) {
                var key = k;
                var entry = map[key];
                if (typeof entry === "object") {
                  toWalk.push(entry);
                }
              }
            }
          }
        };
        var collectArrayEntries = function() {
          var arrays = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            arrays[_i] = arguments[_i];
          }
          for (var _a = 0, arrays_1 = arrays; _a < arrays_1.length; _a++) {
            var array = arrays_1[_a];
            if (Array.isArray(array)) {
              for (var _b = 0, array_1 = array; _b < array_1.length; _b++) {
                var entry = array_1[_b];
                if (typeof entry === "object") {
                  toWalk.push(entry);
                }
              }
            }
          }
        };
        var handleRef = function(next2) {
          var seenRefs = [];
          while (next2.$ref) {
            var ref = next2.$ref;
            var segments = ref.split("#", 2);
            delete next2.$ref;
            if (segments[0].length > 0) {
              openPromises.push(resolveExternalLink(next2, segments[0], segments[1], parentSchemaURL, parentSchemaDependencies));
              return;
            } else {
              if (seenRefs.indexOf(ref) === -1) {
                merge(next2, parentSchema, parentSchemaURL, segments[1]);
                seenRefs.push(ref);
              }
            }
          }
          collectEntries(next2.items, next2.additionalItems, next2.additionalProperties, next2.not, next2.contains, next2.propertyNames, next2.if, next2.then, next2.else);
          collectMapEntries(next2.definitions, next2.properties, next2.patternProperties, next2.dependencies);
          collectArrayEntries(next2.anyOf, next2.allOf, next2.oneOf, next2.items);
        };
        while (toWalk.length) {
          var next = toWalk.pop();
          if (seen.indexOf(next) >= 0) {
            continue;
          }
          seen.push(next);
          handleRef(next);
        }
        return _this.promise.all(openPromises);
      };
      return resolveRefs(schema, schema, schemaURL, dependencies).then(function(_) {
        return new ResolvedSchema(schema, resolveErrors);
      });
    };
    JSONSchemaService2.prototype.getSchemaForResource = function(resource, document) {
      if (document && document.root && document.root.type === "object") {
        var schemaProperties = document.root.properties.filter(function(p) {
          return p.keyNode.value === "$schema" && p.valueNode && p.valueNode.type === "string";
        });
        if (schemaProperties.length > 0) {
          var valueNode = schemaProperties[0].valueNode;
          if (valueNode && valueNode.type === "string") {
            var schemeId = getNodeValue2(valueNode);
            if (schemeId && startsWith(schemeId, ".") && this.contextService) {
              schemeId = this.contextService.resolveRelativePath(schemeId, resource);
            }
            if (schemeId) {
              var id = normalizeId(schemeId);
              return this.getOrAddSchemaHandle(id).getResolvedSchema();
            }
          }
        }
      }
      if (this.cachedSchemaForResource && this.cachedSchemaForResource.resource === resource) {
        return this.cachedSchemaForResource.resolvedSchema;
      }
      var seen = /* @__PURE__ */ Object.create(null);
      var schemas = [];
      var normalizedResource = normalizeResourceForMatching(resource);
      for (var _i = 0, _a = this.filePatternAssociations; _i < _a.length; _i++) {
        var entry = _a[_i];
        if (entry.matchesPattern(normalizedResource)) {
          for (var _b = 0, _c = entry.getURIs(); _b < _c.length; _b++) {
            var schemaId = _c[_b];
            if (!seen[schemaId]) {
              schemas.push(schemaId);
              seen[schemaId] = true;
            }
          }
        }
      }
      var resolvedSchema = schemas.length > 0 ? this.createCombinedSchema(resource, schemas).getResolvedSchema() : this.promise.resolve(void 0);
      this.cachedSchemaForResource = { resource, resolvedSchema };
      return resolvedSchema;
    };
    JSONSchemaService2.prototype.createCombinedSchema = function(resource, schemaIds) {
      if (schemaIds.length === 1) {
        return this.getOrAddSchemaHandle(schemaIds[0]);
      } else {
        var combinedSchemaId = "schemaservice://combinedSchema/" + encodeURIComponent(resource);
        var combinedSchema = {
          allOf: schemaIds.map(function(schemaId) {
            return { $ref: schemaId };
          })
        };
        return this.addSchemaHandle(combinedSchemaId, combinedSchema);
      }
    };
    JSONSchemaService2.prototype.getMatchingSchemas = function(document, jsonDocument, schema) {
      if (schema) {
        var id = schema.id || "schemaservice://untitled/matchingSchemas/" + idCounter++;
        return this.resolveSchemaContent(new UnresolvedSchema(schema), id, {}).then(function(resolvedSchema) {
          return jsonDocument.getMatchingSchemas(resolvedSchema.schema).filter(function(s) {
            return !s.inverted;
          });
        });
      }
      return this.getSchemaForResource(document.uri, jsonDocument).then(function(schema2) {
        if (schema2) {
          return jsonDocument.getMatchingSchemas(schema2.schema).filter(function(s) {
            return !s.inverted;
          });
        }
        return [];
      });
    };
    return JSONSchemaService2;
  }()
);
var idCounter = 0;
function normalizeId(id) {
  try {
    return URI.parse(id).toString();
  } catch (e) {
    return id;
  }
}
function normalizeResourceForMatching(resource) {
  try {
    return URI.parse(resource).with({ fragment: null, query: null }).toString();
  } catch (e) {
    return resource;
  }
}
function toDisplayString(url) {
  try {
    var uri = URI.parse(url);
    if (uri.scheme === "file") {
      return uri.fsPath;
    }
  } catch (e) {
  }
  return url;
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlSchemaService.js
import { URI as URI4 } from "vscode-uri";

// node_modules/yaml-language-server/lib/esm/languageservice/utils/strings.js
function convertSimple2RegExpPattern(pattern) {
  return pattern.replace(/[-\\{}+?|^$.,[\]()#\s]/g, "\\$&").replace(/[*]/g, ".*");
}
function getIndentation(lineContent, position) {
  if (lineContent.length < position) {
    return 0;
  }
  for (let i = 0; i < position; i++) {
    const char = lineContent.charCodeAt(i);
    if (char !== 32 && char !== 9) {
      return i;
    }
  }
  return position;
}
function safeCreateUnicodeRegExp(pattern) {
  try {
    return new RegExp(pattern, "u");
  } catch (ignore) {
    return new RegExp(pattern);
  }
}
function getFirstNonWhitespaceCharacterAfterOffset(str, offset) {
  offset++;
  for (let i = offset; i < str.length; i++) {
    const char = str.charAt(i);
    if (char === " " || char === "	") {
      offset++;
    } else {
      return offset;
    }
  }
  return offset;
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlSchemaService.js
import { parse as parse3 } from "yaml";
import * as path2 from "path-browserify";

// node_modules/yaml-language-server/lib/esm/languageservice/parser/yamlParser07.js
import { Parser, Composer, LineCounter } from "yaml";

// node_modules/yaml-language-server/lib/esm/languageservice/utils/objects.js
function equals2(one, other) {
  if (one === other) {
    return true;
  }
  if (one === null || one === void 0 || other === null || other === void 0) {
    return false;
  }
  if (typeof one !== typeof other) {
    return false;
  }
  if (typeof one !== "object") {
    return false;
  }
  if (Array.isArray(one) !== Array.isArray(other)) {
    return false;
  }
  let i, key;
  if (Array.isArray(one)) {
    if (one.length !== other.length) {
      return false;
    }
    for (i = 0; i < one.length; i++) {
      if (!equals2(one[i], other[i])) {
        return false;
      }
    }
  } else {
    const oneKeys = [];
    for (key in one) {
      oneKeys.push(key);
    }
    oneKeys.sort();
    const otherKeys = [];
    for (key in other) {
      otherKeys.push(key);
    }
    otherKeys.sort();
    if (!equals2(oneKeys, otherKeys)) {
      return false;
    }
    for (i = 0; i < oneKeys.length; i++) {
      if (!equals2(one[oneKeys[i]], other[oneKeys[i]])) {
        return false;
      }
    }
  }
  return true;
}
function isNumber2(val) {
  return typeof val === "number";
}
function isDefined2(val) {
  return typeof val !== "undefined";
}
function isBoolean2(val) {
  return typeof val === "boolean";
}
function isString2(val) {
  return typeof val === "string";
}
function isIterable(val) {
  return Symbol.iterator in Object(val);
}

// node_modules/yaml-language-server/lib/esm/languageservice/utils/schemaUtils.js
import { URI as URI2 } from "vscode-uri";
import * as path from "path-browserify";
function getSchemaTypeName(schema) {
  const closestTitleWithType = schema.type && schema.closestTitle;
  if (schema.title) {
    return schema.title;
  }
  if (schema.$id) {
    return getSchemaRefTypeTitle(schema.$id);
  }
  if (schema.$ref || schema._$ref) {
    return getSchemaRefTypeTitle(schema.$ref || schema._$ref);
  }
  return Array.isArray(schema.type) ? schema.type.join(" | ") : closestTitleWithType ? schema.type.concat("(", schema.closestTitle, ")") : schema.type || schema.closestTitle;
}
function getSchemaRefTypeTitle($ref) {
  const match = $ref.match(/^(?:.*\/)?(.*?)(?:\.schema\.json)?$/);
  let type = !!match && match[1];
  if (!type) {
    type = "typeNotFound";
    console.error(`$ref (${$ref}) not parsed properly`);
  }
  return type;
}
function getSchemaTitle(schema, url) {
  const uri = URI2.parse(url);
  let baseName = path.basename(uri.fsPath);
  if (!path.extname(uri.fsPath)) {
    baseName += ".json";
  }
  if (Object.getOwnPropertyDescriptor(schema, "name")) {
    return Object.getOwnPropertyDescriptor(schema, "name").value + ` (${baseName})`;
  } else if (schema.title) {
    return schema.description ? schema.title + " - " + schema.description + ` (${baseName})` : schema.title + ` (${baseName})`;
  }
  return baseName;
}
function isPrimitiveType(schema) {
  return schema.type !== "object" && !isAnyOfAllOfOneOfType(schema);
}
function isAnyOfAllOfOneOfType(schema) {
  return !!(schema.anyOf || schema.allOf || schema.oneOf);
}

// node_modules/vscode-json-languageservice/lib/esm/services/jsonValidation.js
var localize4 = loadMessageBundle();
var JSONValidation = (
  /** @class */
  function() {
    function JSONValidation2(jsonSchemaService, promiseConstructor) {
      this.jsonSchemaService = jsonSchemaService;
      this.promise = promiseConstructor;
      this.validationEnabled = true;
    }
    JSONValidation2.prototype.configure = function(raw) {
      if (raw) {
        this.validationEnabled = raw.validate !== false;
        this.commentSeverity = raw.allowComments ? void 0 : DiagnosticSeverity.Error;
      }
    };
    JSONValidation2.prototype.doValidation = function(textDocument, jsonDocument, documentSettings, schema) {
      var _this = this;
      if (!this.validationEnabled) {
        return this.promise.resolve([]);
      }
      var diagnostics = [];
      var added = {};
      var addProblem = function(problem) {
        var signature = problem.range.start.line + " " + problem.range.start.character + " " + problem.message;
        if (!added[signature]) {
          added[signature] = true;
          diagnostics.push(problem);
        }
      };
      var getDiagnostics = function(schema2) {
        var trailingCommaSeverity = (documentSettings === null || documentSettings === void 0 ? void 0 : documentSettings.trailingCommas) ? toDiagnosticSeverity(documentSettings.trailingCommas) : DiagnosticSeverity.Error;
        var commentSeverity = (documentSettings === null || documentSettings === void 0 ? void 0 : documentSettings.comments) ? toDiagnosticSeverity(documentSettings.comments) : _this.commentSeverity;
        var schemaValidation = (documentSettings === null || documentSettings === void 0 ? void 0 : documentSettings.schemaValidation) ? toDiagnosticSeverity(documentSettings.schemaValidation) : DiagnosticSeverity.Warning;
        var schemaRequest = (documentSettings === null || documentSettings === void 0 ? void 0 : documentSettings.schemaRequest) ? toDiagnosticSeverity(documentSettings.schemaRequest) : DiagnosticSeverity.Warning;
        if (schema2) {
          if (schema2.errors.length && jsonDocument.root && schemaRequest) {
            var astRoot = jsonDocument.root;
            var property = astRoot.type === "object" ? astRoot.properties[0] : void 0;
            if (property && property.keyNode.value === "$schema") {
              var node = property.valueNode || property;
              var range = Range.create(textDocument.positionAt(node.offset), textDocument.positionAt(node.offset + node.length));
              addProblem(Diagnostic.create(range, schema2.errors[0], schemaRequest, ErrorCode.SchemaResolveError));
            } else {
              var range = Range.create(textDocument.positionAt(astRoot.offset), textDocument.positionAt(astRoot.offset + 1));
              addProblem(Diagnostic.create(range, schema2.errors[0], schemaRequest, ErrorCode.SchemaResolveError));
            }
          } else if (schemaValidation) {
            var semanticErrors = jsonDocument.validate(textDocument, schema2.schema, schemaValidation);
            if (semanticErrors) {
              semanticErrors.forEach(addProblem);
            }
          }
          if (schemaAllowsComments(schema2.schema)) {
            commentSeverity = void 0;
          }
          if (schemaAllowsTrailingCommas(schema2.schema)) {
            trailingCommaSeverity = void 0;
          }
        }
        for (var _i = 0, _a = jsonDocument.syntaxErrors; _i < _a.length; _i++) {
          var p = _a[_i];
          if (p.code === ErrorCode.TrailingComma) {
            if (typeof trailingCommaSeverity !== "number") {
              continue;
            }
            p.severity = trailingCommaSeverity;
          }
          addProblem(p);
        }
        if (typeof commentSeverity === "number") {
          var message_1 = localize4("InvalidCommentToken", "Comments are not permitted in JSON.");
          jsonDocument.comments.forEach(function(c) {
            addProblem(Diagnostic.create(c, message_1, commentSeverity, ErrorCode.CommentNotPermitted));
          });
        }
        return diagnostics;
      };
      if (schema) {
        var id = schema.id || "schemaservice://untitled/" + idCounter2++;
        return this.jsonSchemaService.resolveSchemaContent(new UnresolvedSchema(schema), id, {}).then(function(resolvedSchema) {
          return getDiagnostics(resolvedSchema);
        });
      }
      return this.jsonSchemaService.getSchemaForResource(textDocument.uri, jsonDocument).then(function(schema2) {
        return getDiagnostics(schema2);
      });
    };
    return JSONValidation2;
  }()
);
var idCounter2 = 0;
function schemaAllowsComments(schemaRef) {
  if (schemaRef && typeof schemaRef === "object") {
    if (isBoolean(schemaRef.allowComments)) {
      return schemaRef.allowComments;
    }
    if (schemaRef.allOf) {
      for (var _i = 0, _a = schemaRef.allOf; _i < _a.length; _i++) {
        var schema = _a[_i];
        var allow = schemaAllowsComments(schema);
        if (isBoolean(allow)) {
          return allow;
        }
      }
    }
  }
  return void 0;
}
function schemaAllowsTrailingCommas(schemaRef) {
  if (schemaRef && typeof schemaRef === "object") {
    if (isBoolean(schemaRef.allowTrailingCommas)) {
      return schemaRef.allowTrailingCommas;
    }
    var deprSchemaRef = schemaRef;
    if (isBoolean(deprSchemaRef["allowsTrailingCommas"])) {
      return deprSchemaRef["allowsTrailingCommas"];
    }
    if (schemaRef.allOf) {
      for (var _i = 0, _a = schemaRef.allOf; _i < _a.length; _i++) {
        var schema = _a[_i];
        var allow = schemaAllowsTrailingCommas(schema);
        if (isBoolean(allow)) {
          return allow;
        }
      }
    }
  }
  return void 0;
}
function toDiagnosticSeverity(severityLevel) {
  switch (severityLevel) {
    case "error":
      return DiagnosticSeverity.Error;
    case "warning":
      return DiagnosticSeverity.Warning;
    case "ignore":
      return void 0;
  }
  return void 0;
}

// node_modules/vscode-json-languageservice/lib/esm/utils/colors.js
var Digit0 = 48;
var Digit9 = 57;
var A = 65;
var a = 97;
var f = 102;
function hexDigit(charCode) {
  if (charCode < Digit0) {
    return 0;
  }
  if (charCode <= Digit9) {
    return charCode - Digit0;
  }
  if (charCode < a) {
    charCode += a - A;
  }
  if (charCode >= a && charCode <= f) {
    return charCode - a + 10;
  }
  return 0;
}
function colorFromHex(text) {
  if (text[0] !== "#") {
    return void 0;
  }
  switch (text.length) {
    case 4:
      return {
        red: hexDigit(text.charCodeAt(1)) * 17 / 255,
        green: hexDigit(text.charCodeAt(2)) * 17 / 255,
        blue: hexDigit(text.charCodeAt(3)) * 17 / 255,
        alpha: 1
      };
    case 5:
      return {
        red: hexDigit(text.charCodeAt(1)) * 17 / 255,
        green: hexDigit(text.charCodeAt(2)) * 17 / 255,
        blue: hexDigit(text.charCodeAt(3)) * 17 / 255,
        alpha: hexDigit(text.charCodeAt(4)) * 17 / 255
      };
    case 7:
      return {
        red: (hexDigit(text.charCodeAt(1)) * 16 + hexDigit(text.charCodeAt(2))) / 255,
        green: (hexDigit(text.charCodeAt(3)) * 16 + hexDigit(text.charCodeAt(4))) / 255,
        blue: (hexDigit(text.charCodeAt(5)) * 16 + hexDigit(text.charCodeAt(6))) / 255,
        alpha: 1
      };
    case 9:
      return {
        red: (hexDigit(text.charCodeAt(1)) * 16 + hexDigit(text.charCodeAt(2))) / 255,
        green: (hexDigit(text.charCodeAt(3)) * 16 + hexDigit(text.charCodeAt(4))) / 255,
        blue: (hexDigit(text.charCodeAt(5)) * 16 + hexDigit(text.charCodeAt(6))) / 255,
        alpha: (hexDigit(text.charCodeAt(7)) * 16 + hexDigit(text.charCodeAt(8))) / 255
      };
  }
  return void 0;
}

// node_modules/vscode-json-languageservice/lib/esm/services/jsonDocumentSymbols.js
var JSONDocumentSymbols = (
  /** @class */
  function() {
    function JSONDocumentSymbols2(schemaService) {
      this.schemaService = schemaService;
    }
    JSONDocumentSymbols2.prototype.findDocumentSymbols = function(document, doc, context) {
      var _this = this;
      if (context === void 0) {
        context = { resultLimit: Number.MAX_VALUE };
      }
      var root = doc.root;
      if (!root) {
        return [];
      }
      var limit = context.resultLimit || Number.MAX_VALUE;
      var resourceString = document.uri;
      if (resourceString === "vscode://defaultsettings/keybindings.json" || endsWith(resourceString.toLowerCase(), "/user/keybindings.json")) {
        if (root.type === "array") {
          var result_1 = [];
          for (var _i = 0, _a = root.items; _i < _a.length; _i++) {
            var item = _a[_i];
            if (item.type === "object") {
              for (var _b = 0, _c = item.properties; _b < _c.length; _b++) {
                var property = _c[_b];
                if (property.keyNode.value === "key" && property.valueNode) {
                  var location = Location.create(document.uri, getRange(document, item));
                  result_1.push({ name: getNodeValue2(property.valueNode), kind: SymbolKind.Function, location });
                  limit--;
                  if (limit <= 0) {
                    if (context && context.onResultLimitExceeded) {
                      context.onResultLimitExceeded(resourceString);
                    }
                    return result_1;
                  }
                }
              }
            }
          }
          return result_1;
        }
      }
      var toVisit = [
        { node: root, containerName: "" }
      ];
      var nextToVisit = 0;
      var limitExceeded = false;
      var result = [];
      var collectOutlineEntries = function(node, containerName) {
        if (node.type === "array") {
          node.items.forEach(function(node2) {
            if (node2) {
              toVisit.push({ node: node2, containerName });
            }
          });
        } else if (node.type === "object") {
          node.properties.forEach(function(property2) {
            var valueNode = property2.valueNode;
            if (valueNode) {
              if (limit > 0) {
                limit--;
                var location2 = Location.create(document.uri, getRange(document, property2));
                var childContainerName = containerName ? containerName + "." + property2.keyNode.value : property2.keyNode.value;
                result.push({ name: _this.getKeyLabel(property2), kind: _this.getSymbolKind(valueNode.type), location: location2, containerName });
                toVisit.push({ node: valueNode, containerName: childContainerName });
              } else {
                limitExceeded = true;
              }
            }
          });
        }
      };
      while (nextToVisit < toVisit.length) {
        var next = toVisit[nextToVisit++];
        collectOutlineEntries(next.node, next.containerName);
      }
      if (limitExceeded && context && context.onResultLimitExceeded) {
        context.onResultLimitExceeded(resourceString);
      }
      return result;
    };
    JSONDocumentSymbols2.prototype.findDocumentSymbols2 = function(document, doc, context) {
      var _this = this;
      if (context === void 0) {
        context = { resultLimit: Number.MAX_VALUE };
      }
      var root = doc.root;
      if (!root) {
        return [];
      }
      var limit = context.resultLimit || Number.MAX_VALUE;
      var resourceString = document.uri;
      if (resourceString === "vscode://defaultsettings/keybindings.json" || endsWith(resourceString.toLowerCase(), "/user/keybindings.json")) {
        if (root.type === "array") {
          var result_2 = [];
          for (var _i = 0, _a = root.items; _i < _a.length; _i++) {
            var item = _a[_i];
            if (item.type === "object") {
              for (var _b = 0, _c = item.properties; _b < _c.length; _b++) {
                var property = _c[_b];
                if (property.keyNode.value === "key" && property.valueNode) {
                  var range = getRange(document, item);
                  var selectionRange = getRange(document, property.keyNode);
                  result_2.push({ name: getNodeValue2(property.valueNode), kind: SymbolKind.Function, range, selectionRange });
                  limit--;
                  if (limit <= 0) {
                    if (context && context.onResultLimitExceeded) {
                      context.onResultLimitExceeded(resourceString);
                    }
                    return result_2;
                  }
                }
              }
            }
          }
          return result_2;
        }
      }
      var result = [];
      var toVisit = [
        { node: root, result }
      ];
      var nextToVisit = 0;
      var limitExceeded = false;
      var collectOutlineEntries = function(node, result2) {
        if (node.type === "array") {
          node.items.forEach(function(node2, index) {
            if (node2) {
              if (limit > 0) {
                limit--;
                var range2 = getRange(document, node2);
                var selectionRange2 = range2;
                var name = String(index);
                var symbol = { name, kind: _this.getSymbolKind(node2.type), range: range2, selectionRange: selectionRange2, children: [] };
                result2.push(symbol);
                toVisit.push({ result: symbol.children, node: node2 });
              } else {
                limitExceeded = true;
              }
            }
          });
        } else if (node.type === "object") {
          node.properties.forEach(function(property2) {
            var valueNode = property2.valueNode;
            if (valueNode) {
              if (limit > 0) {
                limit--;
                var range2 = getRange(document, property2);
                var selectionRange2 = getRange(document, property2.keyNode);
                var children = [];
                var symbol = { name: _this.getKeyLabel(property2), kind: _this.getSymbolKind(valueNode.type), range: range2, selectionRange: selectionRange2, children, detail: _this.getDetail(valueNode) };
                result2.push(symbol);
                toVisit.push({ result: children, node: valueNode });
              } else {
                limitExceeded = true;
              }
            }
          });
        }
      };
      while (nextToVisit < toVisit.length) {
        var next = toVisit[nextToVisit++];
        collectOutlineEntries(next.node, next.result);
      }
      if (limitExceeded && context && context.onResultLimitExceeded) {
        context.onResultLimitExceeded(resourceString);
      }
      return result;
    };
    JSONDocumentSymbols2.prototype.getSymbolKind = function(nodeType) {
      switch (nodeType) {
        case "object":
          return SymbolKind.Module;
        case "string":
          return SymbolKind.String;
        case "number":
          return SymbolKind.Number;
        case "array":
          return SymbolKind.Array;
        case "boolean":
          return SymbolKind.Boolean;
        default:
          return SymbolKind.Variable;
      }
    };
    JSONDocumentSymbols2.prototype.getKeyLabel = function(property) {
      var name = property.keyNode.value;
      if (name) {
        name = name.replace(/[\n]/g, "\u21B5");
      }
      if (name && name.trim()) {
        return name;
      }
      return '"' + name + '"';
    };
    JSONDocumentSymbols2.prototype.getDetail = function(node) {
      if (!node) {
        return void 0;
      }
      if (node.type === "boolean" || node.type === "number" || node.type === "null" || node.type === "string") {
        return String(node.value);
      } else {
        if (node.type === "array") {
          return node.children.length ? void 0 : "[]";
        } else if (node.type === "object") {
          return node.children.length ? void 0 : "{}";
        }
      }
      return void 0;
    };
    JSONDocumentSymbols2.prototype.findDocumentColors = function(document, doc, context) {
      return this.schemaService.getSchemaForResource(document.uri, doc).then(function(schema) {
        var result = [];
        if (schema) {
          var limit = context && typeof context.resultLimit === "number" ? context.resultLimit : Number.MAX_VALUE;
          var matchingSchemas = doc.getMatchingSchemas(schema.schema);
          var visitedNode = {};
          for (var _i = 0, matchingSchemas_1 = matchingSchemas; _i < matchingSchemas_1.length; _i++) {
            var s = matchingSchemas_1[_i];
            if (!s.inverted && s.schema && (s.schema.format === "color" || s.schema.format === "color-hex") && s.node && s.node.type === "string") {
              var nodeId = String(s.node.offset);
              if (!visitedNode[nodeId]) {
                var color = colorFromHex(getNodeValue2(s.node));
                if (color) {
                  var range = getRange(document, s.node);
                  result.push({ color, range });
                }
                visitedNode[nodeId] = true;
                limit--;
                if (limit <= 0) {
                  if (context && context.onResultLimitExceeded) {
                    context.onResultLimitExceeded(document.uri);
                  }
                  return result;
                }
              }
            }
          }
        }
        return result;
      });
    };
    JSONDocumentSymbols2.prototype.getColorPresentations = function(document, doc, color, range) {
      var result = [];
      var red256 = Math.round(color.red * 255), green256 = Math.round(color.green * 255), blue256 = Math.round(color.blue * 255);
      function toTwoDigitHex(n) {
        var r = n.toString(16);
        return r.length !== 2 ? "0" + r : r;
      }
      var label;
      if (color.alpha === 1) {
        label = "#" + toTwoDigitHex(red256) + toTwoDigitHex(green256) + toTwoDigitHex(blue256);
      } else {
        label = "#" + toTwoDigitHex(red256) + toTwoDigitHex(green256) + toTwoDigitHex(blue256) + toTwoDigitHex(Math.round(color.alpha * 255));
      }
      result.push({ label, textEdit: TextEdit.replace(range, JSON.stringify(label)) });
      return result;
    };
    return JSONDocumentSymbols2;
  }()
);
function getRange(document, node) {
  return Range.create(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
}

// node_modules/vscode-json-languageservice/lib/esm/services/jsonLinks.js
function findLinks(document, doc) {
  var links = [];
  doc.visit(function(node) {
    var _a;
    if (node.type === "property" && node.keyNode.value === "$ref" && ((_a = node.valueNode) === null || _a === void 0 ? void 0 : _a.type) === "string") {
      var path5 = node.valueNode.value;
      var targetNode = findTargetNode(doc, path5);
      if (targetNode) {
        var targetPos = document.positionAt(targetNode.offset);
        links.push({
          target: document.uri + "#" + (targetPos.line + 1) + "," + (targetPos.character + 1),
          range: createRange(document, node.valueNode)
        });
      }
    }
    return true;
  });
  return Promise.resolve(links);
}
function createRange(document, node) {
  return Range.create(document.positionAt(node.offset + 1), document.positionAt(node.offset + node.length - 1));
}
function findTargetNode(doc, path5) {
  var tokens = parseJSONPointer(path5);
  if (!tokens) {
    return null;
  }
  return findNode(tokens, doc.root);
}
function findNode(pointer, node) {
  if (!node) {
    return null;
  }
  if (pointer.length === 0) {
    return node;
  }
  var token = pointer.shift();
  if (node && node.type === "object") {
    var propertyNode = node.properties.find(function(propertyNode2) {
      return propertyNode2.keyNode.value === token;
    });
    if (!propertyNode) {
      return null;
    }
    return findNode(pointer, propertyNode.valueNode);
  } else if (node && node.type === "array") {
    if (token.match(/^(0|[1-9][0-9]*)$/)) {
      var index = Number.parseInt(token);
      var arrayItem = node.items[index];
      if (!arrayItem) {
        return null;
      }
      return findNode(pointer, arrayItem);
    }
  }
  return null;
}
function parseJSONPointer(path5) {
  if (path5 === "#") {
    return [];
  }
  if (path5[0] !== "#" || path5[1] !== "/") {
    return null;
  }
  return path5.substring(2).split(/\//).map(unescape);
}
function unescape(str) {
  return str.replace(/~1/g, "/").replace(/~0/g, "~");
}

// node_modules/yaml-language-server/lib/esm/languageservice/parser/jsonParser07.js
import { URI as URI3 } from "vscode-uri";
import { Diagnostic as Diagnostic2, DiagnosticSeverity as DiagnosticSeverity2, Range as Range2 } from "vscode-languageserver-types";

// node_modules/yaml-language-server/lib/esm/languageservice/utils/arrUtils.js
function matchOffsetToDocument(offset, jsonDocuments) {
  for (const jsonDoc of jsonDocuments.documents) {
    if (jsonDoc.internalDocument && jsonDoc.internalDocument.range[0] <= offset && jsonDoc.internalDocument.range[2] >= offset) {
      return jsonDoc;
    }
  }
  if (jsonDocuments.documents.length === 1) {
    return jsonDocuments.documents[0];
  }
  return null;
}
function filterInvalidCustomTags(customTags) {
  const validCustomTags = ["mapping", "scalar", "sequence"];
  if (!customTags) {
    return [];
  }
  return customTags.filter((tag) => {
    if (typeof tag === "string") {
      const typeInfo = tag.split(" ");
      const type = typeInfo[1] && typeInfo[1].toLowerCase() || "scalar";
      if (type === "map") {
        return false;
      }
      return validCustomTags.indexOf(type) !== -1;
    }
    return false;
  });
}
function isArrayEqual(fst, snd) {
  if (!snd || !fst) {
    return false;
  }
  if (snd.length !== fst.length) {
    return false;
  }
  for (let index = fst.length - 1; index >= 0; index--) {
    if (fst[index] !== snd[index]) {
      return false;
    }
  }
  return true;
}

// node_modules/yaml-language-server/lib/esm/languageservice/utils/math.js
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = Math.max(valDecCount, stepDecCount);
  const valInt = parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / Math.pow(10, decCount);
}

// node_modules/yaml-language-server/lib/esm/languageservice/parser/jsonParser07.js
var localize5 = loadMessageBundle();
var MSG_PROPERTY_NOT_ALLOWED = "Property {0} is not allowed.";
var formats2 = {
  "color-hex": {
    errorMessage: localize5("colorHexFormatWarning", "Invalid color format. Use #RGB, #RGBA, #RRGGBB or #RRGGBBAA."),
    pattern: /^#([0-9A-Fa-f]{3,4}|([0-9A-Fa-f]{2}){3,4})$/
  },
  "date-time": {
    errorMessage: localize5("dateTimeFormatWarning", "String is not a RFC3339 date-time."),
    pattern: /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)([01][0-9]|2[0-3]):([0-5][0-9]))$/i
  },
  date: {
    errorMessage: localize5("dateFormatWarning", "String is not a RFC3339 date."),
    pattern: /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/i
  },
  time: {
    errorMessage: localize5("timeFormatWarning", "String is not a RFC3339 time."),
    pattern: /^([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)([01][0-9]|2[0-3]):([0-5][0-9]))$/i
  },
  email: {
    errorMessage: localize5("emailFormatWarning", "String is not an e-mail address."),
    pattern: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  },
  ipv4: {
    errorMessage: localize5("ipv4FormatWarning", "String does not match IPv4 format."),
    pattern: /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/
  },
  ipv6: {
    errorMessage: localize5("ipv6FormatWarning", "String does not match IPv6 format."),
    pattern: /^([0-9a-f]|:){1,4}(:([0-9a-f]{0,4})*){1,7}$/i
  }
};
var YAML_SOURCE = "YAML";
var YAML_SCHEMA_PREFIX = "yaml-schema: ";
var ProblemType;
(function(ProblemType2) {
  ProblemType2["missingRequiredPropWarning"] = "missingRequiredPropWarning";
  ProblemType2["typeMismatchWarning"] = "typeMismatchWarning";
  ProblemType2["constWarning"] = "constWarning";
})(ProblemType || (ProblemType = {}));
var ProblemTypeMessages = {
  [ProblemType.missingRequiredPropWarning]: 'Missing property "{0}".',
  [ProblemType.typeMismatchWarning]: 'Incorrect type. Expected "{0}".',
  [ProblemType.constWarning]: "Value must be {0}."
};
var ASTNodeImpl2 = class {
  constructor(parent, internalNode, offset, length) {
    this.offset = offset;
    this.length = length;
    this.parent = parent;
    this.internalNode = internalNode;
  }
  getNodeFromOffsetEndInclusive(offset) {
    const collector = [];
    const findNode2 = (node) => {
      if (offset >= node.offset && offset <= node.offset + node.length) {
        const children = node.children;
        for (let i = 0; i < children.length && children[i].offset <= offset; i++) {
          const item = findNode2(children[i]);
          if (item) {
            collector.push(item);
          }
        }
        return node;
      }
      return null;
    };
    const foundNode = findNode2(this);
    let currMinDist = Number.MAX_VALUE;
    let currMinNode = null;
    for (const currNode of collector) {
      const minDist = currNode.length + currNode.offset - offset + (offset - currNode.offset);
      if (minDist < currMinDist) {
        currMinNode = currNode;
        currMinDist = minDist;
      }
    }
    return currMinNode || foundNode;
  }
  get children() {
    return [];
  }
  toString() {
    return "type: " + this.type + " (" + this.offset + "/" + this.length + ")" + (this.parent ? " parent: {" + this.parent.toString() + "}" : "");
  }
};
var NullASTNodeImpl2 = class extends ASTNodeImpl2 {
  constructor(parent, internalNode, offset, length) {
    super(parent, internalNode, offset, length);
    this.type = "null";
    this.value = null;
  }
};
var BooleanASTNodeImpl2 = class extends ASTNodeImpl2 {
  constructor(parent, internalNode, boolValue, boolSource, offset, length) {
    super(parent, internalNode, offset, length);
    this.type = "boolean";
    this.value = boolValue;
    this.source = boolSource;
  }
};
var ArrayASTNodeImpl2 = class extends ASTNodeImpl2 {
  constructor(parent, internalNode, offset, length) {
    super(parent, internalNode, offset, length);
    this.type = "array";
    this.items = [];
  }
  get children() {
    return this.items;
  }
};
var NumberASTNodeImpl2 = class extends ASTNodeImpl2 {
  constructor(parent, internalNode, offset, length) {
    super(parent, internalNode, offset, length);
    this.type = "number";
    this.isInteger = true;
    this.value = Number.NaN;
  }
};
var StringASTNodeImpl2 = class extends ASTNodeImpl2 {
  constructor(parent, internalNode, offset, length) {
    super(parent, internalNode, offset, length);
    this.type = "string";
    this.value = "";
  }
};
var PropertyASTNodeImpl2 = class extends ASTNodeImpl2 {
  constructor(parent, internalNode, offset, length) {
    super(parent, internalNode, offset, length);
    this.type = "property";
    this.colonOffset = -1;
  }
  get children() {
    return this.valueNode ? [this.keyNode, this.valueNode] : [this.keyNode];
  }
};
var ObjectASTNodeImpl2 = class extends ASTNodeImpl2 {
  constructor(parent, internalNode, offset, length) {
    super(parent, internalNode, offset, length);
    this.type = "object";
    this.properties = [];
  }
  get children() {
    return this.properties;
  }
};
function asSchema2(schema) {
  if (schema === void 0) {
    return void 0;
  }
  if (isBoolean2(schema)) {
    return schema ? {} : { not: {} };
  }
  if (typeof schema !== "object") {
    console.warn(`Wrong schema: ${JSON.stringify(schema)}, it MUST be an Object or Boolean`);
    schema = {
      type: schema
    };
  }
  return schema;
}
var EnumMatch2;
(function(EnumMatch3) {
  EnumMatch3[EnumMatch3["Key"] = 0] = "Key";
  EnumMatch3[EnumMatch3["Enum"] = 1] = "Enum";
})(EnumMatch2 || (EnumMatch2 = {}));
var SchemaCollector2 = class _SchemaCollector {
  constructor(focusOffset = -1, exclude = null) {
    this.focusOffset = focusOffset;
    this.exclude = exclude;
    this.schemas = [];
  }
  add(schema) {
    this.schemas.push(schema);
  }
  merge(other) {
    this.schemas.push(...other.schemas);
  }
  include(node) {
    return (this.focusOffset === -1 || contains2(node, this.focusOffset)) && node !== this.exclude;
  }
  newSub() {
    return new _SchemaCollector(-1, this.exclude);
  }
};
var NoOpSchemaCollector2 = class {
  constructor() {
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get schemas() {
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  add(schema) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  merge(other) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  include(node) {
    return true;
  }
  newSub() {
    return this;
  }
};
NoOpSchemaCollector2.instance = new NoOpSchemaCollector2();
var ValidationResult2 = class {
  constructor(isKubernetes) {
    this.problems = [];
    this.propertiesMatches = 0;
    this.propertiesValueMatches = 0;
    this.primaryValueMatches = 0;
    this.enumValueMatch = false;
    if (isKubernetes) {
      this.enumValues = [];
    } else {
      this.enumValues = null;
    }
  }
  hasProblems() {
    return !!this.problems.length;
  }
  mergeAll(validationResults) {
    for (const validationResult of validationResults) {
      this.merge(validationResult);
    }
  }
  merge(validationResult) {
    this.problems = this.problems.concat(validationResult.problems);
  }
  mergeEnumValues(validationResult) {
    if (!this.enumValueMatch && !validationResult.enumValueMatch && this.enumValues && validationResult.enumValues) {
      this.enumValues = this.enumValues.concat(validationResult.enumValues);
      for (const error of this.problems) {
        if (error.code === ErrorCode.EnumValueMismatch) {
          error.message = localize5("enumWarning", "Value is not accepted. Valid values: {0}.", [...new Set(this.enumValues)].map((v) => {
            return JSON.stringify(v);
          }).join(", "));
        }
      }
    }
  }
  /**
   * Merge multiple warnings with same problemType together
   * @param subValidationResult another possible result
   */
  mergeWarningGeneric(subValidationResult, problemTypesToMerge) {
    var _a, _b, _c;
    if ((_a = this.problems) == null ? void 0 : _a.length) {
      for (const problemType of problemTypesToMerge) {
        const bestResults = this.problems.filter((p) => p.problemType === problemType);
        for (const bestResult of bestResults) {
          const mergingResult = (_b = subValidationResult.problems) == null ? void 0 : _b.find(
            (p) => p.problemType === problemType && bestResult.location.offset === p.location.offset && (problemType !== ProblemType.missingRequiredPropWarning || isArrayEqual(p.problemArgs, bestResult.problemArgs))
          );
          if (mergingResult) {
            if ((_c = mergingResult.problemArgs) == null ? void 0 : _c.length) {
              mergingResult.problemArgs.filter((p) => !bestResult.problemArgs.includes(p)).forEach((p) => bestResult.problemArgs.push(p));
              bestResult.message = getWarningMessage(bestResult.problemType, bestResult.problemArgs);
            }
            this.mergeSources(mergingResult, bestResult);
          }
        }
      }
    }
  }
  mergePropertyMatch(propertyValidationResult) {
    this.merge(propertyValidationResult);
    this.propertiesMatches++;
    if (propertyValidationResult.enumValueMatch || !propertyValidationResult.hasProblems() && propertyValidationResult.propertiesMatches) {
      this.propertiesValueMatches++;
    }
    if (propertyValidationResult.enumValueMatch && propertyValidationResult.enumValues) {
      this.primaryValueMatches++;
    }
  }
  mergeSources(mergingResult, bestResult) {
    const mergingSource = mergingResult.source.replace(YAML_SCHEMA_PREFIX, "");
    if (!bestResult.source.includes(mergingSource)) {
      bestResult.source = bestResult.source + " | " + mergingSource;
    }
    if (!bestResult.schemaUri.includes(mergingResult.schemaUri[0])) {
      bestResult.schemaUri = bestResult.schemaUri.concat(mergingResult.schemaUri);
    }
  }
  compareGeneric(other) {
    const hasProblems = this.hasProblems();
    if (hasProblems !== other.hasProblems()) {
      return hasProblems ? -1 : 1;
    }
    if (this.enumValueMatch !== other.enumValueMatch) {
      return other.enumValueMatch ? -1 : 1;
    }
    if (this.propertiesValueMatches !== other.propertiesValueMatches) {
      return this.propertiesValueMatches - other.propertiesValueMatches;
    }
    if (this.primaryValueMatches !== other.primaryValueMatches) {
      return this.primaryValueMatches - other.primaryValueMatches;
    }
    return this.propertiesMatches - other.propertiesMatches;
  }
  compareKubernetes(other) {
    const hasProblems = this.hasProblems();
    if (this.propertiesMatches !== other.propertiesMatches) {
      return this.propertiesMatches - other.propertiesMatches;
    }
    if (this.enumValueMatch !== other.enumValueMatch) {
      return other.enumValueMatch ? -1 : 1;
    }
    if (this.primaryValueMatches !== other.primaryValueMatches) {
      return this.primaryValueMatches - other.primaryValueMatches;
    }
    if (this.propertiesValueMatches !== other.propertiesValueMatches) {
      return this.propertiesValueMatches - other.propertiesValueMatches;
    }
    if (hasProblems !== other.hasProblems()) {
      return hasProblems ? -1 : 1;
    }
    return this.propertiesMatches - other.propertiesMatches;
  }
};
function getNodeValue3(node) {
  switch (node.type) {
    case "array":
      return node.children.map(getNodeValue3);
    case "object": {
      const obj = /* @__PURE__ */ Object.create(null);
      for (let _i = 0, _a = node.children; _i < _a.length; _i++) {
        const prop = _a[_i];
        const valueNode = prop.children[1];
        if (valueNode) {
          obj[prop.children[0].value] = getNodeValue3(valueNode);
        }
      }
      return obj;
    }
    case "null":
    case "string":
    case "number":
      return node.value;
    case "boolean":
      return node.source;
    default:
      return void 0;
  }
}
function contains2(node, offset, includeRightBound = false) {
  return offset >= node.offset && offset <= node.offset + node.length || includeRightBound && offset === node.offset + node.length;
}
function findNodeAtOffset2(node, offset, includeRightBound) {
  if (includeRightBound === void 0) {
    includeRightBound = false;
  }
  if (contains2(node, offset, includeRightBound)) {
    const children = node.children;
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length && children[i].offset <= offset; i++) {
        const item = findNodeAtOffset2(children[i], offset, includeRightBound);
        if (item) {
          return item;
        }
      }
    }
    return node;
  }
  return void 0;
}
var JSONDocument2 = class {
  constructor(root, syntaxErrors = [], comments = []) {
    this.root = root;
    this.syntaxErrors = syntaxErrors;
    this.comments = comments;
  }
  getNodeFromOffset(offset, includeRightBound = false) {
    if (this.root) {
      return findNodeAtOffset2(this.root, offset, includeRightBound);
    }
    return void 0;
  }
  getNodeFromOffsetEndInclusive(offset) {
    return this.root && this.root.getNodeFromOffsetEndInclusive(offset);
  }
  visit(visitor) {
    if (this.root) {
      const doVisit = (node) => {
        let ctn = visitor(node);
        const children = node.children;
        if (Array.isArray(children)) {
          for (let i = 0; i < children.length && ctn; i++) {
            ctn = doVisit(children[i]);
          }
        }
        return ctn;
      };
      doVisit(this.root);
    }
  }
  validate(textDocument, schema) {
    if (this.root && schema) {
      const validationResult = new ValidationResult2(this.isKubernetes);
      validate2(this.root, schema, schema, validationResult, NoOpSchemaCollector2.instance, {
        isKubernetes: this.isKubernetes,
        disableAdditionalProperties: this.disableAdditionalProperties,
        uri: this.uri
      });
      return validationResult.problems.map((p) => {
        const range = Range2.create(textDocument.positionAt(p.location.offset), textDocument.positionAt(p.location.offset + p.location.length));
        const diagnostic = Diagnostic2.create(range, p.message, p.severity, p.code ? p.code : ErrorCode.Undefined, p.source);
        diagnostic.data = { schemaUri: p.schemaUri, ...p.data };
        return diagnostic;
      });
    }
    return null;
  }
  /**
   * This method returns the list of applicable schemas
   *
   * currently used @param didCallFromAutoComplete flag to differentiate the method call, when it is from auto complete
   * then user still types something and skip the validation for timebeing untill completed.
   * On https://github.com/redhat-developer/yaml-language-server/pull/719 the auto completes need to populate the list of enum string which matches to the enum
   * and on https://github.com/redhat-developer/vscode-yaml/issues/803 the validation should throw the error based on the enum string.
   *
   * @param schema schema
   * @param focusOffset  offsetValue
   * @param exclude excluded Node
   * @param didCallFromAutoComplete true if method called from AutoComplete
   * @returns array of applicable schemas
   */
  getMatchingSchemas(schema, focusOffset = -1, exclude = null, didCallFromAutoComplete) {
    const matchingSchemas = new SchemaCollector2(focusOffset, exclude);
    if (this.root && schema) {
      validate2(this.root, schema, schema, new ValidationResult2(this.isKubernetes), matchingSchemas, {
        isKubernetes: this.isKubernetes,
        disableAdditionalProperties: this.disableAdditionalProperties,
        uri: this.uri,
        callFromAutoComplete: didCallFromAutoComplete
      });
    }
    return matchingSchemas.schemas;
  }
};
function validate2(node, schema, originalSchema, validationResult, matchingSchemas, options) {
  const { isKubernetes, callFromAutoComplete } = options;
  if (!node) {
    return;
  }
  if (typeof schema !== "object") {
    return;
  }
  if (!schema.url) {
    schema.url = originalSchema.url;
  }
  schema.closestTitle = schema.title || originalSchema.closestTitle;
  switch (node.type) {
    case "object":
      _validateObjectNode(node, schema, validationResult, matchingSchemas);
      break;
    case "array":
      _validateArrayNode(node, schema, validationResult, matchingSchemas);
      break;
    case "string":
      _validateStringNode(node, schema, validationResult);
      break;
    case "number":
      _validateNumberNode(node, schema, validationResult);
      break;
    case "property":
      return validate2(node.valueNode, schema, schema, validationResult, matchingSchemas, options);
  }
  _validateNode();
  matchingSchemas.add({ node, schema });
  function _validateNode() {
    function matchesType(type) {
      return node.type === type || type === "integer" && node.type === "number" && node.isInteger;
    }
    if (Array.isArray(schema.type)) {
      if (!schema.type.some(matchesType)) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          severity: DiagnosticSeverity2.Warning,
          message: schema.errorMessage || localize5("typeArrayMismatchWarning", "Incorrect type. Expected one of {0}.", schema.type.join(", ")),
          source: getSchemaSource(schema, originalSchema),
          schemaUri: getSchemaUri(schema, originalSchema)
        });
      }
    } else if (schema.type) {
      if (!matchesType(schema.type)) {
        const schemaType = schema.type === "object" ? getSchemaTypeName(schema) : schema.type;
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          severity: DiagnosticSeverity2.Warning,
          message: schema.errorMessage || getWarningMessage(ProblemType.typeMismatchWarning, [schemaType]),
          source: getSchemaSource(schema, originalSchema),
          schemaUri: getSchemaUri(schema, originalSchema),
          problemType: ProblemType.typeMismatchWarning,
          problemArgs: [schemaType]
        });
      }
    }
    if (Array.isArray(schema.allOf)) {
      for (const subSchemaRef of schema.allOf) {
        validate2(node, asSchema2(subSchemaRef), schema, validationResult, matchingSchemas, options);
      }
    }
    const notSchema = asSchema2(schema.not);
    if (notSchema) {
      const subValidationResult = new ValidationResult2(isKubernetes);
      const subMatchingSchemas = matchingSchemas.newSub();
      validate2(node, notSchema, schema, subValidationResult, subMatchingSchemas, options);
      if (!subValidationResult.hasProblems()) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          severity: DiagnosticSeverity2.Warning,
          message: localize5("notSchemaWarning", "Matches a schema that is not allowed."),
          source: getSchemaSource(schema, originalSchema),
          schemaUri: getSchemaUri(schema, originalSchema)
        });
      }
      for (const ms of subMatchingSchemas.schemas) {
        ms.inverted = !ms.inverted;
        matchingSchemas.add(ms);
      }
    }
    const testAlternatives = (alternatives, maxOneMatch) => {
      var _a;
      const matches = [];
      const subMatches = [];
      const noPropertyMatches = [];
      let bestMatch = null;
      for (const subSchemaRef of alternatives) {
        const subSchema = { ...asSchema2(subSchemaRef) };
        const subValidationResult = new ValidationResult2(isKubernetes);
        const subMatchingSchemas = matchingSchemas.newSub();
        validate2(node, subSchema, schema, subValidationResult, subMatchingSchemas, options);
        if (!subValidationResult.hasProblems() || callFromAutoComplete) {
          matches.push(subSchema);
          subMatches.push(subSchema);
          if (subValidationResult.propertiesMatches === 0) {
            noPropertyMatches.push(subSchema);
          }
          if (subSchema.format) {
            subMatches.pop();
          }
        }
        if (!bestMatch) {
          bestMatch = {
            schema: subSchema,
            validationResult: subValidationResult,
            matchingSchemas: subMatchingSchemas
          };
        } else if (isKubernetes) {
          bestMatch = alternativeComparison(subValidationResult, bestMatch, subSchema, subMatchingSchemas);
        } else {
          bestMatch = genericComparison(node, maxOneMatch, subValidationResult, bestMatch, subSchema, subMatchingSchemas);
        }
      }
      if (subMatches.length > 1 && (subMatches.length > 1 || noPropertyMatches.length === 0) && maxOneMatch) {
        validationResult.problems.push({
          location: { offset: node.offset, length: 1 },
          severity: DiagnosticSeverity2.Warning,
          message: localize5("oneOfWarning", "Matches multiple schemas when only one must validate."),
          source: getSchemaSource(schema, originalSchema),
          schemaUri: getSchemaUri(schema, originalSchema)
        });
      }
      if (bestMatch !== null) {
        validationResult.merge(bestMatch.validationResult);
        validationResult.propertiesMatches += bestMatch.validationResult.propertiesMatches;
        validationResult.propertiesValueMatches += bestMatch.validationResult.propertiesValueMatches;
        validationResult.enumValueMatch = validationResult.enumValueMatch || bestMatch.validationResult.enumValueMatch;
        if ((_a = bestMatch.validationResult.enumValues) == null ? void 0 : _a.length) {
          validationResult.enumValues = (validationResult.enumValues || []).concat(bestMatch.validationResult.enumValues);
        }
        matchingSchemas.merge(bestMatch.matchingSchemas);
      }
      return matches.length;
    };
    if (Array.isArray(schema.anyOf)) {
      testAlternatives(schema.anyOf, false);
    }
    if (Array.isArray(schema.oneOf)) {
      testAlternatives(schema.oneOf, true);
    }
    const testBranch = (schema2, originalSchema2) => {
      const subValidationResult = new ValidationResult2(isKubernetes);
      const subMatchingSchemas = matchingSchemas.newSub();
      validate2(node, asSchema2(schema2), originalSchema2, subValidationResult, subMatchingSchemas, options);
      validationResult.merge(subValidationResult);
      validationResult.propertiesMatches += subValidationResult.propertiesMatches;
      validationResult.propertiesValueMatches += subValidationResult.propertiesValueMatches;
      matchingSchemas.merge(subMatchingSchemas);
    };
    const testCondition = (ifSchema2, originalSchema2, thenSchema, elseSchema) => {
      const subSchema = asSchema2(ifSchema2);
      const subValidationResult = new ValidationResult2(isKubernetes);
      const subMatchingSchemas = matchingSchemas.newSub();
      validate2(node, subSchema, originalSchema2, subValidationResult, subMatchingSchemas, options);
      matchingSchemas.merge(subMatchingSchemas);
      const { filePatternAssociation } = subSchema;
      if (filePatternAssociation) {
        const association = new FilePatternAssociation2(filePatternAssociation);
        if (!association.matchesPattern(options.uri)) {
          subValidationResult.problems.push({
            location: { offset: node.offset, length: node.length },
            severity: DiagnosticSeverity2.Warning,
            message: localize5("ifFilePatternAssociation", `filePatternAssociation '${filePatternAssociation}' does not match with doc uri '${options.uri}'.`),
            source: getSchemaSource(schema, originalSchema2),
            schemaUri: getSchemaUri(schema, originalSchema2)
          });
        }
      }
      if (!subValidationResult.hasProblems()) {
        if (thenSchema) {
          testBranch(thenSchema, originalSchema2);
        }
      } else if (elseSchema) {
        testBranch(elseSchema, originalSchema2);
      }
    };
    const ifSchema = asSchema2(schema.if);
    if (ifSchema) {
      testCondition(ifSchema, schema, asSchema2(schema.then), asSchema2(schema.else));
    }
    if (Array.isArray(schema.enum)) {
      const val = getNodeValue3(node);
      let enumValueMatch = false;
      for (const e of schema.enum) {
        if (val === e || isAutoCompleteEqualMaybe(callFromAutoComplete, node, val, e)) {
          enumValueMatch = true;
          break;
        }
      }
      validationResult.enumValues = schema.enum;
      validationResult.enumValueMatch = enumValueMatch;
      if (!enumValueMatch) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          severity: DiagnosticSeverity2.Warning,
          code: ErrorCode.EnumValueMismatch,
          message: schema.errorMessage || localize5("enumWarning", "Value is not accepted. Valid values: {0}.", schema.enum.map((v) => {
            return JSON.stringify(v);
          }).join(", ")),
          source: getSchemaSource(schema, originalSchema),
          schemaUri: getSchemaUri(schema, originalSchema),
          data: { values: schema.enum }
        });
      }
    }
    if (isDefined2(schema.const)) {
      const val = getNodeValue3(node);
      if (!equals2(val, schema.const) && !isAutoCompleteEqualMaybe(callFromAutoComplete, node, val, schema.const)) {
        validationResult.problems.push({
          location: { offset: node.offset, length: node.length },
          severity: DiagnosticSeverity2.Warning,
          code: ErrorCode.EnumValueMismatch,
          problemType: ProblemType.constWarning,
          message: schema.errorMessage || getWarningMessage(ProblemType.constWarning, [JSON.stringify(schema.const)]),
          source: getSchemaSource(schema, originalSchema),
          schemaUri: getSchemaUri(schema, originalSchema),
          problemArgs: [JSON.stringify(schema.const)],
          data: { values: [schema.const] }
        });
        validationResult.enumValueMatch = false;
      } else {
        validationResult.enumValueMatch = true;
      }
      validationResult.enumValues = [schema.const];
    }
    if (schema.deprecationMessage && node.parent) {
      validationResult.problems.push({
        location: { offset: node.parent.offset, length: node.parent.length },
        severity: DiagnosticSeverity2.Warning,
        message: schema.deprecationMessage,
        source: getSchemaSource(schema, originalSchema),
        schemaUri: getSchemaUri(schema, originalSchema)
      });
    }
  }
  function _validateNumberNode(node2, schema2, validationResult2) {
    const val = node2.value;
    if (isNumber2(schema2.multipleOf)) {
      if (floatSafeRemainder(val, schema2.multipleOf) !== 0) {
        validationResult2.problems.push({
          location: { offset: node2.offset, length: node2.length },
          severity: DiagnosticSeverity2.Warning,
          message: localize5("multipleOfWarning", "Value is not divisible by {0}.", schema2.multipleOf),
          source: getSchemaSource(schema2, originalSchema),
          schemaUri: getSchemaUri(schema2, originalSchema)
        });
      }
    }
    function getExclusiveLimit(limit, exclusive) {
      if (isNumber2(exclusive)) {
        return exclusive;
      }
      if (isBoolean2(exclusive) && exclusive) {
        return limit;
      }
      return void 0;
    }
    function getLimit(limit, exclusive) {
      if (!isBoolean2(exclusive) || !exclusive) {
        return limit;
      }
      return void 0;
    }
    const exclusiveMinimum = getExclusiveLimit(schema2.minimum, schema2.exclusiveMinimum);
    if (isNumber2(exclusiveMinimum) && val <= exclusiveMinimum) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        severity: DiagnosticSeverity2.Warning,
        message: localize5("exclusiveMinimumWarning", "Value is below the exclusive minimum of {0}.", exclusiveMinimum),
        source: getSchemaSource(schema2, originalSchema),
        schemaUri: getSchemaUri(schema2, originalSchema)
      });
    }
    const exclusiveMaximum = getExclusiveLimit(schema2.maximum, schema2.exclusiveMaximum);
    if (isNumber2(exclusiveMaximum) && val >= exclusiveMaximum) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        severity: DiagnosticSeverity2.Warning,
        message: localize5("exclusiveMaximumWarning", "Value is above the exclusive maximum of {0}.", exclusiveMaximum),
        source: getSchemaSource(schema2, originalSchema),
        schemaUri: getSchemaUri(schema2, originalSchema)
      });
    }
    const minimum = getLimit(schema2.minimum, schema2.exclusiveMinimum);
    if (isNumber2(minimum) && val < minimum) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        severity: DiagnosticSeverity2.Warning,
        message: localize5("minimumWarning", "Value is below the minimum of {0}.", minimum),
        source: getSchemaSource(schema2, originalSchema),
        schemaUri: getSchemaUri(schema2, originalSchema)
      });
    }
    const maximum = getLimit(schema2.maximum, schema2.exclusiveMaximum);
    if (isNumber2(maximum) && val > maximum) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        severity: DiagnosticSeverity2.Warning,
        message: localize5("maximumWarning", "Value is above the maximum of {0}.", maximum),
        source: getSchemaSource(schema2, originalSchema),
        schemaUri: getSchemaUri(schema2, originalSchema)
      });
    }
  }
  function _validateStringNode(node2, schema2, validationResult2) {
    if (isNumber2(schema2.minLength) && node2.value.length < schema2.minLength) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        severity: DiagnosticSeverity2.Warning,
        message: localize5("minLengthWarning", "String is shorter than the minimum length of {0}.", schema2.minLength),
        source: getSchemaSource(schema2, originalSchema),
        schemaUri: getSchemaUri(schema2, originalSchema)
      });
    }
    if (isNumber2(schema2.maxLength) && node2.value.length > schema2.maxLength) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        severity: DiagnosticSeverity2.Warning,
        message: localize5("maxLengthWarning", "String is longer than the maximum length of {0}.", schema2.maxLength),
        source: getSchemaSource(schema2, originalSchema),
        schemaUri: getSchemaUri(schema2, originalSchema)
      });
    }
    if (isString2(schema2.pattern)) {
      const regex = safeCreateUnicodeRegExp(schema2.pattern);
      if (!regex.test(node2.value)) {
        validationResult2.problems.push({
          location: { offset: node2.offset, length: node2.length },
          severity: DiagnosticSeverity2.Warning,
          message: schema2.patternErrorMessage || schema2.errorMessage || localize5("patternWarning", 'String does not match the pattern of "{0}".', schema2.pattern),
          source: getSchemaSource(schema2, originalSchema),
          schemaUri: getSchemaUri(schema2, originalSchema)
        });
      }
    }
    if (schema2.format) {
      switch (schema2.format) {
        case "uri":
        case "uri-reference":
          {
            let errorMessage;
            if (!node2.value) {
              errorMessage = localize5("uriEmpty", "URI expected.");
            } else {
              try {
                const uri = URI3.parse(node2.value);
                if (!uri.scheme && schema2.format === "uri") {
                  errorMessage = localize5("uriSchemeMissing", "URI with a scheme is expected.");
                }
              } catch (e) {
                errorMessage = e.message;
              }
            }
            if (errorMessage) {
              validationResult2.problems.push({
                location: { offset: node2.offset, length: node2.length },
                severity: DiagnosticSeverity2.Warning,
                message: schema2.patternErrorMessage || schema2.errorMessage || localize5("uriFormatWarning", "String is not a URI: {0}", errorMessage),
                source: getSchemaSource(schema2, originalSchema),
                schemaUri: getSchemaUri(schema2, originalSchema)
              });
            }
          }
          break;
        case "color-hex":
        case "date-time":
        case "date":
        case "time":
        case "email":
        case "ipv4":
        case "ipv6":
          {
            const format2 = formats2[schema2.format];
            if (!node2.value || !format2.pattern.test(node2.value)) {
              validationResult2.problems.push({
                location: { offset: node2.offset, length: node2.length },
                severity: DiagnosticSeverity2.Warning,
                message: schema2.patternErrorMessage || schema2.errorMessage || format2.errorMessage,
                source: getSchemaSource(schema2, originalSchema),
                schemaUri: getSchemaUri(schema2, originalSchema)
              });
            }
          }
          break;
        default:
      }
    }
  }
  function _validateArrayNode(node2, schema2, validationResult2, matchingSchemas2) {
    if (Array.isArray(schema2.items)) {
      const subSchemas = schema2.items;
      for (let index = 0; index < subSchemas.length; index++) {
        const subSchemaRef = subSchemas[index];
        const subSchema = asSchema2(subSchemaRef);
        const itemValidationResult = new ValidationResult2(isKubernetes);
        const item = node2.items[index];
        if (item) {
          validate2(item, subSchema, schema2, itemValidationResult, matchingSchemas2, options);
          validationResult2.mergePropertyMatch(itemValidationResult);
          validationResult2.mergeEnumValues(itemValidationResult);
        } else if (node2.items.length >= subSchemas.length) {
          validationResult2.propertiesValueMatches++;
        }
      }
      if (node2.items.length > subSchemas.length) {
        if (typeof schema2.additionalItems === "object") {
          for (let i = subSchemas.length; i < node2.items.length; i++) {
            const itemValidationResult = new ValidationResult2(isKubernetes);
            validate2(node2.items[i], schema2.additionalItems, schema2, itemValidationResult, matchingSchemas2, options);
            validationResult2.mergePropertyMatch(itemValidationResult);
            validationResult2.mergeEnumValues(itemValidationResult);
          }
        } else if (schema2.additionalItems === false) {
          validationResult2.problems.push({
            location: { offset: node2.offset, length: node2.length },
            severity: DiagnosticSeverity2.Warning,
            message: localize5("additionalItemsWarning", "Array has too many items according to schema. Expected {0} or fewer.", subSchemas.length),
            source: getSchemaSource(schema2, originalSchema),
            schemaUri: getSchemaUri(schema2, originalSchema)
          });
        }
      }
    } else {
      const itemSchema = asSchema2(schema2.items);
      if (itemSchema) {
        const itemValidationResult = new ValidationResult2(isKubernetes);
        node2.items.forEach((item) => {
          if (itemSchema.oneOf && itemSchema.oneOf.length === 1) {
            const subSchemaRef = itemSchema.oneOf[0];
            const subSchema = { ...asSchema2(subSchemaRef) };
            subSchema.title = schema2.title;
            subSchema.closestTitle = schema2.closestTitle;
            validate2(item, subSchema, schema2, itemValidationResult, matchingSchemas2, options);
            validationResult2.mergePropertyMatch(itemValidationResult);
            validationResult2.mergeEnumValues(itemValidationResult);
          } else {
            validate2(item, itemSchema, schema2, itemValidationResult, matchingSchemas2, options);
            validationResult2.mergePropertyMatch(itemValidationResult);
            validationResult2.mergeEnumValues(itemValidationResult);
          }
        });
      }
    }
    const containsSchema = asSchema2(schema2.contains);
    if (containsSchema) {
      const doesContain = node2.items.some((item) => {
        const itemValidationResult = new ValidationResult2(isKubernetes);
        validate2(item, containsSchema, schema2, itemValidationResult, NoOpSchemaCollector2.instance, options);
        return !itemValidationResult.hasProblems();
      });
      if (!doesContain) {
        validationResult2.problems.push({
          location: { offset: node2.offset, length: node2.length },
          severity: DiagnosticSeverity2.Warning,
          message: schema2.errorMessage || localize5("requiredItemMissingWarning", "Array does not contain required item."),
          source: getSchemaSource(schema2, originalSchema),
          schemaUri: getSchemaUri(schema2, originalSchema)
        });
      }
    }
    if (isNumber2(schema2.minItems) && node2.items.length < schema2.minItems) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        severity: DiagnosticSeverity2.Warning,
        message: localize5("minItemsWarning", "Array has too few items. Expected {0} or more.", schema2.minItems),
        source: getSchemaSource(schema2, originalSchema),
        schemaUri: getSchemaUri(schema2, originalSchema)
      });
    }
    if (isNumber2(schema2.maxItems) && node2.items.length > schema2.maxItems) {
      validationResult2.problems.push({
        location: { offset: node2.offset, length: node2.length },
        severity: DiagnosticSeverity2.Warning,
        message: localize5("maxItemsWarning", "Array has too many items. Expected {0} or fewer.", schema2.maxItems),
        source: getSchemaSource(schema2, originalSchema),
        schemaUri: getSchemaUri(schema2, originalSchema)
      });
    }
    if (schema2.uniqueItems === true) {
      const values = getNodeValue3(node2);
      const duplicates = values.some((value, index) => {
        return index !== values.lastIndexOf(value);
      });
      if (duplicates) {
        validationResult2.problems.push({
          location: { offset: node2.offset, length: node2.length },
          severity: DiagnosticSeverity2.Warning,
          message: localize5("uniqueItemsWarning", "Array has duplicate items."),
          source: getSchemaSource(schema2, originalSchema),
          schemaUri: getSchemaUri(schema2, originalSchema)
        });
      }
    }
  }
  function _validateObjectNode(node2, schema2, validationResult2, matchingSchemas2) {
    var _a;
    const seenKeys = /* @__PURE__ */ Object.create(null);
    const unprocessedProperties = [];
    const unprocessedNodes = [...node2.properties];
    while (unprocessedNodes.length > 0) {
      const propertyNode = unprocessedNodes.pop();
      const key = propertyNode.keyNode.value;
      if (key === "<<" && propertyNode.valueNode) {
        switch (propertyNode.valueNode.type) {
          case "object": {
            unprocessedNodes.push(...propertyNode.valueNode["properties"]);
            break;
          }
          case "array": {
            propertyNode.valueNode["items"].forEach((sequenceNode) => {
              if (sequenceNode && isIterable(sequenceNode["properties"])) {
                unprocessedNodes.push(...sequenceNode["properties"]);
              }
            });
            break;
          }
          default: {
            break;
          }
        }
      } else {
        seenKeys[key] = propertyNode.valueNode;
        unprocessedProperties.push(key);
      }
    }
    if (Array.isArray(schema2.required)) {
      for (const propertyName of schema2.required) {
        if (seenKeys[propertyName] === void 0) {
          const keyNode = node2.parent && node2.parent.type === "property" && node2.parent.keyNode;
          const location = keyNode ? { offset: keyNode.offset, length: keyNode.length } : { offset: node2.offset, length: 1 };
          validationResult2.problems.push({
            location,
            severity: DiagnosticSeverity2.Warning,
            message: getWarningMessage(ProblemType.missingRequiredPropWarning, [propertyName]),
            source: getSchemaSource(schema2, originalSchema),
            schemaUri: getSchemaUri(schema2, originalSchema),
            problemArgs: [propertyName],
            problemType: ProblemType.missingRequiredPropWarning
          });
        }
      }
    }
    const propertyProcessed = (prop) => {
      let index = unprocessedProperties.indexOf(prop);
      while (index >= 0) {
        unprocessedProperties.splice(index, 1);
        index = unprocessedProperties.indexOf(prop);
      }
    };
    if (schema2.properties) {
      for (const propertyName of Object.keys(schema2.properties)) {
        propertyProcessed(propertyName);
        const propertySchema = schema2.properties[propertyName];
        const child = seenKeys[propertyName];
        if (child) {
          if (isBoolean2(propertySchema)) {
            if (!propertySchema) {
              const propertyNode = child.parent;
              validationResult2.problems.push({
                location: {
                  offset: propertyNode.keyNode.offset,
                  length: propertyNode.keyNode.length
                },
                severity: DiagnosticSeverity2.Warning,
                message: schema2.errorMessage || localize5("DisallowedExtraPropWarning", MSG_PROPERTY_NOT_ALLOWED, propertyName),
                source: getSchemaSource(schema2, originalSchema),
                schemaUri: getSchemaUri(schema2, originalSchema)
              });
            } else {
              validationResult2.propertiesMatches++;
              validationResult2.propertiesValueMatches++;
            }
          } else {
            propertySchema.url = (_a = schema2.url) != null ? _a : originalSchema.url;
            const propertyValidationResult = new ValidationResult2(isKubernetes);
            validate2(child, propertySchema, schema2, propertyValidationResult, matchingSchemas2, options);
            validationResult2.mergePropertyMatch(propertyValidationResult);
            validationResult2.mergeEnumValues(propertyValidationResult);
          }
        }
      }
    }
    if (schema2.patternProperties) {
      for (const propertyPattern of Object.keys(schema2.patternProperties)) {
        const regex = safeCreateUnicodeRegExp(propertyPattern);
        for (const propertyName of unprocessedProperties.slice(0)) {
          if (regex.test(propertyName)) {
            propertyProcessed(propertyName);
            const child = seenKeys[propertyName];
            if (child) {
              const propertySchema = schema2.patternProperties[propertyPattern];
              if (isBoolean2(propertySchema)) {
                if (!propertySchema) {
                  const propertyNode = child.parent;
                  validationResult2.problems.push({
                    location: {
                      offset: propertyNode.keyNode.offset,
                      length: propertyNode.keyNode.length
                    },
                    severity: DiagnosticSeverity2.Warning,
                    message: schema2.errorMessage || localize5("DisallowedExtraPropWarning", MSG_PROPERTY_NOT_ALLOWED, propertyName),
                    source: getSchemaSource(schema2, originalSchema),
                    schemaUri: getSchemaUri(schema2, originalSchema)
                  });
                } else {
                  validationResult2.propertiesMatches++;
                  validationResult2.propertiesValueMatches++;
                }
              } else {
                const propertyValidationResult = new ValidationResult2(isKubernetes);
                validate2(child, propertySchema, schema2, propertyValidationResult, matchingSchemas2, options);
                validationResult2.mergePropertyMatch(propertyValidationResult);
                validationResult2.mergeEnumValues(propertyValidationResult);
              }
            }
          }
        }
      }
    }
    if (typeof schema2.additionalProperties === "object") {
      for (const propertyName of unprocessedProperties) {
        const child = seenKeys[propertyName];
        if (child) {
          const propertyValidationResult = new ValidationResult2(isKubernetes);
          validate2(child, schema2.additionalProperties, schema2, propertyValidationResult, matchingSchemas2, options);
          validationResult2.mergePropertyMatch(propertyValidationResult);
          validationResult2.mergeEnumValues(propertyValidationResult);
        }
      }
    } else if (schema2.additionalProperties === false || schema2.type === "object" && schema2.additionalProperties === void 0 && options.disableAdditionalProperties === true) {
      if (unprocessedProperties.length > 0) {
        const possibleProperties = schema2.properties && Object.entries(schema2.properties).filter(([key, property]) => {
          if (seenKeys[key]) {
            return false;
          }
          if (property && typeof property === "object" && (property.doNotSuggest || property.deprecationMessage)) {
            return false;
          }
          return true;
        }).map(([key]) => key);
        for (const propertyName of unprocessedProperties) {
          const child = seenKeys[propertyName];
          if (child) {
            let propertyNode = null;
            if (child.type !== "property") {
              propertyNode = child.parent;
              if (propertyNode.type === "object") {
                propertyNode = propertyNode.properties[0];
              }
            } else {
              propertyNode = child;
            }
            const problem = {
              location: {
                offset: propertyNode.keyNode.offset,
                length: propertyNode.keyNode.length
              },
              severity: DiagnosticSeverity2.Warning,
              code: ErrorCode.PropertyExpected,
              message: schema2.errorMessage || localize5("DisallowedExtraPropWarning", MSG_PROPERTY_NOT_ALLOWED, propertyName),
              source: getSchemaSource(schema2, originalSchema),
              schemaUri: getSchemaUri(schema2, originalSchema)
            };
            if (possibleProperties == null ? void 0 : possibleProperties.length) {
              problem.data = { properties: possibleProperties };
            }
            validationResult2.problems.push(problem);
          }
        }
      }
    }
    if (isNumber2(schema2.maxProperties)) {
      if (node2.properties.length > schema2.maxProperties) {
        validationResult2.problems.push({
          location: { offset: node2.offset, length: node2.length },
          severity: DiagnosticSeverity2.Warning,
          message: localize5("MaxPropWarning", "Object has more properties than limit of {0}.", schema2.maxProperties),
          source: getSchemaSource(schema2, originalSchema),
          schemaUri: getSchemaUri(schema2, originalSchema)
        });
      }
    }
    if (isNumber2(schema2.minProperties)) {
      if (node2.properties.length < schema2.minProperties) {
        validationResult2.problems.push({
          location: { offset: node2.offset, length: node2.length },
          severity: DiagnosticSeverity2.Warning,
          message: localize5("MinPropWarning", "Object has fewer properties than the required number of {0}", schema2.minProperties),
          source: getSchemaSource(schema2, originalSchema),
          schemaUri: getSchemaUri(schema2, originalSchema)
        });
      }
    }
    if (schema2.dependencies) {
      for (const key of Object.keys(schema2.dependencies)) {
        const prop = seenKeys[key];
        if (prop) {
          const propertyDep = schema2.dependencies[key];
          if (Array.isArray(propertyDep)) {
            for (const requiredProp of propertyDep) {
              if (!seenKeys[requiredProp]) {
                validationResult2.problems.push({
                  location: { offset: node2.offset, length: node2.length },
                  severity: DiagnosticSeverity2.Warning,
                  message: localize5("RequiredDependentPropWarning", "Object is missing property {0} required by property {1}.", requiredProp, key),
                  source: getSchemaSource(schema2, originalSchema),
                  schemaUri: getSchemaUri(schema2, originalSchema)
                });
              } else {
                validationResult2.propertiesValueMatches++;
              }
            }
          } else {
            const propertySchema = asSchema2(propertyDep);
            if (propertySchema) {
              const propertyValidationResult = new ValidationResult2(isKubernetes);
              validate2(node2, propertySchema, schema2, propertyValidationResult, matchingSchemas2, options);
              validationResult2.mergePropertyMatch(propertyValidationResult);
              validationResult2.mergeEnumValues(propertyValidationResult);
            }
          }
        }
      }
    }
    const propertyNames = asSchema2(schema2.propertyNames);
    if (propertyNames) {
      for (const f2 of node2.properties) {
        const key = f2.keyNode;
        if (key) {
          validate2(key, propertyNames, schema2, validationResult2, NoOpSchemaCollector2.instance, options);
        }
      }
    }
  }
  function alternativeComparison(subValidationResult, bestMatch, subSchema, subMatchingSchemas) {
    const compareResult = subValidationResult.compareKubernetes(bestMatch.validationResult);
    if (compareResult > 0) {
      bestMatch = {
        schema: subSchema,
        validationResult: subValidationResult,
        matchingSchemas: subMatchingSchemas
      };
    } else if (compareResult === 0) {
      bestMatch.matchingSchemas.merge(subMatchingSchemas);
      bestMatch.validationResult.mergeEnumValues(subValidationResult);
    }
    return bestMatch;
  }
  function genericComparison(node2, maxOneMatch, subValidationResult, bestMatch, subSchema, subMatchingSchemas) {
    if (!maxOneMatch && !subValidationResult.hasProblems() && !bestMatch.validationResult.hasProblems()) {
      bestMatch.matchingSchemas.merge(subMatchingSchemas);
      bestMatch.validationResult.propertiesMatches += subValidationResult.propertiesMatches;
      bestMatch.validationResult.propertiesValueMatches += subValidationResult.propertiesValueMatches;
    } else {
      const compareResult = subValidationResult.compareGeneric(bestMatch.validationResult);
      if (compareResult > 0 || compareResult === 0 && maxOneMatch && bestMatch.schema.type === "object" && node2.type !== "null" && node2.type !== bestMatch.schema.type) {
        bestMatch = {
          schema: subSchema,
          validationResult: subValidationResult,
          matchingSchemas: subMatchingSchemas
        };
      } else if (compareResult === 0 || (node2.value === null || node2.type === "null") && node2.length === 0) {
        mergeValidationMatches(bestMatch, subMatchingSchemas, subValidationResult);
      }
    }
    return bestMatch;
  }
  function mergeValidationMatches(bestMatch, subMatchingSchemas, subValidationResult) {
    bestMatch.matchingSchemas.merge(subMatchingSchemas);
    bestMatch.validationResult.mergeEnumValues(subValidationResult);
    bestMatch.validationResult.mergeWarningGeneric(subValidationResult, [
      ProblemType.missingRequiredPropWarning,
      ProblemType.typeMismatchWarning,
      ProblemType.constWarning
    ]);
  }
}
function getSchemaSource(schema, originalSchema) {
  var _a;
  if (schema) {
    let label;
    if (schema.title) {
      label = schema.title;
    } else if (schema.closestTitle) {
      label = schema.closestTitle;
    } else if (originalSchema.closestTitle) {
      label = originalSchema.closestTitle;
    } else {
      const uriString = (_a = schema.url) != null ? _a : originalSchema.url;
      if (uriString) {
        const url = URI3.parse(uriString);
        if (url.scheme === "file") {
          label = url.fsPath;
        }
        label = url.toString();
      }
    }
    if (label) {
      return `${YAML_SCHEMA_PREFIX}${label}`;
    }
  }
  return YAML_SOURCE;
}
function getSchemaUri(schema, originalSchema) {
  var _a;
  const uriString = (_a = schema.url) != null ? _a : originalSchema.url;
  return uriString ? [uriString] : [];
}
function getWarningMessage(problemType, args) {
  return localize5(problemType, ProblemTypeMessages[problemType], args.join(" | "));
}
function isAutoCompleteEqualMaybe(callFromAutoComplete, node, nodeValue, schemaValue) {
  if (!callFromAutoComplete) {
    return false;
  }
  const isWithoutValue = nodeValue === null && node.length === 0;
  if (isWithoutValue) {
    return true;
  }
  return isString2(nodeValue) && isString2(schemaValue) && schemaValue.startsWith(nodeValue);
}

// node_modules/yaml-language-server/lib/esm/languageservice/parser/yaml-documents.js
import { isNode as isNode2, isPair as isPair2, isScalar as isScalar3, visit as visit2 } from "yaml";

// node_modules/yaml-language-server/lib/esm/languageservice/parser/ast-converter.js
import { isScalar, isMap, isPair, isSeq, isNode, isAlias } from "yaml";
var maxRefCount = 1e3;
var refDepth = 0;
var seenAlias = /* @__PURE__ */ new Set();
function convertAST(parent, node, doc, lineCounter) {
  if (!parent) {
    refDepth = 0;
  }
  if (!node) {
    return null;
  }
  if (isMap(node)) {
    return convertMap(node, parent, doc, lineCounter);
  }
  if (isPair(node)) {
    return convertPair(node, parent, doc, lineCounter);
  }
  if (isSeq(node)) {
    return convertSeq(node, parent, doc, lineCounter);
  }
  if (isScalar(node)) {
    return convertScalar(node, parent);
  }
  if (isAlias(node) && !seenAlias.has(node) && refDepth < maxRefCount) {
    seenAlias.add(node);
    const converted = convertAlias(node, parent, doc, lineCounter);
    seenAlias.delete(node);
    return converted;
  } else {
    return;
  }
}
function convertMap(node, parent, doc, lineCounter) {
  let range;
  if (node.flow && !node.range) {
    range = collectFlowMapRange(node);
  } else {
    range = node.range;
  }
  const result = new ObjectASTNodeImpl2(parent, node, ...toFixedOffsetLength(range, lineCounter));
  for (const it of node.items) {
    if (isPair(it)) {
      result.properties.push(convertAST(result, it, doc, lineCounter));
    }
  }
  return result;
}
function convertPair(node, parent, doc, lineCounter) {
  const keyNode = node.key;
  const valueNode = node.value;
  const rangeStart = keyNode.range[0];
  let rangeEnd = keyNode.range[1];
  let nodeEnd = keyNode.range[2];
  if (valueNode) {
    rangeEnd = valueNode.range[1];
    nodeEnd = valueNode.range[2];
  }
  const result = new PropertyASTNodeImpl2(parent, node, ...toFixedOffsetLength([rangeStart, rangeEnd, nodeEnd], lineCounter));
  if (isAlias(keyNode)) {
    const keyAlias = new StringASTNodeImpl2(parent, keyNode, ...toOffsetLength(keyNode.range));
    keyAlias.value = keyNode.source;
    result.keyNode = keyAlias;
  } else {
    result.keyNode = convertAST(result, keyNode, doc, lineCounter);
  }
  result.valueNode = convertAST(result, valueNode, doc, lineCounter);
  return result;
}
function convertSeq(node, parent, doc, lineCounter) {
  const result = new ArrayASTNodeImpl2(parent, node, ...toOffsetLength(node.range));
  for (const it of node.items) {
    if (isNode(it)) {
      const convertedNode = convertAST(result, it, doc, lineCounter);
      if (convertedNode) {
        result.children.push(convertedNode);
      }
    }
  }
  return result;
}
function convertScalar(node, parent) {
  if (node.value === null) {
    return new NullASTNodeImpl2(parent, node, ...toOffsetLength(node.range));
  }
  switch (typeof node.value) {
    case "string": {
      const result = new StringASTNodeImpl2(parent, node, ...toOffsetLength(node.range));
      result.value = node.value;
      return result;
    }
    case "boolean":
      return new BooleanASTNodeImpl2(parent, node, node.value, node.source, ...toOffsetLength(node.range));
    case "number": {
      const result = new NumberASTNodeImpl2(parent, node, ...toOffsetLength(node.range));
      result.value = node.value;
      result.isInteger = Number.isInteger(result.value);
      return result;
    }
    default: {
      const result = new StringASTNodeImpl2(parent, node, ...toOffsetLength(node.range));
      result.value = node.source;
      return result;
    }
  }
}
function convertAlias(node, parent, doc, lineCounter) {
  refDepth++;
  const resolvedNode = node.resolve(doc);
  if (resolvedNode) {
    return convertAST(parent, resolvedNode, doc, lineCounter);
  } else {
    const resultNode = new StringASTNodeImpl2(parent, node, ...toOffsetLength(node.range));
    resultNode.value = node.source;
    return resultNode;
  }
}
function toOffsetLength(range) {
  return [range[0], range[1] - range[0]];
}
function toFixedOffsetLength(range, lineCounter) {
  const start = lineCounter.linePos(range[0]);
  const end = lineCounter.linePos(range[1]);
  const result = [range[0], range[1] - range[0]];
  if (start.line !== end.line && (lineCounter.lineStarts.length !== end.line || end.col === 1)) {
    result[1]--;
  }
  return result;
}
function collectFlowMapRange(node) {
  let start = Number.MAX_SAFE_INTEGER;
  let end = 0;
  for (const it of node.items) {
    if (isPair(it)) {
      if (isNode(it.key)) {
        if (it.key.range && it.key.range[0] <= start) {
          start = it.key.range[0];
        }
      }
      if (isNode(it.value)) {
        if (it.value.range && it.value.range[2] >= end) {
          end = it.value.range[2];
        }
      }
    }
  }
  return [start, end, end];
}

// node_modules/yaml-language-server/lib/esm/languageservice/utils/astUtils.js
import { isDocument, isScalar as isScalar2, visit } from "yaml";
function getParent(doc, nodeToFind) {
  let parentNode;
  visit(doc, (_, node, path5) => {
    if (node === nodeToFind) {
      parentNode = path5[path5.length - 1];
      return visit.BREAK;
    }
  });
  if (isDocument(parentNode)) {
    return void 0;
  }
  return parentNode;
}
function isMapContainsEmptyPair(map) {
  if (map.items.length > 1) {
    return false;
  }
  const pair = map.items[0];
  return isScalar2(pair.key) && isScalar2(pair.value) && pair.key.value === "" && !pair.value.value;
}
function indexOf(seq, item) {
  for (const [i, obj] of seq.items.entries()) {
    if (item === obj) {
      return i;
    }
  }
  return void 0;
}
function isInComment(tokens, offset) {
  let inComment = false;
  for (const token of tokens) {
    if (token.type === "document") {
      _visit([], token, (item) => {
        var _a;
        if (isCollectionItem(item) && ((_a = item.value) == null ? void 0 : _a.type) === "comment") {
          if (token.offset <= offset && item.value.source.length + item.value.offset >= offset) {
            inComment = true;
            return visit.BREAK;
          }
        } else if (item.type === "comment" && item.offset <= offset && item.offset + item.source.length >= offset) {
          inComment = true;
          return visit.BREAK;
        }
      });
    } else if (token.type === "comment") {
      if (token.offset <= offset && token.source.length + token.offset >= offset) {
        return true;
      }
    }
    if (inComment) {
      break;
    }
  }
  return inComment;
}
function isCollectionItem(token) {
  return token["start"] !== void 0;
}
function _visit(path5, item, visitor) {
  let ctrl = visitor(item, path5);
  if (typeof ctrl === "symbol")
    return ctrl;
  for (const field of ["key", "value"]) {
    const token2 = item[field];
    if (token2 && "items" in token2) {
      for (let i = 0; i < token2.items.length; ++i) {
        const ci = _visit(Object.freeze(path5.concat([[field, i]])), token2.items[i], visitor);
        if (typeof ci === "number")
          i = ci - 1;
        else if (ci === visit.BREAK)
          return visit.BREAK;
        else if (ci === visit.REMOVE) {
          token2.items.splice(i, 1);
          i -= 1;
        }
      }
      if (typeof ctrl === "function" && field === "key")
        ctrl = ctrl(item, path5);
    }
  }
  const token = item["sep"];
  if (token) {
    for (let i = 0; i < token.length; ++i) {
      const ci = _visit(Object.freeze(path5), token[i], visitor);
      if (typeof ci === "number")
        i = ci - 1;
      else if (ci === visit.BREAK)
        return visit.BREAK;
      else if (ci === visit.REMOVE) {
        token.items.splice(i, 1);
        i -= 1;
      }
    }
  }
  return typeof ctrl === "function" ? ctrl(item, path5) : ctrl;
}

// node_modules/yaml-language-server/lib/esm/languageservice/parser/yaml-documents.js
var SingleYAMLDocument = class _SingleYAMLDocument extends JSONDocument2 {
  constructor(lineCounter) {
    super(null, []);
    this.lineCounter = lineCounter;
  }
  /**
   * Create a deep copy of this document
   */
  clone() {
    const copy = new _SingleYAMLDocument(this.lineCounter);
    copy.isKubernetes = this.isKubernetes;
    copy.disableAdditionalProperties = this.disableAdditionalProperties;
    copy.uri = this.uri;
    copy.currentDocIndex = this.currentDocIndex;
    copy._lineComments = this.lineComments.slice();
    copy.internalDocument = this._internalDocument.clone();
    return copy;
  }
  collectLineComments() {
    this._lineComments = [];
    if (this._internalDocument.commentBefore) {
      const comments = this._internalDocument.commentBefore.split("\n");
      comments.forEach((comment) => this._lineComments.push(`#${comment}`));
    }
    visit2(this.internalDocument, (_key, node) => {
      if (node == null ? void 0 : node.commentBefore) {
        const comments = node == null ? void 0 : node.commentBefore.split("\n");
        comments.forEach((comment) => this._lineComments.push(`#${comment}`));
      }
      if (node == null ? void 0 : node.comment) {
        this._lineComments.push(`#${node.comment}`);
      }
    });
    if (this._internalDocument.comment) {
      this._lineComments.push(`#${this._internalDocument.comment}`);
    }
  }
  /**
   * Updates the internal AST tree of the object
   * from the internal node. This is call whenever the
   * internalDocument is set but also can be called to
   * reflect any changes on the underlying document
   * without setting the internalDocument explicitly.
   */
  updateFromInternalDocument() {
    this.root = convertAST(null, this._internalDocument.contents, this._internalDocument, this.lineCounter);
  }
  set internalDocument(document) {
    this._internalDocument = document;
    this.updateFromInternalDocument();
  }
  get internalDocument() {
    return this._internalDocument;
  }
  get lineComments() {
    if (!this._lineComments) {
      this.collectLineComments();
    }
    return this._lineComments;
  }
  set lineComments(val) {
    this._lineComments = val;
  }
  get errors() {
    return this.internalDocument.errors.map(YAMLErrorToYamlDocDiagnostics);
  }
  get warnings() {
    return this.internalDocument.warnings.map(YAMLErrorToYamlDocDiagnostics);
  }
  getNodeFromPosition(positionOffset, textBuffer, configuredIndentation) {
    const position = textBuffer.getPosition(positionOffset);
    const lineContent = textBuffer.getLineContent(position.line);
    if (lineContent.trim().length === 0) {
      return [this.findClosestNode(positionOffset, textBuffer, configuredIndentation), true];
    }
    const textAfterPosition = lineContent.substring(position.character);
    const spacesAfterPositionMatch = textAfterPosition.match(/^([ ]+)\n?$/);
    const areOnlySpacesAfterPosition = !!spacesAfterPositionMatch;
    const countOfSpacesAfterPosition = spacesAfterPositionMatch == null ? void 0 : spacesAfterPositionMatch[1].length;
    let closestNode;
    visit2(this.internalDocument, (key, node) => {
      if (!node) {
        return;
      }
      const range = node.range;
      if (!range) {
        return;
      }
      const isNullNodeOnTheLine = () => areOnlySpacesAfterPosition && positionOffset + countOfSpacesAfterPosition === range[2] && isScalar3(node) && node.value === null;
      if (range[0] <= positionOffset && range[1] >= positionOffset || isNullNodeOnTheLine()) {
        closestNode = node;
      } else {
        return visit2.SKIP;
      }
    });
    return [closestNode, false];
  }
  findClosestNode(offset, textBuffer, configuredIndentation) {
    let offsetDiff = this.internalDocument.range[2];
    let maxOffset = this.internalDocument.range[0];
    let closestNode;
    visit2(this.internalDocument, (key, node) => {
      if (!node) {
        return;
      }
      const range = node.range;
      if (!range) {
        return;
      }
      const diff = range[1] - offset;
      if (maxOffset <= range[0] && diff <= 0 && Math.abs(diff) <= offsetDiff) {
        offsetDiff = Math.abs(diff);
        maxOffset = range[0];
        closestNode = node;
      }
    });
    const position = textBuffer.getPosition(offset);
    const lineContent = textBuffer.getLineContent(position.line);
    const indentation = getIndentation(lineContent, position.character);
    if (isScalar3(closestNode) && closestNode.value === null) {
      return closestNode;
    }
    if (indentation === position.character) {
      closestNode = this.getProperParentByIndentation(indentation, closestNode, textBuffer, "", configuredIndentation);
    }
    return closestNode;
  }
  getProperParentByIndentation(indentation, node, textBuffer, currentLine, configuredIndentation, rootParent) {
    if (!node) {
      return this.internalDocument.contents;
    }
    configuredIndentation = !configuredIndentation ? 2 : configuredIndentation;
    if (isNode2(node) && node.range) {
      const position = textBuffer.getPosition(node.range[0]);
      const lineContent = textBuffer.getLineContent(position.line);
      currentLine = currentLine === "" ? lineContent.trim() : currentLine;
      if (currentLine.startsWith("-") && indentation === configuredIndentation && currentLine === lineContent.trim()) {
        position.character += indentation;
      }
      if (position.character > indentation && position.character > 0) {
        const parent = this.getParent(node);
        if (parent) {
          return this.getProperParentByIndentation(indentation, parent, textBuffer, currentLine, configuredIndentation, rootParent);
        }
      } else if (position.character < indentation) {
        const parent = this.getParent(node);
        if (isPair2(parent) && isNode2(parent.value)) {
          return parent.value;
        } else if (isPair2(rootParent) && isNode2(rootParent.value)) {
          return rootParent.value;
        }
      } else {
        return node;
      }
    } else if (isPair2(node)) {
      rootParent = node;
      const parent = this.getParent(node);
      return this.getProperParentByIndentation(indentation, parent, textBuffer, currentLine, configuredIndentation, rootParent);
    }
    return node;
  }
  getParent(node) {
    return getParent(this.internalDocument, node);
  }
};
var YAMLDocument = class {
  constructor(documents, tokens) {
    this.documents = documents;
    this.tokens = tokens;
    this.errors = [];
    this.warnings = [];
  }
};
var YamlDocuments = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
  }
  /**
   * Get cached YAMLDocument
   * @param document TextDocument to parse
   * @param parserOptions YAML parserOptions
   * @param addRootObject if true and document is empty add empty object {} to force schema usage
   * @returns the YAMLDocument
   */
  getYamlDocument(document, parserOptions, addRootObject = false) {
    this.ensureCache(document, parserOptions != null ? parserOptions : defaultOptions, addRootObject);
    return this.cache.get(document.uri).document;
  }
  /**
   * For test purpose only!
   */
  clear() {
    this.cache.clear();
  }
  ensureCache(document, parserOptions, addRootObject) {
    const key = document.uri;
    if (!this.cache.has(key)) {
      this.cache.set(key, { version: -1, document: new YAMLDocument([], []), parserOptions: defaultOptions });
    }
    const cacheEntry = this.cache.get(key);
    if (cacheEntry.version !== document.version || parserOptions.customTags && !isArrayEqual(cacheEntry.parserOptions.customTags, parserOptions.customTags)) {
      let text = document.getText();
      if (addRootObject && !/\S/.test(text)) {
        text = `{${text}}`;
      }
      const doc = parse2(text, parserOptions, document);
      cacheEntry.document = doc;
      cacheEntry.version = document.version;
      cacheEntry.parserOptions = parserOptions;
    }
  }
};
var yamlDocumentsCache = new YamlDocuments();
function YAMLErrorToYamlDocDiagnostics(error) {
  return {
    message: error.message,
    location: {
      start: error.pos[0],
      end: error.pos[1],
      toLineEnd: true
    },
    severity: 1,
    code: ErrorCode.Undefined
  };
}

// node_modules/yaml-language-server/lib/esm/languageservice/parser/custom-tag-provider.js
import { isSeq as isSeq2, isMap as isMap2 } from "yaml";
var CommonTagImpl = class {
  constructor(tag, type) {
    this.tag = tag;
    this.type = type;
  }
  get collection() {
    if (this.type === "mapping") {
      return "map";
    }
    if (this.type === "sequence") {
      return "seq";
    }
    return void 0;
  }
  resolve(value) {
    if (isMap2(value) && this.type === "mapping") {
      return value;
    }
    if (isSeq2(value) && this.type === "sequence") {
      return value;
    }
    if (typeof value === "string" && this.type === "scalar") {
      return value;
    }
  }
};
var IncludeTag = class {
  constructor() {
    this.tag = "!include";
    this.type = "scalar";
  }
  resolve(value, onError) {
    if (value && value.length > 0 && value.trim()) {
      return value;
    }
    onError("!include without value");
  }
};
function getCustomTags(customTags) {
  const tags = [];
  const filteredTags = filterInvalidCustomTags(customTags);
  for (const tag of filteredTags) {
    const typeInfo = tag.split(" ");
    const tagName = typeInfo[0];
    const tagType = typeInfo[1] && typeInfo[1].toLowerCase() || "scalar";
    tags.push(new CommonTagImpl(tagName, tagType));
  }
  tags.push(new IncludeTag());
  return tags;
}

// node_modules/yaml-language-server/lib/esm/languageservice/utils/textBuffer.js
import { Range as Range3 } from "vscode-languageserver-types";
var TextBuffer = class {
  constructor(doc) {
    this.doc = doc;
  }
  getLineCount() {
    return this.doc.lineCount;
  }
  getLineLength(lineNumber) {
    const lineOffsets = this.doc.getLineOffsets();
    if (lineNumber >= lineOffsets.length) {
      return this.doc.getText().length;
    } else if (lineNumber < 0) {
      return 0;
    }
    const nextLineOffset = lineNumber + 1 < lineOffsets.length ? lineOffsets[lineNumber + 1] : this.doc.getText().length;
    return nextLineOffset - lineOffsets[lineNumber];
  }
  getLineContent(lineNumber) {
    const lineOffsets = this.doc.getLineOffsets();
    if (lineNumber >= lineOffsets.length) {
      return this.doc.getText();
    } else if (lineNumber < 0) {
      return "";
    }
    const nextLineOffset = lineNumber + 1 < lineOffsets.length ? lineOffsets[lineNumber + 1] : this.doc.getText().length;
    return this.doc.getText().substring(lineOffsets[lineNumber], nextLineOffset);
  }
  getLineCharCode(lineNumber, index) {
    return this.doc.getText(Range3.create(lineNumber - 1, index, lineNumber - 1, index + 1)).charCodeAt(0);
  }
  getText(range) {
    return this.doc.getText(range);
  }
  getPosition(offest) {
    return this.doc.positionAt(offest);
  }
};

// node_modules/yaml-language-server/lib/esm/languageservice/parser/yamlParser07.js
var defaultOptions = {
  customTags: [],
  yamlVersion: "1.2"
};
function parse2(text, parserOptions = defaultOptions, document) {
  var _a;
  const options = {
    strict: false,
    customTags: getCustomTags(parserOptions.customTags),
    version: (_a = parserOptions.yamlVersion) != null ? _a : defaultOptions.yamlVersion,
    keepSourceTokens: true
  };
  const composer = new Composer(options);
  const lineCounter = new LineCounter();
  let isLastLineEmpty = false;
  if (document) {
    const textBuffer = new TextBuffer(document);
    const position = textBuffer.getPosition(text.length);
    const lineContent = textBuffer.getLineContent(position.line);
    isLastLineEmpty = lineContent.trim().length === 0;
  }
  const parser2 = isLastLineEmpty ? new Parser() : new Parser(lineCounter.addNewLine);
  const tokens = parser2.parse(text);
  const tokensArr = Array.from(tokens);
  const docs = composer.compose(tokensArr, true, text.length);
  const yamlDocs = Array.from(docs, (doc) => parsedDocToSingleYAMLDocument(doc, lineCounter));
  return new YAMLDocument(yamlDocs, tokensArr);
}
function parsedDocToSingleYAMLDocument(parsedDoc, lineCounter) {
  const syd = new SingleYAMLDocument(lineCounter);
  syd.internalDocument = parsedDoc;
  return syd;
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/modelineUtil.js
function getSchemaFromModeline(doc) {
  if (doc instanceof SingleYAMLDocument) {
    const yamlLanguageServerModeline = doc.lineComments.find((lineComment) => {
      return isModeline(lineComment);
    });
    if (yamlLanguageServerModeline != void 0) {
      const schemaMatchs = yamlLanguageServerModeline.match(/\$schema=\S+/g);
      if (schemaMatchs !== null && schemaMatchs.length >= 1) {
        if (schemaMatchs.length >= 2) {
          console.log("Several $schema attributes have been found on the yaml-language-server modeline. The first one will be picked.");
        }
        return schemaMatchs[0].substring("$schema=".length);
      }
    }
  }
  return void 0;
}
function isModeline(lineText) {
  const matchModeline = lineText.match(/^#\s+yaml-language-server\s*:/g);
  return matchModeline !== null && matchModeline.length === 1;
}

// fillers/ajv.ts
var AJVStub = class {
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  compile() {
    return () => true;
  }
};

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlSchemaService.js
var ajv = new AJVStub();
var localize6 = loadMessageBundle();
var jsonSchema07 = void 0;
var schema07Validator = ajv.compile(jsonSchema07);
var MODIFICATION_ACTIONS;
(function(MODIFICATION_ACTIONS2) {
  MODIFICATION_ACTIONS2[MODIFICATION_ACTIONS2["delete"] = 0] = "delete";
  MODIFICATION_ACTIONS2[MODIFICATION_ACTIONS2["add"] = 1] = "add";
  MODIFICATION_ACTIONS2[MODIFICATION_ACTIONS2["deleteAll"] = 2] = "deleteAll";
})(MODIFICATION_ACTIONS || (MODIFICATION_ACTIONS = {}));
var FilePatternAssociation2 = class {
  constructor(pattern) {
    try {
      this.patternRegExp = new RegExp(convertSimple2RegExpPattern(pattern) + "$");
    } catch (e) {
      this.patternRegExp = null;
    }
    this.schemas = [];
  }
  addSchema(id) {
    this.schemas.push(id);
  }
  matchesPattern(fileName) {
    return this.patternRegExp && this.patternRegExp.test(fileName);
  }
  getSchemas() {
    return this.schemas;
  }
};
var YAMLSchemaService = class extends JSONSchemaService {
  constructor(requestService, contextService, promiseConstructor) {
    super(requestService, contextService, promiseConstructor);
    this.schemaUriToNameAndDescription = /* @__PURE__ */ new Map();
    this.customSchemaProvider = void 0;
    this.requestService = requestService;
    this.schemaPriorityMapping = /* @__PURE__ */ new Map();
  }
  registerCustomSchemaProvider(customSchemaProvider) {
    this.customSchemaProvider = customSchemaProvider;
  }
  getAllSchemas() {
    const result = [];
    const schemaUris = /* @__PURE__ */ new Set();
    for (const filePattern of this.filePatternAssociations) {
      const schemaUri = filePattern.uris[0];
      if (schemaUris.has(schemaUri)) {
        continue;
      }
      schemaUris.add(schemaUri);
      const schemaHandle = {
        uri: schemaUri,
        fromStore: false,
        usedForCurrentFile: false
      };
      if (this.schemaUriToNameAndDescription.has(schemaUri)) {
        const { name, description, versions } = this.schemaUriToNameAndDescription.get(schemaUri);
        schemaHandle.name = name;
        schemaHandle.description = description;
        schemaHandle.fromStore = true;
        schemaHandle.versions = versions;
      }
      result.push(schemaHandle);
    }
    return result;
  }
  async resolveSchemaContent(schemaToResolve, schemaURL, dependencies) {
    const resolveErrors = schemaToResolve.errors.slice(0);
    let schema = schemaToResolve.schema;
    const contextService = this.contextService;
    if (!schema07Validator(schema)) {
      const errs = [];
      for (const err of schema07Validator.errors) {
        errs.push(`${err.instancePath} : ${err.message}`);
      }
      resolveErrors.push(`Schema '${getSchemaTitle(schemaToResolve.schema, schemaURL)}' is not valid:
${errs.join("\n")}`);
    }
    const findSection = (schema2, path5) => {
      if (!path5) {
        return schema2;
      }
      let current = schema2;
      if (path5[0] === "/") {
        path5 = path5.substr(1);
      }
      path5.split("/").some((part) => {
        current = current[part];
        return !current;
      });
      return current;
    };
    const merge = (target, sourceRoot, sourceURI, path5) => {
      const section = findSection(sourceRoot, path5);
      if (section) {
        for (const key in section) {
          if (Object.prototype.hasOwnProperty.call(section, key) && !Object.prototype.hasOwnProperty.call(target, key)) {
            target[key] = section[key];
          }
        }
      } else {
        resolveErrors.push(localize6("json.schema.invalidref", "$ref '{0}' in '{1}' can not be resolved.", path5, sourceURI));
      }
    };
    const resolveExternalLink = (node, uri, linkPath, parentSchemaURL, parentSchemaDependencies) => {
      if (contextService && !/^\w+:\/\/.*/.test(uri)) {
        uri = contextService.resolveRelativePath(uri, parentSchemaURL);
      }
      uri = this.normalizeId(uri);
      const referencedHandle = this.getOrAddSchemaHandle(uri);
      return referencedHandle.getUnresolvedSchema().then((unresolvedSchema) => {
        parentSchemaDependencies[uri] = true;
        if (unresolvedSchema.errors.length) {
          const loc = linkPath ? uri + "#" + linkPath : uri;
          resolveErrors.push(localize6("json.schema.problemloadingref", "Problems loading reference '{0}': {1}", loc, unresolvedSchema.errors[0]));
        }
        merge(node, unresolvedSchema.schema, uri, linkPath);
        node.url = uri;
        return resolveRefs(node, unresolvedSchema.schema, uri, referencedHandle.dependencies);
      });
    };
    const resolveRefs = async (node, parentSchema, parentSchemaURL, parentSchemaDependencies) => {
      if (!node || typeof node !== "object") {
        return null;
      }
      const toWalk = [node];
      const seen = /* @__PURE__ */ new Set();
      const openPromises = [];
      const collectEntries = (...entries) => {
        for (const entry of entries) {
          if (typeof entry === "object") {
            toWalk.push(entry);
          }
        }
      };
      const collectMapEntries = (...maps) => {
        for (const map of maps) {
          if (typeof map === "object") {
            for (const key in map) {
              const entry = map[key];
              if (typeof entry === "object") {
                toWalk.push(entry);
              }
            }
          }
        }
      };
      const collectArrayEntries = (...arrays) => {
        for (const array of arrays) {
          if (Array.isArray(array)) {
            for (const entry of array) {
              if (typeof entry === "object") {
                toWalk.push(entry);
              }
            }
          }
        }
      };
      const handleRef = (next) => {
        const seenRefs = /* @__PURE__ */ new Set();
        while (next.$ref) {
          const ref = decodeURIComponent(next.$ref);
          const segments = ref.split("#", 2);
          next._$ref = next.$ref;
          delete next.$ref;
          if (segments[0].length > 0) {
            openPromises.push(resolveExternalLink(next, segments[0], segments[1], parentSchemaURL, parentSchemaDependencies));
            return;
          } else {
            if (!seenRefs.has(ref)) {
              merge(next, parentSchema, parentSchemaURL, segments[1]);
              seenRefs.add(ref);
            }
          }
        }
        collectEntries(next.items, next.additionalItems, next.additionalProperties, next.not, next.contains, next.propertyNames, next.if, next.then, next.else);
        collectMapEntries(next.definitions, next.properties, next.patternProperties, next.dependencies);
        collectArrayEntries(next.anyOf, next.allOf, next.oneOf, next.items, next.schemaSequence);
      };
      if (parentSchemaURL.indexOf("#") > 0) {
        const segments = parentSchemaURL.split("#", 2);
        if (segments[0].length > 0 && segments[1].length > 0) {
          const newSchema = {};
          await resolveExternalLink(newSchema, segments[0], segments[1], parentSchemaURL, parentSchemaDependencies);
          for (const key in schema) {
            if (key === "required") {
              continue;
            }
            if (Object.prototype.hasOwnProperty.call(schema, key) && !Object.prototype.hasOwnProperty.call(newSchema, key)) {
              newSchema[key] = schema[key];
            }
          }
          schema = newSchema;
        }
      }
      while (toWalk.length) {
        const next = toWalk.pop();
        if (seen.has(next)) {
          continue;
        }
        seen.add(next);
        handleRef(next);
      }
      return Promise.all(openPromises);
    };
    await resolveRefs(schema, schema, schemaURL, dependencies);
    return new ResolvedSchema(schema, resolveErrors);
  }
  getSchemaForResource(resource, doc) {
    const resolveModelineSchema = () => {
      let schemaFromModeline = getSchemaFromModeline(doc);
      if (schemaFromModeline !== void 0) {
        if (!schemaFromModeline.startsWith("file:") && !schemaFromModeline.startsWith("http")) {
          let appendix = "";
          if (schemaFromModeline.indexOf("#") > 0) {
            const segments = schemaFromModeline.split("#", 2);
            schemaFromModeline = segments[0];
            appendix = segments[1];
          }
          if (!path2.isAbsolute(schemaFromModeline)) {
            const resUri = URI4.parse(resource);
            schemaFromModeline = URI4.file(path2.resolve(path2.parse(resUri.fsPath).dir, schemaFromModeline)).toString();
          } else {
            schemaFromModeline = URI4.file(schemaFromModeline).toString();
          }
          if (appendix.length > 0) {
            schemaFromModeline += "#" + appendix;
          }
        }
        return schemaFromModeline;
      }
    };
    const resolveSchemaForResource = (schemas) => {
      const schemaHandle = super.createCombinedSchema(resource, schemas);
      return schemaHandle.getResolvedSchema().then((schema) => {
        if (schema.schema && typeof schema.schema === "object") {
          schema.schema.url = schemaHandle.url;
        }
        if (schema.schema && schema.schema.schemaSequence && schema.schema.schemaSequence[doc.currentDocIndex]) {
          return new ResolvedSchema(schema.schema.schemaSequence[doc.currentDocIndex]);
        }
        return schema;
      });
    };
    const resolveSchema = () => {
      const seen = /* @__PURE__ */ Object.create(null);
      const schemas = [];
      for (const entry of this.filePatternAssociations) {
        if (entry.matchesPattern(resource)) {
          for (const schemaId of entry.getURIs()) {
            if (!seen[schemaId]) {
              schemas.push(schemaId);
              seen[schemaId] = true;
            }
          }
        }
      }
      if (schemas.length > 0) {
        const highestPrioSchemas = this.highestPrioritySchemas(schemas);
        return resolveSchemaForResource(highestPrioSchemas);
      }
      return Promise.resolve(null);
    };
    const modelineSchema = resolveModelineSchema();
    if (modelineSchema) {
      return resolveSchemaForResource([modelineSchema]);
    }
    if (this.customSchemaProvider) {
      return this.customSchemaProvider(resource).then((schemaUri) => {
        if (Array.isArray(schemaUri)) {
          if (schemaUri.length === 0) {
            return resolveSchema();
          }
          return Promise.all(schemaUri.map((schemaUri2) => {
            return this.resolveCustomSchema(schemaUri2, doc);
          })).then((schemas) => {
            return {
              errors: [],
              schema: {
                allOf: schemas.map((schemaObj) => {
                  return schemaObj.schema;
                })
              }
            };
          }, () => {
            return resolveSchema();
          });
        }
        if (!schemaUri) {
          return resolveSchema();
        }
        return this.resolveCustomSchema(schemaUri, doc);
      }).then((schema) => {
        return schema;
      }, () => {
        return resolveSchema();
      });
    } else {
      return resolveSchema();
    }
  }
  // Set the priority of a schema in the schema service
  addSchemaPriority(uri, priority) {
    let currSchemaArray = this.schemaPriorityMapping.get(uri);
    if (currSchemaArray) {
      currSchemaArray = currSchemaArray.add(priority);
      this.schemaPriorityMapping.set(uri, currSchemaArray);
    } else {
      this.schemaPriorityMapping.set(uri, (/* @__PURE__ */ new Set()).add(priority));
    }
  }
  /**
   * Search through all the schemas and find the ones with the highest priority
   */
  highestPrioritySchemas(schemas) {
    let highestPrio = 0;
    const priorityMapping = /* @__PURE__ */ new Map();
    schemas.forEach((schema) => {
      const priority = this.schemaPriorityMapping.get(schema) || [0];
      priority.forEach((prio) => {
        if (prio > highestPrio) {
          highestPrio = prio;
        }
        let currPriorityArray = priorityMapping.get(prio);
        if (currPriorityArray) {
          currPriorityArray = currPriorityArray.concat(schema);
          priorityMapping.set(prio, currPriorityArray);
        } else {
          priorityMapping.set(prio, [schema]);
        }
      });
    });
    return priorityMapping.get(highestPrio) || [];
  }
  async resolveCustomSchema(schemaUri, doc) {
    const unresolvedSchema = await this.loadSchema(schemaUri);
    const schema = await this.resolveSchemaContent(unresolvedSchema, schemaUri, []);
    if (schema.schema && typeof schema.schema === "object") {
      schema.schema.url = schemaUri;
    }
    if (schema.schema && schema.schema.schemaSequence && schema.schema.schemaSequence[doc.currentDocIndex]) {
      return new ResolvedSchema(schema.schema.schemaSequence[doc.currentDocIndex], schema.errors);
    }
    return schema;
  }
  /**
   * Save a schema with schema ID and schema content.
   * Overrides previous schemas set for that schema ID.
   */
  async saveSchema(schemaId, schemaContent) {
    const id = this.normalizeId(schemaId);
    this.getOrAddSchemaHandle(id, schemaContent);
    this.schemaPriorityMapping.set(id, (/* @__PURE__ */ new Set()).add(SchemaPriority.Settings));
    return Promise.resolve(void 0);
  }
  /**
   * Delete schemas on specific path
   */
  async deleteSchemas(deletions) {
    deletions.schemas.forEach((s) => {
      this.deleteSchema(s);
    });
    return Promise.resolve(void 0);
  }
  /**
   * Delete a schema with schema ID.
   */
  async deleteSchema(schemaId) {
    const id = this.normalizeId(schemaId);
    if (this.schemasById[id]) {
      delete this.schemasById[id];
    }
    this.schemaPriorityMapping.delete(id);
    return Promise.resolve(void 0);
  }
  /**
   * Add content to a specified schema at a specified path
   */
  async addContent(additions) {
    const schema = await this.getResolvedSchema(additions.schema);
    if (schema) {
      const resolvedSchemaLocation = this.resolveJSONSchemaToSection(schema.schema, additions.path);
      if (typeof resolvedSchemaLocation === "object") {
        resolvedSchemaLocation[additions.key] = additions.content;
      }
      await this.saveSchema(additions.schema, schema.schema);
    }
  }
  /**
   * Delete content in a specified schema at a specified path
   */
  async deleteContent(deletions) {
    const schema = await this.getResolvedSchema(deletions.schema);
    if (schema) {
      const resolvedSchemaLocation = this.resolveJSONSchemaToSection(schema.schema, deletions.path);
      if (typeof resolvedSchemaLocation === "object") {
        delete resolvedSchemaLocation[deletions.key];
      }
      await this.saveSchema(deletions.schema, schema.schema);
    }
  }
  /**
   * Take a JSON Schema and the path that you would like to get to
   * @returns the JSON Schema resolved at that specific path
   */
  resolveJSONSchemaToSection(schema, paths) {
    const splitPathway = paths.split("/");
    let resolvedSchemaLocation = schema;
    for (const path5 of splitPathway) {
      if (path5 === "") {
        continue;
      }
      this.resolveNext(resolvedSchemaLocation, path5);
      resolvedSchemaLocation = resolvedSchemaLocation[path5];
    }
    return resolvedSchemaLocation;
  }
  /**
   * Resolve the next Object if they have compatible types
   * @param object a location in the JSON Schema
   * @param token the next token that you want to search for
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolveNext(object, token) {
    if (Array.isArray(object) && isNaN(token)) {
      throw new Error("Expected a number after the array object");
    } else if (typeof object === "object" && typeof token !== "string") {
      throw new Error("Expected a string after the object");
    }
  }
  /**
   * Everything below here is needed because we're importing from vscode-json-languageservice umd and we need
   * to provide a wrapper around the javascript methods we are calling since they have no type
   */
  normalizeId(id) {
    try {
      return URI4.parse(id).toString();
    } catch (e) {
      return id;
    }
  }
  /*
   * Everything below here is needed because we're importing from vscode-json-languageservice umd and we need
   * to provide a wrapper around the javascript methods we are calling since they have no type
   */
  getOrAddSchemaHandle(id, unresolvedSchemaContent) {
    return super.getOrAddSchemaHandle(id, unresolvedSchemaContent);
  }
  loadSchema(schemaUri) {
    const requestService = this.requestService;
    return super.loadSchema(schemaUri).then((unresolvedJsonSchema) => {
      if (unresolvedJsonSchema.errors && unresolvedJsonSchema.schema === void 0) {
        return requestService(schemaUri).then(
          (content) => {
            if (!content) {
              const errorMessage = localize6("json.schema.nocontent", "Unable to load schema from '{0}': No content. {1}", toDisplayString2(schemaUri), unresolvedJsonSchema.errors);
              return new UnresolvedSchema({}, [errorMessage]);
            }
            try {
              const schemaContent = parse3(content);
              return new UnresolvedSchema(schemaContent, []);
            } catch (yamlError) {
              const errorMessage = localize6("json.schema.invalidFormat", "Unable to parse content from '{0}': {1}.", toDisplayString2(schemaUri), yamlError);
              return new UnresolvedSchema({}, [errorMessage]);
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error) => {
            let errorMessage = error.toString();
            const errorSplit = error.toString().split("Error: ");
            if (errorSplit.length > 1) {
              errorMessage = errorSplit[1];
            }
            return new UnresolvedSchema({}, [errorMessage]);
          }
        );
      }
      unresolvedJsonSchema.uri = schemaUri;
      if (this.schemaUriToNameAndDescription.has(schemaUri)) {
        const { name, description, versions } = this.schemaUriToNameAndDescription.get(schemaUri);
        unresolvedJsonSchema.schema.title = name != null ? name : unresolvedJsonSchema.schema.title;
        unresolvedJsonSchema.schema.description = description != null ? description : unresolvedJsonSchema.schema.description;
        unresolvedJsonSchema.schema.versions = versions != null ? versions : unresolvedJsonSchema.schema.versions;
      }
      return unresolvedJsonSchema;
    });
  }
  registerExternalSchema(uri, filePatterns, unresolvedSchema, name, description, versions) {
    if (name || description) {
      this.schemaUriToNameAndDescription.set(uri, { name, description, versions });
    }
    return super.registerExternalSchema(uri, filePatterns, unresolvedSchema);
  }
  clearExternalSchemas() {
    super.clearExternalSchemas();
  }
  setSchemaContributions(schemaContributions) {
    super.setSchemaContributions(schemaContributions);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRegisteredSchemaIds(filter) {
    return super.getRegisteredSchemaIds(filter);
  }
  getResolvedSchema(schemaId) {
    return super.getResolvedSchema(schemaId);
  }
  onResourceChange(uri) {
    return super.onResourceChange(uri);
  }
};
function toDisplayString2(url) {
  try {
    const uri = URI4.parse(url);
    if (uri.scheme === "file") {
      return uri.fsPath;
    }
  } catch (e) {
  }
  return url;
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/documentSymbols.js
import { isMap as isMap3, isSeq as isSeq3 } from "yaml";
var YAMLDocumentSymbols = class {
  constructor(schemaService, telemetry2) {
    this.telemetry = telemetry2;
    this.jsonDocumentSymbols = new JSONDocumentSymbols(schemaService);
    this.jsonDocumentSymbols.getKeyLabel = (property) => {
      const keyNode = property.keyNode.internalNode;
      let name = "";
      if (isMap3(keyNode)) {
        name = "{}";
      } else if (isSeq3(keyNode)) {
        name = "[]";
      } else {
        name = keyNode.source;
      }
      return name;
    };
  }
  findDocumentSymbols(document, context = { resultLimit: Number.MAX_VALUE }) {
    var _a;
    let results = [];
    try {
      const doc = yamlDocumentsCache.getYamlDocument(document);
      if (!doc || doc["documents"].length === 0) {
        return null;
      }
      for (const yamlDoc of doc["documents"]) {
        if (yamlDoc.root) {
          results = results.concat(this.jsonDocumentSymbols.findDocumentSymbols(document, yamlDoc, context));
        }
      }
    } catch (err) {
      (_a = this.telemetry) == null ? void 0 : _a.sendError("yaml.documentSymbols.error", err);
    }
    return results;
  }
  findHierarchicalDocumentSymbols(document, context = { resultLimit: Number.MAX_VALUE }) {
    var _a;
    let results = [];
    try {
      const doc = yamlDocumentsCache.getYamlDocument(document);
      if (!doc || doc["documents"].length === 0) {
        return null;
      }
      for (const yamlDoc of doc["documents"]) {
        if (yamlDoc.root) {
          results = results.concat(this.jsonDocumentSymbols.findDocumentSymbols2(document, yamlDoc, context));
        }
      }
    } catch (err) {
      (_a = this.telemetry) == null ? void 0 : _a.sendError("yaml.hierarchicalDocumentSymbols.error", err);
    }
    return results;
  }
};

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlHover.js
import { MarkupKind as MarkupKind2, Range as Range4 } from "vscode-languageserver-types";

// node_modules/yaml-language-server/lib/esm/languageservice/parser/isKubernetes.js
function setKubernetesParserOption(jsonDocuments, option) {
  for (const jsonDoc of jsonDocuments) {
    jsonDoc.isKubernetes = option;
  }
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlHover.js
import { URI as URI5 } from "vscode-uri";
import * as path3 from "path-browserify";
import { stringify as stringifyYAML } from "yaml";
var YAMLHover = class {
  constructor(schemaService, telemetry2) {
    this.telemetry = telemetry2;
    this.shouldHover = true;
    this.schemaService = schemaService;
  }
  configure(languageSettings) {
    if (languageSettings) {
      this.shouldHover = languageSettings.hover;
      this.indentation = languageSettings.indentation;
    }
  }
  doHover(document, position, isKubernetes = false) {
    var _a;
    try {
      if (!this.shouldHover || !document) {
        return Promise.resolve(void 0);
      }
      const doc = yamlDocumentsCache.getYamlDocument(document);
      const offset = document.offsetAt(position);
      const currentDoc = matchOffsetToDocument(offset, doc);
      if (currentDoc === null) {
        return Promise.resolve(void 0);
      }
      setKubernetesParserOption(doc.documents, isKubernetes);
      const currentDocIndex = doc.documents.indexOf(currentDoc);
      currentDoc.currentDocIndex = currentDocIndex;
      return this.getHover(document, position, currentDoc);
    } catch (error) {
      (_a = this.telemetry) == null ? void 0 : _a.sendError("yaml.hover.error", error);
    }
  }
  // method copied from https://github.com/microsoft/vscode-json-languageservice/blob/2ea5ad3d2ffbbe40dea11cfe764a502becf113ce/src/services/jsonHover.ts#L23
  getHover(document, position, doc) {
    const offset = document.offsetAt(position);
    let node = doc.getNodeFromOffset(offset);
    if (!node || (node.type === "object" || node.type === "array") && offset > node.offset + 1 && offset < node.offset + node.length - 1) {
      return Promise.resolve(null);
    }
    const hoverRangeNode = node;
    if (node.type === "string") {
      const parent = node.parent;
      if (parent && parent.type === "property" && parent.keyNode === node) {
        node = parent.valueNode;
        if (!node) {
          return Promise.resolve(null);
        }
      }
    }
    const hoverRange = Range4.create(document.positionAt(hoverRangeNode.offset), document.positionAt(hoverRangeNode.offset + hoverRangeNode.length));
    const createHover = (contents) => {
      const markupContent = {
        kind: MarkupKind2.Markdown,
        value: contents
      };
      const result = {
        contents: markupContent,
        range: hoverRange
      };
      return result;
    };
    const removePipe = (value) => {
      return value.replace(/\s\|\|\s*$/, "");
    };
    return this.schemaService.getSchemaForResource(document.uri, doc).then((schema) => {
      if (schema && node && !schema.errors.length) {
        const matchingSchemas = doc.getMatchingSchemas(schema.schema, node.offset);
        let title = void 0;
        let markdownDescription = void 0;
        let markdownEnumDescriptions = [];
        const markdownExamples = [];
        const markdownEnums = [];
        matchingSchemas.every((s) => {
          if ((s.node === node || node.type === "property" && node.valueNode === s.node) && !s.inverted && s.schema) {
            title = title || s.schema.title || s.schema.closestTitle;
            markdownDescription = markdownDescription || s.schema.markdownDescription || this.toMarkdown(s.schema.description);
            if (s.schema.enum) {
              if (s.schema.markdownEnumDescriptions) {
                markdownEnumDescriptions = s.schema.markdownEnumDescriptions;
              } else if (s.schema.enumDescriptions) {
                markdownEnumDescriptions = s.schema.enumDescriptions.map(this.toMarkdown, this);
              } else {
                markdownEnumDescriptions = [];
              }
              s.schema.enum.forEach((enumValue, idx) => {
                if (typeof enumValue !== "string") {
                  enumValue = JSON.stringify(enumValue);
                }
                if (!markdownEnums.some((me) => me.value === enumValue)) {
                  markdownEnums.push({
                    value: enumValue,
                    description: markdownEnumDescriptions[idx]
                  });
                }
              });
            }
            if (s.schema.anyOf && isAllSchemasMatched(node, matchingSchemas, s.schema)) {
              title = "";
              markdownDescription = s.schema.description ? s.schema.description + "\n" : "";
              s.schema.anyOf.forEach((childSchema, index) => {
                title += childSchema.title || s.schema.closestTitle || "";
                markdownDescription += childSchema.markdownDescription || this.toMarkdown(childSchema.description) || "";
                if (index !== s.schema.anyOf.length - 1) {
                  title += " || ";
                  markdownDescription += " || ";
                }
              });
              title = removePipe(title);
              markdownDescription = removePipe(markdownDescription);
            }
            if (s.schema.examples) {
              s.schema.examples.forEach((example) => {
                markdownExamples.push(stringifyYAML(example, null, 2));
              });
            }
          }
          return true;
        });
        let result = "";
        if (title) {
          result = "#### " + this.toMarkdown(title);
        }
        if (markdownDescription) {
          result = ensureLineBreak(result);
          result += markdownDescription;
        }
        if (markdownEnums.length !== 0) {
          result = ensureLineBreak(result);
          result += "Allowed Values:\n\n";
          markdownEnums.forEach((me) => {
            if (me.description) {
              result += `* \`${toMarkdownCodeBlock(me.value)}\`: ${me.description}
`;
            } else {
              result += `* \`${toMarkdownCodeBlock(me.value)}\`
`;
            }
          });
        }
        if (markdownExamples.length !== 0) {
          markdownExamples.forEach((example) => {
            result = ensureLineBreak(result);
            result += "Example:\n\n";
            result += `\`\`\`yaml
${example}\`\`\`
`;
          });
        }
        if (result.length > 0 && schema.schema.url) {
          result = ensureLineBreak(result);
          result += `Source: [${getSchemaName(schema.schema)}](${schema.schema.url})`;
        }
        return createHover(result);
      }
      return null;
    });
  }
  // copied from https://github.com/microsoft/vscode-json-languageservice/blob/2ea5ad3d2ffbbe40dea11cfe764a502becf113ce/src/services/jsonHover.ts#L112
  toMarkdown(plain) {
    if (plain) {
      let escaped = plain.replace(/([^\n\r])(\r?\n)([^\n\r])/gm, "$1\n\n$3");
      escaped = escaped.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
      if (this.indentation !== void 0) {
        const indentationMatchRegex = new RegExp(` {${this.indentation.length}}`, "g");
        escaped = escaped.replace(indentationMatchRegex, "&emsp;");
      }
      return escaped;
    }
    return void 0;
  }
};
function ensureLineBreak(content) {
  if (content.length === 0) {
    return content;
  }
  if (!content.endsWith("\n")) {
    content += "\n";
  }
  return content + "\n";
}
function getSchemaName(schema) {
  let result = "JSON Schema";
  const urlString = schema.url;
  if (urlString) {
    const url = URI5.parse(urlString);
    result = path3.basename(url.fsPath);
  } else if (schema.title) {
    result = schema.title;
  }
  return result;
}
function toMarkdownCodeBlock(content) {
  if (content.indexOf("`") !== -1) {
    return "`` " + content + " ``";
  }
  return content;
}
function isAllSchemasMatched(node, matchingSchemas, schema) {
  let count = 0;
  for (const matchSchema of matchingSchemas) {
    if (node === matchSchema.node && matchSchema.schema !== schema) {
      schema.anyOf.forEach((childSchema) => {
        if (matchSchema.schema.title === childSchema.title && matchSchema.schema.description === childSchema.description && matchSchema.schema.properties === childSchema.properties) {
          count++;
        }
      });
    }
  }
  return count === schema.anyOf.length;
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlValidation.js
import { Diagnostic as Diagnostic6, Position as Position2 } from "vscode-languageserver-types";

// node_modules/yaml-language-server/lib/esm/languageservice/services/validation/unused-anchors.js
import { Diagnostic as Diagnostic3, DiagnosticSeverity as DiagnosticSeverity3, DiagnosticTag, Range as Range5 } from "vscode-languageserver-types";
import { isAlias as isAlias2, isCollection, isNode as isNode3, isScalar as isScalar4, visit as visit3, CST } from "yaml";
var UnusedAnchorsValidator = class {
  validate(document, yamlDoc) {
    const result = [];
    const anchors = /* @__PURE__ */ new Set();
    const usedAnchors = /* @__PURE__ */ new Set();
    const anchorParent = /* @__PURE__ */ new Map();
    visit3(yamlDoc.internalDocument, (key, node, path5) => {
      if (!isNode3(node)) {
        return;
      }
      if ((isCollection(node) || isScalar4(node)) && node.anchor) {
        anchors.add(node);
        anchorParent.set(node, path5[path5.length - 1]);
      }
      if (isAlias2(node)) {
        usedAnchors.add(node.resolve(yamlDoc.internalDocument));
      }
    });
    for (const anchor of anchors) {
      if (!usedAnchors.has(anchor)) {
        const aToken = this.getAnchorNode(anchorParent.get(anchor), anchor);
        if (aToken) {
          const range = Range5.create(document.positionAt(aToken.offset), document.positionAt(aToken.offset + aToken.source.length));
          const warningDiagnostic = Diagnostic3.create(range, `Unused anchor "${aToken.source}"`, DiagnosticSeverity3.Hint, 0);
          warningDiagnostic.tags = [DiagnosticTag.Unnecessary];
          result.push(warningDiagnostic);
        }
      }
    }
    return result;
  }
  getAnchorNode(parentNode, node) {
    if (parentNode && parentNode.srcToken) {
      const token = parentNode.srcToken;
      if (isCollectionItem(token)) {
        return getAnchorFromCollectionItem(token);
      } else if (CST.isCollection(token)) {
        for (const t of token.items) {
          if (node.srcToken !== t.value)
            continue;
          const anchor = getAnchorFromCollectionItem(t);
          if (anchor) {
            return anchor;
          }
        }
      }
    }
    return void 0;
  }
};
function getAnchorFromCollectionItem(token) {
  for (const t of token.start) {
    if (t.type === "anchor") {
      return t;
    }
  }
  if (token.sep && Array.isArray(token.sep)) {
    for (const t of token.sep) {
      if (t.type === "anchor") {
        return t;
      }
    }
  }
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/validation/yaml-style.js
import { Diagnostic as Diagnostic4, DiagnosticSeverity as DiagnosticSeverity4, Range as Range6 } from "vscode-languageserver-types";
import { isMap as isMap4, isSeq as isSeq4, visit as visit4 } from "yaml";
var YAMLStyleValidator = class {
  constructor(settings) {
    this.forbidMapping = settings.flowMapping === "forbid";
    this.forbidSequence = settings.flowSequence === "forbid";
  }
  validate(document, yamlDoc) {
    const result = [];
    visit4(yamlDoc.internalDocument, (key, node) => {
      var _a, _b;
      if (this.forbidMapping && isMap4(node) && ((_a = node.srcToken) == null ? void 0 : _a.type) === "flow-collection") {
        result.push(Diagnostic4.create(this.getRangeOf(document, node.srcToken), "Flow style mapping is forbidden", DiagnosticSeverity4.Error, "flowMap"));
      }
      if (this.forbidSequence && isSeq4(node) && ((_b = node.srcToken) == null ? void 0 : _b.type) === "flow-collection") {
        result.push(Diagnostic4.create(this.getRangeOf(document, node.srcToken), "Flow style sequence is forbidden", DiagnosticSeverity4.Error, "flowSeq"));
      }
    });
    return result;
  }
  getRangeOf(document, node) {
    return Range6.create(document.positionAt(node.start.offset), document.positionAt(node.end.pop().offset));
  }
};

// node_modules/yaml-language-server/lib/esm/languageservice/services/validation/map-key-order.js
import { Diagnostic as Diagnostic5, DiagnosticSeverity as DiagnosticSeverity5, Range as Range7 } from "vscode-languageserver-types";
import { isMap as isMap5, visit as visit5 } from "yaml";
var MapKeyOrderValidator = class {
  validate(document, yamlDoc) {
    const result = [];
    visit5(yamlDoc.internalDocument, (key, node) => {
      if (isMap5(node)) {
        for (let i = 1; i < node.items.length; i++) {
          if (compare(node.items[i - 1], node.items[i]) > 0) {
            const range = createRange2(document, node.items[i - 1]);
            result.push(Diagnostic5.create(range, `Wrong ordering of key "${node.items[i - 1].key}" in mapping`, DiagnosticSeverity5.Error, "mapKeyOrder"));
          }
        }
      }
    });
    return result;
  }
};
function createRange2(document, node) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const start = (_f = (_c = (_a = node == null ? void 0 : node.srcToken.start[0]) == null ? void 0 : _a.offset) != null ? _c : (_b = node == null ? void 0 : node.srcToken) == null ? void 0 : _b.key.offset) != null ? _f : (_e = (_d = node == null ? void 0 : node.srcToken) == null ? void 0 : _d.sep[0]) == null ? void 0 : _e.offset;
  const end = ((_g = node == null ? void 0 : node.srcToken) == null ? void 0 : _g.value.offset) || ((_i = (_h = node == null ? void 0 : node.srcToken) == null ? void 0 : _h.sep[0]) == null ? void 0 : _i.offset) || ((_j = node == null ? void 0 : node.srcToken) == null ? void 0 : _j.key.offset) || ((_k = node == null ? void 0 : node.srcToken.start[node.srcToken.start.length - 1]) == null ? void 0 : _k.offset);
  return Range7.create(document.positionAt(start), document.positionAt(end));
}
function compare(thiz, that) {
  const thatKey = String(that.key);
  const thisKey = String(thiz.key);
  return thisKey.localeCompare(thatKey);
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlValidation.js
var yamlDiagToLSDiag = (yamlDiag, textDocument) => {
  const start = textDocument.positionAt(yamlDiag.location.start);
  const range = {
    start,
    end: yamlDiag.location.toLineEnd ? Position2.create(start.line, new TextBuffer(textDocument).getLineLength(start.line)) : textDocument.positionAt(yamlDiag.location.end)
  };
  return Diagnostic6.create(range, yamlDiag.message, yamlDiag.severity, yamlDiag.code, YAML_SOURCE);
};
var YAMLValidation = class {
  constructor(schemaService, telemetry2) {
    this.telemetry = telemetry2;
    this.validators = [];
    this.MATCHES_MULTIPLE = "Matches multiple schemas when only one must validate.";
    this.validationEnabled = true;
    this.jsonValidation = new JSONValidation(schemaService, Promise);
  }
  configure(settings) {
    this.validators = [];
    if (settings) {
      this.validationEnabled = settings.validate;
      this.customTags = settings.customTags;
      this.disableAdditionalProperties = settings.disableAdditionalProperties;
      this.yamlVersion = settings.yamlVersion;
      if (settings.flowMapping === "forbid" || settings.flowSequence === "forbid") {
        this.validators.push(new YAMLStyleValidator(settings));
      }
      if (settings.keyOrdering) {
        this.validators.push(new MapKeyOrderValidator());
      }
    }
    this.validators.push(new UnusedAnchorsValidator());
  }
  async doValidation(textDocument, isKubernetes = false) {
    var _a;
    if (!this.validationEnabled) {
      return Promise.resolve([]);
    }
    const validationResult = [];
    try {
      const yamlDocument = yamlDocumentsCache.getYamlDocument(textDocument, { customTags: this.customTags, yamlVersion: this.yamlVersion }, true);
      let index = 0;
      for (const currentYAMLDoc of yamlDocument.documents) {
        currentYAMLDoc.isKubernetes = isKubernetes;
        currentYAMLDoc.currentDocIndex = index;
        currentYAMLDoc.disableAdditionalProperties = this.disableAdditionalProperties;
        currentYAMLDoc.uri = textDocument.uri;
        const validation = await this.jsonValidation.doValidation(textDocument, currentYAMLDoc);
        const syd = currentYAMLDoc;
        if (syd.errors.length > 0) {
          validationResult.push(...syd.errors);
        }
        if (syd.warnings.length > 0) {
          validationResult.push(...syd.warnings);
        }
        validationResult.push(...validation);
        validationResult.push(...this.runAdditionalValidators(textDocument, currentYAMLDoc));
        index++;
      }
    } catch (err) {
      (_a = this.telemetry) == null ? void 0 : _a.sendError("yaml.validation.error", err);
    }
    let previousErr;
    const foundSignatures = /* @__PURE__ */ new Set();
    const duplicateMessagesRemoved = [];
    for (let err of validationResult) {
      if (isKubernetes && err.message === this.MATCHES_MULTIPLE) {
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(err, "location")) {
        err = yamlDiagToLSDiag(err, textDocument);
      }
      if (!err.source) {
        err.source = YAML_SOURCE;
      }
      if (previousErr && previousErr.message === err.message && previousErr.range.end.line === err.range.start.line && Math.abs(previousErr.range.end.character - err.range.end.character) >= 1) {
        previousErr.range.end = err.range.end;
        continue;
      } else {
        previousErr = err;
      }
      const errSig = err.range.start.line + " " + err.range.start.character + " " + err.message;
      if (!foundSignatures.has(errSig)) {
        duplicateMessagesRemoved.push(err);
        foundSignatures.add(errSig);
      }
    }
    return duplicateMessagesRemoved;
  }
  runAdditionalValidators(document, yarnDoc) {
    const result = [];
    for (const validator of this.validators) {
      result.push(...validator.validate(document, yarnDoc));
    }
    return result;
  }
};

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlFormatter.js
import { Range as Range8, Position as Position3, TextEdit as TextEdit2 } from "vscode-languageserver-types";
import * as parser from "prettier/plugins/yaml";
import { format } from "prettier/standalone";
var YAMLFormatter = class {
  constructor() {
    this.formatterEnabled = true;
  }
  configure(shouldFormat) {
    if (shouldFormat) {
      this.formatterEnabled = shouldFormat.format;
    }
  }
  async format(document, options = {}) {
    if (!this.formatterEnabled) {
      return [];
    }
    try {
      const text = document.getText();
      const prettierOptions = {
        parser: "yaml",
        plugins: [parser],
        // --- FormattingOptions ---
        tabWidth: options.tabWidth || options.tabSize,
        // --- CustomFormatterOptions ---
        singleQuote: options.singleQuote,
        bracketSpacing: options.bracketSpacing,
        // 'preserve' is the default for Options.proseWrap. See also server.ts
        proseWrap: "always" === options.proseWrap ? "always" : "never" === options.proseWrap ? "never" : "preserve",
        printWidth: options.printWidth
      };
      const formatted = await format(text, prettierOptions);
      return [TextEdit2.replace(Range8.create(Position3.create(0, 0), document.positionAt(text.length)), formatted)];
    } catch (error) {
      return [];
    }
  }
};

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlLinks.js
var YamlLinks = class {
  constructor(telemetry2) {
    this.telemetry = telemetry2;
  }
  findLinks(document) {
    var _a;
    try {
      const doc = yamlDocumentsCache.getYamlDocument(document);
      const linkPromises = [];
      for (const yamlDoc of doc.documents) {
        linkPromises.push(findLinks(document, yamlDoc));
      }
      return Promise.all(linkPromises).then((yamlLinkArray) => [].concat(...yamlLinkArray));
    } catch (err) {
      (_a = this.telemetry) == null ? void 0 : _a.sendError("yaml.documentLink.error", err);
    }
  }
};

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlFolding.js
import { FoldingRange as FoldingRange2, Range as Range9 } from "vscode-languageserver-types";
function getFoldingRanges(document, context) {
  if (!document) {
    return;
  }
  const result = [];
  const doc = yamlDocumentsCache.getYamlDocument(document);
  for (const ymlDoc of doc.documents) {
    if (doc.documents.length > 1) {
      result.push(createNormalizedFolding(document, ymlDoc.root));
    }
    ymlDoc.visit((node) => {
      var _a;
      if (node.type === "object" && ((_a = node.parent) == null ? void 0 : _a.type) === "array") {
        result.push(createNormalizedFolding(document, node));
      }
      if (node.type === "property" && node.valueNode) {
        switch (node.valueNode.type) {
          case "array":
          case "object":
            result.push(createNormalizedFolding(document, node));
            break;
          case "string": {
            const nodePosn = document.positionAt(node.offset);
            const valuePosn = document.positionAt(node.valueNode.offset + node.valueNode.length);
            if (nodePosn.line !== valuePosn.line) {
              result.push(createNormalizedFolding(document, node));
            }
            break;
          }
          default:
            return true;
        }
      }
      return true;
    });
  }
  const rangeLimit = context && context.rangeLimit;
  if (typeof rangeLimit !== "number" || result.length <= rangeLimit) {
    return result;
  }
  if (context && context.onRangeLimitExceeded) {
    context.onRangeLimitExceeded(document.uri);
  }
  return result.slice(0, context.rangeLimit);
}
function createNormalizedFolding(document, node) {
  const startPos = document.positionAt(node.offset);
  let endPos = document.positionAt(node.offset + node.length);
  const textFragment = document.getText(Range9.create(startPos, endPos));
  const newLength = textFragment.length - textFragment.trimRight().length;
  if (newLength > 0) {
    endPos = document.positionAt(node.offset + node.length - newLength);
  }
  return FoldingRange2.create(startPos.line, endPos.line, startPos.character, endPos.character);
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlCodeActions.js
import { CodeAction as CodeAction2, CodeActionKind as CodeActionKind2, Command as Command2, Position as Position4, Range as Range10, TextEdit as TextEdit3 } from "vscode-languageserver-types";

// node_modules/yaml-language-server/lib/esm/commands.js
var YamlCommands;
(function(YamlCommands2) {
  YamlCommands2["JUMP_TO_SCHEMA"] = "jumpToSchema";
})(YamlCommands || (YamlCommands = {}));

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlCodeActions.js
import * as path4 from "path-browserify";
import { CST as CST3, isMap as isMap6, isSeq as isSeq5 } from "yaml";

// node_modules/yaml-language-server/lib/esm/languageservice/utils/flow-style-rewriter.js
import { CST as CST2, visit as visit6 } from "yaml";
var FlowStyleRewriter = class {
  constructor(indentation) {
    this.indentation = indentation;
  }
  write(node) {
    if (node.internalNode.srcToken["type"] !== "flow-collection") {
      return null;
    }
    const collection = node.internalNode.srcToken;
    const blockType = collection.start.type === "flow-map-start" ? "block-map" : "block-seq";
    const parentType = node.parent.type;
    const blockStyle = {
      type: blockType,
      offset: collection.offset,
      indent: collection.indent,
      items: []
    };
    for (const item of collection.items) {
      CST2.visit(item, ({ key, sep, value }) => {
        if (blockType === "block-map") {
          const start = [{ type: "space", indent: 0, offset: key.offset, source: this.indentation }];
          if (parentType === "property") {
            start.unshift({ type: "newline", indent: 0, offset: key.offset, source: "\n" });
          }
          blockStyle.items.push({
            start,
            key,
            sep,
            value
          });
        } else if (blockType === "block-seq") {
          blockStyle.items.push({
            start: [
              { type: "newline", indent: 0, offset: value.offset, source: "\n" },
              { type: "space", indent: 0, offset: value.offset, source: this.indentation },
              { type: "seq-item-ind", indent: 0, offset: value.offset, source: "-" },
              { type: "space", indent: 0, offset: value.offset, source: " " }
            ],
            value
          });
        }
        if (value.type === "flow-collection") {
          return visit6.SKIP;
        }
      });
    }
    return CST2.stringify(blockStyle);
  }
};

// fillers/lodash.ts
var cloneDeep = structuredClone;

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlCodeActions.js
var YamlCodeActions = class {
  constructor(clientCapabilities) {
    this.clientCapabilities = clientCapabilities;
    this.indentation = "  ";
  }
  configure(settings) {
    this.indentation = settings.indentation;
  }
  getCodeAction(document, params) {
    if (!params.context.diagnostics) {
      return;
    }
    const result = [];
    result.push(...this.getConvertToBooleanActions(params.context.diagnostics, document));
    result.push(...this.getJumpToSchemaActions(params.context.diagnostics));
    result.push(...this.getTabToSpaceConverting(params.context.diagnostics, document));
    result.push(...this.getUnusedAnchorsDelete(params.context.diagnostics, document));
    result.push(...this.getConvertToBlockStyleActions(params.context.diagnostics, document));
    result.push(...this.getKeyOrderActions(params.context.diagnostics, document));
    result.push(...this.getQuickFixForPropertyOrValueMismatch(params.context.diagnostics, document));
    return result;
  }
  getJumpToSchemaActions(diagnostics) {
    var _a, _b, _c, _d, _e;
    const isOpenTextDocumentEnabled = (_d = (_c = (_b = (_a = this.clientCapabilities) == null ? void 0 : _a.window) == null ? void 0 : _b.showDocument) == null ? void 0 : _c.support) != null ? _d : false;
    if (!isOpenTextDocumentEnabled) {
      return [];
    }
    const schemaUriToDiagnostic = /* @__PURE__ */ new Map();
    for (const diagnostic of diagnostics) {
      const schemaUri = ((_e = diagnostic.data) == null ? void 0 : _e.schemaUri) || [];
      for (const schemaUriStr of schemaUri) {
        if (schemaUriStr) {
          if (!schemaUriToDiagnostic.has(schemaUriStr)) {
            schemaUriToDiagnostic.set(schemaUriStr, []);
          }
          schemaUriToDiagnostic.get(schemaUriStr).push(diagnostic);
        }
      }
    }
    const result = [];
    for (const schemaUri of schemaUriToDiagnostic.keys()) {
      const action = CodeAction2.create(`Jump to schema location (${path4.basename(schemaUri)})`, Command2.create("JumpToSchema", YamlCommands.JUMP_TO_SCHEMA, schemaUri));
      action.diagnostics = schemaUriToDiagnostic.get(schemaUri);
      result.push(action);
    }
    return result;
  }
  getTabToSpaceConverting(diagnostics, document) {
    const result = [];
    const textBuff = new TextBuffer(document);
    const processedLine = [];
    for (const diag of diagnostics) {
      if (diag.message === "Using tabs can lead to unpredictable results") {
        if (processedLine.includes(diag.range.start.line)) {
          continue;
        }
        const lineContent = textBuff.getLineContent(diag.range.start.line);
        let replacedTabs = 0;
        let newText = "";
        for (let i = diag.range.start.character; i <= diag.range.end.character; i++) {
          const char = lineContent.charAt(i);
          if (char !== "	") {
            break;
          }
          replacedTabs++;
          newText += this.indentation;
        }
        processedLine.push(diag.range.start.line);
        let resultRange = diag.range;
        if (replacedTabs !== diag.range.end.character - diag.range.start.character) {
          resultRange = Range10.create(diag.range.start, Position4.create(diag.range.end.line, diag.range.start.character + replacedTabs));
        }
        result.push(CodeAction2.create("Convert Tab to Spaces", createWorkspaceEdit(document.uri, [TextEdit3.replace(resultRange, newText)]), CodeActionKind2.QuickFix));
      }
    }
    if (result.length !== 0) {
      const replaceEdits = [];
      for (let i = 0; i <= textBuff.getLineCount(); i++) {
        const lineContent = textBuff.getLineContent(i);
        let replacedTabs = 0;
        let newText = "";
        for (let j = 0; j < lineContent.length; j++) {
          const char = lineContent.charAt(j);
          if (char !== " " && char !== "	") {
            if (replacedTabs !== 0) {
              replaceEdits.push(TextEdit3.replace(Range10.create(i, j - replacedTabs, i, j), newText));
              replacedTabs = 0;
              newText = "";
            }
            break;
          }
          if (char === " " && replacedTabs !== 0) {
            replaceEdits.push(TextEdit3.replace(Range10.create(i, j - replacedTabs, i, j), newText));
            replacedTabs = 0;
            newText = "";
            continue;
          }
          if (char === "	") {
            newText += this.indentation;
            replacedTabs++;
          }
        }
        if (replacedTabs !== 0) {
          replaceEdits.push(TextEdit3.replace(Range10.create(i, 0, i, textBuff.getLineLength(i)), newText));
        }
      }
      if (replaceEdits.length > 0) {
        result.push(CodeAction2.create("Convert all Tabs to Spaces", createWorkspaceEdit(document.uri, replaceEdits), CodeActionKind2.QuickFix));
      }
    }
    return result;
  }
  getUnusedAnchorsDelete(diagnostics, document) {
    const result = [];
    const buffer = new TextBuffer(document);
    for (const diag of diagnostics) {
      if (diag.message.startsWith("Unused anchor") && diag.source === YAML_SOURCE) {
        const range = Range10.create(diag.range.start, diag.range.end);
        const actual = buffer.getText(range);
        const lineContent = buffer.getLineContent(range.end.line);
        const lastWhitespaceChar = getFirstNonWhitespaceCharacterAfterOffset(lineContent, range.end.character);
        range.end.character = lastWhitespaceChar;
        const action = CodeAction2.create(`Delete unused anchor: ${actual}`, createWorkspaceEdit(document.uri, [TextEdit3.del(range)]), CodeActionKind2.QuickFix);
        action.diagnostics = [diag];
        result.push(action);
      }
    }
    return result;
  }
  getConvertToBooleanActions(diagnostics, document) {
    const results = [];
    for (const diagnostic of diagnostics) {
      if (diagnostic.message === 'Incorrect type. Expected "boolean".') {
        const value = document.getText(diagnostic.range).toLocaleLowerCase();
        if (value === '"true"' || value === '"false"' || value === "'true'" || value === "'false'") {
          const newValue = value.includes("true") ? "true" : "false";
          results.push(CodeAction2.create("Convert to boolean", createWorkspaceEdit(document.uri, [TextEdit3.replace(diagnostic.range, newValue)]), CodeActionKind2.QuickFix));
        }
      }
    }
    return results;
  }
  getConvertToBlockStyleActions(diagnostics, document) {
    const results = [];
    for (const diagnostic of diagnostics) {
      if (diagnostic.code === "flowMap" || diagnostic.code === "flowSeq") {
        const node = getNodeForDiagnostic(document, diagnostic);
        if (isMap6(node.internalNode) || isSeq5(node.internalNode)) {
          const blockTypeDescription = isMap6(node.internalNode) ? "map" : "sequence";
          const rewriter = new FlowStyleRewriter(this.indentation);
          results.push(CodeAction2.create(`Convert to block style ${blockTypeDescription}`, createWorkspaceEdit(document.uri, [TextEdit3.replace(diagnostic.range, rewriter.write(node))]), CodeActionKind2.QuickFix));
        }
      }
    }
    return results;
  }
  getKeyOrderActions(diagnostics, document) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
    const results = [];
    for (const diagnostic of diagnostics) {
      if ((diagnostic == null ? void 0 : diagnostic.code) === "mapKeyOrder") {
        let node = getNodeForDiagnostic(document, diagnostic);
        while (node && node.type !== "object") {
          node = node.parent;
        }
        if (node && isMap6(node.internalNode)) {
          const sorted = cloneDeep(node.internalNode);
          if ((sorted.srcToken.type === "block-map" || sorted.srcToken.type === "flow-collection") && (node.internalNode.srcToken.type === "block-map" || node.internalNode.srcToken.type === "flow-collection")) {
            sorted.srcToken.items.sort((a2, b) => {
              if (a2.key && b.key && CST3.isScalar(a2.key) && CST3.isScalar(b.key)) {
                return a2.key.source.localeCompare(b.key.source);
              }
              if (!a2.key && b.key) {
                return -1;
              }
              if (a2.key && !b.key) {
                return 1;
              }
              if (!a2.key && !b.key) {
                return 0;
              }
            });
            for (let i = 0; i < sorted.srcToken.items.length; i++) {
              const item = sorted.srcToken.items[i];
              const uItem = node.internalNode.srcToken.items[i];
              item.start = uItem.start;
              if (((_a = item.value) == null ? void 0 : _a.type) === "alias" || ((_b = item.value) == null ? void 0 : _b.type) === "scalar" || ((_c = item.value) == null ? void 0 : _c.type) === "single-quoted-scalar" || ((_d = item.value) == null ? void 0 : _d.type) === "double-quoted-scalar") {
                const newLineIndex = (_g = (_f = (_e = item.value) == null ? void 0 : _e.end) == null ? void 0 : _f.findIndex((p) => p.type === "newline")) != null ? _g : -1;
                let newLineToken = null;
                if (((_h = uItem.value) == null ? void 0 : _h.type) === "block-scalar") {
                  newLineToken = (_j = (_i = uItem.value) == null ? void 0 : _i.props) == null ? void 0 : _j.find((p) => p.type === "newline");
                } else if (CST3.isScalar(uItem.value)) {
                  newLineToken = (_l = (_k = uItem.value) == null ? void 0 : _k.end) == null ? void 0 : _l.find((p) => p.type === "newline");
                }
                if (newLineToken && newLineIndex < 0) {
                  item.value.end = (_m = item.value.end) != null ? _m : [];
                  item.value.end.push(newLineToken);
                }
                if (!newLineToken && newLineIndex > -1) {
                  item.value.end.splice(newLineIndex, 1);
                }
              } else if (((_n = item.value) == null ? void 0 : _n.type) === "block-scalar") {
                const newline = item.value.props.find((p) => p.type === "newline");
                if (!newline) {
                  item.value.props.push({ type: "newline", indent: 0, offset: item.value.offset, source: "\n" });
                }
              }
            }
          }
          const replaceRange = Range10.create(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
          results.push(CodeAction2.create("Fix key order for this map", createWorkspaceEdit(document.uri, [TextEdit3.replace(replaceRange, CST3.stringify(sorted.srcToken))]), CodeActionKind2.QuickFix));
        }
      }
    }
    return results;
  }
  /**
   * Check if diagnostic contains info for quick fix
   * Supports Enum/Const/Property mismatch
   */
  getPossibleQuickFixValues(diagnostic) {
    if (typeof diagnostic.data !== "object") {
      return;
    }
    if (diagnostic.code === ErrorCode.EnumValueMismatch && "values" in diagnostic.data && Array.isArray(diagnostic.data.values)) {
      return diagnostic.data.values;
    } else if (diagnostic.code === ErrorCode.PropertyExpected && "properties" in diagnostic.data && Array.isArray(diagnostic.data.properties)) {
      return diagnostic.data.properties;
    }
  }
  getQuickFixForPropertyOrValueMismatch(diagnostics, document) {
    const results = [];
    for (const diagnostic of diagnostics) {
      const values = this.getPossibleQuickFixValues(diagnostic);
      if (!(values == null ? void 0 : values.length)) {
        continue;
      }
      for (const value of values) {
        results.push(CodeAction2.create(value, createWorkspaceEdit(document.uri, [TextEdit3.replace(diagnostic.range, value)]), CodeActionKind2.QuickFix));
      }
    }
    return results;
  }
};
function getNodeForDiagnostic(document, diagnostic) {
  const yamlDocuments = yamlDocumentsCache.getYamlDocument(document);
  const startOffset = document.offsetAt(diagnostic.range.start);
  const yamlDoc = matchOffsetToDocument(startOffset, yamlDocuments);
  const node = yamlDoc.getNodeFromOffset(startOffset);
  return node;
}
function createWorkspaceEdit(uri, edits) {
  const changes = {};
  changes[uri] = edits;
  const edit = {
    changes
  };
  return edit;
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlOnTypeFormatting.js
import { Position as Position5, Range as Range11, TextEdit as TextEdit4 } from "vscode-languageserver-types";
function doDocumentOnTypeFormatting(document, params) {
  const { position } = params;
  const tb = new TextBuffer(document);
  if (params.ch === "\n") {
    const previousLine = tb.getLineContent(position.line - 1);
    if (previousLine.trimRight().endsWith(":")) {
      const currentLine = tb.getLineContent(position.line);
      const subLine = currentLine.substring(position.character, currentLine.length);
      const isInArray = previousLine.indexOf(" - ") !== -1;
      if (subLine.trimRight().length === 0) {
        const indentationFix = position.character - (previousLine.length - previousLine.trimLeft().length);
        if (indentationFix === params.options.tabSize && !isInArray) {
          return;
        }
        const result = [];
        if (currentLine.length > 0) {
          result.push(TextEdit4.del(Range11.create(position, Position5.create(position.line, currentLine.length - 1))));
        }
        result.push(TextEdit4.insert(position, " ".repeat(params.options.tabSize + (isInArray ? 2 - indentationFix : 0))));
        return result;
      }
      if (isInArray) {
        return [TextEdit4.insert(position, " ".repeat(params.options.tabSize))];
      }
    }
    if (previousLine.trimRight().endsWith("|")) {
      return [TextEdit4.insert(position, " ".repeat(params.options.tabSize))];
    }
    if (previousLine.includes(" - ") && !previousLine.includes(": ")) {
      return [TextEdit4.insert(position, "- ")];
    }
    if (previousLine.includes(" - ") && previousLine.includes(": ")) {
      return [TextEdit4.insert(position, "  ")];
    }
  }
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlCodeLens.js
import { CodeLens, Range as Range12 } from "vscode-languageserver-types";

// node_modules/yaml-language-server/lib/esm/languageservice/utils/schemaUrls.js
function getSchemaUrls(schema) {
  const result = /* @__PURE__ */ new Map();
  if (!schema) {
    return result;
  }
  if (schema.url) {
    if (schema.url.startsWith("schemaservice://combinedSchema/")) {
      addSchemasForOf(schema, result);
    } else {
      result.set(schema.url, schema);
    }
  } else {
    addSchemasForOf(schema, result);
  }
  return result;
}
function addSchemasForOf(schema, result) {
  if (schema.allOf) {
    addInnerSchemaUrls(schema.allOf, result);
  }
  if (schema.anyOf) {
    addInnerSchemaUrls(schema.anyOf, result);
  }
  if (schema.oneOf) {
    addInnerSchemaUrls(schema.oneOf, result);
  }
}
function addInnerSchemaUrls(schemas, result) {
  for (const subSchema of schemas) {
    if (!isBoolean2(subSchema) && subSchema.url && !result.has(subSchema.url)) {
      result.set(subSchema.url, subSchema);
    }
  }
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlCodeLens.js
var YamlCodeLens = class {
  constructor(schemaService, telemetry2) {
    this.schemaService = schemaService;
    this.telemetry = telemetry2;
  }
  async getCodeLens(document) {
    var _a;
    const result = [];
    try {
      const yamlDocument = yamlDocumentsCache.getYamlDocument(document);
      let schemaUrls = /* @__PURE__ */ new Map();
      for (const currentYAMLDoc of yamlDocument.documents) {
        const schema = await this.schemaService.getSchemaForResource(document.uri, currentYAMLDoc);
        if (schema == null ? void 0 : schema.schema) {
          schemaUrls = new Map([...getSchemaUrls(schema == null ? void 0 : schema.schema), ...schemaUrls]);
        }
      }
      for (const urlToSchema of schemaUrls) {
        const lens = CodeLens.create(Range12.create(0, 0, 0, 0));
        lens.command = {
          title: getSchemaTitle(urlToSchema[1], urlToSchema[0]),
          command: YamlCommands.JUMP_TO_SCHEMA,
          arguments: [urlToSchema[0]]
        };
        result.push(lens);
      }
    } catch (err) {
      (_a = this.telemetry) == null ? void 0 : _a.sendError("yaml.codeLens.error", err);
    }
    return result;
  }
  resolveCodeLens(param) {
    return param;
  }
};

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlCompletion.js
import { CompletionItem as CompletionItemBase, CompletionItemKind as CompletionItemKind2, CompletionList as CompletionList2, InsertTextFormat as InsertTextFormat2, InsertTextMode, MarkupKind as MarkupKind3, Position as Position6, Range as Range13, TextEdit as TextEdit5 } from "vscode-languageserver-types";
import { isPair as isPair3, isScalar as isScalar5, isMap as isMap7, isSeq as isSeq6, isNode as isNode4 } from "yaml";

// node_modules/yaml-language-server/lib/esm/languageservice/utils/indentationGuesser.js
var SpacesDiffResult = class {
  constructor() {
    this.spacesDiff = 0;
    this.looksLikeAlignment = false;
  }
};
function spacesDiff(a2, aLength, b, bLength, result) {
  result.spacesDiff = 0;
  result.looksLikeAlignment = false;
  let i;
  for (i = 0; i < aLength && i < bLength; i++) {
    const aCharCode = a2.charCodeAt(i);
    const bCharCode = b.charCodeAt(i);
    if (aCharCode !== bCharCode) {
      break;
    }
  }
  let aSpacesCnt = 0, aTabsCount = 0;
  for (let j = i; j < aLength; j++) {
    const aCharCode = a2.charCodeAt(j);
    if (aCharCode === 32) {
      aSpacesCnt++;
    } else {
      aTabsCount++;
    }
  }
  let bSpacesCnt = 0, bTabsCount = 0;
  for (let j = i; j < bLength; j++) {
    const bCharCode = b.charCodeAt(j);
    if (bCharCode === 32) {
      bSpacesCnt++;
    } else {
      bTabsCount++;
    }
  }
  if (aSpacesCnt > 0 && aTabsCount > 0) {
    return;
  }
  if (bSpacesCnt > 0 && bTabsCount > 0) {
    return;
  }
  const tabsDiff = Math.abs(aTabsCount - bTabsCount);
  const spacesDiff2 = Math.abs(aSpacesCnt - bSpacesCnt);
  if (tabsDiff === 0) {
    result.spacesDiff = spacesDiff2;
    if (spacesDiff2 > 0 && 0 <= bSpacesCnt - 1 && bSpacesCnt - 1 < a2.length && bSpacesCnt < b.length) {
      if (b.charCodeAt(bSpacesCnt) !== 32 && a2.charCodeAt(bSpacesCnt - 1) === 32) {
        if (a2.charCodeAt(a2.length - 1) === 44) {
          result.looksLikeAlignment = true;
        }
      }
    }
    return;
  }
  if (spacesDiff2 % tabsDiff === 0) {
    result.spacesDiff = spacesDiff2 / tabsDiff;
  }
}
function guessIndentation(source, defaultTabSize, defaultInsertSpaces) {
  const linesCount = Math.min(source.getLineCount(), 1e4);
  let linesIndentedWithTabsCount = 0;
  let linesIndentedWithSpacesCount = 0;
  let previousLineText = "";
  let previousLineIndentation = 0;
  const ALLOWED_TAB_SIZE_GUESSES = [2, 4, 6, 8, 3, 5, 7];
  const MAX_ALLOWED_TAB_SIZE_GUESS = 8;
  const spacesDiffCount = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const tmp = new SpacesDiffResult();
  for (let lineNumber = 1; lineNumber <= linesCount; lineNumber++) {
    const currentLineLength = source.getLineLength(lineNumber);
    const currentLineText = source.getLineContent(lineNumber);
    const useCurrentLineText = currentLineLength <= 65536;
    let currentLineHasContent = false;
    let currentLineIndentation = 0;
    let currentLineSpacesCount = 0;
    let currentLineTabsCount = 0;
    for (let j = 0, lenJ = currentLineLength; j < lenJ; j++) {
      const charCode = useCurrentLineText ? currentLineText.charCodeAt(j) : source.getLineCharCode(lineNumber, j);
      if (charCode === 9) {
        currentLineTabsCount++;
      } else if (charCode === 32) {
        currentLineSpacesCount++;
      } else {
        currentLineHasContent = true;
        currentLineIndentation = j;
        break;
      }
    }
    if (!currentLineHasContent) {
      continue;
    }
    if (currentLineTabsCount > 0) {
      linesIndentedWithTabsCount++;
    } else if (currentLineSpacesCount > 1) {
      linesIndentedWithSpacesCount++;
    }
    spacesDiff(previousLineText, previousLineIndentation, currentLineText, currentLineIndentation, tmp);
    if (tmp.looksLikeAlignment) {
      if (!(defaultInsertSpaces && defaultTabSize === tmp.spacesDiff)) {
        continue;
      }
    }
    const currentSpacesDiff = tmp.spacesDiff;
    if (currentSpacesDiff <= MAX_ALLOWED_TAB_SIZE_GUESS) {
      spacesDiffCount[currentSpacesDiff]++;
    }
    previousLineText = currentLineText;
    previousLineIndentation = currentLineIndentation;
  }
  let insertSpaces = defaultInsertSpaces;
  if (linesIndentedWithTabsCount !== linesIndentedWithSpacesCount) {
    insertSpaces = linesIndentedWithTabsCount < linesIndentedWithSpacesCount;
  }
  let tabSize = defaultTabSize;
  if (insertSpaces) {
    let tabSizeScore = insertSpaces ? 0 : 0.1 * linesCount;
    ALLOWED_TAB_SIZE_GUESSES.forEach((possibleTabSize) => {
      const possibleTabSizeScore = spacesDiffCount[possibleTabSize];
      if (possibleTabSizeScore > tabSizeScore) {
        tabSizeScore = possibleTabSizeScore;
        tabSize = possibleTabSize;
      }
    });
    if (tabSize === 4 && spacesDiffCount[4] > 0 && spacesDiffCount[2] > 0 && spacesDiffCount[2] >= spacesDiffCount[4] / 2) {
      tabSize = 2;
    }
  }
  return {
    insertSpaces,
    tabSize
  };
}

// node_modules/yaml-language-server/lib/esm/languageservice/utils/json.js
function stringifyObject(obj, indent, stringifyLiteral, settings, depth = 0, consecutiveArrays = 0) {
  if (obj !== null && typeof obj === "object") {
    const newIndent = depth === 0 && settings.shouldIndentWithTab || depth > 0 ? indent + settings.indentation : "";
    if (Array.isArray(obj)) {
      consecutiveArrays += 1;
      if (obj.length === 0) {
        return "";
      }
      let result = "";
      for (let i = 0; i < obj.length; i++) {
        let pseudoObj = obj[i];
        if (typeof obj[i] !== "object") {
          result += "\n" + newIndent + "- " + stringifyLiteral(obj[i]);
          continue;
        }
        if (!Array.isArray(obj[i])) {
          pseudoObj = prependToObject(obj[i], consecutiveArrays);
        }
        result += stringifyObject(pseudoObj, indent, stringifyLiteral, settings, depth += 1, consecutiveArrays);
      }
      return result;
    } else {
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return "";
      }
      let result = depth === 0 && settings.newLineFirst || depth > 0 ? "\n" : "";
      let isFirstProp = true;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (depth === 0 && settings.existingProps.includes(key)) {
          continue;
        }
        const isObject = typeof obj[key] === "object";
        const colonDelimiter = isObject ? ":" : ": ";
        const parentArrayCompensation = isObject && /^\s|-/.test(key) ? settings.indentation : "";
        const objectIndent = newIndent + parentArrayCompensation;
        const lineBreak = isFirstProp ? "" : "\n";
        if (depth === 0 && isFirstProp && !settings.indentFirstObject) {
          const value = stringifyObject(obj[key], objectIndent, stringifyLiteral, settings, depth + 1, 0);
          result += lineBreak + indent + key + colonDelimiter + value;
        } else {
          const value = stringifyObject(obj[key], objectIndent, stringifyLiteral, settings, depth + 1, 0);
          result += lineBreak + newIndent + key + colonDelimiter + value;
        }
        isFirstProp = false;
      }
      return result;
    }
  }
  return stringifyLiteral(obj);
}
function prependToObject(obj, consecutiveArrays) {
  const newObj = {};
  for (let i = 0; i < Object.keys(obj).length; i++) {
    const key = Object.keys(obj)[i];
    if (i === 0) {
      newObj["- ".repeat(consecutiveArrays) + key] = obj[key];
    } else {
      newObj["  ".repeat(consecutiveArrays) + key] = obj[key];
    }
  }
  return newObj;
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlCompletion.js
var localize7 = loadMessageBundle();
var doubleQuotesEscapeRegExp = /[\\]+"/g;
var parentCompletionKind = CompletionItemKind2.Class;
var existingProposeItem = "__";
var YamlCompletion = class {
  constructor(schemaService, clientCapabilities = {}, yamlDocument, telemetry2) {
    this.schemaService = schemaService;
    this.clientCapabilities = clientCapabilities;
    this.yamlDocument = yamlDocument;
    this.telemetry = telemetry2;
    this.completionEnabled = true;
    this.arrayPrefixIndentation = "";
    this.isNumberExp = /^\d+$/;
  }
  configure(languageSettings, yamlSettings) {
    var _a;
    if (languageSettings) {
      this.completionEnabled = languageSettings.completion;
    }
    this.customTags = languageSettings.customTags;
    this.yamlVersion = languageSettings.yamlVersion;
    this.isSingleQuote = ((_a = yamlSettings == null ? void 0 : yamlSettings.yamlFormatterSettings) == null ? void 0 : _a.singleQuote) || false;
    this.configuredIndentation = languageSettings.indentation;
    this.disableDefaultProperties = languageSettings.disableDefaultProperties;
    this.parentSkeletonSelectedFirst = languageSettings.parentSkeletonSelectedFirst;
  }
  async doComplete(document, position, isKubernetes = false, doComplete = true) {
    var _a;
    const result = CompletionList2.create([], false);
    if (!this.completionEnabled) {
      return result;
    }
    const doc = this.yamlDocument.getYamlDocument(document, { customTags: this.customTags, yamlVersion: this.yamlVersion }, true);
    const textBuffer = new TextBuffer(document);
    if (!this.configuredIndentation) {
      const indent = guessIndentation(textBuffer, 2, true);
      this.indentation = indent.insertSpaces ? " ".repeat(indent.tabSize) : "	";
    } else {
      this.indentation = this.configuredIndentation;
    }
    setKubernetesParserOption(doc.documents, isKubernetes);
    for (const jsonDoc of doc.documents) {
      jsonDoc.uri = document.uri;
    }
    const offset = document.offsetAt(position);
    const text = document.getText();
    if (text.charAt(offset - 1) === ":") {
      return Promise.resolve(result);
    }
    let currentDoc = matchOffsetToDocument(offset, doc);
    if (currentDoc === null) {
      return Promise.resolve(result);
    }
    currentDoc = currentDoc.clone();
    let [node, foundByClosest] = currentDoc.getNodeFromPosition(offset, textBuffer, this.indentation.length);
    const currentWord = this.getCurrentWord(document, offset);
    let lineContent = textBuffer.getLineContent(position.line);
    const lineAfterPosition = lineContent.substring(position.character);
    const areOnlySpacesAfterPosition = /^[ ]+\n?$/.test(lineAfterPosition);
    this.arrayPrefixIndentation = "";
    let overwriteRange = null;
    if (areOnlySpacesAfterPosition) {
      overwriteRange = Range13.create(position, Position6.create(position.line, lineContent.length));
      const isOnlyWhitespace = lineContent.trim().length === 0;
      const isOnlyDash = lineContent.match(/^\s*(-)\s*$/);
      if (node && isScalar5(node) && !isOnlyWhitespace && !isOnlyDash) {
        const lineToPosition = lineContent.substring(0, position.character);
        const matches = (
          // get indentation of unfinished property (between indent and cursor)
          lineToPosition.match(/^[\s-]*([^:]+)?$/) || // OR get unfinished value (between colon and cursor)
          lineToPosition.match(/:[ \t]((?!:[ \t]).*)$/)
        );
        if (matches == null ? void 0 : matches[1]) {
          overwriteRange = Range13.create(Position6.create(position.line, position.character - matches[1].length), Position6.create(position.line, lineContent.length));
        }
      }
    } else if (node && isScalar5(node) && node.value === "null") {
      const nodeStartPos = document.positionAt(node.range[0]);
      nodeStartPos.character += 1;
      const nodeEndPos = document.positionAt(node.range[2]);
      nodeEndPos.character += 1;
      overwriteRange = Range13.create(nodeStartPos, nodeEndPos);
    } else if (node && isScalar5(node) && node.value) {
      const start = document.positionAt(node.range[0]);
      overwriteRange = Range13.create(start, document.positionAt(node.range[1]));
    } else if (node && isScalar5(node) && node.value === null && currentWord === "-") {
      overwriteRange = Range13.create(position, position);
      this.arrayPrefixIndentation = " ";
    } else {
      let overwriteStart = offset - currentWord.length;
      if (overwriteStart > 0 && text[overwriteStart - 1] === '"') {
        overwriteStart--;
      }
      overwriteRange = Range13.create(document.positionAt(overwriteStart), position);
    }
    const proposed = {};
    const collector = {
      add: (completionItem, oneOfSchema) => {
        const addSuggestionForParent = function(completionItem2) {
          var _a2;
          const existsInYaml = ((_a2 = proposed[completionItem2.label]) == null ? void 0 : _a2.label) === existingProposeItem;
          if (existsInYaml) {
            return;
          }
          const schema = completionItem2.parent.schema;
          const schemaType = getSchemaTypeName(schema);
          const schemaDescription = schema.markdownDescription || schema.description;
          let parentCompletion = result.items.find((item) => {
            var _a3;
            return ((_a3 = item.parent) == null ? void 0 : _a3.schema) === schema && item.kind === parentCompletionKind;
          });
          if (parentCompletion && parentCompletion.parent.insertTexts.includes(completionItem2.insertText)) {
            return;
          } else if (!parentCompletion) {
            parentCompletion = {
              ...completionItem2,
              label: schemaType,
              documentation: schemaDescription,
              sortText: "_" + schemaType,
              kind: parentCompletionKind
            };
            parentCompletion.label = parentCompletion.label || completionItem2.label;
            parentCompletion.parent.insertTexts = [completionItem2.insertText];
            result.items.push(parentCompletion);
          } else {
            parentCompletion.parent.insertTexts.push(completionItem2.insertText);
          }
        };
        const isForParentCompletion = !!completionItem.parent;
        let label = completionItem.label;
        if (!label) {
          console.warn(`Ignoring CompletionItem without label: ${JSON.stringify(completionItem)}`);
          return;
        }
        if (!isString2(label)) {
          label = String(label);
        }
        label = label.replace(/[\n]/g, "\u21B5");
        if (label.length > 60) {
          const shortendedLabel = label.substr(0, 57).trim() + "...";
          if (!proposed[shortendedLabel]) {
            label = shortendedLabel;
          }
        }
        if (completionItem.label.toLowerCase() === "regular expression") {
          const docObject = completionItem.documentation;
          const splitValues = docObject.value.split(":");
          label = splitValues.length > 0 ? `${this.getQuote()}\\${JSON.parse(splitValues[1])}${this.getQuote()}` : completionItem.label;
          completionItem.insertText = label;
          completionItem.textEdit = TextEdit5.replace(overwriteRange, label);
        } else {
          let mdText = completionItem.insertText.replace(/\${[0-9]+[:|](.*)}/g, (s, arg) => arg).replace(/\$([0-9]+)/g, "");
          const splitMDText = mdText.split(":");
          let value = splitMDText.length > 1 ? splitMDText[1].trim() : mdText;
          if (value && /^(['\\"\\])$/.test(value)) {
            value = `${this.getQuote()}\\${value}${this.getQuote()}`;
            mdText = splitMDText.length > 1 ? splitMDText[0] + ": " + value : value;
            completionItem.insertText = mdText;
          }
          if (completionItem.insertText.endsWith("$1") && !isForParentCompletion) {
            completionItem.insertText = completionItem.insertText.substr(0, completionItem.insertText.length - 2);
          }
          if (overwriteRange && overwriteRange.start.line === overwriteRange.end.line) {
            completionItem.textEdit = TextEdit5.replace(overwriteRange, completionItem.insertText);
          }
        }
        completionItem.label = label;
        if (isForParentCompletion) {
          addSuggestionForParent(completionItem);
          return;
        }
        if (this.arrayPrefixIndentation) {
          this.updateCompletionText(completionItem, this.arrayPrefixIndentation + completionItem.insertText);
        }
        const existing = proposed[label];
        const isInsertTextDifferent = (existing == null ? void 0 : existing.label) !== existingProposeItem && (existing == null ? void 0 : existing.insertText) !== completionItem.insertText;
        if (!existing) {
          proposed[label] = completionItem;
          result.items.push(completionItem);
        } else if (isInsertTextDifferent) {
          const mergedText = this.mergeSimpleInsertTexts(label, existing.insertText, completionItem.insertText, oneOfSchema);
          if (mergedText) {
            this.updateCompletionText(existing, mergedText);
          } else {
            proposed[label] = completionItem;
            result.items.push(completionItem);
          }
        }
        if (existing && !existing.documentation && completionItem.documentation) {
          existing.documentation = completionItem.documentation;
        }
      },
      error: (message) => {
        var _a2;
        (_a2 = this.telemetry) == null ? void 0 : _a2.sendError("yaml.completion.error", message);
      },
      log: (message) => {
        console.log(message);
      },
      getNumberOfProposals: () => {
        return result.items.length;
      },
      result,
      proposed
    };
    if (this.customTags && this.customTags.length > 0) {
      this.getCustomTagValueCompletions(collector);
    }
    if (lineContent.endsWith("\n")) {
      lineContent = lineContent.substr(0, lineContent.length - 1);
    }
    try {
      const schema = await this.schemaService.getSchemaForResource(document.uri, currentDoc);
      if (!schema || schema.errors.length) {
        if (position.line === 0 && position.character === 0 && !isModeline(lineContent)) {
          const inlineSchemaCompletion = {
            kind: CompletionItemKind2.Text,
            label: "Inline schema",
            insertText: "# yaml-language-server: $schema=",
            insertTextFormat: InsertTextFormat2.PlainText
          };
          result.items.push(inlineSchemaCompletion);
        }
      }
      if (isModeline(lineContent) || isInComment(doc.tokens, offset)) {
        const schemaIndex = lineContent.indexOf("$schema=");
        if (schemaIndex !== -1 && schemaIndex + "$schema=".length <= position.character) {
          this.schemaService.getAllSchemas().forEach((schema2) => {
            var _a2;
            const schemaIdCompletion = {
              kind: CompletionItemKind2.Constant,
              label: (_a2 = schema2.name) != null ? _a2 : schema2.uri,
              detail: schema2.description,
              insertText: schema2.uri,
              insertTextFormat: InsertTextFormat2.PlainText,
              insertTextMode: InsertTextMode.asIs
            };
            result.items.push(schemaIdCompletion);
          });
        }
        return result;
      }
      if (!schema || schema.errors.length) {
        return result;
      }
      let currentProperty = null;
      if (!node) {
        if (!currentDoc.internalDocument.contents || isScalar5(currentDoc.internalDocument.contents)) {
          const map = currentDoc.internalDocument.createNode({});
          map.range = [offset, offset + 1, offset + 1];
          currentDoc.internalDocument.contents = map;
          currentDoc.updateFromInternalDocument();
          node = map;
        } else {
          node = currentDoc.findClosestNode(offset, textBuffer);
          foundByClosest = true;
        }
      }
      const originalNode = node;
      if (node) {
        if (lineContent.length === 0) {
          node = currentDoc.internalDocument.contents;
        } else {
          const parent = currentDoc.getParent(node);
          if (parent) {
            if (isScalar5(node)) {
              if (node.value) {
                if (isPair3(parent)) {
                  if (parent.value === node) {
                    if (lineContent.trim().length > 0 && lineContent.indexOf(":") < 0) {
                      const map = this.createTempObjNode(currentWord, node, currentDoc);
                      const parentParent = currentDoc.getParent(parent);
                      if (isSeq6(currentDoc.internalDocument.contents)) {
                        const index = indexOf(currentDoc.internalDocument.contents, parent);
                        if (typeof index === "number") {
                          currentDoc.internalDocument.set(index, map);
                          currentDoc.updateFromInternalDocument();
                        }
                      } else if (parentParent && (isMap7(parentParent) || isSeq6(parentParent))) {
                        parentParent.set(parent.key, map);
                        currentDoc.updateFromInternalDocument();
                      } else {
                        currentDoc.internalDocument.set(parent.key, map);
                        currentDoc.updateFromInternalDocument();
                      }
                      currentProperty = map.items[0];
                      node = map;
                    } else if (lineContent.trim().length === 0) {
                      const parentParent = currentDoc.getParent(parent);
                      if (parentParent) {
                        node = parentParent;
                      }
                    }
                  } else if (parent.key === node) {
                    const parentParent = currentDoc.getParent(parent);
                    currentProperty = parent;
                    if (parentParent) {
                      node = parentParent;
                    }
                  }
                } else if (isSeq6(parent)) {
                  if (lineContent.trim().length > 0) {
                    const map = this.createTempObjNode(currentWord, node, currentDoc);
                    parent.delete(node);
                    parent.add(map);
                    currentDoc.updateFromInternalDocument();
                    node = map;
                  } else {
                    node = parent;
                  }
                }
              } else if (node.value === null) {
                if (isPair3(parent)) {
                  if (parent.key === node) {
                    node = parent;
                  } else {
                    if (isNode4(parent.key) && parent.key.range) {
                      const parentParent = currentDoc.getParent(parent);
                      if (foundByClosest && parentParent && isMap7(parentParent) && isMapContainsEmptyPair(parentParent)) {
                        node = parentParent;
                      } else {
                        const parentPosition = document.positionAt(parent.key.range[0]);
                        if (position.character > parentPosition.character && position.line !== parentPosition.line) {
                          const map = this.createTempObjNode(currentWord, node, currentDoc);
                          if (parentParent && (isMap7(parentParent) || isSeq6(parentParent))) {
                            parentParent.set(parent.key, map);
                            currentDoc.updateFromInternalDocument();
                          } else {
                            currentDoc.internalDocument.set(parent.key, map);
                            currentDoc.updateFromInternalDocument();
                          }
                          currentProperty = map.items[0];
                          node = map;
                        } else if (parentPosition.character === position.character) {
                          if (parentParent) {
                            node = parentParent;
                          }
                        }
                      }
                    }
                  }
                } else if (isSeq6(parent)) {
                  if (lineContent.charAt(position.character - 1) !== "-") {
                    const map = this.createTempObjNode(currentWord, node, currentDoc);
                    parent.delete(node);
                    parent.add(map);
                    currentDoc.updateFromInternalDocument();
                    node = map;
                  } else if (lineContent.charAt(position.character - 1) === "-") {
                    const map = this.createTempObjNode("", node, currentDoc);
                    parent.delete(node);
                    parent.add(map);
                    currentDoc.updateFromInternalDocument();
                    node = map;
                  } else {
                    node = parent;
                  }
                }
              }
            } else if (isMap7(node)) {
              if (!foundByClosest && lineContent.trim().length === 0 && isSeq6(parent)) {
                const nextLine = textBuffer.getLineContent(position.line + 1);
                if (textBuffer.getLineCount() === position.line + 1 || nextLine.trim().length === 0) {
                  node = parent;
                }
              }
            }
          } else if (isScalar5(node)) {
            const map = this.createTempObjNode(currentWord, node, currentDoc);
            currentDoc.internalDocument.contents = map;
            currentDoc.updateFromInternalDocument();
            currentProperty = map.items[0];
            node = map;
          } else if (isMap7(node)) {
            for (const pair of node.items) {
              if (isNode4(pair.value) && pair.value.range && pair.value.range[0] === offset + 1) {
                node = pair.value;
              }
            }
          } else if (isSeq6(node)) {
            if (lineContent.charAt(position.character - 1) !== "-") {
              const map = this.createTempObjNode(currentWord, node, currentDoc);
              map.items = [];
              currentDoc.updateFromInternalDocument();
              for (const pair of node.items) {
                if (isMap7(pair)) {
                  pair.items.forEach((value) => {
                    map.items.push(value);
                  });
                }
              }
              node = map;
            }
          }
        }
      }
      if (node && isMap7(node)) {
        const properties = node.items;
        for (const p of properties) {
          if (!currentProperty || currentProperty !== p) {
            if (isScalar5(p.key)) {
              proposed[p.key.value + ""] = CompletionItemBase.create(existingProposeItem);
            }
          }
        }
        this.addPropertyCompletions(schema, currentDoc, node, originalNode, "", collector, textBuffer, overwriteRange, doComplete);
        if (!schema && currentWord.length > 0 && text.charAt(offset - currentWord.length - 1) !== '"') {
          collector.add({
            kind: CompletionItemKind2.Property,
            label: currentWord,
            insertText: this.getInsertTextForProperty(currentWord, null, ""),
            insertTextFormat: InsertTextFormat2.Snippet
          });
        }
      }
      const types = {};
      this.getValueCompletions(schema, currentDoc, node, offset, document, collector, types, doComplete);
    } catch (err) {
      (_a = this.telemetry) == null ? void 0 : _a.sendError("yaml.completion.error", err);
    }
    this.finalizeParentCompletion(result);
    const uniqueItems = result.items.filter((arr, index, self) => index === self.findIndex((item) => item.label === arr.label && item.insertText === arr.insertText && item.kind === arr.kind));
    if ((uniqueItems == null ? void 0 : uniqueItems.length) > 0) {
      result.items = uniqueItems;
    }
    return result;
  }
  updateCompletionText(completionItem, text) {
    completionItem.insertText = text;
    if (completionItem.textEdit) {
      completionItem.textEdit.newText = text;
    }
  }
  mergeSimpleInsertTexts(label, existingText, addingText, oneOfSchema) {
    const containsNewLineAfterColon = (value) => {
      return value.includes("\n");
    };
    const startWithNewLine = (value) => {
      return value.startsWith("\n");
    };
    const isNullObject = (value) => {
      const index = value.indexOf("\n");
      return index > 0 && value.substring(index, value.length).trim().length === 0;
    };
    if (containsNewLineAfterColon(existingText) || containsNewLineAfterColon(addingText)) {
      if (oneOfSchema && isNullObject(existingText) && !isNullObject(addingText) && !startWithNewLine(addingText)) {
        return addingText;
      }
      return void 0;
    }
    const existingValues = this.getValuesFromInsertText(existingText);
    const addingValues = this.getValuesFromInsertText(addingText);
    const newValues = Array.prototype.concat(existingValues, addingValues);
    if (!newValues.length) {
      return void 0;
    } else if (newValues.length === 1) {
      return `${label}: \${1:${newValues[0]}}`;
    } else {
      return `${label}: \${1|${newValues.join(",")}|}`;
    }
  }
  getValuesFromInsertText(insertText) {
    const value = insertText.substring(insertText.indexOf(":") + 1).trim();
    if (!value) {
      return [];
    }
    const valueMath = value.match(/^\${1[|:]([^|]*)+\|?}$/);
    if (valueMath) {
      return valueMath[1].split(",");
    }
    return [value];
  }
  finalizeParentCompletion(result) {
    const reindexText = (insertTexts) => {
      let max$index = 0;
      return insertTexts.map((text) => {
        const match = text.match(/\$([0-9]+)|\${[0-9]+:/g);
        if (!match) {
          return text;
        }
        const max$indexLocal = match.map((m) => +m.replace(/\${([0-9]+)[:|]/g, "$1").replace("$", "")).reduce((p, n) => n > p ? n : p, 0);
        const reindexedStr = text.replace(/\$([0-9]+)/g, (s, args) => "$" + (+args + max$index)).replace(/\${([0-9]+)[:|]/g, (s, args) => "${" + (+args + max$index) + ":");
        max$index += max$indexLocal;
        return reindexedStr;
      });
    };
    result.items.forEach((completionItem) => {
      if (this.isParentCompletionItem(completionItem)) {
        const indent = completionItem.parent.indent || "";
        const reindexedTexts = reindexText(completionItem.parent.insertTexts);
        let insertText = reindexedTexts.join(`
${indent}`);
        if (insertText.endsWith("$1")) {
          insertText = insertText.substring(0, insertText.length - 2);
        }
        completionItem.insertText = this.arrayPrefixIndentation + insertText;
        if (completionItem.textEdit) {
          completionItem.textEdit.newText = completionItem.insertText;
        }
        const mdText = insertText.replace(/\${[0-9]+[:|](.*)}/g, (s, arg) => arg).replace(/\$([0-9]+)/g, "");
        const originalDocumentation = completionItem.documentation ? [completionItem.documentation, "", "----", ""] : [];
        completionItem.documentation = {
          kind: MarkupKind3.Markdown,
          value: [...originalDocumentation, "```yaml", indent + mdText, "```"].join("\n")
        };
        delete completionItem.parent;
      }
    });
  }
  createTempObjNode(currentWord, node, currentDoc) {
    const obj = {};
    obj[currentWord] = null;
    const map = currentDoc.internalDocument.createNode(obj);
    map.range = node.range;
    map.items[0].key.range = node.range;
    map.items[0].value.range = node.range;
    return map;
  }
  addPropertyCompletions(schema, doc, node, originalNode, separatorAfter, collector, textBuffer, overwriteRange, doComplete) {
    var _a, _b, _c;
    const matchingSchemas = doc.getMatchingSchemas(schema.schema, -1, null, doComplete);
    const existingKey = textBuffer.getText(overwriteRange);
    const lineContent = textBuffer.getLineContent(overwriteRange.start.line);
    const hasOnlyWhitespace = lineContent.trim().length === 0;
    const hasColon = lineContent.indexOf(":") !== -1;
    const isInArray = lineContent.trimLeft().indexOf("-") === 0;
    const nodeParent = doc.getParent(node);
    const matchOriginal = matchingSchemas.find((it) => it.node.internalNode === originalNode && it.schema.properties);
    const oneOfSchema = matchingSchemas.filter((schema2) => schema2.schema.oneOf).map((oneOfSchema2) => oneOfSchema2.schema.oneOf)[0];
    let didOneOfSchemaMatches = false;
    if ((oneOfSchema == null ? void 0 : oneOfSchema.length) < matchingSchemas.length) {
      oneOfSchema == null ? void 0 : oneOfSchema.forEach((property, index) => {
        var _a2, _b2;
        if (!((_a2 = matchingSchemas[index]) == null ? void 0 : _a2.schema.oneOf) && ((_b2 = matchingSchemas[index]) == null ? void 0 : _b2.schema.properties) === property.properties) {
          didOneOfSchemaMatches = true;
        }
      });
    }
    for (const schema2 of matchingSchemas) {
      if ((schema2.node.internalNode === node && !matchOriginal || schema2.node.internalNode === originalNode && !hasColon || ((_a = schema2.node.parent) == null ? void 0 : _a.internalNode) === originalNode && !hasColon) && !schema2.inverted) {
        this.collectDefaultSnippets(schema2.schema, separatorAfter, collector, {
          newLineFirst: false,
          indentFirstObject: false,
          shouldIndentWithTab: isInArray
        });
        const schemaProperties = schema2.schema.properties;
        if (schemaProperties) {
          const maxProperties = schema2.schema.maxProperties;
          if (maxProperties === void 0 || node.items === void 0 || node.items.length < maxProperties || node.items.length === maxProperties && !hasOnlyWhitespace) {
            for (const key in schemaProperties) {
              if (Object.prototype.hasOwnProperty.call(schemaProperties, key)) {
                const propertySchema = schemaProperties[key];
                if (typeof propertySchema === "object" && !propertySchema.deprecationMessage && !propertySchema["doNotSuggest"]) {
                  let identCompensation = "";
                  if (nodeParent && isSeq6(nodeParent) && node.items.length <= 1 && !hasOnlyWhitespace) {
                    const sourceText = textBuffer.getText();
                    const indexOfSlash = sourceText.lastIndexOf("-", node.range[0] - 1);
                    if (indexOfSlash >= 0) {
                      const overwriteChars = overwriteRange.end.character - overwriteRange.start.character;
                      identCompensation = " " + sourceText.slice(indexOfSlash + 1, node.range[1] - overwriteChars);
                    }
                  }
                  identCompensation += this.arrayPrefixIndentation;
                  let pair;
                  if (propertySchema.type === "array" && (pair = node.items.find((it) => isScalar5(it.key) && it.key.range && it.key.value === key && isScalar5(it.value) && !it.value.value && textBuffer.getPosition(it.key.range[2]).line === overwriteRange.end.line - 1)) && pair) {
                    if (Array.isArray(propertySchema.items)) {
                      this.addSchemaValueCompletions(propertySchema.items[0], separatorAfter, collector, {}, "property");
                    } else if (typeof propertySchema.items === "object" && propertySchema.items.type === "object") {
                      this.addArrayItemValueCompletion(propertySchema.items, separatorAfter, collector);
                    }
                  }
                  let insertText = key;
                  if (!key.startsWith(existingKey) || !hasColon) {
                    insertText = this.getInsertTextForProperty(key, propertySchema, separatorAfter, identCompensation + this.indentation);
                  }
                  const isNodeNull = isScalar5(originalNode) && originalNode.value === null || isMap7(originalNode) && originalNode.items.length === 0;
                  const existsParentCompletion = ((_b = schema2.schema.required) == null ? void 0 : _b.length) > 0;
                  if (!this.parentSkeletonSelectedFirst || !isNodeNull || !existsParentCompletion) {
                    collector.add({
                      kind: CompletionItemKind2.Property,
                      label: key,
                      insertText,
                      insertTextFormat: InsertTextFormat2.Snippet,
                      documentation: this.fromMarkup(propertySchema.markdownDescription) || propertySchema.description || ""
                    }, didOneOfSchemaMatches);
                  }
                  if ((_c = schema2.schema.required) == null ? void 0 : _c.includes(key)) {
                    collector.add({
                      label: key,
                      insertText: this.getInsertTextForProperty(key, propertySchema, separatorAfter, identCompensation + this.indentation),
                      insertTextFormat: InsertTextFormat2.Snippet,
                      documentation: this.fromMarkup(propertySchema.markdownDescription) || propertySchema.description || "",
                      parent: {
                        schema: schema2.schema,
                        indent: identCompensation
                      }
                    });
                  }
                }
              }
            }
          }
        }
        if (nodeParent && isSeq6(nodeParent) && isPrimitiveType(schema2.schema)) {
          this.addSchemaValueCompletions(schema2.schema, separatorAfter, collector, {}, "property", Array.isArray(nodeParent.items));
        }
        if (schema2.schema.propertyNames && schema2.schema.additionalProperties && schema2.schema.type === "object") {
          const propertyNameSchema = asSchema2(schema2.schema.propertyNames);
          if (!propertyNameSchema.deprecationMessage && !propertyNameSchema.doNotSuggest) {
            const label = propertyNameSchema.title || "property";
            collector.add({
              kind: CompletionItemKind2.Property,
              label,
              insertText: `\${1:${label}}: `,
              insertTextFormat: InsertTextFormat2.Snippet,
              documentation: this.fromMarkup(propertyNameSchema.markdownDescription) || propertyNameSchema.description || ""
            });
          }
        }
      }
      if (nodeParent && schema2.node.internalNode === nodeParent && schema2.schema.defaultSnippets) {
        if (node.items.length === 1) {
          this.collectDefaultSnippets(schema2.schema, separatorAfter, collector, {
            newLineFirst: false,
            indentFirstObject: false,
            shouldIndentWithTab: true
          }, 1);
        } else {
          this.collectDefaultSnippets(schema2.schema, separatorAfter, collector, {
            newLineFirst: false,
            indentFirstObject: true,
            shouldIndentWithTab: false
          }, 1);
        }
      }
    }
  }
  getValueCompletions(schema, doc, node, offset, document, collector, types, doComplete) {
    let parentKey = null;
    if (node && isScalar5(node)) {
      node = doc.getParent(node);
    }
    if (!node) {
      this.addSchemaValueCompletions(schema.schema, "", collector, types, "value");
      return;
    }
    if (isPair3(node)) {
      const valueNode = node.value;
      if (valueNode && valueNode.range && offset > valueNode.range[0] + valueNode.range[2]) {
        return;
      }
      parentKey = isScalar5(node.key) ? node.key.value + "" : null;
      node = doc.getParent(node);
    }
    if (node && (parentKey !== null || isSeq6(node))) {
      const separatorAfter = "";
      const matchingSchemas = doc.getMatchingSchemas(schema.schema, -1, null, doComplete);
      for (const s of matchingSchemas) {
        if (s.node.internalNode === node && !s.inverted && s.schema) {
          if (s.schema.items) {
            this.collectDefaultSnippets(s.schema, separatorAfter, collector, {
              newLineFirst: false,
              indentFirstObject: false,
              shouldIndentWithTab: false
            });
            if (isSeq6(node) && node.items) {
              if (Array.isArray(s.schema.items)) {
                const index = this.findItemAtOffset(node, document, offset);
                if (index < s.schema.items.length) {
                  this.addSchemaValueCompletions(s.schema.items[index], separatorAfter, collector, types, "value");
                }
              } else if (typeof s.schema.items === "object" && (s.schema.items.type === "object" || isAnyOfAllOfOneOfType(s.schema.items))) {
                this.addSchemaValueCompletions(s.schema.items, separatorAfter, collector, types, "value", true);
              } else {
                this.addSchemaValueCompletions(s.schema.items, separatorAfter, collector, types, "value");
              }
            }
          }
          if (s.schema.properties) {
            const propertySchema = s.schema.properties[parentKey];
            if (propertySchema) {
              this.addSchemaValueCompletions(propertySchema, separatorAfter, collector, types, "value");
            }
          }
          if (s.schema.additionalProperties) {
            this.addSchemaValueCompletions(s.schema.additionalProperties, separatorAfter, collector, types, "value");
          }
        }
      }
      if (types["boolean"]) {
        this.addBooleanValueCompletion(true, separatorAfter, collector);
        this.addBooleanValueCompletion(false, separatorAfter, collector);
      }
      if (types["null"]) {
        this.addNullValueCompletion(separatorAfter, collector);
      }
    }
  }
  addArrayItemValueCompletion(schema, separatorAfter, collector, index) {
    const schemaType = getSchemaTypeName(schema);
    const insertText = `- ${this.getInsertTextForObject(schema, separatorAfter).insertText.trimLeft()}`;
    const schemaTypeTitle = schemaType ? " type `" + schemaType + "`" : "";
    const schemaDescription = schema.description ? " (" + schema.description + ")" : "";
    const documentation = this.getDocumentationWithMarkdownText(`Create an item of an array${schemaTypeTitle}${schemaDescription}`, insertText);
    collector.add({
      kind: this.getSuggestionKind(schema.type),
      label: "- (array item) " + (schemaType || index),
      documentation,
      insertText,
      insertTextFormat: InsertTextFormat2.Snippet
    });
  }
  getInsertTextForProperty(key, propertySchema, separatorAfter, indent = this.indentation) {
    const propertyText = this.getInsertTextForValue(key, "", "string");
    const resultText = propertyText + ":";
    let value;
    let nValueProposals = 0;
    if (propertySchema) {
      let type = Array.isArray(propertySchema.type) ? propertySchema.type[0] : propertySchema.type;
      if (!type) {
        if (propertySchema.properties) {
          type = "object";
        } else if (propertySchema.items) {
          type = "array";
        } else if (propertySchema.anyOf) {
          type = "anyOf";
        }
      }
      if (Array.isArray(propertySchema.defaultSnippets)) {
        if (propertySchema.defaultSnippets.length === 1) {
          const body = propertySchema.defaultSnippets[0].body;
          if (isDefined2(body)) {
            value = this.getInsertTextForSnippetValue(body, "", {
              newLineFirst: true,
              indentFirstObject: false,
              shouldIndentWithTab: false
            }, [], 1);
            if (!value.startsWith(" ") && !value.startsWith("\n")) {
              value = " " + value;
            }
          }
        }
        nValueProposals += propertySchema.defaultSnippets.length;
      }
      if (propertySchema.enum) {
        if (!value && propertySchema.enum.length === 1) {
          value = " " + this.getInsertTextForGuessedValue(propertySchema.enum[0], "", type);
        }
        nValueProposals += propertySchema.enum.length;
      }
      if (propertySchema.const) {
        if (!value) {
          value = this.getInsertTextForGuessedValue(propertySchema.const, "", type);
          value = this.evaluateTab1Symbol(value);
          value = " " + value;
        }
        nValueProposals++;
      }
      if (isDefined2(propertySchema.default)) {
        if (!value) {
          value = " " + this.getInsertTextForGuessedValue(propertySchema.default, "", type);
        }
        nValueProposals++;
      }
      if (Array.isArray(propertySchema.examples) && propertySchema.examples.length) {
        if (!value) {
          value = " " + this.getInsertTextForGuessedValue(propertySchema.examples[0], "", type);
        }
        nValueProposals += propertySchema.examples.length;
      }
      if (propertySchema.properties) {
        return `${resultText}
${this.getInsertTextForObject(propertySchema, separatorAfter, indent).insertText}`;
      } else if (propertySchema.items) {
        return `${resultText}
${indent}- ${this.getInsertTextForArray(propertySchema.items, separatorAfter, 1, indent).insertText}`;
      }
      if (nValueProposals === 0) {
        switch (type) {
          case "boolean":
            value = " $1";
            break;
          case "string":
            value = " $1";
            break;
          case "object":
            value = `
${indent}`;
            break;
          case "array":
            value = `
${indent}- `;
            break;
          case "number":
          case "integer":
            value = " ${1:0}";
            break;
          case "null":
            value = " ${1:null}";
            break;
          case "anyOf":
            value = " $1";
            break;
          default:
            return propertyText;
        }
      }
    }
    if (!value || nValueProposals > 1) {
      value = " $1";
    }
    return resultText + value + separatorAfter;
  }
  getInsertTextForObject(schema, separatorAfter, indent = this.indentation, insertIndex = 1) {
    let insertText = "";
    if (!schema.properties) {
      insertText = `${indent}$${insertIndex++}
`;
      return { insertText, insertIndex };
    }
    Object.keys(schema.properties).forEach((key) => {
      const propertySchema = schema.properties[key];
      let type = Array.isArray(propertySchema.type) ? propertySchema.type[0] : propertySchema.type;
      if (!type) {
        if (propertySchema.anyOf) {
          type = "anyOf";
        }
        if (propertySchema.properties) {
          type = "object";
        }
        if (propertySchema.items) {
          type = "array";
        }
      }
      if (schema.required && schema.required.indexOf(key) > -1) {
        switch (type) {
          case "boolean":
          case "string":
          case "number":
          case "integer":
          case "anyOf": {
            let value = propertySchema.default || propertySchema.const;
            if (value) {
              if (type === "string") {
                value = this.convertToStringValue(value);
              }
              insertText += `${indent}${key}: \${${insertIndex++}:${value}}
`;
            } else {
              insertText += `${indent}${key}: $${insertIndex++}
`;
            }
            break;
          }
          case "array":
            {
              const arrayInsertResult = this.getInsertTextForArray(propertySchema.items, separatorAfter, insertIndex++, indent);
              const arrayInsertLines = arrayInsertResult.insertText.split("\n");
              let arrayTemplate = arrayInsertResult.insertText;
              if (arrayInsertLines.length > 1) {
                for (let index = 1; index < arrayInsertLines.length; index++) {
                  const element = arrayInsertLines[index];
                  arrayInsertLines[index] = `  ${element}`;
                }
                arrayTemplate = arrayInsertLines.join("\n");
              }
              insertIndex = arrayInsertResult.insertIndex;
              insertText += `${indent}${key}:
${indent}${this.indentation}- ${arrayTemplate}
`;
            }
            break;
          case "object":
            {
              const objectInsertResult = this.getInsertTextForObject(propertySchema, separatorAfter, `${indent}${this.indentation}`, insertIndex++);
              insertIndex = objectInsertResult.insertIndex;
              insertText += `${indent}${key}:
${objectInsertResult.insertText}
`;
            }
            break;
        }
      } else if (!this.disableDefaultProperties && propertySchema.default !== void 0) {
        switch (type) {
          case "boolean":
          case "number":
          case "integer":
            insertText += `${indent}${//added quote if key is null
            key === "null" ? this.getInsertTextForValue(key, "", "string") : key}: \${${insertIndex++}:${propertySchema.default}}
`;
            break;
          case "string":
            insertText += `${indent}${key}: \${${insertIndex++}:${this.convertToStringValue(propertySchema.default)}}
`;
            break;
          case "array":
          case "object":
            break;
        }
      }
    });
    if (insertText.trim().length === 0) {
      insertText = `${indent}$${insertIndex++}
`;
    }
    insertText = insertText.trimRight() + separatorAfter;
    return { insertText, insertIndex };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getInsertTextForArray(schema, separatorAfter, insertIndex = 1, indent = this.indentation) {
    let insertText = "";
    if (!schema) {
      insertText = `$${insertIndex++}`;
      return { insertText, insertIndex };
    }
    let type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
    if (!type) {
      if (schema.properties) {
        type = "object";
      }
      if (schema.items) {
        type = "array";
      }
    }
    switch (schema.type) {
      case "boolean":
        insertText = `\${${insertIndex++}:false}`;
        break;
      case "number":
      case "integer":
        insertText = `\${${insertIndex++}:0}`;
        break;
      case "string":
        insertText = `\${${insertIndex++}}`;
        break;
      case "object":
        {
          const objectInsertResult = this.getInsertTextForObject(schema, separatorAfter, `${indent}  `, insertIndex++);
          insertText = objectInsertResult.insertText.trimLeft();
          insertIndex = objectInsertResult.insertIndex;
        }
        break;
    }
    return { insertText, insertIndex };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getInsertTextForGuessedValue(value, separatorAfter, type) {
    switch (typeof value) {
      case "object":
        if (value === null) {
          return "${1:null}" + separatorAfter;
        }
        return this.getInsertTextForValue(value, separatorAfter, type);
      case "string": {
        let snippetValue = JSON.stringify(value);
        snippetValue = snippetValue.substr(1, snippetValue.length - 2);
        snippetValue = this.getInsertTextForPlainText(snippetValue);
        if (type === "string") {
          snippetValue = this.convertToStringValue(snippetValue);
        }
        return "${1:" + snippetValue + "}" + separatorAfter;
      }
      case "number":
      case "boolean":
        return "${1:" + value + "}" + separatorAfter;
    }
    return this.getInsertTextForValue(value, separatorAfter, type);
  }
  getInsertTextForPlainText(text) {
    return text.replace(/[\\$}]/g, "\\$&");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getInsertTextForValue(value, separatorAfter, type) {
    if (value === null) {
      return "null";
    }
    switch (typeof value) {
      case "object": {
        const indent = this.indentation;
        return this.getInsertTemplateForValue(value, indent, { index: 1 }, separatorAfter);
      }
      case "number":
      case "boolean":
        return this.getInsertTextForPlainText(value + separatorAfter);
    }
    type = Array.isArray(type) ? type[0] : type;
    if (type === "string") {
      value = this.convertToStringValue(value);
    }
    return this.getInsertTextForPlainText(value + separatorAfter);
  }
  getInsertTemplateForValue(value, indent, navOrder, separatorAfter) {
    if (Array.isArray(value)) {
      let insertText = "\n";
      for (const arrValue of value) {
        insertText += `${indent}- \${${navOrder.index++}:${arrValue}}
`;
      }
      return insertText;
    } else if (typeof value === "object") {
      let insertText = "\n";
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const element = value[key];
          insertText += `${indent}\${${navOrder.index++}:${key}}:`;
          let valueTemplate;
          if (typeof element === "object") {
            valueTemplate = `${this.getInsertTemplateForValue(element, indent + this.indentation, navOrder, separatorAfter)}`;
          } else {
            valueTemplate = ` \${${navOrder.index++}:${this.getInsertTextForPlainText(element + separatorAfter)}}
`;
          }
          insertText += `${valueTemplate}`;
        }
      }
      return insertText;
    }
    return this.getInsertTextForPlainText(value + separatorAfter);
  }
  addSchemaValueCompletions(schema, separatorAfter, collector, types, completionType, isArray) {
    if (typeof schema === "object") {
      this.addEnumValueCompletions(schema, separatorAfter, collector, isArray);
      this.addDefaultValueCompletions(schema, separatorAfter, collector);
      this.collectTypes(schema, types);
      if (isArray && completionType === "value" && !isAnyOfAllOfOneOfType(schema)) {
        this.addArrayItemValueCompletion(schema, separatorAfter, collector);
      }
      if (Array.isArray(schema.allOf)) {
        schema.allOf.forEach((s) => {
          return this.addSchemaValueCompletions(s, separatorAfter, collector, types, completionType, isArray);
        });
      }
      if (Array.isArray(schema.anyOf)) {
        schema.anyOf.forEach((s) => {
          return this.addSchemaValueCompletions(s, separatorAfter, collector, types, completionType, isArray);
        });
      }
      if (Array.isArray(schema.oneOf)) {
        schema.oneOf.forEach((s) => {
          return this.addSchemaValueCompletions(s, separatorAfter, collector, types, completionType, isArray);
        });
      }
    }
  }
  collectTypes(schema, types) {
    if (Array.isArray(schema.enum) || isDefined2(schema.const)) {
      return;
    }
    const type = schema.type;
    if (Array.isArray(type)) {
      type.forEach(function(t) {
        return types[t] = true;
      });
    } else if (type) {
      types[type] = true;
    }
  }
  addDefaultValueCompletions(schema, separatorAfter, collector, arrayDepth = 0) {
    let hasProposals = false;
    if (isDefined2(schema.default)) {
      let type = schema.type;
      let value = schema.default;
      for (let i = arrayDepth; i > 0; i--) {
        value = [value];
        type = "array";
      }
      let label;
      if (typeof value == "object") {
        label = "Default value";
      } else {
        label = value.toString().replace(doubleQuotesEscapeRegExp, '"');
      }
      collector.add({
        kind: this.getSuggestionKind(type),
        label,
        insertText: this.getInsertTextForValue(value, separatorAfter, type),
        insertTextFormat: InsertTextFormat2.Snippet,
        detail: localize7("json.suggest.default", "Default value")
      });
      hasProposals = true;
    }
    if (Array.isArray(schema.examples)) {
      schema.examples.forEach((example) => {
        let type = schema.type;
        let value = example;
        for (let i = arrayDepth; i > 0; i--) {
          value = [value];
          type = "array";
        }
        collector.add({
          kind: this.getSuggestionKind(type),
          label: this.getLabelForValue(value),
          insertText: this.getInsertTextForValue(value, separatorAfter, type),
          insertTextFormat: InsertTextFormat2.Snippet
        });
        hasProposals = true;
      });
    }
    this.collectDefaultSnippets(schema, separatorAfter, collector, {
      newLineFirst: true,
      indentFirstObject: true,
      shouldIndentWithTab: true
    });
    if (!hasProposals && typeof schema.items === "object" && !Array.isArray(schema.items)) {
      this.addDefaultValueCompletions(schema.items, separatorAfter, collector, arrayDepth + 1);
    }
  }
  addEnumValueCompletions(schema, separatorAfter, collector, isArray) {
    if (isDefined2(schema.const) && !isArray) {
      collector.add({
        kind: this.getSuggestionKind(schema.type),
        label: this.getLabelForValue(schema.const),
        insertText: this.getInsertTextForValue(schema.const, separatorAfter, schema.type),
        insertTextFormat: InsertTextFormat2.Snippet,
        documentation: this.fromMarkup(schema.markdownDescription) || schema.description
      });
    }
    if (Array.isArray(schema.enum)) {
      for (let i = 0, length = schema.enum.length; i < length; i++) {
        const enm = schema.enum[i];
        let documentation = this.fromMarkup(schema.markdownDescription) || schema.description;
        if (schema.markdownEnumDescriptions && i < schema.markdownEnumDescriptions.length && this.doesSupportMarkdown()) {
          documentation = this.fromMarkup(schema.markdownEnumDescriptions[i]);
        } else if (schema.enumDescriptions && i < schema.enumDescriptions.length) {
          documentation = schema.enumDescriptions[i];
        }
        collector.add({
          kind: this.getSuggestionKind(schema.type),
          label: this.getLabelForValue(enm),
          insertText: this.getInsertTextForValue(enm, separatorAfter, schema.type),
          insertTextFormat: InsertTextFormat2.Snippet,
          documentation
        });
      }
    }
  }
  getLabelForValue(value) {
    if (value === null) {
      return "null";
    }
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return "" + value;
  }
  collectDefaultSnippets(schema, separatorAfter, collector, settings, arrayDepth = 0) {
    if (Array.isArray(schema.defaultSnippets)) {
      for (const s of schema.defaultSnippets) {
        let type = schema.type;
        let value = s.body;
        let label = s.label;
        let insertText;
        let filterText;
        if (isDefined2(value)) {
          const type2 = s.type || schema.type;
          if (arrayDepth === 0 && type2 === "array") {
            const fixedObj = {};
            Object.keys(value).forEach((val, index) => {
              if (index === 0 && !val.startsWith("-")) {
                fixedObj[`- ${val}`] = value[val];
              } else {
                fixedObj[`  ${val}`] = value[val];
              }
            });
            value = fixedObj;
          }
          const existingProps = Object.keys(collector.proposed).filter((proposedProp) => collector.proposed[proposedProp].label === existingProposeItem);
          insertText = this.getInsertTextForSnippetValue(value, separatorAfter, settings, existingProps);
          if (insertText === "" && value) {
            continue;
          }
          label = label || this.getLabelForSnippetValue(value);
        } else if (typeof s.bodyText === "string") {
          let prefix = "", suffix = "", indent = "";
          for (let i = arrayDepth; i > 0; i--) {
            prefix = prefix + indent + "[\n";
            suffix = suffix + "\n" + indent + "]";
            indent += this.indentation;
            type = "array";
          }
          insertText = prefix + indent + s.bodyText.split("\n").join("\n" + indent) + suffix + separatorAfter;
          label = label || insertText;
          filterText = insertText.replace(/[\n]/g, "");
        }
        collector.add({
          kind: s.suggestionKind || this.getSuggestionKind(type),
          label,
          sortText: s.sortText || s.label,
          documentation: this.fromMarkup(s.markdownDescription) || s.description,
          insertText,
          insertTextFormat: InsertTextFormat2.Snippet,
          filterText
        });
      }
    }
  }
  getInsertTextForSnippetValue(value, separatorAfter, settings, existingProps, depth) {
    const replacer = (value2) => {
      if (typeof value2 === "string") {
        if (value2[0] === "^") {
          return value2.substr(1);
        }
        if (value2 === "true" || value2 === "false") {
          return `"${value2}"`;
        }
      }
      return value2;
    };
    return stringifyObject(value, "", replacer, { ...settings, indentation: this.indentation, existingProps }, depth) + separatorAfter;
  }
  addBooleanValueCompletion(value, separatorAfter, collector) {
    collector.add({
      kind: this.getSuggestionKind("boolean"),
      label: value ? "true" : "false",
      insertText: this.getInsertTextForValue(value, separatorAfter, "boolean"),
      insertTextFormat: InsertTextFormat2.Snippet,
      documentation: ""
    });
  }
  addNullValueCompletion(separatorAfter, collector) {
    collector.add({
      kind: this.getSuggestionKind("null"),
      label: "null",
      insertText: "null" + separatorAfter,
      insertTextFormat: InsertTextFormat2.Snippet,
      documentation: ""
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLabelForSnippetValue(value) {
    const label = JSON.stringify(value);
    return label.replace(/\$\{\d+:([^}]+)\}|\$\d+/g, "$1");
  }
  getCustomTagValueCompletions(collector) {
    const validCustomTags = filterInvalidCustomTags(this.customTags);
    validCustomTags.forEach((validTag) => {
      const label = validTag.split(" ")[0];
      this.addCustomTagValueCompletion(collector, " ", label);
    });
  }
  addCustomTagValueCompletion(collector, separatorAfter, label) {
    collector.add({
      kind: this.getSuggestionKind("string"),
      label,
      insertText: label + separatorAfter,
      insertTextFormat: InsertTextFormat2.Snippet,
      documentation: ""
    });
  }
  getDocumentationWithMarkdownText(documentation, insertText) {
    let res = documentation;
    if (this.doesSupportMarkdown()) {
      insertText = insertText.replace(/\${[0-9]+[:|](.*)}/g, (s, arg) => {
        return arg;
      }).replace(/\$([0-9]+)/g, "");
      res = this.fromMarkup(`${documentation}
 \`\`\`
${insertText}
\`\`\``);
    }
    return res;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSuggestionKind(type) {
    if (Array.isArray(type)) {
      const array = type;
      type = array.length > 0 ? array[0] : null;
    }
    if (!type) {
      return CompletionItemKind2.Value;
    }
    switch (type) {
      case "string":
        return CompletionItemKind2.Value;
      case "object":
        return CompletionItemKind2.Module;
      case "property":
        return CompletionItemKind2.Property;
      default:
        return CompletionItemKind2.Value;
    }
  }
  getCurrentWord(doc, offset) {
    let i = offset - 1;
    const text = doc.getText();
    while (i >= 0 && ' 	\n\r\v":{[,]}'.indexOf(text.charAt(i)) === -1) {
      i--;
    }
    return text.substring(i + 1, offset);
  }
  fromMarkup(markupString) {
    if (markupString && this.doesSupportMarkdown()) {
      return {
        kind: MarkupKind3.Markdown,
        value: markupString
      };
    }
    return void 0;
  }
  doesSupportMarkdown() {
    if (this.supportsMarkdown === void 0) {
      const completion = this.clientCapabilities.textDocument && this.clientCapabilities.textDocument.completion;
      this.supportsMarkdown = completion && completion.completionItem && Array.isArray(completion.completionItem.documentationFormat) && completion.completionItem.documentationFormat.indexOf(MarkupKind3.Markdown) !== -1;
    }
    return this.supportsMarkdown;
  }
  findItemAtOffset(seqNode, doc, offset) {
    for (let i = seqNode.items.length - 1; i >= 0; i--) {
      const node = seqNode.items[i];
      if (isNode4(node)) {
        if (node.range) {
          if (offset > node.range[1]) {
            return i;
          } else if (offset >= node.range[0]) {
            return i;
          }
        }
      }
    }
    return 0;
  }
  convertToStringValue(param) {
    let value;
    if (typeof param === "string") {
      value = ["on", "off", "true", "false", "yes", "no"].includes(param.toLowerCase()) ? `${this.getQuote()}${param}${this.getQuote()}` : param;
    } else {
      value = "" + param;
    }
    if (value.length === 0) {
      return value;
    }
    if (value === "true" || value === "false" || value === "null" || this.isNumberExp.test(value)) {
      return `"${value}"`;
    }
    if (value.indexOf('"') !== -1) {
      value = value.replace(doubleQuotesEscapeRegExp, '"');
    }
    let doQuote = !isNaN(parseInt(value)) || value.charAt(0) === "@";
    if (!doQuote) {
      let idx = value.indexOf(":", 0);
      for (; idx > 0 && idx < value.length; idx = value.indexOf(":", idx + 1)) {
        if (idx === value.length - 1) {
          doQuote = true;
          break;
        }
        const nextChar = value.charAt(idx + 1);
        if (nextChar === "	" || nextChar === " ") {
          doQuote = true;
          break;
        }
      }
    }
    if (doQuote) {
      value = `"${value}"`;
    }
    return value;
  }
  getQuote() {
    return this.isSingleQuote ? `'` : `"`;
  }
  /**
   * simplify `{$1:value}` to `value`
   */
  evaluateTab1Symbol(value) {
    return value.replace(/\$\{1:(.*)\}/, "$1");
  }
  isParentCompletionItem(item) {
    return "parent" in item;
  }
};

// fillers/schemaSelectionHandlers.ts
function JSONSchemaSelection() {
}

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlDefinition.js
import { LocationLink, Range as Range14 } from "vscode-languageserver-types";
import { isAlias as isAlias3 } from "yaml";
var YamlDefinition = class {
  constructor(telemetry2) {
    this.telemetry = telemetry2;
  }
  getDefinition(document, params) {
    var _a;
    try {
      const yamlDocument = yamlDocumentsCache.getYamlDocument(document);
      const offset = document.offsetAt(params.position);
      const currentDoc = matchOffsetToDocument(offset, yamlDocument);
      if (currentDoc) {
        const [node] = currentDoc.getNodeFromPosition(offset, new TextBuffer(document));
        if (node && isAlias3(node)) {
          const defNode = node.resolve(currentDoc.internalDocument);
          if (defNode && defNode.range) {
            const targetRange = Range14.create(document.positionAt(defNode.range[0]), document.positionAt(defNode.range[2]));
            const selectionRange = Range14.create(document.positionAt(defNode.range[0]), document.positionAt(defNode.range[1]));
            return [LocationLink.create(document.uri, targetRange, selectionRange)];
          }
        }
      }
    } catch (err) {
      (_a = this.telemetry) == null ? void 0 : _a.sendError("yaml.definition.error", err);
    }
    return void 0;
  }
};

// node_modules/yaml-language-server/lib/esm/languageservice/services/yamlSelectionRanges.js
import { SelectionRange as SelectionRange2 } from "vscode-languageserver-types";
function getSelectionRanges(document, positions) {
  const doc = yamlDocumentsCache.getYamlDocument(document);
  return positions.map((position) => {
    const ranges = getRanges(position);
    let current;
    for (const range of ranges) {
      current = SelectionRange2.create(range, current);
    }
    return current != null ? current : SelectionRange2.create({ start: position, end: position });
  });
  function getRanges(position) {
    const offset = document.offsetAt(position);
    const result = [];
    for (const ymlDoc of doc.documents) {
      let currentNode;
      let overrideStartOffset;
      ymlDoc.visit((node) => {
        const endOffset = node.offset + node.length;
        if (endOffset < offset) {
          return true;
        }
        if (getTextFromOffsets(endOffset - 1, endOffset) === "\n") {
          if (endOffset - 1 < offset) {
            return true;
          }
        }
        let startOffset = node.offset;
        if (startOffset > offset) {
          const newOffset = getStartOffsetForSpecialCases(node, position);
          if (!newOffset || newOffset > offset) {
            return true;
          }
          startOffset = newOffset;
        }
        if (!currentNode || startOffset >= currentNode.offset) {
          currentNode = node;
          overrideStartOffset = startOffset;
        }
        return true;
      });
      while (currentNode) {
        const startOffset = overrideStartOffset != null ? overrideStartOffset : currentNode.offset;
        const endOffset = currentNode.offset + currentNode.length;
        const range = {
          start: document.positionAt(startOffset),
          end: document.positionAt(endOffset)
        };
        const text = document.getText(range);
        const trimmedText = trimEndNewLine(text);
        const trimmedEndOffset = startOffset + trimmedText.length;
        if (trimmedEndOffset >= offset) {
          range.end = document.positionAt(trimmedEndOffset);
        }
        const isSurroundedBy = (startCharacter, endCharacter) => {
          return trimmedText.startsWith(startCharacter) && trimmedText.endsWith(endCharacter || startCharacter);
        };
        if (currentNode.type === "string" && (isSurroundedBy("'") || isSurroundedBy('"')) || currentNode.type === "object" && isSurroundedBy("{", "}") || currentNode.type === "array" && isSurroundedBy("[", "]")) {
          result.push({
            start: document.positionAt(startOffset + 1),
            end: document.positionAt(endOffset - 1)
          });
        }
        result.push(range);
        currentNode = currentNode.parent;
        overrideStartOffset = void 0;
      }
      if (result.length > 0) {
        break;
      }
    }
    return result.reverse();
  }
  function getStartOffsetForSpecialCases(node, position) {
    var _a;
    const nodeStartPosition = document.positionAt(node.offset);
    if (nodeStartPosition.line !== position.line) {
      return;
    }
    if (((_a = node.parent) == null ? void 0 : _a.type) === "array") {
      if (getTextFromOffsets(node.offset - 2, node.offset) === "- ") {
        return node.offset - 2;
      }
    }
    if (node.type === "array" || node.type === "object") {
      const lineBeginning = { line: nodeStartPosition.line, character: 0 };
      const text = document.getText({ start: lineBeginning, end: nodeStartPosition });
      if (text.trim().length === 0) {
        return document.offsetAt(lineBeginning);
      }
    }
  }
  function getTextFromOffsets(startOffset, endOffset) {
    return document.getText({
      start: document.positionAt(startOffset),
      end: document.positionAt(endOffset)
    });
  }
}
function trimEndNewLine(str) {
  if (str.endsWith("\r\n")) {
    return str.substring(0, str.length - 2);
  }
  if (str.endsWith("\n")) {
    return str.substring(0, str.length - 1);
  }
  return str;
}

// node_modules/yaml-language-server/lib/esm/languageservice/yamlLanguageService.js
var SchemaPriority;
(function(SchemaPriority2) {
  SchemaPriority2[SchemaPriority2["SchemaStore"] = 1] = "SchemaStore";
  SchemaPriority2[SchemaPriority2["SchemaAssociation"] = 2] = "SchemaAssociation";
  SchemaPriority2[SchemaPriority2["Settings"] = 3] = "Settings";
})(SchemaPriority || (SchemaPriority = {}));
function getLanguageService(params) {
  const schemaService = new YAMLSchemaService(params.schemaRequestService, params.workspaceContext);
  const completer = new YamlCompletion(schemaService, params.clientCapabilities, yamlDocumentsCache, params.telemetry);
  const hover = new YAMLHover(schemaService, params.telemetry);
  const yamlDocumentSymbols = new YAMLDocumentSymbols(schemaService, params.telemetry);
  const yamlValidation = new YAMLValidation(schemaService, params.telemetry);
  const formatter = new YAMLFormatter();
  const yamlCodeActions = new YamlCodeActions(params.clientCapabilities);
  const yamlCodeLens = new YamlCodeLens(schemaService, params.telemetry);
  const yamlLinks = new YamlLinks(params.telemetry);
  const yamlDefinition = new YamlDefinition(params.telemetry);
  new JSONSchemaSelection(schemaService, params.yamlSettings, params.connection);
  return {
    configure: (settings) => {
      schemaService.clearExternalSchemas();
      if (settings.schemas) {
        schemaService.schemaPriorityMapping = /* @__PURE__ */ new Map();
        settings.schemas.forEach((settings2) => {
          const currPriority = settings2.priority ? settings2.priority : 0;
          schemaService.addSchemaPriority(settings2.uri, currPriority);
          schemaService.registerExternalSchema(settings2.uri, settings2.fileMatch, settings2.schema, settings2.name, settings2.description, settings2.versions);
        });
      }
      yamlValidation.configure(settings);
      hover.configure(settings);
      completer.configure(settings, params.yamlSettings);
      formatter.configure(settings);
      yamlCodeActions.configure(settings);
    },
    registerCustomSchemaProvider: (schemaProvider) => {
      schemaService.registerCustomSchemaProvider(schemaProvider);
    },
    findLinks: yamlLinks.findLinks.bind(yamlLinks),
    doComplete: completer.doComplete.bind(completer),
    doValidation: yamlValidation.doValidation.bind(yamlValidation),
    doHover: hover.doHover.bind(hover),
    findDocumentSymbols: yamlDocumentSymbols.findDocumentSymbols.bind(yamlDocumentSymbols),
    findDocumentSymbols2: yamlDocumentSymbols.findHierarchicalDocumentSymbols.bind(yamlDocumentSymbols),
    doDefinition: yamlDefinition.getDefinition.bind(yamlDefinition),
    resetSchema: (uri) => {
      return schemaService.onResourceChange(uri);
    },
    doFormat: formatter.format.bind(formatter),
    doDocumentOnTypeFormatting,
    addSchema: (schemaID, schema) => {
      return schemaService.saveSchema(schemaID, schema);
    },
    deleteSchema: (schemaID) => {
      return schemaService.deleteSchema(schemaID);
    },
    modifySchemaContent: (schemaAdditions) => {
      return schemaService.addContent(schemaAdditions);
    },
    deleteSchemaContent: (schemaDeletions) => {
      return schemaService.deleteContent(schemaDeletions);
    },
    deleteSchemasWhole: (schemaDeletions) => {
      return schemaService.deleteSchemas(schemaDeletions);
    },
    getFoldingRanges,
    getSelectionRanges,
    getCodeAction: (document, params2) => {
      return yamlCodeActions.getCodeAction(document, params2);
    },
    getCodeLens: (document) => {
      return yamlCodeLens.getCodeLens(document);
    },
    resolveCodeLens: (param) => yamlCodeLens.resolveCodeLens(param)
  };
}

// src/yaml.worker.ts
async function schemaRequestService(uri) {
  const response = await fetch(uri);
  if (response.ok) {
    return response.text();
  }
  throw new Error(`Schema request failed for ${uri}`);
}
var telemetry = {
  send() {
  },
  sendError(name, error) {
    console.error("monaco-yaml", name, error);
  },
  sendTrack() {
  }
};
var workspaceContext = {
  resolveRelativePath(relativePath, resource) {
    return String(new URL(relativePath, resource));
  }
};
initialize((ctx, { enableSchemaRequest, ...languageSettings }) => {
  const ls = getLanguageService({
    // @ts-expect-error Type definitions are wrong. This may be null.
    schemaRequestService: enableSchemaRequest ? schemaRequestService : null,
    telemetry,
    workspaceContext,
    // Copied from https://github.com/microsoft/vscode-json-languageservice/blob/493010da9dc2cd1cc139d403d4709d97064b17e9/src/jsonLanguageTypes.ts#L325-L335
    // Usage: https://github.com/microsoft/monaco-editor/blob/f6dc0eb8fce67e57f6036f4769d92c1666cdf546/src/language/json/jsonWorker.ts#L38
    clientCapabilities: {
      textDocument: {
        completion: {
          completionItem: {
            commitCharactersSupport: true,
            documentationFormat: ["markdown", "plaintext"]
          }
        },
        moniker: {}
      }
    }
  });
  const withDocument = (fn) => (uri, ...args) => {
    const models = ctx.getMirrorModels();
    for (const model of models) {
      if (String(model.uri) === uri) {
        return fn(TextDocument.create(uri, "yaml", model.version, model.getValue()), ...args);
      }
    }
  };
  ls.configure(languageSettings);
  return {
    doValidation: withDocument(
      (document) => ls.doValidation(document, Boolean(languageSettings.isKubernetes))
    ),
    doComplete: withDocument(
      (document, position) => ls.doComplete(document, position, Boolean(languageSettings.isKubernetes))
    ),
    doDefinition: withDocument(
      (document, position) => ls.doDefinition(document, { position, textDocument: document })
    ),
    doDocumentOnTypeFormatting: withDocument(
      (document, position, ch, options) => ls.doDocumentOnTypeFormatting(document, { ch, options, position, textDocument: document })
    ),
    doHover: withDocument(ls.doHover),
    format: withDocument(ls.doFormat),
    resetSchema: ls.resetSchema,
    findDocumentSymbols: withDocument(ls.findDocumentSymbols2),
    findLinks: withDocument(ls.findLinks),
    getCodeAction: withDocument(
      (document, range, context) => ls.getCodeAction(document, { range, textDocument: document, context })
    ),
    getFoldingRanges: withDocument(
      (document) => ls.getFoldingRanges(document, { lineFoldingOnly: true })
    ),
    getSelectionRanges: withDocument(ls.getSelectionRanges)
  };
});
//# sourceMappingURL=yaml.worker.js.map
