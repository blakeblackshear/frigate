import { Buffer } from '../vendor/node/internal/buffer';
export type DirectoryContent = string | Buffer | null;
export interface DirectoryJSON<T extends DirectoryContent = DirectoryContent> {
    [key: string]: T;
}
export interface NestedDirectoryJSON<T extends DirectoryContent = DirectoryContent> {
    [key: string]: T | NestedDirectoryJSON;
}
export declare const flattenJSON: (nestedJSON: NestedDirectoryJSON) => DirectoryJSON;
