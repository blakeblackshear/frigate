import { createDoNothingErrorAction } from './error-controller';
import { HlsAssetPlayer } from './interstitial-player';
import {
  type InterstitialScheduleEventItem,
  type InterstitialScheduleItem,
  type InterstitialSchedulePrimaryItem,
  InterstitialsSchedule,
  segmentToString,
  type TimelineType,
} from './interstitials-schedule';
import { ErrorDetails, ErrorTypes } from '../errors';
import { Events } from '../events';
import { AssetListLoader } from '../loader/interstitial-asset-list';
import {
  ALIGNED_END_THRESHOLD_SECONDS,
  eventAssetToString,
  generateAssetIdentifier,
  getNextAssetIndex,
  type InterstitialAssetId,
  type InterstitialAssetItem,
  type InterstitialEvent,
  type InterstitialEventWithAssetList,
  TimelineOccupancy,
} from '../loader/interstitial-event';
import { BufferHelper } from '../utils/buffer-helper';
import {
  addEventListener,
  removeEventListener,
} from '../utils/event-listener-helper';
import { hash } from '../utils/hash';
import { Logger } from '../utils/logger';
import { isCompatibleTrackChange } from '../utils/mediasource-helper';
import { getBasicSelectionOption } from '../utils/rendition-helper';
import { stringify } from '../utils/safe-json-stringify';
import type {
  HlsAssetPlayerConfig,
  InterstitialPlayer,
} from './interstitial-player';
import type Hls from '../hls';
import type { LevelDetails } from '../loader/level-details';
import type { SourceBufferName } from '../types/buffer';
import type { NetworkComponentAPI } from '../types/component-api';
import type {
  AssetListLoadedData,
  AudioTrackSwitchingData,
  AudioTrackUpdatedData,
  BufferAppendedData,
  BufferCodecsData,
  BufferFlushedData,
  ErrorData,
  LevelUpdatedData,
  MediaAttachedData,
  MediaAttachingData,
  MediaDetachingData,
  SubtitleTrackSwitchData,
  SubtitleTrackUpdatedData,
} from '../types/events';
import type { MediaPlaylist, MediaSelection } from '../types/media-playlist';

