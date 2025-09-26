import React, { Component, RefObject } from "react";
export interface SearchBarProps {
    /**
     * If true, adds up and down arrows to search bar to jump
     * to the next and previous result. The down arrow calls
     * "onEnter" and the up arrow calls "onShiftEnter"
     * Defaults to false, which does not add the arrows.
     */
    enableSearchNavigation?: boolean | undefined;
    /**
     * If true, capture system hotkeys for searching the page (Cmd-F, Ctrl-F,
     * etc.)
     */
    enableHotKeys?: boolean | undefined;
    /**
     * The current result the browser search is highlighting.
     * Only applicable if searchLikeBrowser is true.
     * Defaults to 0.
     */
    currentResultsPosition: number;
    /**
     * If true, the input field and filter button will be disabled.
     */
    disabled?: boolean | undefined;
    /**
     * If true, then only lines that match the search term will be displayed.
     */
    filterActive: boolean;
    /**
     * Icon for the Filter Lines button in the Search Bar. Defaults to FilterLineIcon SVG.
     */
    iconFilterLines?: React.ReactNode;
    /**
     * Icon for the Find Next button in the Search Bar. Defaults to ArrowDownIcon SVG.
     */
    iconFindNext?: React.ReactNode;
    /**
     * Icon for the Find Previous button in the Search Bar. Defaults to ArrowUpIcon SVG.
     */
    iconFindPrevious?: React.ReactNode;
    /**
     * Executes a function when the search input has been cleared.
     */
    onClearSearch?: (() => void) | undefined;
    /**
     * Executes a function when the option `Filter Lines With Matches`
     * is enable.
     */
    onFilterLinesWithMatches: ((isFiltered: boolean) => void) | undefined;
    /**
     * Executes a function when the user starts typing.
     */
    onSearch?: (keyword: string) => void;
    /**
     * Exectues a function when enter is pressed.
     */
    onEnter: (e: React.UIEvent<HTMLElement>) => void;
    /**
     * Exectues a function when shift + enter is pressed.
     */
    onShiftEnter: (e: React.UIEvent<HTMLElement>) => void;
    /**
     * Number of search results. Should come from the component
     * executing the search algorithm.
     */
    resultsCount?: number | undefined;
    /**
     * Minimum number of characters to trigger a search. Defaults to 2.
     */
    searchMinCharacters?: number;
}
type SearchBarState = {
    keywords?: string;
};
export default class SearchBar extends Component<SearchBarProps, SearchBarState> {
    static defaultProps: {
        currentResultsPosition: number;
        disabled: boolean;
        enableHotKeys: boolean;
        filterActive: boolean;
        onClearSearch: () => void;
        onFilterLinesWithMatches: () => void;
        onSearch: () => void;
        resultsCount: number;
        searchMinCharacters: number;
    };
    state: SearchBarState;
    inputRef: RefObject<HTMLInputElement | null>;
    constructor(props: any);
    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFilterToggle: () => void;
    handleKeyPress: (e: React.KeyboardEvent<HTMLElement>) => void;
    handleSearchHotkey: (e: KeyboardEvent) => void;
    search: () => void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): React.JSX.Element;
}
export {};
