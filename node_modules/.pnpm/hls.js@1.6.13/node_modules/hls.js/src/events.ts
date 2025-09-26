import type {
  AssetListLoadedData,
  AssetListLoadingData,
  AudioTrackLoadedData,
  AudioTracksUpdatedData,
  AudioTrackSwitchedData,
  AudioTrackSwitchingData,
  AudioTrackUpdatedData,
  BackBufferData,
  BufferAppendedData,
  BufferAppendingData,
  BufferCodecsData,
  BufferCreatedData,
  BufferEOSData,
  BufferFlushedData,
  BufferFlushingData,
  CuesParsedData,
  ErrorData,
  FPSDropData,
  FPSDropLevelCappingData,
  FragBufferedData,
  FragChangedData,
  FragDecryptedData,
  FragLoadedData,
  FragLoadEmergencyAbortedData,
  FragLoadingData,
  FragParsedData,
  FragParsingInitSegmentData,
  FragParsingMetadataData,
  FragParsingUserdataData,
  InitPTSFoundData,
  InterstitialAssetEndedData,
  InterstitialAssetErrorData,
  InterstitialAssetPlayerCreatedData,
  InterstitialAssetStartedData,
  InterstitialEndedData,
  InterstitialsBufferedToBoundaryData,
  InterstitialsPrimaryResumed,
  InterstitialStartedData,
  InterstitialsUpdatedData,
  KeyLoadedData,
  KeyLoadingData,
  LevelLoadedData,
  LevelLoadingData,
  LevelPTSUpdatedData,
  LevelsUpdatedData,
  LevelSwitchedData,
  LevelSwitchingData,
  LevelUpdatedData,
  LiveBackBufferData,
  ManifestLoadedData,
  ManifestLoadingData,
  ManifestParsedData,
  MaxAutoLevelUpdatedData,
  MediaAttachedData,
  MediaAttachingData,
  MediaDetachedData,
  MediaDetachingData,
  MediaEndedData,
  NonNativeTextTracksData,
  SteeringManifestLoadedData,
  SubtitleFragProcessedData,
  SubtitleTrackLoadedData,
  SubtitleTracksUpdatedData,
  SubtitleTrackSwitchData,
  SubtitleTrackUpdatedData,
  TrackLoadingData,
} from './types/events';

