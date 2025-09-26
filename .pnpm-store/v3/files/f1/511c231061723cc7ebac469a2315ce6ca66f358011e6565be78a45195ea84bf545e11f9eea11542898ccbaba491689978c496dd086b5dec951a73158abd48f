import { type editor, type IDisposable, type languages, type MonacoEditor } from 'monaco-types';
export interface MarkerDataProvider {
    /**
     * The owner of the model markers.
     *
     * This should be a unique string that identifies the context of who owns the marker data.
     */
    owner: string;
    /**
     * Provide marker data for the given model.
     *
     * @param model
     *   The model to provide marker data for.
     * @returns
     *   The new marker data for the model.
     */
    provideMarkerData: (model: editor.ITextModel) => languages.ProviderResult<editor.IMarkerData[]>;
    /**
     * Reset the state for a model.
     *
     * @param model
     *   The model to reset the state for.
     */
    doReset?: (model: editor.ITextModel) => unknown;
}
export interface MarkerDataProviderInstance extends IDisposable {
    /**
     * Revalidate all models.
     */
    revalidate: () => Promise<undefined>;
}
/**
 * Register a marker data provider that can provide marker data for a model.
 *
 * @param monaco
 *   The Monaco editor module.
 * @param languageSelector
 *   The language id to register the provider for.
 * @param provider
 *   The provider that can provide marker data.
 * @returns
 *   A disposable.
 */
export declare function registerMarkerDataProvider(monaco: Pick<MonacoEditor, 'editor'>, languageSelector: string[] | string, provider: MarkerDataProvider): MarkerDataProviderInstance;
//# sourceMappingURL=monaco-marker-data-provider.d.ts.map