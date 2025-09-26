import { ErrorDetails } from '../errors';
import { Events } from '../events';
import type { HlsConfig } from '../config';
import type Hls from '../hls';
import type { LevelDetails } from '../loader/level-details';
import type { ComponentAPI } from '../types/component-api';
import type {
  ErrorData,
  LevelUpdatedData,
  MediaAttachingData,
} from '../types/events';

export default class LatencyController implements ComponentAPI {
  private hls: Hls | null;
  private readonly config: HlsConfig;
  private media: HTMLMediaElement | null = null;
  private currentTime: number = 0;
  private stallCount: number = 0;
  private _latency: number | null = null;
  private _targetLatencyUpdated = false;

  constructor(hls: Hls) {
    this.hls = hls;
    this.config = hls.config;
    this.registerListeners();
  }

  private get levelDetails(): LevelDetails | null {
    return this.hls?.latestLevelDetails || null;
  }

  get latency(): number {
    return this._latency || 0;
  }

  get maxLatency(): number {
    const { config } = this;
    if (config.liveMaxLatencyDuration !== undefined) {
      return config.liveMaxLatencyDuration;
    }
    const levelDetails = this.levelDetails;
    return levelDetails
      ? config.liveMaxLatencyDurationCount * levelDetails.targetduration
      : 0;
  }

  get targetLatency(): number | null {
    const levelDetails = this.levelDetails;
    if (levelDetails === null || this.hls === null) {
      return null;
    }
    const { holdBack, partHoldBack, targetduration } = levelDetails;
    const { liveSyncDuration, liveSyncDurationCount, lowLatencyMode } =
      this.config;
    const userConfig = this.hls.userConfig;
    let targetLatency = lowLatencyMode ? partHoldBack || holdBack : holdBack;
    if (
      this._targetLatencyUpdated ||
      userConfig.liveSyncDuration ||
      userConfig.liveSyncDurationCount ||
      targetLatency === 0
    ) {
      targetLatency =
        liveSyncDuration !== undefined
          ? liveSyncDuration
          : liveSyncDurationCount * targetduration;
    }
    const maxLiveSyncOnStallIncrease = targetduration;
    return (
      targetLatency +
      Math.min(
        this.stallCount * this.config.liveSyncOnStallIncrease,
        maxLiveSyncOnStallIncrease,
      )
    );
  }

  set targetLatency(latency: number) {
    this.stallCount = 0;
    this.config.liveSyncDuration = latency;
    this._targetLatencyUpdated = true;
  }

  get liveSyncPosition(): number | null {
    const liveEdge = this.estimateLiveEdge();
    const targetLatency = this.targetLatency;
    if (liveEdge === null || targetLatency === null) {
      return null;
    }
    const levelDetails = this.levelDetails;
    if (levelDetails === null) {
      return null;
    }
    const edge = levelDetails.edge;
    const syncPosition = liveEdge - targetLatency - this.edgeStalled;
    const min = edge - levelDetails.totalduration;
    const max =
      edge -
      ((this.config.lowLatencyMode && levelDetails.partTarget) ||
        levelDetails.targetduration);
    return Math.min(Math.max(min, syncPosition), max);
  }

  get drift(): number {
    const levelDetails = this.levelDetails;
    if (levelDetails === null) {
      return 1;
    }
    return levelDetails.drift;
  }

  get edgeStalled(): number {
    const levelDetails = this.levelDetails;
    if (levelDetails === null) {
      return 0;
    }
    const maxLevelUpdateAge =
      ((this.config.lowLatencyMode && levelDetails.partTarget) ||
        levelDetails.targetduration) * 3;
    return Math.max(levelDetails.age - maxLevelUpdateAge, 0);
  }

  private get forwardBufferLength(): number {
    const { media } = this;
    const levelDetails = this.levelDetails;
    if (!media || !levelDetails) {
      return 0;
    }
    const bufferedRanges = media.buffered.length;
    return (
      (bufferedRanges
        ? media.buffered.end(bufferedRanges - 1)
        : levelDetails.edge) - this.currentTime
    );
  }

  public destroy(): void {
    this.unregisterListeners();
    this.onMediaDetaching();
    this.hls = null;
  }

