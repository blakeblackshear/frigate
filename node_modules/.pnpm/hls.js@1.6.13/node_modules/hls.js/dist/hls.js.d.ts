export declare interface AbrComponentAPI extends ComponentAPI {
    firstAutoLevel: number;
    forcedAutoLevel: number;
    nextAutoLevel: number;
    readonly bwEstimator?: EwmaBandWidthEstimator;
    resetEstimator(abrEwmaDefaultEstimate: number): any;
}

export declare class AbrController extends Logger implements AbrComponentAPI {
    protected hls: Hls;
    private lastLevelLoadSec;
    private lastLoadedFragLevel;
    private firstSelection;
    private _nextAutoLevel;
    private nextAutoLevelKey;
    private audioTracksByGroup;
    private codecTiers;
    private timer;
    private fragCurrent;
    private partCurrent;
    private bitrateTestDelay;
    private rebufferNotice;
    private supportedCache;
    bwEstimator: EwmaBandWidthEstimator;
    constructor(hls: Hls);
    resetEstimator(abrEwmaDefaultEstimate?: number): void;
    private initEstimator;
    protected registerListeners(): void;
    protected unregisterListeners(): void;
    destroy(): void;
    protected onManifestLoading(event: Events.MANIFEST_LOADING, data: ManifestLoadingData): void;
    private onLevelsUpdated;
    private onMaxAutoLevelUpdated;
    protected onFragLoading(event: Events.FRAG_LOADING, data: FragLoadingData): void;
    protected onLevelSwitching(event: Events.LEVEL_SWITCHING, data: LevelSwitchingData): void;
    protected onError(event: Events.ERROR, data: ErrorData): void;
    private getTimeToLoadFrag;
    protected onLevelLoaded(event: Events.LEVEL_LOADED, data: LevelLoadedData): void;
    private _abandonRulesCheck;
    protected onFragLoaded(event: Events.FRAG_LOADED, { frag, part }: FragLoadedData): void;
    protected onFragBuffered(event: Events.FRAG_BUFFERED, data: FragBufferedData): void;
    private ignoreFragment;
    clearTimer(): void;
    get firstAutoLevel(): number;
    get forcedAutoLevel(): number;
    get nextAutoLevel(): number;
    private getAutoLevelKey;
    private getNextABRAutoLevel;
    private getStarvationDelay;
    private getBwEstimate;
    private findBestLevel;
    set nextAutoLevel(nextLevel: number);
    protected deriveNextAutoLevel(nextLevel: number): number;
}

export declare type ABRControllerConfig = {
    abrEwmaFastLive: number;
    abrEwmaSlowLive: number;
    abrEwmaFastVoD: number;
    abrEwmaSlowVoD: number;
    /**
     * Default bandwidth estimate in bits/s prior to collecting fragment bandwidth samples
     */
    abrEwmaDefaultEstimate: number;
    abrEwmaDefaultEstimateMax: number;
    abrBandWidthFactor: number;
    abrBandWidthUpFactor: number;
    abrMaxWithRealBitrate: boolean;
    maxStarvationDelay: number;
    maxLoadingDelay: number;
};

export declare type AssetListJSON = {
    ASSETS: Array<{
        URI: string;
        DURATION: string;
    }>;
};

export declare interface AssetListLoadedData {
    event: InterstitialEventWithAssetList;
    assetListResponse: AssetListJSON;
    networkDetails: any;
}

export declare interface AssetListLoadingData {
    event: InterstitialEventWithAssetList;
}

export declare type AttachMediaSourceData = {
    media: HTMLMediaElement;
    mediaSource: MediaSource | null;
    tracks: SourceBufferTrackSet;
};

export declare class AttrList {
    [key: string]: any;
    constructor(attrs: string | Record<string, any>, parsed?: Pick<ParsedMultivariantPlaylist | LevelDetails, 'variableList' | 'hasVariableRefs' | 'playlistParsingError'>);
    get clientAttrs(): string[];
    decimalInteger(attrName: string): number;
    hexadecimalInteger(attrName: string): Uint8Array<ArrayBuffer> | null;
    hexadecimalIntegerAsNumber(attrName: string): number;
    decimalFloatingPoint(attrName: string): number;
    optionalFloat(attrName: string, defaultValue: number): number;
    enumeratedString(attrName: string): string | undefined;
    enumeratedStringList<T extends {
        [key: string]: boolean;
    }>(attrName: string, dict: T): {
        [key in keyof T]: boolean;
    };
    bool(attrName: string): boolean;
    decimalResolution(attrName: string): {
        width: number;
        height: number;
    } | undefined;
    static parseAttrList(input: string, parsed?: Pick<ParsedMultivariantPlaylist | LevelDetails, 'variableList' | 'hasVariableRefs' | 'playlistParsingError'>): Record<string, string>;
}

export declare type AudioPlaylistType = 'AUDIO';

export declare type AudioSelectionOption = {
    lang?: string;
    assocLang?: string;
    characteristics?: string;
    channels?: string;
    name?: string;
    audioCodec?: string;
    groupId?: string;
    default?: boolean;
};

export declare class AudioStreamController extends BaseStreamController implements NetworkComponentAPI {
    private mainAnchor;
    private mainFragLoading;
    private audioOnly;
    private bufferedTrack;
    private switchingTrack;
    private trackId;
    private waitingData;
    private mainDetails;
    private flushing;
    private bufferFlushed;
    private cachedTrackLoadedData;
    constructor(hls: Hls, fragmentTracker: FragmentTracker, keyLoader: KeyLoader);
    protected onHandlerDestroying(): void;
    private resetItem;
    protected registerListeners(): void;
    protected unregisterListeners(): void;
    onInitPtsFound(event: Events.INIT_PTS_FOUND, { frag, id, initPTS, timescale, trackId }: InitPTSFoundData): void;
    protected getLoadPosition(): number;
    private syncWithAnchor;
    startLoad(startPosition: number, skipSeekToStartPosition?: boolean): void;
    doTick(): void;
    protected resetLoadingState(): void;
    protected onTickEnd(): void;
    private doTickIdle;
    protected onMediaDetaching(event: Events.MEDIA_DETACHING, data: MediaDetachingData): void;
    private onAudioTracksUpdated;
    private onAudioTrackSwitching;
    protected onManifestLoading(): void;
    private onLevelLoaded;
    private onAudioTrackLoaded;
    _handleFragmentLoadProgress(data: FragLoadedData): void;
    protected _handleFragmentLoadComplete(fragLoadedData: FragLoadedData): void;
    private onBufferReset;
    private onBufferCreated;
    private onFragLoading;
    private onFragBuffered;
    protected onError(event: Events.ERROR, data: ErrorData): void;
    private onBufferFlushing;
    private onBufferFlushed;
    private _handleTransmuxComplete;
    private _bufferInitSegment;
    protected loadFragment(frag: Fragment, track: Level, targetBufferTime: number): void;
    private flushAudioIfNeeded;
    private completeAudioSwitch;
}

export declare class AudioTrackController extends BasePlaylistController {
    private tracks;
    private groupIds;
    private tracksInGroup;
    private trackId;
    private currentTrack;
    private selectDefaultTrack;
    constructor(hls: Hls);
    private registerListeners;
    private unregisterListeners;
    destroy(): void;
    protected onManifestLoading(): void;
    protected onManifestParsed(event: Events.MANIFEST_PARSED, data: ManifestParsedData): void;
    protected onAudioTrackLoaded(event: Events.AUDIO_TRACK_LOADED, data: AudioTrackLoadedData): void;
    protected onLevelLoading(event: Events.LEVEL_LOADING, data: LevelLoadingData): void;
    protected onLevelSwitching(event: Events.LEVEL_SWITCHING, data: LevelSwitchingData): void;
    private switchLevel;
    protected onError(event: Events.ERROR, data: ErrorData): void;
    get allAudioTracks(): MediaPlaylist[];
    get audioTracks(): MediaPlaylist[];
    get audioTrack(): number;
    set audioTrack(newId: number);
    setAudioOption(audioOption: MediaPlaylist | AudioSelectionOption | undefined): MediaPlaylist | null;
    private setAudioTrack;
    private findTrackId;
    protected loadPlaylist(hlsUrlParameters?: HlsUrlParameters): void;
    protected loadingPlaylist(audioTrack: MediaPlaylist, hlsUrlParameters: HlsUrlParameters | undefined): void;
}

export declare interface AudioTrackLoadedData extends TrackLoadedData {
}

export declare interface AudioTracksUpdatedData {
    audioTracks: MediaPlaylist[];
}

export declare interface AudioTrackSwitchedData extends MediaPlaylist {
}

export declare interface AudioTrackSwitchingData extends MediaPlaylist {
}

export declare interface AudioTrackUpdatedData {
    details: LevelDetails;
    id: number;
    groupId: string;
}

export declare interface BackBufferData {
    bufferEnd: number;
}

declare type Base = {
    url: string;
};

export declare type BaseData = {
    url: string;
};

export declare class BasePlaylistController extends Logger implements NetworkComponentAPI {
    protected hls: Hls;
    protected canLoad: boolean;
    private timer;
    constructor(hls: Hls, logPrefix: string);
    destroy(): void;
    private clearTimer;
    startLoad(): void;
    stopLoad(): void;
    protected switchParams(playlistUri: string, previous: LevelDetails | undefined, current: LevelDetails | undefined): HlsUrlParameters | undefined;
    protected loadPlaylist(hlsUrlParameters?: HlsUrlParameters): void;
    protected loadingPlaylist(playlist: Level | MediaPlaylist, hlsUrlParameters?: HlsUrlParameters): void;
    protected shouldLoadPlaylist(playlist: Level | MediaPlaylist | null | undefined): playlist is Level | MediaPlaylist;
    protected getUrlWithDirectives(uri: string, hlsUrlParameters: HlsUrlParameters | undefined): string;
    protected playlistLoaded(index: number, data: LevelLoadedData | AudioTrackLoadedData | TrackLoadedData, previousDetails?: LevelDetails): void;
    protected scheduleLoading(levelOrTrack: Level | MediaPlaylist, deliveryDirectives?: HlsUrlParameters, updatedDetails?: LevelDetails): void;
    private getDeliveryDirectives;
    protected checkRetry(errorEvent: ErrorData): boolean;
}

export declare class BaseSegment {
    private _byteRange;
    private _url;
    private _stats;
    private _streams;
    readonly base: Base;
    relurl?: string;
    constructor(base: Base | string);
    setByteRange(value: string, previous?: BaseSegment): void;
    get baseurl(): string;
    get byteRange(): [number, number] | [];
    get byteRangeStartOffset(): number | undefined;
    get byteRangeEndOffset(): number | undefined;
    get elementaryStreams(): ElementaryStreams;
    set elementaryStreams(value: ElementaryStreams);
    get hasStats(): boolean;
    get hasStreams(): boolean;
    get stats(): LoadStats;
    set stats(value: LoadStats);
    get url(): string;
    set url(value: string);
    clearElementaryStreamInfo(): void;
}

export declare class BaseStreamController extends TaskLoop implements NetworkComponentAPI {
    protected hls: Hls;
    protected fragPrevious: MediaFragment | null;
    protected fragCurrent: Fragment | null;
    protected fragmentTracker: FragmentTracker;
    protected transmuxer: TransmuxerInterface | null;
    protected _state: (typeof State)[keyof typeof State];
    protected playlistType: PlaylistLevelType;
    protected media: HTMLMediaElement | null;
    protected mediaBuffer: Bufferable | null;
    protected config: HlsConfig;
    protected bitrateTest: boolean;
    protected lastCurrentTime: number;
    protected nextLoadPosition: number;
    protected startPosition: number;
    protected startTimeOffset: number | null;
    protected retryDate: number;
    protected levels: Array<Level> | null;
    protected fragmentLoader: FragmentLoader;
    protected keyLoader: KeyLoader;
    protected levelLastLoaded: Level | null;
    protected startFragRequested: boolean;
    protected decrypter: Decrypter;
    protected initPTS: TimestampOffset[];
    protected buffering: boolean;
    protected loadingParts: boolean;
    private loopSn?;
    constructor(hls: Hls, fragmentTracker: FragmentTracker, keyLoader: KeyLoader, logPrefix: string, playlistType: PlaylistLevelType);
    protected registerListeners(): void;
    protected unregisterListeners(): void;
    protected doTick(): void;
    protected onTickEnd(): void;
    startLoad(startPosition: number): void;
    stopLoad(): void;
    get startPositionValue(): number;
    get bufferingEnabled(): boolean;
    pauseBuffering(): void;
    resumeBuffering(): void;
    get inFlightFrag(): InFlightData;
    protected _streamEnded(bufferInfo: BufferInfo, levelDetails: LevelDetails): boolean;
    getLevelDetails(): LevelDetails | undefined;
    protected get timelineOffset(): number;
    protected onMediaAttached(event: Events.MEDIA_ATTACHED, data: MediaAttachedData): void;
    protected onMediaDetaching(event: Events.MEDIA_DETACHING, data: MediaDetachingData): void;
    protected onManifestLoading(): void;
    protected onError(event: Events.ERROR, data: ErrorData): void;
    protected onMediaSeeking: () => void;
    protected onMediaEnded: () => void;
    protected onManifestLoaded(event: Events.MANIFEST_LOADED, data: ManifestLoadedData): void;
    protected onHandlerDestroying(): void;
    protected onHandlerDestroyed(): void;
    protected loadFragment(frag: MediaFragment, level: Level, targetBufferTime: number): void;
    private _loadFragForPlayback;
    protected clearTrackerIfNeeded(frag: Fragment): void;
    protected checkLiveUpdate(details: LevelDetails): void;
    protected waitForLive(levelInfo: Level): boolean | undefined;
    protected flushMainBuffer(startOffset: number, endOffset: number, type?: SourceBufferName | null): void;
    protected _loadInitSegment(fragment: Fragment, level: Level): void;
    private completeInitSegmentLoad;
    protected unhandledEncryptionError(initSegment: InitSegmentData, frag: Fragment): boolean;
    protected fragContextChanged(frag: Fragment | null): boolean;
    protected fragBufferedComplete(frag: Fragment, part: Part | null): void;
    protected _handleFragmentLoadComplete(fragLoadedEndData: PartsLoadedData): void;
    protected _handleFragmentLoadProgress(frag: PartsLoadedData | FragLoadedData): void;
    protected _doFragLoad(frag: Fragment, level: Level, targetBufferTime?: number | null, progressCallback?: FragmentLoadProgressCallback): Promise<PartsLoadedData | FragLoadedData | null>;
    private doFragPartsLoad;
    private handleFragLoadError;
    protected _handleTransmuxerFlush(chunkMeta: ChunkMetadata): void;
    private shouldLoadParts;
    protected getCurrentContext(chunkMeta: ChunkMetadata): {
        frag: MediaFragment;
        part: Part | null;
        level: Level;
    } | null;
    protected bufferFragmentData(data: RemuxedTrack, frag: Fragment, part: Part | null, chunkMeta: ChunkMetadata, noBacktracking?: boolean): void;
    protected flushBufferGap(frag: Fragment): void;
    protected getFwdBufferInfo(bufferable: Bufferable | null, type: PlaylistLevelType): BufferInfo | null;
    protected getFwdBufferInfoAtPos(bufferable: Bufferable | null, pos: number, type: PlaylistLevelType, maxBufferHole: number): BufferInfo | null;
    protected getMaxBufferLength(levelBitrate?: number): number;
    protected reduceMaxBufferLength(threshold: number, fragDuration: number): boolean;
    protected getAppendedFrag(position: number, playlistType?: PlaylistLevelType): Fragment | null;
    protected getNextFragment(pos: number, levelDetails: LevelDetails): Fragment | null;
    protected isLoopLoading(frag: Fragment, targetBufferTime: number): boolean;
    protected getNextFragmentLoopLoading(frag: Fragment, levelDetails: LevelDetails, bufferInfo: BufferInfo, playlistType: PlaylistLevelType, maxBufLen: number): Fragment | null;
    protected get primaryPrefetch(): boolean;
    protected filterReplacedPrimary(frag: MediaFragment | null, details: LevelDetails | undefined): MediaFragment | null;
    mapToInitFragWhenRequired(frag: Fragment | null): typeof frag;
    getNextPart(partList: Part[], frag: Fragment, targetBufferTime: number): number;
    private loadedEndOfParts;
    protected getInitialLiveFragment(levelDetails: LevelDetails): MediaFragment | null;
    protected getFragmentAtPosition(bufferEnd: number, end: number, levelDetails: LevelDetails): MediaFragment | null;
    protected alignPlaylists(details: LevelDetails, previousDetails: LevelDetails | undefined, switchDetails: LevelDetails | undefined): number;
    protected waitForCdnTuneIn(details: LevelDetails): boolean | 0;
    protected setStartPosition(details: LevelDetails, sliding: number): void;
    protected getLoadPosition(): number;
    private handleFragLoadAborted;
    protected resetFragmentLoading(frag: Fragment): void;
    protected onFragmentOrKeyLoadError(filterType: PlaylistLevelType, data: ErrorData): void;
    protected checkRetryDate(): void;
    protected reduceLengthAndFlushBuffer(data: ErrorData): boolean;
    protected resetFragmentErrors(filterType: PlaylistLevelType): void;
    protected afterBufferFlushed(media: Bufferable, bufferType: SourceBufferName, playlistType: PlaylistLevelType): void;
    protected resetLoadingState(): void;
    private resetStartWhenNotLoaded;
    protected resetWhenMissingContext(chunkMeta: ChunkMetadata | Fragment): void;
    protected removeUnbufferedFrags(start?: number): void;
    private updateLevelTiming;
    private playlistLabel;
    private fragInfo;
    private treatAsGap;
    protected resetTransmuxer(): void;
    protected recoverWorkerError(data: ErrorData): void;
    set state(nextState: (typeof State)[keyof typeof State]);
    get state(): (typeof State)[keyof typeof State];
}

export declare interface BaseTrack {
    id: 'audio' | 'main';
    container: string;
    codec?: string;
    supplemental?: string;
    encrypted?: boolean;
    levelCodec?: string;
    pendingCodec?: string;
    metadata?: {
        channelCount?: number;
        width?: number;
        height?: number;
    };
}

