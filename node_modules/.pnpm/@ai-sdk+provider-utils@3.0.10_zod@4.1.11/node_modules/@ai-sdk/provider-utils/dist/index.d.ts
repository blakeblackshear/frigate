import { JSONValue, JSONParseError, TypeValidationError, APICallError, LanguageModelV2Prompt, JSONSchema7, SharedV2ProviderOptions, LanguageModelV2ToolResultOutput, LanguageModelV2ToolResultPart } from '@ai-sdk/provider';
import * as z4 from 'zod/v4';
import { ZodType, z } from 'zod/v4';
import * as z3 from 'zod/v3';
import { StandardSchemaV1 } from '@standard-schema/spec';
export * from '@standard-schema/spec';
export { EventSourceMessage, EventSourceParserStream } from 'eventsource-parser/stream';

declare function combineHeaders(...headers: Array<Record<string, string | undefined> | undefined>): Record<string, string | undefined>;

/**
 * Converts an AsyncIterator to a ReadableStream.
 *
 * @template T - The type of elements produced by the AsyncIterator.
 * @param { <T>} iterator - The AsyncIterator to convert.
 * @returns {ReadableStream<T>} - A ReadableStream that provides the same data as the AsyncIterator.
 */
declare function convertAsyncIteratorToReadableStream<T>(iterator: AsyncIterator<T>): ReadableStream<T>;

/**
 * Creates a Promise that resolves after a specified delay
 * @param delayInMs - The delay duration in milliseconds. If null or undefined, resolves immediately.
 * @param signal - Optional AbortSignal to cancel the delay
 * @returns A Promise that resolves after the specified delay
 * @throws {DOMException} When the signal is aborted
 */
declare function delay(delayInMs?: number | null, options?: {
    abortSignal?: AbortSignal;
}): Promise<void>;

/**
Extracts the headers from a response object and returns them as a key-value object.

@param response - The response object to extract headers from.
@returns The headers as a key-value object.
*/
declare function extractResponseHeaders(response: Response): {
    [k: string]: string;
};

/**
 * Fetch function type (standardizes the version of fetch used).
 */
type FetchFunction = typeof globalThis.fetch;

declare function getRuntimeEnvironmentUserAgent(globalThisAny?: any): string;

/**
 * Appends suffix parts to the `user-agent` header.
 * If a `user-agent` header already exists, the suffix parts are appended to it.
 * If no `user-agent` header exists, a new one is created with the suffix parts.
 * Automatically removes undefined entries from the headers.
 *
 * @param headers - The original headers.
 * @param userAgentSuffixParts - The parts to append to the `user-agent` header.
 * @returns The new headers with the `user-agent` header set or updated.
 */
declare function withUserAgentSuffix(headers: HeadersInit | Record<string, string | undefined> | undefined, ...userAgentSuffixParts: string[]): Record<string, string>;

/**
Creates an ID generator.
The total length of the ID is the sum of the prefix, separator, and random part length.
Not cryptographically secure.

@param alphabet - The alphabet to use for the ID. Default: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.
@param prefix - The prefix of the ID to generate. Optional.
@param separator - The separator between the prefix and the random part of the ID. Default: '-'.
@param size - The size of the random part of the ID to generate. Default: 16.
 */
declare const createIdGenerator: ({ prefix, size, alphabet, separator, }?: {
    prefix?: string;
    separator?: string;
    size?: number;
    alphabet?: string;
}) => IdGenerator;
/**
A function that generates an ID.
 */
type IdGenerator = () => string;
/**
Generates a 16-character random string to use for IDs.
Not cryptographically secure.
 */
declare const generateId: IdGenerator;

declare function getErrorMessage(error: unknown | undefined): string;

/**
 * Used to mark validator functions so we can support both Zod and custom schemas.
 */
declare const validatorSymbol: unique symbol;
type ValidationResult<OBJECT> = {
    success: true;
    value: OBJECT;
} | {
    success: false;
    error: Error;
};
type Validator<OBJECT = unknown> = {
    /**
     * Used to mark validator functions so we can support both Zod and custom schemas.
     */
    [validatorSymbol]: true;
    /**
     * Optional. Validates that the structure of a value matches this schema,
     * and returns a typed version of the value if it does.
     */
    readonly validate?: (value: unknown) => ValidationResult<OBJECT> | PromiseLike<ValidationResult<OBJECT>>;
};
/**
 * Create a validator.
 *
 * @param validate A validation function for the schema.
 */
