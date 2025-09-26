"use strict";

/** @typedef {import("../index.js").IncomingMessage} IncomingMessage */
/** @typedef {import("../index.js").ServerResponse} ServerResponse */
/** @typedef {import("../index").OutputFileSystem} OutputFileSystem */

/**
 * @typedef {object} ExpectedIncomingMessage
 * @property {((name: string) => string | string[] | undefined)=} getHeader get header extra method
 * @property {(() => string | undefined)=} getMethod get method extra method
 * @property {(() => string | undefined)=} getURL get URL extra method
 */

// eslint-disable-next-line jsdoc/no-restricted-syntax
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
function getRequestHeader(req, name) {
  // Pseudo API
  if (typeof req.getHeader === "function") {
    return req.getHeader(name);
  }
  return req.headers[name];
}

/**
 * @template {IncomingMessage & ExpectedIncomingMessage} Request
 * @param {Request} req req
 * @returns {string | undefined} request method
 */
function getRequestMethod(req) {
  // Pseudo API
  if (typeof req.getMethod === "function") {
    return req.getMethod();
  }
  return req.method;
}

/**
 * @template {IncomingMessage & ExpectedIncomingMessage} Request
 * @param {Request} req req
 * @returns {string | undefined} request URL
 */
function getRequestURL(req) {
  // Pseudo API
  if (typeof req.getURL === "function") {
    return req.getURL();
  }
  return req.url;
}

/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {number} code code
 * @returns {void}
 */
function setStatusCode(res, code) {
  // Pseudo API
  if (typeof res.setStatusCode === "function") {
    res.setStatusCode(code);
    return;
  }

  // Node.js API

  res.statusCode = code;
}

/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @returns {number} status code
 */
function getStatusCode(res) {
  // Pseudo API
  if (typeof res.getStatusCode === "function") {
    return res.getStatusCode();
  }
  return res.statusCode;
}

/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {string} name name
 * @returns {string | string[] | undefined | number} header
 */
function getResponseHeader(res, name) {
  // Real and Pseudo API
  return res.getHeader(name);
}

/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {string} name name
 * @param {number | string | Readonly<string[]>} value value
 * @returns {Response} response
 */
function setResponseHeader(res, name, value) {
  // Real and Pseudo API
  return res.setHeader(name, value);
}

/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {string} name name
 * @returns {void}
 */
function removeResponseHeader(res, name) {
  // Real and Pseudo API
  res.removeHeader(name);
}

/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @returns {string[]} header names
 */
function getResponseHeaders(res) {
  // Pseudo API
  if (typeof res.getResponseHeaders === "function") {
    return res.getResponseHeaders();
  }
  return res.getHeaderNames();
}

/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @returns {boolean} true when headers were sent, otherwise false
 */
function getHeadersSent(res) {
  // Pseudo API
  if (typeof res.getHeadersSent === "function") {
    return res.getHeadersSent();
  }
  return res.headersSent;
}

/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {import("fs").ReadStream} bufferOrStream buffer or stream
 */
function pipe(res, bufferOrStream) {
  // Pseudo API and Koa API
  if (typeof res.stream === "function") {
    // Writable stream into Readable stream
    res.stream(bufferOrStream);
    return;
  }

  // Node.js API and Express API and Hapi API
  bufferOrStream.pipe(res);
}

/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {string | Buffer} bufferOrString buffer or string
 * @returns {void}
 */
function send(res, bufferOrString) {
  // Pseudo API and Express API and Koa API
  if (typeof res.send === "function") {
    res.send(bufferOrString);
    return;
  }
  res.end(bufferOrString);
}

/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {(string | Buffer)=} data data
 */
function finish(res, data) {
  // Pseudo API and Express API and Koa API
  if (typeof res.finish === "function") {
    res.finish(data);
    return;
  }

  // Pseudo API and Express API and Koa API
  res.end(data);
}

/**
 * @param {string} filename filename
 * @param {OutputFileSystem} outputFileSystem output file system
 * @param {number} start start
 * @param {number} end end
 * @returns {{ bufferOrStream: (Buffer | import("fs").ReadStream), byteLength: number }} result with buffer or stream and byte length
 */
function createReadStreamOrReadFileSync(filename, outputFileSystem, start, end) {
  /** @type {string | Buffer | import("fs").ReadStream} */
  let bufferOrStream;
  /** @type {number} */
  let byteLength;

  // Stream logic
  const isFsSupportsStream = typeof outputFileSystem.createReadStream === "function";
  if (isFsSupportsStream) {
    bufferOrStream = /** @type {import("fs").createReadStream} */
    outputFileSystem.createReadStream(filename, {
      start,
      end
    });

    // Handle files with zero bytes
    byteLength = end === 0 ? 0 : end - start + 1;
  } else {
    bufferOrStream = outputFileSystem.readFileSync(filename);
    ({
      byteLength
    } = bufferOrStream);
  }
  return {
    bufferOrStream,
    byteLength
  };
}

/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @returns {Response} res res
 */
function getOutgoing(res) {
  // Pseudo API and Express API and Koa API
  if (typeof res.getOutgoing === "function") {
    return res.getOutgoing();
  }
  return res;
}

/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 */
function initState(res) {
  if (typeof res.setState === "function") {
    return;
  }

  // fixes #282. credit @cexoso. in certain edge situations res.locals is undefined.
  res.locals || (res.locals = {});
}

// eslint-disable-next-line jsdoc/no-restricted-syntax
/**
 * @template {ServerResponse & ExpectedServerResponse} Response
 * @param {Response} res res
 * @param {string} name name
 * @param {any} value state
 * @returns {void}
 */
function setState(res, name, value) {
  if (typeof res.setState === "function") {
    res.setState(name, value);
    return;
  }

  // eslint-disable-next-line jsdoc/no-restricted-syntax
  /** @type {any} */
  res.locals[name] = value;
}
module.exports = {
  createReadStreamOrReadFileSync,
  finish,
  getHeadersSent,
  getOutgoing,
  getRequestHeader,
  getRequestMethod,
  getRequestURL,
  getResponseHeader,
  getResponseHeaders,
  getStatusCode,
  initState,
  pipe,
  removeResponseHeader,
  send,
  setResponseHeader,
  setState,
  setStatusCode
};