# Monaco Worker Manager

[![ci workflow](https://github.com/remcohaszing/monaco-worker-manager/actions/workflows/ci.yaml/badge.svg)](https://github.com/remcohaszing/monaco-worker-manager/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/monaco-worker-manager)](https://www.npmjs.com/package/monaco-worker-manager)
[![prettier code style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io)

A Monaco worker manager handles workers in a type safe manner.

## Installation

This project has a peer dependency on `monaco-editor`. It’s recommded to add it explicitly.

```sh
npm install monaco-editor monaco-editor-manager
```

## Usage

Create a module that contains a Monaco web worker, let’s call it `my.worker.ts`.

```typescript
import { initialize } from 'monaco-worker-manager/worker';
import { doValidate } from 'my-language-service';

export interface MyWorker {
  doValidate: (uri: string) => Violation[];
}

initialize<MyWorker>((ctx, options) => {
  function getModel(uri: string): worker.IMirrorModel | undefined {
    for (const model of ctx.getMirrorModels()) {
      if (String(model.uri) === uri) {
        return model;
      }
    }
  }

  return {
    doValidate(uri) {
      const model = getModel(uri);

      if (!model) {
        return [];
      }

      return doValidate(model, options);
    },
  };
});
```

Now create a monaco environment and create a worker manager in the main thread:

```typescript
import { editor, Uri } from 'monaco-editor';
import { createWorkerManager } from 'monaco-worker-manager';

import { MyWorker } from './my.worker';

const myLabel = 'myLabel';
const myModuleId = 'my.worker';

window.MonacoEnvironment = {
  getWorker(moduleId, label) {
    switch (label) {
      case 'editorWorkerService':
        return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url));
      case myLabel:
        return new Worker(new URL('my.worker', import.meta.url));
      default:
        throw new Error(`Unknown label ${label}`);
    }
  },
};

const workerManager = createWorkerManager<MyWorker>({
  label: myLabel,
  moduleId: myModuleId,
});

const model = editor.createModel('Hello Monaco!', 'plaintext', Uri.parse('file:///hello.txt'));

async function main(): Promise<void> {
  const worker = await workerManager.getWorker(model.uri);
  const diagnostics = await worker.doValidate(String(model.uri));
  console.log(diagnostics);
}

main();
```

## API

This project exposes 2 modules: one to use in the main thread, another to create your own worker.

### `monaco-worker-manager#createWorkerManager(options)`

Create a worker manager.

A worker manager is an object which deals with Monaco based web workers, such as cleanups and idle
timeouts.

#### Options

- `options.createData`: The data to send over when creating the worker. (Optional)
- `options.interval` How often to check if a worker is idle in milliseconds. (Optional, default:
  `30_000`)
- `options.label`: A label to be used to identify the web worker.
- `options.moduleId`: The module id to be used to identify the web worker.
- `options.stopWhenIdleFor`: The worker is stopped after this time has passed in milliseconds. Set
  to Infinity to never stop the worker. (Optional, default: `120_000`)

#### Return value

A disposable object with the following keys:

- `getWorker(...resources: Uri[])`: An unbound method for getting the web worker.
- `updateCreateData(newCreateData)`: An unbound method which updates the create data and reloads the
  worker.

### `monaco-worker-manager/worker#initialize(fn)`

Create a web worker in a type safe manner.

The function will be called with the following arguments:

1. The Monaco worker context.
2. The create data defined by the worker manager.

## License

[MIT](https://github.com/remcohaszing/monaco-worker-manager/blob/main/LICENSE.md)
