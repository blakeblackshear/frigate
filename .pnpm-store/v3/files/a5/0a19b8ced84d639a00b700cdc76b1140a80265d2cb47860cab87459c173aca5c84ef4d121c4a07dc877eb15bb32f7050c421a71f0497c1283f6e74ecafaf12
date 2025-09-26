# has-yarn

> Check if a project is using [Yarn](https://yarnpkg.com)

Useful for tools that needs to know whether to use `yarn` or `npm` to install dependencies.

It checks if a `yarn.lock` file is present in the working directory.

## Install

```
$ npm install has-yarn
```

## Usage

```
.
├── foo
│   └── package.json
└── bar
    ├── package.json
    └── yarn.lock
```

```js
import hasYarn from 'has-yarn';

hasYarn('foo');
//=> false

hasYarn('bar');
//=> true
```

## API

### hasYarn(cwd?)

Returns a `boolean` of whether the project uses Yarn.

#### cwd

Type: `string`\
Default: `process.cwd()`

The current working directory.

## Related

- [has-yarn-cli](https://github.com/sindresorhus/has-yarn-cli) - CLI for this module
