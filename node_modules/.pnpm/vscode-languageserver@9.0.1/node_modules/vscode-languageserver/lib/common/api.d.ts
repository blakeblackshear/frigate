import { _, Features, _Connection } from './server';
import { SemanticTokensBuilder } from './semanticTokens';
import type { WorkDoneProgressReporter, WorkDoneProgressServerReporter, ResultProgressReporter } from './progress';
import * as ic from './inlineCompletion.proposed';
export * from 'vscode-languageserver-protocol/';
export { WorkDoneProgressReporter, WorkDoneProgressServerReporter, ResultProgressReporter };
export { SemanticTokensBuilder };
import { TextDocuments, TextDocumentsConfiguration, TextDocumentChangeEvent, TextDocumentWillSaveEvent } from './textDocuments';
export { TextDocuments, TextDocumentsConfiguration, TextDocumentChangeEvent, TextDocumentWillSaveEvent };
import { NotebookDocuments } from './notebook';
export { NotebookDocuments };
export * from './server';
export declare namespace ProposedFeatures {
    const all: Features<_, _, _, _, _, _, ic.InlineCompletionFeatureShape, _>;
    type Connection = _Connection<_, _, _, _, _, _, ic.InlineCompletionFeatureShape, _>;
}
