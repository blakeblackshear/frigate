import { LinkedEditingRangeParams, LinkedEditingRanges, Disposable } from 'vscode-languageserver-protocol';
import type { Feature, _Languages, ServerRequestHandler } from './server';
/**
 * Shape of the linked editing feature
 *
 * @since 3.16.0
 */
export interface LinkedEditingRangeFeatureShape {
    /**
     * Installs a handler for the linked editing range request.
     *
     * @param handler The corresponding handler.
     */
    onLinkedEditingRange(handler: ServerRequestHandler<LinkedEditingRangeParams, LinkedEditingRanges | undefined | null, never, never>): Disposable;
}
export declare const LinkedEditingRangeFeature: Feature<_Languages, LinkedEditingRangeFeatureShape>;
