import { UIMessage, AbstractChat, ChatInit, CompletionRequestOptions, UseCompletionOptions, Schema, DeepPartial } from 'ai';
export { CreateUIMessage, UIMessage, UseCompletionOptions } from 'ai';
import { FetchFunction, InferSchema } from '@ai-sdk/provider-utils';
import * as z3 from 'zod/v3';
import * as z4 from 'zod/v4';

declare class Chat<UI_MESSAGE extends UIMessage> extends AbstractChat<UI_MESSAGE> {
    #private;
    constructor({ messages, ...init }: ChatInit<UI_MESSAGE>);
    '~registerMessagesCallback': (onChange: () => void, throttleWaitMs?: number) => (() => void);
    '~registerStatusCallback': (onChange: () => void) => (() => void);
    '~registerErrorCallback': (onChange: () => void) => (() => void);
}

type UseChatHelpers<UI_MESSAGE extends UIMessage> = {
    /**
     * The id of the chat.
     */
    readonly id: string;
    /**
     * Update the `messages` state locally. This is useful when you want to
     * edit the messages on the client, and then trigger the `reload` method
     * manually to regenerate the AI response.
     */
    setMessages: (messages: UI_MESSAGE[] | ((messages: UI_MESSAGE[]) => UI_MESSAGE[])) => void;
    error: Error | undefined;
} & Pick<AbstractChat<UI_MESSAGE>, 'sendMessage' | 'regenerate' | 'stop' | 'resumeStream' | 'addToolResult' | 'status' | 'messages' | 'clearError'>;
type UseChatOptions<UI_MESSAGE extends UIMessage> = ({
    chat: Chat<UI_MESSAGE>;
} | ChatInit<UI_MESSAGE>) & {
    /**
  Custom throttle wait in ms for the chat messages and data updates.
  Default is undefined, which disables throttling.
     */
    experimental_throttle?: number;
    /**
     * Whether to resume an ongoing chat generation stream.
     */
    resume?: boolean;
};
declare function useChat<UI_MESSAGE extends UIMessage = UIMessage>({ experimental_throttle: throttleWaitMs, resume, ...options }?: UseChatOptions<UI_MESSAGE>): UseChatHelpers<UI_MESSAGE>;

type UseCompletionHelpers = {
    /** The current completion result */
    completion: string;
    /**
     * Send a new prompt to the API endpoint and update the completion state.
     */
    complete: (prompt: string, options?: CompletionRequestOptions) => Promise<string | null | undefined>;
    /** The error object of the API request */
    error: undefined | Error;
    /**
     * Abort the current API request but keep the generated tokens.
     */
    stop: () => void;
    /**
     * Update the `completion` state locally.
     */
    setCompletion: (completion: string) => void;
    /** The current value of the input */
    input: string;
    /** setState-powered method to update the input value */
    setInput: React.Dispatch<React.SetStateAction<string>>;
    /**
     * An input/textarea-ready onChange handler to control the value of the input
     * @example
     * ```jsx
     * <input onChange={handleInputChange} value={input} />
     * ```
     */
    handleInputChange: (event: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
    /**
     * Form submission handler to automatically reset input and append a user message
     * @example
     * ```jsx
     * <form onSubmit={handleSubmit}>
     *  <input onChange={handleInputChange} value={input} />
     * </form>
     * ```
     */
    handleSubmit: (event?: {
        preventDefault?: () => void;
    }) => void;
    /** Whether the API request is in progress */
    isLoading: boolean;
};
declare function useCompletion({ api, id, initialCompletion, initialInput, credentials, headers, body, streamProtocol, fetch, onFinish, onError, experimental_throttle: throttleWaitMs, }?: UseCompletionOptions & {
    /**
     * Custom throttle wait in ms for the completion and data updates.
     * Default is undefined, which disables throttling.
     */
    experimental_throttle?: number;
}): UseCompletionHelpers;

type Experimental_UseObjectOptions<SCHEMA extends z4.core.$ZodType | z3.Schema | Schema, RESULT> = {
    /**
     * The API endpoint. It should stream JSON that matches the schema as chunked text.
     */
    api: string;
    /**
     * A Zod schema that defines the shape of the complete object.
     */
    schema: SCHEMA;
    /**
     * An unique identifier. If not provided, a random one will be
     * generated. When provided, the `useObject` hook with the same `id` will
     * have shared states across components.
     */
    id?: string;
    /**
     * An optional value for the initial object.
     */
    initialValue?: DeepPartial<RESULT>;
    /**
  Custom fetch implementation. You can use it as a middleware to intercept requests,
  or to provide a custom fetch implementation for e.g. testing.
      */
    fetch?: FetchFunction;
    /**
  Callback that is called when the stream has finished.
       */
    onFinish?: (event: {
        /**
    The generated object (typed according to the schema).
    Can be undefined if the final object does not match the schema.
       */
        object: RESULT | undefined;
        /**
    Optional error object. This is e.g. a TypeValidationError when the final object does not match the schema.
     */
        error: Error | undefined;
    }) => Promise<void> | void;
    /**
     * Callback function to be called when an error is encountered.
     */
    onError?: (error: Error) => void;
    /**
     * Additional HTTP headers to be included in the request.
     */
    headers?: Record<string, string> | Headers;
    /**
     * The credentials mode to be used for the fetch request.
     * Possible values are: 'omit', 'same-origin', 'include'.
     * Defaults to 'same-origin'.
     */
    credentials?: RequestCredentials;
};
type Experimental_UseObjectHelpers<RESULT, INPUT> = {
    /**
     * Calls the API with the provided input as JSON body.
     */
    submit: (input: INPUT) => void;
    /**
     * The current value for the generated object. Updated as the API streams JSON chunks.
     */
    object: DeepPartial<RESULT> | undefined;
    /**
     * The error object of the API request if any.
     */
    error: Error | undefined;
    /**
     * Flag that indicates whether an API request is in progress.
     */
    isLoading: boolean;
    /**
     * Abort the current request immediately, keep the current partial object if any.
     */
    stop: () => void;
    /**
     * Clear the object state.
     */
    clear: () => void;
};
declare function useObject<SCHEMA extends z4.core.$ZodType | z3.Schema | Schema, RESULT = InferSchema<SCHEMA>, INPUT = any>({ api, id, schema, // required, in the future we will use it for validation
initialValue, fetch, onError, onFinish, headers, credentials, }: Experimental_UseObjectOptions<SCHEMA, RESULT>): Experimental_UseObjectHelpers<RESULT, INPUT>;
declare const experimental_useObject: typeof useObject;

export { Chat, Experimental_UseObjectHelpers, Experimental_UseObjectOptions, UseChatHelpers, UseChatOptions, UseCompletionHelpers, experimental_useObject, useChat, useCompletion };
