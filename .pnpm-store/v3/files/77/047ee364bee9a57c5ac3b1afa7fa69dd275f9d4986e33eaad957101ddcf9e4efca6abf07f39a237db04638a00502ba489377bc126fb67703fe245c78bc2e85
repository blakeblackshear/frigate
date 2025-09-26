import { State } from './base-stream-controller';
import { ErrorDetails, ErrorTypes } from '../errors';
import { Events } from '../events';
import TaskLoop from '../task-loop';
import { PlaylistLevelType } from '../types/loader';
import { BufferHelper } from '../utils/buffer-helper';
import {
  addEventListener,
  removeEventListener,
} from '../utils/event-listener-helper';
import { stringify } from '../utils/safe-json-stringify';
import type { InFlightData } from './base-stream-controller';
import type { InFlightFragments } from '../hls';
import type Hls from '../hls';
import type { FragmentTracker } from './fragment-tracker';
import type { Fragment, MediaFragment, Part } from '../loader/fragment';
import type { SourceBufferName } from '../types/buffer';
import type {
  BufferAppendedData,
  MediaAttachedData,
  MediaDetachingData,
} from '../types/events';
import type { ErrorData } from '../types/events';
import type { BufferInfo } from '../utils/buffer-helper';

export const MAX_START_GAP_JUMP = 2.0;
export const SKIP_BUFFER_HOLE_STEP_SECONDS = 0.1;
export const SKIP_BUFFER_RANGE_START = 0.05;
const TICK_INTERVAL = 100;

export default class GapController extends TaskLoop {
  private hls: Hls | null;
  private fragmentTracker: FragmentTracker | null;
  private media: HTMLMediaElement | null = null;
  private mediaSource?: MediaSource;

  private nudgeRetry: number = 0;
  private stallReported: boolean = false;
  private stalled: number | null = null;
  private moved: boolean = false;
  private seeking: boolean = false;
  private buffered: Partial<Record<SourceBufferName, TimeRanges>> = {};

  private lastCurrentTime: number = 0;
  public ended: number = 0;
  public waiting: number = 0;

  constructor(hls: Hls, fragmentTracker: FragmentTracker) {
    super('gap-controller', hls.logger);
    this.hls = hls;
    this.fragmentTracker = fragmentTracker;
    this.registerListeners();
  }

  private registerListeners() {
    const { hls } = this;
    if (hls) {
      hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
      hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
      hls.on(Events.BUFFER_APPENDED, this.onBufferAppended, this);
    }
  }

  private unregisterListeners() {
    const { hls } = this;
    if (hls) {
      hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
      hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
      hls.off(Events.BUFFER_APPENDED, this.onBufferAppended, this);
    }
  }

  public destroy() {
    super.destroy();
    this.unregisterListeners();
    this.media = this.hls = this.fragmentTracker = null;
    this.mediaSource = undefined;
  }

  private onMediaAttached(
    event: Events.MEDIA_ATTACHED,
    data: MediaAttachedData,
  ) {
    this.setInterval(TICK_INTERVAL);
    this.mediaSource = data.mediaSource;
    const media = (this.media = data.media);
    addEventListener(media, 'playing', this.onMediaPlaying);
    addEventListener(media, 'waiting', this.onMediaWaiting);
    addEventListener(media, 'ended', this.onMediaEnded);
  }

  private onMediaDetaching(
    event: Events.MEDIA_DETACHING,
    data: MediaDetachingData,
  ) {
    this.clearInterval();
    const { media } = this;
    if (media) {
      removeEventListener(media, 'playing', this.onMediaPlaying);
      removeEventListener(media, 'waiting', this.onMediaWaiting);
      removeEventListener(media, 'ended', this.onMediaEnded);
      this.media = null;
    }
    this.mediaSource = undefined;
  }

  private onBufferAppended(
    event: Events.BUFFER_APPENDED,
    data: BufferAppendedData,
  ) {
    this.buffered = data.timeRanges;
  }

  private onMediaPlaying = () => {
    this.ended = 0;
    this.waiting = 0;
  };

