# synckit

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/un-ts/synckit/ci.yml?branch=main)](https://github.com/un-ts/synckit/actions/workflows/ci.yml?query=branch%3Amain)
[![Codecov](https://img.shields.io/codecov/c/github/un-ts/synckit.svg)](https://codecov.io/gh/un-ts/synckit)
[![type-coverage](https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Fun-ts%2Fsynckit%2Fmain%2Fpackage.json)](https://github.com/plantain-00/type-coverage)
[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/un-ts/synckit)](https://coderabbit.ai)
[![npm](https://img.shields.io/npm/v/synckit.svg)](https://www.npmjs.com/package/synckit)
[![GitHub Release](https://img.shields.io/github/release/un-ts/synckit)](https://github.com/un-ts/synckit/releases)

[![Conventional Commits](https://img.shields.io/badge/conventional%20commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![changesets](https://img.shields.io/badge/maintained%20with-changesets-176de3.svg)](https://github.com/changesets/changesets)

Perform async work synchronously in Node.js/Bun using `worker_threads` with first-class TypeScript and Yarn P'n'P support.

## TOC <!-- omit in toc -->

- [Usage](#usage)
  - [Install](#install)
  - [API](#api)
  - [Types](#types)
  - [Options](#options)
  - [Envs](#envs)
  - [TypeScript](#typescript)
    - [`node` (Default, Node 22.6+)](#node-default-node-226)
    - [`bun` (Default, Bun)](#bun-default-bun)
    - [`ts-node` (Default)](#ts-node-default)
    - [`esbuild-register`](#esbuild-register)
    - [`esbuild-runner`](#esbuild-runner)
    - [`oxc`](#oxc)
    - [`swc`](#swc)
    - [`tsx`](#tsx)
- [Benchmark](#benchmark)
- [Sponsors](#sponsors)
- [Backers](#backers)
- [Who are using `synckit`](#who-are-using-synckit)
- [Acknowledgements](#acknowledgements)
- [Changelog](#changelog)
- [License](#license)

## Usage

### Install

```sh
# yarn
yarn add synckit

# npm
npm i synckit
```

### API

```js
// runner.js
import { createSyncFn } from 'synckit'

// the worker path must be absolute
const syncFn = createSyncFn(require.resolve('./worker'), {
  tsRunner: 'tsx', // optional, can be `'node' | 'ts-node' | 'esbuild-register' | 'esbuild-runner' | 'tsx'`
})

// do whatever you want, you will get the result synchronously!
const result = syncFn(...args)
```

```js
// worker.js
import { runAsWorker } from 'synckit'

runAsWorker(async (...args) => {
  // do expensive work
  return result
})
```

You must make sure, the `result` is serializable by [`Structured Clone Algorithm`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)

### Types

````ts
export interface GlobalShim {
  moduleName: string
  /** `undefined` means side effect only */
  globalName?: string
  /**
   * 1. `undefined` or empty string means `default`, for example:
   *
   * ```js
   * import globalName from 'module-name'
   * ```
   *
   * 2. `null` means namespaced, for example:
   *
   * ```js
   * import * as globalName from 'module-name'
   * ```
   */
  named?: string | null
  /**
   * If not `false`, the shim will only be applied when the original
   * `globalName` unavailable, for example you may only want polyfill
   * `globalThis.fetch` when it's unavailable natively:
   *
   * ```js
   * import fetch from 'node-fetch'
   *
   * if (!globalThis.fetch) {
   *   globalThis.fetch = fetch
   * }
   * ```
   */
  conditional?: boolean
}
````

### Options

1. `execArgv` same as env `SYNCKIT_EXEC_ARGV`
2. `globalShims`: Similar like env `SYNCKIT_GLOBAL_SHIMS` but much more flexible which can be a `GlobalShim` `Array`, see `GlobalShim`'s [definition](#types) for more details
3. `timeout` same as env `SYNCKIT_TIMEOUT`
4. `transferList`: Please refer Node.js [`worker_threads`](https://nodejs.org/api/worker_threads.html#:~:text=Default%3A%20true.-,transferList,-%3CObject%5B%5D%3E%20If) documentation
5. `tsRunner` same as env `SYNCKIT_TS_RUNNER`

### Envs

1. `SYNCKIT_EXEC_ARGV`: List of node CLI options passed to the worker, split with comma `,`. (default as `[]`), see also [`node` docs](https://nodejs.org/api/worker_threads.html)
2. `SYNCKIT_GLOBAL_SHIMS`: Whether to enable the default `DEFAULT_GLOBAL_SHIMS_PRESET` as `globalShims`
3. `SYNCKIT_TIMEOUT`: `timeout` for performing the async job (no default)
4. `SYNCKIT_TS_RUNNER`: Which TypeScript runner to be used, it could be very useful for development, could be `'node' | 'ts-node' | 'esbuild-register' | 'esbuild-runner' | 'oxc' | 'swc' | 'tsx'`, `node` or `ts-node` will be used by default accordingly, make sure you have installed them already

### TypeScript

#### `node` (Default, Node 22.6+)

On recent `Node` versions, you may select this runner to execute your worker file (a `.ts` file) in the native runtime.

As of `Node` v23.6, this feature is supported out of the box. For `Node` `>=22.6 <23.6`, this feature is supported via `--experimental-strip-types` flag. Visit the [documentation](https://nodejs.org/docs/latest/api/typescript.html#type-stripping) to learn more.

When `synckit` detects the process to be running with supported `Node` versions (>=22.6), it will execute the worker file with the `node` runner by default, you can disable this behavior by setting `--no-experimental-strip-types` flag via `NODE_OPTIONS` env or cli arg.

#### `bun` (Default, Bun)

[`Bun`](https://bun.sh/docs/typescript) supports `TypeScript` natively.

When `synckit` detects the process to be running with `Bun`, it will execute the worker file with the `bun` runner by default.

In this case, `synckit` doesn't do anything to the worker itself, it just passes through the worker directly.

#### `ts-node` (Default)

Prior to Node v22.6, you may want to use `ts-node` to execute your worker file (a `.ts` file).

If you want to use a custom tsconfig as project instead of default `tsconfig.json`, use `TS_NODE_PROJECT` env. Please view [ts-node](https://github.com/TypeStrong/ts-node#tsconfig) for more details.

If you want to integrate with [tsconfig-paths](https://www.npmjs.com/package/tsconfig-paths), please view [ts-node](https://github.com/TypeStrong/ts-node#paths-and-baseurl) for more details.

#### `esbuild-register`

Please view [`esbuild-register`][] for its document

#### `esbuild-runner`

Please view [`esbuild-runner`][] for its document

#### `oxc`

Please view [`@oxc-node/core`][] for its document

#### `swc`

Please view [`@swc-node/register`][] for its document

#### `tsx`

Please view [`tsx`][] for its document

## Benchmark

The following are the benchmark results of `synckit` against other libraries with Node.js v20.19.0 on my personal MacBook Pro with 64G M1 Max:

```sh
# cjs
┌───────────┬────────────┬──────────────┬───────────────────┬─────────────┬────────────────┬───────────────────┬────────────────────────┬───────────┬─────────────────┐
│ (index)   │ synckit    │ sync-threads │ perf sync-threads │ deasync     │ perf deasync   │ make-synchronized │ perf make-synchronized │ native    │ perf native     │
├───────────┼────────────┼──────────────┼───────────────────┼─────────────┼────────────────┼───────────────────┼────────────────────────┼───────────┼─────────────────┤
│ loadTime  │ '17.26ms'  │ '1.49ms'     │ '11.57x slower'   │ '146.55ms'  │ '8.49x faster' │ '1025.77ms'       │ '59.42x faster'        │ '0.29ms'  │ '59.71x slower' │
│ runTime   │ '143.12ms' │ '3689.15ms'  │ '25.78x faster'   │ '1221.11ms' │ '8.53x faster' │ '2842.50ms'       │ '19.86x faster'        │ '12.64ms' │ '11.33x slower' │
│ totalTime │ '160.38ms' │ '3690.64ms'  │ '23.01x faster'   │ '1367.66ms' │ '8.53x faster' │ '3868.27ms'       │ '24.12x faster'        │ '12.93ms' │ '12.41x slower' │
└───────────┴────────────┴──────────────┴───────────────────┴─────────────┴────────────────┴───────────────────┴────────────────────────┴───────────┴─────────────────┘
```

```sh
# esm
┌───────────┬────────────┬──────────────┬───────────────────┬─────────────┬────────────────┬───────────────────┬────────────────────────┬───────────┬─────────────────┐
│ (index)   │ synckit    │ sync-threads │ perf sync-threads │ deasync     │ perf deasync   │ make-synchronized │ perf make-synchronized │ native    │ perf native     │
├───────────┼────────────┼──────────────┼───────────────────┼─────────────┼────────────────┼───────────────────┼────────────────────────┼───────────┼─────────────────┤
│ loadTime  │ '23.88ms'  │ '2.03ms'     │ '11.75x slower'   │ '70.95ms'   │ '2.97x faster' │ '400.24ms'        │ '16.76x faster'        │ '0.44ms'  │ '54.70x slower' │
│ runTime   │ '139.56ms' │ '3570.12ms'  │ '25.58x faster'   │ '1150.99ms' │ '8.25x faster' │ '3484.04ms'       │ '24.96x faster'        │ '12.98ms' │ '10.75x slower' │
│ totalTime │ '163.44ms' │ '3572.15ms'  │ '21.86x faster'   │ '1221.93ms' │ '7.48x faster' │ '3884.28ms'       │ '23.77x faster'        │ '13.42ms' │ '12.18x slower' │
└───────────┴────────────┴──────────────┴───────────────────┴─────────────┴────────────────┴───────────────────┴────────────────────────┴───────────┴─────────────────┘
```

See [benchmark.cjs](./benchmarks/benchmark.cjs.txt) and [benchmark.esm](./benchmarks/benchmark.esm.txt) for more details.

You can try it with running `yarn benchmark` by yourself. [Here](./benchmarks/benchmark.js) is the benchmark source code.

## Sponsors and Backers

[![Sponsors and Backers](https://raw.githubusercontent.com/1stG/static/master/sponsors.svg)](https://github.com/sponsors/JounQin)

### Sponsors

| 1stG                                                                                                                   | RxTS                                                                                                                   | UnTS                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [![1stG Open Collective sponsors](https://opencollective.com/1stG/organizations.svg)](https://opencollective.com/1stG) | [![RxTS Open Collective sponsors](https://opencollective.com/rxts/organizations.svg)](https://opencollective.com/rxts) | [![UnTS Open Collective sponsors](https://opencollective.com/unts/organizations.svg)](https://opencollective.com/unts) |

### Backers

| 1stG                                                                                                                | RxTS                                                                                                                | UnTS                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [![1stG Open Collective backers](https://opencollective.com/1stG/individuals.svg)](https://opencollective.com/1stG) | [![RxTS Open Collective backers](https://opencollective.com/rxts/individuals.svg)](https://opencollective.com/rxts) | [![UnTS Open Collective backers](https://opencollective.com/unts/individuals.svg)](https://opencollective.com/unts) |

## Who are using `synckit`

- [`@cspell/eslint-plugin`](https://github.com/streetsidesoftware/cspell/blob/ec04bcee0c90ff4e2a9fb5ef4421714796fb58ba/packages/cspell-eslint-plugin/package.json#L80)
- [`astrojs-compiler-sync`](https://github.com/ota-meshi/astrojs-compiler-sync/blob/da4e86fd601755e40599d7f5121bc83d08255c42/package.json#L52)
- [`eslint-plugin-prettier`](https://github.com/prettier/eslint-plugin-prettier/blob/ca5eb3ec11c4ae511e1da22736c73b253210b73b/package.json#L67)
- [`eslint-plugin-prettier-vue`](https://github.com/meteorlxy/eslint-plugin-prettier-vue/blob/d3f6722303d66a2b223df2f750982e33c1143d5d/package.json#L40)
- [`eslint-mdx`](https://github.com/mdx-js/eslint-mdx/blob/4623359cc9784d3e38bd917ed001c5d7d826f990/packages/eslint-mdx/package.json#L40)
- [`prettier-plugin-packagejson`](https://github.com/matzkoh/prettier-plugin-packagejson/blob/eb7ade2a048d6d163cf8ef37e098ee273f72c585/package.json#L31)
- [`jest-snapshot`](https://github.com/jestjs/jest/blob/4e7d916ec6a16de5548273c17b5d2c5761b0aebb/packages/jest-snapshot/package.json#L42)

## Acknowledgements

This package is original inspired by [`esbuild`](https://github.com/evanw/esbuild) and [`sync-threads`](https://github.com/lambci/sync-threads).

## Changelog

Detailed changes for each release are documented in [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT][] © [JounQin][]@[1stG.me][]

[`esbuild-register`]: https://github.com/egoist/esbuild-register
[`esbuild-runner`]: https://github.com/folke/esbuild-runner
[`@oxc-node/core`]: https://github.com/oxc-project/oxc-node
[`@swc-node/register`]: https://github.com/swc-project/swc-node/tree/master/packages/register
[`tsx`]: https://github.com/esbuild-kit/tsx
[1stG.me]: https://www.1stG.me
[JounQin]: https://github.com/JounQin
[MIT]: http://opensource.org/licenses/MIT