export enum Events {
  // Fired before MediaSource is attaching to media element
  MEDIA_ATTACHING = 'hlsMediaAttaching',
  // Fired when MediaSource has been successfully attached to media element
  MEDIA_ATTACHED = 'hlsMediaAttached',
  // Fired before detaching MediaSource from media element
  MEDIA_DETACHING = 'hlsMediaDetaching',
  // Fired when MediaSource has been detached from media element
  MEDIA_DETACHED = 'hlsMediaDetached',
  // Fired when HTMLMediaElement dispatches "ended" event, or stalls at end of VOD program
  MEDIA_ENDED = 'hlsMediaEnded',
  // Fired after playback stall is resolved with playing, seeked, or ended event following BUFFER_STALLED_ERROR
  STALL_RESOLVED = 'hlsStallResolved',
  // Fired when the buffer is going to be reset
  BUFFER_RESET = 'hlsBufferReset',
  // Fired when we know about the codecs that we need buffers for to push into - data: {tracks : { container, codec, levelCodec, initSegment, metadata }}
  BUFFER_CODECS = 'hlsBufferCodecs',
  // fired when sourcebuffers have been created - data: { tracks : tracks }
  BUFFER_CREATED = 'hlsBufferCreated',
  // fired when we append a segment to the buffer - data: { segment: segment object }
  BUFFER_APPENDING = 'hlsBufferAppending',
  // fired when we are done with appending a media segment to the buffer - data : { parent : segment parent that triggered BUFFER_APPENDING, pending : nb of segments waiting for appending for this segment parent}
  BUFFER_APPENDED = 'hlsBufferAppended',
  // fired when the stream is finished and we want to notify the media buffer that there will be no more data - data: { }
  BUFFER_EOS = 'hlsBufferEos',
  // fired when all buffers are full to the end of the program, after calling MediaSource.endOfStream() (unless restricted)
  BUFFERED_TO_END = 'hlsBufferedToEnd',
  // fired when the media buffer should be flushed - data { startOffset, endOffset }
  BUFFER_FLUSHING = 'hlsBufferFlushing',
  // fired when the media buffer has been flushed - data: { }
  BUFFER_FLUSHED = 'hlsBufferFlushed',
  // fired to signal that a manifest loading starts - data: { url : manifestURL}
  MANIFEST_LOADING = 'hlsManifestLoading',
  // fired after manifest has been loaded - data: { levels : [available quality levels], audioTracks : [ available audio tracks ], url : manifestURL, stats : LoaderStats }
  MANIFEST_LOADED = 'hlsManifestLoaded',
  // fired after manifest has been parsed - data: { levels : [available quality levels], firstLevel : index of first quality level appearing in Manifest}
  MANIFEST_PARSED = 'hlsManifestParsed',
  // fired when a level switch is requested - data: { level : id of new level }
  LEVEL_SWITCHING = 'hlsLevelSwitching',
  // fired when a level switch is effective - data: { level : id of new level }
  LEVEL_SWITCHED = 'hlsLevelSwitched',
  // fired when a level playlist loading starts - data: { url : level URL, level : id of level being loaded}
  LEVEL_LOADING = 'hlsLevelLoading',
  // fired when a level playlist loading finishes - data: { details : levelDetails object, level : id of loaded level, stats : LoaderStats }
  LEVEL_LOADED = 'hlsLevelLoaded',
  // fired when a level's details have been updated based on previous details, after it has been loaded - data: { details : levelDetails object, level : id of updated level }
  LEVEL_UPDATED = 'hlsLevelUpdated',
  // fired when a level's PTS information has been updated after parsing a fragment - data: { details : levelDetails object, level : id of updated level, drift: PTS drift observed when parsing last fragment }
  LEVEL_PTS_UPDATED = 'hlsLevelPtsUpdated',
  // fired to notify that levels have changed after removing a level - data: { levels : [available quality levels] }
  LEVELS_UPDATED = 'hlsLevelsUpdated',
  // fired to notify that audio track lists has been updated - data: { audioTracks : audioTracks }
  AUDIO_TRACKS_UPDATED = 'hlsAudioTracksUpdated',
  // fired when an audio track switching is requested - data: { id : audio track id }
  AUDIO_TRACK_SWITCHING = 'hlsAudioTrackSwitching',
  // fired when an audio track switch actually occurs - data: { id : audio track id }
  AUDIO_TRACK_SWITCHED = 'hlsAudioTrackSwitched',
  // fired when an audio track loading starts - data: { url : audio track URL, id : audio track id }
  AUDIO_TRACK_LOADING = 'hlsAudioTrackLoading',
  // fired when an audio track loading finishes - data: { details : levelDetails object, id : audio track id, stats : LoaderStats }
  AUDIO_TRACK_LOADED = 'hlsAudioTrackLoaded',
  // fired when an audio tracks's details have been updated based on previous details, after it has been loaded - data: { details : levelDetails object, id : track id }
  AUDIO_TRACK_UPDATED = 'hlsAudioTrackUpdated',
  // fired to notify that subtitle track lists has been updated - data: { subtitleTracks : subtitleTracks }
  SUBTITLE_TRACKS_UPDATED = 'hlsSubtitleTracksUpdated',
  // fired to notify that subtitle tracks were cleared as a result of stopping the media
  SUBTITLE_TRACKS_CLEARED = 'hlsSubtitleTracksCleared',
  // fired when an subtitle track switch occurs - data: { id : subtitle track id }
  SUBTITLE_TRACK_SWITCH = 'hlsSubtitleTrackSwitch',
  // fired when a subtitle track loading starts - data: { url : subtitle track URL, id : subtitle track id }
  SUBTITLE_TRACK_LOADING = 'hlsSubtitleTrackLoading',
  // fired when a subtitle track loading finishes - data: { details : levelDetails object, id : subtitle track id, stats : LoaderStats }
  SUBTITLE_TRACK_LOADED = 'hlsSubtitleTrackLoaded',
  // fired when a subtitle  racks's details have been updated based on previous details, after it has been loaded - data: { details : levelDetails object, id : track id }
  SUBTITLE_TRACK_UPDATED = 'hlsSubtitleTrackUpdated',
  // fired when a subtitle fragment has been processed - data: { success : boolean, frag : the processed frag }
  SUBTITLE_FRAG_PROCESSED = 'hlsSubtitleFragProcessed',
  // fired when a set of VTTCues to be managed externally has been parsed - data: { type: string, track: string, cues: [ VTTCue ] }
  CUES_PARSED = 'hlsCuesParsed',
  // fired when a text track to be managed externally is found - data: { tracks: [ { label: string, kind: string, default: boolean } ] }
  NON_NATIVE_TEXT_TRACKS_FOUND = 'hlsNonNativeTextTracksFound',
  // fired when the first timestamp is found - data: { id : demuxer id, initPTS: initPTS, timescale: timescale, frag : fragment object }
  INIT_PTS_FOUND = 'hlsInitPtsFound',
  // fired when a fragment loading starts - data: { frag : fragment object }
  FRAG_LOADING = 'hlsFragLoading',
  // fired when a fragment loading is progressing - data: { frag : fragment object, { trequest, tfirst, loaded } }
  // FRAG_LOAD_PROGRESS = 'hlsFragLoadProgress',
  // Identifier for fragment load aborting for emergency switch down - data: { frag : fragment object }
  FRAG_LOAD_EMERGENCY_ABORTED = 'hlsFragLoadEmergencyAborted',
  // fired when a fragment loading is completed - data: { frag : fragment object, payload : fragment payload, stats : LoaderStats }
  FRAG_LOADED = 'hlsFragLoaded',
  // fired when a fragment has finished decrypting - data: { id : demuxer id, frag: fragment object, payload : fragment payload, stats : { tstart, tdecrypt } }
  FRAG_DECRYPTED = 'hlsFragDecrypted',
  // fired when Init Segment has been extracted from fragment - data: { id : demuxer id, frag: fragment object, moov : moov MP4 box, codecs : codecs found while parsing fragment }
  FRAG_PARSING_INIT_SEGMENT = 'hlsFragParsingInitSegment',
  // fired when parsing sei text is completed - data: { id : demuxer id, frag: fragment object, samples : [ sei samples pes ] }
  FRAG_PARSING_USERDATA = 'hlsFragParsingUserdata',
  // fired when parsing id3 is completed - data: { id : demuxer id, frag: fragment object, samples : [ id3 samples pes ] }
  FRAG_PARSING_METADATA = 'hlsFragParsingMetadata',
  // fired when data have been extracted from fragment - data: { id : demuxer id, frag: fragment object, data1 : moof MP4 box or TS fragments, data2 : mdat MP4 box or null}
  // FRAG_PARSING_DATA = 'hlsFragParsingData',
  // fired when fragment parsing is completed - data: { id : demuxer id, frag: fragment object }
  FRAG_PARSED = 'hlsFragParsed',
  // fired when fragment remuxed MP4 boxes have all been appended into SourceBuffer - data: { id : demuxer id, frag : fragment object, stats : LoaderStats }
  FRAG_BUFFERED = 'hlsFragBuffered',
  // fired when fragment matching with current media position is changing - data : { id : demuxer id, frag : fragment object }
  FRAG_CHANGED = 'hlsFragChanged',
  // Identifier for a FPS drop event - data: { currentDropped, currentDecoded, totalDroppedFrames }
  FPS_DROP = 'hlsFpsDrop',
  // triggered when FPS drop triggers auto level capping - data: { level, droppedLevel }
  FPS_DROP_LEVEL_CAPPING = 'hlsFpsDropLevelCapping',
  // triggered when maxAutoLevel changes - data { autoLevelCapping, levels, maxAutoLevel, minAutoLevel, maxHdcpLevel }
  MAX_AUTO_LEVEL_UPDATED = 'hlsMaxAutoLevelUpdated',
  // Identifier for an error event - data: { type : error type, details : error details, fatal : if true, hls.js cannot/will not try to recover, if false, hls.js will try to recover,other error specific data }
  ERROR = 'hlsError',
  // fired when hls.js instance starts destroying. Different from MEDIA_DETACHED as one could want to detach and reattach a media to the instance of hls.js to handle mid-rolls for example - data: { }
  DESTROYING = 'hlsDestroying',
  // fired when a decrypt key loading starts - data: { frag : fragment object }
  KEY_LOADING = 'hlsKeyLoading',
  // fired when a decrypt key loading is completed - data: { frag : fragment object, keyInfo : KeyLoaderInfo }
  KEY_LOADED = 'hlsKeyLoaded',
  // deprecated; please use BACK_BUFFER_REACHED - data : { bufferEnd: number }
  LIVE_BACK_BUFFER_REACHED = 'hlsLiveBackBufferReached',
  // fired when the back buffer is reached as defined by the backBufferLength config option - data : { bufferEnd: number }
  BACK_BUFFER_REACHED = 'hlsBackBufferReached',
  // fired after steering manifest has been loaded - data: { steeringManifest: SteeringManifest object, url: steering manifest URL }
  STEERING_MANIFEST_LOADED = 'hlsSteeringManifestLoaded',
  // fired when asset list has begun loading
  ASSET_LIST_LOADING = 'hlsAssetListLoading',
  // fired when a valid asset list is loaded
  ASSET_LIST_LOADED = 'hlsAssetListLoaded',
  // fired when the list of Interstitial Events and Interstitial Schedule is updated
  INTERSTITIALS_UPDATED = 'hlsInterstitialsUpdated',
  // fired when the buffer reaches an Interstitial Schedule boundary (both Primary segments and Interstitial Assets)
  INTERSTITIALS_BUFFERED_TO_BOUNDARY = 'hlsInterstitialsBufferedToBoundary',
  // fired when a player instance for an Interstitial Asset has been created
  INTERSTITIAL_ASSET_PLAYER_CREATED = 'hlsInterstitialAssetPlayerCreated',
  // Interstitial playback started
  INTERSTITIAL_STARTED = 'hlsInterstitialStarted',
  // InterstitialAsset playback started
  INTERSTITIAL_ASSET_STARTED = 'hlsInterstitialAssetStarted',
  // InterstitialAsset playback ended
  INTERSTITIAL_ASSET_ENDED = 'hlsInterstitialAssetEnded',
  // InterstitialAsset playback errored
  INTERSTITIAL_ASSET_ERROR = 'hlsInterstitialAssetError',
  // Interstitial playback ended
  INTERSTITIAL_ENDED = 'hlsInterstitialEnded',
  // Interstitial schedule resumed primary playback
  INTERSTITIALS_PRIMARY_RESUMED = 'hlsInterstitialsPrimaryResumed',
  // Interstitial players dispatch this event when playout limit is reached
  PLAYOUT_LIMIT_REACHED = 'hlsPlayoutLimitReached',
  // Event DateRange cue "enter" event dispatched
  EVENT_CUE_ENTER = 'hlsEventCueEnter',
}

