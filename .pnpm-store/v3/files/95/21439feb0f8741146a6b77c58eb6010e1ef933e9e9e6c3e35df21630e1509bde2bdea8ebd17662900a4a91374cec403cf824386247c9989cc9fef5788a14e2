import { Node } from './Node';
import { Link } from './Link';
import { File } from './File';
import { Buffer } from '../vendor/node/internal/buffer';
import { DirectoryJSON, NestedDirectoryJSON } from './json';
import type { PathLike } from '../node/types/misc';
import { TFileId } from './types';
/**
 * Represents a filesystem superblock, which is the root of a virtual
 * filesystem in Linux.
 * @see https://lxr.linux.no/linux+v3.11.2/include/linux/fs.h#L1242
 */
export declare class Superblock {
    static fromJSON(json: DirectoryJSON, cwd?: string): Superblock;
    static fromNestedJSON(json: NestedDirectoryJSON, cwd?: string): Superblock;
    /**
     * Global file descriptor counter. UNIX file descriptors start from 0 and go sequentially
     * up, so here, in order not to conflict with them, we choose some big number and descrease
     * the file descriptor of every new opened file.
     * @type {number}
     * @todo This should not be static, right?
     */
    static fd: number;
    root: Link;
    ino: number;
    inodes: {
        [ino: number]: Node;
    };
    releasedInos: number[];
    fds: {
        [fd: number]: File;
    };
    releasedFds: number[];
    maxFiles: number;
    openFiles: number;
    constructor(props?: {});
    createLink(): Link;
    createLink(parent: Link, name: string, isDirectory?: boolean, mode?: number): Link;
    deleteLink(link: Link): boolean;
    private newInoNumber;
    private newFdNumber;
    createNode(mode: number): Node;
    deleteNode(node: Node): void;
    walk(steps: string[], resolveSymlinks: boolean, checkExistence: boolean, checkAccess: boolean, funcName?: string): Link | null;
    walk(filename: string, resolveSymlinks: boolean, checkExistence: boolean, checkAccess: boolean, funcName?: string): Link | null;
    walk(link: Link, resolveSymlinks: boolean, checkExistence: boolean, checkAccess: boolean, funcName?: string): Link | null;
    walk(stepsOrFilenameOrLink: string[] | string | Link, resolveSymlinks: boolean, checkExistence: boolean, checkAccess: boolean, funcName?: string): Link | null;
    getLink(steps: string[]): Link | null;
    getLinkOrThrow(filename: string, funcName?: string): Link;
    getResolvedLink(filenameOrSteps: string | string[]): Link | null;
    /**
     * Just like `getLinkOrThrow`, but also dereference/resolves symbolic links.
     */
    getResolvedLinkOrThrow(filename: string, funcName?: string): Link;
    resolveSymlinks(link: Link): Link | null;
    /**
     * Just like `getLinkOrThrow`, but also verifies that the link is a directory.
     */
    getLinkAsDirOrThrow(filename: string, funcName?: string): Link;
    getLinkParent(steps: string[]): Link | null;
    getLinkParentAsDirOrThrow(filenameOrSteps: string | string[], funcName?: string): Link;
    getFileByFd(fd: number): File;
    getFileByFdOrThrow(fd: number, funcName?: string): File;
    _toJSON(link?: Link, json?: {}, path?: string, asBuffer?: boolean): DirectoryJSON<string | null>;
    toJSON(paths?: PathLike | PathLike[], json?: {}, isRelative?: boolean, asBuffer?: boolean): DirectoryJSON<string | null>;
    fromJSON(json: DirectoryJSON, cwd?: string): void;
    fromNestedJSON(json: NestedDirectoryJSON, cwd?: string): void;
    reset(): void;
    mountSync(mountpoint: string, json: DirectoryJSON): void;
    openLink(link: Link, flagsNum: number, resolveSymlinks?: boolean): File;
    protected openFile(filename: string, flagsNum: number, modeNum: number | undefined, resolveSymlinks?: boolean): File;
    readonly open: (filename: string, flagsNum: number, modeNum: number, resolveSymlinks?: boolean) => number;
    readonly writeFile: (id: TFileId, buf: Buffer, flagsNum: number, modeNum: number) => void;
    readonly read: (fd: number, buffer: Buffer | ArrayBufferView | DataView, offset: number, length: number, position: number | null) => number;
    readonly readv: (fd: number, buffers: ArrayBufferView[], position: number | null) => number;
    readonly link: (filename1: string, filename2: string) => void;
    readonly unlink: (filename: string) => void;
    readonly symlink: (targetFilename: string, pathFilename: string) => Link;
    readonly rename: (oldPathFilename: string, newPathFilename: string) => void;
    readonly mkdir: (filename: string, modeNum: number) => void;
    /**
     * Creates directory tree recursively.
     */
    readonly mkdirp: (filename: string, modeNum: number) => string | undefined;
    readonly rmdir: (filename: string, recursive?: boolean) => void;
    readonly rm: (filename: string, force?: boolean, recursive?: boolean) => void;
    protected closeFile(file: File): void;
    readonly close: (fd: number) => void;
    write(fd: number, buf: Buffer, offset?: number, length?: number, position?: number | null): number;
}
