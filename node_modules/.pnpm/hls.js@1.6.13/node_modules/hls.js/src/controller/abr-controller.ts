import { ErrorDetails } from '../errors';
import { Events } from '../events';
import { PlaylistLevelType } from '../types/loader';
import EwmaBandWidthEstimator from '../utils/ewma-bandwidth-estimator';
import { Logger } from '../utils/logger';
import {
  getMediaDecodingInfoPromise,
  requiresMediaCapabilitiesDecodingInfo,
  SUPPORTED_INFO_DEFAULT,
} from '../utils/mediacapabilities-helper';
import {
  type AudioTracksByGroup,
  type CodecSetTier,
  getAudioTracksByGroup,
  getCodecTiers,
  getStartCodecTier,
} from '../utils/rendition-helper';
import { stringify } from '../utils/safe-json-stringify';
import type Hls from '../hls';
import type { Fragment } from '../loader/fragment';
import type { Part } from '../loader/fragment';
import type { AbrComponentAPI } from '../types/component-api';
import type {
  ErrorData,
  FragBufferedData,
  FragLoadedData,
  FragLoadingData,
  LevelLoadedData,
  LevelSwitchingData,
  ManifestLoadingData,
} from '../types/events';
import type { Level, VideoRange } from '../types/level';
import type { LoaderStats } from '../types/loader';

class AbrController extends Logger implements AbrComponentAPI {
  protected hls: Hls;
  private lastLevelLoadSec: number = 0;
  private lastLoadedFragLevel: number = -1;
  private firstSelection: number = -1;
  private _nextAutoLevel: number = -1;
  private nextAutoLevelKey: string = '';
  private audioTracksByGroup: AudioTracksByGroup | null = null;
  private codecTiers: Record<string, CodecSetTier> | null = null;
  private timer: number = -1;
  private fragCurrent: Fragment | null = null;
  private partCurrent: Part | null = null;
  private bitrateTestDelay: number = 0;
  private rebufferNotice: number = -1;
  private supportedCache: Record<
    string,
    Promise<MediaCapabilitiesDecodingInfo>
  > = {};

  public bwEstimator: EwmaBandWidthEstimator;

  constructor(hls: Hls) {
    super('abr', hls.logger);
    this.hls = hls;
    this.bwEstimator = this.initEstimator();
    this.registerListeners();
  }

  public resetEstimator(abrEwmaDefaultEstimate?: number) {
    if (abrEwmaDefaultEstimate) {
      this.log(`setting initial bwe to ${abrEwmaDefaultEstimate}`);
      this.hls.config.abrEwmaDefaultEstimate = abrEwmaDefaultEstimate;
    }
    this.firstSelection = -1;
    this.bwEstimator = this.initEstimator();
  }

  private initEstimator(): EwmaBandWidthEstimator {
    const config = this.hls.config;
    return new EwmaBandWidthEstimator(
      config.abrEwmaSlowVoD,
      config.abrEwmaFastVoD,
      config.abrEwmaDefaultEstimate,
    );
  }

  protected registerListeners() {
    const { hls } = this;
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.FRAG_LOADING, this.onFragLoading, this);
    hls.on(Events.FRAG_LOADED, this.onFragLoaded, this);
    hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
    hls.on(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
    hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
    hls.on(Events.MAX_AUTO_LEVEL_UPDATED, this.onMaxAutoLevelUpdated, this);
    hls.on(Events.ERROR, this.onError, this);
  }

  protected unregisterListeners() {
    const { hls } = this;
    if (!hls) {
      return;
    }
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.FRAG_LOADING, this.onFragLoading, this);
    hls.off(Events.FRAG_LOADED, this.onFragLoaded, this);
    hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
    hls.off(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
    hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
    hls.off(Events.MAX_AUTO_LEVEL_UPDATED, this.onMaxAutoLevelUpdated, this);
    hls.off(Events.ERROR, this.onError, this);
  }

  public destroy() {
    this.unregisterListeners();
    this.clearTimer();
    // @ts-ignore
    this.hls = this._abandonRulesCheck = this.supportedCache = null;
    this.fragCurrent = this.partCurrent = null;
  }

  protected onManifestLoading(
    event: Events.MANIFEST_LOADING,
    data: ManifestLoadingData,
  ) {
    this.lastLoadedFragLevel = -1;
    this.firstSelection = -1;
    this.lastLevelLoadSec = 0;
    this.supportedCache = {};
    this.fragCurrent = this.partCurrent = null;
    this.onLevelsUpdated();
    this.clearTimer();
  }

