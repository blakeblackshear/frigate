export { createGateway, gateway } from '@ai-sdk/gateway';
import { ModelMessage, Tool, InferToolInput, InferToolOutput, AssistantModelMessage, ToolModelMessage, ReasoningPart, Schema, SystemModelMessage, UserModelMessage, ProviderOptions, IdGenerator, ToolCall, InferSchema, FlexibleSchema, DataContent, Validator, StandardSchemaV1, Resolvable, FetchFunction } from '@ai-sdk/provider-utils';
export { AssistantContent, AssistantModelMessage, DataContent, FilePart, IdGenerator, ImagePart, InferToolInput, InferToolOutput, ModelMessage, Schema, SystemModelMessage, TextPart, Tool, ToolCallOptions, ToolCallPart, ToolContent, ToolExecuteFunction, ToolModelMessage, ToolResultPart, UserContent, UserModelMessage, asSchema, createIdGenerator, dynamicTool, generateId, jsonSchema, parseJsonEventStream, tool, zodSchema } from '@ai-sdk/provider-utils';
import { AttributeValue, Tracer } from '@opentelemetry/api';
import * as _ai_sdk_provider from '@ai-sdk/provider';
import { EmbeddingModelV2, EmbeddingModelV2Embedding, ImageModelV2, ImageModelV2CallWarning, ImageModelV2ProviderMetadata, JSONValue as JSONValue$1, LanguageModelV2, LanguageModelV2FinishReason, LanguageModelV2CallWarning, LanguageModelV2Source, LanguageModelV2Middleware, SharedV2ProviderMetadata, SpeechModelV2, SpeechModelV2CallWarning, TranscriptionModelV2, TranscriptionModelV2CallWarning, LanguageModelV2Usage, LanguageModelV2CallOptions, AISDKError, LanguageModelV2ToolCall, JSONSchema7, JSONParseError, TypeValidationError, ProviderV2, NoSuchModelError, JSONObject } from '@ai-sdk/provider';
export { AISDKError, APICallError, EmptyResponseBodyError, InvalidPromptError, InvalidResponseDataError, JSONParseError, JSONSchema7, LoadAPIKeyError, NoContentGeneratedError, NoSuchModelError, TooManyEmbeddingValuesForCallError, TypeValidationError, UnsupportedFunctionalityError } from '@ai-sdk/provider';
import * as z3 from 'zod/v3';
import * as z4 from 'zod/v4';
import { z } from 'zod/v4';
import { ServerResponse } from 'node:http';
import { ServerResponse as ServerResponse$1 } from 'http';

type CallSettings = {
    /**
  Maximum number of tokens to generate.
     */
    maxOutputTokens?: number;
    /**
  Temperature setting. The range depends on the provider and model.
  
  It is recommended to set either `temperature` or `topP`, but not both.
     */
    temperature?: number;
    /**
  Nucleus sampling. This is a number between 0 and 1.
  
  E.g. 0.1 would mean that only tokens with the top 10% probability mass
  are considered.
  
  It is recommended to set either `temperature` or `topP`, but not both.
     */
    topP?: number;
    /**
  Only sample from the top K options for each subsequent token.
  
  Used to remove "long tail" low probability responses.
  Recommended for advanced use cases only. You usually only need to use temperature.
     */
    topK?: number;
    /**
  Presence penalty setting. It affects the likelihood of the model to
  repeat information that is already in the prompt.
  
  The presence penalty is a number between -1 (increase repetition)
  and 1 (maximum penalty, decrease repetition). 0 means no penalty.
     */
    presencePenalty?: number;
    /**
  Frequency penalty setting. It affects the likelihood of the model
  to repeatedly use the same words or phrases.
  
  The frequency penalty is a number between -1 (increase repetition)
  and 1 (maximum penalty, decrease repetition). 0 means no penalty.
     */
    frequencyPenalty?: number;
    /**
  Stop sequences.
  If set, the model will stop generating text when one of the stop sequences is generated.
  Providers may have limits on the number of stop sequences.
     */
    stopSequences?: string[];
    /**
  The seed (integer) to use for random sampling. If set and supported
  by the model, calls will generate deterministic results.
     */
    seed?: number;
    /**
  Maximum number of retries. Set to 0 to disable retries.
  
  @default 2
     */
    maxRetries?: number;
    /**
  Abort signal.
     */
    abortSignal?: AbortSignal;
    /**
  Additional HTTP headers to be sent with the request.
  Only applicable for HTTP-based providers.
     */
    headers?: Record<string, string | undefined>;
};

/**
Prompt part of the AI function options.
It contains a system message, a simple text prompt, or a list of messages.
 */
type Prompt = {
    /**
  System message to include in the prompt. Can be used with `prompt` or `messages`.
     */
    system?: string;
} & ({
    /**
A prompt. It can be either a text prompt or a list of messages.

You can either use `prompt` or `messages` but not both.
*/
    prompt: string | Array<ModelMessage>;
    /**
A list of messages.

You can either use `prompt` or `messages` but not both.
 */
    messages?: never;
} | {
    /**
A list of messages.

You can either use `prompt` or `messages` but not both.
 */
    messages: Array<ModelMessage>;
    /**
A prompt. It can be either a text prompt or a list of messages.

You can either use `prompt` or `messages` but not both.
*/
    prompt?: never;
});

/**
 * Telemetry configuration.
 */
type TelemetrySettings = {
    /**
     * Enable or disable telemetry. Disabled by default while experimental.
     */
    isEnabled?: boolean;
    /**
     * Enable or disable input recording. Enabled by default.
     *
     * You might want to disable input recording to avoid recording sensitive
     * information, to reduce data transfers, or to increase performance.
     */
    recordInputs?: boolean;
    /**
     * Enable or disable output recording. Enabled by default.
     *
     * You might want to disable output recording to avoid recording sensitive
     * information, to reduce data transfers, or to increase performance.
     */
    recordOutputs?: boolean;
    /**
     * Identifier for this function. Used to group telemetry data by function.
     */
    functionId?: string;
    /**
     * Additional information to include in the telemetry data.
     */
    metadata?: Record<string, AttributeValue>;
    /**
     * A custom tracer to use for the telemetry data.
     */
    tracer?: Tracer;
};

/**
Embedding model that is used by the AI SDK Core functions.
*/
type EmbeddingModel<VALUE = string> = string | EmbeddingModelV2<VALUE>;
/**
Embedding.
 */
type Embedding = EmbeddingModelV2Embedding;

/**
Image model that is used by the AI SDK Core functions.
  */
type ImageModel = ImageModelV2;
/**
Warning from the model provider for this call. The call will proceed, but e.g.
some settings might not be supported, which can lead to suboptimal results.
  */
type ImageGenerationWarning = ImageModelV2CallWarning;
/**
Metadata from the model provider for this call
  */
type ImageModelProviderMetadata = ImageModelV2ProviderMetadata;

type ImageModelResponseMetadata = {
    /**
  Timestamp for the start of the generated response.
     */
    timestamp: Date;
    /**
  The ID of the response model that was used to generate the response.
     */
    modelId: string;
    /**
  Response headers.
     */
    headers?: Record<string, string>;
};

type JSONValue = JSONValue$1;

/**
Language model that is used by the AI SDK Core functions.
*/
type LanguageModel = string | LanguageModelV2;
/**
Reason why a language model finished generating a response.

Can be one of the following:
- `stop`: model generated stop sequence
- `length`: model generated maximum number of tokens
- `content-filter`: content filter violation stopped the model
- `tool-calls`: model triggered tool calls
- `error`: model stopped because of an error
- `other`: model stopped for other reasons
*/
type FinishReason = LanguageModelV2FinishReason;
/**
Warning from the model provider for this call. The call will proceed, but e.g.
some settings might not be supported, which can lead to suboptimal results.
*/
type CallWarning = LanguageModelV2CallWarning;
/**
A source that has been used as input to generate the response.
*/
type Source = LanguageModelV2Source;
/**
Tool choice for the generation. It supports the following settings:

- `auto` (default): the model can choose whether and which tools to call.
- `required`: the model must call a tool. It can choose which tool to call.
- `none`: the model must not call tools
- `{ type: 'tool', toolName: string (typed) }`: the model must call the specified tool
 */
type ToolChoice<TOOLS extends Record<string, unknown>> = 'auto' | 'none' | 'required' | {
    type: 'tool';
    toolName: Extract<keyof TOOLS, string>;
};

type LanguageModelMiddleware = LanguageModelV2Middleware;

type LanguageModelRequestMetadata = {
    /**
  Request HTTP body that was sent to the provider API.
       */
    body?: unknown;
};

type LanguageModelResponseMetadata = {
    /**
    ID for the generated response.
       */
    id: string;
    /**
    Timestamp for the start of the generated response.
    */
    timestamp: Date;
    /**
    The ID of the response model that was used to generate the response.
    */
    modelId: string;
    /**
  Response headers (available only for providers that use HTTP requests).
       */
    headers?: Record<string, string>;
};

/**
 * Provider for language, text embedding, and image models.
 */
type Provider = {
    /**
    Returns the language model with the given id.
    The model id is then passed to the provider function to get the model.
  
    @param {string} id - The id of the model to return.
  
    @returns {LanguageModel} The language model associated with the id
  
    @throws {NoSuchModelError} If no such model exists.
       */
    languageModel(modelId: string): LanguageModel;
    /**
    Returns the text embedding model with the given id.
    The model id is then passed to the provider function to get the model.
  
    @param {string} id - The id of the model to return.
  
    @returns {LanguageModel} The language model associated with the id
  
    @throws {NoSuchModelError} If no such model exists.
       */
    textEmbeddingModel(modelId: string): EmbeddingModel<string>;
    /**
    Returns the image model with the given id.
    The model id is then passed to the provider function to get the model.
  
    @param {string} id - The id of the model to return.
  
    @returns {ImageModel} The image model associated with the id
    */
    imageModel(modelId: string): ImageModel;
};

/**
Additional provider-specific metadata that is returned from the provider.

This is needed to enable provider-specific functionality that can be
fully encapsulated in the provider.
 */
type ProviderMetadata = SharedV2ProviderMetadata;

/**
Speech model that is used by the AI SDK Core functions.
  */
type SpeechModel = SpeechModelV2;
/**
Warning from the model provider for this call. The call will proceed, but e.g.
some settings might not be supported, which can lead to suboptimal results.
  */
type SpeechWarning = SpeechModelV2CallWarning;

type SpeechModelResponseMetadata = {
    /**
  Timestamp for the start of the generated response.
     */
    timestamp: Date;
    /**
  The ID of the response model that was used to generate the response.
     */
    modelId: string;
    /**
  Response headers.
     */
    headers?: Record<string, string>;
    /**
  Response body.
     */
    body?: unknown;
};

/**
Transcription model that is used by the AI SDK Core functions.
  */
type TranscriptionModel = TranscriptionModelV2;
/**
Warning from the model provider for this call. The call will proceed, but e.g.
some settings might not be supported, which can lead to suboptimal results.
  */
type TranscriptionWarning = TranscriptionModelV2CallWarning;

type TranscriptionModelResponseMetadata = {
    /**
  Timestamp for the start of the generated response.
     */
    timestamp: Date;
    /**
  The ID of the response model that was used to generate the response.
     */
    modelId: string;
    /**
  Response headers.
     */
    headers?: Record<string, string>;
};

/**
Represents the number of tokens used in a prompt and completion.
 */
type LanguageModelUsage = LanguageModelV2Usage;
/**
Represents the number of tokens used in an embedding.
 */
type EmbeddingModelUsage = {
    /**
  The number of tokens used in the embedding.
     */
    tokens: number;
};

/**
 * Experimental. Can change in patch versions without warning.
 *
 * Download function. Called with the array of URLs and a boolean indicating
 * whether the URL is supported by the model.
 *
 * The download function can decide for each URL:
 * - to return null (which means that the URL should be passed to the model)
 * - to download the asset and return the data (incl. retries, authentication, etc.)
 *
 * Should throw DownloadError if the download fails.
 *
 * Should return an array of objects sorted by the order of the requested downloads.
 * For each object, the data should be a Uint8Array if the URL was downloaded.
 * For each object, the mediaType should be the media type of the downloaded asset.
 * For each object, the data should be null if the URL should be passed through as is.
 */
type DownloadFunction = (options: Array<{
    url: URL;
    isUrlSupportedByModel: boolean;
}>) => PromiseLike<Array<{
    data: Uint8Array;
    mediaType: string | undefined;
} | null>>;

/**
 * A generated file.
 */
