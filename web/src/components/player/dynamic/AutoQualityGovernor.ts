/**
 * Policy engine for auto playback quality downswitching.
 *
 * Stall time is measured rather than counted: hls.js reports
 * BUFFER_STALLED_ERROR only once per episode (the flag resets only when
 * playback resumes), so counting events makes the worst networks, where
 * one freeze never resolves, the least likely to ever downswitch.
 */

export type DownswitchReason =
  | "stall"
  | "bandwidth"
  | "fatal-error"
  | "startup"
  | "codec";

// stalls just after a seek are expected on any network (the target
// position is rarely buffered), so they get a longer budget and are
// kept out of the cumulative window
const SEEK_GRACE_MS = 2000;
// a single unresolved stall episode this long triggers a downswitch
const SINGLE_STALL_DOWNSWITCH_MS = 4000;
// seek-adjacent episodes only trigger once clearly beyond load latency
const GRACED_STALL_DOWNSWITCH_MS = 10000;
// total (non-graced) stall time within the rolling window that triggers
const CUMULATIVE_STALL_DOWNSWITCH_MS = 7000;
// rolling window for cumulative stall accounting; long enough to catch
// chronic short stalls, short enough that ancient history ages out
const STALL_WINDOW_MS = 60000;
// a throughput sample below bitrate * margin counts as evidence the
// connection cannot sustain the stream
const PREDICTIVE_BANDWIDTH_MARGIN = 1.1;
// consecutive low samples required for a predictive (pre-stall) downswitch
const PREDICTIVE_SAMPLE_COUNT = 3;
// measured throughput must clear the original stream's bitrate by this
// margin before a downswitched player retries full quality
const RETRY_BANDWIDTH_MARGIN = 1.5;
// the stall clock is blind before playback starts (the player is still
// paused), so the initial load needs its own budget
const STARTUP_DOWNSWITCH_MS = 10000;
// no realistic original recording stream plays comfortably below this,
// so a camera whose bitrate is not yet known starts low
const KNOWN_SLOW_START_FLOOR_BPS = 3_000_000;
// the first sample is biased toward the seeded default estimate
const PROBE_MIN_SUB_SAMPLES = 2;

type StallEpisode = {
  start: number;
  end: number;
};

export class AutoQualityGovernor {
  // returns false when quality is pinned, sub is unavailable, or the
  // player is already low
  private requestDownswitch: (reason: DownswitchReason) => boolean;
  private requestUpswitch: (() => void) | undefined;

  private episodes: StallEpisode[] = [];
  private openEpisode: { start: number; graced: boolean } | null = null;
  private stallTimer: ReturnType<typeof setTimeout> | undefined;
  private startupTimer: ReturnType<typeof setTimeout> | undefined;
  private lastSeekTs = 0;
  private consecutiveLowSamples = 0;
  private upswitchProbeArmed = false;
  private probeSampleCount = 0;
  private mainUnplayable = false;
  private holdLow = false;

  // network facts survive stall-history resets: a manual pin or camera
  // switch does not change what the connection can carry
  private bandwidthEstimateBps: number | undefined;
  private mainBitrateBps: number | undefined;

  constructor(
    requestDownswitch: (reason: DownswitchReason) => boolean,
    requestUpswitch?: () => void,
  ) {
    this.requestDownswitch = requestDownswitch;
    this.requestUpswitch = requestUpswitch;
  }

  get bandwidthEstimate(): number | undefined {
    return this.bandwidthEstimateBps;
  }

  /** Seed the connection estimate persisted from earlier sessions. */
  seed(bandwidthEstimateBps: number | undefined) {
    if (this.bandwidthEstimateBps === undefined) {
      this.bandwidthEstimateBps = bandwidthEstimateBps;
    }
  }

  /**
   * Suppresses every path that would route playback back onto the
   * original stream.
   */
  markMainUnplayable() {
    this.mainUnplayable = true;
  }

  get isMainUnplayable(): boolean {
    return this.mainUnplayable;
  }