  private onLevelsUpdated() {
    if (this.lastLoadedFragLevel > -1 && this.fragCurrent) {
      this.lastLoadedFragLevel = this.fragCurrent.level;
    }
    this._nextAutoLevel = -1;
    this.onMaxAutoLevelUpdated();
    this.codecTiers = null;
    this.audioTracksByGroup = null;
  }

  private onMaxAutoLevelUpdated() {
    this.firstSelection = -1;
    this.nextAutoLevelKey = '';
  }

  protected onFragLoading(event: Events.FRAG_LOADING, data: FragLoadingData) {
    const frag = data.frag;
    if (this.ignoreFragment(frag)) {
      return;
    }
    if (!frag.bitrateTest) {
      this.fragCurrent = frag;
      this.partCurrent = data.part ?? null;
    }
    this.clearTimer();
    this.timer = self.setInterval(this._abandonRulesCheck, 100);
  }

  protected onLevelSwitching(
    event: Events.LEVEL_SWITCHING,
    data: LevelSwitchingData,
  ): void {
    this.clearTimer();
  }

  protected onError(event: Events.ERROR, data: ErrorData) {
    if (data.fatal) {
      return;
    }
    switch (data.details) {
      case ErrorDetails.BUFFER_ADD_CODEC_ERROR:
      case ErrorDetails.BUFFER_APPEND_ERROR:
        // Reset last loaded level so that a new selection can be made after calling recoverMediaError
        this.lastLoadedFragLevel = -1;
        this.firstSelection = -1;
        break;
      case ErrorDetails.FRAG_LOAD_TIMEOUT: {
        const frag = data.frag;
        const { fragCurrent, partCurrent: part } = this;
        if (
          frag &&
          fragCurrent &&
          frag.sn === fragCurrent.sn &&
          frag.level === fragCurrent.level
        ) {
          const now = performance.now();
          const stats: LoaderStats = part ? part.stats : frag.stats;
          const timeLoading = now - stats.loading.start;
          const ttfb = stats.loading.first
            ? stats.loading.first - stats.loading.start
            : -1;
          const loadedFirstByte = stats.loaded && ttfb > -1;
          if (loadedFirstByte) {
            const ttfbEstimate = this.bwEstimator.getEstimateTTFB();
            this.bwEstimator.sample(
              timeLoading - Math.min(ttfbEstimate, ttfb),
              stats.loaded,
            );
          } else {
            this.bwEstimator.sampleTTFB(timeLoading);
          }
        }
        break;
      }
    }
  }

  private getTimeToLoadFrag(
    timeToFirstByteSec: number,
    bandwidth: number,
    fragSizeBits: number,
    isSwitch: boolean,
  ): number {
    const fragLoadSec = timeToFirstByteSec + fragSizeBits / bandwidth;
    const playlistLoadSec = isSwitch
      ? timeToFirstByteSec + this.lastLevelLoadSec
      : 0;
    return fragLoadSec + playlistLoadSec;
  }

  protected onLevelLoaded(event: Events.LEVEL_LOADED, data: LevelLoadedData) {
    const config = this.hls.config;
    const { loading } = data.stats;
    const timeLoadingMs = loading.end - loading.first;
    if (Number.isFinite(timeLoadingMs)) {
      this.lastLevelLoadSec = timeLoadingMs / 1000;
    }
    if (data.details.live) {
      this.bwEstimator.update(config.abrEwmaSlowLive, config.abrEwmaFastLive);
    } else {
      this.bwEstimator.update(config.abrEwmaSlowVoD, config.abrEwmaFastVoD);
    }
    if (this.timer > -1) {
      this._abandonRulesCheck(data.levelInfo);
    }
  }

