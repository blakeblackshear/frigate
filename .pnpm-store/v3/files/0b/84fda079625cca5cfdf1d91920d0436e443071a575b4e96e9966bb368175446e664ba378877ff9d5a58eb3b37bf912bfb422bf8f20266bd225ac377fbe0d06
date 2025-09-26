import fs from 'node:fs';
import path from 'node:path';
import { CWD, EXTENSIONS, cjsRequire } from './constants.js';
export const tryPkg = (pkg) => {
    try {
        return cjsRequire.resolve(pkg);
    }
    catch { }
};
export const isPkgAvailable = (pkg) => !!tryPkg(pkg);
export const tryFile = (filename, includeDir = false, base = CWD) => {
    if (typeof filename === 'string') {
        const filepath = path.resolve(base, filename);
        return fs.existsSync(filepath) &&
            (includeDir || fs.statSync(filepath).isFile())
            ? filepath
            : '';
    }
    for (const file of filename ?? []) {
        const filepath = tryFile(file, includeDir, base);
        if (filepath) {
            return filepath;
        }
    }
    return '';
};
export const tryExtensions = (filepath, extensions = EXTENSIONS) => {
    const ext = [...extensions, ''].find(ext => tryFile(filepath + ext));
    return ext == null ? '' : filepath + ext;
};
export const findUp = (searchEntry, searchFileOrIncludeDir, includeDir) => {
    const isSearchFile = typeof searchFileOrIncludeDir === 'string';
    const searchFile = isSearchFile ? searchFileOrIncludeDir : 'package.json';
    let lastSearchEntry;
    do {
        const searched = tryFile(searchFile, isSearchFile && includeDir, searchEntry);
        if (searched) {
            return searched;
        }
        lastSearchEntry = searchEntry;
        searchEntry = path.dirname(searchEntry);
    } while (!lastSearchEntry || lastSearchEntry !== searchEntry);
    return '';
};
//# sourceMappingURL=helpers.js.map