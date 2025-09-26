"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectService = createProjectService;
/* eslint-disable @typescript-eslint/no-empty-function -- for TypeScript APIs*/
const node_os_1 = __importDefault(require("node:os"));
const validateDefaultProjectForFilesGlob_1 = require("./validateDefaultProjectForFilesGlob");
const DEFAULT_PROJECT_MATCHED_FILES_THRESHOLD = 8;
const doNothing = () => { };
const createStubFileWatcher = () => ({
    close: doNothing,
});
function createProjectService(optionsRaw, jsDocParsingMode) {
    const options = typeof optionsRaw === 'object' ? optionsRaw : {};
    (0, validateDefaultProjectForFilesGlob_1.validateDefaultProjectForFilesGlob)(options);
    // We import this lazily to avoid its cost for users who don't use the service
    // TODO: Once we drop support for TS<5.3 we can import from "typescript" directly
    const tsserver = require('typescript/lib/tsserverlibrary');
    // TODO: see getWatchProgramsForProjects
    // We don't watch the disk, we just refer to these when ESLint calls us
    // there's a whole separate update pass in maybeInvalidateProgram at the bottom of getWatchProgramsForProjects
    // (this "goes nuclear on TypeScript")
    const system = {
        ...tsserver.sys,
        clearImmediate,
        clearTimeout,
        setImmediate,
        setTimeout,
        watchDirectory: createStubFileWatcher,
        watchFile: createStubFileWatcher,
    };
    const service = new tsserver.server.ProjectService({
        host: system,
        cancellationToken: { isCancellationRequested: () => false },
        useSingleInferredProject: false,
        useInferredProjectPerProjectRoot: false,
        logger: {
            close: doNothing,
            endGroup: doNothing,
            getLogFileName: () => undefined,
            hasLevel: () => false,
            info: doNothing,
            loggingEnabled: () => false,
            msg: doNothing,
            perftrc: doNothing,
            startGroup: doNothing,
        },
        session: undefined,
        jsDocParsingMode,
    });
    service.setHostConfiguration({
        preferences: {
            includePackageJsonAutoImports: 'off',
        },
    });
    if (options.defaultProject) {
        let configRead;
        try {
            configRead = tsserver.readConfigFile(options.defaultProject, system.readFile);
        }
        catch (error) {
            throw new Error(`Could not parse default project '${options.defaultProject}': ${error.message}`);
        }
        if (configRead.error) {
            throw new Error(`Could not read default project '${options.defaultProject}': ${tsserver.formatDiagnostic(configRead.error, {
                getCurrentDirectory: system.getCurrentDirectory,
                getCanonicalFileName: fileName => fileName,
                getNewLine: () => node_os_1.default.EOL,
            })}`);
        }
        service.setCompilerOptionsForInferredProjects(configRead.config.compilerOptions);
    }
    return {
        allowDefaultProjectForFiles: options.allowDefaultProjectForFiles,
        maximumDefaultProjectFileMatchCount: options.maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING ??
            DEFAULT_PROJECT_MATCHED_FILES_THRESHOLD,
        service,
    };
}
//# sourceMappingURL=createProjectService.js.map