  /*
      This method monitors the download rate of the current fragment, and will downswitch if that fragment will not load
      quickly enough to prevent underbuffering
    */
  private _abandonRulesCheck = (levelLoaded?: Level) => {
    const { fragCurrent: frag, partCurrent: part, hls } = this;
    const { autoLevelEnabled, media } = hls;
    if (!frag || !media) {
      return;
    }

    const now = performance.now();
    const stats: LoaderStats = part ? part.stats : frag.stats;
    const duration = part ? part.duration : frag.duration;
    const timeLoading = now - stats.loading.start;
    const minAutoLevel = hls.minAutoLevel;
    const loadingFragForLevel = frag.level;
    const currentAutoLevel = this._nextAutoLevel;
    // If frag loading is aborted, complete, or from lowest level, stop timer and return
    if (
      stats.aborted ||
      (stats.loaded && stats.loaded === stats.total) ||
      loadingFragForLevel <= minAutoLevel
    ) {
      this.clearTimer();
      // reset forced auto level value so that next level will be selected
      this._nextAutoLevel = -1;
      return;
    }

    // This check only runs if we're in ABR mode
    if (!autoLevelEnabled) {
      return;
    }

    // Must be loading/loaded a new level or be in a playing state
    const fragBlockingSwitch =
      currentAutoLevel > -1 && currentAutoLevel !== loadingFragForLevel;
    const levelChange = !!levelLoaded || fragBlockingSwitch;
    if (
      !levelChange &&
      (media.paused || !media.playbackRate || !media.readyState)
    ) {
      return;
    }

    const bufferInfo = hls.mainForwardBufferInfo;
    if (!levelChange && bufferInfo === null) {
      return;
    }

    const ttfbEstimate = this.bwEstimator.getEstimateTTFB();
    const playbackRate = Math.abs(media.playbackRate);
    // To maintain stable adaptive playback, only begin monitoring frag loading after half or more of its playback duration has passed
    if (
      timeLoading <=
      Math.max(ttfbEstimate, 1000 * (duration / (playbackRate * 2)))
    ) {
      return;
    }

    // bufferStarvationDelay is an estimate of the amount time (in seconds) it will take to exhaust the buffer
    const bufferStarvationDelay = bufferInfo
      ? bufferInfo.len / playbackRate
      : 0;
    const ttfb = stats.loading.first
      ? stats.loading.first - stats.loading.start
      : -1;
    const loadedFirstByte = stats.loaded && ttfb > -1;
    const bwEstimate: number = this.getBwEstimate();
    const levels = hls.levels;
    const level = levels[loadingFragForLevel];
    const expectedLen = Math.max(
      stats.loaded,
      Math.round((duration * (frag.bitrate || level.averageBitrate)) / 8),
    );
    let timeStreaming = loadedFirstByte ? timeLoading - ttfb : timeLoading;
    if (timeStreaming < 1 && loadedFirstByte) {
      timeStreaming = Math.min(timeLoading, (stats.loaded * 8) / bwEstimate);
    }
    const loadRate = loadedFirstByte
      ? (stats.loaded * 1000) / timeStreaming
      : 0;
    // fragLoadDelay is an estimate of the time (in seconds) it will take to buffer the remainder of the fragment
    const ttfbSeconds = ttfbEstimate / 1000;
    const fragLoadedDelay = loadRate
      ? (expectedLen - stats.loaded) / loadRate
      : (expectedLen * 8) / bwEstimate + ttfbSeconds;
    // Only downswitch if the time to finish loading the current fragment is greater than the amount of buffer left
    if (fragLoadedDelay <= bufferStarvationDelay) {
      return;
    }

    const bwe = loadRate ? loadRate * 8 : bwEstimate;
    const live =
      (levelLoaded?.details || this.hls.latestLevelDetails)?.live === true;
    const abrBandWidthUpFactor = this.hls.config.abrBandWidthUpFactor;
    let fragLevelNextLoadedDelay: number = Number.POSITIVE_INFINITY;
    let nextLoadLevel: number;
    // Iterate through lower level and try to find the largest one that avoids rebuffering
    for (
      nextLoadLevel = loadingFragForLevel - 1;
      nextLoadLevel > minAutoLevel;
      nextLoadLevel--
    ) {
      // compute time to load next fragment at lower level
      // 8 = bits per byte (bps/Bps)
      const levelNextBitrate = levels[nextLoadLevel].maxBitrate;
      const requiresLevelLoad = !levels[nextLoadLevel].details || live;
      fragLevelNextLoadedDelay = this.getTimeToLoadFrag(
        ttfbSeconds,
        bwe,
        duration * levelNextBitrate,
        requiresLevelLoad,
      );
      if (
        fragLevelNextLoadedDelay <
        Math.min(bufferStarvationDelay, duration + ttfbSeconds)
      ) {
        break;
      }
    }
    // Only emergency switch down if it takes less time to load a new fragment at lowest level instead of continuing
    // to load the current one
    if (fragLevelNextLoadedDelay >= fragLoadedDelay) {
      return;
    }

    // if estimated load time of new segment is completely unreasonable, ignore and do not emergency switch down
    if (fragLevelNextLoadedDelay > duration * 10) {
      return;
    }
    if (loadedFirstByte) {
      // If there has been loading progress, sample bandwidth using loading time offset by minimum TTFB time
      this.bwEstimator.sample(
        timeLoading - Math.min(ttfbEstimate, ttfb),
        stats.loaded,
      );
    } else {
      // If there has been no loading progress, sample TTFB
      this.bwEstimator.sampleTTFB(timeLoading);
    }
    const nextLoadLevelBitrate = levels[nextLoadLevel].maxBitrate;
    if (this.getBwEstimate() * abrBandWidthUpFactor > nextLoadLevelBitrate) {
      this.resetEstimator(nextLoadLevelBitrate);
    }
    const bestSwitchLevel = this.findBestLevel(
      nextLoadLevelBitrate,
      minAutoLevel,
      nextLoadLevel,
      0,
      bufferStarvationDelay,
      1,
      1,
    );
    if (bestSwitchLevel > -1) {
      nextLoadLevel = bestSwitchLevel;
    }

    this.warn(`Fragment ${frag.sn}${
      part ? ' part ' + part.index : ''
    } of level ${loadingFragForLevel} is loading too slowly;
      Fragment duration: ${frag.duration.toFixed(3)}
      Time to underbuffer: ${bufferStarvationDelay.toFixed(3)} s
      Estimated load time for current fragment: ${fragLoadedDelay.toFixed(3)} s
      Estimated load time for down switch fragment: ${fragLevelNextLoadedDelay.toFixed(
        3,
      )} s
      TTFB estimate: ${ttfb | 0} ms
      Current BW estimate: ${
        Number.isFinite(bwEstimate) ? bwEstimate | 0 : 'Unknown'
      } bps
      New BW estimate: ${this.getBwEstimate() | 0} bps
      Switching to level ${nextLoadLevel} @ ${nextLoadLevelBitrate | 0} bps`);

    hls.nextLoadLevel = hls.nextAutoLevel = nextLoadLevel;

    this.clearTimer();
    const abortAndSwitch = () => {
      // Are nextLoadLevel details available or is stream-controller still in "WAITING_LEVEL" state?
      this.clearTimer();
      if (
        this.fragCurrent === frag &&
        this.hls.loadLevel === nextLoadLevel &&
        nextLoadLevel > 0
      ) {
        const bufferStarvationDelay = this.getStarvationDelay();
        this
          .warn(`Aborting inflight request ${nextLoadLevel > 0 ? 'and switching down' : ''}
      Fragment duration: ${frag.duration.toFixed(3)} s
      Time to underbuffer: ${bufferStarvationDelay.toFixed(3)} s`);
        frag.abortRequests();
        this.fragCurrent = this.partCurrent = null;
        if (nextLoadLevel > minAutoLevel) {
          let lowestSwitchLevel = this.findBestLevel(
            this.hls.levels[minAutoLevel].bitrate,
            minAutoLevel,
            nextLoadLevel,
            0,
            bufferStarvationDelay,
            1,
            1,
          );
          if (lowestSwitchLevel === -1) {
            lowestSwitchLevel = minAutoLevel;
          }
          this.hls.nextLoadLevel = this.hls.nextAutoLevel = lowestSwitchLevel;
          this.resetEstimator(this.hls.levels[lowestSwitchLevel].bitrate);
        }
      }
    };
    if (fragBlockingSwitch || fragLoadedDelay > fragLevelNextLoadedDelay * 2) {
      abortAndSwitch();
    } else {
      this.timer = self.setInterval(
        abortAndSwitch,
        fragLevelNextLoadedDelay * 1000,
      );
    }

    hls.trigger(Events.FRAG_LOAD_EMERGENCY_ABORTED, { frag, part, stats });
  };

