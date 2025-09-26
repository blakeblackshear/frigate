// src/emojify.ts
import is from "@sindresorhus/is";

// src/findByName.ts
import { assert } from "@sindresorhus/is";

// src/data.ts
import emojilib from "emojilib";

// src/utils.ts
import charRegex from "char-regex";
var charRegexMatcher = charRegex();
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
var emojiData = Object.entries(emojilib.lib).map(
  ([name, { char: emoji }]) => [name, emoji]
);
var emojiCodesByName = new Map(emojiData);
var emojiNamesByCode = new Map(
  emojiData.map(([name, emoji]) => [normalizeCode(emoji), name])
);

// src/findByName.ts
var findByName = (name) => {
  assert.string(name);
  const nameNormalized = normalizeName(name);
  const emoji = emojiCodesByName.get(nameNormalized);
  return emoji ? { emoji, key: nameNormalized } : void 0;
};

// src/emojify.ts
var emojify = (input, { fallback, format = (name) => name } = {}) => {
  const fallbackFunction = fallback === void 0 ? fallback : asFunction(fallback);
  is.assert.string(input);
  is.assert.any([is.default.undefined, is.default.function_], fallbackFunction);
  is.assert.function_(format);
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
import { assert as assert2 } from "@sindresorhus/is";
var findByCode = (code) => {
  assert2.string(code);
  const emojiNormalized = normalizeCode(code);
  const key = emojiNamesByCode.get(emojiNormalized);
  return key ? { emoji: emojiNormalized, key } : void 0;
};

// src/find.ts
var find = (codeOrName) => {
  return findByCode(codeOrName) ?? findByName(codeOrName);
};

// src/get.ts
import { assert as assert3 } from "@sindresorhus/is";
var get = (codeOrName) => {
  assert3.string(codeOrName);
  return emojiCodesByName.get(normalizeName(codeOrName));
};

// src/has.ts
import { assert as assert4 } from "@sindresorhus/is";
var has = (codeOrName) => {
  assert4.string(codeOrName);
  return emojiCodesByName.has(normalizeName(codeOrName)) || emojiNamesByCode.has(normalizeCode(codeOrName));
};

// src/random.ts
var random = () => {
  const [name, emoji] = randomItem(emojiData);
  return { emoji, name };
};

// src/replace.ts
import { assert as assert5 } from "@sindresorhus/is";
var replace = (input, replacement, { preserveSpaces = false } = {}) => {
  const replace2 = asFunction(replacement);
  assert5.string(input);
  assert5.function_(replace2);
  assert5.boolean(preserveSpaces);
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
import is2, { assert as assert6 } from "@sindresorhus/is";
var search = (keyword) => {
  assert6.any([is2.default.string, is2.default.regExp], keyword);
  if (is2.default.string(keyword)) {
    keyword = normalizeName(keyword);
  }
  if (is2.default.regExp(keyword)) {
    const normalizedPattern = normalizeName(keyword.source);
    keyword = new RegExp(normalizedPattern);
  }
  return emojiData.filter(([name]) => name.match(keyword)).map(([name, emoji]) => ({ emoji, name }));
};

// src/strip.ts
var strip = (input, { preserveSpaces } = {}) => replace(input, "", { preserveSpaces });

// src/unemojify.ts
import { assert as assert8 } from "@sindresorhus/is";

// src/which.ts
import { assert as assert7 } from "@sindresorhus/is";
import skinTone from "skin-tone";
var which = (emoji, { markdown = false } = {}) => {
  assert7.string(emoji);
  assert7.boolean(markdown);
  const result = findByCode(skinTone(emoji, "none"));
  if (result === void 0) {
    return void 0;
  }
  return markdown ? `:${result.key}:` : result.key;
};

// src/unemojify.ts
var unemojify = (input) => {
  assert8.string(input);
  const characters = input.match(charRegexMatcher);
  if (characters === null) {
    return input;
  }
  return characters.map((character) => which(character, { markdown: true }) ?? character).join("");
};
export {
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
};
//# sourceMappingURL=index.js.map