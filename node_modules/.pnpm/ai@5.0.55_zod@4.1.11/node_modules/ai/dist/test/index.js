"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// test/index.ts
var test_exports = {};
__export(test_exports, {
  MockEmbeddingModelV2: () => MockEmbeddingModelV2,
  MockImageModelV2: () => MockImageModelV2,
  MockLanguageModelV2: () => MockLanguageModelV2,
  MockProviderV2: () => MockProviderV2,
  MockSpeechModelV2: () => MockSpeechModelV2,
  MockTranscriptionModelV2: () => MockTranscriptionModelV2,
  convertArrayToAsyncIterable: () => import_test.convertArrayToAsyncIterable,
  convertArrayToReadableStream: () => import_test.convertArrayToReadableStream,
  convertReadableStreamToArray: () => import_test.convertReadableStreamToArray,
  mockId: () => import_test.mockId,
  mockValues: () => mockValues,
  simulateReadableStream: () => simulateReadableStream2
});
module.exports = __toCommonJS(test_exports);
var import_test = require("@ai-sdk/provider-utils/test");

// src/test/not-implemented.ts
function notImplemented() {
  throw new Error("Not implemented");
}

// src/test/mock-embedding-model-v2.ts
var MockEmbeddingModelV2 = class {
  constructor({
    provider = "mock-provider",
    modelId = "mock-model-id",
    maxEmbeddingsPerCall = 1,
    supportsParallelCalls = false,
    doEmbed = notImplemented
  } = {}) {
    this.specificationVersion = "v2";
    this.provider = provider;
    this.modelId = modelId;
    this.maxEmbeddingsPerCall = maxEmbeddingsPerCall ?? void 0;
    this.supportsParallelCalls = supportsParallelCalls;
    this.doEmbed = doEmbed;
  }
};

// src/test/mock-image-model-v2.ts
var MockImageModelV2 = class {
  constructor({
    provider = "mock-provider",
    modelId = "mock-model-id",
    maxImagesPerCall = 1,
    doGenerate = notImplemented
  } = {}) {
    this.specificationVersion = "v2";
    this.provider = provider;
    this.modelId = modelId;
    this.maxImagesPerCall = maxImagesPerCall;
    this.doGenerate = doGenerate;
  }
};

// src/test/mock-language-model-v2.ts
var MockLanguageModelV2 = class {
  constructor({
    provider = "mock-provider",
    modelId = "mock-model-id",
    supportedUrls = {},
    doGenerate = notImplemented,
    doStream = notImplemented
  } = {}) {
    this.specificationVersion = "v2";
    this.doGenerateCalls = [];
    this.doStreamCalls = [];
    this.provider = provider;
    this.modelId = modelId;
    this.doGenerate = async (options) => {
      this.doGenerateCalls.push(options);
      if (typeof doGenerate === "function") {
        return doGenerate(options);
      } else if (Array.isArray(doGenerate)) {
        return doGenerate[this.doGenerateCalls.length];
      } else {
        return doGenerate;
      }
    };
    this.doStream = async (options) => {
      this.doStreamCalls.push(options);
      if (typeof doStream === "function") {
        return doStream(options);
      } else if (Array.isArray(doStream)) {
        return doStream[this.doStreamCalls.length];
      } else {
        return doStream;
      }
    };
    this._supportedUrls = typeof supportedUrls === "function" ? supportedUrls : async () => supportedUrls;
  }
  get supportedUrls() {
    return this._supportedUrls();
  }
};

// src/test/mock-provider-v2.ts
var import_provider = require("@ai-sdk/provider");
var MockProviderV2 = class {
  constructor({
    languageModels,
    embeddingModels,
    imageModels,
    transcriptionModels,
    speechModels
  } = {}) {
    this.languageModel = (modelId) => {
      if (!languageModels?.[modelId]) {
        throw new import_provider.NoSuchModelError({ modelId, modelType: "languageModel" });
      }
      return languageModels[modelId];
    };
    this.textEmbeddingModel = (modelId) => {
      if (!embeddingModels?.[modelId]) {
        throw new import_provider.NoSuchModelError({
          modelId,
          modelType: "textEmbeddingModel"
        });
      }
      return embeddingModels[modelId];
    };
    this.imageModel = (modelId) => {
      if (!imageModels?.[modelId]) {
        throw new import_provider.NoSuchModelError({ modelId, modelType: "imageModel" });
      }
      return imageModels[modelId];
    };
    this.transcriptionModel = (modelId) => {
      if (!transcriptionModels?.[modelId]) {
        throw new import_provider.NoSuchModelError({
          modelId,
          modelType: "transcriptionModel"
        });
      }
      return transcriptionModels[modelId];
    };
    this.speechModel = (modelId) => {
      if (!speechModels?.[modelId]) {
        throw new import_provider.NoSuchModelError({ modelId, modelType: "speechModel" });
      }
      return speechModels[modelId];
    };
  }
};

// src/test/mock-speech-model-v2.ts
var MockSpeechModelV2 = class {
  constructor({
    provider = "mock-provider",
    modelId = "mock-model-id",
    doGenerate = notImplemented
  } = {}) {
    this.specificationVersion = "v2";
    this.provider = provider;
    this.modelId = modelId;
    this.doGenerate = doGenerate;
  }
};

// src/test/mock-transcription-model-v2.ts
var MockTranscriptionModelV2 = class {
  constructor({
    provider = "mock-provider",
    modelId = "mock-model-id",
    doGenerate = notImplemented
  } = {}) {
    this.specificationVersion = "v2";
    this.provider = provider;
    this.modelId = modelId;
    this.doGenerate = doGenerate;
  }
};

// src/test/mock-values.ts
function mockValues(...values) {
  let counter = 0;
  return () => values[counter++] ?? values[values.length - 1];
}

// src/util/simulate-readable-stream.ts
var import_provider_utils = require("@ai-sdk/provider-utils");
function simulateReadableStream({
  chunks,
  initialDelayInMs = 0,
  chunkDelayInMs = 0,
  _internal
}) {
  const delay = _internal?.delay ?? import_provider_utils.delay;
  let index = 0;
  return new ReadableStream({
    async pull(controller) {
      if (index < chunks.length) {
        await delay(index === 0 ? initialDelayInMs : chunkDelayInMs);
        controller.enqueue(chunks[index++]);
      } else {
        controller.close();
      }
    }
  });
}

// test/index.ts
var simulateReadableStream2 = simulateReadableStream;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MockEmbeddingModelV2,
  MockImageModelV2,
  MockLanguageModelV2,
  MockProviderV2,
  MockSpeechModelV2,
  MockTranscriptionModelV2,
  convertArrayToAsyncIterable,
  convertArrayToReadableStream,
  convertReadableStreamToArray,
  mockId,
  mockValues,
  simulateReadableStream
});
//# sourceMappingURL=index.js.map