export declare type BaseTrackSet = Partial<Record<SourceBufferName, BaseTrack>>;

export declare type Bufferable = {
    buffered: TimeRanges;
};

export declare interface BufferAppendedData {
    type: SourceBufferName;
    frag: Fragment;
    part: Part | null;
    chunkMeta: ChunkMetadata;
    parent: PlaylistLevelType;
    timeRanges: Partial<Record<SourceBufferName, TimeRanges>>;
}

export declare interface BufferAppendingData {
    type: SourceBufferName;
    frag: Fragment;
    part: Part | null;
    chunkMeta: ChunkMetadata;
    offset?: number | undefined;
    parent: PlaylistLevelType;
    data: Uint8Array<ArrayBuffer>;
}

export declare interface BufferCodecsData {
    video?: ParsedTrack;
    audio?: ParsedTrack;
    audiovideo?: ParsedTrack;
    tracks?: BaseTrackSet;
}

export declare class BufferController extends Logger implements ComponentAPI {
    private hls;
    private fragmentTracker;
    private details;
    private _objectUrl;
    private operationQueue;
    private bufferCodecEventsTotal;
    private media;
    private mediaSource;
    private lastMpegAudioChunk;
    private blockedAudioAppend;
    private lastVideoAppendEnd;
    private appendSource;
    private transferData?;
    private overrides?;
    private appendErrors;
    private tracks;
    private sourceBuffers;
    constructor(hls: Hls, fragmentTracker: FragmentTracker);
    hasSourceTypes(): boolean;
    destroy(): void;
    private registerListeners;
    private unregisterListeners;
    transferMedia(): AttachMediaSourceData | null;
    private initTracks;
    private onManifestLoading;
    private onManifestParsed;
    private onMediaAttaching;
    private assignMediaSource;
    private attachTransferred;
    private get mediaSourceOpenOrEnded();
    private _onEndStreaming;
    private _onStartStreaming;
    private onMediaDetaching;
    private onBufferReset;
    private resetBuffer;
    private removeBuffer;
    private resetQueue;
    private onBufferCodecs;
    get sourceBufferTracks(): BaseTrackSet;
    private appendChangeType;
    private blockAudio;
    private unblockAudio;
    private onBufferAppending;
    private getFlushOp;
    private onBufferFlushing;
    private onFragParsed;
    private onFragChanged;
    get bufferedToEnd(): boolean;
    private onBufferEos;
    private tracksEnded;
    private onLevelUpdated;
    private updateDuration;
    private onError;
    private resetAppendErrors;
    private trimBuffers;
    private flushBackBuffer;
    private flushFrontBuffer;
    /**
     * Update Media Source duration to current level duration or override to Infinity if configuration parameter
     * 'liveDurationInfinity` is set to `true`
     * More details: https://github.com/video-dev/hls.js/issues/355
     */
    private getDurationAndRange;
    private updateMediaSource;
    private get tracksReady();
    private checkPendingTracks;
    private bufferCreated;
    private createSourceBuffers;
    private getTrackCodec;
    private trackSourceBuffer;
    private _onMediaSourceOpen;
    private _onMediaSourceClose;
    private _onMediaSourceEnded;
    private _onMediaEmptied;
    private get mediaSrc();
    private onSBUpdateStart;
    private onSBUpdateEnd;
    private onSBUpdateError;
    private updateTimestampOffset;
    private removeExecutor;
    private appendExecutor;
    private blockUntilOpen;
    private isUpdating;
    private isQueued;
    private isPending;
    private blockBuffers;
    private stepOperationQueue;
    private append;
    private appendBlocker;
    private currentOp;
    private executeNext;
    private shiftAndExecuteNext;
    private get pendingTrackCount();
    private get sourceBufferCount();
    private get sourceBufferTypes();
    private addBufferListener;
    private removeBufferListeners;
}

export declare type BufferControllerConfig = {
    appendErrorMaxRetry: number;
    backBufferLength: number;
    frontBufferFlushThreshold: number;
    liveDurationInfinity: boolean;
    /**
     * @deprecated use backBufferLength
     */
    liveBackBufferLength: number | null;
};

export declare interface BufferCreatedData {
    tracks: BufferCreatedTrackSet;
}

export declare interface BufferCreatedTrack extends BaseTrack {
    buffer: ExtendedSourceBuffer;
}

export declare type BufferCreatedTrackSet = Partial<Record<SourceBufferName, BufferCreatedTrack>>;

export declare interface BufferEOSData {
    type?: SourceBufferName;
}

export declare interface BufferFlushedData {
    type: SourceBufferName;
}

export declare interface BufferFlushingData {
    startOffset: number;
    endOffset: number;
    endOffsetSubtitles?: number;
    type: SourceBufferName | null;
}

export declare type BufferInfo = {
    len: number;
    start: number;
    end: number;
    nextStart?: number;
    buffered?: BufferTimeRange[];
    bufferedIndex: number;
};

/**
 * Provides methods dealing with buffer length retrieval for example.
 *
 * In general, a helper around HTML5 MediaElement TimeRanges gathered from `buffered` property.
 *
 * Also @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/buffered
 */
export declare type BufferTimeRange = {
    start: number;
    end: number;
};

export declare class CapLevelController implements ComponentAPI {
    private hls;
    private autoLevelCapping;
    private firstLevel;
    private media;
    private restrictedLevels;
    private timer;
    private clientRect;
    private streamController?;
    constructor(hls: Hls);
    setStreamController(streamController: StreamController): void;
    destroy(): void;
    protected registerListeners(): void;
    protected unregisterListener(): void;
    protected onFpsDropLevelCapping(event: Events.FPS_DROP_LEVEL_CAPPING, data: FPSDropLevelCappingData): void;
    protected onMediaAttaching(event: Events.MEDIA_ATTACHING, data: MediaAttachingData): void;
    protected onManifestParsed(event: Events.MANIFEST_PARSED, data: ManifestParsedData): void;
    private onLevelsUpdated;
    protected onBufferCodecs(event: Events.BUFFER_CODECS, data: BufferCodecsData): void;
    protected onMediaDetaching(): void;
    detectPlayerSize(): void;
    getMaxLevel(capLevelIndex: number): number;
    startCapping(): void;
    stopCapping(): void;
    getDimensions(): {
        width: number;
        height: number;
    };
    get mediaWidth(): number;
    get mediaHeight(): number;
    get contentScaleFactor(): number;
    private isLevelAllowed;
    static getMaxLevelByMediaSize(levels: Array<Level>, width: number, height: number): number;
}

export declare type CapLevelControllerConfig = {
    capLevelToPlayerSize: boolean;
};

/**
 * Keep a CEA-608 screen of 32x15 styled characters
 * @constructor
 */
export declare class CaptionScreen {
    rows: Row[];
    currRow: number;
    nrRollUpRows: number | null;
    lastOutputScreen: CaptionScreen | null;
    logger: CaptionsLogger;
    constructor(logger: CaptionsLogger);
    reset(): void;
    equals(other: CaptionScreen): boolean;
    copy(other: CaptionScreen): void;
    isEmpty(): boolean;
    backSpace(): void;
    clearToEndOfRow(): void;
    /**
     * Insert a character (without styling) in the current row.
     */
    insertChar(char: number): void;
    setPen(styles: Partial<PenStyles>): void;
    moveCursor(relPos: number): void;
    setCursor(absPos: number): void;
    setPAC(pacData: PACData): void;
    /**
     * Set background/extra foreground, but first do back_space, and then insert space (backwards compatibility).
     */
    setBkgData(bkgData: Partial<PenStyles>): void;
    setRollUpRows(nrRows: number | null): void;
    rollUp(): void;
    /**
     * Get all non-empty rows with as unicode text.
     */
    getDisplayText(asOneRow?: boolean): string;
    getTextAndFormat(): Row[];
}

declare class CaptionsLogger {
    time: number | null;
    verboseLevel: VerboseLevel;
    log(severity: VerboseLevel, msg: string | (() => string)): void;
}

export declare class ChunkMetadata {
    readonly level: number;
    readonly sn: number;
    readonly part: number;
    readonly id: number;
    readonly size: number;
    readonly partial: boolean;
    readonly transmuxing: HlsChunkPerformanceTiming;
    readonly buffering: {
        [key in SourceBufferName]: HlsChunkPerformanceTiming;
    };
    constructor(level: number, sn: number, id: number, size?: number, part?: number, partial?: boolean);
}

/**
 * Controller to deal with Common Media Client Data (CMCD)
 * @see https://cdn.cta.tech/cta/media/media/resources/standards/pdfs/cta-5004-final.pdf
 */
export declare class CMCDController implements ComponentAPI {
    private hls;
    private config;
    private media?;
    private sid?;
    private cid?;
    private useHeaders;
    private includeKeys?;
    private initialized;
    private starved;
    private buffering;
    private audioBuffer?;
    private videoBuffer?;
    constructor(hls: Hls);
    private registerListeners;
    private unregisterListeners;
    destroy(): void;
    private onMediaAttached;
    private onMediaDetached;
    private onBufferCreated;
    private onWaiting;
    private onPlaying;
    /**
     * Create baseline CMCD data
     */
    private createData;
    /**
     * Apply CMCD data to a request.
     */
    private apply;
    /**
     * Apply CMCD data to a manifest request.
     */
    private applyPlaylistData;
    /**
     * Apply CMCD data to a segment request
     */
    private applyFragmentData;
    private getNextFrag;
    private getNextPart;
    /**
     * The CMCD object type.
     */
    private getObjectType;
    /**
     * Get the highest bitrate.
     */
    private getTopBandwidth;
    /**
     * Get the buffer length for a media type in milliseconds
     */
    private getBufferLength;
    /**
     * Create a playlist loader
     */
    private createPlaylistLoader;
    /**
     * Create a playlist loader
     */
    private createFragmentLoader;
}

export declare type CMCDControllerConfig = {
    sessionId?: string;
    contentId?: string;
    useHeaders?: boolean;
    includeKeys?: string[];
};

export declare interface CodecsParsed {
    audioCodec?: string;
    videoCodec?: string;
    textCodec?: string;
    unknownCodecs?: string[];
}

export declare interface ComponentAPI {
    destroy(): void;
}

export declare class ContentSteeringController extends Logger implements NetworkComponentAPI {
    private readonly hls;
    private loader;
    private uri;
    private pathwayId;
    private _pathwayPriority;
    private timeToLoad;
    private reloadTimer;
    private updated;
    private started;
    private enabled;
    private levels;
    private audioTracks;
    private subtitleTracks;
    private penalizedPathways;
    constructor(hls: Hls);
    private registerListeners;
    private unregisterListeners;
    pathways(): string[];
    get pathwayPriority(): string[] | null;
    set pathwayPriority(pathwayPriority: string[]);
    startLoad(): void;
    stopLoad(): void;
    clearTimeout(): void;
    destroy(): void;
    removeLevel(levelToRemove: Level): void;
    private onManifestLoading;
    private onManifestLoaded;
    private onManifestParsed;
    private onError;
    filterParsedLevels(levels: Level[]): Level[];
    private getLevelsForPathway;
    private updatePathwayPriority;
    private getPathwayForGroupId;
    private clonePathways;
    private loadSteeringManifest;
    private scheduleRefresh;
}

export declare type ContentSteeringOptions = {
    uri: string;
    pathwayId: string;
};

export declare const Cues: CuesInterface;

export declare interface CuesInterface {
    newCue(track: TextTrack | null, startTime: number, endTime: number, captionScreen: CaptionScreen): VTTCue[];
}

export declare interface CuesParsedData {
    type: 'captions' | 'subtitles';
    cues: any;
    track: string;
}

export declare class DateRange {
    attr: AttrList;
    tagAnchor: MediaFragmentRef | null;
    tagOrder: number;
    private _startDate;
    private _endDate?;
    private _dateAtEnd?;
    private _cue?;
    private _badValueForSameId?;
    constructor(dateRangeAttr: AttrList, dateRangeWithSameId?: DateRange | undefined, tagCount?: number);
    get id(): string;
    get class(): string;
    get cue(): DateRangeCue;
    get startTime(): number;
    get startDate(): Date;
    get endDate(): Date | null;
    get duration(): number | null;
    get plannedDuration(): number | null;
    get endOnNext(): boolean;
    get isInterstitial(): boolean;
    get isValid(): boolean;
}

export declare type DateRangeCue = {
    pre: boolean;
    post: boolean;
    once: boolean;
};

export declare interface DecryptData {
    uri: string;
    method: string;
    keyFormat: string;
    keyFormatVersions: number[];
    iv: Uint8Array<ArrayBuffer> | null;
    key: Uint8Array<ArrayBuffer> | null;
    keyId: Uint8Array<ArrayBuffer> | null;
    pssh: Uint8Array<ArrayBuffer> | null;
    encrypted: boolean;
    isCommonEncryption: boolean;
}

export declare class Decrypter {
    private logEnabled;
    private removePKCS7Padding;
    private subtle;
    private softwareDecrypter;
    private key;
    private fastAesKey;
    private remainderData;
    private currentIV;
    private currentResult;
    private useSoftware;
    private enableSoftwareAES;
    constructor(config: HlsConfig, { removePKCS7Padding }?: {
        removePKCS7Padding?: boolean | undefined;
    });
    destroy(): void;
    isSync(): boolean;
    flush(): Uint8Array<ArrayBuffer> | null;
    reset(): void;
    decrypt(data: Uint8Array | ArrayBuffer, key: ArrayBuffer, iv: ArrayBuffer, aesMode: DecrypterAesMode): Promise<ArrayBuffer>;
    softwareDecrypt(data: Uint8Array, key: ArrayBuffer, iv: ArrayBuffer, aesMode: DecrypterAesMode): ArrayBuffer | null;
    webCryptoDecrypt(data: Uint8Array<ArrayBuffer>, key: ArrayBuffer, iv: ArrayBuffer, aesMode: DecrypterAesMode): Promise<ArrayBuffer>;
    private onWebCryptoError;
    private getValidChunk;
    private logOnce;
}

export declare const enum DecrypterAesMode {
    cbc = 0,
    ctr = 1
}

export declare type DRMSystemConfiguration = {
    licenseUrl: string;
    serverCertificateUrl?: string;
    generateRequest?: (this: Hls, initDataType: string, initData: ArrayBuffer | null, keyContext: MediaKeySessionContext) => {
        initDataType: string;
        initData: ArrayBuffer | null;
    } | undefined | never;
};

export declare type DRMSystemOptions = {
    audioRobustness?: string;
    videoRobustness?: string;
    audioEncryptionScheme?: string | null;
    videoEncryptionScheme?: string | null;
    persistentState?: MediaKeysRequirement;
    distinctiveIdentifier?: MediaKeysRequirement;
    sessionTypes?: string[];
    sessionType?: string;
};

export declare type DRMSystemsConfiguration = Partial<Record<KeySystems, DRMSystemConfiguration>>;

export declare interface ElementaryStreamInfo {
    startPTS: number;
    endPTS: number;
    startDTS: number;
    endDTS: number;
    partial?: boolean;
}

export declare type ElementaryStreams = Record<ElementaryStreamTypes, ElementaryStreamInfo | null>;

export declare const enum ElementaryStreamTypes {
    AUDIO = "audio",
    VIDEO = "video",
    AUDIOVIDEO = "audiovideo"
}

/**
 * Controller to deal with encrypted media extensions (EME)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Encrypted_Media_Extensions_API
 *
 * @class
 * @constructor
 */
export declare class EMEController extends Logger implements ComponentAPI {
    static CDMCleanupPromise: Promise<void> | void;
    private readonly hls;
    private readonly config;
    private media;
    private keyFormatPromise;
    private keySystemAccessPromises;
    private _requestLicenseFailureCount;
    private mediaKeySessions;
    private keyIdToKeySessionPromise;
    private mediaKeys;
    private setMediaKeysQueue;
    private bannedKeyIds;
    constructor(hls: Hls);
    destroy(): void;
    private registerListeners;
    private unregisterListeners;
    private getLicenseServerUrl;
    private getLicenseServerUrlOrThrow;
    private getServerCertificateUrl;
    private attemptKeySystemAccess;
    private requestMediaKeySystemAccess;
    private getMediaKeysPromise;
    private createMediaKeySessionContext;
    private renewKeySession;
    private updateKeySession;
    getSelectedKeySystemFormats(): KeySystemFormats[];
    getKeySystemAccess(keySystemsToAttempt: KeySystems[]): Promise<void>;
    selectKeySystem(keySystemsToAttempt: KeySystems[]): Promise<KeySystemFormats>;
    selectKeySystemFormat(frag: Fragment): Promise<KeySystemFormats>;
    private getKeyFormatPromise;
    getKeyStatus(decryptdata: LevelKey): MediaKeyStatus | undefined;
    loadKey(data: KeyLoadedData): Promise<MediaKeySessionContext>;
    private throwIfDestroyed;
    private handleError;
    private getKeySystemForKeyPromise;
    private getKeySystemSelectionPromise;
    private onMediaEncrypted;
    private onWaitingForKey;
    private attemptSetMediaKeys;
    private generateRequestWithPreferredKeySession;
    private getKeyStatuses;
    private fetchServerCertificate;
    private setMediaKeysServerCertificate;
    private renewLicense;
    private unpackPlayReadyKeyMessage;
    private setupLicenseXHR;
    private requestLicense;
    private onDestroying;
    private onMediaAttached;
    private onMediaDetached;
    private _clear;
    private onManifestLoading;
    private onManifestLoaded;
    private removeSession;
}

export declare type EMEControllerConfig = {
    licenseXhrSetup?: (this: Hls, xhr: XMLHttpRequest, url: string, keyContext: MediaKeySessionContext, licenseChallenge: Uint8Array) => void | Uint8Array | Promise<Uint8Array | void>;
    licenseResponseCallback?: (this: Hls, xhr: XMLHttpRequest, url: string, keyContext: MediaKeySessionContext) => ArrayBuffer;
    emeEnabled: boolean;
    widevineLicenseUrl?: string;
    drmSystems: DRMSystemsConfiguration | undefined;
    drmSystemOptions: DRMSystemOptions | undefined;
    requestMediaKeySystemAccessFunc: MediaKeyFunc | null;
    requireKeySystemAccessOnStart: boolean;
};

