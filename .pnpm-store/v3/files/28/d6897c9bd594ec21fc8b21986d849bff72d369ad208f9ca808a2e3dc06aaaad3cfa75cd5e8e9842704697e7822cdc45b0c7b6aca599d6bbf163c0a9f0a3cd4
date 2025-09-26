import { uuid } from '@svta/common-media-library/utils/uuid';
import { EventEmitter } from 'eventemitter3';
import { buildAbsoluteURL } from 'url-toolkit';
import { enableStreamingMode, hlsDefaultConfig, mergeConfig } from './config';
import { FragmentTracker } from './controller/fragment-tracker';
import GapController from './controller/gap-controller';
import ID3TrackController from './controller/id3-track-controller';
import LatencyController from './controller/latency-controller';
import LevelController from './controller/level-controller';
import StreamController from './controller/stream-controller';
import { ErrorDetails, ErrorTypes } from './errors';
import { Events } from './events';
import { isMSESupported, isSupported } from './is-supported';
import KeyLoader from './loader/key-loader';
import PlaylistLoader from './loader/playlist-loader';
import { MetadataSchema } from './types/demuxer';
import { type HdcpLevel, isHdcpLevel, type Level } from './types/level';
import { PlaylistLevelType } from './types/loader';
import { enableLogs, type ILogger } from './utils/logger';
import { getMediaDecodingInfoPromise } from './utils/mediacapabilities-helper';
import { getMediaSource } from './utils/mediasource-helper';
import { getAudioTracksByGroup } from './utils/rendition-helper';
import { version } from './version';
import type { HlsConfig } from './config';
import type AbrController from './controller/abr-controller';
import type AudioStreamController from './controller/audio-stream-controller';
import type AudioTrackController from './controller/audio-track-controller';
import type BasePlaylistController from './controller/base-playlist-controller';
import type { InFlightData, State } from './controller/base-stream-controller';
import type BaseStreamController from './controller/base-stream-controller';
import type BufferController from './controller/buffer-controller';
import type CapLevelController from './controller/cap-level-controller';
import type CMCDController from './controller/cmcd-controller';
import type ContentSteeringController from './controller/content-steering-controller';
import type EMEController from './controller/eme-controller';
import type ErrorController from './controller/error-controller';
import type FPSController from './controller/fps-controller';
import type InterstitialsController from './controller/interstitials-controller';
import type { InterstitialsManager } from './controller/interstitials-controller';
import type { SubtitleStreamController } from './controller/subtitle-stream-controller';
import type SubtitleTrackController from './controller/subtitle-track-controller';
import type Decrypter from './crypt/decrypter';
import type TransmuxerInterface from './demux/transmuxer-interface';
import type { HlsEventEmitter, HlsListeners } from './events';
import type FragmentLoader from './loader/fragment-loader';
import type { LevelDetails } from './loader/level-details';
import type M3U8Parser from './loader/m3u8-parser';
import type TaskLoop from './task-loop';
import type { AttachMediaSourceData } from './types/buffer';
import type {
  AbrComponentAPI,
  ComponentAPI,
  NetworkComponentAPI,
} from './types/component-api';
import type { MediaAttachingData } from './types/events';
import type {
  AudioSelectionOption,
  MediaPlaylist,
  SubtitleSelectionOption,
  VideoSelectionOption,
} from './types/media-playlist';
import type { BufferInfo, BufferTimeRange } from './utils/buffer-helper';
import type Cues from './utils/cues';
import type EwmaBandWidthEstimator from './utils/ewma-bandwidth-estimator';
import type FetchLoader from './utils/fetch-loader';
import type { MediaDecodingInfo } from './utils/mediacapabilities-helper';
import type XhrLoader from './utils/xhr-loader';

/**
 * The `Hls` class is the core of the HLS.js library used to instantiate player instances.
 * @public
 */
export default class Hls implements HlsEventEmitter {
  private static defaultConfig: HlsConfig | undefined;

  /**
   * The runtime configuration used by the player. At instantiation this is combination of `hls.userConfig` merged over `Hls.DefaultConfig`.
   */
  public readonly config: HlsConfig;

  /**
   * The configuration object provided on player instantiation.
   */
  public readonly userConfig: Partial<HlsConfig>;

  /**
   * The logger functions used by this player instance, configured on player instantiation.
   */
  public readonly logger: ILogger;

  private coreComponents: ComponentAPI[];
  private networkControllers: NetworkComponentAPI[];
  private _emitter: HlsEventEmitter = new EventEmitter();
  private _autoLevelCapping: number = -1;
  private _maxHdcpLevel: HdcpLevel = null;
  private abrController: AbrComponentAPI;
  private bufferController: BufferController;
  private capLevelController: CapLevelController;
  private latencyController: LatencyController;
  private levelController: LevelController;
  private streamController: StreamController;
  private audioStreamController?: AudioStreamController;
  private subtititleStreamController?: SubtitleStreamController;
  private audioTrackController?: AudioTrackController;
  private subtitleTrackController?: SubtitleTrackController;
  private interstitialsController?: InterstitialsController;
  private gapController: GapController;
  private emeController?: EMEController;
  private cmcdController?: CMCDController;
  private _media: HTMLMediaElement | null = null;
  private _url: string | null = null;
  private _sessionId?: string;
  private triggeringException?: boolean;
  private started: boolean = false;

  /**
   * Get the video-dev/hls.js package version.
   */
  static get version(): string {
    return version;
  }

  /**
   * Check if the required MediaSource Extensions are available.
   */
  static isMSESupported(): boolean {
    return isMSESupported();
  }

  /**
   * Check if MediaSource Extensions are available and isTypeSupported checks pass for any baseline codecs.
   */
  static isSupported(): boolean {
    return isSupported();
  }

