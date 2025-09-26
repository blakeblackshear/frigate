import { InlayHint, InlayHintParams, Disposable, RequestHandler } from 'vscode-languageserver-protocol';
import type { Feature, _Languages, ServerRequestHandler } from './server';
/**
 * Shape of the inlay hints feature
 *
 * @since 3.17.0
 */
export interface InlayHintFeatureShape {
    inlayHint: {
        /**
         * Ask the client to refresh all inlay hints.
         */
        refresh(): Promise<void>;
        /**
         * Installs a handler for the inlay hints request.
         *
         * @param handler The corresponding handler.
         */
        on(handler: ServerRequestHandler<InlayHintParams, InlayHint[] | undefined | null, InlayHint[], void>): Disposable;
        /**
         * Installs a handler for the inlay hint resolve request.
         *
         * @param handler The corresponding handler.
         */
        resolve(handler: RequestHandler<InlayHint, InlayHint, void>): Disposable;
    };
}
export declare const InlayHintFeature: Feature<_Languages, InlayHintFeatureShape>;
