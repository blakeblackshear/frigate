export = etag;
/**
 * Create a simple ETag.
 * @param {Buffer | ReadStream | Stats} entity entity
 * @returns {Promise<{ hash: string, buffer?: Buffer }>} etag
 */
declare function etag(entity: Buffer | ReadStream | Stats): Promise<{
  hash: string;
  buffer?: Buffer;
}>;
declare namespace etag {
  export { Stats, ReadStream };
}
type Stats = import("fs").Stats;
type ReadStream = import("fs").ReadStream;