declare function validator<OBJECT>(validate?: undefined | ((value: unknown) => ValidationResult<OBJECT> | PromiseLike<ValidationResult<OBJECT>>)): Validator<OBJECT>;
declare function isValidator(value: unknown): value is Validator;
declare function asValidator<OBJECT>(value: Validator<OBJECT> | StandardSchemaV1<unknown, OBJECT>): Validator<OBJECT>;
declare function standardSchemaValidator<OBJECT>(standardSchema: StandardSchemaV1<unknown, OBJECT>): Validator<OBJECT>;

/**
 * Parses a JSON string into an unknown object.
 *
 * @param text - The JSON string to parse.
 * @returns {JSONValue} - The parsed JSON object.
 */
declare function parseJSON(options: {
    text: string;
    schema?: undefined;
}): Promise<JSONValue>;
/**
 * Parses a JSON string into a strongly-typed object using the provided schema.
 *
 * @template T - The type of the object to parse the JSON into.
 * @param {string} text - The JSON string to parse.
 * @param {Validator<T>} schema - The schema to use for parsing the JSON.
 * @returns {Promise<T>} - The parsed object.
 */
declare function parseJSON<T>(options: {
    text: string;
    schema: z4.core.$ZodType<T> | z3.Schema<T> | Validator<T>;
}): Promise<T>;
type ParseResult<T> = {
    success: true;
    value: T;
    rawValue: unknown;
} | {
    success: false;
    error: JSONParseError | TypeValidationError;
    rawValue: unknown;
};
/**
 * Safely parses a JSON string and returns the result as an object of type `unknown`.
 *
 * @param text - The JSON string to parse.
 * @returns {Promise<object>} Either an object with `success: true` and the parsed data, or an object with `success: false` and the error that occurred.
 */
declare function safeParseJSON(options: {
    text: string;
    schema?: undefined;
}): Promise<ParseResult<JSONValue>>;
/**
 * Safely parses a JSON string into a strongly-typed object, using a provided schema to validate the object.
 *
 * @template T - The type of the object to parse the JSON into.
 * @param {string} text - The JSON string to parse.
 * @param {Validator<T>} schema - The schema to use for parsing the JSON.
 * @returns An object with either a `success` flag and the parsed and typed data, or a `success` flag and an error object.
 */
declare function safeParseJSON<T>(options: {
    text: string;
    schema: z4.core.$ZodType<T> | z3.Schema<T> | Validator<T>;
}): Promise<ParseResult<T>>;
declare function isParsableJson(input: string): boolean;

type ResponseHandler<RETURN_TYPE> = (options: {
    url: string;
    requestBodyValues: unknown;
    response: Response;
}) => PromiseLike<{
    value: RETURN_TYPE;
    rawValue?: unknown;
    responseHeaders?: Record<string, string>;
}>;
declare const createJsonErrorResponseHandler: <T>({ errorSchema, errorToMessage, isRetryable, }: {
    errorSchema: ZodType<T>;
    errorToMessage: (error: T) => string;
    isRetryable?: (response: Response, error?: T) => boolean;
}) => ResponseHandler<APICallError>;
declare const createEventSourceResponseHandler: <T>(chunkSchema: ZodType<T>) => ResponseHandler<ReadableStream<ParseResult<T>>>;
declare const createJsonStreamResponseHandler: <T>(chunkSchema: ZodType<T>) => ResponseHandler<ReadableStream<ParseResult<T>>>;
declare const createJsonResponseHandler: <T>(responseSchema: ZodType<T>) => ResponseHandler<T>;
declare const createBinaryResponseHandler: () => ResponseHandler<Uint8Array>;
declare const createStatusCodeErrorResponseHandler: () => ResponseHandler<APICallError>;

declare const getFromApi: <T>({ url, headers, successfulResponseHandler, failedResponseHandler, abortSignal, fetch, }: {
    url: string;
    headers?: Record<string, string | undefined>;
    failedResponseHandler: ResponseHandler<Error>;
    successfulResponseHandler: ResponseHandler<T>;
    abortSignal?: AbortSignal;
    fetch?: FetchFunction;
}) => Promise<{
    value: T;
    rawValue?: unknown;
    responseHeaders?: Record<string, string>;
}>;

