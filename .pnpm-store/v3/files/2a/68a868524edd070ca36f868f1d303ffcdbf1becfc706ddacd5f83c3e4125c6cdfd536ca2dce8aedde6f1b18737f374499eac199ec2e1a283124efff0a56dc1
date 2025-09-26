import AbrController from './controller/abr-controller';
import AudioStreamController from './controller/audio-stream-controller';
import AudioTrackController from './controller/audio-track-controller';
import BufferController from './controller/buffer-controller';
import CapLevelController from './controller/cap-level-controller';
import CMCDController from './controller/cmcd-controller';
import ContentSteeringController from './controller/content-steering-controller';
import EMEController from './controller/eme-controller';
import ErrorController from './controller/error-controller';
import FPSController from './controller/fps-controller';
import InterstitialsController from './controller/interstitials-controller';
import { SubtitleStreamController } from './controller/subtitle-stream-controller';
import SubtitleTrackController from './controller/subtitle-track-controller';
import { TimelineController } from './controller/timeline-controller';
import Cues from './utils/cues';
import FetchLoader, { fetchSupported } from './utils/fetch-loader';
import { requestMediaKeySystemAccess } from './utils/mediakeys-helper';
import { stringify } from './utils/safe-json-stringify';
import XhrLoader from './utils/xhr-loader';
import type { MediaKeySessionContext } from './controller/eme-controller';
import type Hls from './hls';
import type {
  FragmentLoaderContext,
  Loader,
  LoaderContext,
  LoaderResponse,
  PlaylistLoaderContext,
} from './types/loader';
import type {
  AudioSelectionOption,
  SubtitleSelectionOption,
  VideoSelectionOption,
} from './types/media-playlist';
import type { CuesInterface } from './utils/cues';
import type { ILogger } from './utils/logger';
import type { KeySystems, MediaKeyFunc } from './utils/mediakeys-helper';

