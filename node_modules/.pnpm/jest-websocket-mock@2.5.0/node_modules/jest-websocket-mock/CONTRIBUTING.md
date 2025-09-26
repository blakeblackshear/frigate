# Contributing to jest-websocket-mock

## Set up the workspace

Fork the project, clone your fork, configure the remotes and install the dependencies:

First, you'll need to [Fork the project, clone your fork and configure the remote](https://guides.github.com/activities/forking/).

```bash
# Install the dependencies
npm install
# Navigate to the examples folder to set up the environment for working on the examples
cd examples
npm install
cd ..
```

## Working with the code

### Prettier

This codebase is formatted using [prettier](https://prettier.io/).

- To check that the code is correctly formatted, run `npm run prettier:check`.
- To automatically reformat the code with prettier, run `npm run prettier:apply`.

### TypeScript

This codebase is written in [TypeScript](https://www.typescriptlang.org/).

- To type-check the source tree, run `npm run type:check`.

### Tests

To ensure consistency and quality, we enforce 100% test coverage, both for the `jest-websocket-mock` source code and for the [examples](https://github.com/romgain/jest-websocket-mock/blob/master/examples/src).

- To run the tests ,run `npm test -- --coverage`.
- To run the examples tests, run `SKIP_PREFLIGHT_CHECK=true npm test -- --coverage` in the `examples` folder. The `SKIP_PREFLIGHT_CHECK=true` environment variable is needed because Create React App detects a different jest version in the root folder (even if it doesn't use it).

### Testing the example app against a local build of the library

To ensure that a new library build stays backwards compatible,
it is useful to run the tests for the example app using a local library build.
To do so:

```bash
# build the library
npm run build
# generate a local library package
npm pack
# navigate to the examples folder
cd examples
# install the local library package
npm install ../jest-websocket-mock-*
# run the examples test suite
SKIP_PREFLIGHT_CHECK=true npm test -- --coverage
cd ..
```
