# Monaco marker data provider

[![ci workflow](https://github.com/remcohaszing/monaco-marker-data-provider/actions/workflows/ci.yaml/badge.svg)](https://github.com/remcohaszing/monaco-marker-data-provider/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/monaco-marker-data-provider)](https://www.npmjs.com/package/monaco-marker-data-provider)
[![npm downloads](https://img.shields.io/npm/dm/monaco-marker-data-provider)](https://www.npmjs.com/package/monaco-marker-data-provider)

Provider marker data for Monaco models.

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  - [`registerMarkerDataProvider(monaco, languageId, provider)`](#registermarkerdataprovidermonaco-languageid-provider)
- [Types](#types)
  - [`MarkerDataProvider`](#markerdataprovider)
  - [`MarkerDataProviderInstance`](#markerdataproviderinstance)
- [License](#license)

## Introduction

Monaco editor supports marker data to highlight parts of a document using squiggly lines. This is
analogous to diagnostics in the language server protocol. Monaco editor itself only supports this
through the `editor.setModelMarkers` function. This allows users to set marker data even if a file
isn’t open. This is useful for situations where a change in one file may lead to a marker data
change in another. However, in many cases models don’t depend on each other to determine marker
data. This is where `monaco-marker-data-provider` comes in. It exposes an API to set model markers
using a provider, in a similar fashion as other Monaco providers.

## Installation

This project has a peer dependency on `monaco-editor`. It’s recommended to add it explicitly.

```sh
npm install monaco-editor monaco-marker-data-provider
```

## Usage

```typescript
import * as monaco from 'monaco-editor'
import { registerMarkerDataProvider } from 'monaco-marker-data-provider'

import { myCustomValidator } from './myCustomValidator'

registerMarkerDataProvider(monaco, 'plaintext', {
  owner: 'my-custom-markers',

  provideMarkerData(model) {
    return myCustomValidator(model.getValue())
  }
})
```

## API

### `registerMarkerDataProvider(monaco, languageId, provider)`

This function returns a disposable.

#### Options

- `monaco`: The `monaco-editor` module instance.
- `languageId` (`string`): The language id to register the provider for.
- `provider` (`MarkerDataProvider`): The object which provides Monaco marker data.

#### Returns

A [`MarkerDataProviderInstance`](#markerdataproviderinstance) instance

## Types

### `MarkerDataProvider`

An object with the following properties:

- `owner`: A unique string to determine the owner of the marker data. This may be used to retrieve
  the marker data using `editor.getModelMarkers(owner)`.
- `provideMarkerData`: A function which provides marker data for the given model. It must return
  `null`, `undefined`, a list of marker data, or a promise that returns those values.
- `doReset`: An optional function to perform a reset after a model has been removed.

### `MarkerDataProviderInstance`

A disposable with the following properties:

- `revalidate`: A function to revalidate all models.

## License

[MIT](LICENSE.md) © [Remco Haszing](https://github.com/remcohaszing)