declare function injectJsonInstructionIntoMessages({ messages, schema, schemaPrefix, schemaSuffix, }: {
    messages: LanguageModelV2Prompt;
    schema?: JSONSchema7;
    schemaPrefix?: string;
    schemaSuffix?: string;
}): LanguageModelV2Prompt;

declare function isAbortError(error: unknown): error is Error;

/**
 * Checks if the given URL is supported natively by the model.
 *
 * @param mediaType - The media type of the URL. Case-sensitive.
 * @param url - The URL to check.
 * @param supportedUrls - A record where keys are case-sensitive media types (or '*')
 *                        and values are arrays of RegExp patterns for URLs.
 *
 * @returns `true` if the URL matches a pattern under the specific media type
 *          or the wildcard '*', `false` otherwise.
 */
declare function isUrlSupported({ mediaType, url, supportedUrls, }: {
    mediaType: string;
    url: string;
    supportedUrls: Record<string, RegExp[]>;
}): boolean;

declare function loadApiKey({ apiKey, environmentVariableName, apiKeyParameterName, description, }: {
    apiKey: string | undefined;
    environmentVariableName: string;
    apiKeyParameterName?: string;
    description: string;
}): string;

/**
 * Loads an optional `string` setting from the environment or a parameter.
 *
 * @param settingValue - The setting value.
 * @param environmentVariableName - The environment variable name.
 * @returns The setting value.
 */
declare function loadOptionalSetting({ settingValue, environmentVariableName, }: {
    settingValue: string | undefined;
    environmentVariableName: string;
}): string | undefined;

/**
 * Loads a `string` setting from the environment or a parameter.
 *
 * @param settingValue - The setting value.
 * @param environmentVariableName - The environment variable name.
 * @param settingName - The setting name.
 * @param description - The description of the setting.
 * @returns The setting value.
 */
declare function loadSetting({ settingValue, environmentVariableName, settingName, description, }: {
    settingValue: string | undefined;
    environmentVariableName: string;
    settingName: string;
    description: string;
}): string;

/**
 * Maps a media type to its corresponding file extension.
 * It was originally introduced to set a filename for audio file uploads
 * in https://github.com/vercel/ai/pull/8159.
 *
 * @param mediaType The media type to map.
 * @returns The corresponding file extension
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types/Common_types
 */
declare function mediaTypeToExtension(mediaType: string): string;

/**
 * Parses a JSON event stream into a stream of parsed JSON objects.
 */
declare function parseJsonEventStream<T>({ stream, schema, }: {
    stream: ReadableStream<Uint8Array>;
    schema: ZodType<T>;
}): ReadableStream<ParseResult<T>>;

declare function parseProviderOptions<T>({ provider, providerOptions, schema, }: {
    provider: string;
    providerOptions: Record<string, unknown> | undefined;
    schema: z.core.$ZodType<T, any>;
}): Promise<T | undefined>;

declare const postJsonToApi: <T>({ url, headers, body, failedResponseHandler, successfulResponseHandler, abortSignal, fetch, }: {
    url: string;
    headers?: Record<string, string | undefined>;
    body: unknown;
    failedResponseHandler: ResponseHandler<APICallError>;
    successfulResponseHandler: ResponseHandler<T>;
    abortSignal?: AbortSignal;
    fetch?: FetchFunction;
}) => Promise<{
    value: T;
    rawValue?: unknown;
    responseHeaders?: Record<string, string>;
}>;
declare const postFormDataToApi: <T>({ url, headers, formData, failedResponseHandler, successfulResponseHandler, abortSignal, fetch, }: {
    url: string;
    headers?: Record<string, string | undefined>;
    formData: FormData;
    failedResponseHandler: ResponseHandler<APICallError>;
    successfulResponseHandler: ResponseHandler<T>;
    abortSignal?: AbortSignal;
    fetch?: FetchFunction;
}) => Promise<{
    value: T;
    rawValue?: unknown;
    responseHeaders?: Record<string, string>;
}>;
declare const postToApi: <T>({ url, headers, body, successfulResponseHandler, failedResponseHandler, abortSignal, fetch, }: {
    url: string;
    headers?: Record<string, string | undefined>;
    body: {
        content: string | FormData | Uint8Array;
        values: unknown;
    };
    failedResponseHandler: ResponseHandler<Error>;
    successfulResponseHandler: ResponseHandler<T>;
    abortSignal?: AbortSignal;
    fetch?: FetchFunction;
}) => Promise<{
    value: T;
    rawValue?: unknown;
    responseHeaders?: Record<string, string>;
}>;