  /**
   * Get the MediaSource global used for MSE playback (ManagedMediaSource, MediaSource, or WebKitMediaSource).
   */
  static getMediaSource(): typeof MediaSource | undefined {
    return getMediaSource();
  }

  static get Events(): typeof Events {
    return Events;
  }

  static get MetadataSchema(): typeof MetadataSchema {
    return MetadataSchema;
  }

  static get ErrorTypes(): typeof ErrorTypes {
    return ErrorTypes;
  }

  static get ErrorDetails(): typeof ErrorDetails {
    return ErrorDetails;
  }

  /**
   * Get the default configuration applied to new instances.
   */
  static get DefaultConfig(): HlsConfig {
    if (!Hls.defaultConfig) {
      return hlsDefaultConfig;
    }

    return Hls.defaultConfig;
  }

  /**
   * Replace the default configuration applied to new instances.
   */
  static set DefaultConfig(defaultConfig: HlsConfig) {
    Hls.defaultConfig = defaultConfig;
  }

  /**
   * Creates an instance of an HLS client that can attach to exactly one `HTMLMediaElement`.
   * @param userConfig - Configuration options applied over `Hls.DefaultConfig`
   */
  constructor(userConfig: Partial<HlsConfig> = {}) {
    const logger = (this.logger = enableLogs(
      userConfig.debug || false,
      'Hls instance',
      userConfig.assetPlayerId,
    ));
    const config = (this.config = mergeConfig(
      Hls.DefaultConfig,
      userConfig,
      logger,
    ));
    this.userConfig = userConfig;

    if (config.progressive) {
      enableStreamingMode(config, logger);
    }

    // core controllers and network loaders
    const {
      abrController: _AbrController,
      bufferController: _BufferController,
      capLevelController: _CapLevelController,
      errorController: _ErrorController,
      fpsController: _FpsController,
    } = config;
    const errorController = new _ErrorController(this);
    const abrController = (this.abrController = new _AbrController(this));
    // FragmentTracker must be defined before StreamController because the order of event handling is important
    const fragmentTracker = new FragmentTracker(this);
    const _InterstitialsController = config.interstitialsController;
    const interstitialsController = _InterstitialsController
      ? (this.interstitialsController = new _InterstitialsController(this, Hls))
      : null;
    const bufferController = (this.bufferController = new _BufferController(
      this,
      fragmentTracker,
    ));
    const capLevelController = (this.capLevelController =
      new _CapLevelController(this));

    const fpsController = new _FpsController(this);
    const playListLoader = new PlaylistLoader(this);

    const _ContentSteeringController = config.contentSteeringController;
    // Instantiate ConentSteeringController before LevelController to receive Multivariant Playlist events first
    const contentSteering = _ContentSteeringController
      ? new _ContentSteeringController(this)
      : null;
    const levelController = (this.levelController = new LevelController(
      this,
      contentSteering,
    ));

    const id3TrackController = new ID3TrackController(this);
    const keyLoader = new KeyLoader(this.config, this.logger);
    const streamController = (this.streamController = new StreamController(
      this,
      fragmentTracker,
      keyLoader,
    ));

    const gapController = (this.gapController = new GapController(
      this,
      fragmentTracker,
    ));

    // Cap level controller uses streamController to flush the buffer
    capLevelController.setStreamController(streamController);
    // fpsController uses streamController to switch when frames are being dropped
    fpsController.setStreamController(streamController);

    const networkControllers: NetworkComponentAPI[] = [
      playListLoader,
      levelController,
      streamController,
    ];
    if (interstitialsController) {
      networkControllers.splice(1, 0, interstitialsController);
    }
    if (contentSteering) {
      networkControllers.splice(1, 0, contentSteering);
    }

    this.networkControllers = networkControllers;
    const coreComponents: ComponentAPI[] = [
      abrController,
      bufferController,
      gapController,
      capLevelController,
      fpsController,
      id3TrackController,
      fragmentTracker,
    ];

    this.audioTrackController = this.createController(
      config.audioTrackController,
      networkControllers,
    );
    const AudioStreamControllerClass = config.audioStreamController;
    if (AudioStreamControllerClass) {
      networkControllers.push(
        (this.audioStreamController = new AudioStreamControllerClass(
          this,
          fragmentTracker,
          keyLoader,
        )),
      );
    }
    // Instantiate subtitleTrackController before SubtitleStreamController to receive level events first
    this.subtitleTrackController = this.createController(
      config.subtitleTrackController,
      networkControllers,
    );
    const SubtitleStreamControllerClass = config.subtitleStreamController;
    if (SubtitleStreamControllerClass) {
      networkControllers.push(
        (this.subtititleStreamController = new SubtitleStreamControllerClass(
          this,
          fragmentTracker,
          keyLoader,
        )),
      );
    }
    this.createController(config.timelineController, coreComponents);
    keyLoader.emeController = this.emeController = this.createController(
      config.emeController,
      coreComponents,
    );
    this.cmcdController = this.createController(
      config.cmcdController,
      coreComponents,
    );
    this.latencyController = this.createController(
      LatencyController,
      coreComponents,
    );

    this.coreComponents = coreComponents;

    // Error controller handles errors before and after all other controllers
    // This listener will be invoked after all other controllers error listeners
    networkControllers.push(errorController);
    const onErrorOut = errorController.onErrorOut;
    if (typeof onErrorOut === 'function') {
      this.on(Events.ERROR, onErrorOut, errorController);
    }
    // Autostart load handler
    this.on(
      Events.MANIFEST_LOADED,
      playListLoader.onManifestLoaded,
      playListLoader,
    );
  }

