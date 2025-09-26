export declare const COMMON_MIME_TYPES: Map<string, string>;
export declare function toFileWithPath(file: FileWithPath, path?: string, h?: FileSystemHandle): FileWithPath;
export interface FileWithPath extends File {
    readonly path?: string;
    readonly handle?: FileSystemFileHandle;
    readonly relativePath?: string;
}
