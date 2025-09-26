"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  emojify: () => emojify,
  find: () => find,
  get: () => get,
  has: () => has,
  random: () => random,
  replace: () => replace,
  search: () => search,
  strip: () => strip,
  unemojify: () => unemojify,
  which: () => which
});
module.exports = __toCommonJS(src_exports);

// src/emojify.ts
var import_is2 = __toESM(require("@sindresorhus/is"), 1);

// src/findByName.ts
var import_is = require("@sindresorhus/is");

// src/data.ts
var import_emojilib = __toESM(require("emojilib"), 1);

// src/utils.ts
var import_char_regex = __toESM(require("char-regex"), 1);
var charRegexMatcher = (0, import_char_regex.default)();
function asFunction(input) {
  return typeof input === "function" ? input : () => input;
}
var NON_SPACING_MARK = String.fromCharCode(65039);
var nonSpacingRegex = new RegExp(NON_SPACING_MARK, "g");
function normalizeCode(code) {
  return code.replace(nonSpacingRegex, "");
}
function normalizeName(name) {
  return /:.+:/.test(name) ? name.slice(1, -1) : name;
}
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// src/data.ts
var emojiData = Object.entries(import_emojilib.default.lib).map(
  ([name, { char: emoji }]) => [name, emoji]
);
var emojiCodesByName = new Map(emojiData);
var emojiNamesByCode = new Map(
  emojiData.map(([name, emoji]) => [normalizeCode(emoji), name])
);

// src/findByName.ts
var findByName = (name) => {
  import_is.assert.string(name);
  const nameNormalized = normalizeName(name);
  const emoji = emojiCodesByName.get(nameNormalized);
  return emoji ? { emoji, key: nameNormalized } : void 0;
};

// src/emojify.ts
var emojify = (input, { fallback, format = (name) => name } = {}) => {
  const fallbackFunction = fallback === void 0 ? fallback : asFunction(fallback);
  import_is2.default.assert.string(input);
  import_is2.default.assert.any([import_is2.default.default.undefined, import_is2.default.default.function_], fallbackFunction);
  import_is2.default.assert.function_(format);
  return input.replace(/:[\w\-+]+:/g, (part) => {
    const found = findByName(part);
    if (found) {
      return format(found.emoji, part, input);
    }
    if (fallbackFunction) {
      return format(fallbackFunction(normalizeName(part)));
    }
    return format(part);
  });
};

// src/findByCode.ts
var import_is3 = require("@sindresorhus/is");
var findByCode = (code) => {
  import_is3.assert.string(code);
  const emojiNormalized = normalizeCode(code);
  const key = emojiNamesByCode.get(emojiNormalized);
  return key ? { emoji: emojiNormalized, key } : void 0;
};

// src/find.ts
var find = (codeOrName) => {
  return findByCode(codeOrName) ?? findByName(codeOrName);
};

// src/get.ts
var import_is4 = require("@sindresorhus/is");
var get = (codeOrName) => {
  import_is4.assert.string(codeOrName);
  return emojiCodesByName.get(normalizeName(codeOrName));
};

// src/has.ts
var import_is5 = require("@sindresorhus/is");
var has = (codeOrName) => {
  import_is5.assert.string(codeOrName);
  return emojiCodesByName.has(normalizeName(codeOrName)) || emojiNamesByCode.has(normalizeCode(codeOrName));
};

// src/random.ts
var random = () => {
  const [name, emoji] = randomItem(emojiData);
  return { emoji, name };
};

// src/replace.ts
var import_is6 = require("@sindresorhus/is");
var replace = (input, replacement, { preserveSpaces = false } = {}) => {
  const replace2 = asFunction(replacement);
  import_is6.assert.string(input);
  import_is6.assert.function_(replace2);
  import_is6.assert.boolean(preserveSpaces);
  const characters = input.match(charRegexMatcher);
  if (characters === null) {
    return input;
  }
  return characters.map((character, index) => {
    const found = findByCode(character);
    if (!found) {
      return character;
    }
    if (!preserveSpaces && characters[index + 1] === " ") {
      characters[index + 1] = "";
    }
    return replace2(found, index, input);
  }).join("");
};

// src/search.ts
var import_is7 = __toESM(require("@sindresorhus/is"), 1);
var search = (keyword) => {
  import_is7.assert.any([import_is7.default.default.string, import_is7.default.default.regExp], keyword);
  if (import_is7.default.default.string(keyword)) {
    keyword = normalizeName(keyword);
  }
  if (import_is7.default.default.regExp(keyword)) {
    const normalizedPattern = normalizeName(keyword.source);
    keyword = new RegExp(normalizedPattern);
  }
  return emojiData.filter(([name]) => name.match(keyword)).map(([name, emoji]) => ({ emoji, name }));
};

// src/strip.ts
var strip = (input, { preserveSpaces } = {}) => replace(input, "", { preserveSpaces });

// src/unemojify.ts
var import_is9 = require("@sindresorhus/is");

// src/which.ts
var import_is8 = require("@sindresorhus/is");
var import_skin_tone = __toESM(require("skin-tone"), 1);
var which = (emoji, { markdown = false } = {}) => {
  import_is8.assert.string(emoji);
  import_is8.assert.boolean(markdown);
  const result = findByCode((0, import_skin_tone.default)(emoji, "none"));
  if (result === void 0) {
    return void 0;
  }
  return markdown ? `:${result.key}:` : result.key;
};

// src/unemojify.ts
var unemojify = (input) => {
  import_is9.assert.string(input);
  const characters = input.match(charRegexMatcher);
  if (characters === null) {
    return input;
  }
  return characters.map((character) => which(character, { markdown: true }) ?? character).join("");
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  emojify,
  find,
  get,
  has,
  random,
  replace,
  search,
  strip,
  unemojify,
  which
});
//# sourceMappingURL=index.cjs.map