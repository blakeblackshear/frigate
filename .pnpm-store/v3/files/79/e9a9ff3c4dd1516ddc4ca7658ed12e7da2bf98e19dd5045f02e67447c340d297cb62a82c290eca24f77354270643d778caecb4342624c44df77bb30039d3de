//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
const node_module = __toESM(require("node:module"));
const node_path = __toESM(require("node:path"));
const node_url = __toESM(require("node:url"));
const node_worker_threads = __toESM(require("node:worker_threads"));
const node_crypto = __toESM(require("node:crypto"));
const node_fs = __toESM(require("node:fs"));
const __pkgr_core = __toESM(require("@pkgr/core"));

//#region src/common.ts
var _process$env$NODE_OPT;
const NODE_OPTIONS$1 = (_process$env$NODE_OPT = process.env.NODE_OPTIONS) === null || _process$env$NODE_OPT === void 0 ? void 0 : _process$env$NODE_OPT.split(/\s+/);
const hasFlag = (flag) => (NODE_OPTIONS$1 === null || NODE_OPTIONS$1 === void 0 ? void 0 : NODE_OPTIONS$1.includes(flag)) || process.argv.includes(flag);
const parseVersion = (version) => version.split(".").map(Number.parseFloat);
const compareVersion = (version1, version2) => {
	const versions1 = parseVersion(version1);
	const versions2 = parseVersion(version2);
	const length = Math.max(versions1.length, versions2.length);
	for (let i = 0; i < length; i++) {
		const v1 = versions1[i] || 0;
		const v2 = versions2[i] || 0;
		if (v1 > v2) return 1;
		if (v1 < v2) return -1;
	}
	return 0;
};
const NODE_VERSION = process.versions.node;
const compareNodeVersion = (version) => compareVersion(NODE_VERSION, version);

//#endregion
//#region src/constants.ts
const TsRunner = {
	Node: "node",
	Bun: "bun",
	TsNode: "ts-node",
	EsbuildRegister: "esbuild-register",
	EsbuildRunner: "esbuild-runner",
	OXC: "oxc",
	SWC: "swc",
	TSX: "tsx"
};
const { NODE_OPTIONS: NODE_OPTIONS_ = "", SYNCKIT_EXEC_ARGV = "", SYNCKIT_GLOBAL_SHIMS, SYNCKIT_TIMEOUT, SYNCKIT_TS_RUNNER } = process.env;
const TS_ESM_PARTIAL_SUPPORTED = compareNodeVersion("16") >= 0 && compareNodeVersion("18.19") < 0;
const MTS_SUPPORTED = compareNodeVersion("20.8") >= 0;
const MODULE_REGISTER_SUPPORTED = MTS_SUPPORTED || compareNodeVersion("18.19") >= 0;
const STRIP_TYPES_NODE_VERSION = "22.6";
const TRANSFORM_TYPES_NODE_VERSION = "22.7";
const FEATURE_TYPESCRIPT_NODE_VERSION = "22.10";
const DEFAULT_TYPES_NODE_VERSION = "23.6";
const STRIP_TYPES_FLAG = "--experimental-strip-types";
const TRANSFORM_TYPES_FLAG = "--experimental-transform-types";
const NO_STRIP_TYPES_FLAG = "--no-experimental-strip-types";
const NODE_OPTIONS = NODE_OPTIONS_.split(/\s+/);
const NO_STRIP_TYPES = hasFlag(NO_STRIP_TYPES_FLAG) && (compareNodeVersion(FEATURE_TYPESCRIPT_NODE_VERSION) >= 0 ? process.features.typescript === false : !hasFlag(STRIP_TYPES_FLAG) && !hasFlag(TRANSFORM_TYPES_FLAG));
const DEFAULT_TIMEOUT = SYNCKIT_TIMEOUT ? +SYNCKIT_TIMEOUT : void 0;
const DEFAULT_EXEC_ARGV = SYNCKIT_EXEC_ARGV.split(",");
const DEFAULT_TS_RUNNER = SYNCKIT_TS_RUNNER;
const DEFAULT_GLOBAL_SHIMS = ["1", "true"].includes(SYNCKIT_GLOBAL_SHIMS);
const DEFAULT_GLOBAL_SHIMS_PRESET = [{
	moduleName: "node-fetch",
	globalName: "fetch"
}, {
	moduleName: "node:perf_hooks",
	globalName: "performance",
	named: "performance"
}];
const IMPORT_FLAG = "--import";
const REQUIRE_FLAG = "--require";
const REQUIRE_ABBR_FLAG = "-r";
const REQUIRE_FLAGS = new Set([REQUIRE_FLAG, REQUIRE_ABBR_FLAG]);
const LOADER_FLAG = "--loader";
const EXPERIMENTAL_LOADER_FLAG = "--experimental-loader";
const LOADER_FLAGS = new Set([LOADER_FLAG, EXPERIMENTAL_LOADER_FLAG]);
const IMPORT_FLAG_SUPPORTED = compareNodeVersion("20.6") >= 0;
const INT32_BYTES = 4;

