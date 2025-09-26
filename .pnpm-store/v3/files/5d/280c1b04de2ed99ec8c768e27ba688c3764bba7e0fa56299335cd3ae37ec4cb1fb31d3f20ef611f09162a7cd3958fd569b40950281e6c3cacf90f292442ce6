# glob-to-regex.js

Transform GLOB patterns to JavaScript regular expressions for fast file path matching.

This tiny library converts familiar shell-style glob patterns like `**/*.ts` or `src/{a,b}/**/*.js` into JavaScript `RegExp` objects and provides a convenient matcher utility.

## Install

```bash
yarn add glob-to-regex.js
# or
npm i glob-to-regex.js
```

## Quick start

```ts
import {toRegex, toMatcher} from 'glob-to-regex.js';

// Build a RegExp from a glob
const re = toRegex('src/**/test.ts');
re.test('src/a/b/test.ts'); // true
re.test('src/test.ts');     // true
re.test('src/test.tsx');    // false

// Build a predicate function from a pattern or an array of patterns
const match = toMatcher(['**/*.ts', '!**/*.d.ts']); // negative patterns are not special; use a RegExp if needed
match('index.ts');    // true
match('types.d.ts');  // true (negation is not parsed specially)
```

## API

- toRegex(pattern: string): RegExp
	- Converts a glob pattern to an anchored regular expression (`^...$`).

- toMatcher(pattern: string | RegExp | Array<string | RegExp>): (path: string) => boolean
	- Accepts a glob string, a RegExp, or an array of them. If given an array, it returns true if any item matches (logical OR, short-circuited).
	- Strings starting with `/` and ending with `/flags?` are treated as regular expressions (e.g. `"/\\.test\\.ts$/"`).

## Supported glob features

- `/` separates path segments
- `*` matches zero or more characters within a single segment (does not cross `/`)
- `?` matches exactly one character within a single segment
- `**` matches across path segments, including none
- `{a,b,c}` alternation groups (no nesting). Each item inside can itself contain glob syntax
- Character classes: `[abc]`, `[a-z]`, `[!a-z]`, `[!abc]`

Notes:
- The produced RegExp is anchored at start and end (`^...$`).
- Character classes are copied through to the output regex. Use standard JavaScript class syntax.
- Brace groups are not nestable. If an unmatched `{` is found, it is treated literally.

## Examples

```ts
toRegex('a/b/c.txt').test('a/b/c.txt'); // true
toRegex('a/*.txt').test('a/file.txt');  // true
toRegex('a/*.txt').test('a/x/y.txt');   // false
toRegex('file?.js').test('file1.js');   // true
toRegex('src/**/test.ts').test('src/a/b/test.ts'); // true
toRegex('assets/**').test('assets/a/b.png');       // true
toRegex('*.{html,txt}').test('page.html');         // true
toRegex('src/{a,b}/**/*.ts').test('src/b/x/y.ts'); // true
toRegex('file[0-9].txt').test('file5.txt');        // true
toRegex('file[!0-9].txt').test('filea.txt');       // true
toRegex('**/*.[jt]s{,x}').test('dir/a/b.jsx');     // true
```

## TypeScript

Types are bundled. The library targets modern Node.js and browsers.

## Performance

`toRegex` performs a single pass over the pattern and creates a native RegExp. Matching is then performed by V8's highly optimized engine.

## Limitations

- Brace groups are not nested.
- Negated globs like `!**/*.d.ts` are not parsed specially. If you need exclusion, combine multiple matchers or filter results separately.

## License

Apache-2.0 © streamich

