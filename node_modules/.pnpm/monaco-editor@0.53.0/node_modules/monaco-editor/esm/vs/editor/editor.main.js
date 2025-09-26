/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.53.0(4e45ba0c5ff45fc61c0ccac61c0987369df04a6e)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));

// src/fillers/monaco-editor-core.ts
var monaco_editor_core_exports = {};
__reExport(monaco_editor_core_exports, monaco_editor_core_star);
import * as monaco_editor_core_star from "./edcore.main.js";

// src/common/workers.ts
function createTrustedTypesPolicy(policyName, policyOptions) {
  const monacoEnvironment = globalThis.MonacoEnvironment;
  if (monacoEnvironment?.createTrustedTypesPolicy) {
    try {
      return monacoEnvironment.createTrustedTypesPolicy(policyName, policyOptions);
    } catch (err) {
      console.error(err);
      return void 0;
    }
  }
  try {
    return globalThis.trustedTypes?.createPolicy(policyName, policyOptions);
  } catch (err) {
    console.error(err);
    return void 0;
  }
}
var ttPolicy;
if (typeof self === "object" && self.constructor && self.constructor.name === "DedicatedWorkerGlobalScope" && globalThis.workerttPolicy !== void 0) {
  ttPolicy = globalThis.workerttPolicy;
} else {
  ttPolicy = createTrustedTypesPolicy("defaultWorkerFactory", {
    createScriptURL: (value) => value
  });
}
function getWorker(descriptor) {
  const label = descriptor.label;
  const monacoEnvironment = globalThis.MonacoEnvironment;
  if (monacoEnvironment) {
    if (typeof monacoEnvironment.getWorker === "function") {
      return monacoEnvironment.getWorker("workerMain.js", label);
    }
    if (typeof monacoEnvironment.getWorkerUrl === "function") {
      const workerUrl = monacoEnvironment.getWorkerUrl("workerMain.js", label);
      return new Worker(
        ttPolicy ? ttPolicy.createScriptURL(workerUrl) : workerUrl,
        { name: label, type: "module" }
      );
    }
  }
  throw new Error(
    `You must define a function MonacoEnvironment.getWorkerUrl or MonacoEnvironment.getWorker`
  );
}
function createWebWorker(opts) {
  const worker = Promise.resolve(
    getWorker({
      label: opts.label ?? "monaco-editor-worker",
      moduleId: opts.moduleId
    })
  ).then((w) => {
    w.postMessage("ignore");
    w.postMessage(opts.createData);
    return w;
  });
  return monaco_editor_core_exports.editor.createWebWorker({
    worker,
    host: opts.host,
    keepIdleModels: opts.keepIdleModels
  });
}

// src/editor/editor.main.ts
import "../basic-languages/monaco.contribution";
import "../language/css/monaco.contribution";
import "../language/html/monaco.contribution";
import "../language/json/monaco.contribution";
import "../language/typescript/monaco.contribution";
import * as monaco from "./edcore.main.js";
export * from "./edcore.main.js";
var existingCreateWebWorker = monaco.editor.createWebWorker;
monaco.editor.createWebWorker = function(options) {
  if (options.worker === void 0) {
    return createWebWorker(options);
  }
  return existingCreateWebWorker(options);
};
