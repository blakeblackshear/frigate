import { List } from "immutable";
import React, { CSSProperties, Component, ReactNode } from "react";
import { VListHandle } from "virtua";
import SearchBar from "../SearchBar";
export interface WebsocketOptions {
    /**
     * Callback when the socket is opened
     */
    onOpen?: ((e: Event, socket: WebSocket) => void) | undefined;
    /**
     * Callback when the socket is closed
     */
    onClose?: ((e: CloseEvent) => void) | undefined;
    /**
     * Callback when the socket has an error
     */
    onError?: ((e: Event) => void) | undefined;
    /**
     * Callback which formats the websocket data stream.
     */
    formatMessage?: ((message: any) => string) | undefined;
    /**
     * Set to true, to reconnect the WebSocket automatically.
     */
    reconnect?: boolean;
    /**
     * Set the time to wait between reconnects in seconds.
     * Default is 1s
     */
    reconnectWait?: number;
    /**
     * List of protocols to be passed to the WebSocket constructor as the second argument.
     */
    protocols?: string | string[] | undefined;
}
export interface EventSourceOptions {
    /**
     * Boolean indicating if CORS should be set to include credentials
     */
    withCredentials?: boolean;
    /**
     * Callback when the eventsource is opened
     */
    onOpen?: ((e: Event, eventSource: EventSource) => void) | undefined;
    /**
     * Callback when the eventsource is closed
     */
    onClose?: ((e: Event) => void) | undefined;
    /**
     * Callback when the eventsource has an error
     */
    onError?: ((e: Event) => void) | undefined;
    /**
     * Callback which formats the eventsource data stream.
     */
    formatMessage?: ((message: any) => string) | undefined;
    /**
     * Set to true, to reconnect the EventSource automatically.
     */
    reconnect?: boolean;
    /**
     * Set the time to wait between reconnects in seconds.
     * Default is 1s
     */
    reconnectWait?: number;
}
export interface ErrorStatus extends Error {
    /**
     * Status code
     */
    status?: number;
}
export interface LineNumberClickEvent {
    lineNumber: number;
    highlightRange?: Immutable.Seq.Indexed<number>;
}
/**
 * React component that loads and views remote text in the browser lazily and efficiently.
 */