//#endregion
//#region src/helpers.ts
const isFile = (path$2) => {
	try {
		var _fs$statSync;
		return !!((_fs$statSync = node_fs.default.statSync(path$2, { throwIfNoEntry: false })) === null || _fs$statSync === void 0 ? void 0 : _fs$statSync.isFile());
	} catch {
		/* istanbul ignore next */
		return false;
	}
};
const dataUrl = (code) => new URL(`data:text/javascript,${encodeURIComponent(code)}`);
const hasRequireFlag = (execArgv) => execArgv.some((execArg) => REQUIRE_FLAGS.has(execArg));
const hasImportFlag = (execArgv) => execArgv.includes(IMPORT_FLAG);
const hasLoaderFlag = (execArgv) => execArgv.some((execArg) => LOADER_FLAGS.has(execArg));
const setupTsRunner = (workerPath, { execArgv = DEFAULT_EXEC_ARGV, tsRunner } = {}) => {
	let ext = node_path.default.extname(workerPath);
	if (!/([/\\])node_modules\1/.test(workerPath) && (!ext || /^\.[cm]?js$/.test(ext))) {
		const workPathWithoutExt = ext ? workerPath.slice(0, -ext.length) : workerPath;
		let extensions;
		switch (ext) {
			case ".cjs": {
				extensions = [".cts", ".cjs"];
				break;
			}
			case ".mjs": {
				extensions = [".mts", ".mjs"];
				break;
			}
			default: {
				extensions = [".ts", ".js"];
				break;
			}
		}
		const found = (0, __pkgr_core.tryExtensions)(workPathWithoutExt, extensions);
		let differentExt;
		if (found && (!ext || (differentExt = found !== workPathWithoutExt))) {
			workerPath = found;
			if (differentExt) ext = node_path.default.extname(workerPath);
		}
	}
	const isTs = /\.[cm]?ts$/.test(workerPath);
	let jsUseEsm = ext === ".mjs";
	let tsUseEsm = ext === ".mts";
	if (isTs) {
		if (!tsUseEsm && ext !== ".cts") {
			const pkg = (0, __pkgr_core.findUp)(workerPath);
			if (pkg) tsUseEsm = (0, __pkgr_core.cjsRequire)(pkg).type === "module";
		}
		const stripTypesIndex = execArgv.indexOf(STRIP_TYPES_FLAG);
		const transformTypesIndex = execArgv.indexOf(TRANSFORM_TYPES_FLAG);
		const noStripTypesIndex = execArgv.indexOf(NO_STRIP_TYPES_FLAG);
		const execArgvNoStripTypes = noStripTypesIndex > stripTypesIndex || noStripTypesIndex > transformTypesIndex;
		const noStripTypes = execArgvNoStripTypes || stripTypesIndex === -1 && transformTypesIndex === -1 && NO_STRIP_TYPES;
		if (tsRunner == null) {
			if (process.versions.bun) tsRunner = TsRunner.Bun;
			else if (!noStripTypes && compareNodeVersion(STRIP_TYPES_NODE_VERSION) >= 0) tsRunner = TsRunner.Node;
			else if ((0, __pkgr_core.isPkgAvailable)(TsRunner.TsNode)) tsRunner = TsRunner.TsNode;
		}
		switch (tsRunner) {
			case TsRunner.Bun: break;
			case TsRunner.Node: {
				if (compareNodeVersion(STRIP_TYPES_NODE_VERSION) < 0) throw new Error("type stripping is not supported in this node version");
				if (noStripTypes) throw new Error("type stripping is disabled explicitly");
				if (compareNodeVersion(DEFAULT_TYPES_NODE_VERSION) >= 0) break;
				if (compareNodeVersion(TRANSFORM_TYPES_NODE_VERSION) >= 0 && !execArgv.includes(TRANSFORM_TYPES_FLAG)) execArgv = [TRANSFORM_TYPES_FLAG, ...execArgv];
				else if (compareNodeVersion(STRIP_TYPES_NODE_VERSION) >= 0 && !execArgv.includes(STRIP_TYPES_FLAG)) execArgv = [STRIP_TYPES_FLAG, ...execArgv];
				break;
			}
			case TsRunner.TsNode: {
				if (tsUseEsm) {
					if (!execArgv.includes(LOADER_FLAG)) execArgv = [
						LOADER_FLAG,
						`${TsRunner.TsNode}/esm`,
						...execArgv
					];
				} else if (!hasRequireFlag(execArgv)) execArgv = [
					REQUIRE_ABBR_FLAG,
					`${TsRunner.TsNode}/register`,
					...execArgv
				];
				break;
			}
			case TsRunner.EsbuildRegister: {
				if (tsUseEsm) {
					if (!hasLoaderFlag(execArgv)) execArgv = [
						LOADER_FLAG,
						`${TsRunner.EsbuildRegister}/loader`,
						...execArgv
					];
				} else if (!hasRequireFlag(execArgv)) execArgv = [
					REQUIRE_ABBR_FLAG,
					TsRunner.EsbuildRegister,
					...execArgv
				];
				break;
			}
			case TsRunner.EsbuildRunner: {
				if (!hasRequireFlag(execArgv)) execArgv = [
					REQUIRE_ABBR_FLAG,
					`${TsRunner.EsbuildRunner}/register`,
					...execArgv
				];
				break;
			}
			case TsRunner.OXC: {
				if (!execArgv.includes(IMPORT_FLAG)) execArgv = [
					IMPORT_FLAG,
					`@${TsRunner.OXC}-node/core/register`,
					...execArgv
				];
				break;
			}
			case TsRunner.SWC: {
				if (tsUseEsm) {
					if (IMPORT_FLAG_SUPPORTED) {
						if (!hasImportFlag(execArgv)) execArgv = [
							IMPORT_FLAG,
							`@${TsRunner.SWC}-node/register/esm-register`,
							...execArgv
						];
					} else if (!hasLoaderFlag(execArgv)) execArgv = [
						LOADER_FLAG,
						`@${TsRunner.SWC}-node/register/esm`,
						...execArgv
					];
				} else if (!hasRequireFlag(execArgv)) execArgv = [
					REQUIRE_ABBR_FLAG,
					`@${TsRunner.SWC}-node/register`,
					...execArgv
				];
				break;
			}
			case TsRunner.TSX: {
				if (IMPORT_FLAG_SUPPORTED) {
					if (!execArgv.includes(IMPORT_FLAG)) execArgv = [
						IMPORT_FLAG,
						TsRunner.TSX,
						...execArgv
					];
				} else if (!execArgv.includes(LOADER_FLAG)) execArgv = [
					LOADER_FLAG,
					TsRunner.TSX,
					...execArgv
				];
				break;
			}
			default: throw new Error(`Unknown ts runner: ${String(tsRunner)}`);
		}
	} else if (!jsUseEsm && ext !== ".cjs") {
		const pkg = (0, __pkgr_core.findUp)(workerPath);
		if (pkg) jsUseEsm = (0, __pkgr_core.cjsRequire)(pkg).type === "module";
	}
	let resolvedPnpLoaderPath;
	/* istanbul ignore if -- https://github.com/facebook/jest/issues/5274 */
	if (process.versions.pnp) {
		let pnpApiPath;
		try {
			/** @see https://github.com/facebook/jest/issues/9543 */
			pnpApiPath = __pkgr_core.cjsRequire.resolve("pnpapi");
		} catch {}
		if (pnpApiPath && !NODE_OPTIONS.some((option, index) => REQUIRE_FLAGS.has(option) && pnpApiPath === __pkgr_core.cjsRequire.resolve(NODE_OPTIONS[index + 1])) && !execArgv.includes(pnpApiPath)) {
			execArgv = [
				REQUIRE_ABBR_FLAG,
				pnpApiPath,
				...execArgv
			];
			const pnpLoaderPath = node_path.default.resolve(pnpApiPath, "../.pnp.loader.mjs");
			if (isFile(pnpLoaderPath)) {
				resolvedPnpLoaderPath = (0, node_url.pathToFileURL)(pnpLoaderPath).href;
				if (!MODULE_REGISTER_SUPPORTED) execArgv = [
					LOADER_FLAG,
					resolvedPnpLoaderPath,
					...execArgv
				];
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
		execArgv
	};
};
const md5Hash = (text) => (0, node_crypto.createHash)("md5").update(text).digest("hex");
const encodeImportModule = (moduleNameOrGlobalShim, type = "import") => {
	const { moduleName, globalName, named, conditional } = typeof moduleNameOrGlobalShim === "string" ? { moduleName: moduleNameOrGlobalShim } : moduleNameOrGlobalShim;
	const importStatement = type === "import" ? `import${globalName ? " " + (named === null ? "* as " + globalName : (named === null || named === void 0 ? void 0 : named.trim()) ? `{${named}}` : globalName) + " from" : ""} '${node_path.default.isAbsolute(moduleName) ? String((0, node_url.pathToFileURL)(moduleName)) : moduleName}'` : `${globalName ? "const " + ((named === null || named === void 0 ? void 0 : named.trim()) ? `{${named}}` : globalName) + "=" : ""}require('${moduleName.replace(/\\/g, "\\\\")}')`;
	if (!globalName) return importStatement;
	const overrideStatement = `globalThis.${globalName}=${(named === null || named === void 0 ? void 0 : named.trim()) ? named : globalName}`;
	return importStatement + (conditional === false ? `;${overrideStatement}` : `;if(!globalThis.${globalName})${overrideStatement}`);
};
/** @internal */
const _generateGlobals = (globalShims, type) => globalShims.reduce((acc, shim) => `${acc}${acc ? ";" : ""}${encodeImportModule(shim, type)}`, "");
let globalsCache;
let tmpdir;
const _dirname = typeof __dirname === "undefined" ? node_path.default.dirname((0, node_url.fileURLToPath)(require("url").pathToFileURL(__filename).href)) : __dirname;
const generateGlobals = (workerPath, globalShims, type = "import") => {
	if (globalShims.length === 0) return "";
	globalsCache ?? (globalsCache = new Map());
	const cached = globalsCache.get(workerPath);
	if (cached) {
		const [content$1, filepath$1] = cached;
		if (type === "require" && !filepath$1 || type === "import" && filepath$1 && isFile(filepath$1)) return content$1;
	}
	const globals = _generateGlobals(globalShims, type);
	let content = globals;
	let filepath;
	if (type === "import") {
		if (!tmpdir) tmpdir = node_path.default.resolve((0, __pkgr_core.findUp)(_dirname), "../node_modules/.synckit");
		node_fs.default.mkdirSync(tmpdir, { recursive: true });
		filepath = node_path.default.resolve(tmpdir, md5Hash(workerPath) + ".mjs");
		content = encodeImportModule(filepath);
		node_fs.default.writeFileSync(filepath, globals);
	}
	globalsCache.set(workerPath, [content, filepath]);
	return content;
};
/**
* Creates a shallow copy of the enumerable properties from the provided object.
*
* @param object - An optional object whose properties are to be extracted.
* @returns A new object containing the enumerable properties of the input, or
*   undefined if no valid object is provided.
*/
function extractProperties(object) {
	if (object && typeof object === "object") {
		const properties = {};
		for (const key in object) properties[key] = object[key];
		return properties;
	}
}
let sharedBuffer;
let sharedBufferView;
/**
* Spawns a worker thread and returns a synchronous function to dispatch tasks.
*
* The function initializes a worker thread with the specified script and
* configuration, setting up a dedicated message channel for bidirectional
* communication. It applies TypeScript runner settings, execution arguments,
* and global shims as needed. The returned function sends tasks to the worker,
* waits synchronously for a response using shared memory synchronization, and
* then returns the computed result.
*
* @param workerPath - The file path of the worker script to execute.
* @param options - An object containing configuration parameters:
*
*   - Timeout: Maximum time in milliseconds to wait for the worker's response.
*   - ExecArgv: Array of Node.js execution arguments for the worker.
*   - TsRunner: Specifies the TypeScript runner to use if the worker script is
*       TypeScript.
*   - TransferList: List of additional transferable objects to pass to the worker.
*   - GlobalShims: Modules to import as global shims; if true, a default preset is
*       used.
*
* @returns A synchronous function that accepts task arguments intended for the
*   worker thread and returns its result.
* @throws {Error} If a TypeScript runner is required but not specified, or if
*   an unsupported TypeScript runner is used for the file type.
* @throws {Error} If internal synchronization fails or if the message
*   identifier does not match the expected value.
*/
function startWorkerThread(workerPath, { timeout = DEFAULT_TIMEOUT, execArgv = DEFAULT_EXEC_ARGV, tsRunner = DEFAULT_TS_RUNNER, transferList = [], globalShims = DEFAULT_GLOBAL_SHIMS } = {}) {
	const { port1: mainPort, port2: workerPort } = new node_worker_threads.MessageChannel();
	const { isTs, ext, jsUseEsm, tsUseEsm, tsRunner: finalTsRunner, workerPath: finalWorkerPath, pnpLoaderPath, execArgv: finalExecArgv } = setupTsRunner(workerPath, {
		execArgv,
		tsRunner
	});
	const workerPathUrl = (0, node_url.pathToFileURL)(finalWorkerPath);
	if (/\.[cm]ts$/.test(finalWorkerPath)) {
		const isTsxSupported = !tsUseEsm || TS_ESM_PARTIAL_SUPPORTED;
		/* istanbul ignore if */
		if (!finalTsRunner) throw new Error("No ts runner specified, ts worker path is not supported");
		else if ([
			TsRunner.EsbuildRegister,
			TsRunner.EsbuildRunner,
			...TS_ESM_PARTIAL_SUPPORTED ? [TsRunner.OXC, TsRunner.SWC] : [],
			...isTsxSupported ? [] : [TsRunner.TSX]
		].includes(finalTsRunner)) throw new Error(`${finalTsRunner} is not supported for ${ext} files yet` + (isTsxSupported ? ", you can try [tsx](https://github.com/esbuild-kit/tsx) instead" : MTS_SUPPORTED ? ", you can try [oxc](https://github.com/oxc-project/oxc-node) or [swc](https://github.com/swc-project/swc-node/tree/master/packages/register) instead" : ""));
	}
	const finalGlobalShims = (globalShims === true ? DEFAULT_GLOBAL_SHIMS_PRESET : Array.isArray(globalShims) ? globalShims : []).filter(({ moduleName }) => (0, __pkgr_core.isPkgAvailable)(moduleName));
	sharedBufferView ?? (sharedBufferView = new Int32Array(sharedBuffer ?? (sharedBuffer = new SharedArrayBuffer(INT32_BYTES)), 0, 1));
	const useGlobals = finalGlobalShims.length > 0;
	const useEval = isTs ? !tsUseEsm : !jsUseEsm && useGlobals;
	const worker = new node_worker_threads.Worker(jsUseEsm && useGlobals || tsUseEsm && finalTsRunner === TsRunner.TsNode ? dataUrl(`${generateGlobals(finalWorkerPath, finalGlobalShims)};import '${String(workerPathUrl)}'`) : useEval ? `${generateGlobals(finalWorkerPath, finalGlobalShims, "require")};${encodeImportModule(finalWorkerPath, "require")}` : workerPathUrl, {
		eval: useEval,
		workerData: {
			sharedBufferView,
			workerPort,
			pnpLoaderPath
		},
		transferList: [workerPort, ...transferList],
		execArgv: finalExecArgv
	});
	let nextID = 0;
	const receiveMessageWithId = (port, expectedId, waitingTimeout) => {
		const start = Date.now();
		const status = Atomics.wait(sharedBufferView, 0, 0, waitingTimeout);
		Atomics.store(sharedBufferView, 0, 0);
		if (!["ok", "not-equal"].includes(status)) {
			const abortMsg = {
				id: expectedId,
				cmd: "abort"
			};
			port.postMessage(abortMsg);
			throw new Error("Internal error: Atomics.wait() failed: " + status);
		}
		const result = (0, node_worker_threads.receiveMessageOnPort)(mainPort);
		const msg = result === null || result === void 0 ? void 0 : result.message;
		if ((msg === null || msg === void 0 ? void 0 : msg.id) == null || msg.id < expectedId) {
			const waitingTime = Date.now() - start;
			return receiveMessageWithId(port, expectedId, waitingTimeout ? waitingTimeout - waitingTime : void 0);
		}
		const { id,...message } = msg;
		if (expectedId !== id) throw new Error(`Internal error: Expected id ${expectedId} but got id ${id}`);
		return {
			id,
			...message
		};
	};
	const syncFn = (...args) => {
		const id = nextID++;
		const msg = {
			id,
			args
		};
		worker.postMessage(msg);
		const { result, error, properties, stdio } = receiveMessageWithId(mainPort, id, timeout);
		for (const { type, chunk, encoding } of stdio) process[type].write(chunk, encoding);
		if (error) throw Object.assign(error, properties);
		return result;
	};
	worker.unref();
	return syncFn;
}
const overrideStdio = (stdio) => {
	for (const type of ["stdout", "stderr"]) process[type]._writev = (chunks, callback) => {
		for (const { chunk, encoding } of chunks) stdio.push({
			type,
			chunk,
			encoding
		});
		callback();
	};
};

//#endregion
//#region src/index.ts
let syncFnCache;
/**
* Creates a synchronous worker function.
*
* Converts the provided worker path (URL or string) to an absolute file path,
* retrieves a cached synchronous function if one exists, or starts a new worker
* thread to handle task execution. The resulting function is cached to avoid
* redundant initialization.
*
* @param workerPath - The absolute file path or URL of the worker script. If
*   given as a URL, it is converted to a file path.
* @param timeoutOrOptions - Optional timeout in milliseconds or an options
*   object to configure the worker thread.
* @returns A synchronous function that executes tasks on the specified worker
*   thread.
* @throws {Error} If the resulting worker path is not absolute.
*/
function createSyncFn(workerPath, timeoutOrOptions) {
	syncFnCache ?? (syncFnCache = new Map());
	if (typeof workerPath !== "string" || workerPath.startsWith("file://")) workerPath = (0, node_url.fileURLToPath)(workerPath);
	const cachedSyncFn = syncFnCache.get(workerPath);
	if (cachedSyncFn) return cachedSyncFn;
	if (!node_path.default.isAbsolute(workerPath)) throw new Error("`workerPath` must be absolute");
	const syncFn = startWorkerThread(
		workerPath,
		/* istanbul ignore next */
		typeof timeoutOrOptions === "number" ? { timeout: timeoutOrOptions } : timeoutOrOptions
	);
	syncFnCache.set(workerPath, syncFn);
	return syncFn;
}
/* istanbul ignore next */
/**
* Configures the worker thread to listen for messages from the parent process
* and execute a provided function.
*
* If the worker is not initialized with the required data, the function exits
* without further action. Otherwise, it optionally registers a custom module
* loader when a valid loader path is provided and captures output generated
* during execution. It listens for messages containing an identifier and
* arguments, then invokes the supplied function asynchronously with those
* arguments. If an abort command is received for the same message, the response
* is suppressed. Upon completing execution, it posts a message back with either
* the result or error details, including extracted error properties.
*
* @param fn - The function to execute when a message is received.
*/
function runAsWorker(fn) {
	if (!node_worker_threads.workerData) return;
	const stdio = [];
	overrideStdio(stdio);
	const { workerPort, sharedBufferView: sharedBufferView$1, pnpLoaderPath } = node_worker_threads.workerData;
	if (pnpLoaderPath && MODULE_REGISTER_SUPPORTED) node_module.default.register(pnpLoaderPath);
	node_worker_threads.parentPort.on("message", ({ id, args }) => {
		(async () => {
			let isAborted = false;
			const handleAbortMessage = (msg$1) => {
				if (msg$1.id === id && msg$1.cmd === "abort") isAborted = true;
			};
			workerPort.on("message", handleAbortMessage);
			let msg;
			try {
				msg = {
					id,
					stdio,
					result: await fn(...args)
				};
			} catch (error) {
				msg = {
					id,
					stdio,
					error,
					properties: extractProperties(error)
				};
			}
			workerPort.off("message", handleAbortMessage);
			if (isAborted) {
				stdio.length = 0;
				return;
			}
			try {
				workerPort.postMessage(msg);
				Atomics.add(sharedBufferView$1, 0, 1);
				Atomics.notify(sharedBufferView$1, 0);
			} finally {
				stdio.length = 0;
			}
		})();
	});
}

//#endregion
exports.DEFAULT_EXEC_ARGV = DEFAULT_EXEC_ARGV;
exports.DEFAULT_GLOBAL_SHIMS = DEFAULT_GLOBAL_SHIMS;
exports.DEFAULT_GLOBAL_SHIMS_PRESET = DEFAULT_GLOBAL_SHIMS_PRESET;
exports.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;
exports.DEFAULT_TS_RUNNER = DEFAULT_TS_RUNNER;
exports.DEFAULT_TYPES_NODE_VERSION = DEFAULT_TYPES_NODE_VERSION;
exports.EXPERIMENTAL_LOADER_FLAG = EXPERIMENTAL_LOADER_FLAG;
exports.FEATURE_TYPESCRIPT_NODE_VERSION = FEATURE_TYPESCRIPT_NODE_VERSION;
exports.IMPORT_FLAG = IMPORT_FLAG;
exports.IMPORT_FLAG_SUPPORTED = IMPORT_FLAG_SUPPORTED;
exports.INT32_BYTES = INT32_BYTES;
exports.LOADER_FLAG = LOADER_FLAG;
exports.LOADER_FLAGS = LOADER_FLAGS;
exports.MODULE_REGISTER_SUPPORTED = MODULE_REGISTER_SUPPORTED;
exports.MTS_SUPPORTED = MTS_SUPPORTED;
exports.NODE_OPTIONS = NODE_OPTIONS;
exports.NODE_VERSION = NODE_VERSION;
exports.NO_STRIP_TYPES = NO_STRIP_TYPES;
exports.NO_STRIP_TYPES_FLAG = NO_STRIP_TYPES_FLAG;
exports.REQUIRE_ABBR_FLAG = REQUIRE_ABBR_FLAG;
exports.REQUIRE_FLAG = REQUIRE_FLAG;
exports.REQUIRE_FLAGS = REQUIRE_FLAGS;
exports.STRIP_TYPES_FLAG = STRIP_TYPES_FLAG;
exports.STRIP_TYPES_NODE_VERSION = STRIP_TYPES_NODE_VERSION;
exports.TRANSFORM_TYPES_FLAG = TRANSFORM_TYPES_FLAG;
exports.TRANSFORM_TYPES_NODE_VERSION = TRANSFORM_TYPES_NODE_VERSION;
exports.TS_ESM_PARTIAL_SUPPORTED = TS_ESM_PARTIAL_SUPPORTED;
exports.TsRunner = TsRunner;
exports._generateGlobals = _generateGlobals;
exports.compareNodeVersion = compareNodeVersion;
exports.compareVersion = compareVersion;
exports.createSyncFn = createSyncFn;
exports.dataUrl = dataUrl;
exports.encodeImportModule = encodeImportModule;
exports.extractProperties = extractProperties;
exports.generateGlobals = generateGlobals;
exports.hasFlag = hasFlag;
exports.hasImportFlag = hasImportFlag;
exports.hasLoaderFlag = hasLoaderFlag;
exports.hasRequireFlag = hasRequireFlag;
exports.isFile = isFile;
exports.md5Hash = md5Hash;
exports.overrideStdio = overrideStdio;
exports.parseVersion = parseVersion;
exports.runAsWorker = runAsWorker;
exports.setupTsRunner = setupTsRunner;
exports.startWorkerThread = startWorkerThread;