import { ShowDocumentParams, ShowDocumentResult } from 'vscode-languageserver-protocol';
import type { Feature, _RemoteWindow } from './server';
export interface ShowDocumentFeatureShape {
    showDocument(params: ShowDocumentParams): Promise<ShowDocumentResult>;
}
export declare const ShowDocumentFeature: Feature<_RemoteWindow, ShowDocumentFeatureShape>;