export interface LazyLogProps {
    /**
     * Flag to enable/disable case insensitive search
     */
    caseInsensitive?: boolean;
    /**
     * Optional custom inline style to attach to element which contains
     * the interior scrolling container.
     */
    containerStyle?: CSSProperties;
    /**
     * If true, capture system hotkeys for searching the page (Cmd-F, Ctrl-F,
     * etc.)
     */
    enableHotKeys?: boolean;
    /**
     * Enable the line gutters to be displayed. Default is false
     */
    enableGutters?: boolean;
    /**
     * Enable the line numbers to be displayed. Default is true.
     */
    enableLineNumbers?: boolean;
    /**
     * Enable hyperlinks to be discovered in log text and made clickable links. Default is false.
     */
    enableLinks?: boolean;
    /**
     * Enable the search feature.
     */
    enableSearch?: boolean;
    /**
     * If true, search like a browser search - enter jumps to the next line
     * with the searched term, shift + enter goes backwards.
     * Also adds up and down arrows to search bar to jump
     * to the next and previous result.
     * If false, enter toggles the filter instead.
     * Defaults to true.
     */
    enableSearchNavigation?: boolean;
    /**
     * Enable the ability to select multiple lines using shift + click.
     * Defaults to true.
     */
    enableMultilineHighlight?: boolean;
    /**
     * Number of extra lines to show at the bottom of the log.
     * Set this to 1 so that Linux users can see the last line
     * of the log output.
     */
    extraLines?: number;
    /**
     * Options object which will be passed through to the `fetch` request.
     * Defaults to `{ credentials: 'omit' }`.
     */
    fetchOptions?: RequestInit;
    /**
     * Scroll to the end of the component after each update to the content.
     * Cannot be used in combination with `scrollToLine`.
     */
    follow?: boolean;
    /**
     * Execute a function against each string part of a line,
     * returning a new line part. Is passed a single argument which is
     * the string part to manipulate, should return a new string
     * with the manipulation completed.
     */
    formatPart?: (text: string) => ReactNode;
    /**
     * The Line Gutter component
     */
    gutter?: React.ReactNode[];
    /**
     * Set the height in pixels for the component.
     * Defaults to `'auto'` if unspecified. When the `height` is `'auto'`,
     * the component will expand vertically to fill its container.
     */
    height?: string | number;
    /**
     * Line number (e.g. `highlight={10}`) or line number range to highlight
     * inclusively (e.g. `highlight={[5, 10]}` highlights lines 5-10).
     * This is 1-indexed, i.e. line numbers start at `1`.
     */
    highlight?: number | number[];
    /**
     * Specify an additional className to append to highlighted lines.
     */
    highlightLineClassName?: string;
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
     * Specify an additional className to append to lines.
     */
    lineClassName?: string;
    /**
     * Manually display the loading component
     */
    loading?: boolean;
    /**
     * Specify an alternate component to use when loading.
     */
    loadingComponent?: React.ReactNode;
    /**
     * Execute a function if the provided `url` has encountered an error
     * during loading.
     */
    onError?: (error: any) => any;
    /**
     * Execute a function when the highlighted range has changed.
     * Is passed a single argument which is an `Immutable.Range`
     * of the highlighted line numbers.
     */
    onHighlight?: (range: Immutable.Seq.Indexed<number>) => any;
    /**
     * Execute a function if/when the provided `url` has completed loading.
     */
    onLoad?: () => any;
    /**
     * Additional function called when a line number is clicked.
     * On click, the line will always be highlighted.
     * This function is to provide additional actions.
     * Receives an object with lineNumber and highlightRange.
     * Defaults to null.
     */
    onLineNumberClick?: (event: LineNumberClickEvent) => any;
    /**
     * Callback to invoke on click of line contents.
     * @param {React.MouseEvent<HTMLElement>} event - Browser event.
     */
    onLineContentClick?(event: React.MouseEvent<HTMLSpanElement>): void;
    /**
     * Callback to invoke on user scroll. Args matches the ScrollFollow onScroll callback.
     * @param args
     */
    onScroll?(args: {
        scrollTop: number;
        scrollHeight: number;
        clientHeight: number;
    }): void;
    /**
     * Number of rows to render above/below the visible bounds of the list.
     * This can help reduce flickering during scrolling on
     * certain browsers/devices. Defaults to `100`.
     */
    overscanRowCount?: number;
    /**
     * A fixed row height in pixels. Controls how tall a line is,
     * as well as the `lineHeight` style of the line's text.
     * Defaults to `19`.
     */
    rowHeight?: number;
    /**
     * Scroll to a particular line number once it has loaded.
     * This is 1-indexed, i.e. line numbers start at `1`.
     * Cannot be used in combination with `follow`.
     */
    scrollToLine?: number;
    /**
     * Minimum number of characters to trigger a search. Defaults to 2.
     */
    searchMinCharacters?: number;
    /**
     * Make the text selectable, allowing to copy & paste. Defaults to `false`.
     */
    selectableLines?: boolean;
    /**
     * Set to `true` to specify remote URL will be streaming chunked data.
     * Defaults to `false` to download data until completion.
     */
    stream?: boolean;
    /**
     * Optional custom inline style to attach to root
     * virtual `LazyList` element.
     */
    style?: CSSProperties;
    /**
     * String containing text to display.
     */
    text?: string;
    /**
     * The URL from which to fetch content. Subject to same-origin policy,
     * so must be accessible via fetch on same domain or via CORS.
     */
    url?: string;
    /**
     * Set to `true` to specify that url is a websocket URL.
     * Defaults to `false` to download data until completion.
     */
    websocket?: boolean;
    /**
     * Options object which will be passed through to websocket.
     */
    websocketOptions?: WebsocketOptions;
    /**
     * Set to `true` to specify that url is an eventsource URL.
     * Defaults to `false` to download data until completion.
     */
    eventsource?: boolean;
    /**
     * Options object which will be passed through to evensource.
     */
    eventsourceOptions?: EventSourceOptions;
    /**
     * Set the width in pixels for the component.
     * Defaults to `'auto'` if unspecified.
     * When the `width` is `'auto'`, the component will expand
     * horizontally to fill its container.
     */
    width?: string | number;
    /**
     * Wrap overflowing lines. Default is false
     */
    wrapLines?: boolean;
    /**
     * Set to `true` to specify that parent component will be calling `appendLines` to update data.
     * Parent component should hold a ref (with `useRef` or `createRef`) to the `LazyLog` component.
     * Defaults to `false`.
     */
    external?: boolean;
}
type LazyLogState = {
    count: number;
    currentResultsPosition: number;
    error?: ErrorStatus;
    filteredLines?: List<Uint8Array>;
    highlight?: Immutable.Seq.Indexed<number>;
    isFilteringLinesWithMatches: boolean;
    isSearching: boolean;
    lines: List<Uint8Array>;
    loaded?: boolean;
    offset: number;
    resultLineUniqueIndexes: number[];
    resultLines: number[];
    scrollOffset: number;
    scrollToIndex: number;
    scrollToLine: number;
    searchKeywords?: string;
    text?: string;
    url?: string;
};
/**
 * React component that loads and views remote text in the browser lazily and efficiently.
 * Logs can be loaded from static text, a URL, or a WebSocket and including ANSI highlighting.
 */
