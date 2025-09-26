"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globSync = globSync;
const path_1 = require("../vendor/node/path");
const glob_to_regex_js_1 = require("glob-to-regex.js");
const util_1 = require("./util");
const pathJoin = path_1.posix.join;
const pathRelative = path_1.posix.relative;
const pathResolve = path_1.posix.resolve;
/**
 * Check if a path matches a glob pattern
 */
function matchesPattern(path, pattern) {
    const regex = (0, glob_to_regex_js_1.toRegex)(pattern);
    return regex.test(path);
}
/**
 * Check if a path should be excluded based on exclude patterns
 */
function isExcluded(path, exclude) {
    if (!exclude)
        return false;
    if (typeof exclude === 'function') {
        return exclude(path);
    }
    const patterns = Array.isArray(exclude) ? exclude : [exclude];
    return patterns.some(pattern => matchesPattern(path, pattern));
}
/**
 * Walk directory tree and collect matching paths
 */
function walkDirectory(fs, dir, patterns, options, currentDepth = 0) {
    const results = [];
    const maxDepth = options.maxdepth ?? Infinity;
    const baseCwd = options.cwd ? (0, util_1.pathToFilename)(options.cwd) : process.cwd();
    if (currentDepth > maxDepth) {
        return results;
    }
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = pathJoin(dir, entry.name.toString());
            const relativePath = pathRelative(baseCwd, fullPath);
            // Skip if excluded
            if (isExcluded(relativePath, options.exclude)) {
                continue;
            }
            // Check if this path matches any pattern
            const matches = patterns.some(pattern => matchesPattern(relativePath, pattern));
            if (matches) {
                results.push(relativePath);
            }
            // Recurse into directories
            if (entry.isDirectory() && currentDepth < maxDepth) {
                const subResults = walkDirectory(fs, fullPath, patterns, options, currentDepth + 1);
                results.push(...subResults);
            }
        }
    }
    catch (err) {
        // Skip directories we can't read
    }
    return results;
}
/**
 * Main glob implementation
 */
function globSync(fs, pattern, options = {}) {
    const cwd = options.cwd ? (0, util_1.pathToFilename)(options.cwd) : process.cwd();
    const resolvedCwd = pathResolve(cwd);
    const globOptions = {
        cwd: resolvedCwd,
        exclude: options.exclude,
        maxdepth: options.maxdepth,
        withFileTypes: options.withFileTypes || false,
    };
    let results = [];
    // Handle absolute patterns
    if (path_1.posix.isAbsolute(pattern)) {
        const dir = path_1.posix.dirname(pattern);
        const patternBasename = path_1.posix.basename(pattern);
        const dirResults = walkDirectory(fs, dir, [patternBasename], { ...globOptions, cwd: dir });
        results.push(...dirResults.map(r => path_1.posix.resolve(dir, r)));
    }
    else {
        // Handle relative patterns
        const dirResults = walkDirectory(fs, resolvedCwd, [pattern], globOptions);
        results.push(...dirResults);
    }
    // Remove duplicates and sort
    results = [...new Set(results)].sort();
    return results;
}
//# sourceMappingURL=glob.js.map