  private onMediaWaiting = () => {
    if (this.media?.seeking) {
      return;
    }
    this.waiting = self.performance.now();
    this.tick();
  };

  private onMediaEnded = () => {
    if (this.hls) {
      // ended is set when triggering MEDIA_ENDED so that we do not trigger it again on stall or on tick with media.ended
      this.ended = this.media?.currentTime || 1;
      this.hls.trigger(Events.MEDIA_ENDED, {
        stalled: false,
      });
    }
  };

  public get hasBuffered(): boolean {
    return Object.keys(this.buffered).length > 0;
  }

  public tick() {
    if (!this.media?.readyState || !this.hasBuffered) {
      return;
    }

    const currentTime = this.media.currentTime;
    this.poll(currentTime, this.lastCurrentTime);
    this.lastCurrentTime = currentTime;
  }

  /**
   * Checks if the playhead is stuck within a gap, and if so, attempts to free it.
   * A gap is an unbuffered range between two buffered ranges (or the start and the first buffered range).
   *
   * @param lastCurrentTime - Previously read playhead position
   */
  public poll(currentTime: number, lastCurrentTime: number) {
    const config = this.hls?.config;
    if (!config) {
      return;
    }
    const media = this.media;
    if (!media) {
      return;
    }
    const { seeking } = media;
    const seeked = this.seeking && !seeking;
    const beginSeek = !this.seeking && seeking;
    const pausedEndedOrHalted =
      (media.paused && !seeking) || media.ended || media.playbackRate === 0;

    this.seeking = seeking;

    // The playhead is moving, no-op
    if (currentTime !== lastCurrentTime) {
      if (lastCurrentTime) {
        this.ended = 0;
      }
      this.moved = true;
      if (!seeking) {
        this.nudgeRetry = 0;
        // When crossing between buffered video time ranges, but not audio, flush pipeline with seek (Chrome)
        if (
          config.nudgeOnVideoHole &&
          !pausedEndedOrHalted &&
          currentTime > lastCurrentTime
        ) {
          this.nudgeOnVideoHole(currentTime, lastCurrentTime);
        }
      }
      if (this.waiting === 0) {
        this.stallResolved(currentTime);
      }
      return;
    }

    // Clear stalled state when beginning or finishing seeking so that we don't report stalls coming out of a seek
    if (beginSeek || seeked) {
      if (seeked) {
        this.stallResolved(currentTime);
      }
      return;
    }

    // The playhead should not be moving
    if (pausedEndedOrHalted) {
      this.nudgeRetry = 0;
      this.stallResolved(currentTime);
      // Fire MEDIA_ENDED to workaround event not being dispatched by browser
      if (!this.ended && media.ended && this.hls) {
        this.ended = currentTime || 1;
        this.hls.trigger(Events.MEDIA_ENDED, {
          stalled: false,
        });
      }
      return;
    }

    if (!BufferHelper.getBuffered(media).length) {
      this.nudgeRetry = 0;
      return;
    }

    // Resolve stalls at buffer holes using the main buffer, whose ranges are the intersections of the A/V sourcebuffers
    const bufferInfo = BufferHelper.bufferInfo(media, currentTime, 0);
    const nextStart = bufferInfo.nextStart || 0;
    const fragmentTracker = this.fragmentTracker;

    if (seeking && fragmentTracker && this.hls) {
      // Is there a fragment loading/parsing/appending before currentTime?
      const inFlightDependency = getInFlightDependency(
        this.hls.inFlightFragments,
        currentTime,
      );

      // Waiting for seeking in a buffered range to complete
      const hasEnoughBuffer = bufferInfo.len > MAX_START_GAP_JUMP;
      // Next buffered range is too far ahead to jump to while still seeking
      const noBufferHole =
        !nextStart ||
        inFlightDependency ||
        (nextStart - currentTime > MAX_START_GAP_JUMP &&
          !fragmentTracker.getPartialFragment(currentTime));
      if (hasEnoughBuffer || noBufferHole) {
        return;
      }
      // Reset moved state when seeking to a point in or before a gap/hole
      this.moved = false;
    }

    // Skip start gaps if we haven't played, but the last poll detected the start of a stall
    // The addition poll gives the browser a chance to jump the gap for us
    const levelDetails = this.hls?.latestLevelDetails;
    if (!this.moved && this.stalled !== null && fragmentTracker) {
      // There is no playable buffer (seeked, waiting for buffer)
      const isBuffered = bufferInfo.len > 0;
      if (!isBuffered && !nextStart) {
        return;
      }
      // Jump start gaps within jump threshold
      const startJump =
        Math.max(nextStart, bufferInfo.start || 0) - currentTime;

      // When joining a live stream with audio tracks, account for live playlist window sliding by allowing
      // a larger jump over start gaps caused by the audio-stream-controller buffering a start fragment
      // that begins over 1 target duration after the video start position.
      const isLive = !!levelDetails?.live;
      const maxStartGapJump = isLive
        ? levelDetails!.targetduration * 2
        : MAX_START_GAP_JUMP;
      const appended = appendedFragAtPosition(currentTime, fragmentTracker);
      if (startJump > 0 && (startJump <= maxStartGapJump || appended)) {
        if (!media.paused) {
          this._trySkipBufferHole(appended);
        }
        return;
      }
    }

    // Start tracking stall time
    const detectStallWithCurrentTimeMs = config.detectStallWithCurrentTimeMs;
    const tnow = self.performance.now();
    const tWaiting = this.waiting;
    let stalled = this.stalled;
    if (stalled === null) {
      // Use time of recent "waiting" event
      if (tWaiting > 0 && tnow - tWaiting < detectStallWithCurrentTimeMs) {
        stalled = this.stalled = tWaiting;
      } else {
        this.stalled = tnow;
        return;
      }
    }

    const stalledDuration = tnow - stalled;
    if (
      !seeking &&
      (stalledDuration >= detectStallWithCurrentTimeMs || tWaiting) &&
      this.hls
    ) {
      // Dispatch MEDIA_ENDED when media.ended/ended event is not signalled at end of stream
      if (
        this.mediaSource?.readyState === 'ended' &&
        !levelDetails?.live &&
        Math.abs(currentTime - (levelDetails?.edge || 0)) < 1
      ) {
        if (this.ended) {
          return;
        }
        this.ended = currentTime || 1;
        this.hls.trigger(Events.MEDIA_ENDED, {
          stalled: true,
        });
        return;
      }
      // Report stalling after trying to fix
      this._reportStall(bufferInfo);
      if (!this.media || (!this.hls as any)) {
        return;
      }
    }

    const bufferedWithHoles = BufferHelper.bufferInfo(
      media,
      currentTime,
      config.maxBufferHole,
    );
    this._tryFixBufferStall(bufferedWithHoles, stalledDuration, currentTime);
  }