interface GeneratedFile {
    /**
  File as a base64 encoded string.
       */
    readonly base64: string;
    /**
  File as a Uint8Array.
       */
    readonly uint8Array: Uint8Array;
    /**
  The IANA media type of the file.
  
  @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    readonly mediaType: string;
}

/**
 * Reasoning output of a text generation. It contains a reasoning.
 */
interface ReasoningOutput {
    type: 'reasoning';
    /**
     * The reasoning text.
     */
    text: string;
    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerMetadata?: ProviderMetadata;
}

/**
Create a union of the given object's values, and optionally specify which keys to get the values from.

Please upvote [this issue](https://github.com/microsoft/TypeScript/issues/31438) if you want to have this type as a built-in in TypeScript.

@example
```
// data.json
{
    'foo': 1,
    'bar': 2,
    'biz': 3
}

// main.ts
import type {ValueOf} from 'type-fest';
import data = require('./data.json');

export function getData(name: string): ValueOf<typeof data> {
    return data[name];
}

export function onlyBar(name: string): ValueOf<typeof data, 'bar'> {
    return data[name];
}

// file.ts
import {getData, onlyBar} from './main';

getData('foo');
//=> 1

onlyBar('foo');
//=> TypeError ...

onlyBar('bar');
//=> 2
```
* @see https://github.com/sindresorhus/type-fest/blob/main/source/value-of.d.ts
*/
type ValueOf<ObjectType, ValueType extends keyof ObjectType = keyof ObjectType> = ObjectType[ValueType];

type ToolSet = Record<string, (Tool<never, never> | Tool<any, any> | Tool<any, never> | Tool<never, any>) & Pick<Tool<any, any>, 'execute' | 'onInputAvailable' | 'onInputStart' | 'onInputDelta'>>;

type StaticToolCall<TOOLS extends ToolSet> = ValueOf<{
    [NAME in keyof TOOLS]: {
        type: 'tool-call';
        toolCallId: string;
        toolName: NAME & string;
        input: TOOLS[NAME] extends Tool<infer PARAMETERS> ? PARAMETERS : never;
        providerExecuted?: boolean;
        dynamic?: false | undefined;
        invalid?: false | undefined;
        error?: never;
        providerMetadata?: ProviderMetadata;
    };
}>;
type DynamicToolCall = {
    type: 'tool-call';
    toolCallId: string;
    toolName: string;
    input: unknown;
    providerExecuted?: boolean;
    dynamic: true;
    providerMetadata?: ProviderMetadata;
    /**
     * True if this is caused by an unparsable tool call or
     * a tool that does not exist.
     */
    invalid?: boolean;
    /**
     * The error that caused the tool call to be invalid.
     */
    error?: unknown;
};
type TypedToolCall<TOOLS extends ToolSet> = StaticToolCall<TOOLS> | DynamicToolCall;

type StaticToolError<TOOLS extends ToolSet> = ValueOf<{
    [NAME in keyof TOOLS]: {
        type: 'tool-error';
        toolCallId: string;
        toolName: NAME & string;
        input: InferToolInput<TOOLS[NAME]>;
        error: unknown;
        providerExecuted?: boolean;
        dynamic?: false | undefined;
    };
}>;
type DynamicToolError = {
    type: 'tool-error';
    toolCallId: string;
    toolName: string;
    input: unknown;
    error: unknown;
    providerExecuted?: boolean;
    dynamic: true;
};
type TypedToolError<TOOLS extends ToolSet> = StaticToolError<TOOLS> | DynamicToolError;

type StaticToolResult<TOOLS extends ToolSet> = ValueOf<{
    [NAME in keyof TOOLS]: {
        type: 'tool-result';
        toolCallId: string;
        toolName: NAME & string;
        input: InferToolInput<TOOLS[NAME]>;
        output: InferToolOutput<TOOLS[NAME]>;
        providerExecuted?: boolean;
        dynamic?: false | undefined;
        preliminary?: boolean;
    };
}>;
type DynamicToolResult = {
    type: 'tool-result';
    toolCallId: string;
    toolName: string;
    input: unknown;
    output: unknown;
    providerExecuted?: boolean;
    dynamic: true;
    preliminary?: boolean;
};
type TypedToolResult<TOOLS extends ToolSet> = StaticToolResult<TOOLS> | DynamicToolResult;

type ContentPart<TOOLS extends ToolSet> = {
    type: 'text';
    text: string;
    providerMetadata?: ProviderMetadata;
} | ReasoningOutput | ({
    type: 'source';
} & Source) | {
    type: 'file';
    file: GeneratedFile;
    providerMetadata?: ProviderMetadata;
} | ({
    type: 'tool-call';
} & TypedToolCall<TOOLS> & {
    providerMetadata?: ProviderMetadata;
}) | ({
    type: 'tool-result';
} & TypedToolResult<TOOLS> & {
    providerMetadata?: ProviderMetadata;
}) | ({
    type: 'tool-error';
} & TypedToolError<TOOLS> & {
    providerMetadata?: ProviderMetadata;
});

/**
A message that was generated during the generation process.
It can be either an assistant message or a tool message.
 */
type ResponseMessage = AssistantModelMessage | ToolModelMessage;

/**
 * The result of a single step in the generation process.
 */
type StepResult<TOOLS extends ToolSet> = {
    /**
  The content that was generated in the last step.
     */
    readonly content: Array<ContentPart<TOOLS>>;
    /**
  The generated text.
  */
    readonly text: string;
    /**
  The reasoning that was generated during the generation.
  */
    readonly reasoning: Array<ReasoningPart>;
    /**
  The reasoning text that was generated during the generation.
  */
    readonly reasoningText: string | undefined;
    /**
  The files that were generated during the generation.
  */
    readonly files: Array<GeneratedFile>;
    /**
  The sources that were used to generate the text.
  */
    readonly sources: Array<Source>;
    /**
  The tool calls that were made during the generation.
  */
    readonly toolCalls: Array<TypedToolCall<TOOLS>>;
    /**
  The static tool calls that were made in the last step.
  */
    readonly staticToolCalls: Array<StaticToolCall<TOOLS>>;
    /**
  The dynamic tool calls that were made in the last step.
  */
    readonly dynamicToolCalls: Array<DynamicToolCall>;
    /**
  The results of the tool calls.
  */
    readonly toolResults: Array<TypedToolResult<TOOLS>>;
    /**
  The static tool results that were made in the last step.
  */
    readonly staticToolResults: Array<StaticToolResult<TOOLS>>;
    /**
  The dynamic tool results that were made in the last step.
  */
    readonly dynamicToolResults: Array<DynamicToolResult>;
    /**
  The reason why the generation finished.
  */
    readonly finishReason: FinishReason;
    /**
  The token usage of the generated text.
  */
    readonly usage: LanguageModelUsage;
    /**
  Warnings from the model provider (e.g. unsupported settings).
  */
    readonly warnings: CallWarning[] | undefined;
    /**
  Additional request information.
     */
    readonly request: LanguageModelRequestMetadata;
    /**
  Additional response information.
  */
    readonly response: LanguageModelResponseMetadata & {
        /**
    The response messages that were generated during the call.
    Response messages can be either assistant messages or tool messages.
    They contain a generated id.
    */
        readonly messages: Array<ResponseMessage>;
        /**
    Response body (available only for providers that use HTTP requests).
         */
        body?: unknown;
    };
    /**
  Additional provider-specific metadata. They are passed through
  from the provider to the AI SDK and enable provider-specific
  results that can be fully encapsulated in the provider.
     */
    readonly providerMetadata: ProviderMetadata | undefined;
};

/**
The result of a `generateText` call.
It contains the generated text, the tool calls that were made during the generation, and the results of the tool calls.
 */
interface GenerateTextResult<TOOLS extends ToolSet, OUTPUT> {
    /**
  The content that was generated in the last step.
     */
    readonly content: Array<ContentPart<TOOLS>>;
    /**
  The text that was generated in the last step.
       */
    readonly text: string;
    /**
  The full reasoning that the model has generated in the last step.
     */
    readonly reasoning: Array<ReasoningOutput>;
    /**
  The reasoning text that the model has generated in the last step. Can be undefined if the model
  has only generated text.
     */
    readonly reasoningText: string | undefined;
    /**
  The files that were generated in the last step.
  Empty array if no files were generated.
       */
    readonly files: Array<GeneratedFile>;
    /**
  Sources that have been used as references in the last step.
     */
    readonly sources: Array<Source>;
    /**
  The tool calls that were made in the last step.
     */
    readonly toolCalls: Array<TypedToolCall<TOOLS>>;
    /**
  The static tool calls that were made in the last step.
     */
    readonly staticToolCalls: Array<StaticToolCall<TOOLS>>;
    /**
  The dynamic tool calls that were made in the last step.
     */
    readonly dynamicToolCalls: Array<DynamicToolCall>;
    /**
  The results of the tool calls from the last step.
     */
    readonly toolResults: Array<TypedToolResult<TOOLS>>;
    /**
  The static tool results that were made in the last step.
     */
    readonly staticToolResults: Array<StaticToolResult<TOOLS>>;
    /**
  The dynamic tool results that were made in the last step.
     */
    readonly dynamicToolResults: Array<DynamicToolResult>;
    /**
  The reason why the generation finished.
     */
    readonly finishReason: FinishReason;
    /**
  The token usage of the last step.
     */
    readonly usage: LanguageModelUsage;
    /**
  The total token usage of all steps.
  When there are multiple steps, the usage is the sum of all step usages.
     */
    readonly totalUsage: LanguageModelUsage;
    /**
  Warnings from the model provider (e.g. unsupported settings)
     */
    readonly warnings: CallWarning[] | undefined;
    /**
  Additional request information.
     */
    readonly request: LanguageModelRequestMetadata;
    /**
  Additional response information.
     */
    readonly response: LanguageModelResponseMetadata & {
        /**
    The response messages that were generated during the call. It consists of an assistant message,
    potentially containing tool calls.
    
    When there are tool results, there is an additional tool message with the tool results that are available.
    If there are tools that do not have execute functions, they are not included in the tool results and
    need to be added separately.
           */
        messages: Array<ResponseMessage>;
        /**
    Response body (available only for providers that use HTTP requests).
         */
        body?: unknown;
    };
    /**
  Additional provider-specific metadata. They are passed through
  from the provider to the AI SDK and enable provider-specific
  results that can be fully encapsulated in the provider.
     */
    readonly providerMetadata: ProviderMetadata | undefined;
    /**
  Details for all steps.
  You can use this to get information about intermediate steps,
  such as the tool calls or the response headers.
     */
    readonly steps: Array<StepResult<TOOLS>>;
    /**
  The generated structured output. It uses the `experimental_output` specification.
     */
    readonly experimental_output: OUTPUT;
}

/**
Create a type from an object with all keys and nested keys set to optional.
The helper supports normal objects and Zod schemas (which are resolved automatically).
It always recurses into arrays.

Adopted from [type-fest](https://github.com/sindresorhus/type-fest/tree/main) PartialDeep.
 */
type DeepPartial<T> = T extends z3.ZodTypeAny ? DeepPartialInternal<z3.infer<T>> : T extends z4.core.$ZodType ? DeepPartialInternal<z4.infer<T>> : DeepPartialInternal<T>;
type DeepPartialInternal<T> = T extends null | undefined | string | number | boolean | symbol | bigint | void | Date | RegExp | ((...arguments_: any[]) => unknown) | (new (...arguments_: any[]) => unknown) ? T : T extends Map<infer KeyType, infer ValueType> ? PartialMap<KeyType, ValueType> : T extends Set<infer ItemType> ? PartialSet<ItemType> : T extends ReadonlyMap<infer KeyType, infer ValueType> ? PartialReadonlyMap<KeyType, ValueType> : T extends ReadonlySet<infer ItemType> ? PartialReadonlySet<ItemType> : T extends object ? T extends ReadonlyArray<infer ItemType> ? ItemType[] extends T ? readonly ItemType[] extends T ? ReadonlyArray<DeepPartialInternal<ItemType | undefined>> : Array<DeepPartialInternal<ItemType | undefined>> : PartialObject<T> : PartialObject<T> : unknown;
type PartialMap<KeyType, ValueType> = {} & Map<DeepPartialInternal<KeyType>, DeepPartialInternal<ValueType>>;
type PartialSet<T> = {} & Set<DeepPartialInternal<T>>;
type PartialReadonlyMap<KeyType, ValueType> = {} & ReadonlyMap<DeepPartialInternal<KeyType>, DeepPartialInternal<ValueType>>;
type PartialReadonlySet<T> = {} & ReadonlySet<DeepPartialInternal<T>>;
type PartialObject<ObjectType extends object> = {
    [KeyType in keyof ObjectType]?: DeepPartialInternal<ObjectType[KeyType]>;
};

interface Output<OUTPUT, PARTIAL> {
    readonly type: 'object' | 'text';
    responseFormat: LanguageModelV2CallOptions['responseFormat'];
    parsePartial(options: {
        text: string;
    }): Promise<{
        partial: PARTIAL;
    } | undefined>;
    parseOutput(options: {
        text: string;
    }, context: {
        response: LanguageModelResponseMetadata;
        usage: LanguageModelUsage;
        finishReason: FinishReason;
    }): Promise<OUTPUT>;
}
declare const text: () => Output<string, string>;
declare const object: <OUTPUT>({ schema: inputSchema, }: {
    schema: z4.core.$ZodType<OUTPUT, any> | z3.Schema<OUTPUT, z3.ZodTypeDef, any> | Schema<OUTPUT>;
}) => Output<OUTPUT, DeepPartial<OUTPUT>>;

type output_Output<OUTPUT, PARTIAL> = Output<OUTPUT, PARTIAL>;
declare const output_object: typeof object;
declare const output_text: typeof text;
declare namespace output {
  export {
    output_Output as Output,
    output_object as object,
    output_text as text,
  };
}

/**
Function that you can use to provide different settings for a step.

@param options - The options for the step.
@param options.steps - The steps that have been executed so far.
@param options.stepNumber - The number of the step that is being executed.
@param options.model - The model that is being used.

@returns An object that contains the settings for the step.
If you return undefined (or for undefined settings), the settings from the outer level will be used.
    */
type PrepareStepFunction<TOOLS extends Record<string, Tool> = Record<string, Tool>> = (options: {
    steps: Array<StepResult<NoInfer<TOOLS>>>;
    stepNumber: number;
    model: LanguageModel;
    messages: Array<ModelMessage>;
}) => PromiseLike<PrepareStepResult<TOOLS>> | PrepareStepResult<TOOLS>;
type PrepareStepResult<TOOLS extends Record<string, Tool> = Record<string, Tool>> = {
    model?: LanguageModel;
    toolChoice?: ToolChoice<NoInfer<TOOLS>>;
    activeTools?: Array<keyof NoInfer<TOOLS>>;
    system?: string;
    messages?: Array<ModelMessage>;
} | undefined;

type StopCondition<TOOLS extends ToolSet> = (options: {
    steps: Array<StepResult<TOOLS>>;
}) => PromiseLike<boolean> | boolean;
declare function stepCountIs(stepCount: number): StopCondition<any>;
declare function hasToolCall(toolName: string): StopCondition<any>;

declare const symbol$f: unique symbol;
declare class InvalidToolInputError extends AISDKError {
    private readonly [symbol$f];
    readonly toolName: string;
    readonly toolInput: string;
    constructor({ toolInput, toolName, cause, message, }: {
        message?: string;
        toolInput: string;
        toolName: string;
        cause: unknown;
    });
    static isInstance(error: unknown): error is InvalidToolInputError;
}

declare const symbol$e: unique symbol;
declare class NoSuchToolError extends AISDKError {
    private readonly [symbol$e];
    readonly toolName: string;
    readonly availableTools: string[] | undefined;
    constructor({ toolName, availableTools, message, }: {
        toolName: string;
        availableTools?: string[] | undefined;
        message?: string;
    });
    static isInstance(error: unknown): error is NoSuchToolError;
}

/**
@deprecated Use `SystemModelMessage` instead.
 */
type CoreSystemMessage = SystemModelMessage;
declare const systemModelMessageSchema: z.ZodType<SystemModelMessage>;
/**
@deprecated Use `systemModelMessageSchema` instead.
 */
declare const coreSystemMessageSchema: z.ZodType<SystemModelMessage, unknown, z.core.$ZodTypeInternals<SystemModelMessage, unknown>>;
/**
@deprecated Use `UserModelMessage` instead.
 */
type CoreUserMessage = UserModelMessage;
declare const userModelMessageSchema: z.ZodType<UserModelMessage>;
/**
@deprecated Use `userModelMessageSchema` instead.
 */
declare const coreUserMessageSchema: z.ZodType<UserModelMessage, unknown, z.core.$ZodTypeInternals<UserModelMessage, unknown>>;
/**
@deprecated Use `AssistantModelMessage` instead.
 */
type CoreAssistantMessage = AssistantModelMessage;
declare const assistantModelMessageSchema: z.ZodType<AssistantModelMessage>;
/**
@deprecated Use `assistantModelMessageSchema` instead.
 */
declare const coreAssistantMessageSchema: z.ZodType<AssistantModelMessage, unknown, z.core.$ZodTypeInternals<AssistantModelMessage, unknown>>;
/**
@deprecated Use `ToolModelMessage` instead.
 */
type CoreToolMessage = ToolModelMessage;
declare const toolModelMessageSchema: z.ZodType<ToolModelMessage>;
/**
@deprecated Use `toolModelMessageSchema` instead.
 */
declare const coreToolMessageSchema: z.ZodType<ToolModelMessage, unknown, z.core.$ZodTypeInternals<ToolModelMessage, unknown>>;
/**
@deprecated Use `ModelMessage` instead.
   */
type CoreMessage = ModelMessage;
declare const modelMessageSchema: z.ZodType<ModelMessage>;
/**
@deprecated Use `modelMessageSchema` instead.
 */
declare const coreMessageSchema: z.ZodType<CoreMessage>;

/**
 * A function that attempts to repair a tool call that failed to parse.
 *
 * It receives the error and the context as arguments and returns the repair
 * tool call JSON as text.
 *
 * @param options.system - The system prompt.
 * @param options.messages - The messages in the current generation step.
 * @param options.toolCall - The tool call that failed to parse.
 * @param options.tools - The tools that are available.
 * @param options.inputSchema - A function that returns the JSON Schema for a tool.
 * @param options.error - The error that occurred while parsing the tool call.
 */
type ToolCallRepairFunction<TOOLS extends ToolSet> = (options: {
    system: string | undefined;
    messages: ModelMessage[];
    toolCall: LanguageModelV2ToolCall;
    tools: TOOLS;
    inputSchema: (options: {
        toolName: string;
    }) => JSONSchema7;
    error: NoSuchToolError | InvalidToolInputError;
}) => Promise<LanguageModelV2ToolCall | null>;

/**
Callback that is set using the `onStepFinish` option.

@param stepResult - The result of the step.
 */
type GenerateTextOnStepFinishCallback<TOOLS extends ToolSet> = (stepResult: StepResult<TOOLS>) => Promise<void> | void;
/**
Generate a text and call tools for a given prompt using a language model.

This function does not stream the output. If you want to stream the output, use `streamText` instead.

@param model - The language model to use.

@param tools - Tools that are accessible to and can be called by the model. The model needs to support calling tools.
@param toolChoice - The tool choice strategy. Default: 'auto'.

@param system - A system message that will be part of the prompt.
@param prompt - A simple text prompt. You can either use `prompt` or `messages` but not both.
@param messages - A list of messages. You can either use `prompt` or `messages` but not both.

@param maxOutputTokens - Maximum number of tokens to generate.
@param temperature - Temperature setting.
The value is passed through to the provider. The range depends on the provider and model.
It is recommended to set either `temperature` or `topP`, but not both.
@param topP - Nucleus sampling.
The value is passed through to the provider. The range depends on the provider and model.
It is recommended to set either `temperature` or `topP`, but not both.
@param topK - Only sample from the top K options for each subsequent token.
Used to remove "long tail" low probability responses.
Recommended for advanced use cases only. You usually only need to use temperature.
@param presencePenalty - Presence penalty setting.
It affects the likelihood of the model to repeat information that is already in the prompt.
The value is passed through to the provider. The range depends on the provider and model.
@param frequencyPenalty - Frequency penalty setting.
It affects the likelihood of the model to repeatedly use the same words or phrases.
The value is passed through to the provider. The range depends on the provider and model.
@param stopSequences - Stop sequences.
If set, the model will stop generating text when one of the stop sequences is generated.
@param seed - The seed (integer) to use for random sampling.
If set and supported by the model, calls will generate deterministic results.

@param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
@param abortSignal - An optional abort signal that can be used to cancel the call.
@param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.

@param experimental_generateMessageId - Generate a unique ID for each message.

@param onStepFinish - Callback that is called when each step (LLM call) is finished, including intermediate steps.

@returns
A result object that contains the generated text, the results of the tool calls, and additional information.
 */
declare function generateText<TOOLS extends ToolSet, OUTPUT = never, OUTPUT_PARTIAL = never>({ model: modelArg, tools, toolChoice, system, prompt, messages, maxRetries: maxRetriesArg, abortSignal, headers, stopWhen, experimental_output: output, experimental_telemetry: telemetry, providerOptions, experimental_activeTools, activeTools, experimental_prepareStep, prepareStep, experimental_repairToolCall: repairToolCall, experimental_download: download, experimental_context, _internal: { generateId, currentDate, }, onStepFinish, ...settings }: CallSettings & Prompt & {
    /**
The language model to use.
     */
    model: LanguageModel;
    /**
The tools that the model can call. The model needs to support calling tools.
*/
    tools?: TOOLS;
    /**
The tool choice strategy. Default: 'auto'.
     */
    toolChoice?: ToolChoice<NoInfer<TOOLS>>;
    /**
Condition for stopping the generation when there are tool results in the last step.
When the condition is an array, any of the conditions can be met to stop the generation.

@default stepCountIs(1)
     */
    stopWhen?: StopCondition<NoInfer<TOOLS>> | Array<StopCondition<NoInfer<TOOLS>>>;
    /**
Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
Additional provider-specific options. They are passed through
to the provider from the AI SDK and enable provider-specific
functionality that can be fully encapsulated in the provider.
 */
    providerOptions?: ProviderOptions;
    /**
     * @deprecated Use `activeTools` instead.
     */
    experimental_activeTools?: Array<keyof NoInfer<TOOLS>>;
    /**
Limits the tools that are available for the model to call without
changing the tool call and result types in the result.
     */
    activeTools?: Array<keyof NoInfer<TOOLS>>;
    /**
Optional specification for parsing structured outputs from the LLM response.
     */
    experimental_output?: Output<OUTPUT, OUTPUT_PARTIAL>;
    /**
Custom download function to use for URLs.

By default, files are downloaded if the model does not support the URL for the given media type.
     */
    experimental_download?: DownloadFunction | undefined;
    /**
     * @deprecated Use `prepareStep` instead.
     */
    experimental_prepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;
    /**
Optional function that you can use to provide different settings for a step.
    */
    prepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;
    /**
A function that attempts to repair a tool call that failed to parse.
     */
    experimental_repairToolCall?: ToolCallRepairFunction<NoInfer<TOOLS>>;
    /**
    Callback that is called when each step (LLM call) is finished, including intermediate steps.
    */
    onStepFinish?: GenerateTextOnStepFinishCallback<NoInfer<TOOLS>>;
    /**
     * Context that is passed into tool execution.
     *
     * Experimental (can break in patch releases).
     *
     * @default undefined
     */
    experimental_context?: unknown;
    /**
     * Internal. For test use only. May change without notice.
     */
    _internal?: {
        generateId?: IdGenerator;
        currentDate?: () => Date;
    };
}): Promise<GenerateTextResult<TOOLS, OUTPUT>>;

/**
 * Detects the first chunk in a buffer.
 *
 * @param buffer - The buffer to detect the first chunk in.
 *
 * @returns The first detected chunk, or `undefined` if no chunk was detected.
 */
type ChunkDetector = (buffer: string) => string | undefined | null;
/**
 * Smooths text streaming output.
 *
 * @param delayInMs - The delay in milliseconds between each chunk. Defaults to 10ms. Can be set to `null` to skip the delay.
 * @param chunking - Controls how the text is chunked for streaming. Use "word" to stream word by word (default), "line" to stream line by line, or provide a custom RegExp pattern for custom chunking.
 *
 * @returns A transform stream that smooths text streaming output.
 */
declare function smoothStream<TOOLS extends ToolSet>({ delayInMs, chunking, _internal: { delay }, }?: {
    delayInMs?: number | null;
    chunking?: 'word' | 'line' | RegExp | ChunkDetector;
    /**
     * Internal. For test use only. May change without notice.
     */
    _internal?: {
        delay?: (delayInMs: number | null) => Promise<void>;
    };
}): (options: {
    tools: TOOLS;
}) => TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>;

/**
A transformation that is applied to the stream.

@param stopStream - A function that stops the source stream.
@param tools - The tools that are accessible to and can be called by the model. The model needs to support calling tools.
 */
type StreamTextTransform<TOOLS extends ToolSet> = (options: {
    tools: TOOLS;
    stopStream: () => void;
}) => TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>;
/**
Callback that is set using the `onError` option.

@param event - The event that is passed to the callback.
 */
type StreamTextOnErrorCallback = (event: {
    error: unknown;
}) => PromiseLike<void> | void;
/**
Callback that is set using the `onStepFinish` option.

@param stepResult - The result of the step.
 */
type StreamTextOnStepFinishCallback<TOOLS extends ToolSet> = (stepResult: StepResult<TOOLS>) => PromiseLike<void> | void;
/**
Callback that is set using the `onChunk` option.

@param event - The event that is passed to the callback.
 */
type StreamTextOnChunkCallback<TOOLS extends ToolSet> = (event: {
    chunk: Extract<TextStreamPart<TOOLS>, {
        type: 'text-delta' | 'reasoning-delta' | 'source' | 'tool-call' | 'tool-input-start' | 'tool-input-delta' | 'tool-result' | 'raw';
    }>;
}) => PromiseLike<void> | void;
/**
Callback that is set using the `onFinish` option.

@param event - The event that is passed to the callback.
 */
type StreamTextOnFinishCallback<TOOLS extends ToolSet> = (event: StepResult<TOOLS> & {
    /**
Details for all steps.
   */
    readonly steps: StepResult<TOOLS>[];
    /**
Total usage for all steps. This is the sum of the usage of all steps.
     */
    readonly totalUsage: LanguageModelUsage;
}) => PromiseLike<void> | void;
/**
Callback that is set using the `onAbort` option.

@param event - The event that is passed to the callback.
 */
type StreamTextOnAbortCallback<TOOLS extends ToolSet> = (event: {
    /**
  Details for all previously finished steps.
     */
    readonly steps: StepResult<TOOLS>[];
}) => PromiseLike<void> | void;
/**
Generate a text and call tools for a given prompt using a language model.

This function streams the output. If you do not want to stream the output, use `generateText` instead.

@param model - The language model to use.
@param tools - Tools that are accessible to and can be called by the model. The model needs to support calling tools.

@param system - A system message that will be part of the prompt.
@param prompt - A simple text prompt. You can either use `prompt` or `messages` but not both.
@param messages - A list of messages. You can either use `prompt` or `messages` but not both.

@param maxOutputTokens - Maximum number of tokens to generate.
@param temperature - Temperature setting.
The value is passed through to the provider. The range depends on the provider and model.
It is recommended to set either `temperature` or `topP`, but not both.
@param topP - Nucleus sampling.
The value is passed through to the provider. The range depends on the provider and model.
It is recommended to set either `temperature` or `topP`, but not both.
@param topK - Only sample from the top K options for each subsequent token.
Used to remove "long tail" low probability responses.
Recommended for advanced use cases only. You usually only need to use temperature.
@param presencePenalty - Presence penalty setting.
It affects the likelihood of the model to repeat information that is already in the prompt.
The value is passed through to the provider. The range depends on the provider and model.
@param frequencyPenalty - Frequency penalty setting.
It affects the likelihood of the model to repeatedly use the same words or phrases.
The value is passed through to the provider. The range depends on the provider and model.
@param stopSequences - Stop sequences.
If set, the model will stop generating text when one of the stop sequences is generated.
@param seed - The seed (integer) to use for random sampling.
If set and supported by the model, calls will generate deterministic results.

@param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
@param abortSignal - An optional abort signal that can be used to cancel the call.
@param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.

@param maxSteps - Maximum number of sequential LLM calls (steps), e.g. when you use tool calls.

@param onChunk - Callback that is called for each chunk of the stream. The stream processing will pause until the callback promise is resolved.
@param onError - Callback that is called when an error occurs during streaming. You can use it to log errors.
@param onStepFinish - Callback that is called when each step (LLM call) is finished, including intermediate steps.
@param onFinish - Callback that is called when the LLM response and all request tool executions
(for tools that have an `execute` function) are finished.

@return
A result object for accessing different stream types and additional information.
 */
declare function streamText<TOOLS extends ToolSet, OUTPUT = never, PARTIAL_OUTPUT = never>({ model, tools, toolChoice, system, prompt, messages, maxRetries, abortSignal, headers, stopWhen, experimental_output: output, experimental_telemetry: telemetry, prepareStep, providerOptions, experimental_activeTools, activeTools, experimental_repairToolCall: repairToolCall, experimental_transform: transform, experimental_download: download, includeRawChunks, onChunk, onError, onFinish, onAbort, onStepFinish, experimental_context, _internal: { now, generateId, currentDate, }, ...settings }: CallSettings & Prompt & {
    /**
The language model to use.
     */
    model: LanguageModel;
    /**
The tools that the model can call. The model needs to support calling tools.
    */
    tools?: TOOLS;
    /**
The tool choice strategy. Default: 'auto'.
     */
    toolChoice?: ToolChoice<TOOLS>;
    /**
Condition for stopping the generation when there are tool results in the last step.
When the condition is an array, any of the conditions can be met to stop the generation.

@default stepCountIs(1)
     */
    stopWhen?: StopCondition<NoInfer<TOOLS>> | Array<StopCondition<NoInfer<TOOLS>>>;
    /**
Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
Additional provider-specific options. They are passed through
to the provider from the AI SDK and enable provider-specific
functionality that can be fully encapsulated in the provider.
 */
    providerOptions?: ProviderOptions;
    /**
     * @deprecated Use `activeTools` instead.
     */
    experimental_activeTools?: Array<keyof NoInfer<TOOLS>>;
    /**
   Limits the tools that are available for the model to call without
   changing the tool call and result types in the result.
        */
    activeTools?: Array<keyof NoInfer<TOOLS>>;
    /**
Optional specification for parsing structured outputs from the LLM response.
     */
    experimental_output?: Output<OUTPUT, PARTIAL_OUTPUT>;
    /**
Optional function that you can use to provide different settings for a step.

@param options - The options for the step.
@param options.steps - The steps that have been executed so far.
@param options.stepNumber - The number of the step that is being executed.
@param options.model - The model that is being used.

@returns An object that contains the settings for the step.
If you return undefined (or for undefined settings), the settings from the outer level will be used.
    */
    prepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;
    /**
A function that attempts to repair a tool call that failed to parse.
     */
    experimental_repairToolCall?: ToolCallRepairFunction<TOOLS>;
    /**
Optional stream transformations.
They are applied in the order they are provided.
The stream transformations must maintain the stream structure for streamText to work correctly.
     */
    experimental_transform?: StreamTextTransform<TOOLS> | Array<StreamTextTransform<TOOLS>>;
    /**
Custom download function to use for URLs.

By default, files are downloaded if the model does not support the URL for the given media type.
     */
    experimental_download?: DownloadFunction | undefined;
    /**
Whether to include raw chunks from the provider in the stream.
When enabled, you will receive raw chunks with type 'raw' that contain the unprocessed data from the provider.
This allows access to cutting-edge provider features not yet wrapped by the AI SDK.
Defaults to false.
     */
    includeRawChunks?: boolean;
    /**
Callback that is called for each chunk of the stream.
The stream processing will pause until the callback promise is resolved.
     */
    onChunk?: StreamTextOnChunkCallback<TOOLS>;
    /**
Callback that is invoked when an error occurs during streaming.
You can use it to log errors.
The stream processing will pause until the callback promise is resolved.
     */
    onError?: StreamTextOnErrorCallback;
    /**
Callback that is called when the LLM response and all request tool executions
(for tools that have an `execute` function) are finished.

The usage is the combined usage of all steps.
     */
    onFinish?: StreamTextOnFinishCallback<TOOLS>;
    onAbort?: StreamTextOnAbortCallback<TOOLS>;
    /**
Callback that is called when each step (LLM call) is finished, including intermediate steps.
    */
    onStepFinish?: StreamTextOnStepFinishCallback<TOOLS>;
    /**
     * Context that is passed into tool execution.
     *
     * Experimental (can break in patch releases).
     *
     * @default undefined
     */
    experimental_context?: unknown;
    /**
Internal. For test use only. May change without notice.
     */
    _internal?: {
        now?: () => number;
        generateId?: IdGenerator;
        currentDate?: () => Date;
    };
}): StreamTextResult<TOOLS, PARTIAL_OUTPUT>;

/**
The data types that can be used in the UI message for the UI message data parts.
 */
type UIDataTypes = Record<string, unknown>;
type UITool = {
    input: unknown;
    output: unknown | undefined;
};
/**
 * Infer the input and output types of a tool so it can be used as a UI tool.
 */
type InferUITool<TOOL extends Tool> = {
    input: InferToolInput<TOOL>;
    output: InferToolOutput<TOOL>;
};
/**
 * Infer the input and output types of a tool set so it can be used as a UI tool set.
 */
type InferUITools<TOOLS extends ToolSet> = {
    [NAME in keyof TOOLS & string]: InferUITool<TOOLS[NAME]>;
};
type UITools = Record<string, UITool>;
/**
AI SDK UI Messages. They are used in the client and to communicate between the frontend and the API routes.
 */
interface UIMessage<METADATA = unknown, DATA_PARTS extends UIDataTypes = UIDataTypes, TOOLS extends UITools = UITools> {
    /**
  A unique identifier for the message.
     */
    id: string;
    /**
  The role of the message.
     */
    role: 'system' | 'user' | 'assistant';
    /**
  The metadata of the message.
     */
    metadata?: METADATA;
    /**
  The parts of the message. Use this for rendering the message in the UI.
  
  System messages should be avoided (set the system prompt on the server instead).
  They can have text parts.
  
  User messages can have text parts and file parts.
  
  Assistant messages can have text, reasoning, tool invocation, and file parts.
     */
    parts: Array<UIMessagePart<DATA_PARTS, TOOLS>>;
}
type UIMessagePart<DATA_TYPES extends UIDataTypes, TOOLS extends UITools> = TextUIPart | ReasoningUIPart | ToolUIPart<TOOLS> | DynamicToolUIPart | SourceUrlUIPart | SourceDocumentUIPart | FileUIPart | DataUIPart<DATA_TYPES> | StepStartUIPart;
/**
 * A text part of a message.
 */
type TextUIPart = {
    type: 'text';
    /**
     * The text content.
     */
    text: string;
    /**
     * The state of the text part.
     */
    state?: 'streaming' | 'done';
    /**
     * The provider metadata.
     */
    providerMetadata?: ProviderMetadata;
};
/**
 * A reasoning part of a message.
 */
type ReasoningUIPart = {
    type: 'reasoning';
    /**
     * The reasoning text.
     */
    text: string;
    /**
     * The state of the reasoning part.
     */
    state?: 'streaming' | 'done';
    /**
     * The provider metadata.
     */
    providerMetadata?: ProviderMetadata;
};
/**
 * A source part of a message.
 */
type SourceUrlUIPart = {
    type: 'source-url';
    sourceId: string;
    url: string;
    title?: string;
    providerMetadata?: ProviderMetadata;
};
/**
 * A document source part of a message.
 */
type SourceDocumentUIPart = {
    type: 'source-document';
    sourceId: string;
    mediaType: string;
    title: string;
    filename?: string;
    providerMetadata?: ProviderMetadata;
};
/**
 * A file part of a message.
 */
type FileUIPart = {
    type: 'file';
    /**
     * IANA media type of the file.
     *
     * @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    mediaType: string;
    /**
     * Optional filename of the file.
     */
    filename?: string;
    /**
     * The URL of the file.
     * It can either be a URL to a hosted file or a [Data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs).
     */
    url: string;
    /**
     * The provider metadata.
     */
    providerMetadata?: ProviderMetadata;
};
/**
 * A step boundary part of a message.
 */
type StepStartUIPart = {
    type: 'step-start';
};
type DataUIPart<DATA_TYPES extends UIDataTypes> = ValueOf<{
    [NAME in keyof DATA_TYPES & string]: {
        type: `data-${NAME}`;
        id?: string;
        data: DATA_TYPES[NAME];
    };
}>;
type asUITool<TOOL extends UITool | Tool> = TOOL extends Tool ? InferUITool<TOOL> : TOOL;
/**
 * A UI tool invocation contains all the information needed to render a tool invocation in the UI.
 * It can be derived from a tool without knowing the tool name, and can be used to define
 * UI components for the tool.
 */
type UIToolInvocation<TOOL extends UITool | Tool> = {
    toolCallId: string;
} & ({
    state: 'input-streaming';
    input: DeepPartial<asUITool<TOOL>['input']> | undefined;
    providerExecuted?: boolean;
    output?: never;
    errorText?: never;
} | {
    state: 'input-available';
    input: asUITool<TOOL>['input'];
    providerExecuted?: boolean;
    output?: never;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
} | {
    state: 'output-available';
    input: asUITool<TOOL>['input'];
    output: asUITool<TOOL>['output'];
    errorText?: never;
    providerExecuted?: boolean;
    callProviderMetadata?: ProviderMetadata;
    preliminary?: boolean;
} | {
    state: 'output-error';
    input: asUITool<TOOL>['input'] | undefined;
    rawInput?: unknown;
    output?: never;
    errorText: string;
    providerExecuted?: boolean;
    callProviderMetadata?: ProviderMetadata;
});
type ToolUIPart<TOOLS extends UITools = UITools> = ValueOf<{
    [NAME in keyof TOOLS & string]: {
        type: `tool-${NAME}`;
    } & UIToolInvocation<TOOLS[NAME]>;
}>;
type DynamicToolUIPart = {
    type: 'dynamic-tool';
    toolName: string;
    toolCallId: string;
} & ({
    state: 'input-streaming';
    input: unknown | undefined;
    output?: never;
    errorText?: never;
} | {
    state: 'input-available';
    input: unknown;
    output?: never;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
} | {
    state: 'output-available';
    input: unknown;
    output: unknown;
    errorText?: never;
    callProviderMetadata?: ProviderMetadata;
    preliminary?: boolean;
} | {
    state: 'output-error';
    input: unknown;
    output?: never;
    errorText: string;
    callProviderMetadata?: ProviderMetadata;
});
declare function isToolUIPart<TOOLS extends UITools>(part: UIMessagePart<UIDataTypes, TOOLS>): part is ToolUIPart<TOOLS>;
declare function isToolOrDynamicToolUIPart<TOOLS extends UITools>(part: UIMessagePart<UIDataTypes, TOOLS>): part is ToolUIPart<TOOLS> | DynamicToolUIPart;
declare function getToolName<TOOLS extends UITools>(part: ToolUIPart<TOOLS>): keyof TOOLS;
declare function getToolOrDynamicToolName(part: ToolUIPart<UITools> | DynamicToolUIPart): string;
type InferUIMessageMetadata<T extends UIMessage> = T extends UIMessage<infer METADATA> ? METADATA : unknown;
type InferUIMessageData<T extends UIMessage> = T extends UIMessage<unknown, infer DATA_TYPES> ? DATA_TYPES : UIDataTypes;
type InferUIMessageTools<T extends UIMessage> = T extends UIMessage<unknown, UIDataTypes, infer TOOLS> ? TOOLS : UITools;
type InferUIMessageToolCall<UI_MESSAGE extends UIMessage> = ValueOf<{
    [NAME in keyof InferUIMessageTools<UI_MESSAGE>]: ToolCall<NAME & string, InferUIMessageTools<UI_MESSAGE>[NAME] extends {
        input: infer INPUT;
    } ? INPUT : never> & {
        dynamic?: false;
    };
}> | (ToolCall<string, unknown> & {
    dynamic: true;
});

declare const uiMessageChunkSchema: z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodLiteral<"text-start">;
    id: z.ZodString;
    providerMetadata: z.ZodOptional<z.ZodType<_ai_sdk_provider.SharedV2ProviderMetadata, unknown, z.core.$ZodTypeInternals<_ai_sdk_provider.SharedV2ProviderMetadata, unknown>>>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"text-delta">;
    id: z.ZodString;
    delta: z.ZodString;
    providerMetadata: z.ZodOptional<z.ZodType<_ai_sdk_provider.SharedV2ProviderMetadata, unknown, z.core.$ZodTypeInternals<_ai_sdk_provider.SharedV2ProviderMetadata, unknown>>>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"text-end">;
    id: z.ZodString;
    providerMetadata: z.ZodOptional<z.ZodType<_ai_sdk_provider.SharedV2ProviderMetadata, unknown, z.core.$ZodTypeInternals<_ai_sdk_provider.SharedV2ProviderMetadata, unknown>>>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"error">;
    errorText: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"tool-input-start">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    providerExecuted: z.ZodOptional<z.ZodBoolean>;
    dynamic: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"tool-input-delta">;
    toolCallId: z.ZodString;
    inputTextDelta: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"tool-input-available">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    input: z.ZodUnknown;
    providerExecuted: z.ZodOptional<z.ZodBoolean>;
    providerMetadata: z.ZodOptional<z.ZodType<_ai_sdk_provider.SharedV2ProviderMetadata, unknown, z.core.$ZodTypeInternals<_ai_sdk_provider.SharedV2ProviderMetadata, unknown>>>;
    dynamic: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"tool-input-error">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    input: z.ZodUnknown;
    providerExecuted: z.ZodOptional<z.ZodBoolean>;
    providerMetadata: z.ZodOptional<z.ZodType<_ai_sdk_provider.SharedV2ProviderMetadata, unknown, z.core.$ZodTypeInternals<_ai_sdk_provider.SharedV2ProviderMetadata, unknown>>>;
    dynamic: z.ZodOptional<z.ZodBoolean>;
    errorText: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"tool-output-available">;
    toolCallId: z.ZodString;
    output: z.ZodUnknown;
    providerExecuted: z.ZodOptional<z.ZodBoolean>;
    dynamic: z.ZodOptional<z.ZodBoolean>;
    preliminary: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"tool-output-error">;
    toolCallId: z.ZodString;
    errorText: z.ZodString;
    providerExecuted: z.ZodOptional<z.ZodBoolean>;
    dynamic: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"reasoning-start">;
    id: z.ZodString;
    providerMetadata: z.ZodOptional<z.ZodType<_ai_sdk_provider.SharedV2ProviderMetadata, unknown, z.core.$ZodTypeInternals<_ai_sdk_provider.SharedV2ProviderMetadata, unknown>>>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"reasoning-delta">;
    id: z.ZodString;
    delta: z.ZodString;
    providerMetadata: z.ZodOptional<z.ZodType<_ai_sdk_provider.SharedV2ProviderMetadata, unknown, z.core.$ZodTypeInternals<_ai_sdk_provider.SharedV2ProviderMetadata, unknown>>>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"reasoning-end">;
    id: z.ZodString;
    providerMetadata: z.ZodOptional<z.ZodType<_ai_sdk_provider.SharedV2ProviderMetadata, unknown, z.core.$ZodTypeInternals<_ai_sdk_provider.SharedV2ProviderMetadata, unknown>>>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"source-url">;
    sourceId: z.ZodString;
    url: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    providerMetadata: z.ZodOptional<z.ZodType<_ai_sdk_provider.SharedV2ProviderMetadata, unknown, z.core.$ZodTypeInternals<_ai_sdk_provider.SharedV2ProviderMetadata, unknown>>>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"source-document">;
    sourceId: z.ZodString;
    mediaType: z.ZodString;
    title: z.ZodString;
    filename: z.ZodOptional<z.ZodString>;
    providerMetadata: z.ZodOptional<z.ZodType<_ai_sdk_provider.SharedV2ProviderMetadata, unknown, z.core.$ZodTypeInternals<_ai_sdk_provider.SharedV2ProviderMetadata, unknown>>>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"file">;
    url: z.ZodString;
    mediaType: z.ZodString;
    providerMetadata: z.ZodOptional<z.ZodType<_ai_sdk_provider.SharedV2ProviderMetadata, unknown, z.core.$ZodTypeInternals<_ai_sdk_provider.SharedV2ProviderMetadata, unknown>>>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodCustom<`data-${string}`, `data-${string}`>;
    id: z.ZodOptional<z.ZodString>;
    data: z.ZodUnknown;
    transient: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"start-step">;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"finish-step">;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"start">;
    messageId: z.ZodOptional<z.ZodString>;
    messageMetadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"finish">;
    messageMetadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"abort">;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"message-metadata">;
    messageMetadata: z.ZodUnknown;
}, z.core.$strict>]>;
type DataUIMessageChunk<DATA_TYPES extends UIDataTypes> = ValueOf<{
    [NAME in keyof DATA_TYPES & string]: {
        type: `data-${NAME}`;
        id?: string;
        data: DATA_TYPES[NAME];
        transient?: boolean;
    };
}>;
type UIMessageChunk<METADATA = unknown, DATA_TYPES extends UIDataTypes = UIDataTypes> = {
    type: 'text-start';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'text-delta';
    delta: string;
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'text-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'reasoning-start';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'reasoning-delta';
    id: string;
    delta: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'reasoning-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'error';
    errorText: string;
} | {
    type: 'tool-input-available';
    toolCallId: string;
    toolName: string;
    input: unknown;
    providerExecuted?: boolean;
    providerMetadata?: ProviderMetadata;
    dynamic?: boolean;
} | {
    type: 'tool-input-error';
    toolCallId: string;
    toolName: string;
    input: unknown;
    providerExecuted?: boolean;
    providerMetadata?: ProviderMetadata;
    dynamic?: boolean;
    errorText: string;
} | {
    type: 'tool-output-available';
    toolCallId: string;
    output: unknown;
    providerExecuted?: boolean;
    dynamic?: boolean;
    preliminary?: boolean;
} | {
    type: 'tool-output-error';
    toolCallId: string;
    errorText: string;
    providerExecuted?: boolean;
    dynamic?: boolean;
} | {
    type: 'tool-input-start';
    toolCallId: string;
    toolName: string;
    providerExecuted?: boolean;
    dynamic?: boolean;
} | {
    type: 'tool-input-delta';
    toolCallId: string;
    inputTextDelta: string;
} | {
    type: 'source-url';
    sourceId: string;
    url: string;
    title?: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'source-document';
    sourceId: string;
    mediaType: string;
    title: string;
    filename?: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'file';
    url: string;
    mediaType: string;
    providerMetadata?: ProviderMetadata;
} | DataUIMessageChunk<DATA_TYPES> | {
    type: 'start-step';
} | {
    type: 'finish-step';
} | {
    type: 'start';
    messageId?: string;
    messageMetadata?: METADATA;
} | {
    type: 'finish';
    messageMetadata?: METADATA;
} | {
    type: 'abort';
} | {
    type: 'message-metadata';
    messageMetadata: METADATA;
};
type InferUIMessageChunk<T extends UIMessage> = UIMessageChunk<InferUIMessageMetadata<T>, InferUIMessageData<T>>;

