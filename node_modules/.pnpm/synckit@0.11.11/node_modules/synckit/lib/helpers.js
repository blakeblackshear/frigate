import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MessageChannel, Worker, receiveMessageOnPort, } from 'node:worker_threads';
import { tryExtensions, findUp, cjsRequire, isPkgAvailable } from '@pkgr/core';
import { compareNodeVersion } from './common.js';
import { DEFAULT_EXEC_ARGV, DEFAULT_GLOBAL_SHIMS, DEFAULT_GLOBAL_SHIMS_PRESET, DEFAULT_TIMEOUT, DEFAULT_TS_RUNNER, DEFAULT_TYPES_NODE_VERSION, IMPORT_FLAG, IMPORT_FLAG_SUPPORTED, INT32_BYTES, LOADER_FLAG, LOADER_FLAGS, MODULE_REGISTER_SUPPORTED, MTS_SUPPORTED, NO_STRIP_TYPES, NO_STRIP_TYPES_FLAG, NODE_OPTIONS, REQUIRE_ABBR_FLAG, REQUIRE_FLAGS, STRIP_TYPES_FLAG, STRIP_TYPES_NODE_VERSION, TRANSFORM_TYPES_FLAG, TRANSFORM_TYPES_NODE_VERSION, TS_ESM_PARTIAL_SUPPORTED, TsRunner, } from './constants.js';
export const isFile = (path) => {
    try {
        return !!fs.statSync(path, { throwIfNoEntry: false })?.isFile();
    }
    catch {
        return false;
    }
};
export const dataUrl = (code) => new URL(`data:text/javascript,${encodeURIComponent(code)}`);
export const hasRequireFlag = (execArgv) => execArgv.some(execArg => REQUIRE_FLAGS.has(execArg));
export const hasImportFlag = (execArgv) => execArgv.includes(IMPORT_FLAG);
export const hasLoaderFlag = (execArgv) => execArgv.some(execArg => LOADER_FLAGS.has(execArg));
export const setupTsRunner = (workerPath, { execArgv = DEFAULT_EXEC_ARGV, tsRunner, } = {}) => {
    let ext = path.extname(workerPath);
    if (!/([/\\])node_modules\1/.test(workerPath) &&
        (!ext || /^\.[cm]?js$/.test(ext))) {
        const workPathWithoutExt = ext
            ? workerPath.slice(0, -ext.length)
            : workerPath;
        let extensions;
        switch (ext) {
            case '.cjs': {
                extensions = ['.cts', '.cjs'];
                break;
            }
            case '.mjs': {
                extensions = ['.mts', '.mjs'];
                break;
            }
            default: {
                extensions = ['.ts', '.js'];
                break;
            }
        }
        const found = tryExtensions(workPathWithoutExt, extensions);
        let differentExt;
        if (found && (!ext || (differentExt = found !== workPathWithoutExt))) {
            workerPath = found;
            if (differentExt) {
                ext = path.extname(workerPath);
            }
        }
    }
    const isTs = /\.[cm]?ts$/.test(workerPath);
    let jsUseEsm = ext === '.mjs';
    let tsUseEsm = ext === '.mts';
    if (isTs) {
        if (!tsUseEsm && ext !== '.cts') {
            const pkg = findUp(workerPath);
            if (pkg) {
                tsUseEsm = cjsRequire(pkg).type === 'module';
            }
        }
        const stripTypesIndex = execArgv.indexOf(STRIP_TYPES_FLAG);
        const transformTypesIndex = execArgv.indexOf(TRANSFORM_TYPES_FLAG);
        const noStripTypesIndex = execArgv.indexOf(NO_STRIP_TYPES_FLAG);
        const execArgvNoStripTypes = noStripTypesIndex > stripTypesIndex ||
            noStripTypesIndex > transformTypesIndex;
        const noStripTypes = execArgvNoStripTypes ||
            (stripTypesIndex === -1 && transformTypesIndex === -1 && NO_STRIP_TYPES);
        if (tsRunner == null) {
            if (process.versions.bun) {
                tsRunner = TsRunner.Bun;
            }
            else if (!noStripTypes &&
                compareNodeVersion(STRIP_TYPES_NODE_VERSION) >= 0) {
                tsRunner = TsRunner.Node;
            }
            else if (isPkgAvailable(TsRunner.TsNode)) {
                tsRunner = TsRunner.TsNode;
            }
        }
        switch (tsRunner) {
            case TsRunner.Bun: {
                break;
            }
            case TsRunner.Node: {
                if (compareNodeVersion(STRIP_TYPES_NODE_VERSION) < 0) {
                    throw new Error('type stripping is not supported in this node version');
                }
                if (noStripTypes) {
                    throw new Error('type stripping is disabled explicitly');
                }
                if (compareNodeVersion(DEFAULT_TYPES_NODE_VERSION) >= 0) {
                    break;
                }
                if (compareNodeVersion(TRANSFORM_TYPES_NODE_VERSION) >= 0 &&
                    !execArgv.includes(TRANSFORM_TYPES_FLAG)) {
                    execArgv = [TRANSFORM_TYPES_FLAG, ...execArgv];
                }
                else if (compareNodeVersion(STRIP_TYPES_NODE_VERSION) >= 0 &&
                    !execArgv.includes(STRIP_TYPES_FLAG)) {
                    execArgv = [STRIP_TYPES_FLAG, ...execArgv];
                }
                break;
            }
            case TsRunner.TsNode: {
                if (tsUseEsm) {
                    if (!execArgv.includes(LOADER_FLAG)) {
                        execArgv = [LOADER_FLAG, `${TsRunner.TsNode}/esm`, ...execArgv];
                    }
                }
                else if (!hasRequireFlag(execArgv)) {
                    execArgv = [
                        REQUIRE_ABBR_FLAG,
                        `${TsRunner.TsNode}/register`,
                        ...execArgv,
                    ];
                }
                break;
            }
            case TsRunner.EsbuildRegister: {
                if (tsUseEsm) {
                    if (!hasLoaderFlag(execArgv)) {
                        execArgv = [
                            LOADER_FLAG,
                            `${TsRunner.EsbuildRegister}/loader`,
                            ...execArgv,
                        ];
                    }
                }
                else if (!hasRequireFlag(execArgv)) {
                    execArgv = [REQUIRE_ABBR_FLAG, TsRunner.EsbuildRegister, ...execArgv];
                }
                break;
            }
            case TsRunner.EsbuildRunner: {
                if (!hasRequireFlag(execArgv)) {
                    execArgv = [
                        REQUIRE_ABBR_FLAG,
                        `${TsRunner.EsbuildRunner}/register`,
                        ...execArgv,
                    ];
                }
                break;
            }
            case TsRunner.OXC: {
                if (!execArgv.includes(IMPORT_FLAG)) {
                    execArgv = [
                        IMPORT_FLAG,
                        `@${TsRunner.OXC}-node/core/register`,
                        ...execArgv,
                    ];
                }
                break;
            }
            case TsRunner.SWC: {
                if (tsUseEsm) {
                    if (IMPORT_FLAG_SUPPORTED) {
                        if (!hasImportFlag(execArgv)) {
                            execArgv = [
                                IMPORT_FLAG,
                                `@${TsRunner.SWC}-node/register/esm-register`,
                                ...execArgv,
                            ];
                        }
                    }
                    else if (!hasLoaderFlag(execArgv)) {
                        execArgv = [
                            LOADER_FLAG,
                            `@${TsRunner.SWC}-node/register/esm`,
                            ...execArgv,
                        ];
                    }
                }
                else if (!hasRequireFlag(execArgv)) {
                    execArgv = [
                        REQUIRE_ABBR_FLAG,
                        `@${TsRunner.SWC}-node/register`,
                        ...execArgv,
                    ];
                }
                break;
            }
            case TsRunner.TSX: {
                if (IMPORT_FLAG_SUPPORTED) {
                    if (!execArgv.includes(IMPORT_FLAG)) {
                        execArgv = [IMPORT_FLAG, TsRunner.TSX, ...execArgv];
                    }
                }
                else if (!execArgv.includes(LOADER_FLAG)) {
                    execArgv = [LOADER_FLAG, TsRunner.TSX, ...execArgv];
                }
                break;
            }
            default: {
                throw new Error(`Unknown ts runner: ${String(tsRunner)}`);
            }
        }
    }
    else if (!jsUseEsm && ext !== '.cjs') {
        const pkg = findUp(workerPath);
        if (pkg) {
            jsUseEsm = cjsRequire(pkg).type === 'module';
        }
    }
    let resolvedPnpLoaderPath;
    if (process.versions.pnp) {
        let pnpApiPath;
        try {
            pnpApiPath = cjsRequire.resolve('pnpapi');
        }
        catch { }
        if (pnpApiPath &&
            !NODE_OPTIONS.some((option, index) => REQUIRE_FLAGS.has(option) &&
                pnpApiPath === cjsRequire.resolve(NODE_OPTIONS[index + 1])) &&
            !execArgv.includes(pnpApiPath)) {
            execArgv = [REQUIRE_ABBR_FLAG, pnpApiPath, ...execArgv];
            const pnpLoaderPath = path.resolve(pnpApiPath, '../.pnp.loader.mjs');
            if (isFile(pnpLoaderPath)) {
                resolvedPnpLoaderPath = pathToFileURL(pnpLoaderPath).href;
                if (!MODULE_REGISTER_SUPPORTED) {
                    execArgv = [LOADER_FLAG, resolvedPnpLoaderPath, ...execArgv];
                }
            }
        }
    }
    return {
        ext,
        isTs,
        jsUseEsm,
        tsRunner,
        tsUseEsm,
        workerPath,
        pnpLoaderPath: resolvedPnpLoaderPath,
        execArgv,
    };
};
export const md5Hash = (text) => createHash('md5').update(text).digest('hex');
export const encodeImportModule = (moduleNameOrGlobalShim, type = 'import') => {
    const { moduleName, globalName, named, conditional } = typeof moduleNameOrGlobalShim === 'string'
        ? { moduleName: moduleNameOrGlobalShim }
        : moduleNameOrGlobalShim;
    const importStatement = type === 'import'
        ? `import${globalName
            ? ' ' +
                (named === null
                    ? '* as ' + globalName
                    : named?.trim()
                        ? `{${named}}`
                        : globalName) +
                ' from'
            : ''} '${path.isAbsolute(moduleName)
            ? String(pathToFileURL(moduleName))
            : moduleName}'`
        : `${globalName
            ? 'const ' + (named?.trim() ? `{${named}}` : globalName) + '='
            : ''}require('${moduleName
            .replace(/\\/g, '\\\\')}')`;
    if (!globalName) {
        return importStatement;
    }
    const overrideStatement = `globalThis.${globalName}=${named?.trim() ? named : globalName}`;
    return (importStatement +
        (conditional === false
            ? `;${overrideStatement}`
            : `;if(!globalThis.${globalName})${overrideStatement}`));
};
export const _generateGlobals = (globalShims, type) => globalShims.reduce((acc, shim) => `${acc}${acc ? ';' : ''}${encodeImportModule(shim, type)}`, '');
let globalsCache;
let tmpdir;
const _dirname = typeof __dirname === 'undefined'
    ? path.dirname(fileURLToPath(import.meta.url))
    : __dirname;