  private stallResolved(currentTime: number) {
    const stalled = this.stalled;
    if (stalled && this.hls) {
      this.stalled = null;
      // The playhead is now moving, but was previously stalled
      if (this.stallReported) {
        const stalledDuration = self.performance.now() - stalled;
        this.log(
          `playback not stuck anymore @${currentTime}, after ${Math.round(
            stalledDuration,
          )}ms`,
        );
        this.stallReported = false;
        this.waiting = 0;
        this.hls.trigger(Events.STALL_RESOLVED, {});
      }
    }
  }

  private nudgeOnVideoHole(currentTime: number, lastCurrentTime: number) {
    // Chrome will play one second past a hole in video buffered time ranges without rendering any video from the subsequent range and then stall as long as audio is buffered:
    // https://github.com/video-dev/hls.js/issues/5631
    // https://issues.chromium.org/issues/40280613#comment10
    // Detect the potential for this situation and proactively seek to flush the video pipeline once the playhead passes the start of the video hole.
    // When there are audio and video buffers and currentTime is past the end of the first video buffered range...
    const videoSourceBuffered = this.buffered.video;
    if (
      this.hls &&
      this.media &&
      this.fragmentTracker &&
      this.buffered.audio?.length &&
      videoSourceBuffered &&
      videoSourceBuffered.length > 1 &&
      currentTime > videoSourceBuffered.end(0)
    ) {
      // and audio is buffered at the playhead
      const audioBufferInfo = BufferHelper.bufferedInfo(
        BufferHelper.timeRangesToArray(this.buffered.audio),
        currentTime,
        0,
      );
      if (audioBufferInfo.len > 1 && lastCurrentTime >= audioBufferInfo.start) {
        const videoTimes = BufferHelper.timeRangesToArray(videoSourceBuffered);
        const lastBufferedIndex = BufferHelper.bufferedInfo(
          videoTimes,
          lastCurrentTime,
          0,
        ).bufferedIndex;
        // nudge when crossing into another video buffered range (hole).
        if (
          lastBufferedIndex > -1 &&
          lastBufferedIndex < videoTimes.length - 1
        ) {
          const bufferedIndex = BufferHelper.bufferedInfo(
            videoTimes,
            currentTime,
            0,
          ).bufferedIndex;
          const holeStart = videoTimes[lastBufferedIndex].end;
          const holeEnd = videoTimes[lastBufferedIndex + 1].start;
          if (
            (bufferedIndex === -1 || bufferedIndex > lastBufferedIndex) &&
            holeEnd - holeStart < 1 && // `maxBufferHole` may be too small and setting it to 0 should not disable this feature
            currentTime - holeStart < 2
          ) {
            const error = new Error(
              `nudging playhead to flush pipeline after video hole. currentTime: ${currentTime} hole: ${holeStart} -> ${holeEnd} buffered index: ${bufferedIndex}`,
            );
            this.warn(error.message);
            // Magic number to flush the pipeline without interuption to audio playback:
            this.media.currentTime += 0.000001;
            let frag: MediaFragment | Part | null | undefined =
              appendedFragAtPosition(currentTime, this.fragmentTracker);
            if (frag && 'fragment' in frag) {
              frag = frag.fragment;
            } else if (!frag) {
              frag = undefined;
            }
            const bufferInfo = BufferHelper.bufferInfo(
              this.media,
              currentTime,
              0,
            );
            this.hls.trigger(Events.ERROR, {
              type: ErrorTypes.MEDIA_ERROR,
              details: ErrorDetails.BUFFER_SEEK_OVER_HOLE,
              fatal: false,
              error,
              reason: error.message,
              frag,
              buffer: bufferInfo.len,
              bufferInfo,
            });
          }
        }
      }
    }
  }