export declare const enum ErrorActionFlags {
    None = 0,
    MoveAllAlternatesMatchingHost = 1,
    MoveAllAlternatesMatchingHDCP = 2,
    MoveAllAlternatesMatchingKey = 4,
    SwitchToSDR = 8
}

export declare class ErrorController extends Logger implements NetworkComponentAPI {
    private readonly hls;
    private playlistError;
    constructor(hls: Hls);
    private registerListeners;
    private unregisterListeners;
    destroy(): void;
    startLoad(startPosition: number): void;
    stopLoad(): void;
    private getVariantLevelIndex;
    private getVariantIndex;
    private variantHasKey;
    private onManifestLoading;
    private onLevelUpdated;
    private onError;
    private getPlaylistRetryOrSwitchAction;
    private getFragRetryOrSwitchAction;
    private getLevelSwitchAction;
    onErrorOut(event: Events.ERROR, data: ErrorData): void;
    private sendAlternateToPenaltyBox;
    private switchLevel;
}

export declare interface ErrorData {
    type: ErrorTypes;
    details: ErrorDetails;
    error: Error;
    fatal: boolean;
    errorAction?: IErrorAction;
    buffer?: number;
    bufferInfo?: BufferInfo;
    bytes?: number;
    chunkMeta?: ChunkMetadata;
    context?: PlaylistLoaderContext;
    decryptdata?: LevelKey;
    event?: keyof HlsListeners | 'demuxerWorker';
    frag?: Fragment;
    part?: Part | null;
    level?: number | undefined;
    levelRetry?: boolean;
    loader?: Loader<LoaderContext>;
    networkDetails?: any;
    stalled?: {
        start: number;
    };
    stats?: LoaderStats;
    mimeType?: string;
    reason?: string;
    response?: LoaderResponse;
    url?: string;
    parent?: PlaylistLevelType;
    sourceBufferName?: SourceBufferName;
    interstitial?: InterstitialEvent;
    /**
     * @deprecated Use ErrorData.error
     */
    err?: {
        message: string;
    };
}

export declare enum ErrorDetails {
    KEY_SYSTEM_NO_KEYS = "keySystemNoKeys",
    KEY_SYSTEM_NO_ACCESS = "keySystemNoAccess",
    KEY_SYSTEM_NO_SESSION = "keySystemNoSession",
    KEY_SYSTEM_NO_CONFIGURED_LICENSE = "keySystemNoConfiguredLicense",
    KEY_SYSTEM_LICENSE_REQUEST_FAILED = "keySystemLicenseRequestFailed",
    KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED = "keySystemServerCertificateRequestFailed",
    KEY_SYSTEM_SERVER_CERTIFICATE_UPDATE_FAILED = "keySystemServerCertificateUpdateFailed",
    KEY_SYSTEM_SESSION_UPDATE_FAILED = "keySystemSessionUpdateFailed",
    KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED = "keySystemStatusOutputRestricted",
    KEY_SYSTEM_STATUS_INTERNAL_ERROR = "keySystemStatusInternalError",
    KEY_SYSTEM_DESTROY_MEDIA_KEYS_ERROR = "keySystemDestroyMediaKeysError",
    KEY_SYSTEM_DESTROY_CLOSE_SESSION_ERROR = "keySystemDestroyCloseSessionError",
    KEY_SYSTEM_DESTROY_REMOVE_SESSION_ERROR = "keySystemDestroyRemoveSessionError",
    MANIFEST_LOAD_ERROR = "manifestLoadError",
    MANIFEST_LOAD_TIMEOUT = "manifestLoadTimeOut",
    MANIFEST_PARSING_ERROR = "manifestParsingError",
    MANIFEST_INCOMPATIBLE_CODECS_ERROR = "manifestIncompatibleCodecsError",
    LEVEL_EMPTY_ERROR = "levelEmptyError",
    LEVEL_LOAD_ERROR = "levelLoadError",
    LEVEL_LOAD_TIMEOUT = "levelLoadTimeOut",
    LEVEL_PARSING_ERROR = "levelParsingError",
    LEVEL_SWITCH_ERROR = "levelSwitchError",
    AUDIO_TRACK_LOAD_ERROR = "audioTrackLoadError",
    AUDIO_TRACK_LOAD_TIMEOUT = "audioTrackLoadTimeOut",
    SUBTITLE_LOAD_ERROR = "subtitleTrackLoadError",
    SUBTITLE_TRACK_LOAD_TIMEOUT = "subtitleTrackLoadTimeOut",
    FRAG_LOAD_ERROR = "fragLoadError",
    FRAG_LOAD_TIMEOUT = "fragLoadTimeOut",
    FRAG_DECRYPT_ERROR = "fragDecryptError",
    FRAG_PARSING_ERROR = "fragParsingError",
    FRAG_GAP = "fragGap",
    REMUX_ALLOC_ERROR = "remuxAllocError",
    KEY_LOAD_ERROR = "keyLoadError",
    KEY_LOAD_TIMEOUT = "keyLoadTimeOut",
    BUFFER_ADD_CODEC_ERROR = "bufferAddCodecError",
    BUFFER_INCOMPATIBLE_CODECS_ERROR = "bufferIncompatibleCodecsError",
    BUFFER_APPEND_ERROR = "bufferAppendError",
    BUFFER_APPENDING_ERROR = "bufferAppendingError",
    BUFFER_STALLED_ERROR = "bufferStalledError",
    BUFFER_FULL_ERROR = "bufferFullError",
    BUFFER_SEEK_OVER_HOLE = "bufferSeekOverHole",
    BUFFER_NUDGE_ON_STALL = "bufferNudgeOnStall",
    ASSET_LIST_LOAD_ERROR = "assetListLoadError",
    ASSET_LIST_LOAD_TIMEOUT = "assetListLoadTimeout",
    ASSET_LIST_PARSING_ERROR = "assetListParsingError",
    INTERSTITIAL_ASSET_ITEM_ERROR = "interstitialAssetItemError",
    INTERNAL_EXCEPTION = "internalException",
    INTERNAL_ABORTED = "aborted",
    ATTACH_MEDIA_ERROR = "attachMediaError",
    UNKNOWN = "unknown"
}

export declare enum ErrorTypes {
    NETWORK_ERROR = "networkError",
    MEDIA_ERROR = "mediaError",
    KEY_SYSTEM_ERROR = "keySystemError",
    MUX_ERROR = "muxError",
    OTHER_ERROR = "otherError"
}

export declare enum Events {
    MEDIA_ATTACHING = "hlsMediaAttaching",
    MEDIA_ATTACHED = "hlsMediaAttached",
    MEDIA_DETACHING = "hlsMediaDetaching",
    MEDIA_DETACHED = "hlsMediaDetached",
    MEDIA_ENDED = "hlsMediaEnded",
    STALL_RESOLVED = "hlsStallResolved",
    BUFFER_RESET = "hlsBufferReset",
    BUFFER_CODECS = "hlsBufferCodecs",
    BUFFER_CREATED = "hlsBufferCreated",
    BUFFER_APPENDING = "hlsBufferAppending",
    BUFFER_APPENDED = "hlsBufferAppended",
    BUFFER_EOS = "hlsBufferEos",
    BUFFERED_TO_END = "hlsBufferedToEnd",
    BUFFER_FLUSHING = "hlsBufferFlushing",
    BUFFER_FLUSHED = "hlsBufferFlushed",
    MANIFEST_LOADING = "hlsManifestLoading",
    MANIFEST_LOADED = "hlsManifestLoaded",
    MANIFEST_PARSED = "hlsManifestParsed",
    LEVEL_SWITCHING = "hlsLevelSwitching",
    LEVEL_SWITCHED = "hlsLevelSwitched",
    LEVEL_LOADING = "hlsLevelLoading",
    LEVEL_LOADED = "hlsLevelLoaded",
    LEVEL_UPDATED = "hlsLevelUpdated",
    LEVEL_PTS_UPDATED = "hlsLevelPtsUpdated",
    LEVELS_UPDATED = "hlsLevelsUpdated",
    AUDIO_TRACKS_UPDATED = "hlsAudioTracksUpdated",
    AUDIO_TRACK_SWITCHING = "hlsAudioTrackSwitching",
    AUDIO_TRACK_SWITCHED = "hlsAudioTrackSwitched",
    AUDIO_TRACK_LOADING = "hlsAudioTrackLoading",
    AUDIO_TRACK_LOADED = "hlsAudioTrackLoaded",
    AUDIO_TRACK_UPDATED = "hlsAudioTrackUpdated",
    SUBTITLE_TRACKS_UPDATED = "hlsSubtitleTracksUpdated",
    SUBTITLE_TRACKS_CLEARED = "hlsSubtitleTracksCleared",
    SUBTITLE_TRACK_SWITCH = "hlsSubtitleTrackSwitch",
    SUBTITLE_TRACK_LOADING = "hlsSubtitleTrackLoading",
    SUBTITLE_TRACK_LOADED = "hlsSubtitleTrackLoaded",
    SUBTITLE_TRACK_UPDATED = "hlsSubtitleTrackUpdated",
    SUBTITLE_FRAG_PROCESSED = "hlsSubtitleFragProcessed",
    CUES_PARSED = "hlsCuesParsed",
    NON_NATIVE_TEXT_TRACKS_FOUND = "hlsNonNativeTextTracksFound",
    INIT_PTS_FOUND = "hlsInitPtsFound",
    FRAG_LOADING = "hlsFragLoading",
    FRAG_LOAD_EMERGENCY_ABORTED = "hlsFragLoadEmergencyAborted",
    FRAG_LOADED = "hlsFragLoaded",
    FRAG_DECRYPTED = "hlsFragDecrypted",
    FRAG_PARSING_INIT_SEGMENT = "hlsFragParsingInitSegment",
    FRAG_PARSING_USERDATA = "hlsFragParsingUserdata",
    FRAG_PARSING_METADATA = "hlsFragParsingMetadata",
    FRAG_PARSED = "hlsFragParsed",
    FRAG_BUFFERED = "hlsFragBuffered",
    FRAG_CHANGED = "hlsFragChanged",
    FPS_DROP = "hlsFpsDrop",
    FPS_DROP_LEVEL_CAPPING = "hlsFpsDropLevelCapping",
    MAX_AUTO_LEVEL_UPDATED = "hlsMaxAutoLevelUpdated",
    ERROR = "hlsError",
    DESTROYING = "hlsDestroying",
    KEY_LOADING = "hlsKeyLoading",
    KEY_LOADED = "hlsKeyLoaded",
    LIVE_BACK_BUFFER_REACHED = "hlsLiveBackBufferReached",
    BACK_BUFFER_REACHED = "hlsBackBufferReached",
    STEERING_MANIFEST_LOADED = "hlsSteeringManifestLoaded",
    ASSET_LIST_LOADING = "hlsAssetListLoading",
    ASSET_LIST_LOADED = "hlsAssetListLoaded",
    INTERSTITIALS_UPDATED = "hlsInterstitialsUpdated",
    INTERSTITIALS_BUFFERED_TO_BOUNDARY = "hlsInterstitialsBufferedToBoundary",
    INTERSTITIAL_ASSET_PLAYER_CREATED = "hlsInterstitialAssetPlayerCreated",
    INTERSTITIAL_STARTED = "hlsInterstitialStarted",
    INTERSTITIAL_ASSET_STARTED = "hlsInterstitialAssetStarted",
    INTERSTITIAL_ASSET_ENDED = "hlsInterstitialAssetEnded",
    INTERSTITIAL_ASSET_ERROR = "hlsInterstitialAssetError",
    INTERSTITIAL_ENDED = "hlsInterstitialEnded",
    INTERSTITIALS_PRIMARY_RESUMED = "hlsInterstitialsPrimaryResumed",
    PLAYOUT_LIMIT_REACHED = "hlsPlayoutLimitReached",
    EVENT_CUE_ENTER = "hlsEventCueEnter"
}

export declare class EwmaBandWidthEstimator {
    private defaultEstimate_;
    private minWeight_;
    private minDelayMs_;
    private slow_;
    private fast_;
    private defaultTTFB_;
    private ttfb_;
    constructor(slow: number, fast: number, defaultEstimate: number, defaultTTFB?: number);
    update(slow: number, fast: number): void;
    sample(durationMs: number, numBytes: number): void;
    sampleTTFB(ttfb: number): void;
    canEstimate(): boolean;
    getEstimate(): number;
    getEstimateTTFB(): number;
    get defaultEstimate(): number;
    destroy(): void;
}

export declare type ExtendedSourceBuffer = SourceBuffer & {
    onbufferedchange?: ((this: SourceBuffer, ev: Event) => any) | null;
};

export declare class FetchLoader implements Loader<LoaderContext> {
    private fetchSetup;
    private requestTimeout?;
    private request;
    private response;
    private controller;
    context: LoaderContext | null;
    private config;
    private callbacks;
    stats: LoaderStats;
    private loader;
    constructor(config: HlsConfig);
    destroy(): void;
    abortInternal(): void;
    abort(): void;
    load(context: LoaderContext, config: LoaderConfiguration, callbacks: LoaderCallbacks<LoaderContext>): void;
    getCacheAge(): number | null;
    getResponseHeader(name: string): string | null;
    private loadProgressively;
}

export declare class FPSController implements ComponentAPI {
    private hls;
    private isVideoPlaybackQualityAvailable;
    private timer?;
    private media;
    private lastTime;
    private lastDroppedFrames;
    private lastDecodedFrames;
    private streamController;
    constructor(hls: Hls);
    setStreamController(streamController: StreamController): void;
    protected registerListeners(): void;
    protected unregisterListeners(): void;
    destroy(): void;
    protected onMediaAttaching(event: Events.MEDIA_ATTACHING, data: MediaAttachingData): void;
    private onMediaDetaching;
    checkFPS(video: HTMLVideoElement, decodedFrames: number, droppedFrames: number): void;
    checkFPSInterval(): void;
}

export declare type FPSControllerConfig = {
    capLevelOnFPSDrop: boolean;
    fpsDroppedMonitoringPeriod: number;
    fpsDroppedMonitoringThreshold: number;
};

export declare interface FPSDropData {
    currentDropped: number;
    currentDecoded: number;
    totalDroppedFrames: number;
}

export declare interface FPSDropLevelCappingData {
    droppedLevel: number;
    level: number;
}

export declare interface FragBufferedData {
    stats: LoadStats;
    frag: Fragment;
    part: Part | null;
    id: string;
}

export declare interface FragChangedData {
    frag: Fragment;
}

export declare interface FragDecryptedData {
    frag: Fragment;
    payload: ArrayBuffer;
    stats: {
        tstart: number;
        tdecrypt: number;
    };
}

export declare interface FragLoadedData {
    frag: Fragment;
    part: Part | null;
    payload: ArrayBuffer;
    networkDetails: unknown;
}

export declare interface FragLoadEmergencyAbortedData {
    frag: Fragment;
    part: Part | null;
    stats: LoaderStats;
}

export declare interface FragLoadFailResult extends ErrorData {
    frag: Fragment;
    part?: Part;
    response?: {
        data: any;
        code: number;
        text: string;
        url: string;
    };
    networkDetails: any;
}

export declare interface FragLoadingData {
    frag: Fragment;
    part?: Part;
    targetBufferTime: number | null;
}

/**
 * Object representing parsed data from an HLS Segment. Found in {@link hls.js#LevelDetails.fragments}.
 */
export declare class Fragment extends BaseSegment {
    private _decryptdata;
    private _programDateTime;
    private _ref;
    private _bitrate?;
    rawProgramDateTime: string | null;
    tagList: Array<string[]>;
    duration: number;
    sn: number | 'initSegment';
    levelkeys?: {
        [key: string]: LevelKey | undefined;
    };
    readonly type: PlaylistLevelType;
    loader: Loader<FragmentLoaderContext> | null;
    keyLoader: Loader<KeyLoaderContext> | null;
    level: number;
    cc: number;
    startPTS?: number;
    endPTS?: number;
    startDTS?: number;
    endDTS?: number;
    start: number;
    playlistOffset: number;
    deltaPTS?: number;
    maxStartPTS?: number;
    minEndPTS?: number;
    data?: Uint8Array;
    bitrateTest: boolean;
    title: string | null;
    initSegment: Fragment | null;
    endList?: boolean;
    gap?: boolean;
    urlId: number;
    constructor(type: PlaylistLevelType, base: Base | string);
    get byteLength(): number | null;
    get bitrate(): number | null;
    set bitrate(value: number);
    get decryptdata(): LevelKey | null;
    get end(): number;
    get endProgramDateTime(): number | null;
    get encrypted(): boolean;
    get programDateTime(): number | null;
    set programDateTime(value: number | null);
    get ref(): MediaFragmentRef | null;
    addStart(value: number): void;
    setStart(value: number): void;
    setDuration(value: number): void;
    setKeyFormat(keyFormat: KeySystemFormats): void;
    abortRequests(): void;
    setElementaryStreamInfo(type: ElementaryStreamTypes, startPTS: number, endPTS: number, startDTS: number, endDTS: number, partial?: boolean): void;
}

export declare class FragmentLoader {
    private readonly config;
    private loader;
    private partLoadTimeout;
    constructor(config: HlsConfig);
    destroy(): void;
    abort(): void;
    load(frag: Fragment, onProgress?: FragmentLoadProgressCallback): Promise<FragLoadedData>;
    loadPart(frag: Fragment, part: Part, onProgress: FragmentLoadProgressCallback): Promise<FragLoadedData>;
    private updateStatsFromPart;
    private resetLoader;
}

/**
 * @deprecated use fragLoadPolicy.default
 */
export declare type FragmentLoaderConfig = {
    fragLoadingTimeOut: number;
    fragLoadingMaxRetry: number;
    fragLoadingRetryDelay: number;
    fragLoadingMaxRetryTimeout: number;
};

