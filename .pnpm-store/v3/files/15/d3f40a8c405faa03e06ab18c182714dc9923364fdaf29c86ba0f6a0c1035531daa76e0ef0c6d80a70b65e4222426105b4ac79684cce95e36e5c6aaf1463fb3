import React, { JSX } from 'react';
import { AutocompleteState, AutocompleteOptions } from '@algolia/autocomplete-core';
import { SearchParamsObject, LiteClient } from 'algoliasearch/lite';

type ContentType = 'askAI' | 'content' | 'lvl0' | 'lvl1' | 'lvl2' | 'lvl3' | 'lvl4' | 'lvl5' | 'lvl6';
interface DocSearchHitAttributeHighlightResult {
    value: string;
    matchLevel: 'full' | 'none' | 'partial';
    matchedWords: string[];
    fullyHighlighted?: boolean;
}
interface DocSearchHitHighlightResultHierarchy {
    lvl0: DocSearchHitAttributeHighlightResult;
    lvl1: DocSearchHitAttributeHighlightResult;
    lvl2: DocSearchHitAttributeHighlightResult;
    lvl3: DocSearchHitAttributeHighlightResult;
    lvl4: DocSearchHitAttributeHighlightResult;
    lvl5: DocSearchHitAttributeHighlightResult;
    lvl6: DocSearchHitAttributeHighlightResult;
}
interface DocSearchHitHighlightResult {
    content: DocSearchHitAttributeHighlightResult;
    hierarchy: DocSearchHitHighlightResultHierarchy;
    hierarchy_camel: DocSearchHitHighlightResultHierarchy[];
}
interface DocSearchHitAttributeSnippetResult {
    value: string;
    matchLevel: 'full' | 'none' | 'partial';
}
interface DocSearchHitSnippetResult {
    content: DocSearchHitAttributeSnippetResult;
    hierarchy: DocSearchHitHighlightResultHierarchy;
    hierarchy_camel: DocSearchHitHighlightResultHierarchy[];
}
declare type DocSearchHit = {
    objectID: string;
    content: string | null;
    query?: string;
    url: string;
    url_without_anchor: string;
    type: ContentType;
    anchor: string | null;
    hierarchy: {
        lvl0: string;
        lvl1: string;
        lvl2: string | null;
        lvl3: string | null;
        lvl4: string | null;
        lvl5: string | null;
        lvl6: string | null;
    };
    _highlightResult: DocSearchHitHighlightResult;
    _snippetResult: DocSearchHitSnippetResult;
    _rankingInfo?: {
        promoted: boolean;
        nbTypos: number;
        firstMatchedWord: number;
        proximityDistance?: number;
        geoDistance: number;
        geoPrecision?: number;
        nbExactWords: number;
        words: number;
        filters: number;
        userScore: number;
        matchedGeoLocation?: {
            lat: number;
            lng: number;
            distance: number;
        };
    };
    _distinctSeqID?: number;
    __autocomplete_indexName?: string;
    __autocomplete_queryID?: string;
    __autocomplete_algoliaCredentials?: {
        appId: string;
        apiKey: string;
    };
    __autocomplete_id?: number;
};

type DocSearchTheme = 'dark' | 'light';

type InternalDocSearchHit = DocSearchHit & {
    __docsearch_parent: InternalDocSearchHit | null;
};

interface KeyboardShortcuts {
    /**
     * Enable/disable the Ctrl/Cmd+K shortcut to toggle the search modal.
     *
     * @default true
     */
    'Ctrl/Cmd+K'?: boolean;
    /**
     * Enable/disable the / shortcut to open the search modal.
     *
     * @default true
     */
    '/'?: boolean;
}

type StoredDocSearchHit = Omit<DocSearchHit, '_highlightResult' | '_snippetResult'>;

type ButtonTranslations = Partial<{
    buttonText: string;
    buttonAriaLabel: string;
}>;

