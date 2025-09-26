export = getFilenameFromUrl;
/**
 * @typedef {object} Extra
 * @property {import("fs").Stats=} stats stats
 * @property {number=} errorCode error code
 * @property {boolean=} immutable true when immutable, otherwise false
 */
/**
 * decodeURIComponent.
 *
 * Allows V8 to only deoptimize this fn instead of all of send().
 * @param {string} input
 * @returns {string}
 */
/**
 * @template {IncomingMessage} Request
 * @template {ServerResponse} Response
 * @param {import("../index.js").FilledContext<Request, Response>} context context
 * @param {string} url url
 * @param {Extra=} extra extra
 * @returns {string | undefined} filename
 */
declare function getFilenameFromUrl<
  Request extends IncomingMessage,
  Response extends ServerResponse,
>(
  context: import("../index.js").FilledContext<Request, Response>,
  url: string,
  extra?: Extra | undefined,
): string | undefined;
declare namespace getFilenameFromUrl {
  export { IncomingMessage, ServerResponse, Extra };
}
type IncomingMessage = import("../index.js").IncomingMessage;
type ServerResponse = import("../index.js").ServerResponse;
type Extra = {
  /**
   * stats
   */
  stats?: import("fs").Stats | undefined;
  /**
   * error code
   */
  errorCode?: number | undefined;
  /**
   * true when immutable, otherwise false
   */
  immutable?: boolean | undefined;
};