  /**
   * Detects and attempts to fix known buffer stalling issues.
   * @param bufferInfo - The properties of the current buffer.
   * @param stalledDurationMs - The amount of time Hls.js has been stalling for.
   * @private
   */
  private _tryFixBufferStall(
    bufferInfo: BufferInfo,
    stalledDurationMs: number,
    currentTime: number,
  ) {
    const { fragmentTracker, media } = this;
    const config = this.hls?.config;
    if (!media || !fragmentTracker || !config) {
      return;
    }

    const levelDetails = this.hls?.latestLevelDetails;
    const appended = appendedFragAtPosition(currentTime, fragmentTracker);
    if (
      appended ||
      (levelDetails?.live && currentTime < levelDetails.fragmentStart)
    ) {
      // Try to skip over the buffer hole caused by a partial fragment
      // This method isn't limited by the size of the gap between buffered ranges
      const targetTime = this._trySkipBufferHole(appended);
      // we return here in this case, meaning
      // the branch below only executes when we haven't seeked to a new position
      if (targetTime || !this.media) {
        return;
      }
    }

    // if we haven't had to skip over a buffer hole of a partial fragment
    // we may just have to "nudge" the playlist as the browser decoding/rendering engine
    // needs to cross some sort of threshold covering all source-buffers content
    // to start playing properly.
    const bufferedRanges = bufferInfo.buffered;
    const adjacentTraversal = this.adjacentTraversal(bufferInfo, currentTime);
    if (
      ((bufferedRanges &&
        bufferedRanges.length > 1 &&
        bufferInfo.len > config.maxBufferHole) ||
        (bufferInfo.nextStart &&
          (bufferInfo.nextStart - currentTime < config.maxBufferHole ||
            adjacentTraversal))) &&
      (stalledDurationMs > config.highBufferWatchdogPeriod * 1000 ||
        this.waiting)
    ) {
      this.warn('Trying to nudge playhead over buffer-hole');
      // Try to nudge currentTime over a buffer hole if we've been stalling for the configured amount of seconds
      // We only try to jump the hole if it's under the configured size
      this._tryNudgeBuffer(bufferInfo);
    }
  }