  createController(ControllerClass, components) {
    if (ControllerClass) {
      const controllerInstance = new ControllerClass(this);
      if (components) {
        components.push(controllerInstance);
      }
      return controllerInstance;
    }
    return null;
  }

  // Delegate the EventEmitter through the public API of Hls.js
  on<E extends keyof HlsListeners, Context = undefined>(
    event: E,
    listener: HlsListeners[E],
    context: Context = this as any,
  ) {
    this._emitter.on(event, listener, context);
  }

  once<E extends keyof HlsListeners, Context = undefined>(
    event: E,
    listener: HlsListeners[E],
    context: Context = this as any,
  ) {
    this._emitter.once(event, listener, context);
  }

  removeAllListeners<E extends keyof HlsListeners>(event?: E | undefined) {
    this._emitter.removeAllListeners(event);
  }

  off<E extends keyof HlsListeners, Context = undefined>(
    event: E,
    listener?: HlsListeners[E] | undefined,
    context: Context = this as any,
    once?: boolean | undefined,
  ) {
    this._emitter.off(event, listener, context, once);
  }

  listeners<E extends keyof HlsListeners>(event: E): HlsListeners[E][] {
    return this._emitter.listeners(event);
  }

  emit<E extends keyof HlsListeners>(
    event: E,
    name: E,
    eventObject: Parameters<HlsListeners[E]>[1],
  ): boolean {
    return this._emitter.emit(event, name, eventObject);
  }

  trigger<E extends keyof HlsListeners>(
    event: E,
    eventObject: Parameters<HlsListeners[E]>[1],
  ): boolean {
    if (this.config.debug) {
      return this.emit(event, event, eventObject);
    } else {
      try {
        return this.emit(event, event, eventObject);
      } catch (error) {
        this.logger.error(
          'An internal error happened while handling event ' +
            event +
            '. Error message: "' +
            error.message +
            '". Here is a stacktrace:',
          error,
        );
        // Prevent recursion in error event handlers that throw #5497
        if (!this.triggeringException) {
          this.triggeringException = true;
          const fatal = event === Events.ERROR;
          this.trigger(Events.ERROR, {
            type: ErrorTypes.OTHER_ERROR,
            details: ErrorDetails.INTERNAL_EXCEPTION,
            fatal,
            event,
            error,
          });
          this.triggeringException = false;
        }
      }
    }
    return false;
  }

  listenerCount<E extends keyof HlsListeners>(event: E): number {
    return this._emitter.listenerCount(event);
  }

  /**
   * Dispose of the instance
   */
  destroy() {
    this.logger.log('destroy');
    this.trigger(Events.DESTROYING, undefined);
    this.detachMedia();
    this.removeAllListeners();
    this._autoLevelCapping = -1;
    this._url = null;

    this.networkControllers.forEach((component) => component.destroy());
    this.networkControllers.length = 0;

    this.coreComponents.forEach((component) => component.destroy());
    this.coreComponents.length = 0;
    // Remove any references that could be held in config options or callbacks
    const config = this.config;
    config.xhrSetup = config.fetchSetup = undefined;
    // @ts-ignore
    this.userConfig = null;
  }

  /**
   * Attaches Hls.js to a media element
   */
  attachMedia(data: HTMLMediaElement | MediaAttachingData) {
    if (!data || ('media' in data && !data.media)) {
      const error = new Error(`attachMedia failed: invalid argument (${data})`);
      this.trigger(Events.ERROR, {
        type: ErrorTypes.OTHER_ERROR,
        details: ErrorDetails.ATTACH_MEDIA_ERROR,
        fatal: true,
        error,
      });
      return;
    }
    this.logger.log(`attachMedia`);
    if (this._media) {
      this.logger.warn(`media must be detached before attaching`);
      this.detachMedia();
    }
    const attachMediaSource = 'media' in data;
    const media = attachMediaSource ? data.media : data;
    const attachingData = attachMediaSource ? data : { media };
    this._media = media;
    this.trigger(Events.MEDIA_ATTACHING, attachingData);
  }

  /**
   * Detach Hls.js from the media
   */
  detachMedia() {
    this.logger.log('detachMedia');
    this.trigger(Events.MEDIA_DETACHING, {});
    this._media = null;
  }

  /**
   * Detach HTMLMediaElement, MediaSource, and SourceBuffers without reset, for attaching to another instance
   */
  transferMedia(): AttachMediaSourceData | null {
    this._media = null;
    const transferMedia = this.bufferController.transferMedia();
    this.trigger(Events.MEDIA_DETACHING, { transferMedia });
    return transferMedia;
  }

  /**
   * Set the source URL. Can be relative or absolute.
   */
  loadSource(url: string) {
    this.stopLoad();
    const media = this.media;
    const loadedSource = this._url;
    const loadingSource = (this._url = buildAbsoluteURL(
      self.location.href,
      url,
      {
        alwaysNormalize: true,
      },
    ));
    this._autoLevelCapping = -1;
    this._maxHdcpLevel = null;
    this.logger.log(`loadSource:${loadingSource}`);
    if (
      media &&
      loadedSource &&
      (loadedSource !== loadingSource || this.bufferController.hasSourceTypes())
    ) {
      // Remove and re-create MediaSource
      this.detachMedia();
      this.attachMedia(media);
    }
    // when attaching to a source URL, trigger a playlist load
    this.trigger(Events.MANIFEST_LOADING, { url: url });
  }

  /**
   * Gets the currently loaded URL
   */
  public get url(): string | null {
    return this._url;
  }

  /**
   * Whether or not enough has been buffered to seek to start position or use `media.currentTime` to determine next load position
   */
  get hasEnoughToStart(): boolean {
    return this.streamController.hasEnoughToStart;
  }