type DocSearchTranslations = Partial<{
    button: ButtonTranslations;
    modal: ModalTranslations;
}>;
type DocSearchTransformClient = {
    search: LiteClient['search'];
    addAlgoliaAgent: LiteClient['addAlgoliaAgent'];
    transporter: Pick<LiteClient['transporter'], 'algoliaAgent'>;
};
type DocSearchAskAi = {
    /**
     * The index name to use for the ask AI feature. Your assistant will search this index for relevant documents.
     * If not provided, the index name will be used.
     */
    indexName?: string;
    /**
     * The API key to use for the ask AI feature. Your assistant will use this API key to search the index.
     * If not provided, the API key will be used.
     */
    apiKey?: string;
    /**
     * The app ID to use for the ask AI feature. Your assistant will use this app ID to search the index.
     * If not provided, the app ID will be used.
     */
    appId?: string;
    /**
     * The assistant ID to use for the ask AI feature.
     */
    assistantId: string | null;
    /**
     * The search parameters to use for the ask AI feature.
     */
    searchParameters?: {
        facetFilters?: SearchParamsObject['facetFilters'];
    };
};
interface DocSearchIndex {
    name: string;
    searchParameters?: SearchParamsObject;
}
interface DocSearchProps {
    /**
     * Algolia application id used by the search client.
     */
    appId: string;
    /**
     * Public api key with search permissions for the index.
     */
    apiKey: string;
    /**
     * Name of the algolia index to query.
     *
     * @deprecated `indexName` will be removed in a future version. Please use `indices` property going forward.
     */
    indexName?: string;
    /**
     * List of indices and _optional_ searchParameters to be used for search.
     *
     * @see {@link https://docsearch.algolia.com/docs/api#indices}
     */
    indices?: Array<DocSearchIndex | string>;
    /**
     * Configuration or assistant id to enable ask ai mode. Pass a string assistant id or a full config object.
     */
    askAi?: DocSearchAskAi | string;
    /**
     * Theme overrides applied to the modal and related components.
     */
    theme?: DocSearchTheme;
    /**
     * Placeholder text for the search input.
     */
    placeholder?: string;
    /**
     * Additional algolia search parameters to merge into each query.
     *
     * @deprecated `searchParameters` will be removed in a future version. Please use `indices` property going forward.
     */
    searchParameters?: SearchParamsObject;
    /**
     * Maximum number of hits to display per source/group.
     */
    maxResultsPerGroup?: number;
    /**
     * Hook to post-process hits before rendering.
     */
    transformItems?: (items: DocSearchHit[]) => DocSearchHit[];
    /**
     * Custom component to render an individual hit.
     */
    hitComponent?: (props: {
        hit: InternalDocSearchHit | StoredDocSearchHit;
        children: React.ReactNode;
    }) => JSX.Element;
    /**
     * Custom component rendered at the bottom of the results panel.
     */
    resultsFooterComponent?: (props: {
        state: AutocompleteState<InternalDocSearchHit>;
    }) => JSX.Element | null;
    /**
     * Hook to wrap or modify the algolia search client.
     */
    transformSearchClient?: (searchClient: DocSearchTransformClient) => DocSearchTransformClient;
    /**
     * Disable storage and usage of recent and favorite searches.
     */
    disableUserPersonalization?: boolean;
    /**
     * Query string to prefill when opening the modal.
     */
    initialQuery?: string;
    /**
     * Custom navigator for controlling link navigation.
     */
    navigator?: AutocompleteOptions<InternalDocSearchHit>['navigator'];
    /**
     * Localized strings for the button and modal ui.
     */
    translations?: DocSearchTranslations;
    /**
     * Builds a url to report missing results for a given query.
     */
    getMissingResultsUrl?: ({ query }: {
        query: string;
    }) => string;
    /**
     * Insights client integration options to send analytics events.
     */
    insights?: AutocompleteOptions<InternalDocSearchHit>['insights'];
    /**
     * The container element where the modal should be portaled to. Defaults to document.body.
     */
    portalContainer?: DocumentFragment | Element;
    /**
     * Limit of how many recent searches should be saved/displayed..
     *
     * @default 7
     */
    recentSearchesLimit?: number;
    /**
     * Limit of how many recent searches should be saved/displayed when there are favorited searches..
     *
     * @default 4
     */
    recentSearchesWithFavoritesLimit?: number;
    /**
     * Configuration for keyboard shortcuts. Allows enabling/disabling specific shortcuts.
     */
    keyboardShortcuts?: KeyboardShortcuts;
}