  private adjacentTraversal(bufferInfo: BufferInfo, currentTime: number) {
    const fragmentTracker = this.fragmentTracker;
    const nextStart = bufferInfo.nextStart;
    if (fragmentTracker && nextStart) {
      const current = fragmentTracker.getFragAtPos(
        currentTime,
        PlaylistLevelType.MAIN,
      );
      const next = fragmentTracker.getFragAtPos(
        nextStart,
        PlaylistLevelType.MAIN,
      );
      if (current && next) {
        return next.sn - current.sn < 2;
      }
    }
    return false;
  }

  /**
   * Triggers a BUFFER_STALLED_ERROR event, but only once per stall period.
   * @param bufferLen - The playhead distance from the end of the current buffer segment.
   * @private
   */
  private _reportStall(bufferInfo: BufferInfo) {
    const { hls, media, stallReported, stalled } = this;
    if (!stallReported && stalled !== null && media && hls) {
      // Report stalled error once
      this.stallReported = true;
      const error = new Error(
        `Playback stalling at @${
          media.currentTime
        } due to low buffer (${stringify(bufferInfo)})`,
      );
      this.warn(error.message);
      hls.trigger(Events.ERROR, {
        type: ErrorTypes.MEDIA_ERROR,
        details: ErrorDetails.BUFFER_STALLED_ERROR,
        fatal: false,
        error,
        buffer: bufferInfo.len,
        bufferInfo,
        stalled: { start: stalled },
      });
    }
  }

  /**
   * Attempts to fix buffer stalls by jumping over known gaps caused by partial fragments
   * @param appended - The fragment or part found at the current time (where playback is stalling).
   * @private
   */
  private _trySkipBufferHole(appended: MediaFragment | Part | null): number {
    const { fragmentTracker, media } = this;
    const config = this.hls?.config;
    if (!media || !fragmentTracker || !config) {
      return 0;
    }

    // Check if currentTime is between unbuffered regions of partial fragments
    const currentTime = media.currentTime;
    const bufferInfo = BufferHelper.bufferInfo(media, currentTime, 0);
    const startTime =
      currentTime < bufferInfo.start ? bufferInfo.start : bufferInfo.nextStart;
    if (startTime && this.hls) {
      const bufferStarved = bufferInfo.len <= config.maxBufferHole;
      const waiting =
        bufferInfo.len > 0 && bufferInfo.len < 1 && media.readyState < 3;
      const gapLength = startTime - currentTime;
      if (gapLength > 0 && (bufferStarved || waiting)) {
        // Only allow large gaps to be skipped if it is a start gap, or all fragments in skip range are partial
        if (gapLength > config.maxBufferHole) {
          let startGap = false;
          if (currentTime === 0) {
            const startFrag = fragmentTracker.getAppendedFrag(
              0,
              PlaylistLevelType.MAIN,
            );
            if (startFrag && startTime < startFrag.end) {
              startGap = true;
            }
          }
          if (!startGap && appended) {
            // Do not seek when selected variant playlist is unloaded
            if (!this.hls.loadLevelObj?.details) {
              return 0;
            }
            // Do not seek when required fragments are inflight or appending
            const inFlightDependency = getInFlightDependency(
              this.hls.inFlightFragments,
              startTime,
            );
            if (inFlightDependency) {
              return 0;
            }
            // Do not seek if we can't walk tracked fragments to end of gap
            let moreToLoad = false;
            let pos = appended.end;
            while (pos < startTime) {
              const provisioned = appendedFragAtPosition(pos, fragmentTracker);
              if (provisioned) {
                pos += provisioned.duration;
              } else {
                moreToLoad = true;
                break;
              }
            }
            if (moreToLoad) {
              return 0;
            }
          }
        }
        const targetTime = Math.max(
          startTime + SKIP_BUFFER_RANGE_START,
          currentTime + SKIP_BUFFER_HOLE_STEP_SECONDS,
        );
        this.warn(
          `skipping hole, adjusting currentTime from ${currentTime} to ${targetTime}`,
        );
        this.moved = true;
        media.currentTime = targetTime;
        if (!appended?.gap) {
          const error = new Error(
            `fragment loaded with buffer holes, seeking from ${currentTime} to ${targetTime}`,
          );
          const errorData: ErrorData = {
            type: ErrorTypes.MEDIA_ERROR,
            details: ErrorDetails.BUFFER_SEEK_OVER_HOLE,
            fatal: false,
            error,
            reason: error.message,
            buffer: bufferInfo.len,
            bufferInfo,
          };
          if (appended) {
            if ('fragment' in appended) {
              errorData.part = appended;
            } else {
              errorData.frag = appended;
            }
          }
          this.hls.trigger(Events.ERROR, errorData);
        }
        return targetTime;
      }
    }
    return 0;
  }

