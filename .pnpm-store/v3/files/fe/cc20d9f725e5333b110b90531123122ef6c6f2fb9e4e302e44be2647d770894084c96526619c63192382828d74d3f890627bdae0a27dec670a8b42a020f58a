import type { InternalAutocompleteOptions } from '../types';
import { CancelablePromiseList } from './createCancelablePromiseList';
/**
 * If a plugin is configured to await a submit event, this returns a promise
 * for either the max timeout value found or until it completes.
 * Otherwise, return undefined.
 */
export declare const getPluginSubmitPromise: (plugins: InternalAutocompleteOptions<any>['plugins'], pendingRequests: CancelablePromiseList<void>) => Promise<void> | undefined;
