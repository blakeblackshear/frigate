import { Event, WorkspaceFolder, WorkspaceFoldersChangeEvent } from 'vscode-languageserver-protocol';
import type { Feature, _RemoteWorkspace } from './server';
export interface WorkspaceFolders {
    getWorkspaceFolders(): Promise<WorkspaceFolder[] | null>;
    onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;
}
export declare const WorkspaceFoldersFeature: Feature<_RemoteWorkspace, WorkspaceFolders>;