  /**
   * Hold playback on the low stream regardless of measured headroom
   * (user preference such as data saver, not a bandwidth fact).
   */
  setHoldLow(hold: boolean) {
    this.holdLow = hold;
  }

  /**
   * Record the original stream's advertised bitrate learned outside of
   * playback (e.g. parsed from its master playlist). Live measurements
   * take precedence.
   */
  learnMainBitrate(bitrateBps: number) {
    if (this.mainBitrateBps === undefined && bitrateBps > 0) {
      this.mainBitrateBps = bitrateBps;
    }
  }

  /**
   * Starts the time-to-first-frame budget: no stall episode can exist
   * before playback starts, so a first segment too large for the
   * connection would otherwise spin forever.
   */
  sourceLoadStarted() {
    clearTimeout(this.startupTimer);
    this.startupTimer = setTimeout(
      () => this.triggerDownswitch("startup"),
      STARTUP_DOWNSWITCH_MS,
    );
  }

  sourceLoadEnded() {
    clearTimeout(this.startupTimer);
    this.startupTimer = undefined;
  }

  /**
   * Arm the one-shot upswitch probe after a conservative low start.
   * Stays armed until it fires or a manual pin resets it, so a
   * connection that improves later still recovers mid-chunk.
   */
  armUpswitchProbe() {
    this.upswitchProbeArmed = true;
    this.probeSampleCount = 0;
  }

  noteSeek() {
    this.lastSeekTs = Date.now();
  }

  /**
   * A stall episode began (hls.js BUFFER_STALLED_ERROR or a video
   * element waiting event). Idempotent while an episode is open, so the
   * two signal sources need no cross-coordination.
   */
  stallStarted() {
    if (this.openEpisode) {
      return;
    }

    const now = Date.now();
    const graced = now - this.lastSeekTs < SEEK_GRACE_MS;
    this.openEpisode = { start: now, graced };

    // fire mid-stall: either this episode alone exceeds its budget, or
    // it pushes the window's cumulative stall time over the threshold
    const singleBudget = graced
      ? GRACED_STALL_DOWNSWITCH_MS
      : SINGLE_STALL_DOWNSWITCH_MS;
    const cumulativeBudget = graced
      ? Number.POSITIVE_INFINITY
      : Math.max(0, CUMULATIVE_STALL_DOWNSWITCH_MS - this.windowStallMs(now));
    this.stallTimer = setTimeout(
      () => this.triggerDownswitch("stall"),
      Math.min(singleBudget, cumulativeBudget),
    );
  }

  /**
   * Playback resumed (STALL_RESOLVED, playing, timeupdate) or paused.
   * Closes any open episode; graced episodes never enter the window.
   */
  stallEnded() {
    if (!this.openEpisode) {
      return;
    }

    clearTimeout(this.stallTimer);
    this.stallTimer = undefined;

    const now = Date.now();
    if (!this.openEpisode.graced && now > this.openEpisode.start) {
      this.episodes.push({ start: this.openEpisode.start, end: now });
    }
    this.openEpisode = null;
    this.pruneEpisodes(now);
  }

  /**
   * A segment finished loading. Records throughput, refreshes the
   * original stream's bitrate while playing it, and downswitches
   * predictively when sustained throughput cannot carry the stream.
   */
  bandwidthSample(
    estimateBps: number,
    levelBitrateBps: number | undefined,
    playingMain: boolean,
  ) {
    if (!Number.isFinite(estimateBps) || estimateBps <= 0) {
      return;
    }

    this.bandwidthEstimateBps = estimateBps;

    if (!playingMain) {
      this.consecutiveLowSamples = 0;
      this.probeSampleCount += 1;
      if (
        this.upswitchProbeArmed &&
        !this.mainUnplayable &&
        !this.holdLow &&
        this.probeSampleCount >= PROBE_MIN_SUB_SAMPLES &&
        this.mainBitrateBps !== undefined &&
        estimateBps > this.mainBitrateBps * RETRY_BANDWIDTH_MARGIN
      ) {
        this.upswitchProbeArmed = false;
        this.requestUpswitch?.();
      }
      return;
    }

    if (levelBitrateBps === undefined || levelBitrateBps <= 0) {
      return;
    }

    this.mainBitrateBps = levelBitrateBps;

    if (estimateBps < levelBitrateBps * PREDICTIVE_BANDWIDTH_MARGIN) {
      this.consecutiveLowSamples += 1;
      if (this.consecutiveLowSamples >= PREDICTIVE_SAMPLE_COUNT) {
        this.consecutiveLowSamples = 0;
        this.triggerDownswitch("bandwidth");
      }
    } else {
      this.consecutiveLowSamples = 0;
    }
  }