  protected onFragLoaded(
    event: Events.FRAG_LOADED,
    { frag, part }: FragLoadedData,
  ) {
    const stats = part ? part.stats : frag.stats;
    if (frag.type === PlaylistLevelType.MAIN) {
      this.bwEstimator.sampleTTFB(stats.loading.first - stats.loading.start);
    }
    if (this.ignoreFragment(frag)) {
      return;
    }
    // stop monitoring bw once frag loaded
    this.clearTimer();
    // reset forced auto level value so that next level will be selected
    if (frag.level === this._nextAutoLevel) {
      this._nextAutoLevel = -1;
    }
    this.firstSelection = -1;

    // compute level average bitrate
    if (this.hls.config.abrMaxWithRealBitrate) {
      const duration = part ? part.duration : frag.duration;
      const level = this.hls.levels[frag.level];
      const loadedBytes =
        (level.loaded ? level.loaded.bytes : 0) + stats.loaded;
      const loadedDuration =
        (level.loaded ? level.loaded.duration : 0) + duration;
      level.loaded = { bytes: loadedBytes, duration: loadedDuration };
      level.realBitrate = Math.round((8 * loadedBytes) / loadedDuration);
    }
    if (frag.bitrateTest) {
      const fragBufferedData: FragBufferedData = {
        stats,
        frag,
        part,
        id: frag.type,
      };
      this.onFragBuffered(Events.FRAG_BUFFERED, fragBufferedData);
      frag.bitrateTest = false;
    } else {
      // store level id after successful fragment load for playback
      this.lastLoadedFragLevel = frag.level;
    }
  }