export type ABRControllerConfig = {
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

export type BufferControllerConfig = {
  appendErrorMaxRetry: number;
  backBufferLength: number;
  frontBufferFlushThreshold: number;
  liveDurationInfinity: boolean;
  /**
   * @deprecated use backBufferLength
   */
  liveBackBufferLength: number | null;
};

export type CapLevelControllerConfig = {
  capLevelToPlayerSize: boolean;
};

export type CMCDControllerConfig = {
  sessionId?: string;
  contentId?: string;
  useHeaders?: boolean;
  includeKeys?: string[];
};

export type DRMSystemOptions = {
  audioRobustness?: string;
  videoRobustness?: string;
  audioEncryptionScheme?: string | null;
  videoEncryptionScheme?: string | null;
  persistentState?: MediaKeysRequirement;
  distinctiveIdentifier?: MediaKeysRequirement;
  sessionTypes?: string[];
  sessionType?: string;
};

export type DRMSystemConfiguration = {
  licenseUrl: string;
  serverCertificateUrl?: string;
  generateRequest?: (
    this: Hls,
    initDataType: string,
    initData: ArrayBuffer | null,
    keyContext: MediaKeySessionContext,
  ) =>
    | { initDataType: string; initData: ArrayBuffer | null }
    | undefined
    | never;
};

export type DRMSystemsConfiguration = Partial<
  Record<KeySystems, DRMSystemConfiguration>
>;

export type EMEControllerConfig = {
  licenseXhrSetup?: (
    this: Hls,
    xhr: XMLHttpRequest,
    url: string,
    keyContext: MediaKeySessionContext,
    licenseChallenge: Uint8Array,
  ) => void | Uint8Array | Promise<Uint8Array | void>;
  licenseResponseCallback?: (
    this: Hls,
    xhr: XMLHttpRequest,
    url: string,
    keyContext: MediaKeySessionContext,
  ) => ArrayBuffer;
  emeEnabled: boolean;
  widevineLicenseUrl?: string;
  drmSystems: DRMSystemsConfiguration | undefined;
  drmSystemOptions: DRMSystemOptions | undefined;
  requestMediaKeySystemAccessFunc: MediaKeyFunc | null;
  requireKeySystemAccessOnStart: boolean;
};

export interface FragmentLoaderConstructor {
  new (confg: HlsConfig): Loader<FragmentLoaderContext>;
}

/**
 * @deprecated use fragLoadPolicy.default
 */
export type FragmentLoaderConfig = {
  fragLoadingTimeOut: number;
  fragLoadingMaxRetry: number;
  fragLoadingRetryDelay: number;
  fragLoadingMaxRetryTimeout: number;
};

export type FPSControllerConfig = {
  capLevelOnFPSDrop: boolean;
  fpsDroppedMonitoringPeriod: number;
  fpsDroppedMonitoringThreshold: number;
};

export type LevelControllerConfig = {
  startLevel?: number;
};

export type MP4RemuxerConfig = {
  stretchShortVideoTrack: boolean;
  maxAudioFramesDrift: number;
};

export interface PlaylistLoaderConstructor {
  new (confg: HlsConfig): Loader<PlaylistLoaderContext>;
}

/**
 * @deprecated use manifestLoadPolicy.default and playlistLoadPolicy.default
 */
export type PlaylistLoaderConfig = {
  manifestLoadingTimeOut: number;
  manifestLoadingMaxRetry: number;
  manifestLoadingRetryDelay: number;
  manifestLoadingMaxRetryTimeout: number;

  levelLoadingTimeOut: number;
  levelLoadingMaxRetry: number;
  levelLoadingRetryDelay: number;
  levelLoadingMaxRetryTimeout: number;
};

export type HlsLoadPolicies = {
  fragLoadPolicy: LoadPolicy;
  keyLoadPolicy: LoadPolicy;
  certLoadPolicy: LoadPolicy;
  playlistLoadPolicy: LoadPolicy;
  manifestLoadPolicy: LoadPolicy;
  steeringManifestLoadPolicy: LoadPolicy;
  interstitialAssetListLoadPolicy: LoadPolicy;
};

export type LoadPolicy = {
  default: LoaderConfig;
};

export type LoaderConfig = {
  maxTimeToFirstByteMs: number; // Max time to first byte
  maxLoadTimeMs: number; // Max time for load completion
  timeoutRetry: RetryConfig | null;
  errorRetry: RetryConfig | null;
};

export type RetryConfig = {
  maxNumRetry: number; // Maximum number of retries
  retryDelayMs: number; // Retry delay = 2^retryCount * retryDelayMs (exponential) or retryCount * retryDelayMs (linear)
  maxRetryDelayMs: number; // Maximum delay between retries
  backoff?: 'exponential' | 'linear'; // used to determine retry backoff duration (see retryDelayMs)
  shouldRetry?: (
    retryConfig: RetryConfig | null | undefined,
    retryCount: number,
    isTimeout: boolean,
    loaderResponse: LoaderResponse | undefined,
    retry: boolean,
  ) => boolean;
};

export type StreamControllerConfig = {
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

export type GapControllerConfig = {
  detectStallWithCurrentTimeMs: number;
  highBufferWatchdogPeriod: number;
  nudgeOffset: number;
  nudgeMaxRetry: number;
  nudgeOnVideoHole: boolean;
};

export type SelectionPreferences = {
  videoPreference?: VideoSelectionOption;
  audioPreference?: AudioSelectionOption;
  subtitlePreference?: SubtitleSelectionOption;
};

export type LatencyControllerConfig = {
  liveSyncDurationCount: number;
  liveMaxLatencyDurationCount: number;
  liveSyncDuration?: number;
  liveMaxLatencyDuration?: number;
  maxLiveSyncPlaybackRate: number;
  liveSyncOnStallIncrease: number;
};

export type MetadataControllerConfig = {
  enableDateRangeMetadataCues: boolean;
  enableEmsgMetadataCues: boolean;
  enableEmsgKLVMetadata: boolean;
  enableID3MetadataCues: boolean;
};

export type TimelineControllerConfig = {
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

export type TSDemuxerConfig = {
  forceKeyFrameOnDiscontinuity: boolean;
};

export type HlsConfig = {
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
  loader: { new (confg: HlsConfig): Loader<LoaderContext> };
  fLoader?: FragmentLoaderConstructor;
  pLoader?: PlaylistLoaderConstructor;
  fetchSetup?: (
    context: LoaderContext,
    initParams: any,
  ) => Promise<Request> | Request;
  xhrSetup?: (xhr: XMLHttpRequest, url: string) => Promise<void> | void;

  // Alt Audio
  audioStreamController?: typeof AudioStreamController;
  audioTrackController?: typeof AudioTrackController;
  // Subtitle
  subtitleStreamController?: typeof SubtitleStreamController;
  subtitleTrackController?: typeof SubtitleTrackController;
  timelineController?: typeof TimelineController;
  // EME
  emeController?: typeof EMEController;
  // CMCD
  cmcd?: CMCDControllerConfig;
  cmcdController?: typeof CMCDController;
  // Content Steering
  contentSteeringController?: typeof ContentSteeringController;
  // Interstitial Controller (setting to null disables Interstitials parsing and playback)
  interstitialsController?: typeof InterstitialsController;
  // Option to disable internal playback handling of Interstitials (set to false to disable Interstitials playback without disabling parsing and schedule events)
  enableInterstitialPlayback: boolean;
  // Option to disable appending Interstitials inline on same timeline and MediaSource as Primary media
  interstitialAppendInPlace: boolean;
  // How many seconds past the end of a live playlist to preload Interstitial assets
  interstitialLiveLookAhead: number;
  // An optional `Hls` instance ID prefixed to debug logs
  assetPlayerId?: string;
  // MediaCapabilies API for level, track, and switch filtering
  useMediaCapabilities: boolean;

  abrController: typeof AbrController;
  bufferController: typeof BufferController;
  capLevelController: typeof CapLevelController;
  errorController: typeof ErrorController;
  fpsController: typeof FPSController;
  progressive: boolean;
  lowLatencyMode: boolean;
  primarySessionId?: string;
} & ABRControllerConfig &
  BufferControllerConfig &
  CapLevelControllerConfig &
  EMEControllerConfig &
  FPSControllerConfig &
  GapControllerConfig &
  LevelControllerConfig &
  MP4RemuxerConfig &
  StreamControllerConfig &
  SelectionPreferences &
  LatencyControllerConfig &
  MetadataControllerConfig &
  TimelineControllerConfig &
  TSDemuxerConfig &
  HlsLoadPolicies &
  FragmentLoaderConfig &
  PlaylistLoaderConfig;

const defaultLoadPolicy: LoaderConfig = {
  maxTimeToFirstByteMs: 8000,
  maxLoadTimeMs: 20000,
  timeoutRetry: null,
  errorRetry: null,
};

/**
 * @ignore
 * If possible, keep hlsDefaultConfig shallow
 * It is cloned whenever a new Hls instance is created, by keeping the config
 * shallow the properties are cloned, and we don't end up manipulating the default
 */
export const hlsDefaultConfig: HlsConfig = {
  autoStartLoad: true, // used by stream-controller
  startPosition: -1, // used by stream-controller
  defaultAudioCodec: undefined, // used by stream-controller
  debug: false, // used by logger
  capLevelOnFPSDrop: false, // used by fps-controller
  capLevelToPlayerSize: false, // used by cap-level-controller
  ignoreDevicePixelRatio: false, // used by cap-level-controller
  maxDevicePixelRatio: Number.POSITIVE_INFINITY, // used by cap-level-controller
  preferManagedMediaSource: true,
  initialLiveManifestSize: 1, // used by stream-controller
  maxBufferLength: 30, // used by stream-controller
  backBufferLength: Infinity, // used by buffer-controller
  frontBufferFlushThreshold: Infinity,
  startOnSegmentBoundary: false, // used by stream-controller
  maxBufferSize: 60 * 1000 * 1000, // used by stream-controller
  maxFragLookUpTolerance: 0.25, // used by stream-controller
  maxBufferHole: 0.1, // used by stream-controller and gap-controller
  detectStallWithCurrentTimeMs: 1250, // used by gap-controller
  highBufferWatchdogPeriod: 2, // used by gap-controller
  nudgeOffset: 0.1, // used by gap-controller
  nudgeMaxRetry: 3, // used by gap-controller
  nudgeOnVideoHole: true, // used by gap-controller
  liveSyncMode: 'edge', // used by stream-controller
  liveSyncDurationCount: 3, // used by latency-controller
  liveSyncOnStallIncrease: 1, // used by latency-controller
  liveMaxLatencyDurationCount: Infinity, // used by latency-controller
  liveSyncDuration: undefined, // used by latency-controller
  liveMaxLatencyDuration: undefined, // used by latency-controller
  maxLiveSyncPlaybackRate: 1, // used by latency-controller
  liveDurationInfinity: false, // used by buffer-controller
  /**
   * @deprecated use backBufferLength
   */
  liveBackBufferLength: null, // used by buffer-controller
  maxMaxBufferLength: 600, // used by stream-controller
  enableWorker: true, // used by transmuxer
  workerPath: null, // used by transmuxer
  enableSoftwareAES: true, // used by decrypter
  startLevel: undefined, // used by level-controller
  startFragPrefetch: false, // used by stream-controller
  fpsDroppedMonitoringPeriod: 5000, // used by fps-controller
  fpsDroppedMonitoringThreshold: 0.2, // used by fps-controller
  appendErrorMaxRetry: 3, // used by buffer-controller
  ignorePlaylistParsingErrors: false,
  loader: XhrLoader,
  // loader: FetchLoader,
  fLoader: undefined, // used by fragment-loader
  pLoader: undefined, // used by playlist-loader
  xhrSetup: undefined, // used by xhr-loader
  licenseXhrSetup: undefined, // used by eme-controller
  licenseResponseCallback: undefined, // used by eme-controller
  abrController: AbrController,
  bufferController: BufferController,
  capLevelController: CapLevelController,
  errorController: ErrorController,
  fpsController: FPSController,
  stretchShortVideoTrack: false, // used by mp4-remuxer
  maxAudioFramesDrift: 1, // used by mp4-remuxer
  forceKeyFrameOnDiscontinuity: true, // used by ts-demuxer
  abrEwmaFastLive: 3, // used by abr-controller
  abrEwmaSlowLive: 9, // used by abr-controller
  abrEwmaFastVoD: 3, // used by abr-controller
  abrEwmaSlowVoD: 9, // used by abr-controller
  abrEwmaDefaultEstimate: 5e5, // 500 kbps  // used by abr-controller
  abrEwmaDefaultEstimateMax: 5e6, // 5 mbps
  abrBandWidthFactor: 0.95, // used by abr-controller
  abrBandWidthUpFactor: 0.7, // used by abr-controller
  abrMaxWithRealBitrate: false, // used by abr-controller
  maxStarvationDelay: 4, // used by abr-controller
  maxLoadingDelay: 4, // used by abr-controller
  minAutoBitrate: 0, // used by hls
  emeEnabled: false, // used by eme-controller
  widevineLicenseUrl: undefined, // used by eme-controller
  drmSystems: {}, // used by eme-controller
  drmSystemOptions: {}, // used by eme-controller
  requestMediaKeySystemAccessFunc: __USE_EME_DRM__
    ? requestMediaKeySystemAccess
    : null, // used by eme-controller
  requireKeySystemAccessOnStart: false, // used by eme-controller
  testBandwidth: true,
  progressive: false,
  lowLatencyMode: true,
  cmcd: undefined,
  enableDateRangeMetadataCues: true,
  enableEmsgMetadataCues: true,
  enableEmsgKLVMetadata: false,
  enableID3MetadataCues: true,
  enableInterstitialPlayback: __USE_INTERSTITIALS__,
  interstitialAppendInPlace: true,
  interstitialLiveLookAhead: 10,
  useMediaCapabilities: __USE_MEDIA_CAPABILITIES__,
  preserveManualLevelOnError: false,

  certLoadPolicy: {
    default: defaultLoadPolicy,
  },
  keyLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 8000,
      maxLoadTimeMs: 20000,
      timeoutRetry: {
        maxNumRetry: 1,
        retryDelayMs: 1000,
        maxRetryDelayMs: 20000,
        backoff: 'linear',
      },
      errorRetry: {
        maxNumRetry: 8,
        retryDelayMs: 1000,
        maxRetryDelayMs: 20000,
        backoff: 'linear',
      },
    },
  },
  manifestLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: Infinity,
      maxLoadTimeMs: 20000,
      timeoutRetry: {
        maxNumRetry: 2,
        retryDelayMs: 0,
        maxRetryDelayMs: 0,
      },
      errorRetry: {
        maxNumRetry: 1,
        retryDelayMs: 1000,
        maxRetryDelayMs: 8000,
      },
    },
  },
  playlistLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 10000,
      maxLoadTimeMs: 20000,
      timeoutRetry: {
        maxNumRetry: 2,
        retryDelayMs: 0,
        maxRetryDelayMs: 0,
      },
      errorRetry: {
        maxNumRetry: 2,
        retryDelayMs: 1000,
        maxRetryDelayMs: 8000,
      },
    },
  },
  fragLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 10000,
      maxLoadTimeMs: 120000,
      timeoutRetry: {
        maxNumRetry: 4,
        retryDelayMs: 0,
        maxRetryDelayMs: 0,
      },
      errorRetry: {
        maxNumRetry: 6,
        retryDelayMs: 1000,
        maxRetryDelayMs: 8000,
      },
    },
  },
  steeringManifestLoadPolicy: {
    default: __USE_CONTENT_STEERING__
      ? {
          maxTimeToFirstByteMs: 10000,
          maxLoadTimeMs: 20000,
          timeoutRetry: {
            maxNumRetry: 2,
            retryDelayMs: 0,
            maxRetryDelayMs: 0,
          },
          errorRetry: {
            maxNumRetry: 1,
            retryDelayMs: 1000,
            maxRetryDelayMs: 8000,
          },
        }
      : defaultLoadPolicy,
  },
  interstitialAssetListLoadPolicy: {
    default: __USE_INTERSTITIALS__
      ? {
          maxTimeToFirstByteMs: 10000,
          maxLoadTimeMs: 30000,
          timeoutRetry: {
            maxNumRetry: 0,
            retryDelayMs: 0,
            maxRetryDelayMs: 0,
          },
          errorRetry: {
            maxNumRetry: 0,
            retryDelayMs: 1000,
            maxRetryDelayMs: 8000,
          },
        }
      : defaultLoadPolicy,
  },

  // These default settings are deprecated in favor of the above policies
  // and are maintained for backwards compatibility
  manifestLoadingTimeOut: 10000,
  manifestLoadingMaxRetry: 1,
  manifestLoadingRetryDelay: 1000,
  manifestLoadingMaxRetryTimeout: 64000,
  levelLoadingTimeOut: 10000,
  levelLoadingMaxRetry: 4,
  levelLoadingRetryDelay: 1000,
  levelLoadingMaxRetryTimeout: 64000,
  fragLoadingTimeOut: 20000,
  fragLoadingMaxRetry: 6,
  fragLoadingRetryDelay: 1000,
  fragLoadingMaxRetryTimeout: 64000,

  // Dynamic Modules
  ...timelineConfig(),
  subtitleStreamController: __USE_SUBTITLES__
    ? SubtitleStreamController
    : undefined,
  subtitleTrackController: __USE_SUBTITLES__
    ? SubtitleTrackController
    : undefined,
  timelineController: __USE_SUBTITLES__ ? TimelineController : undefined,
  audioStreamController: __USE_ALT_AUDIO__ ? AudioStreamController : undefined,
  audioTrackController: __USE_ALT_AUDIO__ ? AudioTrackController : undefined,
  emeController: __USE_EME_DRM__ ? EMEController : undefined,
  cmcdController: __USE_CMCD__ ? CMCDController : undefined,
  contentSteeringController: __USE_CONTENT_STEERING__
    ? ContentSteeringController
    : undefined,
  interstitialsController: __USE_INTERSTITIALS__
    ? InterstitialsController
    : undefined,
};