type FooterTranslations = Partial<{
    selectText: string;
    submitQuestionText: string;
    selectKeyAriaLabel: string;
    navigateText: string;
    navigateUpKeyAriaLabel: string;
    navigateDownKeyAriaLabel: string;
    closeText: string;
    backToSearchText: string;
    closeKeyAriaLabel: string;
    poweredByText: string;
}>;

type AskAiScreenTranslations = Partial<{
    disclaimerText: string;
    relatedSourcesText: string;
    thinkingText: string;
    copyButtonText: string;
    copyButtonCopiedText: string;
    copyButtonTitle: string;
    likeButtonTitle: string;
    dislikeButtonTitle: string;
    thanksForFeedbackText: string;
    preToolCallText: string;
    duringToolCallText: string;
    afterToolCallText: string;
    /**
     * Build the full jsx element for the aggregated search block.
     * If provided, completely overrides the default english renderer.
     */
    aggregatedToolCallNode?: (queries: string[], onSearchQueryClick: (query: string) => void) => React.ReactNode;
    /**
     * Generate the list connective parts only (backwards compatibility).
     * Receives full list of queries and should return translation parts for before/after/separators.
     * Example: (qs) => ({ before: 'searched for ', separator: ', ', lastSeparator: ' and ', after: '' }).
     */
    aggregatedToolCallText?: (queries: string[]) => {
        before?: string;
        separator?: string;
        lastSeparator?: string;
        after?: string;
    };
}>;

type ErrorScreenTranslations = Partial<{
    titleText: string;
    helpText: string;
}>;

type NoResultsScreenTranslations = Partial<{
    noResultsText: string;
    suggestedQueryText: string;
    reportMissingResultsText: string;
    reportMissingResultsLinkText: string;
}>;

type ResultsScreenTranslations = Partial<{
    askAiPlaceholder: string;
}>;

type StartScreenTranslations = Partial<{
    recentSearchesTitle: string;
    noRecentSearchesText: string;
    saveRecentSearchButtonTitle: string;
    removeRecentSearchButtonTitle: string;
    favoriteSearchesTitle: string;
    removeFavoriteSearchButtonTitle: string;
    recentConversationsTitle: string;
    removeRecentConversationButtonTitle: string;
}>;

type ScreenStateTranslations = Partial<{
    errorScreen: ErrorScreenTranslations;
    startScreen: StartScreenTranslations;
    noResultsScreen: NoResultsScreenTranslations;
    resultsScreen: ResultsScreenTranslations;
    askAiScreen: AskAiScreenTranslations;
}>;

type SearchBoxTranslations = Partial<{
    clearButtonTitle: string;
    clearButtonAriaLabel: string;
    closeButtonText: string;
    closeButtonAriaLabel: string;
    placeholderText: string;
    placeholderTextAskAi: string;
    placeholderTextAskAiStreaming: string;
    enterKeyHint: string;
    enterKeyHintAskAi: string;
    searchInputLabel: string;
    backToKeywordSearchButtonText: string;
    backToKeywordSearchButtonAriaLabel: string;
}>;

type ModalTranslations = Partial<{
    searchBox: SearchBoxTranslations;
    footer: FooterTranslations;
}> & ScreenStateTranslations;
type DocSearchModalProps = DocSearchProps & {
    initialScrollY: number;
    onAskAiToggle: (toggle: boolean) => void;
    onClose?: () => void;
    isAskAiActive?: boolean;
    canHandleAskAi?: boolean;
    translations?: ModalTranslations;
};
declare function DocSearchModal({ appId, apiKey, placeholder, askAi, maxResultsPerGroup, theme, onClose, transformItems, hitComponent, resultsFooterComponent, navigator, initialScrollY, transformSearchClient, disableUserPersonalization, initialQuery: initialQueryFromProp, translations, getMissingResultsUrl, insights, onAskAiToggle, isAskAiActive, canHandleAskAi, recentSearchesLimit, recentSearchesWithFavoritesLimit, indices, indexName, searchParameters, }: DocSearchModalProps): JSX.Element;

export { DocSearchModal };
export type { DocSearchModalProps, ModalTranslations };
