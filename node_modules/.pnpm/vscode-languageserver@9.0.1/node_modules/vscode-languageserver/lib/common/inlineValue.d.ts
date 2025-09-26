import { InlineValue, Disposable, InlineValueParams } from 'vscode-languageserver-protocol';
import type { Feature, _Languages, ServerRequestHandler } from './server';
/**
 * Shape of the inline values feature
 *
 * @since 3.17.0
 */
export interface InlineValueFeatureShape {
    inlineValue: {
        /**
         * Ask the client to refresh all inline values.
         */
        refresh(): Promise<void>;
        /**
         * Installs a handler for the inline values request.
         *
         * @param handler The corresponding handler.
         */
        on(handler: ServerRequestHandler<InlineValueParams, InlineValue[] | undefined | null, InlineValue[], void>): Disposable;
    };
}
export declare const InlineValueFeature: Feature<_Languages, InlineValueFeatureShape>;
