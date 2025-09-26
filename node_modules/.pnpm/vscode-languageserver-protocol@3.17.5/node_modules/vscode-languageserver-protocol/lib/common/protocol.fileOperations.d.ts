import { NotificationHandler, RequestHandler } from 'vscode-jsonrpc';
import { WorkspaceEdit } from 'vscode-languageserver-types';
import { MessageDirection, ProtocolNotificationType, ProtocolRequestType } from './messages';
/**
 * Options for notifications/requests for user operations on files.
 *
 * @since 3.16.0
 */
export interface FileOperationOptions {
    /**
    * The server is interested in receiving didCreateFiles notifications.
    */
    didCreate?: FileOperationRegistrationOptions;
    /**
    * The server is interested in receiving willCreateFiles requests.
    */
    willCreate?: FileOperationRegistrationOptions;
    /**
    * The server is interested in receiving didRenameFiles notifications.
    */
    didRename?: FileOperationRegistrationOptions;
    /**
    * The server is interested in receiving willRenameFiles requests.
    */
    willRename?: FileOperationRegistrationOptions;
    /**
    * The server is interested in receiving didDeleteFiles file notifications.
    */
    didDelete?: FileOperationRegistrationOptions;
    /**
    * The server is interested in receiving willDeleteFiles file requests.
    */
    willDelete?: FileOperationRegistrationOptions;
}
/**
 * The options to register for file operations.
 *
 * @since 3.16.0
 */
export interface FileOperationRegistrationOptions {
    /**
     * The actual filters.
     */
    filters: FileOperationFilter[];
}
/**
 * A pattern kind describing if a glob pattern matches a file a folder or
 * both.
 *
 * @since 3.16.0
 */
export declare namespace FileOperationPatternKind {
    /**
     * The pattern matches a file only.
     */
    const file: 'file';
    /**
     * The pattern matches a folder only.
     */
    const folder: 'folder';
}
export type FileOperationPatternKind = 'file' | 'folder';
/**
 * Matching options for the file operation pattern.
 *
 * @since 3.16.0
 */
export interface FileOperationPatternOptions {
    /**
     * The pattern should be matched ignoring casing.
     */
    ignoreCase?: boolean;
}
/**
 * A pattern to describe in which file operation requests or notifications
 * the server is interested in receiving.
 *
 * @since 3.16.0
 */
interface FileOperationPattern {
    /**
     * The glob pattern to match. Glob patterns can have the following syntax:
     * - `*` to match one or more characters in a path segment
     * - `?` to match on one character in a path segment
     * - `**` to match any number of path segments, including none
     * - `{}` to group sub patterns into an OR expression. (e.g. `**​/*.{ts,js}` matches all TypeScript and JavaScript files)
     * - `[]` to declare a range of characters to match in a path segment (e.g., `example.[0-9]` to match on `example.0`, `example.1`, …)
     * - `[!...]` to negate a range of characters to match in a path segment (e.g., `example.[!0-9]` to match on `example.a`, `example.b`, but not `example.0`)
     */
    glob: string;
    /**
     * Whether to match files or folders with this pattern.
     *
     * Matches both if undefined.
     */
    matches?: FileOperationPatternKind;
    /**
     * Additional options used during matching.
     */
    options?: FileOperationPatternOptions;
}
/**
 * A filter to describe in which file operation requests or notifications
 * the server is interested in receiving.
 *
 * @since 3.16.0
 */
export interface FileOperationFilter {
    /**
     * A Uri scheme like `file` or `untitled`.
     */
    scheme?: string;
    /**
     * The actual file operation pattern.
     */
    pattern: FileOperationPattern;
}
/**
 * Capabilities relating to events from file operations by the user in the client.
 *
 * These events do not come from the file system, they come from user operations
 * like renaming a file in the UI.
 *
 * @since 3.16.0
 */
export interface FileOperationClientCapabilities {
    /**
     * Whether the client supports dynamic registration for file requests/notifications.
     */
    dynamicRegistration?: boolean;
    /**
     * The client has support for sending didCreateFiles notifications.
     */
    didCreate?: boolean;
    /**
     * The client has support for sending willCreateFiles requests.
     */
    willCreate?: boolean;
    /**
     * The client has support for sending didRenameFiles notifications.
     */
    didRename?: boolean;
    /**
     * The client has support for sending willRenameFiles requests.
     */
    willRename?: boolean;
    /**
     * The client has support for sending didDeleteFiles notifications.
     */
    didDelete?: boolean;
    /**
     * The client has support for sending willDeleteFiles requests.
     */
    willDelete?: boolean;
}
/**
 * The parameters sent in notifications/requests for user-initiated creation of
 * files.
 *
 * @since 3.16.0
 */
