import { TsRunner } from './constants.js';
import type { AnyFn, GlobalShim, StdioChunk, SynckitOptions } from './types.js';
export declare const isFile: (path: string) => boolean;
export declare const dataUrl: (code: string) => import("url").URL;
export declare const hasRequireFlag: (execArgv: string[]) => boolean;
export declare const hasImportFlag: (execArgv: string[]) => boolean;
export declare const hasLoaderFlag: (execArgv: string[]) => boolean;
export declare const setupTsRunner: (workerPath: string, { execArgv, tsRunner, }?: {
    execArgv?: string[];
    tsRunner?: TsRunner;
}) => {
    ext: string;
    isTs: boolean;
    jsUseEsm: boolean;
    tsRunner: TsRunner | undefined;
    tsUseEsm: boolean;
    workerPath: string;
    pnpLoaderPath: string | undefined;
    execArgv: string[];
};
export declare const md5Hash: (text: string) => string;
export declare const encodeImportModule: (moduleNameOrGlobalShim: GlobalShim | string, type?: "import" | "require") => string;
export declare const generateGlobals: (workerPath: string, globalShims: GlobalShim[], type?: "import" | "require") => string;
export declare function extractProperties<T extends object>(object: T): T;
export declare function extractProperties<T>(object?: T): T | undefined;
export declare function startWorkerThread<T extends AnyFn, R = Awaited<ReturnType<T>>>(workerPath: string, { timeout, execArgv, tsRunner, transferList, globalShims, }?: SynckitOptions): (...args: Parameters<T>) => R;
export declare const overrideStdio: (stdio: StdioChunk[]) => void;