export declare interface FragmentLoaderConstructor {
    new (confg: HlsConfig): Loader<FragmentLoaderContext>;
}

export declare interface FragmentLoaderContext extends LoaderContext {
    frag: Fragment;
    part: Part | null;
    resetIV?: boolean;
}

export declare type FragmentLoadProgressCallback = (result: FragLoadedData | PartsLoadedData) => void;

export declare const enum FragmentState {
    NOT_LOADED = "NOT_LOADED",
    APPENDING = "APPENDING",
    PARTIAL = "PARTIAL",
    OK = "OK"
}

export declare class FragmentTracker implements ComponentAPI {
    private activePartLists;
    private endListFragments;
    private fragments;
    private timeRanges;
    private bufferPadding;
    private hls;
    private hasGaps;
    constructor(hls: Hls);
    private _registerListeners;
    private _unregisterListeners;
    destroy(): void;
    /**
     * Return a Fragment or Part with an appended range that matches the position and levelType
     * Otherwise, return null
     */
    getAppendedFrag(position: number, levelType: PlaylistLevelType): MediaFragment | Part | null;
    /**
     * Return a buffered Fragment that matches the position and levelType.
     * A buffered Fragment is one whose loading, parsing and appending is done (completed or "partial" meaning aborted).
     * If not found any Fragment, return null
     */
    getBufferedFrag(position: number, levelType: PlaylistLevelType): MediaFragment | null;
    getFragAtPos(position: number, levelType: PlaylistLevelType, buffered?: boolean): MediaFragment | null;
    /**
     * Partial fragments effected by coded frame eviction will be removed
     * The browser will unload parts of the buffer to free up memory for new buffer data
     * Fragments will need to be reloaded when the buffer is freed up, removing partial fragments will allow them to reload(since there might be parts that are still playable)
     */
    detectEvictedFragments(elementaryStream: SourceBufferName, timeRange: TimeRanges, playlistType: PlaylistLevelType, appendedPart?: Part | null, removeAppending?: boolean): void;
    /**
     * Checks if the fragment passed in is loaded in the buffer properly
     * Partially loaded fragments will be registered as a partial fragment
     */
    detectPartialFragments(data: FragBufferedData): void;
    private removeParts;
    fragBuffered(frag: MediaFragment, force?: true): void;
    private getBufferedTimes;
    /**
     * Gets the partial fragment for a certain time
     */
    getPartialFragment(time: number): MediaFragment | null;
    isEndListAppended(type: PlaylistLevelType): boolean;
    getState(fragment: Fragment): FragmentState;
    private isTimeBuffered;
    private onManifestLoading;
    private onFragLoaded;
    private onBufferAppended;
    private onFragBuffered;
    private hasFragment;
    hasFragments(type?: PlaylistLevelType): boolean;
    hasParts(type: PlaylistLevelType): boolean;
    removeFragmentsInRange(start: number, end: number, playlistType: PlaylistLevelType, withGapOnly?: boolean, unbufferedOnly?: boolean): void;
    removeFragment(fragment: Fragment): void;
    removeAllFragments(): void;
}

export declare interface FragParsedData {
    frag: Fragment;
    part: Part | null;
}

export declare interface FragParsingInitSegmentData {
}

export declare interface FragParsingMetadataData {
    id: string;
    frag: Fragment;
    details: LevelDetails;
    samples: MetadataSample[];
}

export declare interface FragParsingUserdataData {
    id: string;
    frag: Fragment;
    details: LevelDetails;
    samples: UserdataSample[];
}

export declare type GapControllerConfig = {
    detectStallWithCurrentTimeMs: number;
    highBufferWatchdogPeriod: number;
    nudgeOffset: number;
    nudgeMaxRetry: number;
    nudgeOnVideoHole: boolean;
};

export declare type HdcpLevel = (typeof HdcpLevels)[number];

export declare const HdcpLevels: readonly ["NONE", "TYPE-0", "TYPE-1", null];

/**
 * The `Hls` class is the core of the HLS.js library used to instantiate player instances.
 * @public
 */
declare class Hls implements HlsEventEmitter {
    private static defaultConfig;
    /**
     * The runtime configuration used by the player. At instantiation this is combination of `hls.userConfig` merged over `Hls.DefaultConfig`.
     */
    readonly config: HlsConfig;
    /**
     * The configuration object provided on player instantiation.
     */
    readonly userConfig: Partial<HlsConfig>;
    /**
     * The logger functions used by this player instance, configured on player instantiation.
     */
    readonly logger: ILogger;
    private coreComponents;
    private networkControllers;
    private _emitter;
    private _autoLevelCapping;
    private _maxHdcpLevel;
    private abrController;
    private bufferController;
    private capLevelController;
    private latencyController;
    private levelController;
    private streamController;
    private audioStreamController?;
    private subtititleStreamController?;
    private audioTrackController?;
    private subtitleTrackController?;
    private interstitialsController?;
    private gapController;
    private emeController?;
    private cmcdController?;
    private _media;
    private _url;
    private _sessionId?;
    private triggeringException?;
    private started;
    /**
     * Get the video-dev/hls.js package version.
     */
    static get version(): string;
    /**
     * Check if the required MediaSource Extensions are available.
     */
    static isMSESupported(): boolean;
    /**
     * Check if MediaSource Extensions are available and isTypeSupported checks pass for any baseline codecs.
     */
    static isSupported(): boolean;
    /**
     * Get the MediaSource global used for MSE playback (ManagedMediaSource, MediaSource, or WebKitMediaSource).
     */
    static getMediaSource(): typeof MediaSource | undefined;
    static get Events(): typeof Events;
    static get MetadataSchema(): typeof MetadataSchema;
    static get ErrorTypes(): typeof ErrorTypes;
    static get ErrorDetails(): typeof ErrorDetails;
    /**
     * Get the default configuration applied to new instances.
     */
    static get DefaultConfig(): HlsConfig;
    /**
     * Replace the default configuration applied to new instances.
     */
    static set DefaultConfig(defaultConfig: HlsConfig);
    /**
     * Creates an instance of an HLS client that can attach to exactly one `HTMLMediaElement`.
     * @param userConfig - Configuration options applied over `Hls.DefaultConfig`
     */
    constructor(userConfig?: Partial<HlsConfig>);
    createController(ControllerClass: any, components: any): any;
    on<E extends keyof HlsListeners, Context = undefined>(event: E, listener: HlsListeners[E], context?: Context): void;
    once<E extends keyof HlsListeners, Context = undefined>(event: E, listener: HlsListeners[E], context?: Context): void;
    removeAllListeners<E extends keyof HlsListeners>(event?: E | undefined): void;
    off<E extends keyof HlsListeners, Context = undefined>(event: E, listener?: HlsListeners[E] | undefined, context?: Context, once?: boolean | undefined): void;
    listeners<E extends keyof HlsListeners>(event: E): HlsListeners[E][];
    emit<E extends keyof HlsListeners>(event: E, name: E, eventObject: Parameters<HlsListeners[E]>[1]): boolean;
    trigger<E extends keyof HlsListeners>(event: E, eventObject: Parameters<HlsListeners[E]>[1]): boolean;
    listenerCount<E extends keyof HlsListeners>(event: E): number;
    /**
     * Dispose of the instance
     */
    destroy(): void;
    /**
     * Attaches Hls.js to a media element
     */
    attachMedia(data: HTMLMediaElement | MediaAttachingData): void;
    /**
     * Detach Hls.js from the media
     */
    detachMedia(): void;
    /**
     * Detach HTMLMediaElement, MediaSource, and SourceBuffers without reset, for attaching to another instance
     */
    transferMedia(): AttachMediaSourceData | null;
    /**
     * Set the source URL. Can be relative or absolute.
     */
    loadSource(url: string): void;
    /**
     * Gets the currently loaded URL
     */
    get url(): string | null;
    /**
     * Whether or not enough has been buffered to seek to start position or use `media.currentTime` to determine next load position
     */
    get hasEnoughToStart(): boolean;
    /**
     * Get the startPosition set on startLoad(position) or on autostart with config.startPosition
     */
    get startPosition(): number;
    /**
     * Start loading data from the stream source.
     * Depending on default config, client starts loading automatically when a source is set.
     *
     * @param startPosition - Set the start position to stream from.
     * Defaults to -1 (None: starts from earliest point)
     */
    startLoad(startPosition?: number, skipSeekToStartPosition?: boolean): void;
    /**
     * Stop loading of any stream data.
     */
    stopLoad(): void;
    /**
     * Returns whether loading, toggled with `startLoad()` and `stopLoad()`, is active or not`.
     */
    get loadingEnabled(): boolean;
    /**
     * Returns state of fragment loading toggled by calling `pauseBuffering()` and `resumeBuffering()`.
     */
    get bufferingEnabled(): boolean;
    /**
     * Resumes stream controller segment loading after `pauseBuffering` has been called.
     */
    resumeBuffering(): void;
    /**
     * Prevents stream controller from loading new segments until `resumeBuffering` is called.
     * This allows for media buffering to be paused without interupting playlist loading.
     */
    pauseBuffering(): void;
    get inFlightFragments(): InFlightFragments;
    /**
     * Swap through possible audio codecs in the stream (for example to switch from stereo to 5.1)
     */
    swapAudioCodec(): void;
    /**
     * When the media-element fails, this allows to detach and then re-attach it
     * as one call (convenience method).
     *
     * Automatic recovery of media-errors by this process is configurable.
     */
    recoverMediaError(): void;
    removeLevel(levelIndex: number): void;
    /**
     * @returns a UUID for this player instance
     */
    get sessionId(): string;
    /**
     * @returns an array of levels (variants) sorted by HDCP-LEVEL, RESOLUTION (height), FRAME-RATE, CODECS, VIDEO-RANGE, and BANDWIDTH
     */
    get levels(): Level[];
    /**
     * @returns LevelDetails of last loaded level (variant) or `null` prior to loading a media playlist.
     */
    get latestLevelDetails(): LevelDetails | null;
    /**
     * @returns Level object of selected level (variant) or `null` prior to selecting a level or once the level is removed.
     */
    get loadLevelObj(): Level | null;
    /**
     * Index of quality level (variant) currently played
     */
    get currentLevel(): number;
    /**
     * Set quality level index immediately. This will flush the current buffer to replace the quality asap. That means playback will interrupt at least shortly to re-buffer and re-sync eventually. Set to -1 for automatic level selection.
     */
    set currentLevel(newLevel: number);
    /**
     * Index of next quality level loaded as scheduled by stream controller.
     */
    get nextLevel(): number;
    /**
     * Set quality level index for next loaded data.
     * This will switch the video quality asap, without interrupting playback.
     * May abort current loading of data, and flush parts of buffer (outside currently played fragment region).
     * @param newLevel - Pass -1 for automatic level selection
     */
    set nextLevel(newLevel: number);
    /**
     * Return the quality level of the currently or last (of none is loaded currently) segment
     */
    get loadLevel(): number;
    /**
     * Set quality level index for next loaded data in a conservative way.
     * This will switch the quality without flushing, but interrupt current loading.
     * Thus the moment when the quality switch will appear in effect will only be after the already existing buffer.
     * @param newLevel - Pass -1 for automatic level selection
     */
    set loadLevel(newLevel: number);
    /**
     * get next quality level loaded
     */
    get nextLoadLevel(): number;
    /**
     * Set quality level of next loaded segment in a fully "non-destructive" way.
     * Same as `loadLevel` but will wait for next switch (until current loading is done).
     */
    set nextLoadLevel(level: number);
    /**
     * Return "first level": like a default level, if not set,
     * falls back to index of first level referenced in manifest
     */
    get firstLevel(): number;
    /**
     * Sets "first-level", see getter.
     */
    set firstLevel(newLevel: number);
    /**
     * Return the desired start level for the first fragment that will be loaded.
     * The default value of -1 indicates automatic start level selection.
     * Setting hls.nextAutoLevel without setting a startLevel will result in
     * the nextAutoLevel value being used for one fragment load.
     */
    get startLevel(): number;
    /**
     * set  start level (level of first fragment that will be played back)
     * if not overrided by user, first level appearing in manifest will be used as start level
     * if -1 : automatic start level selection, playback will start from level matching download bandwidth
     * (determined from download of first segment)
     */
    set startLevel(newLevel: number);
    /**
     * Whether level capping is enabled.
     * Default value is set via `config.capLevelToPlayerSize`.
     */
    get capLevelToPlayerSize(): boolean;
    /**
     * Enables or disables level capping. If disabled after previously enabled, `nextLevelSwitch` will be immediately called.
     */
    set capLevelToPlayerSize(shouldStartCapping: boolean);
    /**
     * Capping/max level value that should be used by automatic level selection algorithm (`ABRController`)
     */
    get autoLevelCapping(): number;
    /**
     * Returns the current bandwidth estimate in bits per second, when available. Otherwise, `NaN` is returned.
     */
    get bandwidthEstimate(): number;
    set bandwidthEstimate(abrEwmaDefaultEstimate: number);
    get abrEwmaDefaultEstimate(): number;
    /**
     * get time to first byte estimate
     * @type {number}
     */
    get ttfbEstimate(): number;
    /**
     * Capping/max level value that should be used by automatic level selection algorithm (`ABRController`)
     */
    set autoLevelCapping(newLevel: number);
    get maxHdcpLevel(): HdcpLevel;
    set maxHdcpLevel(value: HdcpLevel);
    /**
     * True when automatic level selection enabled
     */
    get autoLevelEnabled(): boolean;
    /**
     * Level set manually (if any)
     */
    get manualLevel(): number;
    /**
     * min level selectable in auto mode according to config.minAutoBitrate
     */
    get minAutoLevel(): number;
    /**
     * max level selectable in auto mode according to autoLevelCapping
     */
    get maxAutoLevel(): number;
    get firstAutoLevel(): number;
    /**
     * next automatically selected quality level
     */
    get nextAutoLevel(): number;
    /**
     * this setter is used to force next auto level.
     * this is useful to force a switch down in auto mode:
     * in case of load error on level N, hls.js can set nextAutoLevel to N-1 for example)
     * forced value is valid for one fragment. upon successful frag loading at forced level,
     * this value will be resetted to -1 by ABR controller.
     */
    set nextAutoLevel(nextLevel: number);
    /**
     * get the datetime value relative to media.currentTime for the active level Program Date Time if present
     */
    get playingDate(): Date | null;
    get mainForwardBufferInfo(): BufferInfo | null;
    get maxBufferLength(): number;
    /**
     * Find and select the best matching audio track, making a level switch when a Group change is necessary.
     * Updates `hls.config.audioPreference`. Returns the selected track, or null when no matching track is found.
     */
    setAudioOption(audioOption: MediaPlaylist | AudioSelectionOption | undefined): MediaPlaylist | null;
    /**
     * Find and select the best matching subtitle track, making a level switch when a Group change is necessary.
     * Updates `hls.config.subtitlePreference`. Returns the selected track, or null when no matching track is found.
     */
    setSubtitleOption(subtitleOption: MediaPlaylist | SubtitleSelectionOption | undefined): MediaPlaylist | null;
    /**
     * Get the complete list of audio tracks across all media groups
     */
    get allAudioTracks(): MediaPlaylist[];
    /**
     * Get the list of selectable audio tracks
     */
    get audioTracks(): MediaPlaylist[];
    /**
     * index of the selected audio track (index in audio track lists)
     */
    get audioTrack(): number;
    /**
     * selects an audio track, based on its index in audio track lists
     */
    set audioTrack(audioTrackId: number);
    /**
     * get the complete list of subtitle tracks across all media groups
     */
    get allSubtitleTracks(): MediaPlaylist[];
    /**
     * get alternate subtitle tracks list from playlist
     */
    get subtitleTracks(): MediaPlaylist[];
    /**
     * index of the selected subtitle track (index in subtitle track lists)
     */
    get subtitleTrack(): number;
    get media(): HTMLMediaElement | null;
    /**
     * select an subtitle track, based on its index in subtitle track lists
     */
    set subtitleTrack(subtitleTrackId: number);
    /**
     * Whether subtitle display is enabled or not
     */
    get subtitleDisplay(): boolean;
    /**
     * Enable/disable subtitle display rendering
     */
    set subtitleDisplay(value: boolean);
    /**
     * get mode for Low-Latency HLS loading
     */
    get lowLatencyMode(): boolean;
    /**
     * Enable/disable Low-Latency HLS part playlist and segment loading, and start live streams at playlist PART-HOLD-BACK rather than HOLD-BACK.
     */
    set lowLatencyMode(mode: boolean);
    /**
     * Position (in seconds) of live sync point (ie edge of live position minus safety delay defined by ```hls.config.liveSyncDuration```)
     * @returns null prior to loading live Playlist
     */
    get liveSyncPosition(): number | null;
    /**
     * Estimated position (in seconds) of live edge (ie edge of live playlist plus time sync playlist advanced)
     * @returns 0 before first playlist is loaded
     */
    get latency(): number;
    /**
     * maximum distance from the edge before the player seeks forward to ```hls.liveSyncPosition```
     * configured using ```liveMaxLatencyDurationCount``` (multiple of target duration) or ```liveMaxLatencyDuration```
     * @returns 0 before first playlist is loaded
     */
    get maxLatency(): number;
    /**
     * target distance from the edge as calculated by the latency controller
     */
    get targetLatency(): number | null;
    set targetLatency(latency: number);
    /**
     * the rate at which the edge of the current live playlist is advancing or 1 if there is none
     */
    get drift(): number | null;
    /**
     * set to true when startLoad is called before MANIFEST_PARSED event
     */
    get forceStartLoad(): boolean;
    /**
     * ContentSteering pathways getter
     */
    get pathways(): string[];
    /**
     * ContentSteering pathwayPriority getter/setter
     */
    get pathwayPriority(): string[] | null;
    set pathwayPriority(pathwayPriority: string[]);
    /**
     * returns true when all SourceBuffers are buffered to the end
     */
    get bufferedToEnd(): boolean;
    /**
     * returns Interstitials Program Manager
     */
    get interstitialsManager(): InterstitialsManager | null;
    /**
     * returns mediaCapabilities.decodingInfo for a variant/rendition
     */
    getMediaDecodingInfo(level: Level, audioTracks?: MediaPlaylist[]): Promise<MediaDecodingInfo>;
}
export default Hls;

