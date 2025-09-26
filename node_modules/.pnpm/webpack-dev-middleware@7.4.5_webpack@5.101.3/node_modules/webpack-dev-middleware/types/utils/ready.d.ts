export = ready;
/** @typedef {import("../index.js").IncomingMessage} IncomingMessage */
/** @typedef {import("../index.js").ServerResponse} ServerResponse */
/** @typedef {import("../index.js").Callback} Callback */
/**
 * @template {IncomingMessage} Request
 * @template {ServerResponse} Response
 * @param {import("../index.js").FilledContext<Request, Response>} context context
 * @param {Callback} callback callback
 * @param {Request=} req req
 * @returns {void}
 */
declare function ready<
  Request extends IncomingMessage,
  Response extends ServerResponse,
>(
  context: import("../index.js").FilledContext<Request, Response>,
  callback: Callback,
  req?: Request | undefined,
): void;
declare namespace ready {
  export { IncomingMessage, ServerResponse, Callback };
}
type IncomingMessage = import("../index.js").IncomingMessage;
type ServerResponse = import("../index.js").ServerResponse;
type Callback = import("../index.js").Callback;
