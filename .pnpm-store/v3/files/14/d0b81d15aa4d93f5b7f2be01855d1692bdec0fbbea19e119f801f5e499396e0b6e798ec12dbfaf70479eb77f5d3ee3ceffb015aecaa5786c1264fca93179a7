# json-crawl
<img alt="npm" src="https://img.shields.io/npm/v/json-crawl"> <img alt="npm" src="https://img.shields.io/npm/dm/json-crawl?label=npm"> <img alt="npm type definitions" src="https://img.shields.io/npm/types/json-crawl"> <img alt="GitHub" src="https://img.shields.io/github/license/udamir/json-crawl">

This package provides utility functions for crawling/cloning json objects like a tree

## Purpose

The purpose of this package is to simplify the traversal and manipulation of complex JSON objects in a tree-like structure. It provides functions that allow you to iterate over each node of a JSON object, perform custom operations, and clone objects deeply while maintaining independence between the original and cloned objects.
You can use `crawl`/`syncCrawl` to traverse a JSON object and perform custom operations, such as logging, data transformation, or validation, at each node. The hooks allow you to customize the behavior according to your specific requirements.

## Features

- **Crawling**: The `crawl`/`syncCrawl` function allows you to traverse a JSON object, performing custom operations at each node using hooks.
- **Cloning**: The `clone`/`syncClone` function creates a deep copy of a JSON object, ensuring that nested objects and arrays are also cloned.
- **Customizable Hooks**: Both `crawl` and `clone` functions accept hooks, allowing you to provide custom logic for each node during crawling or cloning. Hooks can modify values, state, rules or perform any desired operations.
- **Support for Async Hooks**: The `crawl` and `clone` functions supports asynchronous hooks, allowing you to perform asynchronous operations during crawling.

## Installation
```SH
npm install json-crawl --save
```

## Usage

### Nodejs

Crawls through a JSON object, performing custom operations at each node using the provided hooks.
```ts
import { syncClone, syncCrawl } from 'json-crawl'

const data = {
  // Your JSON object
};

const hooks = [
  ({ value, path, key, state, rules }) => {
    // Custom logic for each node

    // Modify value, state, or perform any desired operations
    return { 
      value: newValue,               // updated value of current node for next crawl steps
      state: newState,               // updated state for next crawl step
      rules: newRules                // updated rules for next crawl step
      exitHook,                      // on exit hook for current node
      terminate: true,               // crawl should be terminated
      done: true                     // crawl of current node should be terminated
    }
    // return void - if no operations are required
  },
  // Array of hooks for custom operations during cloning
];

const params = {
  state?: {
    // Initial state object for hooks (optional)
  },

  rules?: {
    // Crawl rules map (optional)
  }
};

// deep Clone
const cloned = syncClone(data, hooks, params)

// crawl
syncCrawl(data, hooks, params)

```

## Contributing
When contributing, keep in mind that it is an objective of `json-crawl` to have no package dependencies. This may change in the future, but for now, no-dependencies.

Please run the unit tests before submitting your PR: `npm test`. Hopefully your PR includes additional unit tests to illustrate your change/modification!

## License

MIT
