import { NetworkErrorAction } from './error-controller';
import { ErrorDetails, ErrorTypes } from '../errors';
import { Events } from '../events';
import {
  getSkipValue,
  HlsSkip,
  HlsUrlParameters,
  type Level,
} from '../types/level';
import { getRetryDelay, isTimeoutError } from '../utils/error-helper';
import { computeReloadInterval, mergeDetails } from '../utils/level-helper';
import { Logger } from '../utils/logger';
import type Hls from '../hls';
import type { LevelDetails } from '../loader/level-details';
import type { NetworkComponentAPI } from '../types/component-api';
import type { ErrorData } from '../types/events';
import type {
  AudioTrackLoadedData,
  LevelLoadedData,
  TrackLoadedData,
} from '../types/events';
import type { MediaPlaylist } from '../types/media-playlist';

export default class BasePlaylistController
  extends Logger
  implements NetworkComponentAPI
{
  protected hls: Hls;
  protected canLoad: boolean = false;
  private timer: number = -1;

  constructor(hls: Hls, logPrefix: string) {
    super(logPrefix, hls.logger);
    this.hls = hls;
  }

  public destroy() {
    this.clearTimer();
    // @ts-ignore
    this.hls = this.log = this.warn = null;
  }

  private clearTimer() {
    if (this.timer !== -1) {
      self.clearTimeout(this.timer);
      this.timer = -1;
    }
  }

  public startLoad() {
    this.canLoad = true;
    this.loadPlaylist();
  }

  public stopLoad() {
    this.canLoad = false;
    this.clearTimer();
  }

  protected switchParams(
    playlistUri: string,
    previous: LevelDetails | undefined,
    current: LevelDetails | undefined,
  ): HlsUrlParameters | undefined {
    const renditionReports = previous?.renditionReports;
    if (renditionReports) {
      let foundIndex = -1;
      for (let i = 0; i < renditionReports.length; i++) {
        const attr = renditionReports[i];
        let uri: string;
        try {
          uri = new self.URL(attr.URI, previous.url).href;
        } catch (error) {
          this.warn(
            `Could not construct new URL for Rendition Report: ${error}`,
          );
          uri = attr.URI || '';
        }
        // Use exact match. Otherwise, the last partial match, if any, will be used
        // (Playlist URI includes a query string that the Rendition Report does not)
        if (uri === playlistUri) {
          foundIndex = i;
          break;
        } else if (uri === playlistUri.substring(0, uri.length)) {
          foundIndex = i;
        }
      }
      if (foundIndex !== -1) {
        const attr = renditionReports[foundIndex];
        const msn = parseInt(attr['LAST-MSN']) || previous.lastPartSn;
        let part = parseInt(attr['LAST-PART']) || previous.lastPartIndex;
        if (this.hls.config.lowLatencyMode) {
          const currentGoal = Math.min(
            previous.age - previous.partTarget,
            previous.targetduration,
          );
          if (part >= 0 && currentGoal > previous.partTarget) {
            part += 1;
          }
        }
        const skip = current && getSkipValue(current);
        return new HlsUrlParameters(msn, part >= 0 ? part : undefined, skip);
      }
    }
  }

  protected loadPlaylist(hlsUrlParameters?: HlsUrlParameters) {
    // Loading is handled by the subclasses
    this.clearTimer();
  }

  protected loadingPlaylist(
    playlist: Level | MediaPlaylist,
    hlsUrlParameters?: HlsUrlParameters,
  ) {
    // Loading is handled by the subclasses
    this.clearTimer();
  }

  protected shouldLoadPlaylist(
    playlist: Level | MediaPlaylist | null | undefined,
  ): playlist is Level | MediaPlaylist {
    return (
      this.canLoad &&
      !!playlist &&
      !!playlist.url &&
      (!playlist.details || playlist.details.live)
    );
  }

  protected getUrlWithDirectives(
    uri: string,
    hlsUrlParameters: HlsUrlParameters | undefined,
  ): string {
    if (hlsUrlParameters) {
      try {
        return hlsUrlParameters.addDirectives(uri);
      } catch (error) {
        this.warn(
          `Could not construct new URL with HLS Delivery Directives: ${error}`,
        );
      }
    }
    return uri;
  }

  protected playlistLoaded(
    index: number,
    data: LevelLoadedData | AudioTrackLoadedData | TrackLoadedData,
    previousDetails?: LevelDetails,
  ) {
    const { details, stats } = data;

    // Set last updated date-time
    const now = self.performance.now();
    const elapsed = stats.loading.first
      ? Math.max(0, now - stats.loading.first)
      : 0;
    details.advancedDateTime = Date.now() - elapsed;

    // shift fragment starts with timelineOffset
    const timelineOffset = this.hls.config.timelineOffset;
    if (timelineOffset !== details.appliedTimelineOffset) {
      const offset = Math.max(timelineOffset || 0, 0);
      details.appliedTimelineOffset = offset;
      details.fragments.forEach((frag) => {
        frag.setStart(frag.playlistOffset + offset);
      });
    }

    // if current playlist is a live playlist, arm a timer to reload it
    if (details.live || previousDetails?.live) {
      const levelOrTrack = 'levelInfo' in data ? data.levelInfo : data.track;
      details.reloaded(previousDetails);
      // Merge live playlists to adjust fragment starts and fill in delta playlist skipped segments
      if (previousDetails && details.fragments.length > 0) {
        mergeDetails(previousDetails, details, this);
        const error = details.playlistParsingError;
        if (error) {
          this.warn(error);
          const hls = this.hls;
          if (!hls.config.ignorePlaylistParsingErrors) {
            const { networkDetails } = data;
            hls.trigger(Events.ERROR, {
              type: ErrorTypes.NETWORK_ERROR,
              details: ErrorDetails.LEVEL_PARSING_ERROR,
              fatal: false,
              url: details.url,
              error,
              reason: error.message,
              level: (data as any).level || undefined,
              parent: details.fragments[0]?.type,
              networkDetails,
              stats,
            });
            return;
          }
          details.playlistParsingError = null;
        }
      }
      if (details.requestScheduled === -1) {
        details.requestScheduled = stats.loading.start;
      }
      const bufferInfo = this.hls.mainForwardBufferInfo;
      const position = bufferInfo ? bufferInfo.end - bufferInfo.len : 0;
      const distanceToLiveEdgeMs = (details.edge - position) * 1000;
      const reloadInterval = computeReloadInterval(
        details,
        distanceToLiveEdgeMs,
      );
      if (details.requestScheduled + reloadInterval < now) {
        details.requestScheduled = now;
      } else {
        details.requestScheduled += reloadInterval;
      }
      this.log(
        `live playlist ${index} ${
          details.advanced
            ? 'REFRESHED ' + details.lastPartSn + '-' + details.lastPartIndex
            : details.updated
              ? 'UPDATED'
              : 'MISSED'
        }`,
      );
      if (!this.canLoad || !details.live) {
        return;
      }
      let deliveryDirectives: HlsUrlParameters | undefined;
      let msn: number | undefined = undefined;
      let part: number | undefined = undefined;
      if (details.canBlockReload && details.endSN && details.advanced) {
        // Load level with LL-HLS delivery directives
        const lowLatencyMode = this.hls.config.lowLatencyMode;
        const lastPartSn = details.lastPartSn;
        const endSn = details.endSN;
        const lastPartIndex = details.lastPartIndex;
        const hasParts = lastPartIndex !== -1;
        const atLastPartOfSegment = lastPartSn === endSn;
        if (hasParts) {
          // When low latency mode is disabled, request the last part of the next segment
          if (atLastPartOfSegment) {
            msn = endSn + 1;
            part = lowLatencyMode ? 0 : lastPartIndex;
          } else {
            msn = lastPartSn;
            part = lowLatencyMode ? lastPartIndex + 1 : details.maxPartIndex;
          }
        } else {
          msn = endSn + 1;
        }
        // Low-Latency CDN Tune-in: "age" header and time since load indicates we're behind by more than one part
        // Update directives to obtain the Playlist that has the estimated additional duration of media
        const lastAdvanced = details.age;
        const cdnAge = lastAdvanced + details.ageHeader;
        let currentGoal = Math.min(
          cdnAge - details.partTarget,
          details.targetduration * 1.5,
        );
        if (currentGoal > 0) {
          if (cdnAge > details.targetduration * 3) {
            // Omit segment and part directives when the last response was more than 3 target durations ago,
            this.log(
              `Playlist last advanced ${lastAdvanced.toFixed(
                2,
              )}s ago. Omitting segment and part directives.`,
            );
            msn = undefined;
            part = undefined;
          } else if (
            previousDetails?.tuneInGoal &&
            cdnAge - details.partTarget > previousDetails.tuneInGoal
          ) {
            // If we attempted to get the next or latest playlist update, but currentGoal increased,
            // then we either can't catchup, or the "age" header cannot be trusted.
            this.warn(
              `CDN Tune-in goal increased from: ${previousDetails.tuneInGoal} to: ${currentGoal} with playlist age: ${details.age}`,
            );
            currentGoal = 0;
          } else {
            const segments = Math.floor(currentGoal / details.targetduration);
            msn += segments;
            if (part !== undefined) {
              const parts = Math.round(
                (currentGoal % details.targetduration) / details.partTarget,
              );
              part += parts;
            }
            this.log(
              `CDN Tune-in age: ${
                details.ageHeader
              }s last advanced ${lastAdvanced.toFixed(
                2,
              )}s goal: ${currentGoal} skip sn ${segments} to part ${part}`,
            );
          }
          details.tuneInGoal = currentGoal;
        }
        deliveryDirectives = this.getDeliveryDirectives(
          details,
          data.deliveryDirectives,
          msn,
          part,
        );
        if (lowLatencyMode || !atLastPartOfSegment) {
          details.requestScheduled = now;
          this.loadingPlaylist(levelOrTrack, deliveryDirectives);
          return;
        }
      } else if (details.canBlockReload || details.canSkipUntil) {
        deliveryDirectives = this.getDeliveryDirectives(
          details,
          data.deliveryDirectives,
          msn,
          part,
        );
      }
      if (deliveryDirectives && msn !== undefined && details.canBlockReload) {
        details.requestScheduled =
          stats.loading.first +
          Math.max(reloadInterval - elapsed * 2, reloadInterval / 2);
      }
      this.scheduleLoading(levelOrTrack, deliveryDirectives, details);
    } else {
      this.clearTimer();
    }
  }

  protected scheduleLoading(
    levelOrTrack: Level | MediaPlaylist,
    deliveryDirectives?: HlsUrlParameters,
    updatedDetails?: LevelDetails,
  ) {
    const details = updatedDetails || levelOrTrack.details;
    if (!details) {
      this.loadingPlaylist(levelOrTrack, deliveryDirectives);
      return;
    }
    const now = self.performance.now();
    const requestScheduled = details.requestScheduled;
    if (now >= requestScheduled) {
      this.loadingPlaylist(levelOrTrack, deliveryDirectives);
      return;
    }

    const estimatedTimeUntilUpdate = requestScheduled - now;
    this.log(
      `reload live playlist ${levelOrTrack.name || levelOrTrack.bitrate + 'bps'} in ${Math.round(
        estimatedTimeUntilUpdate,
      )} ms`,
    );

    this.clearTimer();
    this.timer = self.setTimeout(
      () => this.loadingPlaylist(levelOrTrack, deliveryDirectives),
      estimatedTimeUntilUpdate,
    );
  }

  private getDeliveryDirectives(
    details: LevelDetails,
    previousDeliveryDirectives: HlsUrlParameters | null,
    msn?: number,
    part?: number,
  ): HlsUrlParameters {
    let skip = getSkipValue(details);
    if (previousDeliveryDirectives?.skip && details.deltaUpdateFailed) {
      msn = previousDeliveryDirectives.msn;
      part = previousDeliveryDirectives.part;
      skip = HlsSkip.No;
    }
    return new HlsUrlParameters(msn, part, skip);
  }

  protected checkRetry(errorEvent: ErrorData): boolean {
    const errorDetails = errorEvent.details;
    const isTimeout = isTimeoutError(errorEvent);
    const errorAction = errorEvent.errorAction;
    const { action, retryCount = 0, retryConfig } = errorAction || {};
    const retry =
      !!errorAction &&
      !!retryConfig &&
      (action === NetworkErrorAction.RetryRequest ||
        (!errorAction.resolved &&
          action === NetworkErrorAction.SendAlternateToPenaltyBox));
    if (retry) {
      if (retryCount >= retryConfig.maxNumRetry) {
        return false;
      }
      if (isTimeout && errorEvent.context?.deliveryDirectives) {
        // The LL-HLS request already timed out so retry immediately
        this.warn(
          `Retrying playlist loading ${retryCount + 1}/${
            retryConfig.maxNumRetry
          } after "${errorDetails}" without delivery-directives`,
        );
        this.loadPlaylist();
      } else {
        const delay = getRetryDelay(retryConfig, retryCount);
        // Schedule level/track reload
        this.clearTimer();
        this.timer = self.setTimeout(() => this.loadPlaylist(), delay);
        this.warn(
          `Retrying playlist loading ${retryCount + 1}/${
            retryConfig.maxNumRetry
          } after "${errorDetails}" in ${delay}ms`,
        );
      }
      // `levelRetry = true` used to inform other controllers that a retry is happening
      errorEvent.levelRetry = true;
      errorAction.resolved = true;
    }
    return retry;
  }
}
