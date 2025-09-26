import { compareNodeVersion, hasFlag } from './common.js';
export const TsRunner = {
    Node: 'node',
    Bun: 'bun',
    TsNode: 'ts-node',
    EsbuildRegister: 'esbuild-register',
    EsbuildRunner: 'esbuild-runner',
    OXC: 'oxc',
    SWC: 'swc',
    TSX: 'tsx',
};
const { NODE_OPTIONS: NODE_OPTIONS_ = '', SYNCKIT_EXEC_ARGV = '', SYNCKIT_GLOBAL_SHIMS, SYNCKIT_TIMEOUT, SYNCKIT_TS_RUNNER, } = process.env;
export const TS_ESM_PARTIAL_SUPPORTED = compareNodeVersion('16') >= 0 &&
    compareNodeVersion('18.19') < 0;
export const MTS_SUPPORTED = compareNodeVersion('20.8') >= 0;
export const MODULE_REGISTER_SUPPORTED = MTS_SUPPORTED ||
    compareNodeVersion('18.19') >= 0;
export const STRIP_TYPES_NODE_VERSION = '22.6';
export const TRANSFORM_TYPES_NODE_VERSION = '22.7';
export const FEATURE_TYPESCRIPT_NODE_VERSION = '22.10';
export const DEFAULT_TYPES_NODE_VERSION = '23.6';
export const STRIP_TYPES_FLAG = '--experimental-strip-types';
export const TRANSFORM_TYPES_FLAG = '--experimental-transform-types';
export const NO_STRIP_TYPES_FLAG = '--no-experimental-strip-types';
export const NODE_OPTIONS = NODE_OPTIONS_.split(/\s+/);
export const NO_STRIP_TYPES = hasFlag(NO_STRIP_TYPES_FLAG) &&
    (compareNodeVersion(FEATURE_TYPESCRIPT_NODE_VERSION) >= 0
        ? process.features.typescript === false
        : !hasFlag(STRIP_TYPES_FLAG) && !hasFlag(TRANSFORM_TYPES_FLAG));
export const DEFAULT_TIMEOUT = SYNCKIT_TIMEOUT ? +SYNCKIT_TIMEOUT : undefined;
export const DEFAULT_EXEC_ARGV = SYNCKIT_EXEC_ARGV.split(',');
export const DEFAULT_TS_RUNNER = SYNCKIT_TS_RUNNER;
export const DEFAULT_GLOBAL_SHIMS = ['1', 'true'].includes(SYNCKIT_GLOBAL_SHIMS);
export const DEFAULT_GLOBAL_SHIMS_PRESET = [
    {
        moduleName: 'node-fetch',
        globalName: 'fetch',
    },
    {
        moduleName: 'node:perf_hooks',
        globalName: 'performance',
        named: 'performance',
    },
];
export const IMPORT_FLAG = '--import';
export const REQUIRE_FLAG = '--require';
export const REQUIRE_ABBR_FLAG = '-r';
export const REQUIRE_FLAGS = new Set([REQUIRE_FLAG, REQUIRE_ABBR_FLAG]);
export const LOADER_FLAG = '--loader';
export const EXPERIMENTAL_LOADER_FLAG = '--experimental-loader';
export const LOADER_FLAGS = new Set([LOADER_FLAG, EXPERIMENTAL_LOADER_FLAG]);
export const IMPORT_FLAG_SUPPORTED = compareNodeVersion('20.6') >= 0;
export const INT32_BYTES = 4;
//# sourceMappingURL=constants.js.map