  private registerListeners() {
    const { hls } = this;
    if (!hls) {
      return;
    }
    hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
    hls.on(Events.ERROR, this.onError, this);
  }

  private unregisterListeners() {
    const { hls } = this;
    if (!hls) {
      return;
    }
    hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
    hls.off(Events.ERROR, this.onError, this);
  }

  private onMediaAttached(
    event: Events.MEDIA_ATTACHED,
    data: MediaAttachingData,
  ) {
    this.media = data.media;
    this.media.addEventListener('timeupdate', this.onTimeupdate);
  }

  private onMediaDetaching() {
    if (this.media) {
      this.media.removeEventListener('timeupdate', this.onTimeupdate);
      this.media = null;
    }
  }

  private onManifestLoading() {
    this._latency = null;
    this.stallCount = 0;
  }

  private onLevelUpdated(
    event: Events.LEVEL_UPDATED,
    { details }: LevelUpdatedData,
  ) {
    if (details.advanced) {
      this.onTimeupdate();
    }
    if (!details.live && this.media) {
      this.media.removeEventListener('timeupdate', this.onTimeupdate);
    }
  }

  private onError(event: Events.ERROR, data: ErrorData) {
    if (data.details !== ErrorDetails.BUFFER_STALLED_ERROR) {
      return;
    }
    this.stallCount++;
    if (this.hls && this.levelDetails?.live) {
      this.hls.logger.warn(
        '[latency-controller]: Stall detected, adjusting target latency',
      );
    }
  }

  private onTimeupdate = () => {
    const { media } = this;
    const levelDetails = this.levelDetails;
    if (!media || !levelDetails) {
      return;
    }
    this.currentTime = media.currentTime;

    const latency = this.computeLatency();
    if (latency === null) {
      return;
    }
    this._latency = latency;

    // Adapt playbackRate to meet target latency in low-latency mode
    const { lowLatencyMode, maxLiveSyncPlaybackRate } = this.config;
    if (
      !lowLatencyMode ||
      maxLiveSyncPlaybackRate === 1 ||
      !levelDetails.live
    ) {
      return;
    }
    const targetLatency = this.targetLatency;
    if (targetLatency === null) {
      return;
    }
    const distanceFromTarget = latency - targetLatency;
    // Only adjust playbackRate when within one target duration of targetLatency
    // and more than one second from under-buffering.
    // Playback further than one target duration from target can be considered DVR playback.
    const liveMinLatencyDuration = Math.min(
      this.maxLatency,
      targetLatency + levelDetails.targetduration,
    );
    const inLiveRange = distanceFromTarget < liveMinLatencyDuration;

    if (
      inLiveRange &&
      distanceFromTarget > 0.05 &&
      this.forwardBufferLength > 1
    ) {
      const max = Math.min(2, Math.max(1.0, maxLiveSyncPlaybackRate));
      const rate =
        Math.round(
          (2 / (1 + Math.exp(-0.75 * distanceFromTarget - this.edgeStalled))) *
            20,
        ) / 20;
      const playbackRate = Math.min(max, Math.max(1, rate));
      this.changeMediaPlaybackRate(media, playbackRate);
    } else if (media.playbackRate !== 1 && media.playbackRate !== 0) {
      this.changeMediaPlaybackRate(media, 1);
    }
  };

  private changeMediaPlaybackRate(
    media: HTMLMediaElement,
    playbackRate: number,
  ) {
    if (media.playbackRate === playbackRate) {
      return;
    }
    this.hls?.logger.debug(
      `[latency-controller]: latency=${this.latency.toFixed(3)}, targetLatency=${this.targetLatency?.toFixed(3)}, forwardBufferLength=${this.forwardBufferLength.toFixed(3)}: adjusting playback rate from ${media.playbackRate} to ${playbackRate}`,
    );
    media.playbackRate = playbackRate;
  }

  private estimateLiveEdge(): number | null {
    const levelDetails = this.levelDetails;
    if (levelDetails === null) {
      return null;
    }
    return levelDetails.edge + levelDetails.age;
  }

  private computeLatency(): number | null {
    const liveEdge = this.estimateLiveEdge();
    if (liveEdge === null) {
      return null;
    }
    return liveEdge - this.currentTime;
  }
}
