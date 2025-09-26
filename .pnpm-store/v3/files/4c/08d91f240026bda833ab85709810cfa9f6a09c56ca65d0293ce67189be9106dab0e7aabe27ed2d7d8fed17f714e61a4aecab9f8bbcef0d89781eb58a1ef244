import { Link } from '../node';
import { TEncodingExtended, TDataOut } from '../encoding';
import type { IDirent } from './types/misc';
/**
 * A directory entry, like `fs.Dirent`.
 */
export declare class Dirent implements IDirent {
    static build(link: Link, encoding: TEncodingExtended | undefined): Dirent;
    name: TDataOut;
    path: string;
    parentPath: string;
    private mode;
    private _checkModeProperty;
    isDirectory(): boolean;
    isFile(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
export default Dirent;
