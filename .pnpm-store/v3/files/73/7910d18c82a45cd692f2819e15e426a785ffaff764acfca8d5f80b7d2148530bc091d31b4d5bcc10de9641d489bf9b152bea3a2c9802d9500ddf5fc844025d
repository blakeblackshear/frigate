"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PROJECT_FILES_ERROR_EXPLANATION = void 0;
exports.validateDefaultProjectForFilesGlob = validateDefaultProjectForFilesGlob;
exports.DEFAULT_PROJECT_FILES_ERROR_EXPLANATION = `

Having many files run with the default project is known to cause performance issues and slow down linting.

See https://typescript-eslint.io/troubleshooting/typed-linting#allowdefaultprojectforfiles-glob-too-wide
`;
function validateDefaultProjectForFilesGlob(options) {
    if (!options.allowDefaultProjectForFiles?.length) {
        return;
    }
    for (const glob of options.allowDefaultProjectForFiles) {
        if (glob === '*') {
            throw new Error(`allowDefaultProjectForFiles contains the overly wide '*'.${exports.DEFAULT_PROJECT_FILES_ERROR_EXPLANATION}`);
        }
        if (glob.includes('**')) {
            throw new Error(`allowDefaultProjectForFiles glob '${glob}' contains a disallowed '**'.${exports.DEFAULT_PROJECT_FILES_ERROR_EXPLANATION}`);
        }
    }
}
//# sourceMappingURL=validateDefaultProjectForFilesGlob.js.map