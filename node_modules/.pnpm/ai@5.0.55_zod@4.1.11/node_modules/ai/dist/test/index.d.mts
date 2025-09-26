export { convertArrayToAsyncIterable, convertArrayToReadableStream, convertReadableStreamToArray, mockId } from '@ai-sdk/provider-utils/test';
import { EmbeddingModelV2, ImageModelV2, LanguageModelV2, ProviderV2, TranscriptionModelV2, SpeechModelV2 } from '@ai-sdk/provider';

declare class MockEmbeddingModelV2<VALUE> implements EmbeddingModelV2<VALUE> {
    readonly specificationVersion = "v2";
    readonly provider: EmbeddingModelV2<VALUE>['provider'];
    readonly modelId: EmbeddingModelV2<VALUE>['modelId'];
    readonly maxEmbeddingsPerCall: EmbeddingModelV2<VALUE>['maxEmbeddingsPerCall'];
    readonly supportsParallelCalls: EmbeddingModelV2<VALUE>['supportsParallelCalls'];
    doEmbed: EmbeddingModelV2<VALUE>['doEmbed'];
    constructor({ provider, modelId, maxEmbeddingsPerCall, supportsParallelCalls, doEmbed, }?: {
        provider?: EmbeddingModelV2<VALUE>['provider'];
        modelId?: EmbeddingModelV2<VALUE>['modelId'];
        maxEmbeddingsPerCall?: EmbeddingModelV2<VALUE>['maxEmbeddingsPerCall'] | null;
        supportsParallelCalls?: EmbeddingModelV2<VALUE>['supportsParallelCalls'];
        doEmbed?: EmbeddingModelV2<VALUE>['doEmbed'];
    });
}

declare class MockImageModelV2 implements ImageModelV2 {
    readonly specificationVersion = "v2";
    readonly provider: ImageModelV2['provider'];
    readonly modelId: ImageModelV2['modelId'];
    readonly maxImagesPerCall: ImageModelV2['maxImagesPerCall'];
    doGenerate: ImageModelV2['doGenerate'];
    constructor({ provider, modelId, maxImagesPerCall, doGenerate, }?: {
        provider?: ImageModelV2['provider'];
        modelId?: ImageModelV2['modelId'];
        maxImagesPerCall?: ImageModelV2['maxImagesPerCall'];
        doGenerate?: ImageModelV2['doGenerate'];
    });
}

declare class MockLanguageModelV2 implements LanguageModelV2 {
    readonly specificationVersion = "v2";
    private _supportedUrls;
    readonly provider: LanguageModelV2['provider'];
    readonly modelId: LanguageModelV2['modelId'];
    doGenerate: LanguageModelV2['doGenerate'];
    doStream: LanguageModelV2['doStream'];
    doGenerateCalls: Parameters<LanguageModelV2['doGenerate']>[0][];
    doStreamCalls: Parameters<LanguageModelV2['doStream']>[0][];
    constructor({ provider, modelId, supportedUrls, doGenerate, doStream, }?: {
        provider?: LanguageModelV2['provider'];
        modelId?: LanguageModelV2['modelId'];
        supportedUrls?: LanguageModelV2['supportedUrls'] | (() => LanguageModelV2['supportedUrls']);
        doGenerate?: LanguageModelV2['doGenerate'] | Awaited<ReturnType<LanguageModelV2['doGenerate']>> | Awaited<ReturnType<LanguageModelV2['doGenerate']>>[];
        doStream?: LanguageModelV2['doStream'] | Awaited<ReturnType<LanguageModelV2['doStream']>> | Awaited<ReturnType<LanguageModelV2['doStream']>>[];
    });
    get supportedUrls(): Record<string, RegExp[]> | PromiseLike<Record<string, RegExp[]>>;
}

declare class MockProviderV2 implements ProviderV2 {
    languageModel: ProviderV2['languageModel'];
    textEmbeddingModel: ProviderV2['textEmbeddingModel'];
    imageModel: ProviderV2['imageModel'];
    transcriptionModel: ProviderV2['transcriptionModel'];
    speechModel: ProviderV2['speechModel'];
    constructor({ languageModels, embeddingModels, imageModels, transcriptionModels, speechModels, }?: {
        languageModels?: Record<string, LanguageModelV2>;
        embeddingModels?: Record<string, EmbeddingModelV2<string>>;
        imageModels?: Record<string, ImageModelV2>;
        transcriptionModels?: Record<string, TranscriptionModelV2>;
        speechModels?: Record<string, SpeechModelV2>;
    });
}

declare class MockSpeechModelV2 implements SpeechModelV2 {
    readonly specificationVersion = "v2";
    readonly provider: SpeechModelV2['provider'];
    readonly modelId: SpeechModelV2['modelId'];
    doGenerate: SpeechModelV2['doGenerate'];
    constructor({ provider, modelId, doGenerate, }?: {
        provider?: SpeechModelV2['provider'];
        modelId?: SpeechModelV2['modelId'];
        doGenerate?: SpeechModelV2['doGenerate'];
    });
}

declare class MockTranscriptionModelV2 implements TranscriptionModelV2 {
    readonly specificationVersion = "v2";
    readonly provider: TranscriptionModelV2['provider'];
    readonly modelId: TranscriptionModelV2['modelId'];
    doGenerate: TranscriptionModelV2['doGenerate'];
    constructor({ provider, modelId, doGenerate, }?: {
        provider?: TranscriptionModelV2['provider'];
        modelId?: TranscriptionModelV2['modelId'];
        doGenerate?: TranscriptionModelV2['doGenerate'];
    });
}

declare function mockValues<T>(...values: T[]): () => T;

/**
 * Creates a ReadableStream that emits the provided values with an optional delay between each value.
 *
 * @param options - The configuration options
 * @param options.chunks - Array of values to be emitted by the stream
 * @param options.initialDelayInMs - Optional initial delay in milliseconds before emitting the first value (default: 0). Can be set to `null` to skip the initial delay. The difference between `initialDelayInMs: null` and `initialDelayInMs: 0` is that `initialDelayInMs: null` will emit the values without any delay, while `initialDelayInMs: 0` will emit the values with a delay of 0 milliseconds.
 * @param options.chunkDelayInMs - Optional delay in milliseconds between emitting each value (default: 0). Can be set to `null` to skip the delay. The difference between `chunkDelayInMs: null` and `chunkDelayInMs: 0` is that `chunkDelayInMs: null` will emit the values without any delay, while `chunkDelayInMs: 0` will emit the values with a delay of 0 milliseconds.
 * @returns A ReadableStream that emits the provided values
 */
declare function simulateReadableStream$1<T>({ chunks, initialDelayInMs, chunkDelayInMs, _internal, }: {
    chunks: T[];
    initialDelayInMs?: number | null;
    chunkDelayInMs?: number | null;
    _internal?: {
        delay?: (ms: number | null) => Promise<void>;
    };
}): ReadableStream<T>;

/**
 * @deprecated Use `simulateReadableStream` from `ai` instead.
 */
declare const simulateReadableStream: typeof simulateReadableStream$1;

export { MockEmbeddingModelV2, MockImageModelV2, MockLanguageModelV2, MockProviderV2, MockSpeechModelV2, MockTranscriptionModelV2, mockValues, simulateReadableStream };
