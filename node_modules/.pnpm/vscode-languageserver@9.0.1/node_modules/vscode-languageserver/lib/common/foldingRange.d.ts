import { FoldingRange, Disposable, FoldingRangeParams } from 'vscode-languageserver-protocol';
import type { Feature, _Languages, ServerRequestHandler } from './server';
/**
 * Shape of the folding range feature
 */
export interface FoldingRangeFeatureShape {
    foldingRange: {
        /**
         * Ask the client to refresh all folding ranges
         *
         * @since 3.18.0.
         * @proposed
         */
        refresh(): Promise<void>;
        /**
         * Installs a handler for the folding range request.
         *
         * @param handler The corresponding handler.
         */
        on(handler: ServerRequestHandler<FoldingRangeParams, FoldingRange[] | undefined | null, FoldingRange[], void>): Disposable;
    };
}
export declare const FoldingRangeFeature: Feature<_Languages, FoldingRangeFeatureShape>;