export interface InterstitialsManager {
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

export type PlayheadTimes = {
  bufferedEnd: number;
  currentTime: number;
  duration: number;
  seekableStart: number;
};

function playWithCatch(media: HTMLMediaElement | null) {
  media?.play().catch(() => {
    /* no-op */
  });
}

function timelineMessage(label: string, time: number) {
  return `[${label}] Advancing timeline position to ${time}`;
}

export default class InterstitialsController
  extends Logger
  implements NetworkComponentAPI
{
  private readonly HlsPlayerClass: typeof Hls;
  private readonly hls: Hls;
  private readonly assetListLoader: AssetListLoader;

  // Last updated LevelDetails
  private mediaSelection: MediaSelection | null = null;
  private altSelection: {
    audio?: MediaPlaylist;
    subtitles?: MediaPlaylist;
  } | null = null;

  // Media and MediaSource/SourceBuffers
  private media: HTMLMediaElement | null = null;
  private detachedData: MediaAttachingData | null = null;
  private requiredTracks: Partial<BufferCodecsData> | null = null;

  // Public Interface for Interstitial playback state and control
  private manager: InterstitialsManager | null = null;

  // Interstitial Asset Players
  private playerQueue: HlsAssetPlayer[] = [];

  // Timeline position tracking
  private bufferedPos: number = -1;
  private timelinePos: number = -1;

  // Schedule
  private schedule: InterstitialsSchedule | null;

  // Schedule playback and buffering state
  private playingItem: InterstitialScheduleItem | null = null;
  private bufferingItem: InterstitialScheduleItem | null = null;
  private waitingItem: InterstitialScheduleEventItem | null = null;
  private endedItem: InterstitialScheduleItem | null = null;
  private playingAsset: InterstitialAssetItem | null = null;
  private endedAsset: InterstitialAssetItem | null = null;
  private bufferingAsset: InterstitialAssetItem | null = null;
  private shouldPlay: boolean = false;

  constructor(hls: Hls, HlsPlayerClass: typeof Hls) {
    super('interstitials', hls.logger);
    this.hls = hls;
    this.HlsPlayerClass = HlsPlayerClass;
    this.assetListLoader = new AssetListLoader(hls);
    this.schedule = new InterstitialsSchedule(
      this.onScheduleUpdate,
      hls.logger,
    );
    this.registerListeners();
  }

  private registerListeners() {
    const hls = this.hls;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (hls) {
      hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
      hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
      hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
      hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
      hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
      hls.on(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
      hls.on(Events.AUDIO_TRACK_UPDATED, this.onAudioTrackUpdated, this);
      hls.on(Events.SUBTITLE_TRACK_SWITCH, this.onSubtitleTrackSwitch, this);
      hls.on(Events.SUBTITLE_TRACK_UPDATED, this.onSubtitleTrackUpdated, this);
      hls.on(Events.EVENT_CUE_ENTER, this.onInterstitialCueEnter, this);
      hls.on(Events.ASSET_LIST_LOADED, this.onAssetListLoaded, this);
      hls.on(Events.BUFFER_APPENDED, this.onBufferAppended, this);
      hls.on(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
      hls.on(Events.BUFFERED_TO_END, this.onBufferedToEnd, this);
      hls.on(Events.MEDIA_ENDED, this.onMediaEnded, this);
      hls.on(Events.ERROR, this.onError, this);
      hls.on(Events.DESTROYING, this.onDestroying, this);
    }
  }

  private unregisterListeners() {
    const hls = this.hls;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (hls) {
      hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
      hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
      hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
      hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
      hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
      hls.off(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
      hls.off(Events.AUDIO_TRACK_UPDATED, this.onAudioTrackUpdated, this);
      hls.off(Events.SUBTITLE_TRACK_SWITCH, this.onSubtitleTrackSwitch, this);
      hls.off(Events.SUBTITLE_TRACK_UPDATED, this.onSubtitleTrackUpdated, this);
      hls.off(Events.EVENT_CUE_ENTER, this.onInterstitialCueEnter, this);
      hls.off(Events.ASSET_LIST_LOADED, this.onAssetListLoaded, this);
      hls.off(Events.BUFFER_CODECS, this.onBufferCodecs, this);
      hls.off(Events.BUFFER_APPENDED, this.onBufferAppended, this);
      hls.off(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
      hls.off(Events.BUFFERED_TO_END, this.onBufferedToEnd, this);
      hls.off(Events.MEDIA_ENDED, this.onMediaEnded, this);
      hls.off(Events.ERROR, this.onError, this);
      hls.off(Events.DESTROYING, this.onDestroying, this);
    }
  }

  startLoad() {
    // TODO: startLoad - check for waitingItem and retry by resetting schedule
    this.resumeBuffering();
  }

  stopLoad() {
    // TODO: stopLoad - stop all scheule.events[].assetListLoader?.abort() then delete the loaders
    this.pauseBuffering();
  }

  resumeBuffering() {
    this.getBufferingPlayer()?.resumeBuffering();
  }

  pauseBuffering() {
    this.getBufferingPlayer()?.pauseBuffering();
  }

  destroy() {
    this.unregisterListeners();
    this.stopLoad();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.assetListLoader) {
      this.assetListLoader.destroy();
    }
    this.emptyPlayerQueue();
    this.clearScheduleState();
    if (this.schedule) {
      this.schedule.destroy();
    }
    this.media =
      this.detachedData =
      this.mediaSelection =
      this.requiredTracks =
      this.altSelection =
      this.schedule =
      this.manager =
        null;
    // @ts-ignore
    this.hls = this.HlsPlayerClass = this.log = null;
    // @ts-ignore
    this.assetListLoader = null;
    // @ts-ignore
    this.onPlay = this.onPause = this.onSeeking = this.onTimeupdate = null;
    // @ts-ignore
    this.onScheduleUpdate = null;
  }

  private onDestroying() {
    const media = this.primaryMedia || this.media;
    if (media) {
      this.removeMediaListeners(media);
    }
  }

  private removeMediaListeners(media: HTMLMediaElement) {
    removeEventListener(media, 'play', this.onPlay);
    removeEventListener(media, 'pause', this.onPause);
    removeEventListener(media, 'seeking', this.onSeeking);
    removeEventListener(media, 'timeupdate', this.onTimeupdate);
  }

  private onMediaAttaching(
    event: Events.MEDIA_ATTACHING,
    data: MediaAttachingData,
  ) {
    const media = (this.media = data.media);
    addEventListener(media, 'seeking', this.onSeeking);
    addEventListener(media, 'timeupdate', this.onTimeupdate);
    addEventListener(media, 'play', this.onPlay);
    addEventListener(media, 'pause', this.onPause);
  }

  private onMediaAttached(
    event: Events.MEDIA_ATTACHED,
    data: MediaAttachedData,
  ) {
    const playingItem = this.effectivePlayingItem;
    const detachedMedia = this.detachedData;
    this.detachedData = null;
    if (playingItem === null) {
      this.checkStart();
    } else if (!detachedMedia) {
      // Resume schedule after detached externally
      this.clearScheduleState();
      const playingIndex = this.findItemIndex(playingItem);
      this.setSchedulePosition(playingIndex);
    }
  }

  private clearScheduleState() {
    this.log(`clear schedule state`);
    this.playingItem =
      this.bufferingItem =
      this.waitingItem =
      this.endedItem =
      this.playingAsset =
      this.endedAsset =
      this.bufferingAsset =
        null;
  }

  private onMediaDetaching(
    event: Events.MEDIA_DETACHING,
    data: MediaDetachingData,
  ) {
    const transferringMedia = !!data.transferMedia;
    const media = this.media;
    this.media = null;
    if (transferringMedia) {
      return;
    }
    if (media) {
      this.removeMediaListeners(media);
    }
    // If detachMedia is called while in an Interstitial, detach the asset player as well and reset the schedule position
    if (this.detachedData) {
      const player = this.getBufferingPlayer();
      if (player) {
        this.log(`Removing schedule state for detachedData and ${player}`);
        this.playingAsset =
          this.endedAsset =
          this.bufferingAsset =
          this.bufferingItem =
          this.waitingItem =
          this.detachedData =
            null;
        player.detachMedia();
      }
      this.shouldPlay = false;
    }
  }

  public get interstitialsManager(): InterstitialsManager | null {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!this.hls) {
      return null;
    }
    if (this.manager) {
      return this.manager;
    }
    const c = this;
    const effectiveBufferingItem = () => c.bufferingItem || c.waitingItem;
    const getAssetPlayer = (asset: InterstitialAssetItem | null) =>
      asset ? c.getAssetPlayer(asset.identifier) : asset;
    const getMappedTime = (
      item: InterstitialScheduleItem | null,
      timelineType: TimelineType,
      asset: InterstitialAssetItem | null,
      controllerField: 'bufferedPos' | 'timelinePos',
      assetPlayerField: 'bufferedEnd' | 'currentTime',
    ): number => {
      if (item) {
        let time = (
          item[timelineType] as {
            start: number;
            end: number;
          }
        ).start;
        const interstitial = item.event;
        if (interstitial) {
          if (
            timelineType === 'playout' ||
            interstitial.timelineOccupancy !== TimelineOccupancy.Point
          ) {
            const assetPlayer = getAssetPlayer(asset);
            if (assetPlayer?.interstitial === interstitial) {
              time +=
                assetPlayer.assetItem.startOffset +
                assetPlayer[assetPlayerField];
            }
          }
        } else {
          const value =
            controllerField === 'bufferedPos'
              ? getBufferedEnd()
              : c[controllerField];
          time += value - item.start;
        }
        return time;
      }
      return 0;
    };
    const findMappedTime = (
      primaryTime: number,
      timelineType: TimelineType,
    ): number => {
      if (
        primaryTime !== 0 &&
        timelineType !== 'primary' &&
        c.schedule?.length
      ) {
        const index = c.schedule.findItemIndexAtTime(primaryTime);
        const item = c.schedule.items?.[index];
        if (item) {
          const diff = item[timelineType].start - item.start;
          return primaryTime + diff;
        }
      }
      return primaryTime;
    };
    const getBufferedEnd = (): number => {
      const value = c.bufferedPos;
      if (value === Number.MAX_VALUE) {
        return getMappedDuration('primary');
      }
      return Math.max(value, 0);
    };
    const getMappedDuration = (timelineType: TimelineType): number => {
      if (c.primaryDetails?.live) {
        // return end of last event item or playlist
        return c.primaryDetails.edge;
      }
      return c.schedule?.durations[timelineType] || 0;
    };
    const seekTo = (time: number, timelineType: TimelineType) => {
      const item = c.effectivePlayingItem;
      if (item?.event?.restrictions.skip || !c.schedule) {
        return;
      }
      c.log(`seek to ${time} "${timelineType}"`);
      const playingItem = c.effectivePlayingItem;
      const targetIndex = c.schedule.findItemIndexAtTime(time, timelineType);
      const targetItem = c.schedule.items?.[targetIndex];
      const bufferingPlayer = c.getBufferingPlayer();
      const bufferingInterstitial = bufferingPlayer?.interstitial;
      const appendInPlace = bufferingInterstitial?.appendInPlace;
      const seekInItem = playingItem && c.itemsMatch(playingItem, targetItem);
      if (playingItem && (appendInPlace || seekInItem)) {
        // seek in asset player or primary media (appendInPlace)
        const assetPlayer = getAssetPlayer(c.playingAsset);
        const media = assetPlayer?.media || c.primaryMedia;
        if (media) {
          const currentTime =
            timelineType === 'primary'
              ? media.currentTime
              : getMappedTime(
                  playingItem,
                  timelineType,
                  c.playingAsset,
                  'timelinePos',
                  'currentTime',
                );

          const diff = time - currentTime;
          const seekToTime =
            (appendInPlace ? currentTime : media.currentTime) + diff;
          if (
            seekToTime >= 0 &&
            (!assetPlayer ||
              appendInPlace ||
              seekToTime <= assetPlayer.duration)
          ) {
            media.currentTime = seekToTime;
            return;
          }
        }
      }
      // seek out of item or asset
      if (targetItem) {
        let seekToTime = time;
        if (timelineType !== 'primary') {
          const primarySegmentStart = targetItem[timelineType].start;
          const diff = time - primarySegmentStart;
          seekToTime = targetItem.start + diff;
        }
        const targetIsPrimary = !c.isInterstitial(targetItem);
        if (
          (!c.isInterstitial(playingItem) || playingItem.event.appendInPlace) &&
          (targetIsPrimary || targetItem.event.appendInPlace)
        ) {
          const media =
            c.media || (appendInPlace ? bufferingPlayer?.media : null);
          if (media) {
            media.currentTime = seekToTime;
          }
        } else if (playingItem) {
          // check if an Interstitial between the current item and target item has an X-RESTRICT JUMP restriction
          const playingIndex = c.findItemIndex(playingItem);
          if (targetIndex > playingIndex) {
            const jumpIndex = c.schedule.findJumpRestrictedIndex(
              playingIndex + 1,
              targetIndex,
            );
            if (jumpIndex > playingIndex) {
              c.setSchedulePosition(jumpIndex);
              return;
            }
          }

          let assetIndex = 0;
          if (targetIsPrimary) {
            c.timelinePos = seekToTime;
            c.checkBuffer();
          } else {
            const assetList = targetItem.event.assetList;
            const eventTime =
              time - (targetItem[timelineType] || targetItem).start;
            for (let i = assetList.length; i--; ) {
              const asset = assetList[i];
              if (
                asset.duration &&
                eventTime >= asset.startOffset &&
                eventTime < asset.startOffset + asset.duration
              ) {
                assetIndex = i;
                break;
              }
            }
          }
          c.setSchedulePosition(targetIndex, assetIndex);
        }
      }
    };
    const getActiveInterstitial = () => {
      const playingItem = c.effectivePlayingItem;
      if (c.isInterstitial(playingItem)) {
        return playingItem;
      }
      const bufferingItem = effectiveBufferingItem();
      if (c.isInterstitial(bufferingItem)) {
        return bufferingItem;
      }
      return null;
    };
    const interstitialPlayer: InterstitialPlayer = {
      get bufferedEnd() {
        const interstitialItem = effectiveBufferingItem();
        const bufferingItem = c.bufferingItem;
        if (bufferingItem && bufferingItem === interstitialItem) {
          return (
            getMappedTime(
              bufferingItem,
              'playout',
              c.bufferingAsset,
              'bufferedPos',
              'bufferedEnd',
            ) - bufferingItem.playout.start ||
            c.bufferingAsset?.startOffset ||
            0
          );
        }
        return 0;
      },
      get currentTime() {
        const interstitialItem = getActiveInterstitial();
        const playingItem = c.effectivePlayingItem;
        if (playingItem && playingItem === interstitialItem) {
          return (
            getMappedTime(
              playingItem,
              'playout',
              c.effectivePlayingAsset,
              'timelinePos',
              'currentTime',
            ) - playingItem.playout.start
          );
        }
        return 0;
      },
      set currentTime(time: number) {
        const interstitialItem = getActiveInterstitial();
        const playingItem = c.effectivePlayingItem;
        if (playingItem && playingItem === interstitialItem) {
          seekTo(time + playingItem.playout.start, 'playout');
        }
      },
      get duration() {
        const interstitialItem = getActiveInterstitial();
        if (interstitialItem) {
          return interstitialItem.playout.end - interstitialItem.playout.start;
        }
        return 0;
      },
      get assetPlayers() {
        const assetList = getActiveInterstitial()?.event.assetList;
        if (assetList) {
          return assetList.map((asset) => c.getAssetPlayer(asset.identifier));
        }
        return [];
      },
      get playingIndex() {
        const interstitial = getActiveInterstitial()?.event;
        if (interstitial && c.effectivePlayingAsset) {
          return interstitial.findAssetIndex(c.effectivePlayingAsset);
        }
        return -1;
      },
      get scheduleItem() {
        return getActiveInterstitial();
      },
    };
    return (this.manager = {
      get events() {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return c.schedule?.events?.slice(0) || [];
      },
      get schedule() {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return c.schedule?.items?.slice(0) || [];
      },
      get interstitialPlayer() {
        if (getActiveInterstitial()) {
          return interstitialPlayer;
        }
        return null;
      },
      get playerQueue() {
        return c.playerQueue.slice(0);
      },
      get bufferingAsset() {
        return c.bufferingAsset;
      },
      get bufferingItem() {
        return effectiveBufferingItem();
      },
      get bufferingIndex() {
        const item = effectiveBufferingItem();
        return c.findItemIndex(item);
      },
      get playingAsset() {
        return c.effectivePlayingAsset;
      },
      get playingItem() {
        return c.effectivePlayingItem;
      },
      get playingIndex() {
        const item = c.effectivePlayingItem;
        return c.findItemIndex(item);
      },
      primary: {
        get bufferedEnd() {
          return getBufferedEnd();
        },
        get currentTime() {
          const timelinePos = c.timelinePos;
          return timelinePos > 0 ? timelinePos : 0;
        },
        set currentTime(time: number) {
          seekTo(time, 'primary');
        },
        get duration() {
          return getMappedDuration('primary');
        },
        get seekableStart() {
          return c.primaryDetails?.fragmentStart || 0;
        },
      },
      integrated: {
        get bufferedEnd() {
          return getMappedTime(
            effectiveBufferingItem(),
            'integrated',
            c.bufferingAsset,
            'bufferedPos',
            'bufferedEnd',
          );
        },
        get currentTime() {
          return getMappedTime(
            c.effectivePlayingItem,
            'integrated',
            c.effectivePlayingAsset,
            'timelinePos',
            'currentTime',
          );
        },
        set currentTime(time: number) {
          seekTo(time, 'integrated');
        },
        get duration() {
          return getMappedDuration('integrated');
        },
        get seekableStart() {
          return findMappedTime(
            c.primaryDetails?.fragmentStart || 0,
            'integrated',
          );
        },
      },
      skip: () => {
        const item = c.effectivePlayingItem;
        const event = item?.event;
        if (event && !event.restrictions.skip) {
          const index = c.findItemIndex(item);
          if (event.appendInPlace) {
            const time = item.playout.start + item.event.duration;
            seekTo(time + 0.001, 'playout');
          } else {
            c.advanceAfterAssetEnded(event, index, Infinity);
          }
        }
      },
    });
  }

  // Schedule getters
  private get effectivePlayingItem(): InterstitialScheduleItem | null {
    return this.waitingItem || this.playingItem || this.endedItem;
  }

  private get effectivePlayingAsset(): InterstitialAssetItem | null {
    return this.playingAsset || this.endedAsset;
  }

  private get playingLastItem(): boolean {
    const playingItem = this.playingItem;
    const items = this.schedule?.items;
    if (!this.playbackStarted || !playingItem || !items) {
      return false;
    }

    return this.findItemIndex(playingItem) === items.length - 1;
  }

  private get playbackStarted(): boolean {
    return this.effectivePlayingItem !== null;
  }

  // Media getters and event callbacks
  private get currentTime(): number | undefined {
    if (this.mediaSelection === null) {
      // Do not advance before schedule is known
      return undefined;
    }
    // Ignore currentTime when detached for Interstitial playback with source reset
    const queuedForPlayback = this.waitingItem || this.playingItem;
    if (
      this.isInterstitial(queuedForPlayback) &&
      !queuedForPlayback.event.appendInPlace
    ) {
      return undefined;
    }
    let media = this.media;
    if (!media && this.bufferingItem?.event?.appendInPlace) {
      // Observe detached media currentTime when appending in place
      media = this.primaryMedia;
    }
    const currentTime = media?.currentTime;
    if (currentTime === undefined || !Number.isFinite(currentTime)) {
      return undefined;
    }
    return currentTime;
  }

  private get primaryMedia(): HTMLMediaElement | null {
    return this.media || this.detachedData?.media || null;
  }

  private isInterstitial(
    item: InterstitialScheduleItem | null | undefined,
  ): item is InterstitialScheduleEventItem {
    return !!item?.event;
  }

  private retreiveMediaSource(
    assetId: InterstitialAssetId,
    toSegment: InterstitialScheduleItem | null,
  ) {
    const player = this.getAssetPlayer(assetId);
    if (player) {
      this.transferMediaFromPlayer(player, toSegment);
    }
  }

  private transferMediaFromPlayer(
    player: HlsAssetPlayer,
    toSegment: InterstitialScheduleItem | null | undefined,
  ) {
    const appendInPlace = player.interstitial.appendInPlace;
    const playerMedia = player.media;
    if (appendInPlace && playerMedia === this.primaryMedia) {
      this.bufferingAsset = null;
      if (
        !toSegment ||
        (this.isInterstitial(toSegment) && !toSegment.event.appendInPlace)
      ) {
        // MediaSource cannot be transfered back to an Interstitial that requires a source reset
        // no-op when toSegment is undefined
        if (toSegment && playerMedia) {
          this.detachedData = { media: playerMedia };
          return;
        }
      }
      const attachMediaSourceData = player.transferMedia();
      this.log(
        `transfer MediaSource from ${player} ${stringify(attachMediaSourceData)}`,
      );
      this.detachedData = attachMediaSourceData;
    } else if (toSegment && playerMedia) {
      this.shouldPlay ||= !playerMedia.paused;
    }
  }

  private transferMediaTo(
    player: Hls | HlsAssetPlayer,
    media: HTMLMediaElement,
  ) {
    if (player.media === media) {
      return;
    }
    let attachMediaSourceData: MediaAttachingData | null = null;
    const primaryPlayer = this.hls;
    const isAssetPlayer = player !== primaryPlayer;
    const appendInPlace =
      isAssetPlayer && (player as HlsAssetPlayer).interstitial.appendInPlace;
    const detachedMediaSource = this.detachedData?.mediaSource;

    let logFromSource: string;
    if (primaryPlayer.media) {
      if (appendInPlace) {
        attachMediaSourceData = primaryPlayer.transferMedia();
        this.detachedData = attachMediaSourceData;
      }
      logFromSource = `Primary`;
    } else if (detachedMediaSource) {
      const bufferingPlayer = this.getBufferingPlayer();
      if (bufferingPlayer) {
        attachMediaSourceData = bufferingPlayer.transferMedia();
        logFromSource = `${bufferingPlayer}`;
      } else {
        logFromSource = `detached MediaSource`;
      }
    } else {
      logFromSource = `detached media`;
    }
    if (!attachMediaSourceData) {
      if (detachedMediaSource) {
        attachMediaSourceData = this.detachedData;
        this.log(
          `using detachedData: MediaSource ${stringify(attachMediaSourceData)}`,
        );
      } else if (!this.detachedData || primaryPlayer.media === media) {
        // Keep interstitial media transition consistent
        const playerQueue = this.playerQueue;
        if (playerQueue.length > 1) {
          playerQueue.forEach((queuedPlayer) => {
            if (
              isAssetPlayer &&
              queuedPlayer.interstitial.appendInPlace !== appendInPlace
            ) {
              const interstitial = queuedPlayer.interstitial;
              this.clearInterstitial(queuedPlayer.interstitial, null);
              interstitial.appendInPlace = false; // setter may be a no-op;
              // `appendInPlace` getter may still return `true` after insterstitial streaming has begun in that mode.
              if (interstitial.appendInPlace as boolean) {
                this.warn(
                  `Could not change append strategy for queued assets ${interstitial}`,
                );
              }
            }
          });
        }
        this.hls.detachMedia();
        this.detachedData = { media };
      }
    }
    const transferring =
      attachMediaSourceData &&
      'mediaSource' in attachMediaSourceData &&
      attachMediaSourceData.mediaSource?.readyState !== 'closed';
    const dataToAttach =
      transferring && attachMediaSourceData ? attachMediaSourceData : media;
    this.log(
      `${transferring ? 'transfering MediaSource' : 'attaching media'} to ${
        isAssetPlayer ? player : 'Primary'
      } from ${logFromSource} (media.currentTime: ${media.currentTime})`,
    );
    const schedule = this.schedule;
    if (dataToAttach === attachMediaSourceData && schedule) {
      const isAssetAtEndOfSchedule =
        isAssetPlayer &&
        (player as HlsAssetPlayer).assetId === schedule.assetIdAtEnd;
      // Prevent asset players from marking EoS on transferred MediaSource
      dataToAttach.overrides = {
        duration: schedule.duration,
        endOfStream: !isAssetPlayer || isAssetAtEndOfSchedule,
        cueRemoval: !isAssetPlayer,
      };
    }
    player.attachMedia(dataToAttach);
  }

  private onPlay = () => {
    this.shouldPlay = true;
  };

  private onPause = () => {
    this.shouldPlay = false;
  };

  private onSeeking = () => {
    const currentTime = this.currentTime;
    if (currentTime === undefined || this.playbackDisabled || !this.schedule) {
      return;
    }
    const diff = currentTime - this.timelinePos;
    const roundingError = Math.abs(diff) < 1 / 705600000; // one flick
    if (roundingError) {
      return;
    }
    const backwardSeek = diff <= -0.01;
    this.timelinePos = currentTime;
    this.bufferedPos = currentTime;

    // Check if seeking out of an item
    const playingItem = this.playingItem;
    if (!playingItem) {
      this.checkBuffer();
      return;
    }
    if (backwardSeek) {
      const resetCount = this.schedule.resetErrorsInRange(
        currentTime,
        currentTime - diff,
      );
      if (resetCount) {
        this.updateSchedule(true);
      }
    }
    this.checkBuffer();
    if (
      (backwardSeek && currentTime < playingItem.start) ||
      currentTime >= playingItem.end
    ) {
      const playingIndex = this.findItemIndex(playingItem);
      let scheduleIndex = this.schedule.findItemIndexAtTime(currentTime);
      if (scheduleIndex === -1) {
        scheduleIndex = playingIndex + (backwardSeek ? -1 : 1);
        this.log(
          `seeked ${backwardSeek ? 'back ' : ''}to position not covered by schedule ${currentTime} (resolving from ${playingIndex} to ${scheduleIndex})`,
        );
      }
      if (!this.isInterstitial(playingItem) && this.media?.paused) {
        this.shouldPlay = false;
      }
      if (!backwardSeek) {
        // check if an Interstitial between the current item and target item has an X-RESTRICT JUMP restriction
        if (scheduleIndex > playingIndex) {
          const jumpIndex = this.schedule.findJumpRestrictedIndex(
            playingIndex + 1,
            scheduleIndex,
          );
          if (jumpIndex > playingIndex) {
            this.setSchedulePosition(jumpIndex);
            return;
          }
        }
      }
      this.setSchedulePosition(scheduleIndex);
      return;
    }
    // Check if seeking out of an asset (assumes same item following above check)
    const playingAsset = this.playingAsset;
    if (!playingAsset) {
      // restart Interstitial at end
      if (this.playingLastItem && this.isInterstitial(playingItem)) {
        const restartAsset = playingItem.event.assetList[0];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (restartAsset) {
          this.endedItem = this.playingItem;
          this.playingItem = null;
          this.setScheduleToAssetAtTime(currentTime, restartAsset);
        }
      }
      return;
    }
    const start = playingAsset.timelineStart;
    const duration = playingAsset.duration || 0;
    if (
      (backwardSeek && currentTime < start) ||
      currentTime >= start + duration
    ) {
      if (playingItem.event?.appendInPlace) {
        this.clearInterstitial(playingItem.event, playingItem);
        this.flushFrontBuffer(currentTime);
      }
      this.setScheduleToAssetAtTime(currentTime, playingAsset);
    }
  };

  private onInterstitialCueEnter() {
    this.onTimeupdate();
  }

  private onTimeupdate = () => {
    const currentTime = this.currentTime;
    if (currentTime === undefined || this.playbackDisabled) {
      return;
    }

    // Only allow timeupdate to advance primary position, seeking is used for jumping back
    // this prevents primaryPos from being reset to 0 after re-attach
    if (currentTime > this.timelinePos) {
      this.timelinePos = currentTime;
      if (currentTime > this.bufferedPos) {
        this.checkBuffer();
      }
    } else {
      return;
    }

    // Check if playback has entered the next item
    const playingItem = this.playingItem;
    if (!playingItem || this.playingLastItem) {
      return;
    }
    if (currentTime >= playingItem.end) {
      this.timelinePos = playingItem.end;
      const playingIndex = this.findItemIndex(playingItem);
      this.setSchedulePosition(playingIndex + 1);
    }
    // Check if playback has entered the next asset
    const playingAsset = this.playingAsset;
    if (!playingAsset) {
      return;
    }
    const end = playingAsset.timelineStart + (playingAsset.duration || 0);
    if (currentTime >= end) {
      this.setScheduleToAssetAtTime(currentTime, playingAsset);
    }
  };

  // Scheduling methods
  private checkStart() {
    const schedule = this.schedule;
    const interstitialEvents = schedule?.events;
    if (!interstitialEvents || this.playbackDisabled || !this.media) {
      return;
    }
    // Check buffered to pre-roll
    if (this.bufferedPos === -1) {
      this.bufferedPos = 0;
    }
    // Start stepping through schedule when playback begins for the first time and we have a pre-roll
    const timelinePos = this.timelinePos;
    const effectivePlayingItem = this.effectivePlayingItem;
    if (timelinePos === -1) {
      const startPosition = this.hls.startPosition;
      this.log(timelineMessage('checkStart', startPosition));
      this.timelinePos = startPosition;
      if (interstitialEvents.length && interstitialEvents[0].cue.pre) {
        const index = schedule.findEventIndex(interstitialEvents[0].identifier);
        this.setSchedulePosition(index);
      } else if (startPosition >= 0 || !this.primaryLive) {
        const start = (this.timelinePos =
          startPosition > 0 ? startPosition : 0);
        const index = schedule.findItemIndexAtTime(start);
        this.setSchedulePosition(index);
      }
    } else if (effectivePlayingItem && !this.playingItem) {
      const index = schedule.findItemIndex(effectivePlayingItem);
      this.setSchedulePosition(index);
    }
  }

  private advanceAssetBuffering(
    item: InterstitialScheduleEventItem,
    assetItem: InterstitialAssetItem,
  ) {
    const interstitial = item.event;
    const assetListIndex = interstitial.findAssetIndex(assetItem);
    const nextAssetIndex = getNextAssetIndex(interstitial, assetListIndex);
    if (!interstitial.isAssetPastPlayoutLimit(nextAssetIndex)) {
      this.bufferedToEvent(item, nextAssetIndex);
    } else if (this.schedule) {
      const nextItem = this.schedule.items?.[this.findItemIndex(item) + 1];
      if (nextItem) {
        this.bufferedToItem(nextItem);
      }
    }
  }

  private advanceAfterAssetEnded(
    interstitial: InterstitialEvent,
    index: number,
    assetListIndex: number,
  ) {
    const nextAssetIndex = getNextAssetIndex(interstitial, assetListIndex);
    if (!interstitial.isAssetPastPlayoutLimit(nextAssetIndex)) {
      // Advance to next asset list item
      if (interstitial.appendInPlace) {
        const assetItem = interstitial.assetList[nextAssetIndex] as
          | InterstitialAssetItem
          | undefined;
        if (assetItem) {
          this.advanceInPlace(assetItem.timelineStart);
        }
      }
      this.setSchedulePosition(index, nextAssetIndex);
    } else if (this.schedule) {
      // Advance to next schedule segment
      // check if we've reached the end of the program
      const scheduleItems = this.schedule.items;
      if (scheduleItems) {
        const nextIndex = index + 1;
        const scheduleLength = scheduleItems.length;
        if (nextIndex >= scheduleLength) {
          this.setSchedulePosition(-1);
          return;
        }
        const resumptionTime = interstitial.resumeTime;
        if (this.timelinePos < resumptionTime) {
          this.log(timelineMessage('advanceAfterAssetEnded', resumptionTime));
          this.timelinePos = resumptionTime;
          if (interstitial.appendInPlace) {
            this.advanceInPlace(resumptionTime);
          }
          this.checkBuffer(this.bufferedPos < resumptionTime);
        }
        this.setSchedulePosition(nextIndex);
      }
    }
  }

  private setScheduleToAssetAtTime(
    time: number,
    playingAsset: InterstitialAssetItem,
  ) {
    const schedule = this.schedule;
    if (!schedule) {
      return;
    }
    const parentIdentifier = playingAsset.parentIdentifier;
    const interstitial = schedule.getEvent(parentIdentifier);
    if (interstitial) {
      const itemIndex = schedule.findEventIndex(parentIdentifier);
      const assetListIndex = schedule.findAssetIndex(interstitial, time);
      this.advanceAfterAssetEnded(interstitial, itemIndex, assetListIndex - 1);
    }
  }

  private setSchedulePosition(index: number, assetListIndex?: number) {
    const scheduleItems = this.schedule?.items;
    if (!scheduleItems || this.playbackDisabled) {
      return;
    }
    const scheduledItem = index >= 0 ? scheduleItems[index] : null;
    this.log(
      `setSchedulePosition ${index}, ${assetListIndex} (${scheduledItem ? segmentToString(scheduledItem) : scheduledItem}) pos: ${this.timelinePos}`,
    );
    // Cleanup current item / asset
    const currentItem = this.waitingItem || this.playingItem;
    const playingLastItem = this.playingLastItem;
    if (this.isInterstitial(currentItem)) {
      const interstitial = currentItem.event;
      const playingAsset = this.playingAsset;
      const assetId = playingAsset?.identifier;
      const player = assetId ? this.getAssetPlayer(assetId) : null;
      if (
        player &&
        assetId &&
        (!this.eventItemsMatch(currentItem, scheduledItem) ||
          (assetListIndex !== undefined &&
            assetId !== interstitial.assetList[assetListIndex].identifier))
      ) {
        const playingAssetListIndex = interstitial.findAssetIndex(playingAsset);
        this.log(
          `INTERSTITIAL_ASSET_ENDED ${playingAssetListIndex + 1}/${interstitial.assetList.length} ${eventAssetToString(playingAsset)}`,
        );
        this.endedAsset = playingAsset;
        this.playingAsset = null;
        this.hls.trigger(Events.INTERSTITIAL_ASSET_ENDED, {
          asset: playingAsset,
          assetListIndex: playingAssetListIndex,
          event: interstitial,
          schedule: scheduleItems.slice(0),
          scheduleIndex: index,
          player,
        });
        if (currentItem !== this.playingItem) {
          // Schedule change occured on INTERSTITIAL_ASSET_ENDED
          if (
            this.itemsMatch(currentItem, this.playingItem) &&
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            !this.playingAsset // INTERSTITIAL_ASSET_ENDED side-effect
          ) {
            this.advanceAfterAssetEnded(
              interstitial,
              this.findItemIndex(this.playingItem),
              playingAssetListIndex,
            );
          }
          // Navigation occured on INTERSTITIAL_ASSET_ENDED
          return;
        }
        this.retreiveMediaSource(assetId, scheduledItem);
        if (player.media && !this.detachedData?.mediaSource) {
          player.detachMedia();
        }
      }
      if (!this.eventItemsMatch(currentItem, scheduledItem)) {
        this.endedItem = currentItem;
        this.playingItem = null;
        this.log(
          `INTERSTITIAL_ENDED ${interstitial} ${segmentToString(currentItem)}`,
        );
        interstitial.hasPlayed = true;
        this.hls.trigger(Events.INTERSTITIAL_ENDED, {
          event: interstitial,
          schedule: scheduleItems.slice(0),
          scheduleIndex: index,
        });
        // Exiting an Interstitial
        if (interstitial.cue.once) {
          // Remove interstitial with CUE attribute value of ONCE after it has played
          this.updateSchedule();
          const updatedScheduleItems = this.schedule?.items;
          if (scheduledItem && updatedScheduleItems) {
            const updatedIndex = this.findItemIndex(scheduledItem);
            this.advanceSchedule(
              updatedIndex,
              updatedScheduleItems,
              assetListIndex,
              currentItem,
              playingLastItem,
            );
          }
          return;
        }
      }
    }
    this.advanceSchedule(
      index,
      scheduleItems,
      assetListIndex,
      currentItem,
      playingLastItem,
    );
  }
  private advanceSchedule(
    index: number,
    scheduleItems: InterstitialScheduleItem[],
    assetListIndex: number | undefined,
    currentItem: InterstitialScheduleItem | null,
    playedLastItem: boolean,
  ) {
    const schedule = this.schedule;
    if (!schedule) {
      return;
    }
    const scheduledItem = scheduleItems[index] || null;
    const media = this.primaryMedia;
    // Cleanup out of range Interstitials
    const playerQueue = this.playerQueue;
    if (playerQueue.length) {
      playerQueue.forEach((player) => {
        const interstitial = player.interstitial;
        const queuedIndex = schedule.findEventIndex(interstitial.identifier);
        if (queuedIndex < index || queuedIndex > index + 1) {
          this.clearInterstitial(interstitial, scheduledItem);
        }
      });
    }
    // Setup scheduled item
    if (this.isInterstitial(scheduledItem)) {
      this.timelinePos = Math.min(
        Math.max(this.timelinePos, scheduledItem.start),
        scheduledItem.end,
      );
      // Handle Interstitial
      const interstitial = scheduledItem.event;
      // find asset index
      if (assetListIndex === undefined) {
        assetListIndex = schedule.findAssetIndex(
          interstitial,
          this.timelinePos,
        );
        const assetIndexCandidate = getNextAssetIndex(
          interstitial,
          assetListIndex - 1,
        );
        if (
          interstitial.isAssetPastPlayoutLimit(assetIndexCandidate) ||
          (interstitial.appendInPlace && this.timelinePos === scheduledItem.end)
        ) {
          this.advanceAfterAssetEnded(interstitial, index, assetListIndex);
          return;
        }
        assetListIndex = assetIndexCandidate;
      }
      // Ensure Interstitial is enqueued
      const waitingItem = this.waitingItem;
      if (!this.assetsBuffered(scheduledItem, media)) {
        this.setBufferingItem(scheduledItem);
      }
      let player = this.preloadAssets(interstitial, assetListIndex);
      if (!this.eventItemsMatch(scheduledItem, waitingItem || currentItem)) {
        this.waitingItem = scheduledItem;
        this.log(
          `INTERSTITIAL_STARTED ${segmentToString(scheduledItem)} ${interstitial.appendInPlace ? 'append in place' : ''}`,
        );
        this.hls.trigger(Events.INTERSTITIAL_STARTED, {
          event: interstitial,
          schedule: scheduleItems.slice(0),
          scheduleIndex: index,
        });
      }
      if (!interstitial.assetListLoaded) {
        // Waiting at end of primary content segment
        // Expect setSchedulePosition to be called again once ASSET-LIST is loaded
        this.log(`Waiting for ASSET-LIST to complete loading ${interstitial}`);
        return;
      }
      if (interstitial.assetListLoader) {
        interstitial.assetListLoader.destroy();
        interstitial.assetListLoader = undefined;
      }
      if (!media) {
        this.log(
          `Waiting for attachMedia to start Interstitial ${interstitial}`,
        );
        return;
      }
      // Update schedule and asset list position now that it can start
      this.waitingItem = this.endedItem = null;
      this.playingItem = scheduledItem;

      // If asset-list is empty or missing asset index, advance to next item
      const assetItem = interstitial.assetList[assetListIndex] as
        | InterstitialAssetItem
        | undefined;
      if (!assetItem) {
        this.advanceAfterAssetEnded(interstitial, index, assetListIndex || 0);
        return;
      }

      // Start Interstitial Playback
      if (!player) {
        player = this.getAssetPlayer(assetItem.identifier);
      }
      if (player === null || player.destroyed) {
        const assetListLength = interstitial.assetList.length;
        this.warn(
          `asset ${
            assetListIndex + 1
          }/${assetListLength} player destroyed ${interstitial}`,
        );
        player = this.createAssetPlayer(
          interstitial,
          assetItem,
          assetListIndex,
        );
        player.loadSource();
      }
      if (!this.eventItemsMatch(scheduledItem, this.bufferingItem)) {
        if (interstitial.appendInPlace && this.isAssetBuffered(assetItem)) {
          return;
        }
      }
      this.startAssetPlayer(
        player,
        assetListIndex,
        scheduleItems,
        index,
        media,
      );
      if (this.shouldPlay) {
        playWithCatch(player.media);
      }
    } else if (scheduledItem) {
      this.resumePrimary(scheduledItem, index, currentItem);
      if (this.shouldPlay) {
        playWithCatch(this.hls.media);
      }
    } else if (playedLastItem && this.isInterstitial(currentItem)) {
      // Maintain playingItem state at end of schedule (setSchedulePosition(-1) called to end program)
      // this allows onSeeking handler to update schedule position
      this.endedItem = null;
      this.playingItem = currentItem;
      if (!currentItem.event.appendInPlace) {
        // Media must be re-attached to resume primary schedule if not sharing source
        this.attachPrimary(schedule.durations.primary, null);
      }
    }
  }

  private get playbackDisabled(): boolean {
    return this.hls.config.enableInterstitialPlayback === false;
  }

  private get primaryDetails(): LevelDetails | undefined {
    return this.mediaSelection?.main.details;
  }

  private get primaryLive(): boolean {
    return !!this.primaryDetails?.live;
  }

  private resumePrimary(
    scheduledItem: InterstitialSchedulePrimaryItem,
    index: number,
    fromItem: InterstitialScheduleItem | null,
  ) {
    this.playingItem = scheduledItem;
    this.playingAsset = this.endedAsset = null;
    this.waitingItem = this.endedItem = null;

    this.bufferedToItem(scheduledItem);

    this.log(`resuming ${segmentToString(scheduledItem)}`);

    if (!this.detachedData?.mediaSource) {
      let timelinePos = this.timelinePos;
      if (
        timelinePos < scheduledItem.start ||
        timelinePos >= scheduledItem.end
      ) {
        timelinePos = this.getPrimaryResumption(scheduledItem, index);
        this.log(timelineMessage('resumePrimary', timelinePos));
        this.timelinePos = timelinePos;
      }
      this.attachPrimary(timelinePos, scheduledItem);
    }

    if (!fromItem) {
      return;
    }

    const scheduleItems = this.schedule?.items;
    if (!scheduleItems) {
      return;
    }
    this.log(`INTERSTITIALS_PRIMARY_RESUMED ${segmentToString(scheduledItem)}`);
    this.hls.trigger(Events.INTERSTITIALS_PRIMARY_RESUMED, {
      schedule: scheduleItems.slice(0),
      scheduleIndex: index,
    });
    this.checkBuffer();
  }

  private getPrimaryResumption(
    scheduledItem: InterstitialSchedulePrimaryItem,
    index: number,
  ): number {
    const itemStart = scheduledItem.start;
    if (this.primaryLive) {
      const details = this.primaryDetails;
      if (index === 0) {
        return this.hls.startPosition;
      } else if (
        details &&
        (itemStart < details.fragmentStart || itemStart > details.edge)
      ) {
        return this.hls.liveSyncPosition || -1;
      }
    }
    return itemStart;
  }

  private isAssetBuffered(asset: InterstitialAssetItem): boolean {
    const player = this.getAssetPlayer(asset.identifier);
    if (player?.hls) {
      return player.hls.bufferedToEnd;
    }
    const bufferInfo = BufferHelper.bufferInfo(
      this.primaryMedia,
      this.timelinePos,
      0,
    );
    return bufferInfo.end + 1 >= asset.timelineStart + (asset.duration || 0);
  }

  private attachPrimary(
    timelinePos: number,
    item: InterstitialSchedulePrimaryItem | null,
    skipSeekToStartPosition?: boolean,
  ) {
    if (item) {
      this.setBufferingItem(item);
    } else {
      this.bufferingItem = this.playingItem;
    }
    this.bufferingAsset = null;

    const media = this.primaryMedia;
    if (!media) {
      return;
    }
    const hls = this.hls;
    if (hls.media) {
      this.checkBuffer();
    } else {
      this.transferMediaTo(hls, media);
      if (skipSeekToStartPosition) {
        this.startLoadingPrimaryAt(timelinePos, skipSeekToStartPosition);
      }
    }
    if (!skipSeekToStartPosition) {
      // Set primary position to resume time
      this.log(timelineMessage('attachPrimary', timelinePos));
      this.timelinePos = timelinePos;
      this.startLoadingPrimaryAt(timelinePos, skipSeekToStartPosition);
    }
  }

  private startLoadingPrimaryAt(
    timelinePos: number,
    skipSeekToStartPosition?: boolean,
  ) {
    const hls = this.hls;
    if (
      !hls.loadingEnabled ||
      !hls.media ||
      Math.abs(
        (hls.mainForwardBufferInfo?.start || hls.media.currentTime) -
          timelinePos,
      ) > 0.5
    ) {
      hls.startLoad(timelinePos, skipSeekToStartPosition);
    } else if (!hls.bufferingEnabled) {
      hls.resumeBuffering();
    }
  }

  // HLS.js event callbacks
  private onManifestLoading() {
    this.stopLoad();
    this.schedule?.reset();
    this.emptyPlayerQueue();
    this.clearScheduleState();
    this.shouldPlay = false;
    this.bufferedPos = this.timelinePos = -1;
    this.mediaSelection =
      this.altSelection =
      this.manager =
      this.requiredTracks =
        null;
    // BUFFER_CODECS listener added here for buffer-controller to handle it first where it adds tracks
    this.hls.off(Events.BUFFER_CODECS, this.onBufferCodecs, this);
    this.hls.on(Events.BUFFER_CODECS, this.onBufferCodecs, this);
  }

  private onLevelUpdated(event: Events.LEVEL_UPDATED, data: LevelUpdatedData) {
    if (data.level === -1 || !this.schedule) {
      // level was removed
      return;
    }
    const main = this.hls.levels[data.level];
    if (!main.details) {
      return;
    }
    const currentSelection = {
      ...(this.mediaSelection || this.altSelection),
      main,
    };
    this.mediaSelection = currentSelection;
    this.schedule.parseInterstitialDateRanges(
      currentSelection,
      this.hls.config.interstitialAppendInPlace,
    );

    if (!this.effectivePlayingItem && this.schedule.items) {
      this.checkStart();
    }
  }

  private onAudioTrackUpdated(
    event: Events.AUDIO_TRACK_UPDATED,
    data: AudioTrackUpdatedData,
  ) {
    const audio = this.hls.audioTracks[data.id];
    const previousSelection = this.mediaSelection;
    if (!previousSelection) {
      this.altSelection = { ...this.altSelection, audio };
      return;
    }
    const currentSelection = { ...previousSelection, audio };
    this.mediaSelection = currentSelection;
  }

  private onSubtitleTrackUpdated(
    event: Events.SUBTITLE_TRACK_UPDATED,
    data: SubtitleTrackUpdatedData,
  ) {
    const subtitles = this.hls.subtitleTracks[data.id];
    const previousSelection = this.mediaSelection;
    if (!previousSelection) {
      this.altSelection = { ...this.altSelection, subtitles };
      return;
    }
    const currentSelection = { ...previousSelection, subtitles };
    this.mediaSelection = currentSelection;
  }

  private onAudioTrackSwitching(
    event: Events.AUDIO_TRACK_SWITCHING,
    data: AudioTrackSwitchingData,
  ) {
    const audioOption = getBasicSelectionOption(data);
    this.playerQueue.forEach(
      ({ hls }) =>
        hls && (hls.setAudioOption(data) || hls.setAudioOption(audioOption)),
    );
  }

  private onSubtitleTrackSwitch(
    event: Events.SUBTITLE_TRACK_SWITCH,
    data: SubtitleTrackSwitchData,
  ) {
    const subtitleOption = getBasicSelectionOption(data);
    this.playerQueue.forEach(
      ({ hls }) =>
        hls &&
        (hls.setSubtitleOption(data) ||
          (data.id !== -1 && hls.setSubtitleOption(subtitleOption))),
    );
  }

  private onBufferCodecs(event: Events.BUFFER_CODECS, data: BufferCodecsData) {
    const requiredTracks = data.tracks;
    if (requiredTracks) {
      this.requiredTracks = requiredTracks;
    }
  }

  private onBufferAppended(
    event: Events.BUFFER_APPENDED,
    data: BufferAppendedData,
  ) {
    this.checkBuffer();
  }

  private onBufferFlushed(
    event: Events.BUFFER_FLUSHED,
    data: BufferFlushedData,
  ) {
    const playingItem = this.playingItem;
    if (
      playingItem &&
      !this.itemsMatch(playingItem, this.bufferingItem) &&
      !this.isInterstitial(playingItem)
    ) {
      const timelinePos = this.timelinePos;
      this.bufferedPos = timelinePos;
      this.checkBuffer();
    }
  }

  private onBufferedToEnd(event: Events.BUFFERED_TO_END) {
    if (!this.schedule) {
      return;
    }
    // Buffered to post-roll
    const interstitialEvents = this.schedule.events;
    if (this.bufferedPos < Number.MAX_VALUE && interstitialEvents) {
      for (let i = 0; i < interstitialEvents.length; i++) {
        const interstitial = interstitialEvents[i];
        if (interstitial.cue.post) {
          const scheduleIndex = this.schedule.findEventIndex(
            interstitial.identifier,
          );
          const item = this.schedule.items?.[scheduleIndex];
          if (
            this.isInterstitial(item) &&
            this.eventItemsMatch(item, this.bufferingItem)
          ) {
            this.bufferedToItem(item, 0);
          }
          break;
        }
      }
      this.bufferedPos = Number.MAX_VALUE;
    }
  }

  private onMediaEnded(event: Events.MEDIA_ENDED) {
    const playingItem = this.playingItem;
    if (!this.playingLastItem && playingItem) {
      const playingIndex = this.findItemIndex(playingItem);
      this.setSchedulePosition(playingIndex + 1);
    } else {
      this.shouldPlay = false;
    }
  }

  // Schedule update callback
  private onScheduleUpdate = (
    removedInterstitials: InterstitialEvent[],
    previousItems: InterstitialScheduleItem[] | null,
  ) => {
    const schedule = this.schedule;
    if (!schedule) {
      return;
    }
    const playingItem = this.playingItem;
    const interstitialEvents = schedule.events || [];
    const scheduleItems = schedule.items || [];
    const durations = schedule.durations;
    const removedIds = removedInterstitials.map(
      (interstitial) => interstitial.identifier,
    );
    const interstitialsUpdated = !!(
      interstitialEvents.length || removedIds.length
    );
    if (interstitialsUpdated || previousItems) {
      this.log(
        `INTERSTITIALS_UPDATED (${
          interstitialEvents.length
        }): ${interstitialEvents}
Schedule: ${scheduleItems.map((seg) => segmentToString(seg))} pos: ${this.timelinePos}`,
      );
    }
    if (removedIds.length) {
      this.log(`Removed events ${removedIds}`);
    }

    // Update schedule item references
    // Do not replace Interstitial playingItem without a match - used for INTERSTITIAL_ASSET_ENDED and INTERSTITIAL_ENDED
    let updatedPlayingItem: InterstitialScheduleItem | null = null;
    let updatedBufferingItem: InterstitialScheduleItem | null = null;
    if (playingItem) {
      updatedPlayingItem = this.updateItem(playingItem, this.timelinePos);
      if (this.itemsMatch(playingItem, updatedPlayingItem)) {
        this.playingItem = updatedPlayingItem;
      } else {
        this.waitingItem = this.endedItem = null;
      }
    }
    // Clear waitingItem if it has been removed from the schedule
    this.waitingItem = this.updateItem(this.waitingItem);
    this.endedItem = this.updateItem(this.endedItem);
    // Do not replace Interstitial bufferingItem without a match - used for transfering media element or source
    const bufferingItem = this.bufferingItem;
    if (bufferingItem) {
      updatedBufferingItem = this.updateItem(bufferingItem, this.bufferedPos);
      if (this.itemsMatch(bufferingItem, updatedBufferingItem)) {
        this.bufferingItem = updatedBufferingItem;
      } else if (bufferingItem.event) {
        // Interstitial removed from schedule (Live -> VOD or other scenario where Start Date is outside the range of VOD Playlist)
        this.bufferingItem = this.playingItem;
        this.clearInterstitial(bufferingItem.event, null);
      }
    }

    removedInterstitials.forEach((interstitial) => {
      interstitial.assetList.forEach((asset) => {
        this.clearAssetPlayer(asset.identifier, null);
      });
    });

    this.playerQueue.forEach((player) => {
      if (player.interstitial.appendInPlace) {
        const timelineStart = player.assetItem.timelineStart;
        const diff = player.timelineOffset - timelineStart;
        if (diff) {
          try {
            player.timelineOffset = timelineStart;
          } catch (e) {
            if (Math.abs(diff) > ALIGNED_END_THRESHOLD_SECONDS) {
              this.warn(
                `${e} ("${player.assetId}" ${player.timelineOffset}->${timelineStart})`,
              );
            }
          }
        }
      }
    });

    if (interstitialsUpdated || previousItems) {
      this.hls.trigger(Events.INTERSTITIALS_UPDATED, {
        events: interstitialEvents.slice(0),
        schedule: scheduleItems.slice(0),
        durations,
        removedIds,
      });

      if (
        this.isInterstitial(playingItem) &&
        removedIds.includes(playingItem.event.identifier)
      ) {
        this.warn(
          `Interstitial "${playingItem.event.identifier}" removed while playing`,
        );
        this.primaryFallback(playingItem.event);
        return;
      }

      if (playingItem) {
        this.trimInPlace(updatedPlayingItem, playingItem);
      }
      if (bufferingItem && updatedBufferingItem !== updatedPlayingItem) {
        this.trimInPlace(updatedBufferingItem, bufferingItem);
      }

      // Check if buffered to new Interstitial event boundary
      // (Live update publishes Interstitial with new segment)
      this.checkBuffer();
    }
  };

  private updateItem<T extends InterstitialScheduleItem>(
    previousItem: T | null,
    time?: number,
  ): T | null {
    // find item in this.schedule.items;
    const items = this.schedule?.items;
    if (previousItem && items) {
      const index = this.findItemIndex(previousItem, time);
      return (items[index] as T | undefined) || null;
    }
    return null;
  }

  private trimInPlace(
    updatedItem: InterstitialScheduleItem | null,
    itemBeforeUpdate: InterstitialScheduleItem,
  ) {
    if (
      this.isInterstitial(updatedItem) &&
      updatedItem.event.appendInPlace &&
      itemBeforeUpdate.end - updatedItem.end > 0.25
    ) {
      updatedItem.event.assetList.forEach((asset, index) => {
        if (updatedItem.event.isAssetPastPlayoutLimit(index)) {
          this.clearAssetPlayer(asset.identifier, null);
        }
      });
      const flushStart = updatedItem.end + 0.25;
      const bufferInfo = BufferHelper.bufferInfo(
        this.primaryMedia,
        flushStart,
        0,
      );
      if (
        bufferInfo.end > flushStart ||
        (bufferInfo.nextStart || 0) > flushStart
      ) {
        this.log(
          `trim buffered interstitial ${segmentToString(updatedItem)} (was ${segmentToString(itemBeforeUpdate)})`,
        );
        const skipSeekToStartPosition = true;
        this.attachPrimary(flushStart, null, skipSeekToStartPosition);
        this.flushFrontBuffer(flushStart);
      }
    }
  }

  private itemsMatch(
    a: InterstitialScheduleItem,
    b: InterstitialScheduleItem | null | undefined,
  ): boolean {
    return (
      !!b &&
      (a === b ||
        (a.event && b.event && this.eventItemsMatch(a, b)) ||
        (!a.event &&
          !b.event &&
          this.findItemIndex(a) === this.findItemIndex(b)))
    );
  }

  private eventItemsMatch(
    a: InterstitialScheduleEventItem,
    b: InterstitialScheduleItem | null | undefined,
  ): boolean {
    return !!b && (a === b || a.event.identifier === b.event?.identifier);
  }

  private findItemIndex(
    item: InterstitialScheduleItem | null,
    time?: number,
  ): number {
    return item && this.schedule ? this.schedule.findItemIndex(item, time) : -1;
  }

  private updateSchedule(forceUpdate: boolean = false) {
    const mediaSelection = this.mediaSelection;
    if (!mediaSelection) {
      return;
    }
    this.schedule?.updateSchedule(mediaSelection, [], forceUpdate);
  }

  // Schedule buffer control
  private checkBuffer(starved?: boolean) {
    const items = this.schedule?.items;
    if (!items) {
      return;
    }
    // Find when combined forward buffer change reaches next schedule segment
    const bufferInfo = BufferHelper.bufferInfo(
      this.primaryMedia,
      this.timelinePos,
      0,
    );
    if (starved) {
      this.bufferedPos = this.timelinePos;
    }
    starved ||= bufferInfo.len < 1;
    this.updateBufferedPos(bufferInfo.end, items, starved);
  }

  private updateBufferedPos(
    bufferEnd: number,
    items: InterstitialScheduleItem[],
    bufferIsEmpty?: boolean,
  ) {
    const schedule = this.schedule;
    const bufferingItem = this.bufferingItem;
    if (this.bufferedPos > bufferEnd || !schedule) {
      return;
    }
    if (items.length === 1 && this.itemsMatch(items[0], bufferingItem)) {
      this.bufferedPos = bufferEnd;
      return;
    }
    const playingItem = this.playingItem;
    const playingIndex = this.findItemIndex(playingItem);
    let bufferEndIndex = schedule.findItemIndexAtTime(bufferEnd);

    if (this.bufferedPos < bufferEnd) {
      const bufferingIndex = this.findItemIndex(bufferingItem);
      const nextToBufferIndex = Math.min(bufferingIndex + 1, items.length - 1);
      const nextItemToBuffer = items[nextToBufferIndex];
      if (
        (bufferEndIndex === -1 &&
          bufferingItem &&
          bufferEnd >= bufferingItem.end) ||
        (nextItemToBuffer.event?.appendInPlace &&
          bufferEnd + 0.01 >= nextItemToBuffer.start)
      ) {
        bufferEndIndex = nextToBufferIndex;
      }
      if (this.isInterstitial(bufferingItem)) {
        const interstitial = bufferingItem.event;
        if (
          nextToBufferIndex - playingIndex > 1 &&
          interstitial.appendInPlace === false
        ) {
          // do not advance buffering item past Interstitial that requires source reset
          return;
        }
        if (
          interstitial.assetList.length === 0 &&
          interstitial.assetListLoader
        ) {
          // do not advance buffering item past Interstitial loading asset-list
          return;
        }
      }
      this.bufferedPos = bufferEnd;
      if (bufferEndIndex > bufferingIndex && bufferEndIndex > playingIndex) {
        this.bufferedToItem(nextItemToBuffer);
      } else {
        // allow more time than distance from edge for assets to load
        const details = this.primaryDetails;
        if (
          this.primaryLive &&
          details &&
          bufferEnd > details.edge - details.targetduration &&
          nextItemToBuffer.start <
            details.edge + this.hls.config.interstitialLiveLookAhead &&
          this.isInterstitial(nextItemToBuffer)
        ) {
          this.preloadAssets(nextItemToBuffer.event, 0);
        }
      }
    } else if (
      bufferIsEmpty &&
      playingItem &&
      !this.itemsMatch(playingItem, bufferingItem)
    ) {
      if (bufferEndIndex === playingIndex) {
        this.bufferedToItem(playingItem);
      } else if (bufferEndIndex === playingIndex + 1) {
        this.bufferedToItem(items[bufferEndIndex]);
      }
    }
  }

  private assetsBuffered(
    item: InterstitialScheduleEventItem,
    media: HTMLMediaElement | null,
  ): boolean {
    const assetList = item.event.assetList;
    if (assetList.length === 0) {
      return false;
    }
    return !item.event.assetList.some((asset) => {
      const player = this.getAssetPlayer(asset.identifier);
      return !player?.bufferedInPlaceToEnd(media);
    });
  }

  private setBufferingItem(
    item: InterstitialScheduleItem,
  ): InterstitialScheduleItem | null {
    const bufferingLast = this.bufferingItem;
    const schedule = this.schedule;

    if (!this.itemsMatch(item, bufferingLast) && schedule) {
      const { items, events } = schedule;
      if (!items || !events) {
        return bufferingLast;
      }
      const isInterstitial = this.isInterstitial(item);
      const bufferingPlayer = this.getBufferingPlayer();
      this.bufferingItem = item;
      this.bufferedPos = Math.max(
        item.start,
        Math.min(item.end, this.timelinePos),
      );
      const timeRemaining = bufferingPlayer
        ? bufferingPlayer.remaining
        : bufferingLast
          ? bufferingLast.end - this.timelinePos
          : 0;
      this.log(
        `INTERSTITIALS_BUFFERED_TO_BOUNDARY ${segmentToString(item)}` +
          (bufferingLast ? ` (${timeRemaining.toFixed(2)} remaining)` : ''),
      );
      if (!this.playbackDisabled) {
        if (isInterstitial) {
          const bufferIndex = schedule.findAssetIndex(
            item.event,
            this.bufferedPos,
          );
          // primary fragment loading will exit early in base-stream-controller while `bufferingItem` is set to an Interstitial block
          item.event.assetList.forEach((asset, i) => {
            const player = this.getAssetPlayer(asset.identifier);
            if (player) {
              if (i === bufferIndex) {
                player.loadSource();
              }
              player.resumeBuffering();
            }
          });
        } else {
          this.hls.resumeBuffering();
          this.playerQueue.forEach((player) => player.pauseBuffering());
        }
      }
      this.hls.trigger(Events.INTERSTITIALS_BUFFERED_TO_BOUNDARY, {
        events: events.slice(0),
        schedule: items.slice(0),
        bufferingIndex: this.findItemIndex(item),
        playingIndex: this.findItemIndex(this.playingItem),
      });
    } else if (this.bufferingItem !== item) {
      this.bufferingItem = item;
    }
    return bufferingLast;
  }

  private bufferedToItem(
    item: InterstitialScheduleItem,
    assetListIndex: number = 0,
  ) {
    const bufferingLast = this.setBufferingItem(item);
    if (this.playbackDisabled) {
      return;
    }
    if (this.isInterstitial(item)) {
      // Ensure asset list is loaded
      this.bufferedToEvent(item, assetListIndex);
    } else if (bufferingLast !== null) {
      // If primary player is detached, it is also stopped, restart loading at primary position
      this.bufferingAsset = null;
      const detachedData = this.detachedData;
      if (detachedData) {
        if (detachedData.mediaSource) {
          const skipSeekToStartPosition = true;
          this.attachPrimary(item.start, item, skipSeekToStartPosition);
        } else {
          this.preloadPrimary(item);
        }
      } else {
        // If not detached seek to resumption point
        this.preloadPrimary(item);
      }
    }
  }

  private preloadPrimary(item: InterstitialSchedulePrimaryItem) {
    const index = this.findItemIndex(item);
    const timelinePos = this.getPrimaryResumption(item, index);
    this.startLoadingPrimaryAt(timelinePos);
  }

  private bufferedToEvent(
    item: InterstitialScheduleEventItem,
    assetListIndex: number,
  ) {
    const interstitial = item.event;
    const neverLoaded =
      interstitial.assetList.length === 0 && !interstitial.assetListLoader;
    const playOnce = interstitial.cue.once;
    if (neverLoaded || !playOnce) {
      // Buffered to Interstitial boundary
      const player = this.preloadAssets(interstitial, assetListIndex);
      if (player?.interstitial.appendInPlace) {
        const media = this.primaryMedia;
        if (media) {
          this.bufferAssetPlayer(player, media);
        }
      }
    }
  }

  private preloadAssets(
    interstitial: InterstitialEvent,
    assetListIndex: number,
  ): HlsAssetPlayer | null {
    const uri = interstitial.assetUrl;
    const assetListLength = interstitial.assetList.length;
    const neverLoaded = assetListLength === 0 && !interstitial.assetListLoader;
    const playOnce = interstitial.cue.once;
    if (neverLoaded) {
      const timelineStart = interstitial.timelineStart;
      if (interstitial.appendInPlace) {
        const playingItem = this.playingItem;
        if (
          !this.isInterstitial(playingItem) &&
          playingItem?.nextEvent?.identifier === interstitial.identifier
        ) {
          this.flushFrontBuffer(timelineStart + 0.25);
        }
      }
      let hlsStartOffset;
      let liveStartPosition = 0;
      if (!this.playingItem && this.primaryLive) {
        liveStartPosition = this.hls.startPosition;
        if (liveStartPosition === -1) {
          liveStartPosition = this.hls.liveSyncPosition || 0;
        }
      }
      if (
        liveStartPosition &&
        !(interstitial.cue.pre || interstitial.cue.post)
      ) {
        const startOffset = liveStartPosition - timelineStart;
        if (startOffset > 0) {
          hlsStartOffset = Math.round(startOffset * 1000) / 1000;
        }
      }
      this.log(
        `Load interstitial asset ${assetListIndex + 1}/${uri ? 1 : assetListLength} ${interstitial}${
          hlsStartOffset
            ? ` live-start: ${liveStartPosition} start-offset: ${hlsStartOffset}`
            : ''
        }`,
      );
      if (uri) {
        return this.createAsset(
          interstitial,
          0,
          0,
          timelineStart,
          interstitial.duration,
          uri,
        );
      }
      const assetListLoader = this.assetListLoader.loadAssetList(
        interstitial as InterstitialEventWithAssetList,
        hlsStartOffset,
      );
      if (assetListLoader) {
        interstitial.assetListLoader = assetListLoader;
      }
    } else if (!playOnce && assetListLength) {
      // Re-buffered to Interstitial boundary, re-create asset player(s)
      for (let i = assetListIndex; i < assetListLength; i++) {
        const asset = interstitial.assetList[i];
        const playerIndex = this.getAssetPlayerQueueIndex(asset.identifier);
        if (
          (playerIndex === -1 || this.playerQueue[playerIndex].destroyed) &&
          !asset.error
        ) {
          this.createAssetPlayer(interstitial, asset, i);
        }
      }
      const asset = interstitial.assetList[assetListIndex];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (asset) {
        const player = this.getAssetPlayer(asset.identifier);
        if (player) {
          player.loadSource();
        }
        return player;
      }
    }
    return null;
  }

  private flushFrontBuffer(startOffset: number) {
    // Force queued flushing of all buffers
    const requiredTracks = this.requiredTracks;
    if (!requiredTracks) {
      return;
    }
    this.log(`Removing front buffer starting at ${startOffset}`);
    const sourceBufferNames = Object.keys(requiredTracks);
    sourceBufferNames.forEach((type: SourceBufferName) => {
      this.hls.trigger(Events.BUFFER_FLUSHING, {
        startOffset,
        endOffset: Infinity,
        type,
      });
    });
  }

  // Interstitial Asset Player control
  private getAssetPlayerQueueIndex(assetId: InterstitialAssetId): number {
    const playerQueue = this.playerQueue;
    for (let i = 0; i < playerQueue.length; i++) {
      if (assetId === playerQueue[i].assetId) {
        return i;
      }
    }
    return -1;
  }

  private getAssetPlayer(assetId: InterstitialAssetId): HlsAssetPlayer | null {
    const index = this.getAssetPlayerQueueIndex(assetId);
    return this.playerQueue[index] || null;
  }

  private getBufferingPlayer(): HlsAssetPlayer | null {
    const { playerQueue, primaryMedia } = this;
    if (primaryMedia) {
      for (let i = 0; i < playerQueue.length; i++) {
        if (playerQueue[i].media === primaryMedia) {
          return playerQueue[i];
        }
      }
    }
    return null;
  }

  private createAsset(
    interstitial: InterstitialEvent,
    assetListIndex: number,
    startOffset: number,
    timelineStart: number,
    duration: number,
    uri: string,
  ): HlsAssetPlayer {
    const assetItem: InterstitialAssetItem = {
      parentIdentifier: interstitial.identifier,
      identifier: generateAssetIdentifier(interstitial, uri, assetListIndex),
      duration,
      startOffset,
      timelineStart,
      uri,
    };
    return this.createAssetPlayer(interstitial, assetItem, assetListIndex);
  }

  private createAssetPlayer(
    interstitial: InterstitialEvent,
    assetItem: InterstitialAssetItem,
    assetListIndex: number,
  ): HlsAssetPlayer {
    const primary = this.hls;
    const userConfig = primary.userConfig;
    let videoPreference = userConfig.videoPreference;
    const currentLevel =
      primary.loadLevelObj || primary.levels[primary.currentLevel];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (videoPreference || currentLevel) {
      videoPreference = Object.assign({}, videoPreference);
      if (currentLevel.videoCodec) {
        videoPreference.videoCodec = currentLevel.videoCodec;
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (currentLevel.videoRange) {
        videoPreference.allowedVideoRanges = [currentLevel.videoRange];
      }
    }
    const selectedAudio = primary.audioTracks[primary.audioTrack];
    const selectedSubtitle = primary.subtitleTracks[primary.subtitleTrack];
    let startPosition = 0;
    if (this.primaryLive || interstitial.appendInPlace) {
      const timePastStart = this.timelinePos - assetItem.timelineStart;
      if (timePastStart > 1) {
        const duration = assetItem.duration;
        if (duration && timePastStart < duration) {
          startPosition = timePastStart;
        }
      }
    }
    const assetId = assetItem.identifier;
    const playerConfig: HlsAssetPlayerConfig = {
      ...userConfig,
      maxMaxBufferLength: Math.min(180, primary.config.maxMaxBufferLength),
      autoStartLoad: true,
      startFragPrefetch: true,
      primarySessionId: primary.sessionId,
      assetPlayerId: assetId,
      abrEwmaDefaultEstimate: primary.bandwidthEstimate,
      interstitialsController: undefined,
      startPosition,
      liveDurationInfinity: false,
      testBandwidth: false,
      videoPreference,
      audioPreference:
        (selectedAudio as MediaPlaylist | undefined) ||
        userConfig.audioPreference,
      subtitlePreference:
        (selectedSubtitle as MediaPlaylist | undefined) ||
        userConfig.subtitlePreference,
    };
    // TODO: limit maxMaxBufferLength in asset players to prevent QEE
    if (interstitial.appendInPlace) {
      interstitial.appendInPlaceStarted = true;
      if (assetItem.timelineStart) {
        playerConfig.timelineOffset = assetItem.timelineStart;
      }
    }
    const cmcd = playerConfig.cmcd;
    if (cmcd?.sessionId && cmcd.contentId) {
      playerConfig.cmcd = Object.assign({}, cmcd, {
        contentId: hash(assetItem.uri),
      });
    }
    if (this.getAssetPlayer(assetId)) {
      this.warn(
        `Duplicate date range identifier ${interstitial} and asset ${assetId}`,
      );
    }
    const player = new HlsAssetPlayer(
      this.HlsPlayerClass,
      playerConfig,
      interstitial,
      assetItem,
    );
    this.playerQueue.push(player);
    interstitial.assetList[assetListIndex] = assetItem;
    // Listen for LevelDetails and PTS change to update duration
    let initialDuration = true;
    const updateAssetPlayerDetails = (details: LevelDetails) => {
      if (details.live) {
        const error = new Error(
          `Interstitials MUST be VOD assets ${interstitial}`,
        );
        const errorData: ErrorData = {
          fatal: true,
          type: ErrorTypes.OTHER_ERROR,
          details: ErrorDetails.INTERSTITIAL_ASSET_ITEM_ERROR,
          error,
        };
        const scheduleIndex =
          this.schedule?.findEventIndex(interstitial.identifier) || -1;
        this.handleAssetItemError(
          errorData,
          interstitial,
          scheduleIndex,
          assetListIndex,
          error.message,
        );
        return;
      }
      // Get time at end of last fragment
      const duration = details.edge - details.fragmentStart;
      const currentAssetDuration = assetItem.duration;
      if (
        initialDuration ||
        currentAssetDuration === null ||
        duration > currentAssetDuration
      ) {
        initialDuration = false;
        this.log(
          `Interstitial asset "${assetId}" duration change ${currentAssetDuration} > ${duration}`,
        );
        assetItem.duration = duration;
        // Update schedule with new event and asset duration
        this.updateSchedule();
      }
    };
    player.on(Events.LEVEL_UPDATED, (event, { details }) =>
      updateAssetPlayerDetails(details),
    );
    player.on(Events.LEVEL_PTS_UPDATED, (event, { details }) =>
      updateAssetPlayerDetails(details),
    );
    player.on(Events.EVENT_CUE_ENTER, () => this.onInterstitialCueEnter());
    const onBufferCodecs = (
      event: Events.BUFFER_CODECS,
      data: BufferCodecsData,
    ) => {
      const inQueuPlayer = this.getAssetPlayer(assetId);
      if (inQueuPlayer && data.tracks) {
        inQueuPlayer.off(Events.BUFFER_CODECS, onBufferCodecs);
        inQueuPlayer.tracks = data.tracks;
        const media = this.primaryMedia;
        if (
          this.bufferingAsset === inQueuPlayer.assetItem &&
          media &&
          !inQueuPlayer.media
        ) {
          this.bufferAssetPlayer(inQueuPlayer, media);
        }
      }
    };
    player.on(Events.BUFFER_CODECS, onBufferCodecs);
    const bufferedToEnd = () => {
      const inQueuPlayer = this.getAssetPlayer(assetId);
      this.log(`buffered to end of asset ${inQueuPlayer}`);
      if (!inQueuPlayer || !this.schedule) {
        return;
      }
      // Preload at end of asset
      const scheduleIndex = this.schedule.findEventIndex(
        interstitial.identifier,
      );
      const item = this.schedule.items?.[scheduleIndex];
      if (this.isInterstitial(item)) {
        this.advanceAssetBuffering(item, assetItem);
      }
    };
    player.on(Events.BUFFERED_TO_END, bufferedToEnd);
    const endedWithAssetIndex = (assetIndex) => {
      return () => {
        const inQueuPlayer = this.getAssetPlayer(assetId);
        if (!inQueuPlayer || !this.schedule) {
          return;
        }
        this.shouldPlay = true;
        const scheduleIndex = this.schedule.findEventIndex(
          interstitial.identifier,
        );
        this.advanceAfterAssetEnded(interstitial, scheduleIndex, assetIndex);
      };
    };
    player.once(Events.MEDIA_ENDED, endedWithAssetIndex(assetListIndex));
    player.once(Events.PLAYOUT_LIMIT_REACHED, endedWithAssetIndex(Infinity));
    player.on(Events.ERROR, (event: Events.ERROR, data: ErrorData) => {
      if (!this.schedule) {
        return;
      }
      const inQueuPlayer = this.getAssetPlayer(assetId);
      if (data.details === ErrorDetails.BUFFER_STALLED_ERROR) {
        if (inQueuPlayer?.appendInPlace) {
          this.handleInPlaceStall(interstitial);
          return;
        }
        this.onTimeupdate();
        this.checkBuffer(true);
        return;
      }
      this.handleAssetItemError(
        data,
        interstitial,
        this.schedule.findEventIndex(interstitial.identifier),
        assetListIndex,
        `Asset player error ${data.error} ${interstitial}`,
      );
    });
    player.on(Events.DESTROYING, () => {
      const inQueuPlayer = this.getAssetPlayer(assetId);
      if (!inQueuPlayer || !this.schedule) {
        return;
      }
      const error = new Error(`Asset player destroyed unexpectedly ${assetId}`);
      const errorData: ErrorData = {
        fatal: true,
        type: ErrorTypes.OTHER_ERROR,
        details: ErrorDetails.INTERSTITIAL_ASSET_ITEM_ERROR,
        error,
      };
      this.handleAssetItemError(
        errorData,
        interstitial,
        this.schedule.findEventIndex(interstitial.identifier),
        assetListIndex,
        error.message,
      );
    });
    this.log(
      `INTERSTITIAL_ASSET_PLAYER_CREATED ${eventAssetToString(assetItem)}`,
    );
    this.hls.trigger(Events.INTERSTITIAL_ASSET_PLAYER_CREATED, {
      asset: assetItem,
      assetListIndex,
      event: interstitial,
      player,
    });
    return player;
  }

  private clearInterstitial(
    interstitial: InterstitialEvent,
    toSegment: InterstitialScheduleItem | null,
  ) {
    interstitial.assetList.forEach((asset) => {
      this.clearAssetPlayer(asset.identifier, toSegment);
    });
    // Remove asset list and resolved duration
    interstitial.reset();
  }

  private resetAssetPlayer(assetId: InterstitialAssetId) {
    // Reset asset player so that it's timeline can be adjusted without reloading the MVP
    const playerIndex = this.getAssetPlayerQueueIndex(assetId);
    if (playerIndex !== -1) {
      this.log(`reset asset player "${assetId}" after error`);
      const player = this.playerQueue[playerIndex];
      this.transferMediaFromPlayer(player, null);
      player.resetDetails();
    }
  }

  private clearAssetPlayer(
    assetId: InterstitialAssetId,
    toSegment: InterstitialScheduleItem | null,
  ) {
    const playerIndex = this.getAssetPlayerQueueIndex(assetId);
    if (playerIndex !== -1) {
      const player = this.playerQueue[playerIndex];
      this.log(
        `clear ${player} toSegment: ${toSegment ? segmentToString(toSegment) : toSegment}`,
      );
      this.transferMediaFromPlayer(player, toSegment);
      this.playerQueue.splice(playerIndex, 1);
      player.destroy();
    }
  }

  private emptyPlayerQueue() {
    let player: HlsAssetPlayer | undefined;
    while ((player = this.playerQueue.pop())) {
      player.destroy();
    }
    this.playerQueue = [];
  }

  private startAssetPlayer(
    player: HlsAssetPlayer,
    assetListIndex: number,
    scheduleItems: InterstitialScheduleItem[],
    scheduleIndex: number,
    media: HTMLMediaElement,
  ) {
    const { interstitial, assetItem, assetId } = player;
    const assetListLength = interstitial.assetList.length;

    const playingAsset = this.playingAsset;
    this.endedAsset = null;
    this.playingAsset = assetItem;
    if (!playingAsset || playingAsset.identifier !== assetId) {
      if (playingAsset) {
        // Exiting another Interstitial asset
        this.clearAssetPlayer(
          playingAsset.identifier,
          scheduleItems[scheduleIndex],
        );
        delete playingAsset.error;
      }
      this.log(
        `INTERSTITIAL_ASSET_STARTED ${assetListIndex + 1}/${assetListLength} ${eventAssetToString(assetItem)}`,
      );
      this.hls.trigger(Events.INTERSTITIAL_ASSET_STARTED, {
        asset: assetItem,
        assetListIndex,
        event: interstitial,
        schedule: scheduleItems.slice(0),
        scheduleIndex,
        player,
      });
    }

    // detach media and attach to interstitial player if it does not have another element attached
    this.bufferAssetPlayer(player, media);
  }

  private bufferAssetPlayer(player: HlsAssetPlayer, media: HTMLMediaElement) {
    if (!this.schedule) {
      return;
    }
    const { interstitial, assetItem } = player;
    const scheduleIndex = this.schedule.findEventIndex(interstitial.identifier);
    const item = this.schedule.items?.[scheduleIndex];
    if (!item) {
      return;
    }
    player.loadSource();
    this.setBufferingItem(item);
    this.bufferingAsset = assetItem;
    const bufferingPlayer = this.getBufferingPlayer();
    if (bufferingPlayer === player) {
      return;
    }
    const appendInPlaceNext = interstitial.appendInPlace;
    if (
      appendInPlaceNext &&
      bufferingPlayer?.interstitial.appendInPlace === false
    ) {
      // Media is detached and not available to append in place
      return;
    }
    const activeTracks =
      bufferingPlayer?.tracks ||
      this.detachedData?.tracks ||
      this.requiredTracks;
    if (appendInPlaceNext && assetItem !== this.playingAsset) {
      // Do not buffer another item if tracks are unknown or incompatible
      if (!player.tracks) {
        this.log(`Waiting for track info before buffering ${player}`);
        return;
      }
      if (
        activeTracks &&
        !isCompatibleTrackChange(activeTracks, player.tracks)
      ) {
        const error = new Error(
          `Asset ${eventAssetToString(assetItem)} SourceBuffer tracks ('${Object.keys(player.tracks)}') are not compatible with primary content tracks ('${Object.keys(activeTracks)}')`,
        );
        const errorData: ErrorData = {
          fatal: true,
          type: ErrorTypes.OTHER_ERROR,
          details: ErrorDetails.INTERSTITIAL_ASSET_ITEM_ERROR,
          error,
        };
        const assetListIndex = interstitial.findAssetIndex(assetItem);
        this.handleAssetItemError(
          errorData,
          interstitial,
          scheduleIndex,
          assetListIndex,
          error.message,
        );
        return;
      }
    }

    this.transferMediaTo(player, media);
  }

  private handleInPlaceStall(interstitial: InterstitialEvent) {
    const schedule = this.schedule;
    const media = this.primaryMedia;
    if (!schedule || !media) {
      return;
    }
    const currentTime = media.currentTime;
    const foundAssetIndex = schedule.findAssetIndex(interstitial, currentTime);
    const stallingAsset = interstitial.assetList[foundAssetIndex] as
      | InterstitialAssetItem
      | undefined;
    if (stallingAsset) {
      const player = this.getAssetPlayer(stallingAsset.identifier);
      if (player) {
        const assetCurrentTime =
          player.currentTime || currentTime - stallingAsset.timelineStart;
        const distanceFromEnd = player.duration - assetCurrentTime;
        this.warn(
          `Stalled at ${assetCurrentTime} of ${assetCurrentTime + distanceFromEnd} in ${player} ${interstitial} (media.currentTime: ${currentTime})`,
        );
        if (
          assetCurrentTime &&
          (distanceFromEnd / media.playbackRate < 0.5 ||
            player.bufferedInPlaceToEnd(media)) &&
          player.hls
        ) {
          const scheduleIndex = schedule.findEventIndex(
            interstitial.identifier,
          );
          this.advanceAfterAssetEnded(
            interstitial,
            scheduleIndex,
            foundAssetIndex,
          );
        }
      }
    }
  }

  private advanceInPlace(time: number) {
    const media = this.primaryMedia;
    if (media && media.currentTime < time) {
      media.currentTime = time;
    }
  }

  private handleAssetItemError(
    data: ErrorData,
    interstitial: InterstitialEvent,
    scheduleIndex: number,
    assetListIndex: number,
    errorMessage: string,
  ) {
    if (data.details === ErrorDetails.BUFFER_STALLED_ERROR) {
      return;
    }
    const assetItem = (interstitial.assetList[assetListIndex] ||
      null) as InterstitialAssetItem | null;
    this.warn(
      `INTERSTITIAL_ASSET_ERROR ${assetItem ? eventAssetToString(assetItem) : assetItem} ${data.error}`,
    );
    if (!this.schedule) {
      return;
    }
    const assetId = assetItem?.identifier || '';
    const playerIndex = this.getAssetPlayerQueueIndex(assetId);
    const player = this.playerQueue[playerIndex] || null;
    const items = this.schedule.items;
    const interstitialAssetError = Object.assign({}, data, {
      fatal: false,
      errorAction: createDoNothingErrorAction(true),
      asset: assetItem,
      assetListIndex,
      event: interstitial,
      schedule: items,
      scheduleIndex,
      player,
    });
    this.hls.trigger(Events.INTERSTITIAL_ASSET_ERROR, interstitialAssetError);
    if (!data.fatal) {
      return;
    }

    const playingAsset = this.playingAsset;
    const bufferingAsset = this.bufferingAsset;
    const error = new Error(errorMessage);
    if (assetItem) {
      this.clearAssetPlayer(assetId, null);
      assetItem.error = error;
    }

    // If all assets in interstitial fail, mark the interstitial with an error
    if (!interstitial.assetList.some((asset) => !asset.error)) {
      interstitial.error = error;
    } else {
      // Reset level details and reload/parse media playlists to align with updated schedule
      for (let i = assetListIndex; i < interstitial.assetList.length; i++) {
        this.resetAssetPlayer(interstitial.assetList[i].identifier);
      }
    }
    this.updateSchedule(true);
    if (interstitial.error) {
      this.primaryFallback(interstitial);
    } else if (playingAsset && playingAsset.identifier === assetId) {
      this.advanceAfterAssetEnded(interstitial, scheduleIndex, assetListIndex);
    } else if (
      bufferingAsset &&
      bufferingAsset.identifier === assetId &&
      this.isInterstitial(this.bufferingItem)
    ) {
      this.advanceAssetBuffering(this.bufferingItem, bufferingAsset);
    }
  }

  private primaryFallback(interstitial: InterstitialEvent) {
    // Fallback to Primary by on current or future events by updating schedule to skip errored interstitials/assets
    const flushStart = interstitial.timelineStart;
    const playingItem = this.effectivePlayingItem;
    // Update schedule now that interstitial/assets are flagged with `error` for fallback
    if (playingItem) {
      this.log(
        `Fallback to primary from event "${interstitial.identifier}" start: ${
          flushStart
        } pos: ${this.timelinePos} playing: ${segmentToString(
          playingItem,
        )} error: ${interstitial.error}`,
      );
      let timelinePos = this.timelinePos;
      if (timelinePos === -1) {
        timelinePos = this.hls.startPosition;
      }
      const newPlayingItem = this.updateItem(playingItem, timelinePos);
      if (this.itemsMatch(playingItem, newPlayingItem)) {
        this.clearInterstitial(interstitial, null);
      }
      if (interstitial.appendInPlace) {
        this.attachPrimary(flushStart, null);
        this.flushFrontBuffer(flushStart);
      }
      if (!this.schedule) {
        return;
      }
      const scheduleIndex = this.schedule.findItemIndexAtTime(timelinePos);
      this.setSchedulePosition(scheduleIndex);
    } else {
      this.checkStart();
    }
  }

  // Asset List loading
  private onAssetListLoaded(
    event: Events.ASSET_LIST_LOADED,
    data: AssetListLoadedData,
  ) {
    const interstitial = data.event;
    const interstitialId = interstitial.identifier;
    const assets = data.assetListResponse.ASSETS;
    if (!this.schedule?.hasEvent(interstitialId)) {
      // Interstitial with id was removed
      return;
    }
    const eventStart = interstitial.timelineStart;
    const previousDuration = interstitial.duration;
    let sumDuration = 0;
    assets.forEach((asset, assetListIndex) => {
      const duration = parseFloat(asset.DURATION);
      this.createAsset(
        interstitial,
        assetListIndex,
        sumDuration,
        eventStart + sumDuration,
        duration,
        asset.URI,
      );
      sumDuration += duration;
    });
    interstitial.duration = sumDuration;
    this.log(
      `Loaded asset-list with duration: ${sumDuration} (was: ${previousDuration}) ${interstitial}`,
    );
    const waitingItem = this.waitingItem;
    const waitingForItem = waitingItem?.event.identifier === interstitialId;

    // Update schedule now that asset.DURATION(s) are parsed
    this.updateSchedule();

    const bufferingEvent = this.bufferingItem?.event;

    // If buffer reached Interstitial, start buffering first asset
    if (waitingForItem) {
      // Advance schedule when waiting for asset list data to play
      const scheduleIndex = this.schedule.findEventIndex(interstitialId);
      const item = this.schedule.items?.[scheduleIndex];
      if (item) {
        if (!this.playingItem && this.timelinePos > item.end) {
          // Abandon if new duration is reduced enough to land playback in primary start
          const index = this.schedule.findItemIndexAtTime(this.timelinePos);
          if (index !== scheduleIndex) {
            interstitial.error = new Error(
              `Interstitial no longer within playback range ${this.timelinePos} ${interstitial}`,
            );
            this.updateSchedule(true);
            this.primaryFallback(interstitial);
            return;
          }
        }
        this.setBufferingItem(item);
      }
      this.setSchedulePosition(scheduleIndex);
    } else if (bufferingEvent?.identifier === interstitialId) {
      const assetItem = interstitial.assetList[0];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (assetItem) {
        const player = this.getAssetPlayer(assetItem.identifier);
        if (bufferingEvent.appendInPlace) {
          // If buffering (but not playback) has reached this item transfer media-source
          const media = this.primaryMedia;
          if (player && media) {
            this.bufferAssetPlayer(player, media);
          }
        } else if (player) {
          player.loadSource();
        }
      }
    }
  }

  private onError(event: Events.ERROR, data: ErrorData) {
    if (!this.schedule) {
      return;
    }
    switch (data.details) {
      case ErrorDetails.ASSET_LIST_PARSING_ERROR:
      case ErrorDetails.ASSET_LIST_LOAD_ERROR:
      case ErrorDetails.ASSET_LIST_LOAD_TIMEOUT: {
        const interstitial = data.interstitial;
        if (interstitial) {
          this.updateSchedule(true);
          this.primaryFallback(interstitial);
        }
        break;
      }
      case ErrorDetails.BUFFER_STALLED_ERROR: {
        const stallingItem =
          this.endedItem || this.waitingItem || this.playingItem;
        if (
          this.isInterstitial(stallingItem) &&
          stallingItem.event.appendInPlace
        ) {
          this.handleInPlaceStall(stallingItem.event);
          return;
        }
        this.log(
          `Primary player stall @${this.timelinePos} bufferedPos: ${this.bufferedPos}`,
        );
        this.onTimeupdate();
        this.checkBuffer(true);
        break;
      }
    }
  }
}
