import { createRequire } from 'node:module';
export const CWD = process.cwd();
const importMetaUrl = import.meta.url;
export const cjsRequire = importMetaUrl
    ? createRequire(importMetaUrl)
    : require;
export const EVAL_FILENAMES = new Set(['[eval]', '[worker eval]']);
export const EXTENSIONS = ['.ts', '.tsx', ...Object.keys(cjsRequire.extensions)];
//# sourceMappingURL=constants.js.map