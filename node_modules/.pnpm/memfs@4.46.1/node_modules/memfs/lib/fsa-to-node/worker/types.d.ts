import type { IFileSystemDirectoryHandle } from '../../fsa/types';
import type { FsaNodeWorkerMessageCode } from './constants';
export type FsaNodeWorkerMsgInit = [type: FsaNodeWorkerMessageCode.Init, sab: SharedArrayBuffer];
export type FsaNodeWorkerMsgSetRoot = [
    type: FsaNodeWorkerMessageCode.SetRoot,
    id: number,
    dir: IFileSystemDirectoryHandle
];
export type FsaNodeWorkerMsgRootSet = [type: FsaNodeWorkerMessageCode.RootSet, id: number];
export type FsaNodeWorkerMsgRequest = [type: FsaNodeWorkerMessageCode.Request, method: string, data: unknown];
export type FsaNodeWorkerMsgResponse = [type: FsaNodeWorkerMessageCode.Response, data: unknown];
export type FsaNodeWorkerMsgResponseError = [type: FsaNodeWorkerMessageCode.ResponseError, data: unknown];
export interface FsaNodeWorkerError {
    message: string;
    code?: string;
}
export type FsaNodeWorkerMsg = FsaNodeWorkerMsgInit | FsaNodeWorkerMsgSetRoot | FsaNodeWorkerMsgRootSet | FsaNodeWorkerMsgRequest | FsaNodeWorkerMsgResponse | FsaNodeWorkerMsgResponseError;