  /**
   * hls.js gave up loading (retries exhausted). Returns whether a
   * downswitch happened so the player knows to attempt recovery instead.
   */
  fatalNetworkError(): boolean {
    return this.triggerDownswitch("fatal-error");
  }

  /**
   * Unlike bandwidth signals a codec failure is proof, so the original
   * stream is marked unplayable before the downswitch. Returns whether
   * a downswitch happened.
   */
  fatalCodecError(): boolean {
    this.mainUnplayable = true;
    return this.triggerDownswitch("codec");
  }

  /**
   * Whether a downswitched player should retry full quality at the next
   * chunk boundary. Native HLS playback reports no segment stats, so
   * without bandwidth evidence this falls back to a clean stall window.
   */
  shouldRetryMain(): boolean {
    if (this.mainUnplayable || this.holdLow) {
      return false;
    }

    if (
      this.bandwidthEstimateBps !== undefined &&
      this.mainBitrateBps !== undefined
    ) {
      return (
        this.bandwidthEstimateBps > this.mainBitrateBps * RETRY_BANDWIDTH_MARGIN
      );
    }

    return this.windowStallMs(Date.now()) === 0;
  }

  /**
   * Whether playback should begin on the low quality stream based on
   * persisted network knowledge. A fully-cold device returns false; the
   * owner handles that case with a conservative start plus the probe.
   */
  shouldStartLow(): boolean {
    if (this.bandwidthEstimateBps === undefined) {
      return false;
    }

    if (this.mainBitrateBps !== undefined) {
      return (
        this.bandwidthEstimateBps <
        this.mainBitrateBps * PREDICTIVE_BANDWIDTH_MARGIN
      );
    }

    // unknown camera bitrate: above the floor, start on the original
    // and let the startup budget correct a wrong guess
    return this.bandwidthEstimateBps < KNOWN_SLOW_START_FLOOR_BPS;
  }

  /** A manual pin invalidates stall history but not network facts. */
  resetStallHistory() {
    clearTimeout(this.stallTimer);
    this.stallTimer = undefined;
    clearTimeout(this.startupTimer);
    this.startupTimer = undefined;
    this.openEpisode = null;
    this.episodes = [];
    this.consecutiveLowSamples = 0;
    this.upswitchProbeArmed = false;
    this.probeSampleCount = 0;
  }

  /**
   * A camera switch additionally invalidates the per-camera facts: the
   * stream bitrate and codec playability. The holdLow preference is
   * device-level and survives.
   */
  resetForCamera() {
    this.resetStallHistory();
    this.mainBitrateBps = undefined;
    this.mainUnplayable = false;
  }

  destroy() {
    this.resetStallHistory();
  }

  private triggerDownswitch(reason: DownswitchReason): boolean {
    const handled = this.requestDownswitch(reason);
    if (handled) {
      // the low stream starts with a clean record
      this.resetStallHistory();
    }
    return handled;
  }

  private windowStallMs(now: number): number {
    this.pruneEpisodes(now);
    const windowStart = now - STALL_WINDOW_MS;
    let total = 0;
    for (const episode of this.episodes) {
      total += episode.end - Math.max(episode.start, windowStart);
    }
    if (this.openEpisode && !this.openEpisode.graced) {
      total += now - Math.max(this.openEpisode.start, windowStart);
    }
    return total;
  }

  private pruneEpisodes(now: number) {
    const windowStart = now - STALL_WINDOW_MS;
    this.episodes = this.episodes.filter(
      (episode) => episode.end > windowStart,
    );
  }
}