type UIMessageStreamOnFinishCallback<UI_MESSAGE extends UIMessage> = (event: {
    /**
     * The updated list of UI messages.
     */
    messages: UI_MESSAGE[];
    /**
     * Indicates whether the response message is a continuation of the last original message,
     * or if a new message was created.
     */
    isContinuation: boolean;
    /**
     * Indicates whether the stream was aborted.
     */
    isAborted: boolean;
    /**
     * The message that was sent to the client as a response
     * (including the original message if it was extended).
     */
    responseMessage: UI_MESSAGE;
}) => PromiseLike<void> | void;

type UIMessageStreamResponseInit = ResponseInit & {
    consumeSseStream?: (options: {
        stream: ReadableStream<string>;
    }) => PromiseLike<void> | void;
};

/**
 * A type that combines AsyncIterable and ReadableStream.
 * This allows a ReadableStream to be consumed using for-await-of syntax.
 */
type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

type ErrorHandler = (error: unknown) => void;

type UIMessageStreamOptions<UI_MESSAGE extends UIMessage> = {
    /**
     * The original messages. If they are provided, persistence mode is assumed,
     * and a message ID is provided for the response message.
     */
    originalMessages?: UI_MESSAGE[];
    /**
     * Generate a message ID for the response message.
     *
     * If not provided, no message ID will be set for the response message (unless
     * the original messages are provided and the last message is an assistant message).
     */
    generateMessageId?: IdGenerator;
    onFinish?: UIMessageStreamOnFinishCallback<UI_MESSAGE>;
    /**
     * Extracts message metadata that will be send to the client.
     *
     * Called on `start` and `finish` events.
     */
    messageMetadata?: (options: {
        part: TextStreamPart<ToolSet>;
    }) => InferUIMessageMetadata<UI_MESSAGE> | undefined;
    /**
     * Send reasoning parts to the client.
     * Default to true.
     */
    sendReasoning?: boolean;
    /**
     * Send source parts to the client.
     * Default to false.
     */
    sendSources?: boolean;
    /**
     * Send the finish event to the client.
     * Set to false if you are using additional streamText calls
     * that send additional data.
     * Default to true.
     */
    sendFinish?: boolean;
    /**
     * Send the message start event to the client.
     * Set to false if you are using additional streamText calls
     * and the message start event has already been sent.
     * Default to true.
     */
    sendStart?: boolean;
    /**
     * Process an error, e.g. to log it. Default to `() => 'An error occurred.'`.
     *
     * @return error message to include in the data stream.
     */
    onError?: (error: unknown) => string;
};
type ConsumeStreamOptions = {
    onError?: ErrorHandler;
};
/**
A result object for accessing different stream types and additional information.
 */