export interface CreateFilesParams {
    /**
     * An array of all files/folders created in this operation.
     */
    files: FileCreate[];
}
/**
 * Represents information on a file/folder create.
 *
 * @since 3.16.0
 */
export interface FileCreate {
    /**
     * A file:// URI for the location of the file/folder being created.
     */
    uri: string;
}
/**
 * The parameters sent in notifications/requests for user-initiated renames of
 * files.
 *
 * @since 3.16.0
 */
export interface RenameFilesParams {
    /**
     * An array of all files/folders renamed in this operation. When a folder is renamed, only
     * the folder will be included, and not its children.
     */
    files: FileRename[];
}
/**
 * Represents information on a file/folder rename.
 *
 * @since 3.16.0
 */
export interface FileRename {
    /**
     * A file:// URI for the original location of the file/folder being renamed.
     */
    oldUri: string;
    /**
     * A file:// URI for the new location of the file/folder being renamed.
     */
    newUri: string;
}
/**
 * The parameters sent in notifications/requests for user-initiated deletes of
 * files.
 *
 * @since 3.16.0
 */
export interface DeleteFilesParams {
    /**
     * An array of all files/folders deleted in this operation.
     */
    files: FileDelete[];
}
/**
 * Represents information on a file/folder delete.
 *
 * @since 3.16.0
 */
export interface FileDelete {
    /**
     * A file:// URI for the location of the file/folder being deleted.
     */
    uri: string;
}
/**
 * The will create files request is sent from the client to the server before files are actually
 * created as long as the creation is triggered from within the client.
 *
 * The request can return a `WorkspaceEdit` which will be applied to workspace before the
 * files are created. Hence the `WorkspaceEdit` can not manipulate the content of the file
 * to be created.
 *
 * @since 3.16.0
 */
export declare namespace WillCreateFilesRequest {
    const method: 'workspace/willCreateFiles';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<CreateFilesParams, WorkspaceEdit | null, never, void, FileOperationRegistrationOptions>;
    type HandlerSignature = RequestHandler<CreateFilesParams, WorkspaceEdit | undefined | null, void>;
}
/**
 * The did create files notification is sent from the client to the server when
 * files were created from within the client.
 *
 * @since 3.16.0
 */
export declare namespace DidCreateFilesNotification {
    const method: 'workspace/didCreateFiles';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<CreateFilesParams, FileOperationRegistrationOptions>;
    type HandlerSignature = NotificationHandler<CreateFilesParams>;
}
/**
 * The will rename files request is sent from the client to the server before files are actually
 * renamed as long as the rename is triggered from within the client.
 *
 * @since 3.16.0
 */
export declare namespace WillRenameFilesRequest {
    const method: 'workspace/willRenameFiles';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<RenameFilesParams, WorkspaceEdit | null, never, void, FileOperationRegistrationOptions>;
    type HandlerSignature = RequestHandler<RenameFilesParams, WorkspaceEdit | undefined | null, void>;
}
/**
 * The did rename files notification is sent from the client to the server when
 * files were renamed from within the client.
 *
 * @since 3.16.0
 */
export declare namespace DidRenameFilesNotification {
    const method: 'workspace/didRenameFiles';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<RenameFilesParams, FileOperationRegistrationOptions>;
    type HandlerSignature = NotificationHandler<RenameFilesParams>;
}
/**
 * The will delete files request is sent from the client to the server before files are actually
 * deleted as long as the deletion is triggered from within the client.
 *
 * @since 3.16.0
 */
export declare namespace DidDeleteFilesNotification {
    const method: 'workspace/didDeleteFiles';
    const messageDirection: MessageDirection;
    const type: ProtocolNotificationType<DeleteFilesParams, FileOperationRegistrationOptions>;
    type HandlerSignature = NotificationHandler<DeleteFilesParams>;
}
/**
 * The did delete files notification is sent from the client to the server when
 * files were deleted from within the client.
 *
 * @since 3.16.0
 */
export declare namespace WillDeleteFilesRequest {
    const method: 'workspace/willDeleteFiles';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<DeleteFilesParams, WorkspaceEdit | null, never, void, FileOperationRegistrationOptions>;
    type HandlerSignature = RequestHandler<DeleteFilesParams, WorkspaceEdit | undefined | null, void>;
}
export {};
