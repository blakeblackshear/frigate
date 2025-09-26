# is-npm

> Check if your code is running as an [npm](https://docs.npmjs.com/misc/scripts), [yarn](https://yarnpkg.com/cli/run), [pnpm](https://pnpm.io), or [bun](https://bun.sh) script

## Install

```sh
npm install is-npm
```

## Usage

```js
import {isPackageManager, isNpm, isYarn, isPnpm, isBun} from 'is-npm';

console.table({isPackageManager, isNpm, isYarn, isPnpm, isBun});
```

```sh
$ node foo.js
# ┌──────────────────┬────────┐
# │     (index)      │ Values │
# ├──────────────────┼────────┤
# │ isPackageManager │ false  │
# │      isNpm       │ false  │
# │     isYarn       │ false  │
# │     isPnpm       │ false  │
# │      isBun       │ false  │
# └──────────────────┴────────┘
$ npm run foo
# ┌──────────────────┬────────┐
# │     (index)      │ Values │
# ├──────────────────┼────────┤
# │ isPackageManager │ true   │
# │      isNpm       │ true   │
# │     isYarn       │ false  │
# │     isPnpm       │ false  │
# │      isBun       │ false  │
# └──────────────────┴────────┘
$ yarn run foo
# ┌──────────────────┬────────┐
# │     (index)      │ Values │
# ├──────────────────┼────────┤
# │ isPackageManager │ true   │
# │      isNpm       │ false  │
# │     isYarn       │ true   │
# │     isPnpm       │ false  │
# │      isBun       │ false  │
# └──────────────────┴────────┘
$ pnpm run foo
# ┌──────────────────┬────────┐
# │     (index)      │ Values │
# ├──────────────────┼────────┤
# │ isPackageManager │ true   │
# │      isNpm       │ false  │
# │     isYarn       │ false  │
# │     isPnpm       │ true   │
# │      isBun       │ false  │
# └──────────────────┴────────┘
$ bun run foo
# ┌──────────────────┬────────┐
# │     (index)      │ Values │
# ├──────────────────┼────────┤
# │ isPackageManager │ true   │
# │      isNpm       │ false  │
# │     isYarn       │ false  │
# │     isPnpm       │ false  │
# │      isBun       │ true   │
# └──────────────────┴────────┘
```

## API

### isNpm

Check if your code is running as an [npm](https://docs.npmjs.com/misc/scripts) script.

### isYarn

Check if your code is running as a [yarn](https://yarnpkg.com/cli/run) script.

### isPnpm

Check if your code is running as a [pnpm](https://pnpm.io) script.

### isBun

Check if your code is running as a [bun](https://bun.sh) script.

### isPackageManager

Check if your code is running as a package manager script (npm, yarn, pnpm, or bun).

### isNpmOrYarn *(deprecated)*

Check if your code is running as an [npm](https://docs.npmjs.com/misc/scripts) or [yarn](https://yarnpkg.com/cli/run) script.

**Use `isPackageManager` instead** for detecting any package manager.

## Related

- [is-npm-cli](https://github.com/sindresorhus/is-npm-cli) - CLI for this module