  /**
   * Attempts to fix buffer stalls by advancing the mediaElement's current time by a small amount.
   * @private
   */
  private _tryNudgeBuffer(bufferInfo: BufferInfo) {
    const { hls, media, nudgeRetry } = this;
    const config = hls?.config;
    if (!media || !config) {
      return 0;
    }
    const currentTime = media.currentTime;
    this.nudgeRetry++;

    if (nudgeRetry < config.nudgeMaxRetry) {
      const targetTime = currentTime + (nudgeRetry + 1) * config.nudgeOffset;
      // playback stalled in buffered area ... let's nudge currentTime to try to overcome this
      const error = new Error(
        `Nudging 'currentTime' from ${currentTime} to ${targetTime}`,
      );
      this.warn(error.message);
      media.currentTime = targetTime;
      hls.trigger(Events.ERROR, {
        type: ErrorTypes.MEDIA_ERROR,
        details: ErrorDetails.BUFFER_NUDGE_ON_STALL,
        error,
        fatal: false,
        buffer: bufferInfo.len,
        bufferInfo,
      });
    } else {
      const error = new Error(
        `Playhead still not moving while enough data buffered @${currentTime} after ${config.nudgeMaxRetry} nudges`,
      );
      this.error(error.message);
      hls.trigger(Events.ERROR, {
        type: ErrorTypes.MEDIA_ERROR,
        details: ErrorDetails.BUFFER_STALLED_ERROR,
        error,
        fatal: true,
        buffer: bufferInfo.len,
        bufferInfo,
      });
    }
  }
}

function getInFlightDependency(
  inFlightFragments: InFlightFragments,
  currentTime: number,
): Fragment | null {
  const main = inFlight(inFlightFragments.main);
  if (main && main.start <= currentTime) {
    return main;
  }
  const audio = inFlight(inFlightFragments.audio);
  if (audio && audio.start <= currentTime) {
    return audio;
  }
  return null;
}

function inFlight(inFlightData: InFlightData | undefined): Fragment | null {
  if (!inFlightData) {
    return null;
  }
  switch (inFlightData.state) {
    case State.IDLE:
    case State.STOPPED:
    case State.ENDED:
    case State.ERROR:
      return null;
  }
  return inFlightData.frag;
}

function appendedFragAtPosition(pos: number, fragmentTracker: FragmentTracker) {
  return (
    fragmentTracker.getAppendedFrag(pos, PlaylistLevelType.MAIN) ||
    fragmentTracker.getPartialFragment(pos)
  );
}