  /**
   * Get the startPosition set on startLoad(position) or on autostart with config.startPosition
   */
  get startPosition(): number {
    return this.streamController.startPositionValue;
  }

  /**
   * Start loading data from the stream source.
   * Depending on default config, client starts loading automatically when a source is set.
   *
   * @param startPosition - Set the start position to stream from.
   * Defaults to -1 (None: starts from earliest point)
   */
  startLoad(startPosition: number = -1, skipSeekToStartPosition?: boolean) {
    this.logger.log(
      `startLoad(${
        startPosition +
        (skipSeekToStartPosition ? ', <skip seek to start>' : '')
      })`,
    );
    this.started = true;
    this.resumeBuffering();
    for (let i = 0; i < this.networkControllers.length; i++) {
      this.networkControllers[i].startLoad(
        startPosition,
        skipSeekToStartPosition,
      );
      if (!this.started || !this.networkControllers) {
        break;
      }
    }
  }

  /**
   * Stop loading of any stream data.
   */
  stopLoad() {
    this.logger.log('stopLoad');
    this.started = false;
    for (let i = 0; i < this.networkControllers.length; i++) {
      this.networkControllers[i].stopLoad();
      if (this.started || !this.networkControllers) {
        break;
      }
    }
  }

  /**
   * Returns whether loading, toggled with `startLoad()` and `stopLoad()`, is active or not`.
   */
  get loadingEnabled(): boolean {
    return this.started;
  }

  /**
   * Returns state of fragment loading toggled by calling `pauseBuffering()` and `resumeBuffering()`.
   */
  get bufferingEnabled(): boolean {
    return this.streamController.bufferingEnabled;
  }

  /**
   * Resumes stream controller segment loading after `pauseBuffering` has been called.
   */
  resumeBuffering() {
    if (!this.bufferingEnabled) {
      this.logger.log(`resume buffering`);
      this.networkControllers.forEach((controller) => {
        if (controller.resumeBuffering) {
          controller.resumeBuffering();
        }
      });
    }
  }

  /**
   * Prevents stream controller from loading new segments until `resumeBuffering` is called.
   * This allows for media buffering to be paused without interupting playlist loading.
   */
  pauseBuffering() {
    if (this.bufferingEnabled) {
      this.logger.log(`pause buffering`);
      this.networkControllers.forEach((controller) => {
        if (controller.pauseBuffering) {
          controller.pauseBuffering();
        }
      });
    }
  }

  get inFlightFragments(): InFlightFragments {
    const inFlightData = {
      [PlaylistLevelType.MAIN]: this.streamController.inFlightFrag,
    };
    if (this.audioStreamController) {
      inFlightData[PlaylistLevelType.AUDIO] =
        this.audioStreamController.inFlightFrag;
    }
    if (this.subtititleStreamController) {
      inFlightData[PlaylistLevelType.SUBTITLE] =
        this.subtititleStreamController.inFlightFrag;
    }
    return inFlightData;
  }

  /**
   * Swap through possible audio codecs in the stream (for example to switch from stereo to 5.1)
   */
  swapAudioCodec() {
    this.logger.log('swapAudioCodec');
    this.streamController.swapAudioCodec();
  }

  /**
   * When the media-element fails, this allows to detach and then re-attach it
   * as one call (convenience method).
   *
   * Automatic recovery of media-errors by this process is configurable.
   */
  recoverMediaError() {
    this.logger.log('recoverMediaError');
    const media = this._media;
    const time = media?.currentTime;
    this.detachMedia();
    if (media) {
      this.attachMedia(media);
      if (time) {
        this.startLoad(time);
      }
    }
  }

  removeLevel(levelIndex: number) {
    this.levelController.removeLevel(levelIndex);
  }

  /**
   * @returns a UUID for this player instance
   */
  get sessionId(): string {
    let _sessionId = this._sessionId;
    if (!_sessionId) {
      _sessionId = this._sessionId = uuid();
    }
    return _sessionId;
  }

  /**
   * @returns an array of levels (variants) sorted by HDCP-LEVEL, RESOLUTION (height), FRAME-RATE, CODECS, VIDEO-RANGE, and BANDWIDTH
   */
  get levels(): Level[] {
    const levels = this.levelController.levels;
    return levels ? levels : [];
  }

  /**
   * @returns LevelDetails of last loaded level (variant) or `null` prior to loading a media playlist.
   */
  get latestLevelDetails(): LevelDetails | null {
    return this.streamController.getLevelDetails() || null;
  }

  /**
   * @returns Level object of selected level (variant) or `null` prior to selecting a level or once the level is removed.
   */
  get loadLevelObj(): Level | null {
    return this.levelController.loadLevelObj;
  }

  /**
   * Index of quality level (variant) currently played
   */
  get currentLevel(): number {
    return this.streamController.currentLevel;
  }

  /**
   * Set quality level index immediately. This will flush the current buffer to replace the quality asap. That means playback will interrupt at least shortly to re-buffer and re-sync eventually. Set to -1 for automatic level selection.
   */
  set currentLevel(newLevel: number) {
    this.logger.log(`set currentLevel:${newLevel}`);
    this.levelController.manualLevel = newLevel;
    this.streamController.immediateLevelSwitch();
  }

  /**
   * Index of next quality level loaded as scheduled by stream controller.
   */
  get nextLevel(): number {
    return this.streamController.nextLevel;
  }