export default class LazyLog extends Component<LazyLogProps, LazyLogState> {
    static defaultProps: any;
    static getDerivedStateFromProps({ highlight, follow, scrollToLine, url: nextUrl, text: nextText, }: LazyLogProps, { count, offset, url: previousUrl, text: previousText, highlight: previousHighlight, isSearching, scrollToIndex, }: LazyLogState): {
        url?: string | undefined;
        text?: string | undefined;
        lines?: List<unknown> | undefined;
        count?: number | undefined;
        offset?: number | undefined;
        loaded?: boolean | undefined;
        error?: null | undefined;
        scrollToIndex: number;
        highlight: import("immutable").Seq.Indexed<number>;
    };
    state: LazyLogState;
    emitter: any;
    encodedLog: Uint8Array | undefined;
    searchBarRef: React.RefObject<SearchBar | null>;
    listRef: React.RefObject<VListHandle | null>;
    componentDidMount(): void;
    /**
     * Lifecycle method called after component updates. Handles various side effects and updates based on prop/state changes.
     * @param prevProps - Previous props before update
     * @param prevState - Previous state before update
     */
    componentDidUpdate(prevProps: LazyLogProps, prevState: LazyLogState): void;
    componentWillUnmount(): void;
    initEmitter(): import("mitt").Emitter<Record<import("mitt").EventType, unknown>>;
    request(): void;
    endRequest(): void;
    appendLines(newLines: string[]): void;
    handleUpdate: ({ lines: moreLines, encodedLog }: any) => void;
    handleEnd: (encodedLog: Uint8Array) => void;
    handleError: (err: ErrorStatus) => void;
    handleHighlight: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => import("immutable").Seq.Indexed<number> | undefined;
    handleScrollToLine(scrollToLine?: number): void;
    handleEnterPressed: () => void;
    handleShiftEnterPressed: () => void;
    handleSearch: (keywords: string | undefined) => void;
    forceSearch: () => void;
    handleClearSearch: () => void;
    handleFilterLinesWithMatches: (isFilterEnabled: boolean) => void;
    filterLinesWithMatches: () => void;
    handleFormatPart: (lineNumber: number) => ((part: any) => any) | ((text: string) => React.ReactNode) | undefined;
    renderError(): React.JSX.Element;
    renderRow: (options: {
        index: number;
    }) => string | number | bigint | true | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | React.JSX.Element | undefined;
    renderNoRows: () => string | number | bigint | true | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | React.JSX.Element;
    calculateListHeight: (useCSSStyle?: boolean) => string | number;
    getItemSize: (index: number) => number;
    /**
     * Clears the log and search
     */
    clear(): void;
    render(): React.JSX.Element;
}
export {};
