/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.53.0(4e45ba0c5ff45fc61c0ccac61c0987369df04a6e)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/


// src/common/initialize.ts
import * as worker from "./editor.worker.start";
var initialized = false;
function isWorkerInitialized() {
  return initialized;
}
function initialize(callback) {
  initialized = true;
  self.onmessage = (m) => {
    worker.start((ctx) => {
      return callback(ctx, m.data);
    });
  };
}

// src/editor/editor.worker.ts
import * as worker2 from "./editor.worker.start";
self.onmessage = () => {
  if (!isWorkerInitialized()) {
    worker2.start(() => {
      return {};
    });
  } else {
  }
};
export {
  initialize
};