  protected onFragBuffered(
    event: Events.FRAG_BUFFERED,
    data: FragBufferedData,
  ) {
    const { frag, part } = data;
    const stats = part?.stats.loaded ? part.stats : frag.stats;

    if (stats.aborted) {
      return;
    }
    if (this.ignoreFragment(frag)) {
      return;
    }
    // Use the difference between parsing and request instead of buffering and request to compute fragLoadingProcessing;
    // rationale is that buffer appending only happens once media is attached. This can happen when config.startFragPrefetch
    // is used. If we used buffering in that case, our BW estimate sample will be very large.
    const processingMs =
      stats.parsing.end -
      stats.loading.start -
      Math.min(
        stats.loading.first - stats.loading.start,
        this.bwEstimator.getEstimateTTFB(),
      );
    this.bwEstimator.sample(processingMs, stats.loaded);
    stats.bwEstimate = this.getBwEstimate();
    if (frag.bitrateTest) {
      this.bitrateTestDelay = processingMs / 1000;
    } else {
      this.bitrateTestDelay = 0;
    }
  }

  private ignoreFragment(frag: Fragment): boolean {
    // Only count non-alt-audio frags which were actually buffered in our BW calculations
    return frag.type !== PlaylistLevelType.MAIN || frag.sn === 'initSegment';
  }

  public clearTimer() {
    if (this.timer > -1) {
      self.clearInterval(this.timer);
      this.timer = -1;
    }
  }

  public get firstAutoLevel(): number {
    const { maxAutoLevel, minAutoLevel } = this.hls;
    const bwEstimate = this.getBwEstimate();
    const maxStartDelay = this.hls.config.maxStarvationDelay;
    const abrAutoLevel = this.findBestLevel(
      bwEstimate,
      minAutoLevel,
      maxAutoLevel,
      0,
      maxStartDelay,
      1,
      1,
    );
    if (abrAutoLevel > -1) {
      return abrAutoLevel;
    }
    const firstLevel = this.hls.firstLevel;
    const clamped = Math.min(Math.max(firstLevel, minAutoLevel), maxAutoLevel);
    this.warn(
      `Could not find best starting auto level. Defaulting to first in playlist ${firstLevel} clamped to ${clamped}`,
    );
    return clamped;
  }

  public get forcedAutoLevel(): number {
    if (this.nextAutoLevelKey) {
      return -1;
    }
    return this._nextAutoLevel;
  }

  // return next auto level
  public get nextAutoLevel(): number {
    const forcedAutoLevel = this.forcedAutoLevel;
    const bwEstimator = this.bwEstimator;
    const useEstimate = bwEstimator.canEstimate();
    const loadedFirstFrag = this.lastLoadedFragLevel > -1;
    // in case next auto level has been forced, and bw not available or not reliable, return forced value
    if (
      forcedAutoLevel !== -1 &&
      (!useEstimate ||
        !loadedFirstFrag ||
        this.nextAutoLevelKey === this.getAutoLevelKey())
    ) {
      return forcedAutoLevel;
    }

    // compute next level using ABR logic
    const nextABRAutoLevel =
      useEstimate && loadedFirstFrag
        ? this.getNextABRAutoLevel()
        : this.firstAutoLevel;

    // use forced auto level while it hasn't errored more than ABR selection
    if (forcedAutoLevel !== -1) {
      const levels = this.hls.levels;
      if (
        levels.length > Math.max(forcedAutoLevel, nextABRAutoLevel) &&
        levels[forcedAutoLevel].loadError <= levels[nextABRAutoLevel].loadError
      ) {
        return forcedAutoLevel;
      }
    }

    // save result until state has changed
    this._nextAutoLevel = nextABRAutoLevel;
    this.nextAutoLevelKey = this.getAutoLevelKey();

    return nextABRAutoLevel;
  }

  private getAutoLevelKey(): string {
    return `${this.getBwEstimate()}_${this.getStarvationDelay().toFixed(2)}`;
  }