  /**
   * Set quality level index for next loaded data.
   * This will switch the video quality asap, without interrupting playback.
   * May abort current loading of data, and flush parts of buffer (outside currently played fragment region).
   * @param newLevel - Pass -1 for automatic level selection
   */
  set nextLevel(newLevel: number) {
    this.logger.log(`set nextLevel:${newLevel}`);
    this.levelController.manualLevel = newLevel;
    this.streamController.nextLevelSwitch();
  }

  /**
   * Return the quality level of the currently or last (of none is loaded currently) segment
   */
  get loadLevel(): number {
    return this.levelController.level;
  }

  /**
   * Set quality level index for next loaded data in a conservative way.
   * This will switch the quality without flushing, but interrupt current loading.
   * Thus the moment when the quality switch will appear in effect will only be after the already existing buffer.
   * @param newLevel - Pass -1 for automatic level selection
   */
  set loadLevel(newLevel: number) {
    this.logger.log(`set loadLevel:${newLevel}`);
    this.levelController.manualLevel = newLevel;
  }

  /**
   * get next quality level loaded
   */
  get nextLoadLevel(): number {
    return this.levelController.nextLoadLevel;
  }

  /**
   * Set quality level of next loaded segment in a fully "non-destructive" way.
   * Same as `loadLevel` but will wait for next switch (until current loading is done).
   */
  set nextLoadLevel(level: number) {
    this.levelController.nextLoadLevel = level;
  }

  /**
   * Return "first level": like a default level, if not set,
   * falls back to index of first level referenced in manifest
   */
  get firstLevel(): number {
    return Math.max(this.levelController.firstLevel, this.minAutoLevel);
  }

  /**
   * Sets "first-level", see getter.
   */
  set firstLevel(newLevel: number) {
    this.logger.log(`set firstLevel:${newLevel}`);
    this.levelController.firstLevel = newLevel;
  }

  /**
   * Return the desired start level for the first fragment that will be loaded.
   * The default value of -1 indicates automatic start level selection.
   * Setting hls.nextAutoLevel without setting a startLevel will result in
   * the nextAutoLevel value being used for one fragment load.
   */
  get startLevel(): number {
    const startLevel = this.levelController.startLevel;
    if (startLevel === -1 && this.abrController.forcedAutoLevel > -1) {
      return this.abrController.forcedAutoLevel;
    }
    return startLevel;
  }

  /**
   * set  start level (level of first fragment that will be played back)
   * if not overrided by user, first level appearing in manifest will be used as start level
   * if -1 : automatic start level selection, playback will start from level matching download bandwidth
   * (determined from download of first segment)
   */
  set startLevel(newLevel: number) {
    this.logger.log(`set startLevel:${newLevel}`);
    // if not in automatic start level detection, ensure startLevel is greater than minAutoLevel
    if (newLevel !== -1) {
      newLevel = Math.max(newLevel, this.minAutoLevel);
    }

    this.levelController.startLevel = newLevel;
  }

  /**
   * Whether level capping is enabled.
   * Default value is set via `config.capLevelToPlayerSize`.
   */
  get capLevelToPlayerSize(): boolean {
    return this.config.capLevelToPlayerSize;
  }

  /**
   * Enables or disables level capping. If disabled after previously enabled, `nextLevelSwitch` will be immediately called.
   */
  set capLevelToPlayerSize(shouldStartCapping: boolean) {
    const newCapLevelToPlayerSize = !!shouldStartCapping;

    if (newCapLevelToPlayerSize !== this.config.capLevelToPlayerSize) {
      if (newCapLevelToPlayerSize) {
        this.capLevelController.startCapping(); // If capping occurs, nextLevelSwitch will happen based on size.
      } else {
        this.capLevelController.stopCapping();
        this.autoLevelCapping = -1;
        this.streamController.nextLevelSwitch(); // Now we're uncapped, get the next level asap.
      }

      this.config.capLevelToPlayerSize = newCapLevelToPlayerSize;
    }
  }

  /**
   * Capping/max level value that should be used by automatic level selection algorithm (`ABRController`)
   */
  get autoLevelCapping(): number {
    return this._autoLevelCapping;
  }

  /**
   * Returns the current bandwidth estimate in bits per second, when available. Otherwise, `NaN` is returned.
   */
  get bandwidthEstimate(): number {
    const { bwEstimator } = this.abrController;
    if (!bwEstimator) {
      return NaN;
    }
    return bwEstimator.getEstimate();
  }

  set bandwidthEstimate(abrEwmaDefaultEstimate: number) {
    this.abrController.resetEstimator(abrEwmaDefaultEstimate);
  }

  get abrEwmaDefaultEstimate(): number {
    const { bwEstimator } = this.abrController;
    if (!bwEstimator) {
      return NaN;
    }
    return bwEstimator.defaultEstimate;
  }

  /**
   * get time to first byte estimate
   * @type {number}
   */
  get ttfbEstimate(): number {
    const { bwEstimator } = this.abrController;
    if (!bwEstimator) {
      return NaN;
    }
    return bwEstimator.getEstimateTTFB();
  }

  /**
   * Capping/max level value that should be used by automatic level selection algorithm (`ABRController`)
   */
  set autoLevelCapping(newLevel: number) {
    if (this._autoLevelCapping !== newLevel) {
      this.logger.log(`set autoLevelCapping:${newLevel}`);
      this._autoLevelCapping = newLevel;
      this.levelController.checkMaxAutoUpdated();
    }
  }

  get maxHdcpLevel(): HdcpLevel {
    return this._maxHdcpLevel;
  }

  set maxHdcpLevel(value: HdcpLevel) {
    if (isHdcpLevel(value) && this._maxHdcpLevel !== value) {
      this._maxHdcpLevel = value;
      this.levelController.checkMaxAutoUpdated();
    }
  }

  /**
   * True when automatic level selection enabled
   */
  get autoLevelEnabled(): boolean {
    return this.levelController.manualLevel === -1;
  }

