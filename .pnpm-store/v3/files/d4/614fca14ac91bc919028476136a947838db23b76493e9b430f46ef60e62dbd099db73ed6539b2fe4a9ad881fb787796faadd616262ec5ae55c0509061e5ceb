import { InlineCompletionItem, Disposable, InlineCompletionParams, InlineCompletionList } from 'vscode-languageserver-protocol';
import type { Feature, _Languages, ServerRequestHandler } from './server';
/**
 * Shape of the inline completions feature
 *
 * @since 3.18.0
 */
export interface InlineCompletionFeatureShape {
    inlineCompletion: {
        /**
         * Installs a handler for the inline completions request.
         *
         * @param handler The corresponding handler.
         */
        on(handler: ServerRequestHandler<InlineCompletionParams, InlineCompletionList | InlineCompletionItem[] | undefined | null, InlineCompletionItem[], void>): Disposable;
    };
}
export declare const InlineCompletionFeature: Feature<_Languages, InlineCompletionFeatureShape>;