  private getNextABRAutoLevel(): number {
    const { fragCurrent, partCurrent, hls } = this;
    if (hls.levels.length <= 1) {
      return hls.loadLevel;
    }
    const { maxAutoLevel, config, minAutoLevel } = hls;
    const currentFragDuration = partCurrent
      ? partCurrent.duration
      : fragCurrent
        ? fragCurrent.duration
        : 0;
    const avgbw = this.getBwEstimate();
    // bufferStarvationDelay is the wall-clock time left until the playback buffer is exhausted.
    const bufferStarvationDelay = this.getStarvationDelay();

    let bwFactor = config.abrBandWidthFactor;
    let bwUpFactor = config.abrBandWidthUpFactor;

    // First, look to see if we can find a level matching with our avg bandwidth AND that could also guarantee no rebuffering at all
    if (bufferStarvationDelay) {
      const bestLevel = this.findBestLevel(
        avgbw,
        minAutoLevel,
        maxAutoLevel,
        bufferStarvationDelay,
        0,
        bwFactor,
        bwUpFactor,
      );
      if (bestLevel >= 0) {
        this.rebufferNotice = -1;
        return bestLevel;
      }
    }
    // not possible to get rid of rebuffering... try to find level that will guarantee less than maxStarvationDelay of rebuffering
    let maxStarvationDelay = currentFragDuration
      ? Math.min(currentFragDuration, config.maxStarvationDelay)
      : config.maxStarvationDelay;

    if (!bufferStarvationDelay) {
      // in case buffer is empty, let's check if previous fragment was loaded to perform a bitrate test
      const bitrateTestDelay = this.bitrateTestDelay;
      if (bitrateTestDelay) {
        // if it is the case, then we need to adjust our max starvation delay using maxLoadingDelay config value
        // max video loading delay used in  automatic start level selection :
        // in that mode ABR controller will ensure that video loading time (ie the time to fetch the first fragment at lowest quality level +
        // the time to fetch the fragment at the appropriate quality level is less than ```maxLoadingDelay``` )
        // cap maxLoadingDelay and ensure it is not bigger 'than bitrate test' frag duration
        const maxLoadingDelay = currentFragDuration
          ? Math.min(currentFragDuration, config.maxLoadingDelay)
          : config.maxLoadingDelay;
        maxStarvationDelay = maxLoadingDelay - bitrateTestDelay;
        this.info(
          `bitrate test took ${Math.round(
            1000 * bitrateTestDelay,
          )}ms, set first fragment max fetchDuration to ${Math.round(
            1000 * maxStarvationDelay,
          )} ms`,
        );
        // don't use conservative factor on bitrate test
        bwFactor = bwUpFactor = 1;
      }
    }
    const bestLevel = this.findBestLevel(
      avgbw,
      minAutoLevel,
      maxAutoLevel,
      bufferStarvationDelay,
      maxStarvationDelay,
      bwFactor,
      bwUpFactor,
    );
    if (this.rebufferNotice !== bestLevel) {
      this.rebufferNotice = bestLevel;
      this.info(
        `${
          bufferStarvationDelay ? 'rebuffering expected' : 'buffer is empty'
        }, optimal quality level ${bestLevel}`,
      );
    }
    if (bestLevel > -1) {
      return bestLevel;
    }
    // If no matching level found, see if min auto level would be a better option
    const minLevel = hls.levels[minAutoLevel];
    const autoLevel = hls.loadLevelObj;
    if (autoLevel && minLevel?.bitrate < autoLevel.bitrate) {
      return minAutoLevel;
    }
    // or if bitrate is not lower, continue to use loadLevel
    return hls.loadLevel;
  }

  private getStarvationDelay(): number {
    const hls = this.hls;
    const media = hls.media;
    if (!media) {
      return Infinity;
    }
    // playbackRate is the absolute value of the playback rate; if media.playbackRate is 0, we use 1 to load as
    // if we're playing back at the normal rate.
    const playbackRate =
      media && media.playbackRate !== 0 ? Math.abs(media.playbackRate) : 1.0;
    const bufferInfo = hls.mainForwardBufferInfo;
    return (bufferInfo ? bufferInfo.len : 0) / playbackRate;
  }

  private getBwEstimate(): number {
    return this.bwEstimator.canEstimate()
      ? this.bwEstimator.getEstimate()
      : this.hls.config.abrEwmaDefaultEstimate;
  }

