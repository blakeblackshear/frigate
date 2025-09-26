"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useProgramFromProjectService = useProgramFromProjectService;
const debug_1 = __importDefault(require("debug"));
const minimatch_1 = require("minimatch");
const path_1 = __importDefault(require("path"));
const createProjectProgram_1 = require("./create-program/createProjectProgram");
const validateDefaultProjectForFilesGlob_1 = require("./create-program/validateDefaultProjectForFilesGlob");
const log = (0, debug_1.default)('typescript-eslint:typescript-estree:useProgramFromProjectService');
function useProgramFromProjectService({ allowDefaultProjectForFiles, maximumDefaultProjectFileMatchCount, service, }, parseSettings, hasFullTypeInformation, defaultProjectMatchedFiles) {
    // We don't canonicalize the filename because it caused a performance regression.
    // See https://github.com/typescript-eslint/typescript-eslint/issues/8519
    const filePathAbsolute = absolutify(parseSettings.filePath);
    log('Opening project service file for: %s at absolute path %s', parseSettings.filePath, filePathAbsolute);
    const opened = service.openClientFile(filePathAbsolute, parseSettings.codeFullText, 
    /* scriptKind */ undefined, parseSettings.tsconfigRootDir);
    log('Opened project service file: %o', opened);
    if (hasFullTypeInformation) {
        log('Project service type information enabled; checking for file path match on: %o', allowDefaultProjectForFiles);
        const isDefaultProjectAllowedPath = filePathMatchedBy(parseSettings.filePath, allowDefaultProjectForFiles);
        log('Default project allowed path: %s, based on config file: %s', isDefaultProjectAllowedPath, opened.configFileName);
        if (opened.configFileName) {
            if (isDefaultProjectAllowedPath) {
                throw new Error(`${parseSettings.filePath} was included by allowDefaultProjectForFiles but also was found in the project service. Consider removing it from allowDefaultProjectForFiles.`);
            }
        }
        else if (!isDefaultProjectAllowedPath) {
            throw new Error(`${parseSettings.filePath} was not found by the project service. Consider either including it in the tsconfig.json or including it in allowDefaultProjectForFiles.`);
        }
    }
    log('Retrieving script info and then program for: %s', filePathAbsolute);
    const scriptInfo = service.getScriptInfo(filePathAbsolute);
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const program = service
        .getDefaultProjectForFile(scriptInfo.fileName, true)
        .getLanguageService(/*ensureSynchronized*/ true)
        .getProgram();
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
    if (!program) {
        log('Could not find project service program for: %s', filePathAbsolute);
        return undefined;
    }
    if (!opened.configFileName) {
        defaultProjectMatchedFiles.add(filePathAbsolute);
    }
    if (defaultProjectMatchedFiles.size > maximumDefaultProjectFileMatchCount) {
        const filePrintLimit = 20;
        const filesToPrint = Array.from(defaultProjectMatchedFiles).slice(0, filePrintLimit);
        const truncatedFileCount = defaultProjectMatchedFiles.size - filesToPrint.length;
        throw new Error(`Too many files (>${maximumDefaultProjectFileMatchCount}) have matched the default project.${validateDefaultProjectForFilesGlob_1.DEFAULT_PROJECT_FILES_ERROR_EXPLANATION}
Matching files:
${filesToPrint.map(file => `- ${file}`).join('\n')}
${truncatedFileCount ? `...and ${truncatedFileCount} more files\n` : ''}
If you absolutely need more files included, set parserOptions.EXPERIMENTAL_useProjectService.maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING to a larger value.
`);
    }
    log('Found project service program for: %s', filePathAbsolute);
    return (0, createProjectProgram_1.createProjectProgram)(parseSettings, [program]);
    function absolutify(filePath) {
        return path_1.default.isAbsolute(filePath)
            ? filePath
            : path_1.default.join(service.host.getCurrentDirectory(), filePath);
    }
}
function filePathMatchedBy(filePath, allowDefaultProjectForFiles) {
    return !!allowDefaultProjectForFiles?.some(pattern => (0, minimatch_1.minimatch)(filePath, pattern));
}
//# sourceMappingURL=useProgramFromProjectService.js.map