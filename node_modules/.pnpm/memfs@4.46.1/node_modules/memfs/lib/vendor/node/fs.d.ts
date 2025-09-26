import type { Buffer } from './buffer';
import type { URL } from './url';
export type PathLike = string | Buffer | URL;
export declare namespace symlink {
    type Type = 'dir' | 'file' | 'junction';
}
