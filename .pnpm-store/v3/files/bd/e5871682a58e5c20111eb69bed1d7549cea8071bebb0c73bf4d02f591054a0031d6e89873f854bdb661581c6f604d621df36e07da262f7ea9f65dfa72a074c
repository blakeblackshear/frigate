# Monaco YAML

[![ci workflow](https://github.com/remcohaszing/monaco-yaml/actions/workflows/ci.yaml/badge.svg)](https://github.com/remcohaszing/monaco-yaml/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/monaco-yaml)](https://www.npmjs.com/package/monaco-yaml)
[![npm downloads](https://img.shields.io/npm/dm/monaco-yaml)](https://www.npmjs.com/package/monaco-yaml)
[![demo](https://img.shields.io/badge/demo-monaco--yaml.js.org-61ffcf.svg)](https://monaco-yaml.js.org)
[![netlify status](https://api.netlify.com/api/v1/badges/20b08937-99d0-4882-b9a3-d5f09ddd29b7/deploy-status)](https://app.netlify.com/sites/monaco-yaml/deploys)

YAML language plugin for the Monaco Editor. It provides the following features when editing YAML
files:

- Code completion, based on JSON schemas or by looking at similar objects in the same file
- Hovers, based on JSON schemas
- Validation: Syntax errors and schema validation
- Formatting using Prettier
- Document Symbols
- Automatically load remote schema files (by enabling DiagnosticsOptions.enableSchemaRequest)
- Links from JSON references.
- Links and hover effects from YAML anchors.
- Code folding.

Schemas can also be provided by configuration. See
[here](https://github.com/remcohaszing/monaco-yaml/blob/main/index.d.ts) for the API that the plugin
offers to configure the YAML language support.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Examples](#examples)
- [API](#api)
  - [`configureMonacoYaml(monaco, options?)`](#configuremonacoyamlmonaco-options)
- [FAQ](#faq)
  - [Does this work with the Monaco UMD bundle?](#does-this-work-with-the-monaco-umd-bundle)
  - [Does this work with Monaco Editor from a CDN?](#does-this-work-with-monaco-editor-from-a-cdn)
  - [Does this work with `@monaco-editor/loader` or `@monaco-editor/react`?](#does-this-work-with-monaco-editorloader-or-monaco-editorreact)
  - [Is the web worker necessary?](#is-the-web-worker-necessary)
  - [Does it work without a bundler?](#does-it-work-without-a-bundler)
  - [How do I integrate `monaco-yaml` with a framework? (Angular, React, Vue, etc.)](#how-do-i-integrate-monaco-yaml-with-a-framework-angular-react-vue-etc)
  - [Does `monaco-yaml` work with `create-react-app`?](#does-monaco-yaml-work-with-create-react-app)
  - [Why doesn’t it work with Vite?](#why-doesnt-it-work-with-vite)
  - [Why isn’t `monaco-yaml` working? Official Monaco language extensions do work.](#why-isnt-monaco-yaml-working-official-monaco-language-extensions-do-work)
  - [Using Monaco webpack loader plugin](#using-monaco-webpack-loader-plugin)
  - [Why is syntax highlighting not working?](#why-is-syntax-highlighting-not-working)
  - [Why does it try to download my schema even when I provided one as an object?](#why-does-it-try-to-download-my-schema-even-when-i-provided-one-as-an-object)
- [Contributing](#contributing)
- [Credits](#credits)
- [License](#license)

## Installation

```sh
npm install monaco-yaml
```

## Usage

Before implementing `monaco-yaml`, or even Monaco editor, it’s recommended to learn the
[basic concepts](https://github.com/microsoft/monaco-editor#concepts) of Monaco editor.

To configure `monaco-yaml`, call [`configureMonacoYaml`](#configuremonacoyamlmonaco-options).

```typescript
import * as monaco from 'monaco-editor'
import { configureMonacoYaml } from 'monaco-yaml'

configureMonacoYaml(monaco, {
  enableSchemaRequest: true,
  schemas: [
    {
      // If YAML file is opened matching this glob
      fileMatch: ['**/.prettierrc.*'],
      // Then this schema will be downloaded from the internet and used.
      uri: 'https://json.schemastore.org/prettierrc.json'
    },
    {
      // If YAML file is opened matching this glob
      fileMatch: ['**/person.yaml'],
      // The following schema will be applied
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The person’s display name'
          },
          age: {
            type: 'integer',
            description: 'How old is the person in years?'
          },
          occupation: {
            enum: ['Delivery person', 'Software engineer', 'Astronaut']
          }
        }
      },
      // And the URI will be linked to as the source.
      uri: 'https://github.com/remcohaszing/monaco-yaml#usage'
    }
  ]
})

const prettierc = monaco.editor.createModel(
  'singleQuote: true\nproseWrap: always\nsemi: yes\n',
  undefined,
  monaco.Uri.parse('file:///.prettierrc.yaml')
)

monaco.editor.createModel(
  'name: John Doe\nage: 42\noccupation: Pirate\n',
  undefined,
  monaco.Uri.parse('file:///person.yaml')
)

monaco.editor.create(document.getElementById('editor'), {
  automaticLayout: true,
  model: prettierc
})
```

Also make sure to register the web worker. When using Webpack 5, this looks like the code below.
Other bundlers may use a different syntax, but the idea is the same. Languages you don’t used can be
omitted.

```js
window.MonacoEnvironment = {
  getWorker(moduleId, label) {
    switch (label) {
      case 'editorWorkerService':
        return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url))
      case 'css':
      case 'less':
      case 'scss':
        return new Worker(new URL('monaco-editor/esm/vs/language/css/css.worker', import.meta.url))
      case 'handlebars':
      case 'html':
      case 'razor':
        return new Worker(
          new URL('monaco-editor/esm/vs/language/html/html.worker', import.meta.url)
        )
      case 'json':
        return new Worker(
          new URL('monaco-editor/esm/vs/language/json/json.worker', import.meta.url)
        )
      case 'javascript':
      case 'typescript':
        return new Worker(
          new URL('monaco-editor/esm/vs/language/typescript/ts.worker', import.meta.url)
        )
      case 'yaml':
        return new Worker(new URL('monaco-yaml/yaml.worker', import.meta.url))
      default:
        throw new Error(`Unknown label ${label}`)
    }
  }
}
```

## Examples

A demo is available on [monaco-yaml.js.org](https://monaco-yaml.js.org).

Some usage examples can be found in the
[examples](https://github.com/remcohaszing/monaco-yaml/tree/main/examples) directory.

## API

`monaco-yaml` has the following exports:

### `configureMonacoYaml(monaco, options?)`

Configure `monaco-yaml`.

> **Note**: There may only be one configured instance of `monaco-yaml` at a time.

#### Arguments

- `monaco` (`object`): The Monaco editor module. Typically you get this by importing
  `monaco-editor`. Third party integrations often expose it as the global `monaco` variable instead.
- `options` (`object`): Options to configure `monaco-yaml`.

#### Options

- `completion` (`boolean`): If set, enable schema based autocompletion. (Default: `true`)
- `customTags` (`string[]`): A list of custom tags. (Default: `[]`)
- `enableSchemaRequest` (`boolean`): If set, the schema service will load schema content on-demand.
  (Default: `false`)
- `format` (`boolean`): Prettier from the bundle. (Default: `true`)
- `hover` (`boolean`): If set, enable hover typs based the JSON schema. (Default: `true`)
- `isKubernetes` (`boolean`): If true, a different diffing algorithm is used to generate error
  messages. (Default: `false`)
- `schemas` (`object[]`): A list of known schemas and/or associations of schemas to file names.
  (Default: `[]`)
- `validate` (`boolean`): based validation. (Default: `true`)
- `yamlVersion` (`'1.1' | '1.2'`): The YAML version to use for parsing. (Default: `1,2`)

#### Returns

An object that can be used to dispose or update `monaco-yaml`.

## FAQ

### Does this work with the Monaco UMD bundle?

Yes, starting from version 5.0.0

### Does this work with Monaco Editor from a CDN?

Yes, starting from version 5.0.0

### Does this work with `@monaco-editor/loader` or `@monaco-editor/react`?

Yes, starting from version 5.0.0

### Is the web worker necessary?

Yes. The web worker provides the core functionality of `monaco-yaml`.

### Does it work without a bundler?

No. `monaco-yaml` uses dependencies from `node_modules`, so they can be deduped and your bundle size
is decreased. This comes at the cost of not being able to use it without a bundler.

### How do I integrate `monaco-yaml` with a framework? (Angular, React, Vue, etc.)

`monaco-yaml` only uses the Monaco Editor. It’s not tied to a framework, all that’s needed is a DOM
node to attach the Monaco Editor to. See the
[Monaco Editor examples](https://github.com/microsoft/monaco-editor/tree/main/samples) for examples
on how to integrate Monaco Editor in your project, then configure `monaco-yaml` as described above.

### Does `monaco-yaml` work with `create-react-app`?

Yes, but you’ll have to eject. See
[#92 (comment)](https://github.com/remcohaszing/monaco-yaml/issues/92#issuecomment-905836058) for
details.

### Why doesn’t it work with Vite?

Some users have experienced the following error when using Vite:

```
Uncaught (in promise) Error: Unexpected usage
  at EditorSimpleWorker.loadForeignModule (editorSimpleWorker.js)
  at webWorker.js
```

As a workaround, create a file named `yaml.worker.js` in your own project with the following
contents:

```js
import 'monaco-yaml/yaml.worker.js'
```

Then in your Monaco environment `getWorker` function, reference this file instead of referencing
`monaco-yaml/yaml.worker.js` directly:

```js
import YamlWorker from './yaml.worker.js?worker'

window.MonacoEnvironment = {
  getWorker(moduleId, label) {
    switch (label) {
      // Handle other cases
      case 'yaml':
        return new YamlWorker()
      default:
        throw new Error(`Unknown label ${label}`)
    }
  }
}
```

### Why isn’t `monaco-yaml` working? Official Monaco language extensions do work.

This is most likely due to the fact that `monaco-yaml` is using a different instance of the
`monaco-editor` package than you are. This is something you’ll want to avoid regardless of
`monaco-editor`, because it means your bundle is significantly larger than it needs to be. This is
likely caused by one of the following issues:

- A code splitting misconfiguration

  To solve this, try inspecting your bundle using for example
  [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer). If
  `monaco-editor` is in there twice, this is the issue. It’s up to you to solve this, as it’s
  project-specific.

- You’re using a package which imports `monaco-editor` for you, but it’s using a different version.

  You can find out why the `monaco-editor` is installed using `npm ls monaco-editor` or
  `yarn why monaco-editor`. It should exist only once, but it’s ok if it’s deduped.

  You may be able to solve this by deleting your `node_modules` folder and `package-lock.json` or
  `yarn.lock`, then running `npm install` or `yarn install` respectively.

### Using Monaco webpack loader plugin

If you’re using
[monaco webpack plugin](https://github.com/microsoft/monaco-editor/tree/main/webpack-plugin), then
instead of the above code, you can extend the plugin’s configuration. Extend your
`webpack.config.js` file with the following:

```js
import { MonacoWebpackPlugin } from 'monaco-editor-webpack-plugin'

export default {
  // ...the rest of your webpack configuration...
  plugins: [
    new MonacoWebpackPlugin({
      languages: ['yaml'],
      customLanguages: [
        {
          label: 'yaml',
          entry: 'monaco-yaml',
          worker: {
            id: 'monaco-yaml/yamlWorker',
            entry: 'monaco-yaml/yaml.worker'
          }
        }
      ]
    })
  ]
}
```

You can also refer to the
[example](https://github.com/remcohaszing/monaco-yaml/tree/main/examples/monaco-editor-webpack-plugin)
of a complete project.

### Why is syntax highlighting not working?

Syntax highlighting is provided by Monaco editor itself, not by `monaco-yaml`. If you use a build
tool to filter languages or features, make sure to include the `yaml` language. If you import Monaco
editor from `monaco-editor/esm/vs/editor/editor.api.js` and cherry-pick features manually, make sure
to also import `monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js`. If you use
`monaco-editor-core`, make sure to import `monaco-languages/release/esm/yaml/yaml.contribution.js`.

### Why does it try to download my schema even when I provided one as an object?

You may have provided a schema configured like this:

```Javascript
{
  uri: "http://example.com",
  fileMatch: ["file_name.yml"],
  schema: {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "http://example.com",
    title: "placeholder title",
    description: "placeholder description",
    type: "object",
    properties: {
      name: {
        description: "name property description",
        type: "string",
      },
    },
    required: ["name"],
  },
}
```

And would be surprised to see the error:

> `Unable to load schema from '<http://example.com>': Failed to fetch.`

It happens because plugin uses schema URI not only as the URL to download the schema from, but also
to determine the schema name. To fix this, change the `uri` parameter to
`http://example.com/schema-name.json`.

## Contributing

Please see our [contributing guidelines](CONTRIBUTING.md)

## Credits

Originally [@kpdecker](https://github.com/kpdecker) forked this repository from
[`monaco-json`](https://github.com/microsoft/monaco-json) by
[@microsoft](https://github.com/microsoft) and rewrote it to work with
[`yaml-language-server`](https://github.com/redhat-developer/yaml-language-server) instead. Later
the repository maintenance was taken over by [@pengx17](https://github.com/pengx17). Eventually the
repository was tranferred to the account of [@remcohaszing](https://github.com/remcohaszing), who is
currently maintaining this repository with the help of [@fleon](https://github.com/fleon) and
[@yazaabed](https://github.com/yazaabed).

The heavy processing is done in
[`yaml-language-server`](https://github.com/redhat-developer/yaml-language-server), best known for
being the backbone for [`vscode-yaml`](https://github.com/redhat-developer/vscode-yaml). This
repository provides a thin layer to add functionality provided by `yaml-language-server` into
`monaco-editor`.

## License

[MIT](https://github.com/remcohaszing/monaco-yaml/blob/main/LICENSE.md)
