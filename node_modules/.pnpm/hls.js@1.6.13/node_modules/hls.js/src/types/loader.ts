import type { LoaderConfig } from '../config';
import type { HlsUrlParameters, Level } from './level';
import type { MediaPlaylist } from './media-playlist';
import type { Fragment } from '../loader/fragment';
import type { Part } from '../loader/fragment';
import type { KeyLoaderInfo } from '../loader/key-loader';
import type { LevelDetails } from '../loader/level-details';

export interface LoaderContext {
  // target URL
  url: string;
  // loader response type (arraybuffer or default response type for playlist)
  responseType: string;
  // headers
  headers?: Record<string, string>;
  // start byte range offset
  rangeStart?: number;
  // end byte range offset
  rangeEnd?: number;
  // true if onProgress should report partial chunk of loaded content
  progressData?: boolean;
}

export interface FragmentLoaderContext extends LoaderContext {
  frag: Fragment;
  part: Part | null;
  resetIV?: boolean;
}

export interface KeyLoaderContext extends LoaderContext {
  keyInfo: KeyLoaderInfo;
  frag: Fragment;
}

export interface LoaderConfiguration {
  // LoaderConfig policy that overrides required settings
  loadPolicy: LoaderConfig;
  /**
   * @deprecated use LoaderConfig timeoutRetry and errorRetry maxNumRetry
   */
  // Max number of load retries
  maxRetry: number;
  /**
   * @deprecated use LoaderConfig maxTimeToFirstByteMs and maxLoadTimeMs
   */
  // Timeout after which `onTimeOut` callback will be triggered
  //  when loading has not finished after that delay
  timeout: number;
  /**
   * @deprecated use LoaderConfig timeoutRetry and errorRetry retryDelayMs
   */
  // Delay between an I/O error and following connection retry (ms).
  // This to avoid spamming the server
  retryDelay: number;
  /**
   * @deprecated use LoaderConfig timeoutRetry and errorRetry maxRetryDelayMs
   */
  // max connection retry delay (ms)
  maxRetryDelay: number;
  // When streaming progressively, this is the minimum chunk size required to emit a PROGRESS event
  highWaterMark?: number;
}

export interface LoaderResponse {
  url: string;
  data?: string | ArrayBuffer | Object;
  // Errors can include HTTP status code and error message
  // Successful responses should include status code 200
  code?: number;
  text?: string;
}

export interface LoaderStats {
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

export interface HlsPerformanceTiming {
  start: number;
  end: number;
}

export interface HlsChunkPerformanceTiming extends HlsPerformanceTiming {
  executeStart: number;
  executeEnd: number;
}

export interface HlsProgressivePerformanceTiming extends HlsPerformanceTiming {
  first: number;
}

export type LoaderOnSuccess<T extends LoaderContext> = (
  response: LoaderResponse,
  stats: LoaderStats,
  context: T,
  networkDetails: any,
) => void;

export type LoaderOnProgress<T extends LoaderContext> = (
  stats: LoaderStats,
  context: T,
  data: string | ArrayBuffer,
  networkDetails: any,
) => void;

export type LoaderOnError<T extends LoaderContext> = (
  error: {
    // error status code
    code: number;
    // error description
    text: string;
  },
  context: T,
  networkDetails: any,
  stats: LoaderStats,
) => void;

export type LoaderOnTimeout<T extends LoaderContext> = (
  stats: LoaderStats,
  context: T,
  networkDetails: any,
) => void;

export type LoaderOnAbort<T extends LoaderContext> = (
  stats: LoaderStats,
  context: T,
  networkDetails: any,
) => void;

export interface LoaderCallbacks<T extends LoaderContext> {
  onSuccess: LoaderOnSuccess<T>;
  onError: LoaderOnError<T>;
  onTimeout: LoaderOnTimeout<T>;
  onAbort?: LoaderOnAbort<T>;
  onProgress?: LoaderOnProgress<T>;
}

export interface Loader<T extends LoaderContext> {
  destroy(): void;
  abort(): void;
  load(
    context: T,
    config: LoaderConfiguration,
    callbacks: LoaderCallbacks<T>,
  ): void;
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

export const enum PlaylistContextType {
  MANIFEST = 'manifest',
  LEVEL = 'level',
  AUDIO_TRACK = 'audioTrack',
  SUBTITLE_TRACK = 'subtitleTrack',
}

export const enum PlaylistLevelType {
  MAIN = 'main',
  AUDIO = 'audio',
  SUBTITLE = 'subtitle',
}

export interface PlaylistLoaderContext extends LoaderContext {
  type: PlaylistContextType;
  // the level index to load
  level: number | null;
  // level or track id from LevelLoadingData / TrackLoadingData
  id: number | null;
  // Media Playlist Group ID
  groupId?: string;
  // Content Steering Pathway ID (or undefined for default Pathway ".")
  pathwayId?: string;
  // internal representation of a parsed m3u8 level playlist
  levelDetails?: LevelDetails;
  // Blocking playlist request delivery directives (or null id none were added to playlist url
  deliveryDirectives: HlsUrlParameters | null;
  // Reference to level or track object in hls.levels, hls.allAudioTracks, or hls.allSubtitleTracks (null when loading MVP)
  levelOrTrack: Level | MediaPlaylist | null;
}