/**
 * Defines each Event type and payload by Event name. Used in {@link hls.js#HlsEventEmitter} to strongly type the event listener API.
 */
export interface HlsListeners {
  [Events.MEDIA_ATTACHING]: (
    event: Events.MEDIA_ATTACHING,
    data: MediaAttachingData,
  ) => void;
  [Events.MEDIA_ATTACHED]: (
    event: Events.MEDIA_ATTACHED,
    data: MediaAttachedData,
  ) => void;
  [Events.MEDIA_DETACHING]: (
    event: Events.MEDIA_DETACHING,
    data: MediaDetachingData,
  ) => void;
  [Events.MEDIA_DETACHED]: (
    event: Events.MEDIA_DETACHED,
    data: MediaDetachedData,
  ) => void;
  [Events.MEDIA_ENDED]: (
    event: Events.MEDIA_ENDED,
    data: MediaEndedData,
  ) => void;
  [Events.STALL_RESOLVED]: (event: Events.STALL_RESOLVED, data: {}) => void;
  [Events.BUFFER_RESET]: (event: Events.BUFFER_RESET) => void;
  [Events.BUFFER_CODECS]: (
    event: Events.BUFFER_CODECS,
    data: BufferCodecsData,
  ) => void;
  [Events.BUFFER_CREATED]: (
    event: Events.BUFFER_CREATED,
    data: BufferCreatedData,
  ) => void;
  [Events.BUFFER_APPENDING]: (
    event: Events.BUFFER_APPENDING,
    data: BufferAppendingData,
  ) => void;
  [Events.BUFFER_APPENDED]: (
    event: Events.BUFFER_APPENDED,
    data: BufferAppendedData,
  ) => void;
  [Events.BUFFER_EOS]: (event: Events.BUFFER_EOS, data: BufferEOSData) => void;
  [Events.BUFFERED_TO_END]: (event: Events.BUFFERED_TO_END) => void;
  [Events.BUFFER_FLUSHING]: (
    event: Events.BUFFER_FLUSHING,
    data: BufferFlushingData,
  ) => void;
  [Events.BUFFER_FLUSHED]: (
    event: Events.BUFFER_FLUSHED,
    data: BufferFlushedData,
  ) => void;
  [Events.MANIFEST_LOADING]: (
    event: Events.MANIFEST_LOADING,
    data: ManifestLoadingData,
  ) => void;
  [Events.MANIFEST_LOADED]: (
    event: Events.MANIFEST_LOADED,
    data: ManifestLoadedData,
  ) => void;
  [Events.MANIFEST_PARSED]: (
    event: Events.MANIFEST_PARSED,
    data: ManifestParsedData,
  ) => void;
  [Events.LEVEL_SWITCHING]: (
    event: Events.LEVEL_SWITCHING,
    data: LevelSwitchingData,
  ) => void;
  [Events.LEVEL_SWITCHED]: (
    event: Events.LEVEL_SWITCHED,
    data: LevelSwitchedData,
  ) => void;
  [Events.LEVEL_LOADING]: (
    event: Events.LEVEL_LOADING,
    data: LevelLoadingData,
  ) => void;
  [Events.LEVEL_LOADED]: (
    event: Events.LEVEL_LOADED,
    data: LevelLoadedData,
  ) => void;
  [Events.LEVEL_UPDATED]: (
    event: Events.LEVEL_UPDATED,
    data: LevelUpdatedData,
  ) => void;
  [Events.LEVEL_PTS_UPDATED]: (
    event: Events.LEVEL_PTS_UPDATED,
    data: LevelPTSUpdatedData,
  ) => void;
  [Events.LEVELS_UPDATED]: (
    event: Events.LEVELS_UPDATED,
    data: LevelsUpdatedData,
  ) => void;
  [Events.AUDIO_TRACKS_UPDATED]: (
    event: Events.AUDIO_TRACKS_UPDATED,
    data: AudioTracksUpdatedData,
  ) => void;
  [Events.AUDIO_TRACK_SWITCHING]: (
    event: Events.AUDIO_TRACK_SWITCHING,
    data: AudioTrackSwitchingData,
  ) => void;
  [Events.AUDIO_TRACK_SWITCHED]: (
    event: Events.AUDIO_TRACK_SWITCHED,
    data: AudioTrackSwitchedData,
  ) => void;
  [Events.AUDIO_TRACK_LOADING]: (
    event: Events.AUDIO_TRACK_LOADING,
    data: TrackLoadingData,
  ) => void;
  [Events.AUDIO_TRACK_LOADED]: (
    event: Events.AUDIO_TRACK_LOADED,
    data: AudioTrackLoadedData,
  ) => void;
  [Events.AUDIO_TRACK_UPDATED]: (
    event: Events.AUDIO_TRACK_UPDATED,
    data: AudioTrackUpdatedData,
  ) => void;
  [Events.SUBTITLE_TRACKS_UPDATED]: (
    event: Events.SUBTITLE_TRACKS_UPDATED,
    data: SubtitleTracksUpdatedData,
  ) => void;
  [Events.SUBTITLE_TRACKS_CLEARED]: (
    event: Events.SUBTITLE_TRACKS_CLEARED,
  ) => void;
  [Events.SUBTITLE_TRACK_SWITCH]: (
    event: Events.SUBTITLE_TRACK_SWITCH,
    data: SubtitleTrackSwitchData,
  ) => void;
  [Events.SUBTITLE_TRACK_LOADING]: (
    event: Events.SUBTITLE_TRACK_LOADING,
    data: TrackLoadingData,
  ) => void;
  [Events.SUBTITLE_TRACK_LOADED]: (
    event: Events.SUBTITLE_TRACK_LOADED,
    data: SubtitleTrackLoadedData,
  ) => void;
  [Events.SUBTITLE_TRACK_UPDATED]: (
    event: Events.SUBTITLE_TRACK_UPDATED,
    data: SubtitleTrackUpdatedData,
  ) => void;
  [Events.SUBTITLE_FRAG_PROCESSED]: (
    event: Events.SUBTITLE_FRAG_PROCESSED,
    data: SubtitleFragProcessedData,
  ) => void;
  [Events.CUES_PARSED]: (
    event: Events.CUES_PARSED,
    data: CuesParsedData,
  ) => void;
  [Events.NON_NATIVE_TEXT_TRACKS_FOUND]: (
    event: Events.NON_NATIVE_TEXT_TRACKS_FOUND,
    data: NonNativeTextTracksData,
  ) => void;
  [Events.INIT_PTS_FOUND]: (
    event: Events.INIT_PTS_FOUND,
    data: InitPTSFoundData,
  ) => void;
  [Events.FRAG_LOADING]: (
    event: Events.FRAG_LOADING,
    data: FragLoadingData,
  ) => void;
  // [Events.FRAG_LOAD_PROGRESS]: TodoEventType
  [Events.FRAG_LOAD_EMERGENCY_ABORTED]: (
    event: Events.FRAG_LOAD_EMERGENCY_ABORTED,
    data: FragLoadEmergencyAbortedData,
  ) => void;
  [Events.FRAG_LOADED]: (
    event: Events.FRAG_LOADED,
    data: FragLoadedData,
  ) => void;
  [Events.FRAG_DECRYPTED]: (
    event: Events.FRAG_DECRYPTED,
    data: FragDecryptedData,
  ) => void;
  [Events.FRAG_PARSING_INIT_SEGMENT]: (
    event: Events.FRAG_PARSING_INIT_SEGMENT,
    data: FragParsingInitSegmentData,
  ) => void;
  [Events.FRAG_PARSING_USERDATA]: (
    event: Events.FRAG_PARSING_USERDATA,
    data: FragParsingUserdataData,
  ) => void;
  [Events.FRAG_PARSING_METADATA]: (
    event: Events.FRAG_PARSING_METADATA,
    data: FragParsingMetadataData,
  ) => void;
  // [Events.FRAG_PARSING_DATA]: TodoEventType
  [Events.FRAG_PARSED]: (
    event: Events.FRAG_PARSED,
    data: FragParsedData,
  ) => void;
  [Events.FRAG_BUFFERED]: (
    event: Events.FRAG_BUFFERED,
    data: FragBufferedData,
  ) => void;
  [Events.FRAG_CHANGED]: (
    event: Events.FRAG_CHANGED,
    data: FragChangedData,
  ) => void;
  [Events.FPS_DROP]: (event: Events.FPS_DROP, data: FPSDropData) => void;
  [Events.FPS_DROP_LEVEL_CAPPING]: (
    event: Events.FPS_DROP_LEVEL_CAPPING,
    data: FPSDropLevelCappingData,
  ) => void;
  [Events.MAX_AUTO_LEVEL_UPDATED]: (
    event: Events.MAX_AUTO_LEVEL_UPDATED,
    data: MaxAutoLevelUpdatedData,
  ) => void;
  [Events.ERROR]: (event: Events.ERROR, data: ErrorData) => void;
  [Events.DESTROYING]: (event: Events.DESTROYING) => void;
  [Events.KEY_LOADING]: (
    event: Events.KEY_LOADING,
    data: KeyLoadingData,
  ) => void;
  [Events.KEY_LOADED]: (event: Events.KEY_LOADED, data: KeyLoadedData) => void;
  [Events.LIVE_BACK_BUFFER_REACHED]: (
    event: Events.LIVE_BACK_BUFFER_REACHED,
    data: LiveBackBufferData,
  ) => void;
  [Events.BACK_BUFFER_REACHED]: (
    event: Events.BACK_BUFFER_REACHED,
    data: BackBufferData,
  ) => void;
  [Events.STEERING_MANIFEST_LOADED]: (
    event: Events.STEERING_MANIFEST_LOADED,
    data: SteeringManifestLoadedData,
  ) => void;
  [Events.ASSET_LIST_LOADING]: (
    event: Events.ASSET_LIST_LOADING,
    data: AssetListLoadingData,
  ) => void;
  [Events.ASSET_LIST_LOADED]: (
    event: Events.ASSET_LIST_LOADED,
    data: AssetListLoadedData,
  ) => void;
  [Events.INTERSTITIALS_UPDATED]: (
    event: Events.INTERSTITIALS_UPDATED,
    data: InterstitialsUpdatedData,
  ) => void;
  [Events.INTERSTITIALS_BUFFERED_TO_BOUNDARY]: (
    event: Events.INTERSTITIALS_BUFFERED_TO_BOUNDARY,
    data: InterstitialsBufferedToBoundaryData,
  ) => void;
  [Events.INTERSTITIAL_ASSET_PLAYER_CREATED]: (
    event: Events.INTERSTITIAL_ASSET_PLAYER_CREATED,
    data: InterstitialAssetPlayerCreatedData,
  ) => void;
  [Events.INTERSTITIAL_STARTED]: (
    event: Events.INTERSTITIAL_STARTED,
    data: InterstitialStartedData,
  ) => void;
  [Events.INTERSTITIAL_ASSET_STARTED]: (
    event: Events.INTERSTITIAL_ASSET_STARTED,
    data: InterstitialAssetStartedData,
  ) => void;
  [Events.INTERSTITIAL_ASSET_ENDED]: (
    event: Events.INTERSTITIAL_ASSET_ENDED,
    data: InterstitialAssetEndedData,
  ) => void;
  [Events.INTERSTITIAL_ASSET_ERROR]: (
    event: Events.INTERSTITIAL_ASSET_ERROR,
    data: InterstitialAssetErrorData,
  ) => void;
  [Events.INTERSTITIAL_ENDED]: (
    event: Events.INTERSTITIAL_ENDED,
    data: InterstitialEndedData,
  ) => void;
  [Events.INTERSTITIALS_PRIMARY_RESUMED]: (
    event: Events.INTERSTITIALS_PRIMARY_RESUMED,
    data: InterstitialsPrimaryResumed,
  ) => void;
  [Events.PLAYOUT_LIMIT_REACHED]: (
    event: Events.PLAYOUT_LIMIT_REACHED,
    data: {},
  ) => void;
  [Events.EVENT_CUE_ENTER]: (event: Events.EVENT_CUE_ENTER, data: {}) => void;
}
export interface HlsEventEmitter {
  on<E extends keyof HlsListeners, Context = undefined>(
    event: E,
    listener: HlsListeners[E],
    context?: Context,
  ): void;
  once<E extends keyof HlsListeners, Context = undefined>(
    event: E,
    listener: HlsListeners[E],
    context?: Context,
  ): void;

  removeAllListeners<E extends keyof HlsListeners>(event?: E): void;
  off<E extends keyof HlsListeners, Context = undefined>(
    event: E,
    listener?: HlsListeners[E],
    context?: Context,
    once?: boolean,
  ): void;

  listeners<E extends keyof HlsListeners>(event: E): HlsListeners[E][];
  emit<E extends keyof HlsListeners>(
    event: E,
    name: E,
    eventObject: Parameters<HlsListeners[E]>[1],
  ): boolean;
  listenerCount<E extends keyof HlsListeners>(event: E): number;
}