  /**
   * Level set manually (if any)
   */
  get manualLevel(): number {
    return this.levelController.manualLevel;
  }

  /**
   * min level selectable in auto mode according to config.minAutoBitrate
   */
  get minAutoLevel(): number {
    const {
      levels,
      config: { minAutoBitrate },
    } = this;
    if (!levels) return 0;

    const len = levels.length;
    for (let i = 0; i < len; i++) {
      if (levels[i].maxBitrate >= minAutoBitrate) {
        return i;
      }
    }

    return 0;
  }

  /**
   * max level selectable in auto mode according to autoLevelCapping
   */
  get maxAutoLevel(): number {
    const { levels, autoLevelCapping, maxHdcpLevel } = this;

    let maxAutoLevel;
    if (autoLevelCapping === -1 && levels?.length) {
      maxAutoLevel = levels.length - 1;
    } else {
      maxAutoLevel = autoLevelCapping;
    }

    if (maxHdcpLevel) {
      for (let i = maxAutoLevel; i--; ) {
        const hdcpLevel = levels[i].attrs['HDCP-LEVEL'];
        if (hdcpLevel && hdcpLevel <= maxHdcpLevel) {
          return i;
        }
      }
    }

    return maxAutoLevel;
  }

  get firstAutoLevel(): number {
    return this.abrController.firstAutoLevel;
  }

  /**
   * next automatically selected quality level
   */
  get nextAutoLevel(): number {
    return this.abrController.nextAutoLevel;
  }

  /**
   * this setter is used to force next auto level.
   * this is useful to force a switch down in auto mode:
   * in case of load error on level N, hls.js can set nextAutoLevel to N-1 for example)
   * forced value is valid for one fragment. upon successful frag loading at forced level,
   * this value will be resetted to -1 by ABR controller.
   */
  set nextAutoLevel(nextLevel: number) {
    this.abrController.nextAutoLevel = nextLevel;
  }

  /**
   * get the datetime value relative to media.currentTime for the active level Program Date Time if present
   */
  public get playingDate(): Date | null {
    return this.streamController.currentProgramDateTime;
  }

  public get mainForwardBufferInfo(): BufferInfo | null {
    return this.streamController.getMainFwdBufferInfo();
  }

  public get maxBufferLength(): number {
    return this.streamController.maxBufferLength;
  }

  /**
   * Find and select the best matching audio track, making a level switch when a Group change is necessary.
   * Updates `hls.config.audioPreference`. Returns the selected track, or null when no matching track is found.
   */
  public setAudioOption(
    audioOption: MediaPlaylist | AudioSelectionOption | undefined,
  ): MediaPlaylist | null {
    return this.audioTrackController?.setAudioOption(audioOption) || null;
  }
  /**
   * Find and select the best matching subtitle track, making a level switch when a Group change is necessary.
   * Updates `hls.config.subtitlePreference`. Returns the selected track, or null when no matching track is found.
   */
  public setSubtitleOption(
    subtitleOption: MediaPlaylist | SubtitleSelectionOption | undefined,
  ): MediaPlaylist | null {
    return (
      this.subtitleTrackController?.setSubtitleOption(subtitleOption) || null
    );
  }

  /**
   * Get the complete list of audio tracks across all media groups
   */
  get allAudioTracks(): MediaPlaylist[] {
    const audioTrackController = this.audioTrackController;
    return audioTrackController ? audioTrackController.allAudioTracks : [];
  }

  /**
   * Get the list of selectable audio tracks
   */
  get audioTracks(): MediaPlaylist[] {
    const audioTrackController = this.audioTrackController;
    return audioTrackController ? audioTrackController.audioTracks : [];
  }

  /**
   * index of the selected audio track (index in audio track lists)
   */
  get audioTrack(): number {
    const audioTrackController = this.audioTrackController;
    return audioTrackController ? audioTrackController.audioTrack : -1;
  }

  /**
   * selects an audio track, based on its index in audio track lists
   */
  set audioTrack(audioTrackId: number) {
    const audioTrackController = this.audioTrackController;
    if (audioTrackController) {
      audioTrackController.audioTrack = audioTrackId;
    }
  }

  /**
   * get the complete list of subtitle tracks across all media groups
   */
  get allSubtitleTracks(): MediaPlaylist[] {
    const subtitleTrackController = this.subtitleTrackController;
    return subtitleTrackController
      ? subtitleTrackController.allSubtitleTracks
      : [];
  }

  /**
   * get alternate subtitle tracks list from playlist
   */
  get subtitleTracks(): MediaPlaylist[] {
    const subtitleTrackController = this.subtitleTrackController;
    return subtitleTrackController
      ? subtitleTrackController.subtitleTracks
      : [];
  }

  /**
   * index of the selected subtitle track (index in subtitle track lists)
   */
  get subtitleTrack(): number {
    const subtitleTrackController = this.subtitleTrackController;
    return subtitleTrackController ? subtitleTrackController.subtitleTrack : -1;
  }

  get media() {
    return this._media;
  }

  /**
   * select an subtitle track, based on its index in subtitle track lists
   */
  set subtitleTrack(subtitleTrackId: number) {
    const subtitleTrackController = this.subtitleTrackController;
    if (subtitleTrackController) {
      subtitleTrackController.subtitleTrack = subtitleTrackId;
    }
  }

  /**
   * Whether subtitle display is enabled or not
   */
  get subtitleDisplay(): boolean {
    const subtitleTrackController = this.subtitleTrackController;
    return subtitleTrackController
      ? subtitleTrackController.subtitleDisplay
      : false;
  }