  private findBestLevel(
    currentBw: number,
    minAutoLevel: number,
    maxAutoLevel: number,
    bufferStarvationDelay: number,
    maxStarvationDelay: number,
    bwFactor: number,
    bwUpFactor: number,
  ): number {
    const maxFetchDuration: number = bufferStarvationDelay + maxStarvationDelay;
    const lastLoadedFragLevel = this.lastLoadedFragLevel;
    const selectionBaseLevel =
      lastLoadedFragLevel === -1 ? this.hls.firstLevel : lastLoadedFragLevel;
    const { fragCurrent, partCurrent } = this;
    const { levels, allAudioTracks, loadLevel, config } = this.hls;
    if (levels.length === 1) {
      return 0;
    }
    const level = levels[selectionBaseLevel] as Level | undefined;
    const live = !!this.hls.latestLevelDetails?.live;
    const firstSelection = loadLevel === -1 || lastLoadedFragLevel === -1;
    let currentCodecSet: string | undefined;
    let currentVideoRange: VideoRange | undefined = 'SDR';
    let currentFrameRate = level?.frameRate || 0;

    const { audioPreference, videoPreference } = config;
    const audioTracksByGroup =
      this.audioTracksByGroup ||
      (this.audioTracksByGroup = getAudioTracksByGroup(allAudioTracks));
    let minStartIndex = -1;
    if (firstSelection) {
      if (this.firstSelection !== -1) {
        return this.firstSelection;
      }
      const codecTiers =
        this.codecTiers ||
        (this.codecTiers = getCodecTiers(
          levels,
          audioTracksByGroup,
          minAutoLevel,
          maxAutoLevel,
        ));
      const startTier = getStartCodecTier(
        codecTiers,
        currentVideoRange,
        currentBw,
        audioPreference,
        videoPreference,
      );
      const {
        codecSet,
        videoRanges,
        minFramerate,
        minBitrate,
        minIndex,
        preferHDR,
      } = startTier;
      minStartIndex = minIndex;
      currentCodecSet = codecSet;
      currentVideoRange = preferHDR
        ? videoRanges[videoRanges.length - 1]
        : videoRanges[0];
      currentFrameRate = minFramerate;
      currentBw = Math.max(currentBw, minBitrate);
      this.log(`picked start tier ${stringify(startTier)}`);
    } else {
      currentCodecSet = level?.codecSet;
      currentVideoRange = level?.videoRange;
    }

    const currentFragDuration = partCurrent
      ? partCurrent.duration
      : fragCurrent
        ? fragCurrent.duration
        : 0;

    const ttfbEstimateSec = this.bwEstimator.getEstimateTTFB() / 1000;
    const levelsSkipped: number[] = [];
    for (let i = maxAutoLevel; i >= minAutoLevel; i--) {
      const levelInfo = levels[i];
      const upSwitch = i > selectionBaseLevel;
      if (!levelInfo) {
        continue;
      }
      if (
        __USE_MEDIA_CAPABILITIES__ &&
        config.useMediaCapabilities &&
        !levelInfo.supportedResult &&
        !levelInfo.supportedPromise
      ) {
        const mediaCapabilities = navigator.mediaCapabilities as
          | MediaCapabilities
          | undefined;
        if (
          typeof mediaCapabilities?.decodingInfo === 'function' &&
          requiresMediaCapabilitiesDecodingInfo(
            levelInfo,
            audioTracksByGroup,
            currentVideoRange,
            currentFrameRate,
            currentBw,
            audioPreference,
          )
        ) {
          levelInfo.supportedPromise = getMediaDecodingInfoPromise(
            levelInfo,
            audioTracksByGroup,
            mediaCapabilities,
            this.supportedCache,
          );
          levelInfo.supportedPromise
            .then((decodingInfo) => {
              if (!this.hls) {
                return;
              }
              levelInfo.supportedResult = decodingInfo;
              const levels = this.hls.levels;
              const index = levels.indexOf(levelInfo);
              if (decodingInfo.error) {
                this.warn(
                  `MediaCapabilities decodingInfo error: "${
                    decodingInfo.error
                  }" for level ${index} ${stringify(decodingInfo)}`,
                );
              } else if (!decodingInfo.supported) {
                this.warn(
                  `Unsupported MediaCapabilities decodingInfo result for level ${index} ${stringify(
                    decodingInfo,
                  )}`,
                );
                if (index > -1 && levels.length > 1) {
                  this.log(`Removing unsupported level ${index}`);
                  this.hls.removeLevel(index);
                  if (this.hls.loadLevel === -1) {
                    this.hls.nextLoadLevel = 0;
                  }
                }
              } else if (
                decodingInfo.decodingInfoResults.some(
                  (info) =>
                    info.smooth === false || info.powerEfficient === false,
                )
              ) {
                this.log(
                  `MediaCapabilities decodingInfo for level ${index} not smooth or powerEfficient: ${stringify(decodingInfo)}`,
                );
              }
            })
            .catch((error) => {
              this.warn(
                `Error handling MediaCapabilities decodingInfo: ${error}`,
              );
            });
        } else {
          levelInfo.supportedResult = SUPPORTED_INFO_DEFAULT;
        }
      }

      // skip candidates which change codec-family or video-range,
      // and which decrease or increase frame-rate for up and down-switch respectfully
      if (
        (currentCodecSet && levelInfo.codecSet !== currentCodecSet) ||
        (currentVideoRange && levelInfo.videoRange !== currentVideoRange) ||
        (upSwitch && currentFrameRate > levelInfo.frameRate) ||
        (!upSwitch &&
          currentFrameRate > 0 &&
          currentFrameRate < levelInfo.frameRate) ||
        levelInfo.supportedResult?.decodingInfoResults?.some(
          (info) => info.smooth === false,
        )
      ) {
        if (!firstSelection || i !== minStartIndex) {
          levelsSkipped.push(i);
          continue;
        }
      }

      const levelDetails = levelInfo.details;
      const avgDuration =
        (partCurrent
          ? levelDetails?.partTarget
          : levelDetails?.averagetargetduration) || currentFragDuration;

      let adjustedbw: number;
      // follow algorithm captured from stagefright :
      // https://android.googlesource.com/platform/frameworks/av/+/master/media/libstagefright/httplive/LiveSession.cpp
      // Pick the highest bandwidth stream below or equal to estimated bandwidth.
      // consider only 80% of the available bandwidth, but if we are switching up,
      // be even more conservative (70%) to avoid overestimating and immediately
      // switching back.
      if (!upSwitch) {
        adjustedbw = bwFactor * currentBw;
      } else {
        adjustedbw = bwUpFactor * currentBw;
      }

      // Use average bitrate when starvation delay (buffer length) is gt or eq two segment durations and rebuffering is not expected (maxStarvationDelay > 0)
      const bitrate: number =
        currentFragDuration &&
        bufferStarvationDelay >= currentFragDuration * 2 &&
        maxStarvationDelay === 0
          ? levelInfo.averageBitrate
          : levelInfo.maxBitrate;
      const fetchDuration: number = this.getTimeToLoadFrag(
        ttfbEstimateSec,
        adjustedbw,
        bitrate * avgDuration,
        levelDetails === undefined,
      );

      const canSwitchWithinTolerance =
        // if adjusted bw is greater than level bitrate AND
        adjustedbw >= bitrate &&
        // no level change, or new level has no error history
        (i === lastLoadedFragLevel ||
          (levelInfo.loadError === 0 && levelInfo.fragmentError === 0)) &&
        // fragment fetchDuration unknown OR live stream OR fragment fetchDuration less than max allowed fetch duration, then this level matches
        // we don't account for max Fetch Duration for live streams, this is to avoid switching down when near the edge of live sliding window ...
        // special case to support startLevel = -1 (bitrateTest) on live streams : in that case we should not exit loop so that findBestLevel will return -1
        (fetchDuration <= ttfbEstimateSec ||
          !Number.isFinite(fetchDuration) ||
          (live && !this.bitrateTestDelay) ||
          fetchDuration < maxFetchDuration);
      if (canSwitchWithinTolerance) {
        const forcedAutoLevel = this.forcedAutoLevel;
        if (
          i !== loadLevel &&
          (forcedAutoLevel === -1 || forcedAutoLevel !== loadLevel)
        ) {
          if (levelsSkipped.length) {
            this.trace(
              `Skipped level(s) ${levelsSkipped.join(
                ',',
              )} of ${maxAutoLevel} max with CODECS and VIDEO-RANGE:"${
                levels[levelsSkipped[0]].codecs
              }" ${levels[levelsSkipped[0]].videoRange}; not compatible with "${
                currentCodecSet
              }" ${currentVideoRange}`,
            );
          }
          this.info(
            `switch candidate:${selectionBaseLevel}->${i} adjustedbw(${Math.round(
              adjustedbw,
            )})-bitrate=${Math.round(
              adjustedbw - bitrate,
            )} ttfb:${ttfbEstimateSec.toFixed(
              1,
            )} avgDuration:${avgDuration.toFixed(
              1,
            )} maxFetchDuration:${maxFetchDuration.toFixed(
              1,
            )} fetchDuration:${fetchDuration.toFixed(
              1,
            )} firstSelection:${firstSelection} codecSet:${levelInfo.codecSet} videoRange:${levelInfo.videoRange} hls.loadLevel:${loadLevel}`,
          );
        }
        if (firstSelection) {
          this.firstSelection = i;
        }
        // as we are looping from highest to lowest, this will return the best achievable quality level
        return i;
      }
    }
    // not enough time budget even with quality level 0 ... rebuffering might happen
    return -1;
  }

  public set nextAutoLevel(nextLevel: number) {
    const value = this.deriveNextAutoLevel(nextLevel);
    if (this._nextAutoLevel !== value) {
      this.nextAutoLevelKey = '';
      this._nextAutoLevel = value;
    }
  }

  protected deriveNextAutoLevel(nextLevel: number) {
    const { maxAutoLevel, minAutoLevel } = this.hls;
    return Math.min(Math.max(nextLevel, minAutoLevel), maxAutoLevel);
  }
}

export default AbrController;