export declare class HlsAssetPlayer {
    hls: Hls | null;
    interstitial: InterstitialEvent;
    readonly assetItem: InterstitialAssetItem;
    tracks: Partial<BufferCodecsData> | null;
    private hasDetails;
    private mediaAttached;
    private _currentTime?;
    private _bufferedEosTime?;
    constructor(HlsPlayerClass: typeof Hls, userConfig: HlsAssetPlayerConfig, interstitial: InterstitialEvent, assetItem: InterstitialAssetItem);
    get appendInPlace(): boolean;
    loadSource(): void;
    bufferedInPlaceToEnd(media?: HTMLMediaElement | null): boolean;
    private checkPlayout;
    private reachedPlayout;
    get destroyed(): boolean;
    get assetId(): InterstitialAssetId;
    get interstitialId(): InterstitialId;
    get media(): HTMLMediaElement | null;
    get bufferedEnd(): number;
    get currentTime(): number;
    get duration(): number;
    get remaining(): number;
    get startOffset(): number;
    get timelineOffset(): number;
    set timelineOffset(value: number);
    private getAssetTime;
    private removeMediaListeners;
    private bufferSnapShot;
    destroy(): void;
    attachMedia(data: HTMLMediaElement | MediaAttachingData): void;
    detachMedia(): void;
    resumeBuffering(): void;
    pauseBuffering(): void;
    transferMedia(): AttachMediaSourceData | null;
    resetDetails(): void;
    on<E extends keyof HlsListeners, Context = undefined>(event: E, listener: HlsListeners[E], context?: Context): void;
    once<E extends keyof HlsListeners, Context = undefined>(event: E, listener: HlsListeners[E], context?: Context): void;
    off<E extends keyof HlsListeners, Context = undefined>(event: E, listener: HlsListeners[E], context?: Context): void;
    toString(): string;
}

export declare type HlsAssetPlayerConfig = Partial<HlsConfig> & Required<Pick<HlsConfig, 'assetPlayerId' | 'primarySessionId'>>;

export declare interface HlsChunkPerformanceTiming extends HlsPerformanceTiming {
    executeStart: number;
    executeEnd: number;
}

export declare type HlsConfig = {
    debug: boolean | ILogger;
    enableWorker: boolean;
    workerPath: null | string;
    enableSoftwareAES: boolean;
    minAutoBitrate: number;
    ignoreDevicePixelRatio: boolean;
    maxDevicePixelRatio: number;
    preferManagedMediaSource: boolean;
    preserveManualLevelOnError: boolean;
    timelineOffset?: number;
    ignorePlaylistParsingErrors: boolean;
    loader: {
        new (confg: HlsConfig): Loader<LoaderContext>;
    };
    fLoader?: FragmentLoaderConstructor;
    pLoader?: PlaylistLoaderConstructor;
    fetchSetup?: (context: LoaderContext, initParams: any) => Promise<Request> | Request;
    xhrSetup?: (xhr: XMLHttpRequest, url: string) => Promise<void> | void;
    audioStreamController?: typeof AudioStreamController;
    audioTrackController?: typeof AudioTrackController;
    subtitleStreamController?: typeof SubtitleStreamController;
    subtitleTrackController?: typeof SubtitleTrackController;
    timelineController?: typeof TimelineController;
    emeController?: typeof EMEController;
    cmcd?: CMCDControllerConfig;
    cmcdController?: typeof CMCDController;
    contentSteeringController?: typeof ContentSteeringController;
    interstitialsController?: typeof InterstitialsController;
    enableInterstitialPlayback: boolean;
    interstitialAppendInPlace: boolean;
    interstitialLiveLookAhead: number;
    assetPlayerId?: string;
    useMediaCapabilities: boolean;
    abrController: typeof AbrController;
    bufferController: typeof BufferController;
    capLevelController: typeof CapLevelController;
    errorController: typeof ErrorController;
    fpsController: typeof FPSController;
    progressive: boolean;
    lowLatencyMode: boolean;
    primarySessionId?: string;
} & ABRControllerConfig & BufferControllerConfig & CapLevelControllerConfig & EMEControllerConfig & FPSControllerConfig & GapControllerConfig & LevelControllerConfig & MP4RemuxerConfig & StreamControllerConfig & SelectionPreferences & LatencyControllerConfig & MetadataControllerConfig & TimelineControllerConfig & TSDemuxerConfig & HlsLoadPolicies & FragmentLoaderConfig & PlaylistLoaderConfig;

export declare interface HlsEventEmitter {
    on<E extends keyof HlsListeners, Context = undefined>(event: E, listener: HlsListeners[E], context?: Context): void;
    once<E extends keyof HlsListeners, Context = undefined>(event: E, listener: HlsListeners[E], context?: Context): void;
    removeAllListeners<E extends keyof HlsListeners>(event?: E): void;
    off<E extends keyof HlsListeners, Context = undefined>(event: E, listener?: HlsListeners[E], context?: Context, once?: boolean): void;
    listeners<E extends keyof HlsListeners>(event: E): HlsListeners[E][];
    emit<E extends keyof HlsListeners>(event: E, name: E, eventObject: Parameters<HlsListeners[E]>[1]): boolean;
    listenerCount<E extends keyof HlsListeners>(event: E): number;
}

/**
 * Defines each Event type and payload by Event name. Used in {@link hls.js#HlsEventEmitter} to strongly type the event listener API.
 */
export declare interface HlsListeners {
    [Events.MEDIA_ATTACHING]: (event: Events.MEDIA_ATTACHING, data: MediaAttachingData) => void;
    [Events.MEDIA_ATTACHED]: (event: Events.MEDIA_ATTACHED, data: MediaAttachedData) => void;
    [Events.MEDIA_DETACHING]: (event: Events.MEDIA_DETACHING, data: MediaDetachingData) => void;
    [Events.MEDIA_DETACHED]: (event: Events.MEDIA_DETACHED, data: MediaDetachedData) => void;
    [Events.MEDIA_ENDED]: (event: Events.MEDIA_ENDED, data: MediaEndedData) => void;
    [Events.STALL_RESOLVED]: (event: Events.STALL_RESOLVED, data: {}) => void;
    [Events.BUFFER_RESET]: (event: Events.BUFFER_RESET) => void;
    [Events.BUFFER_CODECS]: (event: Events.BUFFER_CODECS, data: BufferCodecsData) => void;
    [Events.BUFFER_CREATED]: (event: Events.BUFFER_CREATED, data: BufferCreatedData) => void;
    [Events.BUFFER_APPENDING]: (event: Events.BUFFER_APPENDING, data: BufferAppendingData) => void;
    [Events.BUFFER_APPENDED]: (event: Events.BUFFER_APPENDED, data: BufferAppendedData) => void;
    [Events.BUFFER_EOS]: (event: Events.BUFFER_EOS, data: BufferEOSData) => void;
    [Events.BUFFERED_TO_END]: (event: Events.BUFFERED_TO_END) => void;
    [Events.BUFFER_FLUSHING]: (event: Events.BUFFER_FLUSHING, data: BufferFlushingData) => void;
    [Events.BUFFER_FLUSHED]: (event: Events.BUFFER_FLUSHED, data: BufferFlushedData) => void;
    [Events.MANIFEST_LOADING]: (event: Events.MANIFEST_LOADING, data: ManifestLoadingData) => void;
    [Events.MANIFEST_LOADED]: (event: Events.MANIFEST_LOADED, data: ManifestLoadedData) => void;
    [Events.MANIFEST_PARSED]: (event: Events.MANIFEST_PARSED, data: ManifestParsedData) => void;
    [Events.LEVEL_SWITCHING]: (event: Events.LEVEL_SWITCHING, data: LevelSwitchingData) => void;
    [Events.LEVEL_SWITCHED]: (event: Events.LEVEL_SWITCHED, data: LevelSwitchedData) => void;
    [Events.LEVEL_LOADING]: (event: Events.LEVEL_LOADING, data: LevelLoadingData) => void;
    [Events.LEVEL_LOADED]: (event: Events.LEVEL_LOADED, data: LevelLoadedData) => void;
    [Events.LEVEL_UPDATED]: (event: Events.LEVEL_UPDATED, data: LevelUpdatedData) => void;
    [Events.LEVEL_PTS_UPDATED]: (event: Events.LEVEL_PTS_UPDATED, data: LevelPTSUpdatedData) => void;
    [Events.LEVELS_UPDATED]: (event: Events.LEVELS_UPDATED, data: LevelsUpdatedData) => void;
    [Events.AUDIO_TRACKS_UPDATED]: (event: Events.AUDIO_TRACKS_UPDATED, data: AudioTracksUpdatedData) => void;
    [Events.AUDIO_TRACK_SWITCHING]: (event: Events.AUDIO_TRACK_SWITCHING, data: AudioTrackSwitchingData) => void;
    [Events.AUDIO_TRACK_SWITCHED]: (event: Events.AUDIO_TRACK_SWITCHED, data: AudioTrackSwitchedData) => void;
    [Events.AUDIO_TRACK_LOADING]: (event: Events.AUDIO_TRACK_LOADING, data: TrackLoadingData) => void;
    [Events.AUDIO_TRACK_LOADED]: (event: Events.AUDIO_TRACK_LOADED, data: AudioTrackLoadedData) => void;
    [Events.AUDIO_TRACK_UPDATED]: (event: Events.AUDIO_TRACK_UPDATED, data: AudioTrackUpdatedData) => void;
    [Events.SUBTITLE_TRACKS_UPDATED]: (event: Events.SUBTITLE_TRACKS_UPDATED, data: SubtitleTracksUpdatedData) => void;
    [Events.SUBTITLE_TRACKS_CLEARED]: (event: Events.SUBTITLE_TRACKS_CLEARED) => void;
    [Events.SUBTITLE_TRACK_SWITCH]: (event: Events.SUBTITLE_TRACK_SWITCH, data: SubtitleTrackSwitchData) => void;
    [Events.SUBTITLE_TRACK_LOADING]: (event: Events.SUBTITLE_TRACK_LOADING, data: TrackLoadingData) => void;
    [Events.SUBTITLE_TRACK_LOADED]: (event: Events.SUBTITLE_TRACK_LOADED, data: SubtitleTrackLoadedData) => void;
    [Events.SUBTITLE_TRACK_UPDATED]: (event: Events.SUBTITLE_TRACK_UPDATED, data: SubtitleTrackUpdatedData) => void;
    [Events.SUBTITLE_FRAG_PROCESSED]: (event: Events.SUBTITLE_FRAG_PROCESSED, data: SubtitleFragProcessedData) => void;
    [Events.CUES_PARSED]: (event: Events.CUES_PARSED, data: CuesParsedData) => void;
    [Events.NON_NATIVE_TEXT_TRACKS_FOUND]: (event: Events.NON_NATIVE_TEXT_TRACKS_FOUND, data: NonNativeTextTracksData) => void;
    [Events.INIT_PTS_FOUND]: (event: Events.INIT_PTS_FOUND, data: InitPTSFoundData) => void;
    [Events.FRAG_LOADING]: (event: Events.FRAG_LOADING, data: FragLoadingData) => void;
    [Events.FRAG_LOAD_EMERGENCY_ABORTED]: (event: Events.FRAG_LOAD_EMERGENCY_ABORTED, data: FragLoadEmergencyAbortedData) => void;
    [Events.FRAG_LOADED]: (event: Events.FRAG_LOADED, data: FragLoadedData) => void;
    [Events.FRAG_DECRYPTED]: (event: Events.FRAG_DECRYPTED, data: FragDecryptedData) => void;
    [Events.FRAG_PARSING_INIT_SEGMENT]: (event: Events.FRAG_PARSING_INIT_SEGMENT, data: FragParsingInitSegmentData) => void;
    [Events.FRAG_PARSING_USERDATA]: (event: Events.FRAG_PARSING_USERDATA, data: FragParsingUserdataData) => void;
    [Events.FRAG_PARSING_METADATA]: (event: Events.FRAG_PARSING_METADATA, data: FragParsingMetadataData) => void;
    [Events.FRAG_PARSED]: (event: Events.FRAG_PARSED, data: FragParsedData) => void;
    [Events.FRAG_BUFFERED]: (event: Events.FRAG_BUFFERED, data: FragBufferedData) => void;
    [Events.FRAG_CHANGED]: (event: Events.FRAG_CHANGED, data: FragChangedData) => void;
    [Events.FPS_DROP]: (event: Events.FPS_DROP, data: FPSDropData) => void;
    [Events.FPS_DROP_LEVEL_CAPPING]: (event: Events.FPS_DROP_LEVEL_CAPPING, data: FPSDropLevelCappingData) => void;
    [Events.MAX_AUTO_LEVEL_UPDATED]: (event: Events.MAX_AUTO_LEVEL_UPDATED, data: MaxAutoLevelUpdatedData) => void;
    [Events.ERROR]: (event: Events.ERROR, data: ErrorData) => void;
    [Events.DESTROYING]: (event: Events.DESTROYING) => void;
    [Events.KEY_LOADING]: (event: Events.KEY_LOADING, data: KeyLoadingData) => void;
    [Events.KEY_LOADED]: (event: Events.KEY_LOADED, data: KeyLoadedData) => void;
    [Events.LIVE_BACK_BUFFER_REACHED]: (event: Events.LIVE_BACK_BUFFER_REACHED, data: LiveBackBufferData) => void;
    [Events.BACK_BUFFER_REACHED]: (event: Events.BACK_BUFFER_REACHED, data: BackBufferData) => void;
    [Events.STEERING_MANIFEST_LOADED]: (event: Events.STEERING_MANIFEST_LOADED, data: SteeringManifestLoadedData) => void;
    [Events.ASSET_LIST_LOADING]: (event: Events.ASSET_LIST_LOADING, data: AssetListLoadingData) => void;
    [Events.ASSET_LIST_LOADED]: (event: Events.ASSET_LIST_LOADED, data: AssetListLoadedData) => void;
    [Events.INTERSTITIALS_UPDATED]: (event: Events.INTERSTITIALS_UPDATED, data: InterstitialsUpdatedData) => void;
    [Events.INTERSTITIALS_BUFFERED_TO_BOUNDARY]: (event: Events.INTERSTITIALS_BUFFERED_TO_BOUNDARY, data: InterstitialsBufferedToBoundaryData) => void;
    [Events.INTERSTITIAL_ASSET_PLAYER_CREATED]: (event: Events.INTERSTITIAL_ASSET_PLAYER_CREATED, data: InterstitialAssetPlayerCreatedData) => void;
    [Events.INTERSTITIAL_STARTED]: (event: Events.INTERSTITIAL_STARTED, data: InterstitialStartedData) => void;
    [Events.INTERSTITIAL_ASSET_STARTED]: (event: Events.INTERSTITIAL_ASSET_STARTED, data: InterstitialAssetStartedData) => void;
    [Events.INTERSTITIAL_ASSET_ENDED]: (event: Events.INTERSTITIAL_ASSET_ENDED, data: InterstitialAssetEndedData) => void;
    [Events.INTERSTITIAL_ASSET_ERROR]: (event: Events.INTERSTITIAL_ASSET_ERROR, data: InterstitialAssetErrorData) => void;
    [Events.INTERSTITIAL_ENDED]: (event: Events.INTERSTITIAL_ENDED, data: InterstitialEndedData) => void;
    [Events.INTERSTITIALS_PRIMARY_RESUMED]: (event: Events.INTERSTITIALS_PRIMARY_RESUMED, data: InterstitialsPrimaryResumed) => void;
    [Events.PLAYOUT_LIMIT_REACHED]: (event: Events.PLAYOUT_LIMIT_REACHED, data: {}) => void;
    [Events.EVENT_CUE_ENTER]: (event: Events.EVENT_CUE_ENTER, data: {}) => void;
}

export declare type HlsLoadPolicies = {
    fragLoadPolicy: LoadPolicy;
    keyLoadPolicy: LoadPolicy;
    certLoadPolicy: LoadPolicy;
    playlistLoadPolicy: LoadPolicy;
    manifestLoadPolicy: LoadPolicy;
    steeringManifestLoadPolicy: LoadPolicy;
    interstitialAssetListLoadPolicy: LoadPolicy;
};

export declare interface HlsPerformanceTiming {
    start: number;
    end: number;
}

export declare interface HlsProgressivePerformanceTiming extends HlsPerformanceTiming {
    first: number;
}

export declare const enum HlsSkip {
    No = "",
    Yes = "YES",
    v2 = "v2"
}

export declare class HlsUrlParameters {
    msn?: number;
    part?: number;
    skip?: HlsSkip;
    constructor(msn?: number, part?: number, skip?: HlsSkip);
    addDirectives(uri: string): string | never;
}

export declare type IErrorAction = {
    action: NetworkErrorAction;
    flags: ErrorActionFlags;
    retryCount?: number;
    retryConfig?: RetryConfig;
    hdcpLevel?: HdcpLevel;
    nextAutoLevel?: number;
    resolved?: boolean;
};

export declare interface ILogFunction {
    (message?: any, ...optionalParams: any[]): void;
}

export declare interface ILogger {
    trace: ILogFunction;
    debug: ILogFunction;
    log: ILogFunction;
    warn: ILogFunction;
    info: ILogFunction;
    error: ILogFunction;
}

export declare type InFlightData = {
    frag: Fragment | null;
    state: (typeof State)[keyof typeof State];
};

export declare type InFlightFragments = {
    [PlaylistLevelType.MAIN]: InFlightData;
    [PlaylistLevelType.AUDIO]?: InFlightData;
    [PlaylistLevelType.SUBTITLE]?: InFlightData;
};

export declare interface InitPTSFoundData {
    id: PlaylistLevelType;
    frag: MediaFragment;
    initPTS: number;
    timescale: number;
    trackId: number;
}

export declare interface InitSegmentData {
    tracks?: TrackSet;
    initPTS: number | undefined;
    timescale: number | undefined;
    trackId: number | undefined;
}