  /**
   * Enable/disable subtitle display rendering
   */
  set subtitleDisplay(value: boolean) {
    const subtitleTrackController = this.subtitleTrackController;
    if (subtitleTrackController) {
      subtitleTrackController.subtitleDisplay = value;
    }
  }

  /**
   * get mode for Low-Latency HLS loading
   */
  get lowLatencyMode(): boolean {
    return this.config.lowLatencyMode;
  }

  /**
   * Enable/disable Low-Latency HLS part playlist and segment loading, and start live streams at playlist PART-HOLD-BACK rather than HOLD-BACK.
   */
  set lowLatencyMode(mode: boolean) {
    this.config.lowLatencyMode = mode;
  }

  /**
   * Position (in seconds) of live sync point (ie edge of live position minus safety delay defined by ```hls.config.liveSyncDuration```)
   * @returns null prior to loading live Playlist
   */
  get liveSyncPosition(): number | null {
    return this.latencyController.liveSyncPosition;
  }

  /**
   * Estimated position (in seconds) of live edge (ie edge of live playlist plus time sync playlist advanced)
   * @returns 0 before first playlist is loaded
   */
  get latency(): number {
    return this.latencyController.latency;
  }

  /**
   * maximum distance from the edge before the player seeks forward to ```hls.liveSyncPosition```
   * configured using ```liveMaxLatencyDurationCount``` (multiple of target duration) or ```liveMaxLatencyDuration```
   * @returns 0 before first playlist is loaded
   */
  get maxLatency(): number {
    return this.latencyController.maxLatency;
  }

  /**
   * target distance from the edge as calculated by the latency controller
   */
  get targetLatency(): number | null {
    return this.latencyController.targetLatency;
  }

  set targetLatency(latency: number) {
    this.latencyController.targetLatency = latency;
  }

  /**
   * the rate at which the edge of the current live playlist is advancing or 1 if there is none
   */
  get drift(): number | null {
    return this.latencyController.drift;
  }

  /**
   * set to true when startLoad is called before MANIFEST_PARSED event
   */
  get forceStartLoad(): boolean {
    return this.streamController.forceStartLoad;
  }

  /**
   * ContentSteering pathways getter
   */
  get pathways(): string[] {
    return this.levelController.pathways;
  }

  /**
   * ContentSteering pathwayPriority getter/setter
   */
  get pathwayPriority(): string[] | null {
    return this.levelController.pathwayPriority;
  }

  set pathwayPriority(pathwayPriority: string[]) {
    this.levelController.pathwayPriority = pathwayPriority;
  }

  /**
   * returns true when all SourceBuffers are buffered to the end
   */
  get bufferedToEnd(): boolean {
    return !!this.bufferController?.bufferedToEnd;
  }

  /**
   * returns Interstitials Program Manager
   */
  get interstitialsManager(): InterstitialsManager | null {
    return this.interstitialsController?.interstitialsManager || null;
  }

  /**
   * returns mediaCapabilities.decodingInfo for a variant/rendition
   */
  getMediaDecodingInfo(
    level: Level,
    audioTracks: MediaPlaylist[] = this.allAudioTracks,
  ): Promise<MediaDecodingInfo> {
    const audioTracksByGroup = getAudioTracksByGroup(audioTracks);
    return getMediaDecodingInfoPromise(
      level,
      audioTracksByGroup,
      navigator.mediaCapabilities,
    );
  }
}