/**
 * Used to mark schemas so we can support both Zod and custom schemas.
 */
declare const schemaSymbol: unique symbol;
type Schema<OBJECT = unknown> = Validator<OBJECT> & {
    /**
     * Used to mark schemas so we can support both Zod and custom schemas.
     */
    [schemaSymbol]: true;
    /**
     * Schema type for inference.
     */
    _type: OBJECT;
    /**
     * The JSON Schema for the schema. It is passed to the providers.
     */
    readonly jsonSchema: JSONSchema7;
};
type FlexibleSchema<T> = z4.core.$ZodType<T, any> | z3.Schema<T, z3.ZodTypeDef, any> | Schema<T>;
type InferSchema<SCHEMA> = SCHEMA extends z3.Schema ? z3.infer<SCHEMA> : SCHEMA extends z4.core.$ZodType ? z4.infer<SCHEMA> : SCHEMA extends Schema<infer T> ? T : never;
/**
 * Create a schema using a JSON Schema.
 *
 * @param jsonSchema The JSON Schema for the schema.
 * @param options.validate Optional. A validation function for the schema.
 */
declare function jsonSchema<OBJECT = unknown>(jsonSchema: JSONSchema7, { validate, }?: {
    validate?: (value: unknown) => ValidationResult<OBJECT> | PromiseLike<ValidationResult<OBJECT>>;
}): Schema<OBJECT>;
declare function asSchema<OBJECT>(schema: z4.core.$ZodType<OBJECT, any> | z3.Schema<OBJECT, z3.ZodTypeDef, any> | Schema<OBJECT> | undefined): Schema<OBJECT>;

/**
Additional provider-specific options.

They are passed through to the provider from the AI SDK and enable
provider-specific functionality that can be fully encapsulated in the provider.
 */
type ProviderOptions = SharedV2ProviderOptions;

/**
Data content. Can either be a base64-encoded string, a Uint8Array, an ArrayBuffer, or a Buffer.
 */
type DataContent = string | Uint8Array | ArrayBuffer | Buffer;

/**
Text content part of a prompt. It contains a string of text.
 */
interface TextPart {
    type: 'text';
    /**
  The text content.
     */
    text: string;
    /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
   */
    providerOptions?: ProviderOptions;
}
/**
Image content part of a prompt. It contains an image.
 */
interface ImagePart {
    type: 'image';
    /**
  Image data. Can either be:
  
  - data: a base64-encoded string, a Uint8Array, an ArrayBuffer, or a Buffer
  - URL: a URL that points to the image
     */
    image: DataContent | URL;
    /**
  Optional IANA media type of the image.
  
  @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    mediaType?: string;
    /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
   */
    providerOptions?: ProviderOptions;
}
/**
File content part of a prompt. It contains a file.
 */
interface FilePart {
    type: 'file';
    /**
  File data. Can either be:
  
  - data: a base64-encoded string, a Uint8Array, an ArrayBuffer, or a Buffer
  - URL: a URL that points to the image
     */
    data: DataContent | URL;
    /**
  Optional filename of the file.
     */
    filename?: string;
    /**
  IANA media type of the file.
  
  @see https://www.iana.org/assignments/media-types/media-types.xhtml
     */
    mediaType: string;
    /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
   */
    providerOptions?: ProviderOptions;
}
/**
 * Reasoning content part of a prompt. It contains a reasoning.
 */
interface ReasoningPart {
    type: 'reasoning';
    /**
  The reasoning text.
     */
    text: string;
    /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
   */
    providerOptions?: ProviderOptions;
}
/**
Tool call content part of a prompt. It contains a tool call (usually generated by the AI model).
 */
