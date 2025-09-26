export type IncomingMessage = import("../index.js").IncomingMessage;
export type ServerResponse = import("../index.js").ServerResponse;
export type OutputFileSystem = import("../index").OutputFileSystem;
export type ExpectedIncomingMessage = {
  /**
   * get header extra method
   */
  getHeader?: ((name: string) => string | string[] | undefined) | undefined;
  /**
   * get method extra method
   */
  getMethod?: (() => string | undefined) | undefined;
  /**
   * get URL extra method
   */
  getURL?: (() => string | undefined) | undefined;
};
export type ExpectedServerResponse = {
  /**
   * set status code
   */
  setStatusCode?: ((status: number) => void) | undefined;
  /**
   * get status code
   */
  getStatusCode?: (() => number) | undefined;
  /**
   * get header
   */
  getHeader: (name: string) => string | string[] | undefined | number;
  /**
   * set header
   */
  setHeader?:
    | ((
        name: string,
        value: number | string | Readonly<string[]>,
      ) => ExpectedServerResponse)
    | undefined;
  /**
   * remove header
   */
  removeHeader?: ((name: string) => void) | undefined;
  /**
   * send
   */
  send?: ((data: string | Buffer) => void) | undefined;
  /**
   * finish
   */
  finish?: ((data?: string | Buffer) => void) | undefined;
  /**
   * get response header
   */
  getResponseHeaders?: (() => string[]) | undefined;
  /**
   * get headers sent
   */
  getHeadersSent?: (() => boolean) | undefined;
  /**
   * stream
   */
  stream?: ((data: any) => void) | undefined;
  /**
   * get outgoing
   */
  getOutgoing?: (() => any) | undefined;
  /**
   * set state
   */
  setState?: ((name: string, value: any) => void) | undefined;
};
/**
 * @param {string} filename filename
 * @param {OutputFileSystem} outputFileSystem output file system
 * @param {number} start start
 * @param {number} end end
 * @returns {{ bufferOrStream: (Buffer | import("fs").ReadStream), byteLength: number }} result with buffer or stream and byte length
 */
export function createReadStreamOrReadFileSync(
  filename: string,
  outputFileSystem: OutputFileSystem,
  start: number,
  end: number,
): {
  bufferOrStream: Buffer | import("fs").ReadStream;
  byteLength: number;
};
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {(string | Buffer)=} data data
 */
export function finish<
  Response extends ServerResponse & ExpectedServerResponse,
>(res: Response, data?: (string | Buffer) | undefined): void;
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @returns {boolean} true when headers were sent, otherwise false
 */
export function getHeadersSent<
  Response extends ServerResponse & ExpectedServerResponse,
>(res: Response): boolean;
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @returns {Response} res res
 */
export function getOutgoing<
  Response extends ServerResponse & ExpectedServerResponse,
>(res: Response): Response;
/** @typedef {import("../index.js").IncomingMessage} IncomingMessage */
/** @typedef {import("../index.js").ServerResponse} ServerResponse */
/** @typedef {import("../index").OutputFileSystem} OutputFileSystem */
/**
 * @typedef {object} ExpectedIncomingMessage
 * @property {((name: string) => string | string[] | undefined)=} getHeader get header extra method
 * @property {(() => string | undefined)=} getMethod get method extra method
 * @property {(() => string | undefined)=} getURL get URL extra method
 */
/**
 * @typedef {object} ExpectedServerResponse
 * @property {((status: number) => void)=} setStatusCode set status code
 * @property {(() => number)=} getStatusCode get status code
 * @property {((name: string) => string | string[] | undefined | number)} getHeader get header
 * @property {((name: string, value: number | string | Readonly<string[]>) => ExpectedServerResponse)=} setHeader set header
 * @property {((name: string) => void)=} removeHeader remove header
 * @property {((data: string | Buffer) => void)=} send send
 * @property {((data?: string | Buffer) => void)=} finish finish
 * @property {(() => string[])=} getResponseHeaders get response header
 * @property {(() => boolean)=} getHeadersSent get headers sent
 * @property {((data: any) => void)=} stream stream
 * @property {(() => any)=} getOutgoing get outgoing
 * @property {((name: string, value: any) => void)=} setState set state
 */
/**
 * @template {IncomingMessage & ExpectedIncomingMessage} Request
 * @param {Request} req req
 * @param {string} name name
 * @returns {string | string[] | undefined} request header
 */
export function getRequestHeader<
  Request extends IncomingMessage & ExpectedIncomingMessage,
>(req: Request, name: string): string | string[] | undefined;
/**
 * @template {IncomingMessage & ExpectedIncomingMessage} Request
 * @param {Request} req req
 * @returns {string | undefined} request method
 */
export function getRequestMethod<
  Request extends IncomingMessage & ExpectedIncomingMessage,
>(req: Request): string | undefined;
/**
 * @template {IncomingMessage & ExpectedIncomingMessage} Request
 * @param {Request} req req
 * @returns {string | undefined} request URL
 */
export function getRequestURL<
  Request extends IncomingMessage & ExpectedIncomingMessage,
>(req: Request): string | undefined;
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {string} name name
 * @returns {string | string[] | undefined | number} header
 */
export function getResponseHeader<
  Response extends ServerResponse & ExpectedServerResponse,
>(res: Response, name: string): string | string[] | undefined | number;
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @returns {string[]} header names
 */
export function getResponseHeaders<
  Response extends ServerResponse & ExpectedServerResponse,
>(res: Response): string[];
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @returns {number} status code
 */
export function getStatusCode<
  Response extends ServerResponse & ExpectedServerResponse,
>(res: Response): number;
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 */
export function initState<
  Response extends ServerResponse & ExpectedServerResponse,
>(res: Response): void;
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {import("fs").ReadStream} bufferOrStream buffer or stream
 */
export function pipe<Response extends ServerResponse & ExpectedServerResponse>(
  res: Response,
  bufferOrStream: import("fs").ReadStream,
): void;
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {string} name name
 * @returns {void}
 */
export function removeResponseHeader<
  Response extends ServerResponse & ExpectedServerResponse,
>(res: Response, name: string): void;
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {string | Buffer} bufferOrString buffer or string
 * @returns {void}
 */
export function send<Response extends ServerResponse & ExpectedServerResponse>(
  res: Response,
  bufferOrString: string | Buffer,
): void;
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {string} name name
 * @param {number | string | Readonly<string[]>} value value
 * @returns {Response} response
 */
export function setResponseHeader<
  Response extends ServerResponse & ExpectedServerResponse,
>(
  res: Response,
  name: string,
  value: number | string | Readonly<string[]>,
): Response;
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {string} name name
 * @param {any} value state
 * @returns {void}
 */
export function setState<
  Response extends ServerResponse & ExpectedServerResponse,
>(res: Response, name: string, value: any): void;
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {number} code code
 * @returns {void}
 */
export function setStatusCode<
  Response extends ServerResponse & ExpectedServerResponse,
>(res: Response, code: number): void;
