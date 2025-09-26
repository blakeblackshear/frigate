/**
 * Parse the tree (and raw nodes) again, keeping positional info okay.
 *
 * @param {Options | null | undefined}  [options]
 *   Configuration (optional).
 * @returns
 *   Transform.
 */
export default function rehypeRaw(options?: Options | null | undefined): (tree: Root, file: VFile) => Root;
export type Root = import('hast').Root;
export type RawOptions = import('hast-util-raw').Options;
export type VFile = import('vfile').VFile;
/**
 * Configuration.
 */
export type Options = Omit<RawOptions, 'file'>;