interface StreamTextResult<TOOLS extends ToolSet, PARTIAL_OUTPUT> {
    /**
  The content that was generated in the last step.
  
  Automatically consumes the stream.
     */
    readonly content: Promise<Array<ContentPart<TOOLS>>>;
    /**
  The full text that has been generated by the last step.
  
  Automatically consumes the stream.
       */
    readonly text: Promise<string>;
    /**
  The full reasoning that the model has generated.
  
  Automatically consumes the stream.
     */
    readonly reasoning: Promise<Array<ReasoningOutput>>;
    /**
  The reasoning that has been generated by the last step.
  
  Automatically consumes the stream.
       */
    readonly reasoningText: Promise<string | undefined>;
    /**
  Files that have been generated by the model in the last step.
  
  Automatically consumes the stream.
     */
    readonly files: Promise<GeneratedFile[]>;
    /**
  Sources that have been used as references in the last step.
  
  Automatically consumes the stream.
     */
    readonly sources: Promise<Source[]>;
    /**
  The tool calls that have been executed in the last step.
  
  Automatically consumes the stream.
       */
    readonly toolCalls: Promise<TypedToolCall<TOOLS>[]>;
    /**
  The static tool calls that have been executed in the last step.
  
  Automatically consumes the stream.
       */
    readonly staticToolCalls: Promise<StaticToolCall<TOOLS>[]>;
    /**
  The dynamic tool calls that have been executed in the last step.
  
  Automatically consumes the stream.
       */
    readonly dynamicToolCalls: Promise<DynamicToolCall[]>;
    /**
  The static tool results that have been generated in the last step.
  
  Automatically consumes the stream.
       */
    readonly staticToolResults: Promise<StaticToolResult<TOOLS>[]>;
    /**
  The dynamic tool results that have been generated in the last step.
  
  Automatically consumes the stream.
       */
    readonly dynamicToolResults: Promise<DynamicToolResult[]>;
    /**
  The tool results that have been generated in the last step.
  
  Automatically consumes the stream.
     */
    readonly toolResults: Promise<TypedToolResult<TOOLS>[]>;
    /**
  The reason why the generation finished. Taken from the last step.
  
  Automatically consumes the stream.
       */
    readonly finishReason: Promise<FinishReason>;
    /**
  The token usage of the last step.
  
  Automatically consumes the stream.
     */
    readonly usage: Promise<LanguageModelUsage>;
    /**
  The total token usage of the generated response.
  When there are multiple steps, the usage is the sum of all step usages.
  
  Automatically consumes the stream.
       */
    readonly totalUsage: Promise<LanguageModelUsage>;
    /**
  Warnings from the model provider (e.g. unsupported settings) for the first step.
  
  Automatically consumes the stream.
       */
    readonly warnings: Promise<CallWarning[] | undefined>;
    /**
  Details for all steps.
  You can use this to get information about intermediate steps,
  such as the tool calls or the response headers.
  
  Automatically consumes the stream.
     */
    readonly steps: Promise<Array<StepResult<TOOLS>>>;
    /**
  Additional request information from the last step.
  
  Automatically consumes the stream.
   */
    readonly request: Promise<LanguageModelRequestMetadata>;
    /**
  Additional response information from the last step.
  
  Automatically consumes the stream.
   */
    readonly response: Promise<LanguageModelResponseMetadata & {
        /**
  The response messages that were generated during the call. It consists of an assistant message,
  potentially containing tool calls.
  
  When there are tool results, there is an additional tool message with the tool results that are available.
  If there are tools that do not have execute functions, they are not included in the tool results and
  need to be added separately.
         */
        messages: Array<ResponseMessage>;
    }>;
    /**
  Additional provider-specific metadata from the last step.
  Metadata is passed through from the provider to the AI SDK and
  enables provider-specific results that can be fully encapsulated in the provider.
     */
    readonly providerMetadata: Promise<ProviderMetadata | undefined>;
    /**
    A text stream that returns only the generated text deltas. You can use it
    as either an AsyncIterable or a ReadableStream. When an error occurs, the
    stream will throw the error.
       */
    readonly textStream: AsyncIterableStream<string>;
    /**
    A stream with all events, including text deltas, tool calls, tool results, and
    errors.
    You can use it as either an AsyncIterable or a ReadableStream.
    Only errors that stop the stream, such as network errors, are thrown.
       */
    readonly fullStream: AsyncIterableStream<TextStreamPart<TOOLS>>;
    /**
  A stream of partial outputs. It uses the `experimental_output` specification.
     */
    readonly experimental_partialOutputStream: AsyncIterableStream<PARTIAL_OUTPUT>;
    /**
  Consumes the stream without processing the parts.
  This is useful to force the stream to finish.
  It effectively removes the backpressure and allows the stream to finish,
  triggering the `onFinish` callback and the promise resolution.
  
  If an error occurs, it is passed to the optional `onError` callback.
    */
    consumeStream(options?: ConsumeStreamOptions): Promise<void>;
    /**
  Converts the result to a UI message stream.
  
  @return A UI message stream.
       */
    toUIMessageStream<UI_MESSAGE extends UIMessage>(options?: UIMessageStreamOptions<UI_MESSAGE>): AsyncIterableStream<InferUIMessageChunk<UI_MESSAGE>>;
    /**
     *Writes UI message stream output to a Node.js response-like object.
     */
    pipeUIMessageStreamToResponse<UI_MESSAGE extends UIMessage>(response: ServerResponse, options?: UIMessageStreamResponseInit & UIMessageStreamOptions<UI_MESSAGE>): void;
    /**
  Writes text delta output to a Node.js response-like object.
  It sets a `Content-Type` header to `text/plain; charset=utf-8` and
  writes each text delta as a separate chunk.
  
  @param response A Node.js response-like object (ServerResponse).
  @param init Optional headers, status code, and status text.
       */
    pipeTextStreamToResponse(response: ServerResponse, init?: ResponseInit): void;
    /**
  Converts the result to a streamed response object with a stream data part stream.
  
  @return A response object.
       */
    toUIMessageStreamResponse<UI_MESSAGE extends UIMessage>(options?: UIMessageStreamResponseInit & UIMessageStreamOptions<UI_MESSAGE>): Response;
    /**
    Creates a simple text stream response.
    Each text delta is encoded as UTF-8 and sent as a separate chunk.
    Non-text-delta events are ignored.
    @param init Optional headers, status code, and status text.
       */
    toTextStreamResponse(init?: ResponseInit): Response;
}
type TextStreamPart<TOOLS extends ToolSet> = {
    type: 'text-start';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'text-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'text-delta';
    id: string;
    providerMetadata?: ProviderMetadata;
    text: string;
} | {
    type: 'reasoning-start';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'reasoning-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'reasoning-delta';
    providerMetadata?: ProviderMetadata;
    id: string;
    text: string;
} | {
    type: 'tool-input-start';
    id: string;
    toolName: string;
    providerMetadata?: ProviderMetadata;
    providerExecuted?: boolean;
    dynamic?: boolean;
} | {
    type: 'tool-input-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'tool-input-delta';
    id: string;
    delta: string;
    providerMetadata?: ProviderMetadata;
} | ({
    type: 'source';
} & Source) | {
    type: 'file';
    file: GeneratedFile;
} | ({
    type: 'tool-call';
} & TypedToolCall<TOOLS>) | ({
    type: 'tool-result';
} & TypedToolResult<TOOLS>) | ({
    type: 'tool-error';
} & TypedToolError<TOOLS>) | {
    type: 'start-step';
    request: LanguageModelRequestMetadata;
    warnings: CallWarning[];
} | {
    type: 'finish-step';
    response: LanguageModelResponseMetadata;
    usage: LanguageModelUsage;
    finishReason: FinishReason;
    providerMetadata: ProviderMetadata | undefined;
} | {
    type: 'start';
} | {
    type: 'finish';
    finishReason: FinishReason;
    totalUsage: LanguageModelUsage;
} | {
    type: 'abort';
} | {
    type: 'error';
    error: unknown;
} | {
    type: 'raw';
    rawValue: unknown;
};

type AgentSettings<TOOLS extends ToolSet, OUTPUT = never, OUTPUT_PARTIAL = never> = CallSettings & {
    /**
     * The system prompt to use.
     */
    system?: string;
    /**
  The language model to use.
     */
    model: LanguageModel;
    /**
  The tools that the model can call. The model needs to support calling tools.
  */
    tools?: TOOLS;
    /**
  The tool choice strategy. Default: 'auto'.
     */
    toolChoice?: ToolChoice<NoInfer<TOOLS>>;
    /**
  Condition for stopping the generation when there are tool results in the last step.
  When the condition is an array, any of the conditions can be met to stop the generation.
  
  @default stepCountIs(1)
     */
    stopWhen?: StopCondition<NoInfer<TOOLS>> | Array<StopCondition<NoInfer<TOOLS>>>;
    /**
  Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
  Limits the tools that are available for the model to call without
  changing the tool call and result types in the result.
     */
    activeTools?: Array<keyof NoInfer<TOOLS>>;
    /**
  Optional specification for parsing structured outputs from the LLM response.
     */
    experimental_output?: Output<OUTPUT, OUTPUT_PARTIAL>;
    /**
     * @deprecated Use `prepareStep` instead.
     */
    experimental_prepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;
    /**
  Optional function that you can use to provide different settings for a step.
    */
    prepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;
    /**
  A function that attempts to repair a tool call that failed to parse.
     */
    experimental_repairToolCall?: ToolCallRepairFunction<NoInfer<TOOLS>>;
    /**
    Callback that is called when each step (LLM call) is finished, including intermediate steps.
    */
    onStepFinish?: GenerateTextOnStepFinishCallback<NoInfer<TOOLS>>;
    /**
     * Context that is passed into tool calls.
     *
     * Experimental (can break in patch releases).
     *
     * @default undefined
     */
    experimental_context?: unknown;
    /**
     * Internal. For test use only. May change without notice.
     */
    _internal?: {
        generateId?: IdGenerator;
        currentDate?: () => Date;
    };
};
declare class Agent<TOOLS extends ToolSet, OUTPUT = never, OUTPUT_PARTIAL = never> {
    private readonly settings;
    constructor(settings: AgentSettings<TOOLS, OUTPUT, OUTPUT_PARTIAL>);
    get tools(): TOOLS;
    generate(options: Prompt & {
        /**
  Additional provider-specific metadata. They are passed through
  from the provider to the AI SDK and enable provider-specific
  results that can be fully encapsulated in the provider.
     */
        providerMetadata?: ProviderMetadata;
        /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
           */
        providerOptions?: ProviderOptions;
    }): Promise<GenerateTextResult<TOOLS, OUTPUT>>;
    stream(options: Prompt & {
        /**
  Additional provider-specific metadata. They are passed through
  from the provider to the AI SDK and enable provider-specific
  results that can be fully encapsulated in the provider.
     */
        providerMetadata?: ProviderMetadata;
        /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
           */
        providerOptions?: ProviderOptions;
    }): StreamTextResult<TOOLS, OUTPUT_PARTIAL>;
    /**
     * Creates a response object that streams UI messages to the client.
     */
    respond(options: {
        messages: UIMessage<never, never, InferUITools<TOOLS>>[];
    }): Response;
}
type InferAgentTools<AGENT> = AGENT extends Agent<infer TOOLS, any, any> ? TOOLS : never;
/**
 * Infer the UI message type of an agent.
 */
type InferAgentUIMessage<AGENT> = UIMessage<never, never, InferUITools<InferAgentTools<AGENT>>>;

/**
The result of an `embed` call.
It contains the embedding, the value, and additional information.
 */
interface EmbedResult<VALUE> {
    /**
    The value that was embedded.
       */
    readonly value: VALUE;
    /**
    The embedding of the value.
      */
    readonly embedding: Embedding;
    /**
    The embedding token usage.
      */
    readonly usage: EmbeddingModelUsage;
    /**
    Optional provider-specific metadata.
       */
    readonly providerMetadata?: ProviderMetadata;
    /**
    Optional response data.
       */
    readonly response?: {
        /**
      Response headers.
           */
        headers?: Record<string, string>;
        /**
        The response body.
        */
        body?: unknown;
    };
}

/**
Embed a value using an embedding model. The type of the value is defined by the embedding model.

@param model - The embedding model to use.
@param value - The value that should be embedded.

@param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
@param abortSignal - An optional abort signal that can be used to cancel the call.
@param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.

@returns A result object that contains the embedding, the value, and additional information.
 */