function timelineConfig(): TimelineControllerConfig {
  return {
    cueHandler: Cues, // used by timeline-controller
    enableWebVTT: __USE_SUBTITLES__, // used by timeline-controller
    enableIMSC1: __USE_SUBTITLES__, // used by timeline-controller
    enableCEA708Captions: __USE_SUBTITLES__, // used by timeline-controller
    captionsTextTrack1Label: 'English', // used by timeline-controller
    captionsTextTrack1LanguageCode: 'en', // used by timeline-controller
    captionsTextTrack2Label: 'Spanish', // used by timeline-controller
    captionsTextTrack2LanguageCode: 'es', // used by timeline-controller
    captionsTextTrack3Label: 'Unknown CC', // used by timeline-controller
    captionsTextTrack3LanguageCode: '', // used by timeline-controller
    captionsTextTrack4Label: 'Unknown CC', // used by timeline-controller
    captionsTextTrack4LanguageCode: '', // used by timeline-controller
    renderTextTracksNatively: true,
  };
}

/**
 * @ignore
 */
export function mergeConfig(
  defaultConfig: HlsConfig,
  userConfig: Partial<HlsConfig>,
  logger: ILogger,
): HlsConfig {
  if (
    (userConfig.liveSyncDurationCount ||
      userConfig.liveMaxLatencyDurationCount) &&
    (userConfig.liveSyncDuration || userConfig.liveMaxLatencyDuration)
  ) {
    throw new Error(
      "Illegal hls.js config: don't mix up liveSyncDurationCount/liveMaxLatencyDurationCount and liveSyncDuration/liveMaxLatencyDuration",
    );
  }

  if (
    userConfig.liveMaxLatencyDurationCount !== undefined &&
    (userConfig.liveSyncDurationCount === undefined ||
      userConfig.liveMaxLatencyDurationCount <=
        userConfig.liveSyncDurationCount)
  ) {
    throw new Error(
      'Illegal hls.js config: "liveMaxLatencyDurationCount" must be greater than "liveSyncDurationCount"',
    );
  }

  if (
    userConfig.liveMaxLatencyDuration !== undefined &&
    (userConfig.liveSyncDuration === undefined ||
      userConfig.liveMaxLatencyDuration <= userConfig.liveSyncDuration)
  ) {
    throw new Error(
      'Illegal hls.js config: "liveMaxLatencyDuration" must be greater than "liveSyncDuration"',
    );
  }

  const defaultsCopy = deepCpy(defaultConfig);

  // Backwards compatibility with deprecated config values
  const deprecatedSettingTypes = ['manifest', 'level', 'frag'];
  const deprecatedSettings = [
    'TimeOut',
    'MaxRetry',
    'RetryDelay',
    'MaxRetryTimeout',
  ];
  deprecatedSettingTypes.forEach((type) => {
    const policyName = `${type === 'level' ? 'playlist' : type}LoadPolicy`;
    const policyNotSet = userConfig[policyName] === undefined;
    const report: string[] = [];
    deprecatedSettings.forEach((setting) => {
      const deprecatedSetting = `${type}Loading${setting}`;
      const value = userConfig[deprecatedSetting];
      if (value !== undefined && policyNotSet) {
        report.push(deprecatedSetting);
        const settings: LoaderConfig = defaultsCopy[policyName].default;
        userConfig[policyName] = { default: settings };
        switch (setting) {
          case 'TimeOut':
            settings.maxLoadTimeMs = value;
            settings.maxTimeToFirstByteMs = value;
            break;
          case 'MaxRetry':
            settings.errorRetry!.maxNumRetry = value;
            settings.timeoutRetry!.maxNumRetry = value;
            break;
          case 'RetryDelay':
            settings.errorRetry!.retryDelayMs = value;
            settings.timeoutRetry!.retryDelayMs = value;
            break;
          case 'MaxRetryTimeout':
            settings.errorRetry!.maxRetryDelayMs = value;
            settings.timeoutRetry!.maxRetryDelayMs = value;
            break;
        }
      }
    });
    if (report.length) {
      logger.warn(
        `hls.js config: "${report.join(
          '", "',
        )}" setting(s) are deprecated, use "${policyName}": ${stringify(
          userConfig[policyName],
        )}`,
      );
    }
  });

  return {
    ...defaultsCopy,
    ...userConfig,
  };
}

function deepCpy(obj: any): any {
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(deepCpy);
    }
    return Object.keys(obj).reduce((result, key) => {
      result[key] = deepCpy(obj[key]);
      return result;
    }, {});
  }
  return obj;
}

/**
 * @ignore
 */
export function enableStreamingMode(config: HlsConfig, logger: ILogger) {
  const currentLoader = config.loader;
  if (currentLoader !== FetchLoader && currentLoader !== XhrLoader) {
    // If a developer has configured their own loader, respect that choice
    logger.log(
      '[config]: Custom loader detected, cannot enable progressive streaming',
    );
    config.progressive = false;
  } else {
    const canStreamProgressively = fetchSupported();
    if (canStreamProgressively) {
      config.loader = FetchLoader;
      config.progressive = true;
      config.enableSoftwareAES = true;
      logger.log('[config]: Progressive streaming enabled, using FetchLoader');
    }
  }
}