export declare interface InterstitialAssetEndedData {
    asset: InterstitialAssetItem;
    assetListIndex: number;
    event: InterstitialEvent;
    schedule: InterstitialScheduleItem[];
    scheduleIndex: number;
    player: HlsAssetPlayer;
}

export declare type InterstitialAssetErrorData = {
    asset: InterstitialAssetItem | null;
    assetListIndex: number;
    event: InterstitialEvent | null;
    schedule: InterstitialScheduleItem[] | null;
    scheduleIndex: number;
    player: HlsAssetPlayer | null;
} & ErrorData;

export declare type InterstitialAssetId = string;

export declare type InterstitialAssetItem = {
    parentIdentifier: InterstitialId;
    identifier: InterstitialAssetId;
    duration: number | null;
    startOffset: number;
    timelineStart: number;
    uri: string;
    error?: Error;
};

export declare interface InterstitialAssetPlayerCreatedData {
    asset: InterstitialAssetItem;
    assetListIndex: number;
    assetListResponse?: AssetListJSON;
    event: InterstitialEvent;
    player: HlsAssetPlayer;
}

export declare interface InterstitialAssetStartedData {
    asset: InterstitialAssetItem;
    assetListIndex: number;
    event: InterstitialEvent;
    schedule: InterstitialScheduleItem[];
    scheduleIndex: number;
    player: HlsAssetPlayer;
}

export declare interface InterstitialEndedData {
    event: InterstitialEvent;
    schedule: InterstitialScheduleItem[];
    scheduleIndex: number;
}

export declare class InterstitialEvent {
    private base;
    private _duration;
    private _timelineStart;
    private appendInPlaceDisabled?;
    appendInPlaceStarted?: boolean;
    dateRange: DateRange;
    hasPlayed: boolean;
    cumulativeDuration: number;
    resumeOffset: number;
    playoutLimit: number;
    restrictions: PlaybackRestrictions;
    snapOptions: SnapOptions;
    assetList: InterstitialAssetItem[];
    assetListLoader?: Loader<LoaderContext>;
    assetListResponse: AssetListJSON | null;
    resumeAnchor?: MediaFragmentRef;
    error?: Error;
    resetOnResume?: boolean;
    constructor(dateRange: DateRange, base: BaseData);
    setDateRange(dateRange: DateRange): void;
    reset(): void;
    isAssetPastPlayoutLimit(assetIndex: number): boolean;
    findAssetIndex(asset: InterstitialAssetItem): number;
    get identifier(): InterstitialId;
    get startDate(): Date;
    get startTime(): number;
    get startOffset(): number;
    get startIsAligned(): boolean;
    get resumptionOffset(): number;
    get resumeTime(): number;
    get appendInPlace(): boolean;
    set appendInPlace(value: boolean);
    get timelineStart(): number;
    set timelineStart(value: number);
    get duration(): number;
    set duration(value: number);
    get cue(): DateRangeCue;
    get timelineOccupancy(): TimelineOccupancy;
    get supplementsPrimary(): boolean;
    get contentMayVary(): boolean;
    get assetUrl(): string | undefined;
    get assetListUrl(): string | undefined;
    get baseUrl(): string;
    get assetListLoaded(): boolean;
    toString(): string;
}

export declare interface InterstitialEventWithAssetList extends InterstitialEvent {
    assetListUrl: string;
}

export declare type InterstitialId = string;

export declare interface InterstitialPlayer {
    bufferedEnd: number;
    currentTime: number;
    duration: number;
    assetPlayers: (HlsAssetPlayer | null)[];
    playingIndex: number;
    scheduleItem: InterstitialScheduleEventItem | null;
}

export declare interface InterstitialsBufferedToBoundaryData {
    events: InterstitialEvent[];
    schedule: InterstitialScheduleItem[];
    bufferingIndex: number;
    playingIndex: number;
}

export declare type InterstitialScheduleDurations = {
    primary: number;
    playout: number;
    integrated: number;
};

export declare type InterstitialScheduleEventItem = {
    event: InterstitialEvent;
    start: number;
    end: number;
    playout: {
        start: number;
        end: number;
    };
    integrated: {
        start: number;
        end: number;
    };
};

export declare type InterstitialScheduleItem = InterstitialScheduleEventItem | InterstitialSchedulePrimaryItem;

export declare type InterstitialSchedulePrimaryItem = {
    nextEvent: InterstitialEvent | null;
    previousEvent: InterstitialEvent | null;
    event?: undefined;
    start: number;
    end: number;
    playout: {
        start: number;
        end: number;
    };
    integrated: {
        start: number;
        end: number;
    };
};

export declare class InterstitialsController extends Logger implements NetworkComponentAPI {
    private readonly HlsPlayerClass;
    private readonly hls;
    private readonly assetListLoader;
    private mediaSelection;
    private altSelection;
    private media;
    private detachedData;
    private requiredTracks;
    private manager;
    private playerQueue;
    private bufferedPos;
    private timelinePos;
    private schedule;
    private playingItem;
    private bufferingItem;
    private waitingItem;
    private endedItem;
    private playingAsset;
    private endedAsset;
    private bufferingAsset;
    private shouldPlay;
    constructor(hls: Hls, HlsPlayerClass: typeof Hls);
    private registerListeners;
    private unregisterListeners;
    startLoad(): void;
    stopLoad(): void;
    resumeBuffering(): void;
    pauseBuffering(): void;
    destroy(): void;
    private onDestroying;
    private removeMediaListeners;
    private onMediaAttaching;
    private onMediaAttached;
    private clearScheduleState;
    private onMediaDetaching;
    get interstitialsManager(): InterstitialsManager | null;
    private get effectivePlayingItem();
    private get effectivePlayingAsset();
    private get playingLastItem();
    private get playbackStarted();
    private get currentTime();
    private get primaryMedia();
    private isInterstitial;
    private retreiveMediaSource;
    private transferMediaFromPlayer;
    private transferMediaTo;
    private onPlay;
    private onPause;
    private onSeeking;
    private onInterstitialCueEnter;
    private onTimeupdate;
    private checkStart;
    private advanceAssetBuffering;
    private advanceAfterAssetEnded;
    private setScheduleToAssetAtTime;
    private setSchedulePosition;
    private advanceSchedule;
    private get playbackDisabled();
    private get primaryDetails();
    private get primaryLive();
    private resumePrimary;
    private getPrimaryResumption;
    private isAssetBuffered;
    private attachPrimary;
    private startLoadingPrimaryAt;
    private onManifestLoading;
    private onLevelUpdated;
    private onAudioTrackUpdated;
    private onSubtitleTrackUpdated;
    private onAudioTrackSwitching;
    private onSubtitleTrackSwitch;
    private onBufferCodecs;
    private onBufferAppended;
    private onBufferFlushed;
    private onBufferedToEnd;
    private onMediaEnded;
    private onScheduleUpdate;
    private updateItem;
    private trimInPlace;
    private itemsMatch;
    private eventItemsMatch;
    private findItemIndex;
    private updateSchedule;
    private checkBuffer;
    private updateBufferedPos;
    private assetsBuffered;
    private setBufferingItem;
    private bufferedToItem;
    private preloadPrimary;
    private bufferedToEvent;
    private preloadAssets;
    private flushFrontBuffer;
    private getAssetPlayerQueueIndex;
    private getAssetPlayer;
    private getBufferingPlayer;
    private createAsset;
    private createAssetPlayer;
    private clearInterstitial;
    private resetAssetPlayer;
    private clearAssetPlayer;
    private emptyPlayerQueue;
    private startAssetPlayer;
    private bufferAssetPlayer;
    private handleInPlaceStall;
    private advanceInPlace;
    private handleAssetItemError;
    private primaryFallback;
    private onAssetListLoaded;
    private onError;
}

export declare interface InterstitialsManager {
    events: InterstitialEvent[];
    schedule: InterstitialScheduleItem[];
    interstitialPlayer: InterstitialPlayer | null;
    playerQueue: HlsAssetPlayer[];
    bufferingAsset: InterstitialAssetItem | null;
    bufferingItem: InterstitialScheduleItem | null;
    bufferingIndex: number;
    playingAsset: InterstitialAssetItem | null;
    playingItem: InterstitialScheduleItem | null;
    playingIndex: number;
    primary: PlayheadTimes;
    integrated: PlayheadTimes;
    skip: () => void;
}

export declare interface InterstitialsPrimaryResumed {
    schedule: InterstitialScheduleItem[];
    scheduleIndex: number;
}

export declare interface InterstitialStartedData {
    event: InterstitialEvent;
    schedule: InterstitialScheduleItem[];
    scheduleIndex: number;
}

export declare interface InterstitialsUpdatedData {
    events: InterstitialEvent[];
    schedule: InterstitialScheduleItem[];
    durations: InterstitialScheduleDurations;
    removedIds: string[];
}

export declare interface KeyLoadedData {
    frag: Fragment;
    keyInfo: KeyLoaderInfo;
}

export declare class KeyLoader extends Logger implements ComponentAPI {
    private readonly config;
    private keyIdToKeyInfo;
    emeController: EMEController | null;
    constructor(config: HlsConfig, logger: ILogger);
    abort(type?: PlaylistLevelType): void;
    detach(): void;
    destroy(): void;
    createKeyLoadError(frag: Fragment, details: ErrorDetails | undefined, error: Error, networkDetails?: any, response?: {
        url: string;
        data: undefined;
        code: number;
        text: string;
    }): LoadError;
    loadClear(loadingFrag: Fragment, encryptedFragments: Fragment[], startFragRequested: boolean): null | Promise<void>;
    load(frag: Fragment): Promise<KeyLoadedData>;
    loadInternal(frag: Fragment, keySystemFormat?: KeySystemFormats): Promise<KeyLoadedData>;
    loadKeyEME(keyInfo: KeyLoaderInfo, frag: Fragment): Promise<KeyLoadedData>;
    loadKeyHTTP(keyInfo: KeyLoaderInfo, frag: Fragment): Promise<KeyLoadedData>;
    private resetLoader;
}

export declare interface KeyLoaderContext extends LoaderContext {
    keyInfo: KeyLoaderInfo;
    frag: Fragment;
}

export declare interface KeyLoaderInfo {
    decryptdata: LevelKey;
    keyLoadPromise: Promise<KeyLoadedData> | null;
    loader: Loader<KeyLoaderContext> | null;
    mediaKeySessionContext: MediaKeySessionContext | null;
}

export declare interface KeyLoadingData {
    frag: Fragment;
}

