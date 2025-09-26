import { MonikerParams, Moniker, Disposable } from 'vscode-languageserver-protocol';
import type { Feature, _Languages, ServerRequestHandler } from './server';
/**
 * Shape of the moniker feature
 *
 * @since 3.16.0
 */
export interface MonikerFeatureShape {
    moniker: {
        on(handler: ServerRequestHandler<MonikerParams, Moniker[] | null, Moniker[], void>): Disposable;
    };
}
export declare const MonikerFeature: Feature<_Languages, MonikerFeatureShape>;
