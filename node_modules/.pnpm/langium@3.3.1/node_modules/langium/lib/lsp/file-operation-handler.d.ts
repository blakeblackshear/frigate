/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { CreateFilesParams, DeleteFilesParams, FileOperationOptions, RenameFilesParams, WorkspaceEdit } from 'vscode-languageserver';
import type { MaybePromise } from '../utils/promise-utils.js';
/**
 * Shared service for handling file changes such as file creation, deletion and renaming.
 * The interface methods are optional, so they are only registered if they are implemented.
 */
export interface FileOperationHandler {
    /**
     * These options are reported to the client as part of the ServerCapabilities.
     */
    readonly fileOperationOptions: FileOperationOptions;
    /**
     * Files were created from within the client.
     * This notification must be registered with the {@link fileOperationOptions}.
     */
    didCreateFiles?(params: CreateFilesParams): void;
    /**
     * Files were renamed from within the client.
     * This notification must be registered with the {@link fileOperationOptions}.
     */
    didRenameFiles?(params: RenameFilesParams): void;
    /**
     * Files were deleted from within the client.
     * This notification must be registered with the {@link fileOperationOptions}.
     */
    didDeleteFiles?(params: DeleteFilesParams): void;
    /**
     * Called before files are actually created as long as the creation is triggered from within
     * the client either by a user action or by applying a workspace edit.
     * This request must be registered with the {@link fileOperationOptions}.
     * @returns a WorkspaceEdit which will be applied to workspace before the files are created.
     */
    willCreateFiles?(params: CreateFilesParams): MaybePromise<WorkspaceEdit | null>;
    /**
     * Called before files are actually renamed as long as the rename is triggered from within
     * the client either by a user action or by applying a workspace edit.
     * This request must be registered with the {@link fileOperationOptions}.
     * @returns a WorkspaceEdit which will be applied to workspace before the files are renamed.
     */
    willRenameFiles?(params: RenameFilesParams): MaybePromise<WorkspaceEdit | null>;
    /**
     * Called before files are actually deleted as long as the deletion is triggered from within
     * the client either by a user action or by applying a workspace edit.
     * This request must be registered with the {@link fileOperationOptions}.
     * @returns a WorkspaceEdit which will be applied to workspace before the files are deleted.
     */
    willDeleteFiles?(params: DeleteFilesParams): MaybePromise<WorkspaceEdit | null>;
}
//# sourceMappingURL=file-operation-handler.d.ts.map