import { RequestHandler, NotificationHandler, WorkspaceEdit, CreateFilesParams, RenameFilesParams, DeleteFilesParams, Disposable } from 'vscode-languageserver-protocol';
import type { Feature, _RemoteWorkspace } from './server';
/**
 * Shape of the file operations feature
 *
 * @since 3.16.0
 */
export interface FileOperationsFeatureShape {
    onDidCreateFiles(handler: NotificationHandler<CreateFilesParams>): Disposable;
    onDidRenameFiles(handler: NotificationHandler<RenameFilesParams>): Disposable;
    onDidDeleteFiles(handler: NotificationHandler<DeleteFilesParams>): Disposable;
    onWillCreateFiles(handler: RequestHandler<CreateFilesParams, WorkspaceEdit | null, never>): Disposable;
    onWillRenameFiles(handler: RequestHandler<RenameFilesParams, WorkspaceEdit | null, never>): Disposable;
    onWillDeleteFiles(handler: RequestHandler<DeleteFilesParams, WorkspaceEdit | null, never>): Disposable;
}
export declare const FileOperationsFeature: Feature<_RemoteWorkspace, FileOperationsFeatureShape>;
