import { VNode } from './AutocompleteRenderer';
import { HighlightHitParams } from './HighlightHitParams';
declare type AutocompleteHighlightComponent = <THit>({ hit, attribute, tagName, }: HighlightHitParams<THit>) => VNode<any>;
export declare type PublicAutocompleteComponents = Record<string, (props: any) => VNode<any>>;
export interface AutocompleteComponents extends PublicAutocompleteComponents {
    /**
     * Highlight matches in an Algolia hit.
     */
    Highlight: AutocompleteHighlightComponent;
    /**
     * Reverse-highlight matches in an Algolia hit.
     */
    ReverseHighlight: AutocompleteHighlightComponent;
    /**
     * Reverse-highlight and snippets matches in an Algolia hit.
     */
    ReverseSnippet: AutocompleteHighlightComponent;
    /**
     * Highlight and snippet matches in an Algolia hit.
     */
    Snippet: AutocompleteHighlightComponent;
}
export {};
