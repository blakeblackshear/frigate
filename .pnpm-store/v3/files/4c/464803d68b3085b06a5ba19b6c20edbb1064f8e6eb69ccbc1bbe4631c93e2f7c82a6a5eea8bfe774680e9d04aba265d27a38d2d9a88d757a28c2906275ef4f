import { JsonBodyType } from 'msw';

declare function convertArrayToAsyncIterable<T>(values: T[]): AsyncIterable<T>;

declare function convertArrayToReadableStream<T>(values: T[]): ReadableStream<T>;

declare function convertAsyncIterableToArray<T>(iterable: AsyncIterable<T>): Promise<T[]>;

declare function convertReadableStreamToArray<T>(stream: ReadableStream<T>): Promise<T[]>;

declare function convertResponseStreamToArray(response: Response): Promise<string[]>;

declare function isNodeVersion(version: number): boolean;

declare function mockId({ prefix, }?: {
    prefix?: string;
}): () => string;

type UrlResponse = {
    type: 'json-value';
    headers?: Record<string, string>;
    body: JsonBodyType;
} | {
    type: 'stream-chunks';
    headers?: Record<string, string>;
    chunks: Array<string>;
} | {
    type: 'binary';
    headers?: Record<string, string>;
    body: Buffer;
} | {
    type: 'empty';
    headers?: Record<string, string>;
    status?: number;
} | {
    type: 'error';
    headers?: Record<string, string>;
    status?: number;
    body?: string;
} | {
    type: 'controlled-stream';
    headers?: Record<string, string>;
    controller: TestResponseController;
} | undefined;
type UrlResponseParameter = UrlResponse | UrlResponse[] | ((options: {
    callNumber: number;
}) => UrlResponse);
type UrlHandler = {
    response: UrlResponseParameter;
};
type UrlHandlers<URLS extends {
    [url: string]: {
        response?: UrlResponseParameter;
    };
}> = {
    [url in keyof URLS]: UrlHandler;
};
declare class TestServerCall {
    private request;
    constructor(request: Request);
    get requestBodyJson(): Promise<any>;
    get requestBodyMultipart(): Promise<Record<string, any>> | null;
    get requestCredentials(): RequestCredentials;
    get requestHeaders(): Record<string, string>;
    get requestUserAgent(): string | undefined;
    get requestUrlSearchParams(): URLSearchParams;
    get requestUrl(): string;
    get requestMethod(): string;
}
declare function createTestServer<URLS extends {
    [url: string]: {
        response?: UrlResponseParameter;
    };
}>(routes: URLS): {
    urls: UrlHandlers<URLS>;
    calls: TestServerCall[];
};
declare class TestResponseController {
    private readonly transformStream;
    private readonly writer;
    constructor();
    get stream(): ReadableStream;
    write(chunk: string): Promise<void>;
    error(error: Error): Promise<void>;
    close(): Promise<void>;
}

export { TestResponseController, type UrlHandler, type UrlHandlers, type UrlResponse, convertArrayToAsyncIterable, convertArrayToReadableStream, convertAsyncIterableToArray, convertReadableStreamToArray, convertResponseStreamToArray, createTestServer, isNodeVersion, mockId };