export const generateGlobals = (workerPath, globalShims, type = 'import') => {
    if (globalShims.length === 0) {
        return '';
    }
    globalsCache ?? (globalsCache = new Map());
    const cached = globalsCache.get(workerPath);
    if (cached) {
        const [content, filepath] = cached;
        if ((type === 'require' && !filepath) ||
            (type === 'import' && filepath && isFile(filepath))) {
            return content;
        }
    }
    const globals = _generateGlobals(globalShims, type);
    let content = globals;
    let filepath;
    if (type === 'import') {
        if (!tmpdir) {
            tmpdir = path.resolve(findUp(_dirname), '../node_modules/.synckit');
        }
        fs.mkdirSync(tmpdir, { recursive: true });
        filepath = path.resolve(tmpdir, md5Hash(workerPath) + '.mjs');
        content = encodeImportModule(filepath);
        fs.writeFileSync(filepath, globals);
    }
    globalsCache.set(workerPath, [content, filepath]);
    return content;
};
export function extractProperties(object) {
    if (object && typeof object === 'object') {
        const properties = {};
        for (const key in object) {
            properties[key] = object[key];
        }
        return properties;
    }
}
let sharedBuffer;
let sharedBufferView;
export function startWorkerThread(workerPath, { timeout = DEFAULT_TIMEOUT, execArgv = DEFAULT_EXEC_ARGV, tsRunner = DEFAULT_TS_RUNNER, transferList = [], globalShims = DEFAULT_GLOBAL_SHIMS, } = {}) {
    const { port1: mainPort, port2: workerPort } = new MessageChannel();
    const { isTs, ext, jsUseEsm, tsUseEsm, tsRunner: finalTsRunner, workerPath: finalWorkerPath, pnpLoaderPath, execArgv: finalExecArgv, } = setupTsRunner(workerPath, { execArgv, tsRunner });
    const workerPathUrl = pathToFileURL(finalWorkerPath);
    if (/\.[cm]ts$/.test(finalWorkerPath)) {
        const isTsxSupported = !tsUseEsm || TS_ESM_PARTIAL_SUPPORTED;
        if (!finalTsRunner) {
            throw new Error('No ts runner specified, ts worker path is not supported');
        }
        else if ([
            TsRunner.EsbuildRegister,
            TsRunner.EsbuildRunner,
            ...(TS_ESM_PARTIAL_SUPPORTED
                ? [
                    TsRunner.OXC,
                    TsRunner.SWC,
                ]
                : []),
            ...(isTsxSupported ? [] : [TsRunner.TSX]),
        ].includes(finalTsRunner)) {
            throw new Error(`${finalTsRunner} is not supported for ${ext} files yet` +
                (isTsxSupported
                    ? ', you can try [tsx](https://github.com/esbuild-kit/tsx) instead'
                    : MTS_SUPPORTED
                        ? ', you can try [oxc](https://github.com/oxc-project/oxc-node) or [swc](https://github.com/swc-project/swc-node/tree/master/packages/register) instead'
                        : ''));
        }
    }
    const finalGlobalShims = (globalShims === true
        ? DEFAULT_GLOBAL_SHIMS_PRESET
        : Array.isArray(globalShims)
            ? globalShims
            : []).filter(({ moduleName }) => isPkgAvailable(moduleName));
    sharedBufferView ?? (sharedBufferView = new Int32Array((sharedBuffer ?? (sharedBuffer = new SharedArrayBuffer(INT32_BYTES))), 0, 1));
    const useGlobals = finalGlobalShims.length > 0;
    const useEval = isTs ? !tsUseEsm : !jsUseEsm && useGlobals;
    const worker = new Worker((jsUseEsm && useGlobals) || (tsUseEsm && finalTsRunner === TsRunner.TsNode)
        ? dataUrl(`${generateGlobals(finalWorkerPath, finalGlobalShims)};import '${String(workerPathUrl)}'`)
        : useEval
            ? `${generateGlobals(finalWorkerPath, finalGlobalShims, 'require')};${encodeImportModule(finalWorkerPath, 'require')}`
            : workerPathUrl, {
        eval: useEval,
        workerData: { sharedBufferView, workerPort, pnpLoaderPath },
        transferList: [workerPort, ...transferList],
        execArgv: finalExecArgv,
    });
    let nextID = 0;
    const receiveMessageWithId = (port, expectedId, waitingTimeout) => {
        const start = Date.now();
        const status = Atomics.wait(sharedBufferView, 0, 0, waitingTimeout);
        Atomics.store(sharedBufferView, 0, 0);
        if (!['ok', 'not-equal'].includes(status)) {
            const abortMsg = {
                id: expectedId,
                cmd: 'abort',
            };
            port.postMessage(abortMsg);
            throw new Error('Internal error: Atomics.wait() failed: ' + status);
        }
        const result = receiveMessageOnPort(mainPort);
        const msg = result?.message;
        if (msg?.id == null || msg.id < expectedId) {
            const waitingTime = Date.now() - start;
            return receiveMessageWithId(port, expectedId, waitingTimeout ? waitingTimeout - waitingTime : undefined);
        }
        const { id, ...message } = msg;
        if (expectedId !== id) {
            throw new Error(`Internal error: Expected id ${expectedId} but got id ${id}`);
        }
        return { id, ...message };
    };
    const syncFn = (...args) => {
        const id = nextID++;
        const msg = { id, args };
        worker.postMessage(msg);
        const { result, error, properties, stdio } = receiveMessageWithId(mainPort, id, timeout);
        for (const { type, chunk, encoding } of stdio) {
            process[type].write(chunk, encoding);
        }
        if (error) {
            throw Object.assign(error, properties);
        }
        return result;
    };
    worker.unref();
    return syncFn;
}
export const overrideStdio = (stdio) => {
    for (const type of ['stdout', 'stderr']) {
        process[type]._writev = (chunks, callback) => {
            for (const { chunk, encoding, } of chunks) {
                stdio.push({
                    type,
                    chunk,
                    encoding,
                });
            }
            callback();
        };
    }
};
//# sourceMappingURL=helpers.js.map