export declare const enum KeySystemFormats {
    CLEARKEY = "org.w3.clearkey",
    FAIRPLAY = "com.apple.streamingkeydelivery",
    PLAYREADY = "com.microsoft.playready",
    WIDEVINE = "urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed"
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/requestMediaKeySystemAccess
 */
export declare const enum KeySystems {
    CLEARKEY = "org.w3.clearkey",
    FAIRPLAY = "com.apple.fps",
    PLAYREADY = "com.microsoft.playready",
    WIDEVINE = "com.widevine.alpha"
}

export declare type LatencyControllerConfig = {
    liveSyncDurationCount: number;
    liveMaxLatencyDurationCount: number;
    liveSyncDuration?: number;
    liveMaxLatencyDuration?: number;
    maxLiveSyncPlaybackRate: number;
    liveSyncOnStallIncrease: number;
};

export declare class Level {
    readonly _attrs: LevelAttributes[];
    readonly audioCodec: string | undefined;
    readonly bitrate: number;
    readonly codecSet: string;
    readonly url: string[];
    readonly frameRate: number;
    readonly height: number;
    readonly id: number;
    readonly name: string;
    readonly supplemental: CodecsParsed | undefined;
    readonly videoCodec: string | undefined;
    readonly width: number;
    details?: LevelDetails;
    fragmentError: number;
    loadError: number;
    loaded?: {
        bytes: number;
        duration: number;
    };
    realBitrate: number;
    supportedPromise?: Promise<MediaDecodingInfo>;
    supportedResult?: MediaDecodingInfo;
    private _avgBitrate;
    private _audioGroups?;
    private _subtitleGroups?;
    private readonly _urlId;
    constructor(data: LevelParsed | MediaPlaylist);
    get maxBitrate(): number;
    get averageBitrate(): number;
    get attrs(): LevelAttributes;
    get codecs(): string;
    get pathwayId(): string;
    get videoRange(): VideoRange;
    get score(): number;
    get uri(): string;
    hasAudioGroup(groupId: string | undefined): boolean;
    hasSubtitleGroup(groupId: string | undefined): boolean;
    get audioGroups(): (string | undefined)[] | undefined;
    get subtitleGroups(): (string | undefined)[] | undefined;
    addGroupId(type: string, groupId: string | undefined): void;
    get urlId(): number;
    set urlId(value: number);
    get audioGroupIds(): (string | undefined)[] | undefined;
    get textGroupIds(): (string | undefined)[] | undefined;
    get audioGroupId(): string | undefined;
    get textGroupId(): string | undefined;
    addFallback(): void;
}

export declare interface LevelAttributes extends AttrList {
    'ALLOWED-CPC'?: string;
    AUDIO?: string;
    'AVERAGE-BANDWIDTH'?: string;
    BANDWIDTH?: string;
    'CLOSED-CAPTIONS'?: string;
    CODECS?: string;
    'FRAME-RATE'?: string;
    'HDCP-LEVEL'?: 'TYPE-0' | 'TYPE-1' | 'NONE';
    'PATHWAY-ID'?: string;
    RESOLUTION?: string;
    SCORE?: string;
    'STABLE-VARIANT-ID'?: string;
    SUBTITLES?: string;
    'SUPPLEMENTAL-CODECS'?: string;
    VIDEO?: string;
    'VIDEO-RANGE'?: VideoRange;
}

export declare type LevelControllerConfig = {
    startLevel?: number;
};

/**
 * Object representing parsed data from an HLS Media Playlist. Found in {@link hls.js#Level.details}.
 */
export declare class LevelDetails {
    PTSKnown: boolean;
    alignedSliding: boolean;
    averagetargetduration?: number;
    endCC: number;
    endSN: number;
    fragments: MediaFragment[];
    fragmentHint?: MediaFragment;
    partList: Part[] | null;
    dateRanges: Record<string, DateRange | undefined>;
    dateRangeTagCount: number;
    live: boolean;
    requestScheduled: number;
    ageHeader: number;
    advancedDateTime?: number;
    updated: boolean;
    advanced: boolean;
    misses: number;
    startCC: number;
    startSN: number;
    startTimeOffset: number | null;
    targetduration: number;
    totalduration: number;
    type: string | null;
    url: string;
    m3u8: string;
    version: number | null;
    canBlockReload: boolean;
    canSkipUntil: number;
    canSkipDateRanges: boolean;
    skippedSegments: number;
    recentlyRemovedDateranges?: string[];
    partHoldBack: number;
    holdBack: number;
    partTarget: number;
    preloadHint?: AttrList;
    renditionReports?: AttrList[];
    tuneInGoal: number;
    deltaUpdateFailed?: boolean;
    driftStartTime: number;
    driftEndTime: number;
    driftStart: number;
    driftEnd: number;
    encryptedFragments: Fragment[];
    playlistParsingError: Error | null;
    variableList: VariableMap | null;
    hasVariableRefs: boolean;
    appliedTimelineOffset?: number;
    constructor(baseUrl: string);
    reloaded(previous: LevelDetails | undefined): void;
    hasKey(levelKey: LevelKey): boolean;
    get hasProgramDateTime(): boolean;
    get levelTargetDuration(): number;
    get drift(): number;
    get edge(): number;
    get partEnd(): number;
    get fragmentEnd(): number;
    get fragmentStart(): number;
    get age(): number;
    get lastPartIndex(): number;
    get maxPartIndex(): number;
    get lastPartSn(): number;
    get expired(): boolean;
}

export declare class LevelKey implements DecryptData {
    readonly uri: string;
    readonly method: string;
    readonly keyFormat: string;
    readonly keyFormatVersions: number[];
    readonly encrypted: boolean;
    readonly isCommonEncryption: boolean;
    iv: Uint8Array<ArrayBuffer> | null;
    key: Uint8Array<ArrayBuffer> | null;
    keyId: Uint8Array<ArrayBuffer> | null;
    pssh: Uint8Array<ArrayBuffer> | null;
    static clearKeyUriToKeyIdMap(): void;
    static setKeyIdForUri(uri: string, keyId: Uint8Array<ArrayBuffer>): void;
    constructor(method: string, uri: string, format: string, formatversions?: number[], iv?: Uint8Array<ArrayBuffer> | null, keyId?: string);
    matches(key: LevelKey): boolean;
    isSupported(): boolean;
    getDecryptData(sn: number | 'initSegment', levelKeys?: {
        [key: string]: LevelKey | undefined;
    }): LevelKey | null;
}

export declare interface LevelLoadedData {
    details: LevelDetails;
    id: number;
    level: number;
    levelInfo: Level;
    networkDetails: any;
    stats: LoaderStats;
    deliveryDirectives: HlsUrlParameters | null;
    withoutMultiVariant?: boolean;
}

export declare interface LevelLoadingData {
    id: number;
    level: number;
    levelInfo: Level;
    pathwayId: string | undefined;
    url: string;
    deliveryDirectives: HlsUrlParameters | null;
}

export declare interface LevelParsed extends CodecsParsed {
    attrs: LevelAttributes;
    bitrate: number;
    details?: LevelDetails;
    height?: number;
    id?: number;
    name: string;
    supplemental?: CodecsParsed;
    url: string;
    width?: number;
}

export declare interface LevelPTSUpdatedData {
    details: LevelDetails;
    level: Level;
    drift: number;
    type: string;
    frag: Fragment;
    start: number;
    end: number;
}

export declare interface LevelsUpdatedData {
    levels: Array<Level>;
}

export declare interface LevelSwitchedData {
    level: number;
}

export declare interface LevelSwitchingData {
    level: number;
    attrs: LevelAttributes;
    details: LevelDetails | undefined;
    bitrate: number;
    averageBitrate: number;
    maxBitrate: number;
    realBitrate: number;
    width: number;
    height: number;
    codecSet: string;
    audioCodec: string | undefined;
    videoCodec: string | undefined;
    audioGroups: (string | undefined)[] | undefined;
    subtitleGroups: (string | undefined)[] | undefined;
    loaded: {
        bytes: number;
        duration: number;
    } | undefined;
    loadError: number;
    fragmentError: number;
    name: string | undefined;
    id: number;
    uri: string;
    url: string[];
    urlId: 0;
    audioGroupIds: (string | undefined)[] | undefined;
    textGroupIds: (string | undefined)[] | undefined;
}

export declare interface LevelUpdatedData {
    details: LevelDetails;
    level: number;
}

/**
 * @deprecated Use BackBufferData
 */
export declare interface LiveBackBufferData extends BackBufferData {
}

export declare interface Loader<T extends LoaderContext> {
    destroy(): void;
    abort(): void;
    load(context: T, config: LoaderConfiguration, callbacks: LoaderCallbacks<T>): void;
    /**
     * `getCacheAge()` is called by hls.js to get the duration that a given object
     * has been sitting in a cache proxy when playing live.  If implemented,
     * this should return a value in seconds.
     *
     * For HTTP based loaders, this should return the contents of the "age" header.
     *
     * @returns time object being lodaded
     */
    getCacheAge?: () => number | null;
    getResponseHeader?: (name: string) => string | null;
    context: T | null;
    stats: LoaderStats;
}

export declare interface LoaderCallbacks<T extends LoaderContext> {
    onSuccess: LoaderOnSuccess<T>;
    onError: LoaderOnError<T>;
    onTimeout: LoaderOnTimeout<T>;
    onAbort?: LoaderOnAbort<T>;
    onProgress?: LoaderOnProgress<T>;
}

export declare type LoaderConfig = {
    maxTimeToFirstByteMs: number;
    maxLoadTimeMs: number;
    timeoutRetry: RetryConfig | null;
    errorRetry: RetryConfig | null;
};

export declare interface LoaderConfiguration {
    loadPolicy: LoaderConfig;
    /**
     * @deprecated use LoaderConfig timeoutRetry and errorRetry maxNumRetry
     */
    maxRetry: number;
    /**
     * @deprecated use LoaderConfig maxTimeToFirstByteMs and maxLoadTimeMs
     */
    timeout: number;
    /**
     * @deprecated use LoaderConfig timeoutRetry and errorRetry retryDelayMs
     */
    retryDelay: number;
    /**
     * @deprecated use LoaderConfig timeoutRetry and errorRetry maxRetryDelayMs
     */
    maxRetryDelay: number;
    highWaterMark?: number;
}

export declare interface LoaderContext {
    url: string;
    responseType: string;
    headers?: Record<string, string>;
    rangeStart?: number;
    rangeEnd?: number;
    progressData?: boolean;
}

export declare type LoaderOnAbort<T extends LoaderContext> = (stats: LoaderStats, context: T, networkDetails: any) => void;

export declare type LoaderOnError<T extends LoaderContext> = (error: {
    code: number;
    text: string;
}, context: T, networkDetails: any, stats: LoaderStats) => void;

export declare type LoaderOnProgress<T extends LoaderContext> = (stats: LoaderStats, context: T, data: string | ArrayBuffer, networkDetails: any) => void;

export declare type LoaderOnSuccess<T extends LoaderContext> = (response: LoaderResponse, stats: LoaderStats, context: T, networkDetails: any) => void;

export declare type LoaderOnTimeout<T extends LoaderContext> = (stats: LoaderStats, context: T, networkDetails: any) => void;

export declare interface LoaderResponse {
    url: string;
    data?: string | ArrayBuffer | Object;
    code?: number;
    text?: string;
}

export declare class LoadError extends Error {
    readonly data: FragLoadFailResult;
    constructor(data: FragLoadFailResult);
}

export declare interface LoaderStats {
    aborted: boolean;
    loaded: number;
    retry: number;
    total: number;
    chunkCount: number;
    bwEstimate: number;
    loading: HlsProgressivePerformanceTiming;
    parsing: HlsPerformanceTiming;
    buffering: HlsProgressivePerformanceTiming;
}

export declare type LoadPolicy = {
    default: LoaderConfig;
};

export declare class LoadStats implements LoaderStats {
    aborted: boolean;
    loaded: number;
    retry: number;
    total: number;
    chunkCount: number;
    bwEstimate: number;
    loading: HlsProgressivePerformanceTiming;
    parsing: HlsPerformanceTiming;
    buffering: HlsProgressivePerformanceTiming;
}

export declare class Logger implements ILogger {
    trace: ILogFunction;
    debug: ILogFunction;
    log: ILogFunction;
    warn: ILogFunction;
    info: ILogFunction;
    error: ILogFunction;
    constructor(label: string, logger: ILogger);
}

export declare class M3U8Parser {
    static findGroup(groups: ({
        id?: string;
        audioCodec?: string;
    } | {
        id?: string;
        textCodec?: string;
    })[], mediaGroupId: string): {
        id?: string;
        audioCodec?: string;
    } | {
        id?: string;
        textCodec?: string;
    } | undefined;
    static resolve(url: any, baseUrl: any): string;
    static isMediaPlaylist(str: string): boolean;
    static parseMasterPlaylist(string: string, baseurl: string): ParsedMultivariantPlaylist;
    static parseMasterPlaylistMedia(string: string, baseurl: string, parsed: ParsedMultivariantPlaylist): ParsedMultivariantMediaOptions;
    static parseLevelPlaylist(string: string, baseurl: string, id: number, type: PlaylistLevelType, levelUrlId: number, multivariantVariableList: VariableMap | null): LevelDetails;
}

export declare type MainPlaylistType = AudioPlaylistType | 'VIDEO';

export declare interface ManifestLoadedData {
    audioTracks: MediaPlaylist[];
    captions?: MediaPlaylist[];
    contentSteering: ContentSteeringOptions | null;
    levels: LevelParsed[];
    networkDetails: any;
    sessionData: Record<string, AttrList> | null;
    sessionKeys: LevelKey[] | null;
    startTimeOffset: number | null;
    stats: LoaderStats;
    subtitles?: MediaPlaylist[];
    url: string;
    variableList: VariableMap | null;
}

export declare interface ManifestLoadingData {
    url: string;
}

export declare interface ManifestParsedData {
    levels: Level[];
    audioTracks: MediaPlaylist[];
    subtitleTracks: MediaPlaylist[];
    sessionData: Record<string, AttrList> | null;
    sessionKeys: LevelKey[] | null;
    firstLevel: number;
    stats: LoaderStats;
    audio: boolean;
    video: boolean;
    altAudio: boolean;
}

export declare interface MaxAutoLevelUpdatedData {
    autoLevelCapping: number;
    levels: Level[] | null;
    maxAutoLevel: number;
    minAutoLevel: number;
    maxHdcpLevel: HdcpLevel;
}

export declare interface MediaAttachedData {
    media: HTMLMediaElement;
    mediaSource?: MediaSource;
}

export declare interface MediaAttachingData {
    media: HTMLMediaElement;
    mediaSource?: MediaSource | null;
    tracks?: SourceBufferTrackSet;
    overrides?: MediaOverrides;
}

export declare interface MediaAttributes extends AttrList {
    'ASSOC-LANGUAGE'?: string;
    AUTOSELECT?: 'YES' | 'NO';
    CHANNELS?: string;
    CHARACTERISTICS?: string;
    DEFAULT?: 'YES' | 'NO';
    FORCED?: 'YES' | 'NO';
    'GROUP-ID': string;
    'INSTREAM-ID'?: string;
    LANGUAGE?: string;
    NAME: string;
    'PATHWAY-ID'?: string;
    'STABLE-RENDITION-ID'?: string;
    TYPE?: 'AUDIO' | 'VIDEO' | 'SUBTITLES' | 'CLOSED-CAPTIONS';
    URI?: string;
}

export declare type MediaDecodingInfo = {
    supported: boolean;
    configurations: readonly MediaDecodingConfiguration[];
    decodingInfoResults: readonly MediaCapabilitiesDecodingInfo[];
    error?: Error;
};

export declare interface MediaDetachedData {
    transferMedia?: AttachMediaSourceData | null;
}

export declare interface MediaDetachingData {
    transferMedia?: AttachMediaSourceData | null;
}

export declare interface MediaEndedData {
    stalled: boolean;
}

export declare interface MediaFragment extends Fragment {
    sn: number;
    ref: MediaFragmentRef;
}

declare type MediaFragmentRef = {
    base: Base;
    start: number;
    duration: number;
    sn: number;
    programDateTime: number | null;
};

export declare type MediaKeyFunc = (keySystem: KeySystems, supportedConfigurations: MediaKeySystemConfiguration[]) => Promise<MediaKeySystemAccess>;

export declare interface MediaKeySessionContext {
    keySystem: KeySystems;
    mediaKeys: MediaKeys;
    decryptdata: LevelKey;
    mediaKeysSession: MediaKeySession;
    keyStatus?: MediaKeyStatus;
    keyStatusTimeouts?: {
        [keyId: string]: number;
    };
    licenseXhr?: XMLHttpRequest;
    _onmessage?: (this: MediaKeySession, ev: MediaKeyMessageEvent) => any;
    _onkeystatuseschange?: (this: MediaKeySession, ev: Event) => any;
}

export declare type MediaOverrides = {
    duration?: number;
    endOfStream?: boolean;
    cueRemoval?: boolean;
};

export declare interface MediaPlaylist {
    attrs: MediaAttributes;
    audioCodec?: string;
    autoselect: boolean;
    bitrate: number;
    channels?: string;
    characteristics?: string;
    details?: LevelDetails;
    height?: number;
    default: boolean;
    forced: boolean;
    groupId: string;
    id: number;
    instreamId?: string;
    lang?: string;
    assocLang?: string;
    name: string;
    textCodec?: string;
    unknownCodecs?: string[];
    type: MediaPlaylistType | 'main';
    url: string;
    videoCodec?: string;
    width?: number;
}

export declare type MediaPlaylistType = MainPlaylistType | SubtitlePlaylistType;

export declare type MetadataControllerConfig = {
    enableDateRangeMetadataCues: boolean;
    enableEmsgMetadataCues: boolean;
    enableEmsgKLVMetadata: boolean;
    enableID3MetadataCues: boolean;
};

export declare interface MetadataSample {
    pts: number;
    dts: number;
    duration: number;
    len?: number;
    data: Uint8Array;
    type: MetadataSchema;
}

export declare enum MetadataSchema {
    audioId3 = "org.id3",
    dateRange = "com.apple.quicktime.HLS",
    emsg = "https://aomedia.org/emsg/ID3",
    misbklv = "urn:misb:KLV:bin:1910.1"
}

export declare type MP4RemuxerConfig = {
    stretchShortVideoTrack: boolean;
    maxAudioFramesDrift: number;
};

export declare interface NetworkComponentAPI extends ComponentAPI {
    startLoad(startPosition: number, skipSeekToStartPosition?: boolean): void;
    stopLoad(): void;
    pauseBuffering?(): void;
    resumeBuffering?(): void;
}

export declare const enum NetworkErrorAction {
    DoNothing = 0,
    SendEndCallback = 1,// Reserved for future use
    SendAlternateToPenaltyBox = 2,
    RemoveAlternatePermanently = 3,// Reserved for future use
    InsertDiscontinuity = 4,// Reserved for future use
    RetryRequest = 5
}

export declare interface NonNativeTextTrack {
    _id?: string;
    label: any;
    kind: string;
    default: boolean;
    closedCaptions?: MediaPlaylist;
    subtitleTrack?: MediaPlaylist;
}

export declare interface NonNativeTextTracksData {
    tracks: Array<NonNativeTextTrack>;
}

declare interface PACData {
    row: number;
    indent: number | null;
    color: string | null;
    underline: boolean;
    italics: boolean;
}

declare type ParsedMultivariantMediaOptions = {
    AUDIO?: MediaPlaylist[];
    SUBTITLES?: MediaPlaylist[];
    'CLOSED-CAPTIONS'?: MediaPlaylist[];
};

export declare type ParsedMultivariantPlaylist = {
    contentSteering: ContentSteeringOptions | null;
    levels: LevelParsed[];
    playlistParsingError: Error | null;
    sessionData: Record<string, AttrList> | null;
    sessionKeys: LevelKey[] | null;
    startTimeOffset: number | null;
    variableList: VariableMap | null;
    hasVariableRefs: boolean;
};

export declare interface ParsedTrack extends BaseTrack {
    initSegment?: Uint8Array;
}

/**
 * Object representing parsed data from an HLS Partial Segment. Found in {@link hls.js#LevelDetails.partList}.
 */
export declare class Part extends BaseSegment {
    readonly fragOffset: number;
    readonly duration: number;
    readonly gap: boolean;
    readonly independent: boolean;
    readonly relurl: string;
    readonly fragment: MediaFragment;
    readonly index: number;
    constructor(partAttrs: AttrList, frag: MediaFragment, base: Base | string, index: number, previous?: Part);
    get start(): number;
    get end(): number;
    get loaded(): boolean;
}

export declare interface PartsLoadedData {
    frag: Fragment;
    part: Part | null;
    partsLoaded?: FragLoadedData[];
}

export declare type PathwayClone = {
    'BASE-ID': string;
    ID: string;
    'URI-REPLACEMENT': UriReplacement;
};

declare class PenState {
    foreground: string;
    underline: boolean;
    italics: boolean;
    background: string;
    flash: boolean;
    reset(): void;
    setStyles(styles: Partial<PenStyles>): void;
    isDefault(): boolean;
    equals(other: PenState): boolean;
    copy(newPenState: PenState): void;
    toString(): string;
}

declare type PenStyles = {
    foreground: string | null;
    underline: boolean;
    italics: boolean;
    background: string;
    flash: boolean;
};

export declare type PlaybackRestrictions = {
    skip: boolean;
    jump: boolean;
};

export declare type PlayheadTimes = {
    bufferedEnd: number;
    currentTime: number;
    duration: number;
    seekableStart: number;
};

export declare const enum PlaylistContextType {
    MANIFEST = "manifest",
    LEVEL = "level",
    AUDIO_TRACK = "audioTrack",
    SUBTITLE_TRACK = "subtitleTrack"
}

export declare const enum PlaylistLevelType {
    MAIN = "main",
    AUDIO = "audio",
    SUBTITLE = "subtitle"
}

/**
 * @deprecated use manifestLoadPolicy.default and playlistLoadPolicy.default
 */
export declare type PlaylistLoaderConfig = {
    manifestLoadingTimeOut: number;
    manifestLoadingMaxRetry: number;
    manifestLoadingRetryDelay: number;
    manifestLoadingMaxRetryTimeout: number;
    levelLoadingTimeOut: number;
    levelLoadingMaxRetry: number;
    levelLoadingRetryDelay: number;
    levelLoadingMaxRetryTimeout: number;
};

export declare interface PlaylistLoaderConstructor {
    new (confg: HlsConfig): Loader<PlaylistLoaderContext>;
}

export declare interface PlaylistLoaderContext extends LoaderContext {
    type: PlaylistContextType;
    level: number | null;
    id: number | null;
    groupId?: string;
    pathwayId?: string;
    levelDetails?: LevelDetails;
    deliveryDirectives: HlsUrlParameters | null;
    levelOrTrack: Level | MediaPlaylist | null;
}

export declare type RationalTimestamp = {
    baseTime: number;
    timescale: number;
};

export declare interface RemuxedMetadata {
    samples: MetadataSample[];
}

export declare interface RemuxedTrack {
    data1: Uint8Array<ArrayBuffer>;
    data2?: Uint8Array<ArrayBuffer>;
    startPTS: number;
    endPTS: number;
    startDTS: number;
    endDTS: number;
    type: SourceBufferName;
    hasAudio: boolean;
    hasVideo: boolean;
    independent?: boolean;
    firstKeyFrame?: number;
    firstKeyFramePTS?: number;
    nb: number;
    transferredData1?: ArrayBuffer;
    transferredData2?: ArrayBuffer;
    dropped?: number;
    encrypted?: boolean;
}

export declare interface RemuxedUserdata {
    samples: UserdataSample[];
}

export declare interface RemuxerResult {
    audio?: RemuxedTrack;
    video?: RemuxedTrack;
    text?: RemuxedUserdata;
    id3?: RemuxedMetadata;
    initSegment?: InitSegmentData;
    independent?: boolean;
}

export declare type RetryConfig = {
    maxNumRetry: number;
    retryDelayMs: number;
    maxRetryDelayMs: number;
    backoff?: 'exponential' | 'linear';
    shouldRetry?: (retryConfig: RetryConfig | null | undefined, retryCount: number, isTimeout: boolean, loaderResponse: LoaderResponse | undefined, retry: boolean) => boolean;
};

/**
 * CEA-608 row consisting of NR_COLS instances of StyledUnicodeChar.
 * @constructor
 */
declare class Row {
    chars: StyledUnicodeChar[];
    pos: number;
    currPenState: PenState;
    cueStartTime: number | null;
    private logger;
    constructor(logger: CaptionsLogger);
    equals(other: Row): boolean;
    copy(other: Row): void;
    isEmpty(): boolean;
    /**
     *  Set the cursor to a valid column.
     */
    setCursor(absPos: number): void;
    /**
     * Move the cursor relative to current position.
     */
    moveCursor(relPos: number): void;
    /**
     * Backspace, move one step back and clear character.
     */
    backSpace(): void;
    insertChar(byte: number): void;
    clearFromPos(startPos: number): void;
    clear(): void;
    clearToEndOfRow(): void;
    getTextString(): string;
    setPenStyles(styles: Partial<PenStyles>): void;
}

export declare type SelectionPreferences = {
    videoPreference?: VideoSelectionOption;
    audioPreference?: AudioSelectionOption;
    subtitlePreference?: SubtitleSelectionOption;
};

export declare type SnapOptions = {
    out: boolean;
    in: boolean;
};

export declare interface SourceBufferListener {
    event: string;
    listener: EventListener;
}

export declare type SourceBufferName = 'video' | 'audio' | 'audiovideo';

export declare interface SourceBufferTrack extends BaseTrack {
    buffer?: ExtendedSourceBuffer;
    listeners: SourceBufferListener[];
    ending?: boolean;
    ended?: boolean;
}

export declare type SourceBufferTrackSet = Partial<Record<SourceBufferName, SourceBufferTrack>>;

export declare const State: {
    STOPPED: string;
    IDLE: string;
    KEY_LOADING: string;
    FRAG_LOADING: string;
    FRAG_LOADING_WAITING_RETRY: string;
    WAITING_TRACK: string;
    PARSING: string;
    PARSED: string;
    ENDED: string;
    ERROR: string;
    WAITING_INIT_PTS: string;
    WAITING_LEVEL: string;
};

export declare type SteeringManifest = {
    VERSION: 1;
    TTL: number;
    'RELOAD-URI'?: string;
    'PATHWAY-PRIORITY': string[];
    'PATHWAY-CLONES'?: PathwayClone[];
};

export declare interface SteeringManifestLoadedData {
    steeringManifest: SteeringManifest;
    url: string;
}

export declare class StreamController extends BaseStreamController implements NetworkComponentAPI {
    private audioCodecSwap;
    private level;
    private _forceStartLoad;
    private _hasEnoughToStart;
    private altAudio;
    private audioOnly;
    private fragPlaying;
    private fragLastKbps;
    private couldBacktrack;
    private backtrackFragment;
    private audioCodecSwitch;
    private videoBuffer;
    constructor(hls: Hls, fragmentTracker: FragmentTracker, keyLoader: KeyLoader);
    protected registerListeners(): void;
    protected unregisterListeners(): void;
    protected onHandlerDestroying(): void;
    startLoad(startPosition: number, skipSeekToStartPosition?: boolean): void;
    stopLoad(): void;
    protected doTick(): void;
    protected onTickEnd(): void;
    private doTickIdle;
    protected loadFragment(frag: Fragment, level: Level, targetBufferTime: number): void;
    private getBufferedFrag;
    private followingBufferedFrag;
    immediateLevelSwitch(): void;
    /**
     * try to switch ASAP without breaking video playback:
     * in order to ensure smooth but quick level switching,
     * we need to find the next flushable buffer range
     * we should take into account new segment fetch time
     */
    nextLevelSwitch(): void;
    private abortCurrentFrag;
    protected flushMainBuffer(startOffset: number, endOffset: number): void;
    protected onMediaAttached(event: Events.MEDIA_ATTACHED, data: MediaAttachedData): void;
    protected onMediaDetaching(event: Events.MEDIA_DETACHING, data: MediaDetachingData): void;
    private onMediaPlaying;
    private onMediaSeeked;
    protected onManifestLoading(): void;
    private onManifestParsed;
    private onLevelLoading;
    private onLevelLoaded;
    private synchronizeToLiveEdge;
    protected _handleFragmentLoadProgress(data: FragLoadedData): void;
    private onAudioTrackSwitching;
    private onAudioTrackSwitched;
    private onBufferCreated;
    private onFragBuffered;
    get hasEnoughToStart(): boolean;
    protected onError(event: Events.ERROR, data: ErrorData): void;
    private onFragLoadEmergencyAborted;
    private onBufferFlushed;
    private onLevelsUpdated;
    swapAudioCodec(): void;
    /**
     * Seeks to the set startPosition if not equal to the mediaElement's current time.
     */
    protected seekToStartPos(): void;
    private _getAudioCodec;
    private _loadBitrateTestFrag;
    private _handleTransmuxComplete;
    private logMuxedErr;
    private _bufferInitSegment;
    getMainFwdBufferInfo(): BufferInfo | null;
    get maxBufferLength(): number;
    private backtrack;
    private checkFragmentChanged;
    get nextLevel(): number;
    get currentFrag(): Fragment | null;
    get currentProgramDateTime(): Date | null;
    get currentLevel(): number;
    get nextBufferedFrag(): MediaFragment | null;
    get forceStartLoad(): boolean;
}

export declare type StreamControllerConfig = {
    autoStartLoad: boolean;
    startPosition: number;
    defaultAudioCodec?: string;
    initialLiveManifestSize: number;
    maxBufferLength: number;
    maxBufferSize: number;
    maxBufferHole: number;
    maxFragLookUpTolerance: number;
    maxMaxBufferLength: number;
    startFragPrefetch: boolean;
    testBandwidth: boolean;
    liveSyncMode?: 'edge' | 'buffered';
    startOnSegmentBoundary: boolean;
};

/**
 * Unicode character with styling and background.
 * @constructor
 */
declare class StyledUnicodeChar {
    uchar: string;
    penState: PenState;
    reset(): void;
    setChar(uchar: string, newPenState: PenState): void;
    setPenState(newPenState: PenState): void;
    equals(other: StyledUnicodeChar): boolean;
    copy(newChar: StyledUnicodeChar): void;
    isEmpty(): boolean;
}

export declare interface SubtitleFragProcessedData {
    success: boolean;
    frag: Fragment;
    error?: Error;
}

export declare type SubtitlePlaylistType = 'SUBTITLES' | 'CLOSED-CAPTIONS';

export declare type SubtitleSelectionOption = {
    id?: number;
    lang?: string;
    assocLang?: string;
    characteristics?: string;
    name?: string;
    groupId?: string;
    default?: boolean;
    forced?: boolean;
};

export declare class SubtitleStreamController extends BaseStreamController implements NetworkComponentAPI {
    private currentTrackId;
    private tracksBuffered;
    private mainDetails;
    constructor(hls: Hls, fragmentTracker: FragmentTracker, keyLoader: KeyLoader);
    protected onHandlerDestroying(): void;
    protected registerListeners(): void;
    protected unregisterListeners(): void;
    startLoad(startPosition: number, skipSeekToStartPosition?: boolean): void;
    protected onManifestLoading(): void;
    protected onMediaDetaching(event: Events.MEDIA_DETACHING, data: MediaDetachingData): void;
    private onLevelLoaded;
    private onSubtitleFragProcessed;
    private onBufferFlushing;
    protected onError(event: Events.ERROR, data: ErrorData): void;
    private onSubtitleTracksUpdated;
    private onSubtitleTrackSwitch;
    private onSubtitleTrackLoaded;
    _handleFragmentLoadComplete(fragLoadedData: FragLoadedData): void;
    doTick(): void;
    protected loadFragment(frag: Fragment, level: Level, targetBufferTime: number): void;
    get mediaBufferTimeRanges(): Bufferable;
}

export declare class SubtitleTrackController extends BasePlaylistController {
    private media;
    private tracks;
    private groupIds;
    private tracksInGroup;
    private trackId;
    private currentTrack;
    private selectDefaultTrack;
    private queuedDefaultTrack;
    private useTextTrackPolling;
    private subtitlePollingInterval;
    private _subtitleDisplay;
    private asyncPollTrackChange;
    constructor(hls: Hls);
    destroy(): void;
    get subtitleDisplay(): boolean;
    set subtitleDisplay(value: boolean);
    private registerListeners;
    private unregisterListeners;
    protected onMediaAttached(event: Events.MEDIA_ATTACHED, data: MediaAttachedData): void;
    private pollTrackChange;
    protected onMediaDetaching(event: Events.MEDIA_DETACHING, data: MediaDetachingData): void;
    protected onManifestLoading(): void;
    protected onManifestParsed(event: Events.MANIFEST_PARSED, data: ManifestParsedData): void;
    protected onSubtitleTrackLoaded(event: Events.SUBTITLE_TRACK_LOADED, data: TrackLoadedData): void;
    protected onLevelLoading(event: Events.LEVEL_LOADING, data: LevelLoadingData): void;
    protected onLevelSwitching(event: Events.LEVEL_SWITCHING, data: LevelSwitchingData): void;
    private switchLevel;
    private findTrackId;
    private findTrackForTextTrack;
    protected onError(event: Events.ERROR, data: ErrorData): void;
    get allSubtitleTracks(): MediaPlaylist[];
    /** get alternate subtitle tracks list from playlist **/
    get subtitleTracks(): MediaPlaylist[];
    /** get/set index of the selected subtitle track (based on index in subtitle track lists) **/
    get subtitleTrack(): number;
    set subtitleTrack(newId: number);
    setSubtitleOption(subtitleOption: MediaPlaylist | SubtitleSelectionOption | undefined): MediaPlaylist | null;
    protected loadPlaylist(hlsUrlParameters?: HlsUrlParameters): void;
    protected loadingPlaylist(currentTrack: MediaPlaylist, hlsUrlParameters: HlsUrlParameters | undefined): void;
    /**
     * Disables the old subtitleTrack and sets current mode on the next subtitleTrack.
     * This operates on the DOM textTracks.
     * A value of -1 will disable all subtitle tracks.
     */
    private toggleTrackModes;
    /**
     * This method is responsible for validating the subtitle index and periodically reloading if live.
     * Dispatches the SUBTITLE_TRACK_SWITCH event, which instructs the subtitle-stream-controller to load the selected track.
     */
    private setSubtitleTrack;
    private onTextTracksChanged;
}

export declare interface SubtitleTrackLoadedData extends TrackLoadedData {
}

export declare interface SubtitleTracksUpdatedData {
    subtitleTracks: MediaPlaylist[];
}

export declare interface SubtitleTrackSwitchData {
    id: number;
    name?: string;
    groupId?: string;
    type?: MediaPlaylistType | 'main';
    url?: string;
}

export declare interface SubtitleTrackUpdatedData {
    details: LevelDetails;
    id: number;
    groupId: string;
}

/**
 * @ignore
 * Sub-class specialization of EventHandler base class.
 *
 * TaskLoop allows to schedule a task function being called (optionnaly repeatedly) on the main loop,
 * scheduled asynchroneously, avoiding recursive calls in the same tick.
 *
 * The task itself is implemented in `doTick`. It can be requested and called for single execution
 * using the `tick` method.
 *
 * It will be assured that the task execution method (`tick`) only gets called once per main loop "tick",
 * no matter how often it gets requested for execution. Execution in further ticks will be scheduled accordingly.
 *
 * If further execution requests have already been scheduled on the next tick, it can be checked with `hasNextTick`,
 * and cancelled with `clearNextTick`.
 *
 * The task can be scheduled as an interval repeatedly with a period as parameter (see `setInterval`, `clearInterval`).
 *
 * Sub-classes need to implement the `doTick` method which will effectively have the task execution routine.
 *
 * Further explanations:
 *
 * The baseclass has a `tick` method that will schedule the doTick call. It may be called synchroneously
 * only for a stack-depth of one. On re-entrant calls, sub-sequent calls are scheduled for next main loop ticks.
 *
 * When the task execution (`tick` method) is called in re-entrant way this is detected and
 * we are limiting the task execution per call stack to exactly one, but scheduling/post-poning further
 * task processing on the next main loop iteration (also known as "next tick" in the Node/JS runtime lingo).
 */
export declare class TaskLoop extends Logger {
    private readonly _boundTick;
    private _tickTimer;
    private _tickInterval;
    private _tickCallCount;
    constructor(label: string, logger: ILogger);
    destroy(): void;
    protected onHandlerDestroying(): void;
    protected onHandlerDestroyed(): void;
    hasInterval(): boolean;
    hasNextTick(): boolean;
    /**
     * @param millis - Interval time (ms)
     * @eturns True when interval has been scheduled, false when already scheduled (no effect)
     */
    setInterval(millis: number): boolean;
    /**
     * @returns True when interval was cleared, false when none was set (no effect)
     */
    clearInterval(): boolean;
    /**
     * @returns True when timeout was cleared, false when none was set (no effect)
     */
    clearNextTick(): boolean;
    /**
     * Will call the subclass doTick implementation in this main loop tick
     * or in the next one (via setTimeout(,0)) in case it has already been called
     * in this tick (in case this is a re-entrant call).
     */
    tick(): void;
    tickImmediate(): void;
    /**
     * For subclass to implement task logic
     * @abstract
     */
    protected doTick(): void;
}

export declare class TimelineController implements ComponentAPI {
    private hls;
    private media;
    private config;
    private enabled;
    private Cues;
    private textTracks;
    private tracks;
    private initPTS;
    private unparsedVttFrags;
    private captionsTracks;
    private nonNativeCaptionsTracks;
    private cea608Parser1?;
    private cea608Parser2?;
    private lastCc;
    private lastSn;
    private lastPartIndex;
    private prevCC;
    private vttCCs;
    private captionsProperties;
    constructor(hls: Hls);
    destroy(): void;
    private initCea608Parsers;
    addCues(trackName: string, startTime: number, endTime: number, screen: CaptionScreen, cueRanges: Array<[number, number]>): void;
    private onInitPtsFound;
    private getExistingTrack;
    createCaptionsTrack(trackName: string): void;
    private createNativeTrack;
    private createNonNativeTrack;
    private createTextTrack;
    private onMediaAttaching;
    private onMediaDetaching;
    private onManifestLoading;
    private _cleanTracks;
    private onSubtitleTracksUpdated;
    private onManifestLoaded;
    private closedCaptionsForLevel;
    private onFragLoading;
    private onFragLoaded;
    private _parseIMSC1;
    private _parseVTTs;
    private _fallbackToIMSC1;
    private _appendCues;
    private onFragDecrypted;
    private onSubtitleTracksCleared;
    private onFragParsingUserdata;
    onBufferFlushing(event: Events.BUFFER_FLUSHING, { startOffset, endOffset, endOffsetSubtitles, type }: BufferFlushingData): void;
    private extractCea608Data;
}

export declare type TimelineControllerConfig = {
    cueHandler: CuesInterface;
    enableWebVTT: boolean;
    enableIMSC1: boolean;
    enableCEA708Captions: boolean;
    captionsTextTrack1Label: string;
    captionsTextTrack1LanguageCode: string;
    captionsTextTrack2Label: string;
    captionsTextTrack2LanguageCode: string;
    captionsTextTrack3Label: string;
    captionsTextTrack3LanguageCode: string;
    captionsTextTrack4Label: string;
    captionsTextTrack4LanguageCode: string;
    renderTextTracksNatively: boolean;
};

export declare enum TimelineOccupancy {
    Point = 0,
    Range = 1
}

export declare type TimestampOffset = RationalTimestamp & {
    trackId: number;
};

export declare interface Track extends BaseTrack {
    buffer?: SourceBuffer;
    initSegment?: Uint8Array;
}

export declare interface TrackLoadedData {
    details: LevelDetails;
    id: number;
    groupId: string;
    networkDetails: any;
    stats: LoaderStats;
    deliveryDirectives: HlsUrlParameters | null;
    track: MediaPlaylist;
}

export declare interface TrackLoadingData {
    id: number;
    groupId: string;
    track: MediaPlaylist;
    url: string;
    deliveryDirectives: HlsUrlParameters | null;
}

export declare interface TrackSet {
    audio?: Track;
    video?: Track;
    audiovideo?: Track;
}

export declare class TransmuxerInterface {
    error: Error | null;
    private hls;
    private id;
    private instanceNo;
    private observer;
    private frag;
    private part;
    private useWorker;
    private workerContext;
    private transmuxer;
    private onTransmuxComplete;
    private onFlush;
    constructor(hls: Hls, id: PlaylistLevelType, onTransmuxComplete: (transmuxResult: TransmuxerResult) => void, onFlush: (chunkMeta: ChunkMetadata) => void);
    reset(): void;
    private terminateWorker;
    destroy(): void;
    push(data: ArrayBuffer, initSegmentData: Uint8Array | undefined, audioCodec: string | undefined, videoCodec: string | undefined, frag: MediaFragment, part: Part | null, duration: number, accurateTimeOffset: boolean, chunkMeta: ChunkMetadata, defaultInitPTS?: TimestampOffset): void;
    flush(chunkMeta: ChunkMetadata): void;
    private transmuxerError;
    private handleFlushResult;
    private onWorkerMessage;
    private onWorkerError;
    private configureTransmuxer;
    private handleTransmuxComplete;
}

export declare interface TransmuxerResult {
    remuxResult: RemuxerResult;
    chunkMeta: ChunkMetadata;
}

export declare type TSDemuxerConfig = {
    forceKeyFrameOnDiscontinuity: boolean;
};

export declare type UriReplacement = {
    HOST?: string;
    PARAMS?: {
        [queryParameter: string]: string;
    };
    'PER-VARIANT-URIS'?: {
        [stableVariantId: string]: string;
    };
    'PER-RENDITION-URIS'?: {
        [stableRenditionId: string]: string;
    };
};

export declare interface UserdataSample {
    pts: number;
    bytes?: Uint8Array;
    type?: number;
    payloadType?: number;
    uuid?: string;
    userData?: string;
    userDataBytes?: Uint8Array;
}

export declare type VariableMap = Record<string, string>;

declare const enum VerboseLevel {
    ERROR = 0,
    TEXT = 1,
    WARNING = 2,
    INFO = 2,
    DEBUG = 3,
    DATA = 3
}

export declare type VideoRange = (typeof VideoRangeValues)[number];

export declare const VideoRangeValues: readonly ["SDR", "PQ", "HLG"];

export declare type VideoSelectionOption = {
    preferHDR?: boolean;
    allowedVideoRanges?: Array<VideoRange>;
    videoCodec?: string;
};

export declare class XhrLoader implements Loader<LoaderContext> {
    private xhrSetup;
    private requestTimeout?;
    private retryTimeout?;
    private retryDelay;
    private config;
    private callbacks;
    context: LoaderContext | null;
    private loader;
    stats: LoaderStats;
    constructor(config: HlsConfig);
    destroy(): void;
    abortInternal(): void;
    abort(): void;
    load(context: LoaderContext, config: LoaderConfiguration, callbacks: LoaderCallbacks<LoaderContext>): void;
    loadInternal(): void;
    openAndSendXhr(xhr: XMLHttpRequest, context: LoaderContext, config: LoaderConfiguration): void;
    readystatechange(): void;
    loadtimeout(): void;
    retry(retryConfig: RetryConfig): void;
    loadprogress(event: ProgressEvent): void;
    getCacheAge(): number | null;
    getResponseHeader(name: string): string | null;
}

export { }