export type InFlightFragments = {
  [PlaylistLevelType.MAIN]: InFlightData;
  [PlaylistLevelType.AUDIO]?: InFlightData;
  [PlaylistLevelType.SUBTITLE]?: InFlightData;
};
export type {
  AudioSelectionOption,
  SubtitleSelectionOption,
  VideoSelectionOption,
  MediaPlaylist,
  ErrorDetails,
  ErrorTypes,
  Events,
  Level,
  LevelDetails,
  HlsListeners,
  HlsEventEmitter,
  HlsConfig,
  BufferInfo,
  BufferTimeRange,
  HdcpLevel,
  AbrController,
  AudioStreamController,
  AudioTrackController,
  BasePlaylistController,
  BaseStreamController,
  BufferController,
  CapLevelController,
  CMCDController,
  ContentSteeringController,
  EMEController,
  ErrorController,
  FPSController,
  InterstitialsController,
  StreamController,
  SubtitleStreamController,
  SubtitleTrackController,
  EwmaBandWidthEstimator,
  InterstitialsManager,
  Decrypter,
  FragmentLoader,
  KeyLoader,
  TaskLoop,
  TransmuxerInterface,
  InFlightData,
  State,
  XhrLoader,
  FetchLoader,
  Cues,
  M3U8Parser,
};
export type {
  ABRControllerConfig,
  BufferControllerConfig,
  CapLevelControllerConfig,
  CMCDControllerConfig,
  EMEControllerConfig,
  DRMSystemConfiguration,
  DRMSystemsConfiguration,
  DRMSystemOptions,
  FPSControllerConfig,
  FragmentLoaderConfig,
  FragmentLoaderConstructor,
  GapControllerConfig,
  HlsLoadPolicies,
  LevelControllerConfig,
  LoaderConfig,
  LoadPolicy,
  MP4RemuxerConfig,
  PlaylistLoaderConfig,
  PlaylistLoaderConstructor,
  RetryConfig,
  SelectionPreferences,
  StreamControllerConfig,
  LatencyControllerConfig,
  MetadataControllerConfig,
  TimelineControllerConfig,
  TSDemuxerConfig,
} from './config';
export type { MediaKeySessionContext } from './controller/eme-controller';
export type {
  FragmentState,
  FragmentTracker,
} from './controller/fragment-tracker';
export type {
  PathwayClone,
  SteeringManifest,
  UriReplacement,
} from './controller/content-steering-controller';
export type {
  NetworkErrorAction,
  ErrorActionFlags,
  IErrorAction,
} from './controller/error-controller';
export type {
  HlsAssetPlayer,
  HlsAssetPlayerConfig,
  InterstitialPlayer,
} from './controller/interstitial-player';
export type { PlayheadTimes } from './controller/interstitials-controller';
export type {
  InterstitialScheduleDurations,
  InterstitialScheduleEventItem,
  InterstitialScheduleItem,
  InterstitialSchedulePrimaryItem,
} from './controller/interstitials-schedule';
export type { TimelineController } from './controller/timeline-controller';
export type { DecrypterAesMode } from './crypt/decrypter-aes-mode';
export type { DateRange, DateRangeCue } from './loader/date-range';
export type { LoadStats } from './loader/load-stats';
export type { LevelKey } from './loader/level-key';
export type {
  BaseSegment,
  Fragment,
  MediaFragment,
  Part,
  ElementaryStreams,
  ElementaryStreamTypes,
  ElementaryStreamInfo,
} from './loader/fragment';
export type {
  FragLoadFailResult,
  FragmentLoadProgressCallback,
  LoadError,
} from './loader/fragment-loader';
export type { KeyLoaderInfo } from './loader/key-loader';
export type { DecryptData } from './loader/level-key';
export type {
  AssetListJSON,
  BaseData,
  InterstitialAssetId,
  InterstitialAssetItem,
  InterstitialEvent,
  InterstitialEventWithAssetList,
  InterstitialId,
  PlaybackRestrictions,
  SnapOptions,
  TimelineOccupancy,
} from './loader/interstitial-event';
export type { ParsedMultivariantPlaylist } from './loader/m3u8-parser';
export type {
  AttachMediaSourceData,
  BaseTrack,
  BaseTrackSet,
  BufferCreatedTrack,
  BufferCreatedTrackSet,
  ExtendedSourceBuffer,
  MediaOverrides,
  ParsedTrack,
  SourceBufferName,
  SourceBufferListener,
  SourceBufferTrack,
  SourceBufferTrackSet,
} from './types/buffer';
export type {
  ComponentAPI,
  AbrComponentAPI,
  NetworkComponentAPI,
} from './types/component-api';
export type {
  TrackLoadingData,
  TrackLoadedData,
  AssetListLoadedData,
  AssetListLoadingData,
  AudioTrackLoadedData,
  AudioTrackUpdatedData,
  AudioTracksUpdatedData,
  AudioTrackSwitchedData,
  AudioTrackSwitchingData,
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
  ContentSteeringOptions,
  ManifestLoadedData,
  ManifestLoadingData,
  ManifestParsedData,
  MaxAutoLevelUpdatedData,
  MediaAttachedData,
  MediaAttachingData,
  MediaDetachedData,
  MediaDetachingData,
  MediaEndedData,
  NonNativeTextTrack,
  NonNativeTextTracksData,
  PartsLoadedData,
  SteeringManifestLoadedData,
  SubtitleFragProcessedData,
  SubtitleTrackLoadedData,
  SubtitleTrackUpdatedData,
  SubtitleTracksUpdatedData,
  SubtitleTrackSwitchData,
  InterstitialsUpdatedData,
  InterstitialsBufferedToBoundaryData,
  InterstitialAssetPlayerCreatedData,
  InterstitialStartedData,
  InterstitialEndedData,
  InterstitialAssetStartedData,
  InterstitialAssetEndedData,
  InterstitialAssetErrorData,
  InterstitialsPrimaryResumed,
} from './types/events';
export type {
  MetadataSample,
  MetadataSchema,
  UserdataSample,
} from './types/demuxer';
export type {
  InitSegmentData,
  RemuxedMetadata,
  RemuxedTrack,
  RemuxedUserdata,
  RemuxerResult,
} from './types/remuxer';
export type { AttrList } from './utils/attr-list';
export type { Bufferable } from './utils/buffer-helper';
export type { CaptionScreen } from './utils/cea-608-parser';
export type { CuesInterface } from './utils/cues';
export type {
  CodecsParsed,
  HdcpLevels,
  HlsSkip,
  HlsUrlParameters,
  LevelAttributes,
  LevelParsed,
  VariableMap,
  VideoRange,
  VideoRangeValues,
} from './types/level';
export type {
  PlaylistLevelType,
  HlsChunkPerformanceTiming,
  HlsPerformanceTiming,
  HlsProgressivePerformanceTiming,
  PlaylistContextType,
  PlaylistLoaderContext,
  FragmentLoaderContext,
  KeyLoaderContext,
  Loader,
  LoaderStats,
  LoaderContext,
  LoaderResponse,
  LoaderConfiguration,
  LoaderCallbacks,
  LoaderOnProgress,
  LoaderOnAbort,
  LoaderOnError,
  LoaderOnSuccess,
  LoaderOnTimeout,
} from './types/loader';
export type { ILogFunction, ILogger, Logger } from './utils/logger';
export type {
  MediaAttributes,
  MediaPlaylistType,
  MainPlaylistType,
  AudioPlaylistType,
  SubtitlePlaylistType,
} from './types/media-playlist';
export type { Track, TrackSet } from './types/track';
export type { ChunkMetadata, TransmuxerResult } from './types/transmuxer';
export type { MediaDecodingInfo } from './utils/mediacapabilities-helper';
export type {
  MediaKeyFunc,
  KeySystems,
  KeySystemFormats,
} from './utils/mediakeys-helper';
export type {
  RationalTimestamp,
  TimestampOffset,
} from './utils/timescale-conversion';
