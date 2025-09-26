/**
 * Convert Monaco editor workspace file edit options to LSP workspace file edit options.
 *
 * @param options
 *   The Monaco workspace file edit options to convert.
 * @returns
 *   The range as LSP workspace file edit options.
 */
export function fromWorkspaceFileEditOptions(options) {
    const result = {};
    if (options.ignoreIfExists != null) {
        result.ignoreIfExists = options.ignoreIfExists;
    }
    if (options.ignoreIfNotExists != null) {
        result.ignoreIfNotExists = options.ignoreIfNotExists;
    }
    if (options.overwrite != null) {
        result.overwrite = options.overwrite;
    }
    if (options.recursive != null) {
        result.recursive = options.recursive;
    }
    return result;
}
/**
 * Convert LSP workspace file edit options to Monaco editor workspace file edit options.
 *
 * @param options
 *   The LSP workspace file edit options to convert.
 * @returns
 *   The workspace file edit options Monaco editor workspace file edit options.
 */
export function toWorkspaceFileEditOptions(options) {
    const result = {};
    if (options.ignoreIfExists != null) {
        result.ignoreIfExists = options.ignoreIfExists;
    }
    if (options.ignoreIfNotExists != null) {
        result.ignoreIfNotExists = options.ignoreIfNotExists;
    }
    if (options.overwrite != null) {
        result.overwrite = options.overwrite;
    }
    if (options.recursive != null) {
        result.recursive = options.recursive;
    }
    return result;
}
//# sourceMappingURL=workspaceFileEditOptions.js.map