declare function embed<VALUE = string>({ model: modelArg, value, providerOptions, maxRetries: maxRetriesArg, abortSignal, headers, experimental_telemetry: telemetry, }: {
    /**
  The embedding model to use.
       */
    model: EmbeddingModel<VALUE>;
    /**
  The value that should be embedded.
     */
    value: VALUE;
    /**
  Maximum number of retries per embedding model call. Set to 0 to disable retries.
  
  @default 2
     */
    maxRetries?: number;
    /**
  Abort signal.
   */
    abortSignal?: AbortSignal;
    /**
  Additional headers to include in the request.
  Only applicable for HTTP-based providers.
   */
    headers?: Record<string, string>;
    /**
    Additional provider-specific options. They are passed through
    to the provider from the AI SDK and enable provider-specific
    functionality that can be fully encapsulated in the provider.
    */
    providerOptions?: ProviderOptions;
    /**
     * Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
}): Promise<EmbedResult<VALUE>>;

/**
The result of a `embedMany` call.
It contains the embeddings, the values, and additional information.
 */
interface EmbedManyResult<VALUE> {
    /**
    The values that were embedded.
       */
    readonly values: Array<VALUE>;
    /**
    The embeddings. They are in the same order as the values.
      */
    readonly embeddings: Array<Embedding>;
    /**
    The embedding token usage.
      */
    readonly usage: EmbeddingModelUsage;
    /**
    Optional provider-specific metadata.
       */
    readonly providerMetadata?: ProviderMetadata;
    /**
    Optional raw response data.
       */
    readonly responses?: Array<{
        /**
  Response headers.
       */
        headers?: Record<string, string>;
        /**
    The response body.
    */
        body?: unknown;
    } | undefined>;
}

/**
Embed several values using an embedding model. The type of the value is defined
by the embedding model.

`embedMany` automatically splits large requests into smaller chunks if the model
has a limit on how many embeddings can be generated in a single call.

@param model - The embedding model to use.
@param values - The values that should be embedded.

@param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
@param abortSignal - An optional abort signal that can be used to cancel the call.
@param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.

@returns A result object that contains the embeddings, the value, and additional information.
 */
declare function embedMany<VALUE = string>({ model: modelArg, values, maxParallelCalls, maxRetries: maxRetriesArg, abortSignal, headers, providerOptions, experimental_telemetry: telemetry, }: {
    /**
  The embedding model to use.
       */
    model: EmbeddingModel<VALUE>;
    /**
  The values that should be embedded.
     */
    values: Array<VALUE>;
    /**
  Maximum number of retries per embedding model call. Set to 0 to disable retries.
  
  @default 2
     */
    maxRetries?: number;
    /**
  Abort signal.
   */
    abortSignal?: AbortSignal;
    /**
  Additional headers to include in the request.
  Only applicable for HTTP-based providers.
   */
    headers?: Record<string, string>;
    /**
     * Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
    Additional provider-specific options. They are passed through
    to the provider from the AI SDK and enable provider-specific
    functionality that can be fully encapsulated in the provider.
    */
    providerOptions?: ProviderOptions;
    /**
     * Maximum number of concurrent requests.
     *
     * @default Infinity
     */
    maxParallelCalls?: number;
}): Promise<EmbedManyResult<VALUE>>;

declare const symbol$d: unique symbol;
declare class InvalidArgumentError extends AISDKError {
    private readonly [symbol$d];
    readonly parameter: string;
    readonly value: unknown;
    constructor({ parameter, value, message, }: {
        parameter: string;
        value: unknown;
        message: string;
    });
    static isInstance(error: unknown): error is InvalidArgumentError;
}

type SingleRequestTextStreamPart<TOOLS extends ToolSet> = {
    type: 'text-start';
    providerMetadata?: ProviderMetadata;
    id: string;
} | {
    type: 'text-delta';
    id: string;
    providerMetadata?: ProviderMetadata;
    delta: string;
} | {
    type: 'text-end';
    providerMetadata?: ProviderMetadata;
    id: string;
} | {
    type: 'reasoning-start';
    providerMetadata?: ProviderMetadata;
    id: string;
} | {
    type: 'reasoning-delta';
    id: string;
    providerMetadata?: ProviderMetadata;
    delta: string;
} | {
    type: 'reasoning-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'tool-input-start';
    id: string;
    toolName: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'tool-input-delta';
    id: string;
    delta: string;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'tool-input-end';
    id: string;
    providerMetadata?: ProviderMetadata;
} | ({
    type: 'source';
} & Source) | {
    type: 'file';
    file: GeneratedFile;
} | ({
    type: 'tool-call';
} & TypedToolCall<TOOLS>) | ({
    type: 'tool-result';
} & TypedToolResult<TOOLS>) | ({
    type: 'tool-error';
} & TypedToolError<TOOLS>) | {
    type: 'file';
    file: GeneratedFile;
} | {
    type: 'stream-start';
    warnings: LanguageModelV2CallWarning[];
} | {
    type: 'response-metadata';
    id?: string;
    timestamp?: Date;
    modelId?: string;
} | {
    type: 'finish';
    finishReason: FinishReason;
    usage: LanguageModelUsage;
    providerMetadata?: ProviderMetadata;
} | {
    type: 'error';
    error: unknown;
} | {
    type: 'raw';
    rawValue: unknown;
};

declare const symbol$c: unique symbol;
declare class InvalidStreamPartError extends AISDKError {
    private readonly [symbol$c];
    readonly chunk: SingleRequestTextStreamPart<any>;
    constructor({ chunk, message, }: {
        chunk: SingleRequestTextStreamPart<any>;
        message: string;
    });
    static isInstance(error: unknown): error is InvalidStreamPartError;
}

declare const symbol$b: unique symbol;
/**
 * An error occurred with the MCP client.
 */
declare class MCPClientError extends AISDKError {
    private readonly [symbol$b];
    constructor({ name, message, cause, }: {
        name?: string;
        message: string;
        cause?: unknown;
    });
    static isInstance(error: unknown): error is MCPClientError;
}

declare const symbol$a: unique symbol;
/**
Thrown when no image could be generated. This can have multiple causes:

- The model failed to generate a response.
- The model generated a response that could not be parsed.
 */
declare class NoImageGeneratedError extends AISDKError {
    private readonly [symbol$a];
    /**
  The response metadata for each call.
     */
    readonly responses: Array<ImageModelResponseMetadata> | undefined;
    constructor({ message, cause, responses, }: {
        message?: string;
        cause?: Error;
        responses?: Array<ImageModelResponseMetadata>;
    });
    static isInstance(error: unknown): error is NoImageGeneratedError;
}

declare const symbol$9: unique symbol;
/**
Thrown when no object could be generated. This can have several causes:

- The model failed to generate a response.
- The model generated a response that could not be parsed.
- The model generated a response that could not be validated against the schema.

The error contains the following properties:

- `text`: The text that was generated by the model. This can be the raw text or the tool call text, depending on the model.
 */
declare class NoObjectGeneratedError extends AISDKError {
    private readonly [symbol$9];
    /**
    The text that was generated by the model. This can be the raw text or the tool call text, depending on the model.
     */
    readonly text: string | undefined;
    /**
    The response metadata.
     */
    readonly response: LanguageModelResponseMetadata | undefined;
    /**
    The usage of the model.
     */
    readonly usage: LanguageModelUsage | undefined;
    /**
    Reason why the model finished generating a response.
     */
    readonly finishReason: FinishReason | undefined;
    constructor({ message, cause, text, response, usage, finishReason, }: {
        message?: string;
        cause?: Error;
        text?: string;
        response: LanguageModelResponseMetadata;
        usage: LanguageModelUsage;
        finishReason: FinishReason;
    });
    static isInstance(error: unknown): error is NoObjectGeneratedError;
}

declare const symbol$8: unique symbol;
/**
Thrown when no LLM output was generated, e.g. because of errors.
 */
declare class NoOutputGeneratedError extends AISDKError {
    private readonly [symbol$8];
    constructor({ message, cause, }?: {
        message?: string;
        cause?: Error;
    });
    static isInstance(error: unknown): error is NoOutputGeneratedError;
}

declare const symbol$7: unique symbol;
/**
Thrown when no output type is specified and output-related methods are called.
 */
declare class NoOutputSpecifiedError extends AISDKError {
    private readonly [symbol$7];
    constructor({ message }?: {
        message?: string;
    });
    static isInstance(error: unknown): error is NoOutputSpecifiedError;
}

declare const symbol$6: unique symbol;
declare class ToolCallRepairError extends AISDKError {
    private readonly [symbol$6];
    readonly originalError: NoSuchToolError | InvalidToolInputError;
    constructor({ cause, originalError, message, }: {
        message?: string;
        cause: unknown;
        originalError: NoSuchToolError | InvalidToolInputError;
    });
    static isInstance(error: unknown): error is ToolCallRepairError;
}

/**
Error that is thrown when a model with an unsupported version is used.
 */
declare class UnsupportedModelVersionError extends AISDKError {
    readonly version: string;
    readonly provider: string;
    readonly modelId: string;
    constructor(options: {
        version: string;
        provider: string;
        modelId: string;
    });
}

declare const symbol$5: unique symbol;
declare class InvalidDataContentError extends AISDKError {
    private readonly [symbol$5];
    readonly content: unknown;
    constructor({ content, cause, message, }: {
        content: unknown;
        cause?: unknown;
        message?: string;
    });
    static isInstance(error: unknown): error is InvalidDataContentError;
}

declare const symbol$4: unique symbol;
declare class InvalidMessageRoleError extends AISDKError {
    private readonly [symbol$4];
    readonly role: string;
    constructor({ role, message, }: {
        role: string;
        message?: string;
    });
    static isInstance(error: unknown): error is InvalidMessageRoleError;
}

declare const symbol$3: unique symbol;
declare class MessageConversionError extends AISDKError {
    private readonly [symbol$3];
    readonly originalMessage: Omit<UIMessage, 'id'>;
    constructor({ originalMessage, message, }: {
        originalMessage: Omit<UIMessage, 'id'>;
        message: string;
    });
    static isInstance(error: unknown): error is MessageConversionError;
}

declare const symbol$2: unique symbol;
declare class DownloadError extends AISDKError {
    private readonly [symbol$2];
    readonly url: string;
    readonly statusCode?: number;
    readonly statusText?: string;
    constructor({ url, statusCode, statusText, cause, message, }: {
        url: string;
        statusCode?: number;
        statusText?: string;
        message?: string;
        cause?: unknown;
    });
    static isInstance(error: unknown): error is DownloadError;
}

declare const symbol$1: unique symbol;
type RetryErrorReason = 'maxRetriesExceeded' | 'errorNotRetryable' | 'abort';
declare class RetryError extends AISDKError {
    private readonly [symbol$1];
    readonly reason: RetryErrorReason;
    readonly lastError: unknown;
    readonly errors: Array<unknown>;
    constructor({ message, reason, errors, }: {
        message: string;
        reason: RetryErrorReason;
        errors: Array<unknown>;
    });
    static isInstance(error: unknown): error is RetryError;
}

/**
The result of a `generateImage` call.
It contains the images and additional information.
 */
interface GenerateImageResult {
    /**
  The first image that was generated.
     */
    readonly image: GeneratedFile;
    /**
  The images that were generated.
       */
    readonly images: Array<GeneratedFile>;
    /**
  Warnings for the call, e.g. unsupported settings.
       */
    readonly warnings: Array<ImageGenerationWarning>;
    /**
  Response metadata from the provider. There may be multiple responses if we made multiple calls to the model.
     */
    readonly responses: Array<ImageModelResponseMetadata>;
    /**
     * Provider-specific metadata. They are passed through from the provider to the AI SDK and enable provider-specific
     * results that can be fully encapsulated in the provider.
     */
    readonly providerMetadata: ImageModelProviderMetadata;
}

/**
Generates images using an image model.

@param model - The image model to use.
@param prompt - The prompt that should be used to generate the image.
@param n - Number of images to generate. Default: 1.
@param size - Size of the images to generate. Must have the format `{width}x{height}`.
@param aspectRatio - Aspect ratio of the images to generate. Must have the format `{width}:{height}`.
@param seed - Seed for the image generation.
@param providerOptions - Additional provider-specific options that are passed through to the provider
as body parameters.
@param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
@param abortSignal - An optional abort signal that can be used to cancel the call.
@param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.

@returns A result object that contains the generated images.
 */
declare function generateImage({ model, prompt, n, maxImagesPerCall, size, aspectRatio, seed, providerOptions, maxRetries: maxRetriesArg, abortSignal, headers, }: {
    /**
  The image model to use.
       */
    model: ImageModelV2;
    /**
  The prompt that should be used to generate the image.
     */
    prompt: string;
    /**
  Number of images to generate.
     */
    n?: number;
    /**
  Number of images to generate.
     */
    maxImagesPerCall?: number;
    /**
  Size of the images to generate. Must have the format `{width}x{height}`. If not provided, the default size will be used.
     */
    size?: `${number}x${number}`;
    /**
  Aspect ratio of the images to generate. Must have the format `{width}:{height}`. If not provided, the default aspect ratio will be used.
     */
    aspectRatio?: `${number}:${number}`;
    /**
  Seed for the image generation. If not provided, the default seed will be used.
     */
    seed?: number;
    /**
  Additional provider-specific options that are passed through to the provider
  as body parameters.
  
  The outer record is keyed by the provider name, and the inner
  record is keyed by the provider-specific metadata key.
  ```ts
  {
    "openai": {
      "style": "vivid"
    }
  }
  ```
       */
    providerOptions?: ProviderOptions;
    /**
  Maximum number of retries per embedding model call. Set to 0 to disable retries.
  
  @default 2
     */
    maxRetries?: number;
    /**
  Abort signal.
   */
    abortSignal?: AbortSignal;
    /**
  Additional headers to include in the request.
  Only applicable for HTTP-based providers.
   */
    headers?: Record<string, string>;
}): Promise<GenerateImageResult>;

/**
The result of a `generateObject` call.
 */
interface GenerateObjectResult<OBJECT> {
    /**
    The generated object (typed according to the schema).
       */
    readonly object: OBJECT;
    /**
     * The reasoning that was used to generate the object.
     * Concatenated from all reasoning parts.
     */
    readonly reasoning: string | undefined;
    /**
    The reason why the generation finished.
       */
    readonly finishReason: FinishReason;
    /**
    The token usage of the generated text.
       */
    readonly usage: LanguageModelUsage;
    /**
    Warnings from the model provider (e.g. unsupported settings).
       */
    readonly warnings: CallWarning[] | undefined;
    /**
  Additional request information.
     */
    readonly request: LanguageModelRequestMetadata;
    /**
  Additional response information.
     */
    readonly response: LanguageModelResponseMetadata & {
        /**
    Response body (available only for providers that use HTTP requests).
        */
        body?: unknown;
    };
    /**
  Additional provider-specific metadata. They are passed through
  from the provider to the AI SDK and enable provider-specific
  results that can be fully encapsulated in the provider.
     */
    readonly providerMetadata: ProviderMetadata | undefined;
    /**
    Converts the object to a JSON response.
    The response will have a status code of 200 and a content type of `application/json; charset=utf-8`.
       */
    toJsonResponse(init?: ResponseInit): Response;
}

/**
A function that attempts to repair the raw output of the model
to enable JSON parsing.

Should return the repaired text or null if the text cannot be repaired.
     */
type RepairTextFunction = (options: {
    text: string;
    error: JSONParseError | TypeValidationError;
}) => Promise<string | null>;

/**
Generate a structured, typed object for a given prompt and schema using a language model.

This function does not stream the output. If you want to stream the output, use `streamObject` instead.

@param model - The language model to use.
@param tools - Tools that are accessible to and can be called by the model. The model needs to support calling tools.

@param system - A system message that will be part of the prompt.
@param prompt - A simple text prompt. You can either use `prompt` or `messages` but not both.
@param messages - A list of messages. You can either use `prompt` or `messages` but not both.

@param maxOutputTokens - Maximum number of tokens to generate.
@param temperature - Temperature setting.
The value is passed through to the provider. The range depends on the provider and model.
It is recommended to set either `temperature` or `topP`, but not both.
@param topP - Nucleus sampling.
The value is passed through to the provider. The range depends on the provider and model.
It is recommended to set either `temperature` or `topP`, but not both.
@param topK - Only sample from the top K options for each subsequent token.
Used to remove "long tail" low probability responses.
Recommended for advanced use cases only. You usually only need to use temperature.
@param presencePenalty - Presence penalty setting.
It affects the likelihood of the model to repeat information that is already in the prompt.
The value is passed through to the provider. The range depends on the provider and model.
@param frequencyPenalty - Frequency penalty setting.
It affects the likelihood of the model to repeatedly use the same words or phrases.
The value is passed through to the provider. The range depends on the provider and model.
@param stopSequences - Stop sequences.
If set, the model will stop generating text when one of the stop sequences is generated.
@param seed - The seed (integer) to use for random sampling.
If set and supported by the model, calls will generate deterministic results.

@param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
@param abortSignal - An optional abort signal that can be used to cancel the call.
@param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.

@param schema - The schema of the object that the model should generate.
@param schemaName - Optional name of the output that should be generated.
Used by some providers for additional LLM guidance, e.g.
via tool or schema name.
@param schemaDescription - Optional description of the output that should be generated.
Used by some providers for additional LLM guidance, e.g.
via tool or schema description.

@param output - The type of the output.

- 'object': The output is an object.
- 'array': The output is an array.
- 'enum': The output is an enum.
- 'no-schema': The output is not a schema.

@param experimental_repairText - A function that attempts to repair the raw output of the model
to enable JSON parsing.

@param experimental_telemetry - Optional telemetry configuration (experimental).

@param providerOptions - Additional provider-specific options. They are passed through
to the provider from the AI SDK and enable provider-specific
functionality that can be fully encapsulated in the provider.

@returns
A result object that contains the generated object, the finish reason, the token usage, and additional information.
 */
declare function generateObject<SCHEMA extends z3.Schema | z4.core.$ZodType | Schema = z4.core.$ZodType<JSONValue$1>, OUTPUT extends 'object' | 'array' | 'enum' | 'no-schema' = InferSchema<SCHEMA> extends string ? 'enum' : 'object', RESULT = OUTPUT extends 'array' ? Array<InferSchema<SCHEMA>> : InferSchema<SCHEMA>>(options: Omit<CallSettings, 'stopSequences'> & Prompt & (OUTPUT extends 'enum' ? {
    /**
The enum values that the model should use.
  */
    enum: Array<RESULT>;
    mode?: 'json';
    output: 'enum';
} : OUTPUT extends 'no-schema' ? {} : {
    /**
The schema of the object that the model should generate.
*/
    schema: SCHEMA;
    /**
Optional name of the output that should be generated.
Used by some providers for additional LLM guidance, e.g.
via tool or schema name.
*/
    schemaName?: string;
    /**
Optional description of the output that should be generated.
Used by some providers for additional LLM guidance, e.g.
via tool or schema description.
*/
    schemaDescription?: string;
    /**
The mode to use for object generation.

The schema is converted into a JSON schema and used in one of the following ways

- 'auto': The provider will choose the best mode for the model.
- 'tool': A tool with the JSON schema as parameters is provided and the provider is instructed to use it.
- 'json': The JSON schema and an instruction are injected into the prompt. If the provider supports JSON mode, it is enabled. If the provider supports JSON grammars, the grammar is used.

Please note that most providers do not support all modes.

Default and recommended: 'auto' (best mode for the model).
*/
    mode?: 'auto' | 'json' | 'tool';
}) & {
    output?: OUTPUT;
    /**
The language model to use.
     */
    model: LanguageModel;
    /**
A function that attempts to repair the raw output of the model
to enable JSON parsing.
     */
    experimental_repairText?: RepairTextFunction;
    /**
Optional telemetry configuration (experimental).
       */
    experimental_telemetry?: TelemetrySettings;
    /**
Custom download function to use for URLs.

By default, files are downloaded if the model does not support the URL for the given media type.
     */
    experimental_download?: DownloadFunction | undefined;
    /**
Additional provider-specific options. They are passed through
to the provider from the AI SDK and enable provider-specific
functionality that can be fully encapsulated in the provider.
 */
    providerOptions?: ProviderOptions;
    /**
     * Internal. For test use only. May change without notice.
     */
    _internal?: {
        generateId?: () => string;
        currentDate?: () => Date;
    };
}): Promise<GenerateObjectResult<RESULT>>;

/**
 * Consumes a ReadableStream until it's fully read.
 *
 * This function reads the stream chunk by chunk until the stream is exhausted.
 * It doesn't process or return the data from the stream; it simply ensures
 * that the entire stream is read.
 *
 * @param {ReadableStream} stream - The ReadableStream to be consumed.
 * @returns {Promise<void>} A promise that resolves when the stream is fully consumed.
 */
declare function consumeStream({ stream, onError, }: {
    stream: ReadableStream;
    onError?: (error: unknown) => void;
}): Promise<void>;

/**
 * Calculates the cosine similarity between two vectors. This is a useful metric for
 * comparing the similarity of two vectors such as embeddings.
 *
 * @param vector1 - The first vector.
 * @param vector2 - The second vector.
 *
 * @returns The cosine similarity between vector1 and vector2.
 * @returns 0 if either vector is the zero vector.
 *
 * @throws {InvalidArgumentError} If the vectors do not have the same length.
 */
declare function cosineSimilarity(vector1: number[], vector2: number[]): number;

/**
 * Converts a data URL of type text/* to a text string.
 */
declare function getTextFromDataUrl(dataUrl: string): string;

/**
 * Performs a deep-equal comparison of two parsed JSON objects.
 *
 * @param {any} obj1 - The first object to compare.
 * @param {any} obj2 - The second object to compare.
 * @returns {boolean} - Returns true if the two objects are deeply equal, false otherwise.
 */
declare function isDeepEqualData(obj1: any, obj2: any): boolean;

declare function parsePartialJson(jsonText: string | undefined): Promise<{
    value: JSONValue$1 | undefined;
    state: 'undefined-input' | 'successful-parse' | 'repaired-parse' | 'failed-parse';
}>;

type Job = () => Promise<void>;

declare class SerialJobExecutor {
    private queue;
    private isProcessing;
    private processQueue;
    run(job: Job): Promise<void>;
}

/**
 * Creates a ReadableStream that emits the provided values with an optional delay between each value.
 *
 * @param options - The configuration options
 * @param options.chunks - Array of values to be emitted by the stream
 * @param options.initialDelayInMs - Optional initial delay in milliseconds before emitting the first value (default: 0). Can be set to `null` to skip the initial delay. The difference between `initialDelayInMs: null` and `initialDelayInMs: 0` is that `initialDelayInMs: null` will emit the values without any delay, while `initialDelayInMs: 0` will emit the values with a delay of 0 milliseconds.
 * @param options.chunkDelayInMs - Optional delay in milliseconds between emitting each value (default: 0). Can be set to `null` to skip the delay. The difference between `chunkDelayInMs: null` and `chunkDelayInMs: 0` is that `chunkDelayInMs: null` will emit the values without any delay, while `chunkDelayInMs: 0` will emit the values with a delay of 0 milliseconds.
 * @returns A ReadableStream that emits the provided values
 */
declare function simulateReadableStream<T>({ chunks, initialDelayInMs, chunkDelayInMs, _internal, }: {
    chunks: T[];
    initialDelayInMs?: number | null;
    chunkDelayInMs?: number | null;
    _internal?: {
        delay?: (ms: number | null) => Promise<void>;
    };
}): ReadableStream<T>;

/**
The result of a `streamObject` call that contains the partial object stream and additional information.
 */
interface StreamObjectResult<PARTIAL, RESULT, ELEMENT_STREAM> {
    /**
    Warnings from the model provider (e.g. unsupported settings)
       */
    readonly warnings: Promise<CallWarning[] | undefined>;
    /**
    The token usage of the generated response. Resolved when the response is finished.
       */
    readonly usage: Promise<LanguageModelUsage>;
    /**
  Additional provider-specific metadata. They are passed through
  from the provider to the AI SDK and enable provider-specific
  results that can be fully encapsulated in the provider.
     */
    readonly providerMetadata: Promise<ProviderMetadata | undefined>;
    /**
  Additional request information from the last step.
   */
    readonly request: Promise<LanguageModelRequestMetadata>;
    /**
  Additional response information.
   */
    readonly response: Promise<LanguageModelResponseMetadata>;
    /**
  The reason why the generation finished. Taken from the last step.
  
  Resolved when the response is finished.
       */
    readonly finishReason: Promise<FinishReason>;
    /**
    The generated object (typed according to the schema). Resolved when the response is finished.
       */
    readonly object: Promise<RESULT>;
    /**
    Stream of partial objects. It gets more complete as the stream progresses.
  
    Note that the partial object is not validated.
    If you want to be certain that the actual content matches your schema, you need to implement your own validation for partial results.
       */
    readonly partialObjectStream: AsyncIterableStream<PARTIAL>;
    /**
     * Stream over complete array elements. Only available if the output strategy is set to `array`.
     */
    readonly elementStream: ELEMENT_STREAM;
    /**
    Text stream of the JSON representation of the generated object. It contains text chunks.
    When the stream is finished, the object is valid JSON that can be parsed.
       */
    readonly textStream: AsyncIterableStream<string>;
    /**
    Stream of different types of events, including partial objects, errors, and finish events.
    Only errors that stop the stream, such as network errors, are thrown.
       */
    readonly fullStream: AsyncIterableStream<ObjectStreamPart<PARTIAL>>;
    /**
    Writes text delta output to a Node.js response-like object.
    It sets a `Content-Type` header to `text/plain; charset=utf-8` and
    writes each text delta as a separate chunk.
  
    @param response A Node.js response-like object (ServerResponse).
    @param init Optional headers, status code, and status text.
       */
    pipeTextStreamToResponse(response: ServerResponse$1, init?: ResponseInit): void;
    /**
    Creates a simple text stream response.
    The response has a `Content-Type` header set to `text/plain; charset=utf-8`.
    Each text delta is encoded as UTF-8 and sent as a separate chunk.
    Non-text-delta events are ignored.
  
    @param init Optional headers, status code, and status text.
       */
    toTextStreamResponse(init?: ResponseInit): Response;
}
type ObjectStreamPart<PARTIAL> = {
    type: 'object';
    object: PARTIAL;
} | {
    type: 'text-delta';
    textDelta: string;
} | {
    type: 'error';
    error: unknown;
} | {
    type: 'finish';
    finishReason: FinishReason;
    usage: LanguageModelUsage;
    response: LanguageModelResponseMetadata;
    providerMetadata?: ProviderMetadata;
};

/**
Callback that is set using the `onError` option.

@param event - The event that is passed to the callback.
 */
type StreamObjectOnErrorCallback = (event: {
    error: unknown;
}) => Promise<void> | void;
/**
Callback that is set using the `onFinish` option.

@param event - The event that is passed to the callback.
 */
type StreamObjectOnFinishCallback<RESULT> = (event: {
    /**
  The token usage of the generated response.
  */
    usage: LanguageModelUsage;
    /**
  The generated object. Can be undefined if the final object does not match the schema.
  */
    object: RESULT | undefined;
    /**
  Optional error object. This is e.g. a TypeValidationError when the final object does not match the schema.
  */
    error: unknown | undefined;
    /**
  Response metadata.
   */
    response: LanguageModelResponseMetadata;
    /**
  Warnings from the model provider (e.g. unsupported settings).
  */
    warnings?: CallWarning[];
    /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
  */
    providerMetadata: ProviderMetadata | undefined;
}) => Promise<void> | void;
/**
Generate a structured, typed object for a given prompt and schema using a language model.

This function streams the output. If you do not want to stream the output, use `generateObject` instead.

@param model - The language model to use.
@param tools - Tools that are accessible to and can be called by the model. The model needs to support calling tools.

@param system - A system message that will be part of the prompt.
@param prompt - A simple text prompt. You can either use `prompt` or `messages` but not both.
@param messages - A list of messages. You can either use `prompt` or `messages` but not both.

@param maxOutputTokens - Maximum number of tokens to generate.
@param temperature - Temperature setting.
The value is passed through to the provider. The range depends on the provider and model.
It is recommended to set either `temperature` or `topP`, but not both.
@param topP - Nucleus sampling.
The value is passed through to the provider. The range depends on the provider and model.
It is recommended to set either `temperature` or `topP`, but not both.
@param topK - Only sample from the top K options for each subsequent token.
Used to remove "long tail" low probability responses.
Recommended for advanced use cases only. You usually only need to use temperature.
@param presencePenalty - Presence penalty setting.
It affects the likelihood of the model to repeat information that is already in the prompt.
The value is passed through to the provider. The range depends on the provider and model.
@param frequencyPenalty - Frequency penalty setting.
It affects the likelihood of the model to repeatedly use the same words or phrases.
The value is passed through to the provider. The range depends on the provider and model.
@param stopSequences - Stop sequences.
If set, the model will stop generating text when one of the stop sequences is generated.
@param seed - The seed (integer) to use for random sampling.
If set and supported by the model, calls will generate deterministic results.

@param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
@param abortSignal - An optional abort signal that can be used to cancel the call.
@param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.

@param schema - The schema of the object that the model should generate.
@param schemaName - Optional name of the output that should be generated.
Used by some providers for additional LLM guidance, e.g.
via tool or schema name.
@param schemaDescription - Optional description of the output that should be generated.
Used by some providers for additional LLM guidance, e.g.
via tool or schema description.

@param output - The type of the output.

- 'object': The output is an object.
- 'array': The output is an array.
- 'enum': The output is an enum.
- 'no-schema': The output is not a schema.

@param experimental_telemetry - Optional telemetry configuration (experimental).

@param providerOptions - Additional provider-specific options. They are passed through
to the provider from the AI SDK and enable provider-specific
functionality that can be fully encapsulated in the provider.

@returns
A result object for accessing the partial object stream and additional information.
 */
declare function streamObject<SCHEMA extends z3.Schema | z4.core.$ZodType | Schema = z4.core.$ZodType<JSONValue$1>, OUTPUT extends 'object' | 'array' | 'enum' | 'no-schema' = InferSchema<SCHEMA> extends string ? 'enum' : 'object', RESULT = OUTPUT extends 'array' ? Array<InferSchema<SCHEMA>> : InferSchema<SCHEMA>>(options: Omit<CallSettings, 'stopSequences'> & Prompt & (OUTPUT extends 'enum' ? {
    /**
The enum values that the model should use.
  */
    enum: Array<RESULT>;
    mode?: 'json';
    output: 'enum';
} : OUTPUT extends 'no-schema' ? {} : {
    /**
The schema of the object that the model should generate.
*/
    schema: SCHEMA;
    /**
Optional name of the output that should be generated.
Used by some providers for additional LLM guidance, e.g.
via tool or schema name.
*/
    schemaName?: string;
    /**
Optional description of the output that should be generated.
Used by some providers for additional LLM guidance, e.g.
via tool or schema description.
*/
    schemaDescription?: string;
    /**
The mode to use for object generation.

The schema is converted into a JSON schema and used in one of the following ways

- 'auto': The provider will choose the best mode for the model.
- 'tool': A tool with the JSON schema as parameters is provided and the provider is instructed to use it.
- 'json': The JSON schema and an instruction are injected into the prompt. If the provider supports JSON mode, it is enabled. If the provider supports JSON grammars, the grammar is used.

Please note that most providers do not support all modes.

Default and recommended: 'auto' (best mode for the model).
*/
    mode?: 'auto' | 'json' | 'tool';
}) & {
    output?: OUTPUT;
    /**
The language model to use.
   */
    model: LanguageModel;
    /**
A function that attempts to repair the raw output of the model
to enable JSON parsing.
     */
    experimental_repairText?: RepairTextFunction;
    /**
Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
Custom download function to use for URLs.

By default, files are downloaded if the model does not support the URL for the given media type.
     */
    experimental_download?: DownloadFunction | undefined;
    /**
Additional provider-specific options. They are passed through
to the provider from the AI SDK and enable provider-specific
functionality that can be fully encapsulated in the provider.
*/
    providerOptions?: ProviderOptions;
    /**
Callback that is invoked when an error occurs during streaming.
You can use it to log errors.
The stream processing will pause until the callback promise is resolved.
   */
    onError?: StreamObjectOnErrorCallback;
    /**
Callback that is called when the LLM response and the final object validation are finished.
*/
    onFinish?: StreamObjectOnFinishCallback<RESULT>;
    /**
     * Internal. For test use only. May change without notice.
     */
    _internal?: {
        generateId?: () => string;
        currentDate?: () => Date;
        now?: () => number;
    };
}): StreamObjectResult<OUTPUT extends 'enum' ? string : OUTPUT extends 'array' ? RESULT : DeepPartial<RESULT>, OUTPUT extends 'array' ? RESULT : RESULT, OUTPUT extends 'array' ? RESULT extends Array<infer U> ? AsyncIterableStream<U> : never : never>;

/**
 * A generated audio file.
 */
interface GeneratedAudioFile extends GeneratedFile {
    /**
     * Audio format of the file (e.g., 'mp3', 'wav', etc.)
     */
    readonly format: string;
}

/**
The result of a `generateSpeech` call.
It contains the audio data and additional information.
 */
interface SpeechResult {
    /**
     * The audio data as a base64 encoded string or binary data.
     */
    readonly audio: GeneratedAudioFile;
    /**
    Warnings for the call, e.g. unsupported settings.
       */
    readonly warnings: Array<SpeechWarning>;
    /**
    Response metadata from the provider. There may be multiple responses if we made multiple calls to the model.
     */
    readonly responses: Array<SpeechModelResponseMetadata>;
    /**
    Provider metadata from the provider.
     */
    readonly providerMetadata: Record<string, Record<string, JSONValue$1>>;
}

/**
Generates speech audio using a speech model.

@param model - The speech model to use.
@param text - The text to convert to speech.
@param voice - The voice to use for speech generation.
@param outputFormat - The output format to use for speech generation e.g. "mp3", "wav", etc.
@param instructions - Instructions for the speech generation e.g. "Speak in a slow and steady tone".
@param speed - The speed of the speech generation.
@param providerOptions - Additional provider-specific options that are passed through to the provider
as body parameters.
@param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
@param abortSignal - An optional abort signal that can be used to cancel the call.
@param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.

@returns A result object that contains the generated audio data.
 */
declare function generateSpeech({ model, text, voice, outputFormat, instructions, speed, language, providerOptions, maxRetries: maxRetriesArg, abortSignal, headers, }: {
    /**
  The speech model to use.
       */
    model: SpeechModelV2;
    /**
  The text to convert to speech.
     */
    text: string;
    /**
  The voice to use for speech generation.
     */
    voice?: string;
    /**
     * The desired output format for the audio e.g. "mp3", "wav", etc.
     */
    outputFormat?: 'mp3' | 'wav' | (string & {});
    /**
      Instructions for the speech generation e.g. "Speak in a slow and steady tone".
    */
    instructions?: string;
    /**
    The speed of the speech generation.
     */
    speed?: number;
    /**
    The language for speech generation. This should be an ISO 639-1 language code (e.g. "en", "es", "fr")
    or "auto" for automatic language detection. Provider support varies.
     */
    language?: string;
    /**
  Additional provider-specific options that are passed through to the provider
  as body parameters.
  
  The outer record is keyed by the provider name, and the inner
  record is keyed by the provider-specific metadata key.
  ```ts
  {
    "openai": {}
  }
  ```
       */
    providerOptions?: ProviderOptions;
    /**
  Maximum number of retries per speech model call. Set to 0 to disable retries.
  
  @default 2
     */
    maxRetries?: number;
    /**
  Abort signal.
   */
    abortSignal?: AbortSignal;
    /**
  Additional headers to include in the request.
  Only applicable for HTTP-based providers.
   */
    headers?: Record<string, string>;
}): Promise<SpeechResult>;

type Warning = LanguageModelV2CallWarning | ImageModelV2CallWarning | SpeechModelV2CallWarning | TranscriptionModelV2CallWarning;
type LogWarningsFunction = (warnings: Warning[]) => void;

/**
 * Applies default settings for a language model.
 */
declare function defaultSettingsMiddleware({ settings, }: {
    settings: Partial<{
        maxOutputTokens?: LanguageModelV2CallOptions['maxOutputTokens'];
        temperature?: LanguageModelV2CallOptions['temperature'];
        stopSequences?: LanguageModelV2CallOptions['stopSequences'];
        topP?: LanguageModelV2CallOptions['topP'];
        topK?: LanguageModelV2CallOptions['topK'];
        presencePenalty?: LanguageModelV2CallOptions['presencePenalty'];
        frequencyPenalty?: LanguageModelV2CallOptions['frequencyPenalty'];
        responseFormat?: LanguageModelV2CallOptions['responseFormat'];
        seed?: LanguageModelV2CallOptions['seed'];
        tools?: LanguageModelV2CallOptions['tools'];
        toolChoice?: LanguageModelV2CallOptions['toolChoice'];
        headers?: LanguageModelV2CallOptions['headers'];
        providerOptions?: LanguageModelV2CallOptions['providerOptions'];
    }>;
}): LanguageModelMiddleware;

/**
 * Extract an XML-tagged reasoning section from the generated text and exposes it
 * as a `reasoning` property on the result.
 *
 * @param tagName - The name of the XML tag to extract reasoning from.
 * @param separator - The separator to use between reasoning and text sections.
 * @param startWithReasoning - Whether to start with reasoning tokens.
 */
declare function extractReasoningMiddleware({ tagName, separator, startWithReasoning, }: {
    tagName: string;
    separator?: string;
    startWithReasoning?: boolean;
}): LanguageModelMiddleware;

/**
 * Simulates streaming chunks with the response from a generate call.
 */
declare function simulateStreamingMiddleware(): LanguageModelMiddleware;

/**
 * Wraps a LanguageModelV2 instance with middleware functionality.
 * This function allows you to apply middleware to transform parameters,
 * wrap generate operations, and wrap stream operations of a language model.
 *
 * @param options - Configuration options for wrapping the language model.
 * @param options.model - The original LanguageModelV2 instance to be wrapped.
 * @param options.middleware - The middleware to be applied to the language model. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @param options.modelId - Optional custom model ID to override the original model's ID.
 * @param options.providerId - Optional custom provider ID to override the original model's provider ID.
 * @returns A new LanguageModelV2 instance with middleware applied.
 */
declare const wrapLanguageModel: ({ model, middleware: middlewareArg, modelId, providerId, }: {
    model: LanguageModelV2;
    middleware: LanguageModelMiddleware | LanguageModelMiddleware[];
    modelId?: string;
    providerId?: string;
}) => LanguageModelV2;

/**
 * Wraps a ProviderV2 instance with middleware functionality.
 * This function allows you to apply middleware to all language models
 * from the provider, enabling you to transform parameters, wrap generate
 * operations, and wrap stream operations for every language model.
 *
 * @param options - Configuration options for wrapping the provider.
 * @param options.provider - The original ProviderV2 instance to be wrapped.
 * @param options.languageModelMiddleware - The middleware to be applied to all language models from the provider. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @returns A new ProviderV2 instance with middleware applied to all language models.
 */
declare function wrapProvider({ provider, languageModelMiddleware, }: {
    provider: ProviderV2;
    languageModelMiddleware: LanguageModelMiddleware | LanguageModelMiddleware[];
}): ProviderV2;

/**
 * Creates a custom provider with specified language models, text embedding models, image models, transcription models, speech models, and an optional fallback provider.
 *
 * @param {Object} options - The options for creating the custom provider.
 * @param {Record<string, LanguageModel>} [options.languageModels] - A record of language models, where keys are model IDs and values are LanguageModel instances.
 * @param {Record<string, EmbeddingModel<string>>} [options.textEmbeddingModels] - A record of text embedding models, where keys are model IDs and values are EmbeddingModel<string> instances.
 * @param {Record<string, ImageModel>} [options.imageModels] - A record of image models, where keys are model IDs and values are ImageModel instances.
 * @param {Record<string, TranscriptionModel>} [options.transcriptionModels] - A record of transcription models, where keys are model IDs and values are TranscriptionModel instances.
 * @param {Record<string, SpeechModel>} [options.speechModels] - A record of speech models, where keys are model IDs and values are SpeechModel instances.
 * @param {Provider} [options.fallbackProvider] - An optional fallback provider to use when a requested model is not found in the custom provider.
 * @returns {Provider} A Provider object with languageModel, textEmbeddingModel, imageModel, transcriptionModel, and speechModel methods.
 *
 * @throws {NoSuchModelError} Throws when a requested model is not found and no fallback provider is available.
 */
declare function customProvider<LANGUAGE_MODELS extends Record<string, LanguageModelV2>, EMBEDDING_MODELS extends Record<string, EmbeddingModelV2<string>>, IMAGE_MODELS extends Record<string, ImageModelV2>, TRANSCRIPTION_MODELS extends Record<string, TranscriptionModelV2>, SPEECH_MODELS extends Record<string, SpeechModelV2>>({ languageModels, textEmbeddingModels, imageModels, transcriptionModels, speechModels, fallbackProvider, }: {
    languageModels?: LANGUAGE_MODELS;
    textEmbeddingModels?: EMBEDDING_MODELS;
    imageModels?: IMAGE_MODELS;
    transcriptionModels?: TRANSCRIPTION_MODELS;
    speechModels?: SPEECH_MODELS;
    fallbackProvider?: ProviderV2;
}): ProviderV2 & {
    languageModel(modelId: ExtractModelId<LANGUAGE_MODELS>): LanguageModelV2;
    textEmbeddingModel(modelId: ExtractModelId<EMBEDDING_MODELS>): EmbeddingModelV2<string>;
    imageModel(modelId: ExtractModelId<IMAGE_MODELS>): ImageModelV2;
    transcriptionModel(modelId: ExtractModelId<TRANSCRIPTION_MODELS>): TranscriptionModelV2;
    speechModel(modelId: ExtractModelId<SPEECH_MODELS>): SpeechModelV2;
};
/**
 * @deprecated Use `customProvider` instead.
 */
declare const experimental_customProvider: typeof customProvider;
type ExtractModelId<MODELS extends Record<string, unknown>> = Extract<keyof MODELS, string>;

declare const symbol: unique symbol;
declare class NoSuchProviderError extends NoSuchModelError {
    private readonly [symbol];
    readonly providerId: string;
    readonly availableProviders: string[];
    constructor({ modelId, modelType, providerId, availableProviders, message, }: {
        modelId: string;
        modelType: 'languageModel' | 'textEmbeddingModel' | 'imageModel' | 'transcriptionModel' | 'speechModel';
        providerId: string;
        availableProviders: string[];
        message?: string;
    });
    static isInstance(error: unknown): error is NoSuchProviderError;
}

type ExtractLiteralUnion<T> = T extends string ? string extends T ? never : T : never;
interface ProviderRegistryProvider<PROVIDERS extends Record<string, ProviderV2> = Record<string, ProviderV2>, SEPARATOR extends string = ':'> {
    languageModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${ExtractLiteralUnion<Parameters<NonNullable<PROVIDERS[KEY]['languageModel']>>[0]>}` : never): LanguageModelV2;
    languageModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${string}` : never): LanguageModelV2;
    textEmbeddingModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${ExtractLiteralUnion<Parameters<NonNullable<PROVIDERS[KEY]['textEmbeddingModel']>>[0]>}` : never): EmbeddingModelV2<string>;
    textEmbeddingModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${string}` : never): EmbeddingModelV2<string>;
    imageModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${ExtractLiteralUnion<Parameters<NonNullable<PROVIDERS[KEY]['imageModel']>>[0]>}` : never): ImageModelV2;
    imageModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${string}` : never): ImageModelV2;
    transcriptionModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${ExtractLiteralUnion<Parameters<NonNullable<PROVIDERS[KEY]['transcriptionModel']>>[0]>}` : never): TranscriptionModelV2;
    transcriptionModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${string}` : never): TranscriptionModelV2;
    speechModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${ExtractLiteralUnion<Parameters<NonNullable<PROVIDERS[KEY]['speechModel']>>[0]>}` : never): SpeechModelV2;
    speechModel<KEY extends keyof PROVIDERS>(id: KEY extends string ? `${KEY & string}${SEPARATOR}${string}` : never): SpeechModelV2;
}
/**
 * Creates a registry for the given providers with optional middleware functionality.
 * This function allows you to register multiple providers and optionally apply middleware
 * to all language models from the registry, enabling you to transform parameters, wrap generate
 * operations, and wrap stream operations for every language model accessed through the registry.
 *
 * @param providers - A record of provider instances to be registered in the registry.
 * @param options - Configuration options for the provider registry.
 * @param options.separator - The separator used between provider ID and model ID in the combined identifier. Defaults to ':'.
 * @param options.languageModelMiddleware - Optional middleware to be applied to all language models from the registry. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @returns A new ProviderRegistryProvider instance that provides access to all registered providers with optional middleware applied to language models.
 */
declare function createProviderRegistry<PROVIDERS extends Record<string, ProviderV2>, SEPARATOR extends string = ':'>(providers: PROVIDERS, { separator, languageModelMiddleware, }?: {
    separator?: SEPARATOR;
    languageModelMiddleware?: LanguageModelMiddleware | LanguageModelMiddleware[];
}): ProviderRegistryProvider<PROVIDERS, SEPARATOR>;
/**
 * @deprecated Use `createProviderRegistry` instead.
 */
declare const experimental_createProviderRegistry: typeof createProviderRegistry;

declare function createTextStreamResponse({ status, statusText, headers, textStream, }: ResponseInit & {
    textStream: ReadableStream<string>;
}): Response;

declare function pipeTextStreamToResponse({ response, status, statusText, headers, textStream, }: {
    response: ServerResponse;
    textStream: ReadableStream<string>;
} & ResponseInit): void;

declare const JSONRPCRequestSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    method: z.ZodString;
    params: z.ZodOptional<z.ZodObject<{
        _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
    }, z.core.$loose>>;
}, z.core.$strict>;
type JSONRPCRequest = z.infer<typeof JSONRPCRequestSchema>;
declare const JSONRPCResponseSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    result: z.ZodObject<{
        _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
    }, z.core.$loose>;
}, z.core.$strict>;
type JSONRPCResponse = z.infer<typeof JSONRPCResponseSchema>;
declare const JSONRPCErrorSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    error: z.ZodObject<{
        code: z.ZodNumber;
        message: z.ZodString;
        data: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strict>;
type JSONRPCError = z.infer<typeof JSONRPCErrorSchema>;
declare const JSONRPCNotificationSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    method: z.ZodString;
    params: z.ZodOptional<z.ZodObject<{
        _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
    }, z.core.$loose>>;
}, z.core.$strict>;
type JSONRPCNotification = z.infer<typeof JSONRPCNotificationSchema>;
declare const JSONRPCMessageSchema: z.ZodUnion<readonly [z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    method: z.ZodString;
    params: z.ZodOptional<z.ZodObject<{
        _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
    }, z.core.$loose>>;
}, z.core.$strict>, z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    method: z.ZodString;
    params: z.ZodOptional<z.ZodObject<{
        _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
    }, z.core.$loose>>;
}, z.core.$strict>, z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    result: z.ZodObject<{
        _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
    }, z.core.$loose>;
}, z.core.$strict>, z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    error: z.ZodObject<{
        code: z.ZodNumber;
        message: z.ZodString;
        data: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strict>]>;
type JSONRPCMessage = z.infer<typeof JSONRPCMessageSchema>;

/**
 * Transport interface for MCP (Model Context Protocol) communication.
 * Maps to the `Transport` interface in the MCP spec.
 */
interface MCPTransport {
    /**
     * Initialize and start the transport
     */
    start(): Promise<void>;
    /**
     * Send a JSON-RPC message through the transport
     * @param message The JSON-RPC message to send
     */
    send(message: JSONRPCMessage): Promise<void>;
    /**
     * Clean up and close the transport
     */
    close(): Promise<void>;
    /**
     * Event handler for transport closure
     */
    onclose?: () => void;
    /**
     * Event handler for transport errors
     */
    onerror?: (error: Error) => void;
    /**
     * Event handler for received messages
     */
    onmessage?: (message: JSONRPCMessage) => void;
}
type MCPTransportConfig = {
    type: 'sse';
    /**
     * The URL of the MCP server.
     */
    url: string;
    /**
     * Additional HTTP headers to be sent with requests.
     */
    headers?: Record<string, string>;
};

type ToolSchemas = Record<string, {
    inputSchema: FlexibleSchema<JSONObject | unknown>;
}> | 'automatic' | undefined;
type McpToolSet<TOOL_SCHEMAS extends ToolSchemas = 'automatic'> = TOOL_SCHEMAS extends Record<string, {
    inputSchema: FlexibleSchema<any>;
}> ? {
    [K in keyof TOOL_SCHEMAS]: TOOL_SCHEMAS[K] extends {
        inputSchema: FlexibleSchema<infer INPUT>;
    } ? Tool<INPUT, CallToolResult> & Required<Pick<Tool<INPUT, CallToolResult>, 'execute'>> : never;
} : McpToolSet<Record<string, {
    inputSchema: FlexibleSchema<unknown>;
}>>;
declare const CallToolResultSchema: z.ZodUnion<[z.ZodObject<{
    _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
    content: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, z.core.$loose>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
        data: z.ZodBase64;
        mimeType: z.ZodString;
    }, z.core.$loose>, z.ZodObject<{
        type: z.ZodLiteral<"resource">;
        resource: z.ZodUnion<readonly [z.ZodObject<{
            uri: z.ZodString;
            mimeType: z.ZodOptional<z.ZodString>;
            text: z.ZodString;
        }, z.core.$loose>, z.ZodObject<{
            uri: z.ZodString;
            mimeType: z.ZodOptional<z.ZodString>;
            blob: z.ZodBase64;
        }, z.core.$loose>]>;
    }, z.core.$loose>]>>;
    isError: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$loose>, z.ZodObject<{
    _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
    toolResult: z.ZodUnknown;
}, z.core.$loose>]>;
type CallToolResult = z.infer<typeof CallToolResultSchema>;

interface MCPClientConfig {
    /** Transport configuration for connecting to the MCP server */
    transport: MCPTransportConfig | MCPTransport;
    /** Optional callback for uncaught errors */
    onUncaughtError?: (error: unknown) => void;
    /** Optional client name, defaults to 'ai-sdk-mcp-client' */
    name?: string;
}
declare function createMCPClient(config: MCPClientConfig): Promise<MCPClient>;
interface MCPClient {
    tools<TOOL_SCHEMAS extends ToolSchemas = 'automatic'>(options?: {
        schemas?: TOOL_SCHEMAS;
    }): Promise<McpToolSet<TOOL_SCHEMAS>>;
    close: () => Promise<void>;
}

/**
The result of a `transcribe` call.
It contains the transcript and additional information.
 */
interface TranscriptionResult {
    /**
     * The complete transcribed text from the audio.
     */
    readonly text: string;
    /**
     * Array of transcript segments with timing information.
     * Each segment represents a portion of the transcribed text with start and end times.
     */
    readonly segments: Array<{
        /**
         * The text content of this segment.
         */
        readonly text: string;
        /**
         * The start time of this segment in seconds.
         */
        readonly startSecond: number;
        /**
         * The end time of this segment in seconds.
         */
        readonly endSecond: number;
    }>;
    /**
     * The detected language of the audio content, as an ISO-639-1 code (e.g., 'en' for English).
     * May be undefined if the language couldn't be detected.
     */
    readonly language: string | undefined;
    /**
     * The total duration of the audio file in seconds.
     * May be undefined if the duration couldn't be determined.
     */
    readonly durationInSeconds: number | undefined;
    /**
    Warnings for the call, e.g. unsupported settings.
       */
    readonly warnings: Array<TranscriptionWarning>;
    /**
    Response metadata from the provider. There may be multiple responses if we made multiple calls to the model.
     */
    readonly responses: Array<TranscriptionModelResponseMetadata>;
    /**
    Provider metadata from the provider.
     */
    readonly providerMetadata: Record<string, Record<string, JSONValue$1>>;
}

/**
Generates transcripts using a transcription model.

@param model - The transcription model to use.
@param audio - The audio data to transcribe as DataContent (string | Uint8Array | ArrayBuffer | Buffer) or a URL.
@param providerOptions - Additional provider-specific options that are passed through to the provider
as body parameters.
@param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
@param abortSignal - An optional abort signal that can be used to cancel the call.
@param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.

@returns A result object that contains the generated transcript.
 */
declare function transcribe({ model, audio, providerOptions, maxRetries: maxRetriesArg, abortSignal, headers, }: {
    /**
  The transcription model to use.
       */
    model: TranscriptionModelV2;
    /**
  The audio data to transcribe.
     */
    audio: DataContent | URL;
    /**
  Additional provider-specific options that are passed through to the provider
  as body parameters.
  
  The outer record is keyed by the provider name, and the inner
  record is keyed by the provider-specific metadata key.
  ```ts
  {
    "openai": {
      "temperature": 0
    }
  }
  ```
       */
    providerOptions?: ProviderOptions;
    /**
  Maximum number of retries per transcript model call. Set to 0 to disable retries.
  
  @default 2
     */
    maxRetries?: number;
    /**
  Abort signal.
   */
    abortSignal?: AbortSignal;
    /**
  Additional headers to include in the request.
  Only applicable for HTTP-based providers.
   */
    headers?: Record<string, string>;
}): Promise<TranscriptionResult>;

declare const getOriginalFetch: () => typeof fetch;
declare function callCompletionApi({ api, prompt, credentials, headers, body, streamProtocol, setCompletion, setLoading, setError, setAbortController, onFinish, onError, fetch, }: {
    api: string;
    prompt: string;
    credentials: RequestCredentials | undefined;
    headers: HeadersInit | undefined;
    body: Record<string, any>;
    streamProtocol: 'data' | 'text' | undefined;
    setCompletion: (completion: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: Error | undefined) => void;
    setAbortController: (abortController: AbortController | null) => void;
    onFinish: ((prompt: string, completion: string) => void) | undefined;
    onError: ((error: Error) => void) | undefined;
    fetch: ReturnType<typeof getOriginalFetch> | undefined;
}): Promise<string | null | undefined>;

interface UIMessageStreamWriter<UI_MESSAGE extends UIMessage = UIMessage> {
    /**
     * Appends a data stream part to the stream.
     */
    write(part: InferUIMessageChunk<UI_MESSAGE>): void;
    /**
     * Merges the contents of another stream to this stream.
     */
    merge(stream: ReadableStream<InferUIMessageChunk<UI_MESSAGE>>): void;
    /**
     * Error handler that is used by the data stream writer.
     * This is intended for forwarding when merging streams
     * to prevent duplicated error masking.
     */
    onError: ErrorHandler | undefined;
}

declare function createUIMessageStream<UI_MESSAGE extends UIMessage>({ execute, onError, originalMessages, onFinish, generateId, }: {
    execute: (options: {
        writer: UIMessageStreamWriter<UI_MESSAGE>;
    }) => Promise<void> | void;
    onError?: (error: unknown) => string;
    /**
     * The original messages. If they are provided, persistence mode is assumed,
     * and a message ID is provided for the response message.
     */
    originalMessages?: UI_MESSAGE[];
    onFinish?: UIMessageStreamOnFinishCallback<UI_MESSAGE>;
    generateId?: IdGenerator;
}): ReadableStream<InferUIMessageChunk<UI_MESSAGE>>;

declare function createUIMessageStreamResponse({ status, statusText, headers, stream, consumeSseStream, }: UIMessageStreamResponseInit & {
    stream: ReadableStream<UIMessageChunk>;
}): Response;

declare class JsonToSseTransformStream extends TransformStream<unknown, string> {
    constructor();
}

declare function pipeUIMessageStreamToResponse({ response, status, statusText, headers, stream, consumeSseStream, }: {
    response: ServerResponse;
    stream: ReadableStream<UIMessageChunk>;
} & UIMessageStreamResponseInit): void;

/**
 * Transforms a stream of `UIMessageChunk`s into an `AsyncIterableStream` of `UIMessage`s.
 *
 * @param options.message - The last assistant message to use as a starting point when the conversation is resumed. Otherwise undefined.
 * @param options.stream - The stream of `UIMessageChunk`s to read.
 * @param options.terminateOnError - Whether to terminate the stream if an error occurs.
 * @param options.onError - A function that is called when an error occurs.
 *
 * @returns An `AsyncIterableStream` of `UIMessage`s. Each stream part is a different state of the same message
 * as it is being completed.
 */
declare function readUIMessageStream<UI_MESSAGE extends UIMessage>({ message, stream, onError, terminateOnError, }: {
    message?: UI_MESSAGE;
    stream: ReadableStream<UIMessageChunk>;
    onError?: (error: unknown) => void;
    terminateOnError?: boolean;
}): AsyncIterableStream<UI_MESSAGE>;

declare const UI_MESSAGE_STREAM_HEADERS: {
    'content-type': string;
    'cache-control': string;
    connection: string;
    'x-vercel-ai-ui-message-stream': string;
    'x-accel-buffering': string;
};

/**
 * Transport interface for handling chat message communication and streaming.
 *
 * The `ChatTransport` interface provides fine-grained control over how messages
 * are sent to API endpoints and how responses are processed. This enables
 * alternative communication protocols like WebSockets, custom authentication
 * patterns, or specialized backend integrations.
 *
 * @template UI_MESSAGE - The UI message type extending UIMessage
 */
interface ChatTransport<UI_MESSAGE extends UIMessage> {
    /**
     * Sends messages to the chat API endpoint and returns a streaming response.
     *
     * This method handles both new message submission and message regeneration.
     * It supports real-time streaming of responses through UIMessageChunk events.
     *
     * @param options - Configuration object containing:
     * @param options.trigger - The type of message submission:
     *   - `'submit-message'`: Submitting a new user message
     *   - `'regenerate-message'`: Regenerating an assistant response
     * @param options.chatId - Unique identifier for the chat session
     * @param options.messageId - ID of the message to regenerate (for regenerate-message trigger) or undefined for new messages
     * @param options.messages - Array of UI messages representing the conversation history
     * @param options.abortSignal - Signal to abort the request if needed
     * @param options.headers - Additional HTTP headers to include in the request
     * @param options.body - Additional JSON properties to include in the request body
     * @param options.metadata - Custom metadata to attach to the request
     *
     * @returns Promise resolving to a ReadableStream of UIMessageChunk objects.
     *   The stream emits various chunk types like:
     *   - `text-start`, `text-delta`, `text-end`: For streaming text content
     *   - `tool-input-start`, `tool-input-delta`, `tool-input-available`: For tool calls
     *   - `data-part-start`, `data-part-delta`, `data-part-available`: For data parts
     *   - `error`: For error handling
     *
     * @throws Error when the API request fails or response is invalid
     */
    sendMessages: (options: {
        /** The type of message submission - either new message or regeneration */
        trigger: 'submit-message' | 'regenerate-message';
        /** Unique identifier for the chat session */
        chatId: string;
        /** ID of the message to regenerate, or undefined for new messages */
        messageId: string | undefined;
        /** Array of UI messages representing the conversation history */
        messages: UI_MESSAGE[];
        /** Signal to abort the request if needed */
        abortSignal: AbortSignal | undefined;
    } & ChatRequestOptions) => Promise<ReadableStream<UIMessageChunk>>;
    /**
     * Reconnects to an existing streaming response for the specified chat session.
     *
     * This method is used to resume streaming when a connection is interrupted
     * or when resuming a chat session. It's particularly useful for maintaining
     * continuity in long-running conversations or recovering from network issues.
     *
     * @param options - Configuration object containing:
     * @param options.chatId - Unique identifier for the chat session to reconnect to
     * @param options.headers - Additional HTTP headers to include in the reconnection request
     * @param options.body - Additional JSON properties to include in the request body
     * @param options.metadata - Custom metadata to attach to the request
     *
     * @returns Promise resolving to:
     *   - `ReadableStream<UIMessageChunk>`: If an active stream is found and can be resumed
     *   - `null`: If no active stream exists for the specified chat session (e.g., response already completed)
     *
     * @throws Error when the reconnection request fails or response is invalid
     */
    reconnectToStream: (options: {
        /** Unique identifier for the chat session to reconnect to */
        chatId: string;
    } & ChatRequestOptions) => Promise<ReadableStream<UIMessageChunk> | null>;
}

type CreateUIMessage<UI_MESSAGE extends UIMessage> = Omit<UI_MESSAGE, 'id' | 'role'> & {
    id?: UI_MESSAGE['id'];
    role?: UI_MESSAGE['role'];
};
type UIDataPartSchemas = Record<string, Validator<any> | StandardSchemaV1<any>>;
type UIDataTypesToSchemas<T extends UIDataTypes> = {
    [K in keyof T]: Validator<T[K]> | StandardSchemaV1<T[K]>;
};
type InferUIDataParts<T extends UIDataPartSchemas> = {
    [K in keyof T]: T[K] extends Validator<infer U> ? U : T[K] extends StandardSchemaV1<infer U> ? U : unknown;
};
type ChatRequestOptions = {
    /**
    Additional headers that should be to be passed to the API endpoint.
     */
    headers?: Record<string, string> | Headers;
    /**
    Additional body JSON properties that should be sent to the API endpoint.
     */
    body?: object;
    metadata?: unknown;
};
type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';
interface ChatState<UI_MESSAGE extends UIMessage> {
    status: ChatStatus;
    error: Error | undefined;
    messages: UI_MESSAGE[];
    pushMessage: (message: UI_MESSAGE) => void;
    popMessage: () => void;
    replaceMessage: (index: number, message: UI_MESSAGE) => void;
    snapshot: <T>(thing: T) => T;
}
type ChatOnErrorCallback = (error: Error) => void;
type ChatOnToolCallCallback<UI_MESSAGE extends UIMessage = UIMessage> = (options: {
    toolCall: InferUIMessageToolCall<UI_MESSAGE>;
}) => void | PromiseLike<void>;
type ChatOnDataCallback<UI_MESSAGE extends UIMessage> = (dataPart: DataUIPart<InferUIMessageData<UI_MESSAGE>>) => void;
/**
 * Function that is called when the assistant response has finished streaming.
 *
 * @param message The assistant message that was streamed.
 * @param messages The full chat history, including the assistant message.
 *
 * @param isAbort Indicates whether the request has been aborted.
 * @param isDisconnect Indicates whether the request has been ended by a network error.
 * @param isError Indicates whether the request has been ended by an error.
 */
type ChatOnFinishCallback<UI_MESSAGE extends UIMessage> = (options: {
    message: UI_MESSAGE;
    messages: UI_MESSAGE[];
    isAbort: boolean;
    isDisconnect: boolean;
    isError: boolean;
}) => void;
interface ChatInit<UI_MESSAGE extends UIMessage> {
    /**
     * A unique identifier for the chat. If not provided, a random one will be
     * generated.
     */
    id?: string;
    messageMetadataSchema?: Validator<InferUIMessageMetadata<UI_MESSAGE>> | StandardSchemaV1<InferUIMessageMetadata<UI_MESSAGE>>;
    dataPartSchemas?: UIDataTypesToSchemas<InferUIMessageData<UI_MESSAGE>>;
    messages?: UI_MESSAGE[];
    /**
     * A way to provide a function that is going to be used for ids for messages and the chat.
     * If not provided the default AI SDK `generateId` is used.
     */
    generateId?: IdGenerator;
    transport?: ChatTransport<UI_MESSAGE>;
    /**
     * Callback function to be called when an error is encountered.
     */
    onError?: ChatOnErrorCallback;
    /**
    Optional callback function that is invoked when a tool call is received.
    Intended for automatic client-side tool execution.
  
    You can optionally return a result for the tool call,
    either synchronously or asynchronously.
       */
    onToolCall?: ChatOnToolCallCallback<UI_MESSAGE>;
    /**
     * Function that is called when the assistant response has finished streaming.
     */
    onFinish?: ChatOnFinishCallback<UI_MESSAGE>;
    /**
     * Optional callback function that is called when a data part is received.
     *
     * @param data The data part that was received.
     */
    onData?: ChatOnDataCallback<UI_MESSAGE>;
    /**
     * When provided, this function will be called when the stream is finished or a tool call is added
     * to determine if the current messages should be resubmitted.
     */
    sendAutomaticallyWhen?: (options: {
        messages: UI_MESSAGE[];
    }) => boolean | PromiseLike<boolean>;
}
declare abstract class AbstractChat<UI_MESSAGE extends UIMessage> {
    readonly id: string;
    readonly generateId: IdGenerator;
    protected state: ChatState<UI_MESSAGE>;
    private messageMetadataSchema;
    private dataPartSchemas;
    private readonly transport;
    private onError?;
    private onToolCall?;
    private onFinish?;
    private onData?;
    private sendAutomaticallyWhen?;
    private activeResponse;
    private jobExecutor;
    constructor({ generateId, id, transport, messageMetadataSchema, dataPartSchemas, state, onError, onToolCall, onFinish, onData, sendAutomaticallyWhen, }: Omit<ChatInit<UI_MESSAGE>, 'messages'> & {
        state: ChatState<UI_MESSAGE>;
    });
    /**
     * Hook status:
     *
     * - `submitted`: The message has been sent to the API and we're awaiting the start of the response stream.
     * - `streaming`: The response is actively streaming in from the API, receiving chunks of data.
     * - `ready`: The full response has been received and processed; a new user message can be submitted.
     * - `error`: An error occurred during the API request, preventing successful completion.
     */
    get status(): ChatStatus;
    protected setStatus({ status, error, }: {
        status: ChatStatus;
        error?: Error;
    }): void;
    get error(): Error | undefined;
    get messages(): UI_MESSAGE[];
    get lastMessage(): UI_MESSAGE | undefined;
    set messages(messages: UI_MESSAGE[]);
    /**
     * Appends or replaces a user message to the chat list. This triggers the API call to fetch
     * the assistant's response.
     *
     * If a messageId is provided, the message will be replaced.
     */
    sendMessage: (message?: (CreateUIMessage<UI_MESSAGE> & {
        text?: never;
        files?: never;
        messageId?: string;
    }) | {
        text: string;
        files?: FileList | FileUIPart[];
        metadata?: InferUIMessageMetadata<UI_MESSAGE>;
        parts?: never;
        messageId?: string;
    } | {
        files: FileList | FileUIPart[];
        metadata?: InferUIMessageMetadata<UI_MESSAGE>;
        parts?: never;
        messageId?: string;
    }, options?: ChatRequestOptions) => Promise<void>;
    /**
     * Regenerate the assistant message with the provided message id.
     * If no message id is provided, the last assistant message will be regenerated.
     */
    regenerate: ({ messageId, ...options }?: {
        messageId?: string;
    } & ChatRequestOptions) => Promise<void>;
    /**
     * Attempt to resume an ongoing streaming response.
     */
    resumeStream: (options?: ChatRequestOptions) => Promise<void>;
    /**
     * Clear the error state and set the status to ready if the chat is in an error state.
     */
    clearError: () => void;
    addToolResult: <TOOL extends keyof InferUIMessageTools<UI_MESSAGE>>({ state, tool, toolCallId, output, errorText, }: {
        state?: "output-available";
        tool: TOOL;
        toolCallId: string;
        output: InferUIMessageTools<UI_MESSAGE>[TOOL]["output"];
        errorText?: never;
    } | {
        state: "output-error";
        tool: TOOL;
        toolCallId: string;
        output?: never;
        errorText: string;
    }) => Promise<void>;
    /**
     * Abort the current request immediately, keep the generated tokens if any.
     */
    stop: () => Promise<void>;
    private makeRequest;
}

declare function convertFileListToFileUIParts(files: FileList | undefined): Promise<Array<FileUIPart>>;

/**
Converts an array of messages from useChat into an array of CoreMessages that can be used
with the AI core functions (e.g. `streamText`).

@param messages - The messages to convert.
@param options.tools - The tools to use.
@param options.ignoreIncompleteToolCalls - Whether to ignore incomplete tool calls. Default is `false`.
 */
declare function convertToModelMessages(messages: Array<Omit<UIMessage, 'id'>>, options?: {
    tools?: ToolSet;
    ignoreIncompleteToolCalls?: boolean;
}): ModelMessage[];
/**
@deprecated Use `convertToModelMessages` instead.
 */
declare const convertToCoreMessages: typeof convertToModelMessages;

type PrepareSendMessagesRequest<UI_MESSAGE extends UIMessage> = (options: {
    id: string;
    messages: UI_MESSAGE[];
    requestMetadata: unknown;
    body: Record<string, any> | undefined;
    credentials: RequestCredentials | undefined;
    headers: HeadersInit | undefined;
    api: string;
} & {
    trigger: 'submit-message' | 'regenerate-message';
    messageId: string | undefined;
}) => {
    body: object;
    headers?: HeadersInit;
    credentials?: RequestCredentials;
    api?: string;
} | PromiseLike<{
    body: object;
    headers?: HeadersInit;
    credentials?: RequestCredentials;
    api?: string;
}>;
type PrepareReconnectToStreamRequest = (options: {
    id: string;
    requestMetadata: unknown;
    body: Record<string, any> | undefined;
    credentials: RequestCredentials | undefined;
    headers: HeadersInit | undefined;
    api: string;
}) => {
    headers?: HeadersInit;
    credentials?: RequestCredentials;
    api?: string;
} | PromiseLike<{
    headers?: HeadersInit;
    credentials?: RequestCredentials;
    api?: string;
}>;
/**
 * Options for the `HttpChatTransport` class.
 *
 * @param UI_MESSAGE - The type of message to be used in the chat.
 */
type HttpChatTransportInitOptions<UI_MESSAGE extends UIMessage> = {
    /**
     * The API URL to be used for the chat transport.
     * Defaults to '/api/chat'.
     */
    api?: string;
    /**
     * The credentials mode to be used for the fetch request.
     * Possible values are: 'omit', 'same-origin', 'include'.
     * Defaults to 'same-origin'.
     */
    credentials?: Resolvable<RequestCredentials>;
    /**
     * HTTP headers to be sent with the API request.
     */
    headers?: Resolvable<Record<string, string> | Headers>;
    /**
     * Extra body object to be sent with the API request.
     * @example
     * Send a `sessionId` to the API along with the messages.
     * ```js
     * useChat({
     *   body: {
     *     sessionId: '123',
     *   }
     * })
     * ```
     */
    body?: Resolvable<object>;
    /**
    Custom fetch implementation. You can use it as a middleware to intercept requests,
    or to provide a custom fetch implementation for e.g. testing.
        */
    fetch?: FetchFunction;
    /**
     * When a function is provided, it will be used
     * to prepare the request body for the chat API. This can be useful for
     * customizing the request body based on the messages and data in the chat.
     *
     * @param id The id of the chat.
     * @param messages The current messages in the chat.
     * @param requestBody The request body object passed in the chat request.
     */
    prepareSendMessagesRequest?: PrepareSendMessagesRequest<UI_MESSAGE>;
    /**
     * When a function is provided, it will be used
     * to prepare the request body for the chat API. This can be useful for
     * customizing the request body based on the messages and data in the chat.
     *
     * @param id The id of the chat.
     * @param messages The current messages in the chat.
     * @param requestBody The request body object passed in the chat request.
     */
    prepareReconnectToStreamRequest?: PrepareReconnectToStreamRequest;
};
declare abstract class HttpChatTransport<UI_MESSAGE extends UIMessage> implements ChatTransport<UI_MESSAGE> {
    protected api: string;
    protected credentials: HttpChatTransportInitOptions<UI_MESSAGE>['credentials'];
    protected headers: HttpChatTransportInitOptions<UI_MESSAGE>['headers'];
    protected body: HttpChatTransportInitOptions<UI_MESSAGE>['body'];
    protected fetch?: FetchFunction;
    protected prepareSendMessagesRequest?: PrepareSendMessagesRequest<UI_MESSAGE>;
    protected prepareReconnectToStreamRequest?: PrepareReconnectToStreamRequest;
    constructor({ api, credentials, headers, body, fetch, prepareSendMessagesRequest, prepareReconnectToStreamRequest, }: HttpChatTransportInitOptions<UI_MESSAGE>);
    sendMessages({ abortSignal, ...options }: Parameters<ChatTransport<UI_MESSAGE>['sendMessages']>[0]): Promise<ReadableStream<UIMessageChunk>>;
    reconnectToStream(options: Parameters<ChatTransport<UI_MESSAGE>['reconnectToStream']>[0]): Promise<ReadableStream<UIMessageChunk> | null>;
    protected abstract processResponseStream(stream: ReadableStream<Uint8Array<ArrayBufferLike>>): ReadableStream<UIMessageChunk>;
}

declare class DefaultChatTransport<UI_MESSAGE extends UIMessage> extends HttpChatTransport<UI_MESSAGE> {
    constructor(options?: HttpChatTransportInitOptions<UI_MESSAGE>);
    protected processResponseStream(stream: ReadableStream<Uint8Array<ArrayBufferLike>>): ReadableStream<UIMessageChunk>;
}

/**
Check if the message is an assistant message with completed tool calls.
The last step of the message must have at least one tool invocation and
all tool invocations must have a result.
 */
declare function lastAssistantMessageIsCompleteWithToolCalls({ messages, }: {
    messages: UIMessage[];
}): boolean;

declare class TextStreamChatTransport<UI_MESSAGE extends UIMessage> extends HttpChatTransport<UI_MESSAGE> {
    constructor(options?: HttpChatTransportInitOptions<UI_MESSAGE>);
    protected processResponseStream(stream: ReadableStream<Uint8Array<ArrayBufferLike>>): ReadableStream<UIMessageChunk>;
}

type CompletionRequestOptions = {
    /**
    An optional object of headers to be passed to the API endpoint.
     */
    headers?: Record<string, string> | Headers;
    /**
    An optional object to be passed to the API endpoint.
       */
    body?: object;
};
type UseCompletionOptions = {
    /**
     * The API endpoint that accepts a `{ prompt: string }` object and returns
     * a stream of tokens of the AI completion response. Defaults to `/api/completion`.
     */
    api?: string;
    /**
     * An unique identifier for the chat. If not provided, a random one will be
     * generated. When provided, the `useChat` hook with the same `id` will
     * have shared states across components.
     */
    id?: string;
    /**
     * Initial prompt input of the completion.
     */
    initialInput?: string;
    /**
     * Initial completion result. Useful to load an existing history.
     */
    initialCompletion?: string;
    /**
     * Callback function to be called when the completion is finished streaming.
     */
    onFinish?: (prompt: string, completion: string) => void;
    /**
     * Callback function to be called when an error is encountered.
     */
    onError?: (error: Error) => void;
    /**
     * The credentials mode to be used for the fetch request.
     * Possible values are: 'omit', 'same-origin', 'include'.
     * Defaults to 'same-origin'.
     */
    credentials?: RequestCredentials;
    /**
     * HTTP headers to be sent with the API request.
     */
    headers?: Record<string, string> | Headers;
    /**
     * Extra body object to be sent with the API request.
     * @example
     * Send a `sessionId` to the API along with the prompt.
     * ```js
     * useChat({
     *   body: {
     *     sessionId: '123',
     *   }
     * })
     * ```
     */
    body?: object;
    /**
    Streaming protocol that is used. Defaults to `data`.
       */
    streamProtocol?: 'data' | 'text';
    /**
    Custom fetch implementation. You can use it as a middleware to intercept requests,
    or to provide a custom fetch implementation for e.g. testing.
        */
    fetch?: FetchFunction;
};

type SafeValidateUIMessagesResult<UI_MESSAGE extends UIMessage> = {
    success: true;
    data: Array<UI_MESSAGE>;
} | {
    success: false;
    error: Error;
};
/**
 * Validates a list of UI messages like `validateUIMessages`,
 * but instead of throwing it returns `{ success: true, data }`
 * or `{ success: false, error }`.
 */
declare function safeValidateUIMessages<UI_MESSAGE extends UIMessage>({ messages, metadataSchema, dataSchemas, tools, }: {
    messages: unknown;
    metadataSchema?: Validator<UIMessage['metadata']> | StandardSchemaV1<unknown, UI_MESSAGE['metadata']>;
    dataSchemas?: {
        [NAME in keyof InferUIMessageData<UI_MESSAGE> & string]?: Validator<InferUIMessageData<UI_MESSAGE>[NAME]> | StandardSchemaV1<unknown, InferUIMessageData<UI_MESSAGE>[NAME]>;
    };
    tools?: {
        [NAME in keyof InferUIMessageTools<UI_MESSAGE> & string]?: Tool<InferUIMessageTools<UI_MESSAGE>[NAME]['input'], InferUIMessageTools<UI_MESSAGE>[NAME]['output']>;
    };
}): Promise<SafeValidateUIMessagesResult<UI_MESSAGE>>;
/**
 * Validates a list of UI messages.
 *
 * Metadata, data parts, and generic tool call structures are only validated if
 * the corresponding schemas are provided. Otherwise, they are assumed to be
 * valid.
 */
declare function validateUIMessages<UI_MESSAGE extends UIMessage>({ messages, metadataSchema, dataSchemas, tools, }: {
    messages: unknown;
    metadataSchema?: Validator<UIMessage['metadata']> | StandardSchemaV1<unknown, UI_MESSAGE['metadata']>;
    dataSchemas?: {
        [NAME in keyof InferUIMessageData<UI_MESSAGE> & string]?: Validator<InferUIMessageData<UI_MESSAGE>[NAME]> | StandardSchemaV1<unknown, InferUIMessageData<UI_MESSAGE>[NAME]>;
    };
    tools?: {
        [NAME in keyof InferUIMessageTools<UI_MESSAGE> & string]?: Tool<InferUIMessageTools<UI_MESSAGE>[NAME]['input'], InferUIMessageTools<UI_MESSAGE>[NAME]['output']>;
    };
}): Promise<Array<UI_MESSAGE>>;

declare global {
    /**
     * The default provider to use for the AI SDK.
     * String model ids are resolved to the default provider and model id.
     *
     * If not set, the default provider is the Vercel AI gateway provider.
     *
     * @see https://ai-sdk.dev/docs/ai-sdk-core/provider-management#global-provider-configuration
     */
    var AI_SDK_DEFAULT_PROVIDER: ProviderV2 | undefined;
    /**
     * The warning logger to use for the AI SDK.
     *
     * If not set, the default logger is the console.warn function.
     *
     * If set to false, no warnings are logged.
     */
    var AI_SDK_LOG_WARNINGS: LogWarningsFunction | undefined | false;
}

export { AbstractChat, AsyncIterableStream, CallSettings, CallWarning, ChatInit, ChatOnDataCallback, ChatOnErrorCallback, ChatOnFinishCallback, ChatOnToolCallCallback, ChatRequestOptions, ChatState, ChatStatus, ChatTransport, ChunkDetector, CompletionRequestOptions, CoreAssistantMessage, CoreMessage, CoreSystemMessage, CoreToolMessage, CoreUserMessage, CreateUIMessage, DataUIPart, DeepPartial, DefaultChatTransport, DownloadError, DynamicToolCall, DynamicToolError, DynamicToolResult, DynamicToolUIPart, EmbedManyResult, EmbedResult, Embedding, EmbeddingModel, EmbeddingModelUsage, ErrorHandler, Agent as Experimental_Agent, AgentSettings as Experimental_AgentSettings, DownloadFunction as Experimental_DownloadFunction, GenerateImageResult as Experimental_GenerateImageResult, GeneratedFile as Experimental_GeneratedImage, InferAgentUIMessage as Experimental_InferAgentUIMessage, LogWarningsFunction as Experimental_LogWarningsFunction, SpeechResult as Experimental_SpeechResult, TranscriptionResult as Experimental_TranscriptionResult, Warning as Experimental_Warning, FileUIPart, FinishReason, GenerateObjectResult, GenerateTextOnStepFinishCallback, GenerateTextResult, GeneratedAudioFile, GeneratedFile, HttpChatTransport, HttpChatTransportInitOptions, ImageModel, ImageGenerationWarning as ImageModelCallWarning, ImageModelProviderMetadata, ImageModelResponseMetadata, InferUIDataParts, InferUIMessageChunk, InferUITool, InferUITools, InvalidArgumentError, InvalidDataContentError, InvalidMessageRoleError, InvalidStreamPartError, InvalidToolInputError, JSONRPCError, JSONRPCMessage, JSONRPCNotification, JSONRPCRequest, JSONRPCResponse, JSONValue, JsonToSseTransformStream, LanguageModel, LanguageModelMiddleware, LanguageModelRequestMetadata, LanguageModelResponseMetadata, LanguageModelUsage, MCPClientError, MCPTransport, MessageConversionError, NoImageGeneratedError, NoObjectGeneratedError, NoOutputGeneratedError, NoOutputSpecifiedError, NoSuchProviderError, NoSuchToolError, ObjectStreamPart, output as Output, PrepareReconnectToStreamRequest, PrepareSendMessagesRequest, PrepareStepFunction, PrepareStepResult, Prompt, Provider, ProviderMetadata, ProviderRegistryProvider, ReasoningOutput, ReasoningUIPart, RepairTextFunction, RetryError, SafeValidateUIMessagesResult, SerialJobExecutor, SourceDocumentUIPart, SourceUrlUIPart, SpeechModel, SpeechModelResponseMetadata, SpeechWarning, StaticToolCall, StaticToolError, StaticToolResult, StepResult, StepStartUIPart, StopCondition, StreamObjectOnFinishCallback, StreamObjectResult, StreamTextOnChunkCallback, StreamTextOnErrorCallback, StreamTextOnFinishCallback, StreamTextOnStepFinishCallback, StreamTextResult, StreamTextTransform, TelemetrySettings, TextStreamChatTransport, TextStreamPart, TextUIPart, ToolCallRepairError, ToolCallRepairFunction, ToolChoice, ToolSet, ToolUIPart, TranscriptionModel, TranscriptionModelResponseMetadata, TranscriptionWarning, TypedToolCall, TypedToolError, TypedToolResult, UIDataPartSchemas, UIDataTypes, UIMessage, UIMessageChunk, UIMessagePart, UIMessageStreamOnFinishCallback, UIMessageStreamOptions, UIMessageStreamWriter, UITool, UIToolInvocation, UITools, UI_MESSAGE_STREAM_HEADERS, UnsupportedModelVersionError, UseCompletionOptions, assistantModelMessageSchema, callCompletionApi, consumeStream, convertFileListToFileUIParts, convertToCoreMessages, convertToModelMessages, coreAssistantMessageSchema, coreMessageSchema, coreSystemMessageSchema, coreToolMessageSchema, coreUserMessageSchema, cosineSimilarity, createProviderRegistry, createTextStreamResponse, createUIMessageStream, createUIMessageStreamResponse, customProvider, defaultSettingsMiddleware, embed, embedMany, MCPClient as experimental_MCPClient, MCPClientConfig as experimental_MCPClientConfig, createMCPClient as experimental_createMCPClient, experimental_createProviderRegistry, experimental_customProvider, generateImage as experimental_generateImage, generateSpeech as experimental_generateSpeech, transcribe as experimental_transcribe, extractReasoningMiddleware, generateObject, generateText, getTextFromDataUrl, getToolName, getToolOrDynamicToolName, hasToolCall, isDeepEqualData, isToolOrDynamicToolUIPart, isToolUIPart, lastAssistantMessageIsCompleteWithToolCalls, modelMessageSchema, parsePartialJson, pipeTextStreamToResponse, pipeUIMessageStreamToResponse, readUIMessageStream, safeValidateUIMessages, simulateReadableStream, simulateStreamingMiddleware, smoothStream, stepCountIs, streamObject, streamText, systemModelMessageSchema, toolModelMessageSchema, uiMessageChunkSchema, userModelMessageSchema, validateUIMessages, wrapLanguageModel, wrapProvider };
