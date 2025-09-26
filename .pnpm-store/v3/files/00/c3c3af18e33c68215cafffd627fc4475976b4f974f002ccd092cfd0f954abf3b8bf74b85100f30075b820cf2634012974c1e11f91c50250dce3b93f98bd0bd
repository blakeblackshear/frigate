import { MessagePort, TransferListItem } from "node:worker_threads";
import * as url0 from "url";

//#region src/constants.d.ts
declare const TsRunner: {
  readonly Node: "node";
  readonly Bun: "bun";
  readonly TsNode: "ts-node";
  readonly EsbuildRegister: "esbuild-register";
  readonly EsbuildRunner: "esbuild-runner";
  readonly OXC: "oxc";
  readonly SWC: "swc";
  readonly TSX: "tsx";
};
type TsRunner = ValueOf<typeof TsRunner>;
declare const TS_ESM_PARTIAL_SUPPORTED: boolean;
declare const MTS_SUPPORTED: boolean;
declare const MODULE_REGISTER_SUPPORTED: boolean;
declare const STRIP_TYPES_NODE_VERSION = "22.6";
declare const TRANSFORM_TYPES_NODE_VERSION = "22.7";
declare const FEATURE_TYPESCRIPT_NODE_VERSION = "22.10";
declare const DEFAULT_TYPES_NODE_VERSION = "23.6";
declare const STRIP_TYPES_FLAG = "--experimental-strip-types";
declare const TRANSFORM_TYPES_FLAG = "--experimental-transform-types";
declare const NO_STRIP_TYPES_FLAG = "--no-experimental-strip-types";
declare const NODE_OPTIONS: string[];
declare const NO_STRIP_TYPES: boolean;
declare const DEFAULT_TIMEOUT: number | undefined;
declare const DEFAULT_EXEC_ARGV: string[];
declare const DEFAULT_TS_RUNNER: TsRunner | undefined;
declare const DEFAULT_GLOBAL_SHIMS: boolean;
declare const DEFAULT_GLOBAL_SHIMS_PRESET: GlobalShim[];
declare const IMPORT_FLAG = "--import";
declare const REQUIRE_FLAG = "--require";
declare const REQUIRE_ABBR_FLAG = "-r";
declare const REQUIRE_FLAGS: Set<string>;
declare const LOADER_FLAG = "--loader";
declare const EXPERIMENTAL_LOADER_FLAG = "--experimental-loader";
declare const LOADER_FLAGS: Set<string>;
declare const IMPORT_FLAG_SUPPORTED: boolean;
declare const INT32_BYTES = 4;
//#endregion
//#region src/types.d.ts
type AnyFn<R = any, T extends any[] = any[]> = (...args: T) => R;
type Syncify<T extends AnyFn> = (...args: Parameters<T>) => Awaited<ReturnType<T>>;
type ValueOf<T> = T[keyof T];
interface MainToWorkerMessage<T extends unknown[]> {
  id: number;
  args: T;
}
interface MainToWorkerCommandMessage {
  id: number;
  cmd: string;
}
interface WorkerData {
  sharedBufferView: Int32Array;
  workerPort: MessagePort;
  pnpLoaderPath: string | undefined;
}
interface DataMessage<T> {
  result?: T;
  error?: unknown;
  properties?: unknown;
}
interface StdioChunk {
  type: 'stderr' | 'stdout';
  chunk: Uint8Array | string;
  encoding: BufferEncoding;
}
interface WorkerToMainMessage<T> extends DataMessage<T> {
  id: number;
  stdio: StdioChunk[];
}
interface GlobalShim {
  moduleName: string;
  globalName?: string;
  named?: string | null;
  conditional?: boolean;
}
interface PackageJson {
  type?: 'commonjs' | 'module';
}
interface SynckitOptions {
  execArgv?: string[];
  globalShims?: GlobalShim[] | boolean;
  timeout?: number;
  transferList?: TransferListItem[];
  tsRunner?: TsRunner;
}
//#endregion
//#region src/common.d.ts
declare const hasFlag: (flag: string) => boolean;
declare const parseVersion: (version: string) => number[];
declare const compareVersion: (version1: string, version2: string) => 1 | -1 | 0;
declare const NODE_VERSION: string;
declare const compareNodeVersion: (version: string) => 1 | -1 | 0;
//#endregion
//#region src/helpers.d.ts
declare const isFile: (path: string) => boolean;
declare const dataUrl: (code: string) => url0.URL;
declare const hasRequireFlag: (execArgv: string[]) => boolean;
declare const hasImportFlag: (execArgv: string[]) => boolean;
declare const hasLoaderFlag: (execArgv: string[]) => boolean;
declare const setupTsRunner: (workerPath: string, {
  execArgv,
  tsRunner
}?: {
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
declare const md5Hash: (text: string) => string;
declare const encodeImportModule: (moduleNameOrGlobalShim: GlobalShim | string, type?: "import" | "require") => string;
declare const generateGlobals: (workerPath: string, globalShims: GlobalShim[], type?: "import" | "require") => string;
declare function extractProperties<T extends object>(object: T): T;
declare function extractProperties<T>(object?: T): T | undefined;
declare function startWorkerThread<T extends AnyFn, R = Awaited<ReturnType<T>>>(workerPath: string, {
  timeout,
  execArgv,
  tsRunner,
  transferList,
  globalShims
}?: SynckitOptions): (...args: Parameters<T>) => R;
declare const overrideStdio: (stdio: StdioChunk[]) => void;
//#endregion
//#region src/index.d.ts
declare function createSyncFn<T extends AnyFn>(workerPath: URL | string, timeoutOrOptions?: SynckitOptions | number): Syncify<T>;
declare function runAsWorker<T extends AnyFn<Promise<R> | R>, R = ReturnType<T>>(fn: T): void;
//#endregion
export { AnyFn, DEFAULT_EXEC_ARGV, DEFAULT_GLOBAL_SHIMS, DEFAULT_GLOBAL_SHIMS_PRESET, DEFAULT_TIMEOUT, DEFAULT_TS_RUNNER, DEFAULT_TYPES_NODE_VERSION, DataMessage, EXPERIMENTAL_LOADER_FLAG, FEATURE_TYPESCRIPT_NODE_VERSION, GlobalShim, IMPORT_FLAG, IMPORT_FLAG_SUPPORTED, INT32_BYTES, LOADER_FLAG, LOADER_FLAGS, MODULE_REGISTER_SUPPORTED, MTS_SUPPORTED, MainToWorkerCommandMessage, MainToWorkerMessage, NODE_OPTIONS, NODE_VERSION, NO_STRIP_TYPES, NO_STRIP_TYPES_FLAG, PackageJson, REQUIRE_ABBR_FLAG, REQUIRE_FLAG, REQUIRE_FLAGS, STRIP_TYPES_FLAG, STRIP_TYPES_NODE_VERSION, StdioChunk, Syncify, SynckitOptions, TRANSFORM_TYPES_FLAG, TRANSFORM_TYPES_NODE_VERSION, TS_ESM_PARTIAL_SUPPORTED, TsRunner, ValueOf, WorkerData, WorkerToMainMessage, compareNodeVersion, compareVersion, createSyncFn, dataUrl, encodeImportModule, extractProperties, generateGlobals, hasFlag, hasImportFlag, hasLoaderFlag, hasRequireFlag, isFile, md5Hash, overrideStdio, parseVersion, runAsWorker, setupTsRunner, startWorkerThread };