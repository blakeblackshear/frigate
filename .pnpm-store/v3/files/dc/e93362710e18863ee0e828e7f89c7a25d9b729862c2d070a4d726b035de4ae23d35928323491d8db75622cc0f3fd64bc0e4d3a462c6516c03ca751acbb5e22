import { Buffer } from '../vendor/node/internal/buffer';
import type { Link } from './Link';
import type { Node } from './Node';
/**
 * Represents an open file (file descriptor) that points to a `Link` (Hard-link) and a `Node`.
 *
 * @todo Rename to `OpenFile`.
 */
export declare class File {
    readonly link: Link;
    readonly node: Node;
    flags: number;
    fd: number;
    /**
     * A cursor/offset position in a file, where data will be written on write.
     * User can "seek" this position.
     */
    position: number;
    /**
     * Open a Link-Node pair. `node` is provided separately as that might be a different node
     * rather the one `link` points to, because it might be a symlink.
     * @param link
     * @param node
     * @param flags
     * @param fd
     */
    constructor(link: Link, node: Node, flags: number, fd: number);
    getString(encoding?: string): string;
    setString(str: string): void;
    getBuffer(): Buffer;
    setBuffer(buf: Buffer): void;
    getSize(): number;
    truncate(len?: number): void;
    seekTo(position: number): void;
    write(buf: Buffer, offset?: number, length?: number, position?: number | null): number;
    read(buf: Buffer | ArrayBufferView | DataView, offset?: number, length?: number, position?: number): number;
    chmod(perm: number): void;
    chown(uid: number, gid: number): void;
}
