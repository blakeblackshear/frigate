import { URI } from 'vscode-uri';
import { fromWorkspaceFileEditOptions, toWorkspaceFileEditOptions } from './workspaceFileEditOptions.js';
/**
 * Convert Monaco editor workspace file edit options to LSP workspace file edit options.
 *
 * @param workspaceFileEdit
 *   The Monaco workspace file edit options to convert.
 * @returns
 *   The range as LSP workspace file edit options.
 */
export function fromWorkspaceFileEdit(workspaceFileEdit) {
    let result;
    if (workspaceFileEdit.oldResource) {
        result = workspaceFileEdit.newResource
            ? {
                kind: 'rename',
                oldUri: String(workspaceFileEdit.oldResource),
                newUri: String(workspaceFileEdit.newResource)
            }
            : {
                kind: 'delete',
                uri: String(workspaceFileEdit.oldResource)
            };
    }
    else if (workspaceFileEdit.newResource) {
        result = {
            kind: 'create',
            uri: String(workspaceFileEdit.newResource)
        };
    }
    else {
        throw new Error('Could not convert workspace file edit to language server type', {
            cause: workspaceFileEdit
        });
    }
    if (workspaceFileEdit.options) {
        result.options = fromWorkspaceFileEditOptions(workspaceFileEdit.options);
    }
    return result;
}
/**
 * Convert an LSP workspace file edit to a Monaco editor workspace file edit.
 *
 * @param workspaceFileEdit
 *   The LSP workspace file edit to convert.
 * @returns
 *   The workspace file edit options Monaco editor workspace file edit options.
 */
export function toWorkspaceFileEdit(workspaceFileEdit) {
    const result = workspaceFileEdit.kind === 'create'
        ? { newResource: URI.parse(workspaceFileEdit.uri) }
        : workspaceFileEdit.kind === 'delete'
            ? { oldResource: URI.parse(workspaceFileEdit.uri) }
            : {
                oldResource: URI.parse(workspaceFileEdit.oldUri),
                newResource: URI.parse(workspaceFileEdit.newUri)
            };
    if (workspaceFileEdit.options) {
        result.options = toWorkspaceFileEditOptions(workspaceFileEdit.options);
    }
    return result;
}
//# sourceMappingURL=workspaceFileEdit.js.map