interface ToolCallPart {
    type: 'tool-call';
    /**
  ID of the tool call. This ID is used to match the tool call with the tool result.
   */
    toolCallId: string;
    /**
  Name of the tool that is being called.
   */
    toolName: string;
    /**
  Arguments of the tool call. This is a JSON-serializable object that matches the tool's input schema.
     */
    input: unknown;
    /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
   */
    providerOptions?: ProviderOptions;
    /**
  Whether the tool call was executed by the provider.
   */
    providerExecuted?: boolean;
}
/**
Tool result content part of a prompt. It contains the result of the tool call with the matching ID.
 */
interface ToolResultPart {
    type: 'tool-result';
    /**
  ID of the tool call that this result is associated with.
   */
    toolCallId: string;
    /**
  Name of the tool that generated this result.
    */
    toolName: string;
    /**
  Result of the tool call. This is a JSON-serializable object.
     */
    output: LanguageModelV2ToolResultOutput;
    /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
   */
    providerOptions?: ProviderOptions;
}

/**
An assistant message. It can contain text, tool calls, or a combination of text and tool calls.
 */
type AssistantModelMessage = {
    role: 'assistant';
    content: AssistantContent;
    /**
    Additional provider-specific metadata. They are passed through
    to the provider from the AI SDK and enable provider-specific
    functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
};
/**
Content of an assistant message.
It can be a string or an array of text, image, reasoning, redacted reasoning, and tool call parts.
 */
type AssistantContent = string | Array<TextPart | FilePart | ReasoningPart | ToolCallPart | ToolResultPart>;

/**
 A system message. It can contain system information.

 Note: using the "system" part of the prompt is strongly preferred
 to increase the resilience against prompt injection attacks,
 and because not all providers support several system messages.
 */
type SystemModelMessage = {
    role: 'system';
    content: string;
    /**
      Additional provider-specific metadata. They are passed through
      to the provider from the AI SDK and enable provider-specific
      functionality that can be fully encapsulated in the provider.
       */
    providerOptions?: ProviderOptions;
};

/**
A tool message. It contains the result of one or more tool calls.
 */
type ToolModelMessage = {
    role: 'tool';
    content: ToolContent;
    /**
    Additional provider-specific metadata. They are passed through
    to the provider from the AI SDK and enable provider-specific
    functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
};
/**
Content of a tool message. It is an array of tool result parts.
 */
type ToolContent = Array<ToolResultPart>;

/**
A user message. It can contain text or a combination of text and images.
 */
type UserModelMessage = {
    role: 'user';
    content: UserContent;
    /**
      Additional provider-specific metadata. They are passed through
      to the provider from the AI SDK and enable provider-specific
      functionality that can be fully encapsulated in the provider.
       */
    providerOptions?: ProviderOptions;
};
/**
  Content of a user message. It can be a string or an array of text and image parts.
   */
type UserContent = string | Array<TextPart | ImagePart | FilePart>;

/**
A message that can be used in the `messages` field of a prompt.
It can be a user message, an assistant message, or a tool message.
 */
type ModelMessage = SystemModelMessage | UserModelMessage | AssistantModelMessage | ToolModelMessage;

/**
 * Additional options that are sent into each tool call.
 */
interface ToolCallOptions {
    /**
     * The ID of the tool call. You can use it e.g. when sending tool-call related information with stream data.
     */
    toolCallId: string;
    /**
     * Messages that were sent to the language model to initiate the response that contained the tool call.
     * The messages **do not** include the system prompt nor the assistant response that contained the tool call.
     */
    messages: ModelMessage[];
    /**
     * An optional abort signal that indicates that the overall operation should be aborted.
     */
    abortSignal?: AbortSignal;
    /**
     * Additional context.
     *
     * Experimental (can break in patch releases).
     */
    experimental_context?: unknown;
}
type ToolExecuteFunction<INPUT, OUTPUT> = (input: INPUT, options: ToolCallOptions) => AsyncIterable<OUTPUT> | PromiseLike<OUTPUT> | OUTPUT;
type NeverOptional<N, T> = 0 extends 1 & N ? Partial<T> : [N] extends [never] ? Partial<Record<keyof T, undefined>> : T;
type ToolOutputProperties<INPUT, OUTPUT> = NeverOptional<OUTPUT, {
    /**
An async function that is called with the arguments from the tool call and produces a result.
If not provided, the tool will not be executed automatically.

@args is the input of the tool call.
@options.abortSignal is a signal that can be used to abort the tool call.
  */
    execute: ToolExecuteFunction<INPUT, OUTPUT>;
    outputSchema?: FlexibleSchema<OUTPUT>;
} | {
    outputSchema: FlexibleSchema<OUTPUT>;
    execute?: never;
}>;
/**
A tool contains the description and the schema of the input that the tool expects.
This enables the language model to generate the input.

The tool can also contain an optional execute function for the actual execution function of the tool.
 */
type Tool<INPUT extends JSONValue | unknown | never = any, OUTPUT extends JSONValue | unknown | never = any> = {
    /**
  An optional description of what the tool does.
  Will be used by the language model to decide whether to use the tool.
  Not used for provider-defined tools.
     */
    description?: string;
    /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
     */
    providerOptions?: ProviderOptions;
    /**
  The schema of the input that the tool expects. The language model will use this to generate the input.
  It is also used to validate the output of the language model.
  Use descriptions to make the input understandable for the language model.
     */
    inputSchema: FlexibleSchema<INPUT>;
    /**
     * Optional function that is called when the argument streaming starts.
     * Only called when the tool is used in a streaming context.
     */
    onInputStart?: (options: ToolCallOptions) => void | PromiseLike<void>;
    /**
     * Optional function that is called when an argument streaming delta is available.
     * Only called when the tool is used in a streaming context.
     */
    onInputDelta?: (options: {
        inputTextDelta: string;
    } & ToolCallOptions) => void | PromiseLike<void>;
    /**
     * Optional function that is called when a tool call can be started,
     * even if the execute function is not provided.
     */
    onInputAvailable?: (options: {
        input: [INPUT] extends [never] ? undefined : INPUT;
    } & ToolCallOptions) => void | PromiseLike<void>;
} & ToolOutputProperties<INPUT, OUTPUT> & {
    /**
Optional conversion function that maps the tool result to an output that can be used by the language model.

If not provided, the tool result will be sent as a JSON object.
  */
    toModelOutput?: (output: 0 extends 1 & OUTPUT ? any : [OUTPUT] extends [never] ? any : NoInfer<OUTPUT>) => LanguageModelV2ToolResultPart['output'];
} & ({
    /**
Tool with user-defined input and output schemas.
 */
    type?: undefined | 'function';
} | {
    /**
Tool that is defined at runtime (e.g. an MCP tool).
The types of input and output are not known at development time.
   */
    type: 'dynamic';
} | {
    /**
Tool with provider-defined input and output schemas.
 */
    type: 'provider-defined';
    /**
The ID of the tool. Should follow the format `<provider-name>.<unique-tool-name>`.
*/
    id: `${string}.${string}`;
    /**
The name of the tool that the user must use in the tool set.
*/
    name: string;
    /**
The arguments for configuring the tool. Must match the expected arguments defined by the provider for this tool.
 */
    args: Record<string, unknown>;
});
/**
 * Infer the input type of a tool.
 */
type InferToolInput<TOOL extends Tool> = TOOL extends Tool<infer INPUT, any> ? INPUT : never;
/**
 * Infer the output type of a tool.
 */
type InferToolOutput<TOOL extends Tool> = TOOL extends Tool<any, infer OUTPUT> ? OUTPUT : never;
/**
Helper function for inferring the execute args of a tool.
 */
declare function tool<INPUT, OUTPUT>(tool: Tool<INPUT, OUTPUT>): Tool<INPUT, OUTPUT>;
declare function tool<INPUT>(tool: Tool<INPUT, never>): Tool<INPUT, never>;
declare function tool<OUTPUT>(tool: Tool<never, OUTPUT>): Tool<never, OUTPUT>;
declare function tool(tool: Tool<never, never>): Tool<never, never>;
/**
Helper function for defining a dynamic tool.
 */
declare function dynamicTool(tool: {
    description?: string;
    providerOptions?: ProviderOptions;
    inputSchema: FlexibleSchema<unknown>;
    execute: ToolExecuteFunction<unknown, unknown>;
    toModelOutput?: (output: unknown) => LanguageModelV2ToolResultPart['output'];
}): Tool<unknown, unknown> & {
    type: 'dynamic';
};

type ProviderDefinedToolFactory<INPUT, ARGS extends object> = <OUTPUT>(options: ARGS & {
    execute?: ToolExecuteFunction<INPUT, OUTPUT>;
    toModelOutput?: Tool<INPUT, OUTPUT>['toModelOutput'];
    onInputStart?: Tool<INPUT, OUTPUT>['onInputStart'];
    onInputDelta?: Tool<INPUT, OUTPUT>['onInputDelta'];
    onInputAvailable?: Tool<INPUT, OUTPUT>['onInputAvailable'];
}) => Tool<INPUT, OUTPUT>;
declare function createProviderDefinedToolFactory<INPUT, ARGS extends object>({ id, name, inputSchema, }: {
    id: `${string}.${string}`;
    name: string;
    inputSchema: FlexibleSchema<INPUT>;
}): ProviderDefinedToolFactory<INPUT, ARGS>;
type ProviderDefinedToolFactoryWithOutputSchema<INPUT, OUTPUT, ARGS extends object> = (options: ARGS & {
    execute?: ToolExecuteFunction<INPUT, OUTPUT>;
    toModelOutput?: Tool<INPUT, OUTPUT>['toModelOutput'];
    onInputStart?: Tool<INPUT, OUTPUT>['onInputStart'];
    onInputDelta?: Tool<INPUT, OUTPUT>['onInputDelta'];
    onInputAvailable?: Tool<INPUT, OUTPUT>['onInputAvailable'];
}) => Tool<INPUT, OUTPUT>;
declare function createProviderDefinedToolFactoryWithOutputSchema<INPUT, OUTPUT, ARGS extends object>({ id, name, inputSchema, outputSchema, }: {
    id: `${string}.${string}`;
    name: string;
    inputSchema: FlexibleSchema<INPUT>;
    outputSchema: FlexibleSchema<OUTPUT>;
}): ProviderDefinedToolFactoryWithOutputSchema<INPUT, OUTPUT, ARGS>;

/**
 * Removes entries from a record where the value is null or undefined.
 * @param record - The input object whose entries may be null or undefined.
 * @returns A new object containing only entries with non-null and non-undefined values.
 */
declare function removeUndefinedEntries<T>(record: Record<string, T | undefined>): Record<string, T>;

type Resolvable<T> = T | Promise<T> | (() => T) | (() => Promise<T>);
/**
 * Resolves a value that could be a raw value, a Promise, a function returning a value,
 * or a function returning a Promise.
 */
declare function resolve<T>(value: Resolvable<T>): Promise<T>;

declare function convertBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer>;
declare function convertUint8ArrayToBase64(array: Uint8Array): string;
declare function convertToBase64(value: string | Uint8Array): string;

/**
 * Validates the types of an unknown object using a schema and
 * return a strongly-typed object.
 *
 * @template T - The type of the object to validate.
 * @param {string} options.value - The object to validate.
 * @param {Validator<T>} options.schema - The schema to use for validating the JSON.
 * @returns {Promise<T>} - The typed object.
 */
declare function validateTypes<OBJECT>({ value, schema, }: {
    value: unknown;
    schema: StandardSchemaV1<unknown, OBJECT> | Validator<OBJECT>;
}): Promise<OBJECT>;
/**
 * Safely validates the types of an unknown object using a schema and
 * return a strongly-typed object.
 *
 * @template T - The type of the object to validate.
 * @param {string} options.value - The JSON object to validate.
 * @param {Validator<T>} options.schema - The schema to use for validating the JSON.
 * @returns An object with either a `success` flag and the parsed and typed data, or a `success` flag and an error object.
 */
declare function safeValidateTypes<OBJECT>({ value, schema, }: {
    value: unknown;
    schema: StandardSchemaV1<unknown, OBJECT> | Validator<OBJECT>;
}): Promise<{
    success: true;
    value: OBJECT;
    rawValue: unknown;
} | {
    success: false;
    error: TypeValidationError;
    rawValue: unknown;
}>;

declare function withoutTrailingSlash(url: string | undefined): string | undefined;

declare function zodSchema<OBJECT>(zodSchema: z4.core.$ZodType<OBJECT, any> | z3.Schema<OBJECT, z3.ZodTypeDef, any>, options?: {
    /**
     * Enables support for references in the schema.
     * This is required for recursive schemas, e.g. with `z.lazy`.
     * However, not all language models and providers support such references.
     * Defaults to `false`.
     */
    useReferences?: boolean;
}): Schema<OBJECT>;

declare function executeTool<INPUT, OUTPUT>({ execute, input, options, }: {
    execute: ToolExecuteFunction<INPUT, OUTPUT>;
    input: INPUT;
    options: ToolCallOptions;
}): AsyncGenerator<{
    type: 'preliminary';
    output: OUTPUT;
} | {
    type: 'final';
    output: OUTPUT;
}>;

/**
Typed tool call that is returned by generateText and streamText.
It contains the tool call ID, the tool name, and the tool arguments.
 */
interface ToolCall<NAME extends string, INPUT> {
    /**
  ID of the tool call. This ID is used to match the tool call with the tool result.
   */
    toolCallId: string;
    /**
  Name of the tool that is being called.
   */
    toolName: NAME;
    /**
  Arguments of the tool call. This is a JSON-serializable object that matches the tool's input schema.
     */
    input: INPUT;
    /**
     * Whether the tool call will be executed by the provider.
     * If this flag is not set or is false, the tool call will be executed by the client.
     */
    providerExecuted?: boolean;
    /**
     * Whether the tool is dynamic.
     */
    dynamic?: boolean;
}

/**
Typed tool result that is returned by `generateText` and `streamText`.
It contains the tool call ID, the tool name, the tool arguments, and the tool result.
 */
interface ToolResult<NAME extends string, INPUT, OUTPUT> {
    /**
  ID of the tool call. This ID is used to match the tool call with the tool result.
     */
    toolCallId: string;
    /**
  Name of the tool that was called.
     */
    toolName: NAME;
    /**
  Arguments of the tool call. This is a JSON-serializable object that matches the tool's input schema.
       */
    input: INPUT;
    /**
  Result of the tool call. This is the result of the tool's execution.
       */
    output: OUTPUT;
    /**
     * Whether the tool result has been executed by the provider.
     */
    providerExecuted?: boolean;
    /**
     * Whether the tool is dynamic.
     */
    dynamic?: boolean;
}

declare const VERSION: string;

export { type AssistantContent, type AssistantModelMessage, type DataContent, type FetchFunction, type FilePart, type FlexibleSchema, type IdGenerator, type ImagePart, type InferSchema, type InferToolInput, type InferToolOutput, type ModelMessage, type ParseResult, type ProviderDefinedToolFactory, type ProviderDefinedToolFactoryWithOutputSchema, type ProviderOptions, type ReasoningPart, type Resolvable, type ResponseHandler, type Schema, type SystemModelMessage, type TextPart, type Tool, type ToolCall, type ToolCallOptions, type ToolCallPart, type ToolContent, type ToolExecuteFunction, type ToolModelMessage, type ToolResult, type ToolResultPart, type UserContent, type UserModelMessage, VERSION, type ValidationResult, type Validator, asSchema, asValidator, combineHeaders, convertAsyncIteratorToReadableStream, convertBase64ToUint8Array, convertToBase64, convertUint8ArrayToBase64, createBinaryResponseHandler, createEventSourceResponseHandler, createIdGenerator, createJsonErrorResponseHandler, createJsonResponseHandler, createJsonStreamResponseHandler, createProviderDefinedToolFactory, createProviderDefinedToolFactoryWithOutputSchema, createStatusCodeErrorResponseHandler, delay, dynamicTool, executeTool, extractResponseHeaders, generateId, getErrorMessage, getFromApi, getRuntimeEnvironmentUserAgent, injectJsonInstructionIntoMessages, isAbortError, isParsableJson, isUrlSupported, isValidator, jsonSchema, loadApiKey, loadOptionalSetting, loadSetting, mediaTypeToExtension, parseJSON, parseJsonEventStream, parseProviderOptions, postFormDataToApi, postJsonToApi, postToApi, removeUndefinedEntries, resolve, safeParseJSON, safeValidateTypes, standardSchemaValidator, tool, validateTypes, validator, validatorSymbol, withUserAgentSuffix, withoutTrailingSlash, zodSchema };
