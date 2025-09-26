import { getId3Frames } from '@svta/common-media-library/id3/getId3Frames';
import { isId3TimestampFrame } from '@svta/common-media-library/id3/isId3TimestampFrame';
import { Events } from '../events';
import {
  isDateRangeCueAttribute,
  isSCTE35Attribute,
} from '../loader/date-range';
import { MetadataSchema } from '../types/demuxer';
import { hexToArrayBuffer } from '../utils/hex';
import { stringify } from '../utils/safe-json-stringify';
import {
  clearCurrentCues,
  removeCuesInRange,
  sendAddTrackEvent,
} from '../utils/texttrack-utils';
import type { MediaFragment } from '../hls';
import type Hls from '../hls';
import type { DateRange } from '../loader/date-range';
import type { LevelDetails } from '../loader/level-details';
import type { ComponentAPI } from '../types/component-api';
import type {
  BufferFlushingData,
  FragParsingMetadataData,
  LevelPTSUpdatedData,
  LevelUpdatedData,
  MediaAttachingData,
  MediaDetachingData,
} from '../types/events';

declare global {
  interface Window {
    WebKitDataCue: VTTCue | void;
  }
}

const MIN_CUE_DURATION = 0.25;

function getCueClass(): typeof VTTCue | typeof TextTrackCue | undefined {
  if (typeof self === 'undefined') return undefined;
  return (self.VTTCue as typeof VTTCue | undefined) || self.TextTrackCue;
}

function createCueWithDataFields(
  Cue: typeof VTTCue | typeof TextTrackCue,
  startTime: number,
  endTime: number,
  data: Object,
  type?: string,
): VTTCue | TextTrackCue | undefined {
  let cue = new Cue(startTime, endTime, '');
  try {
    (cue as any).value = data;
    if (type) {
      (cue as any).type = type;
    }
  } catch (e) {
    cue = new Cue(
      startTime,
      endTime,
      stringify(type ? { type, ...data } : data),
    );
  }
  return cue;
}

// VTTCue latest draft allows an infinite duration, fallback
// to MAX_VALUE if necessary
const MAX_CUE_ENDTIME = (() => {
  const Cue = getCueClass();
  try {
    Cue && new Cue(0, Number.POSITIVE_INFINITY, '');
  } catch (e) {
    return Number.MAX_VALUE;
  }
  return Number.POSITIVE_INFINITY;
})();

class ID3TrackController implements ComponentAPI {
  private hls: Hls | null;
  private id3Track: TextTrack | null = null;
  private media: HTMLMediaElement | null = null;
  private dateRangeCuesAppended: Record<
    string,
    | {
        cues: Record<string, VTTCue | TextTrackCue | undefined>;
        dateRange: DateRange;
        durationKnown: boolean;
      }
    | undefined
  > = {};
  private removeCues: boolean = true;
  private assetCue?: VTTCue | TextTrackCue;

  constructor(hls) {
    this.hls = hls;
    this._registerListeners();
  }

  public destroy() {
    this._unregisterListeners();
    this.id3Track = null;
    this.media = null;
    this.dateRangeCuesAppended = {};
    // @ts-ignore
    this.hls = this.onEventCueEnter = null;
  }

  private _registerListeners() {
    const { hls } = this;
    if (hls) {
      hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
      hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
      hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
      hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
      hls.on(Events.FRAG_PARSING_METADATA, this.onFragParsingMetadata, this);
      hls.on(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
      hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
      hls.on(Events.LEVEL_PTS_UPDATED, this.onLevelPtsUpdated, this);
    }
  }

  private _unregisterListeners() {
    const { hls } = this;
    if (hls) {
      hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
      hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
      hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
      hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
      hls.off(Events.FRAG_PARSING_METADATA, this.onFragParsingMetadata, this);
      hls.off(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
      hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
      hls.off(Events.LEVEL_PTS_UPDATED, this.onLevelPtsUpdated, this);
    }
  }

  private onEventCueEnter = () => {
    if (!this.hls) {
      return;
    }
    this.hls.trigger(Events.EVENT_CUE_ENTER, {});
  };

  // Add ID3 metatadata text track.
  private onMediaAttaching(
    event: Events.MEDIA_ATTACHING,
    data: MediaAttachingData,
  ): void {
    this.media = data.media;
    if (data.overrides?.cueRemoval === false) {
      this.removeCues = false;
    }
  }

  private onMediaAttached() {
    const details = this.hls?.latestLevelDetails;
    if (details) {
      this.updateDateRangeCues(details);
    }
  }

  private onMediaDetaching(
    event: Events.MEDIA_DETACHING,
    data: MediaDetachingData,
  ) {
    this.media = null;
    const transferringMedia = !!data.transferMedia;
    if (transferringMedia) {
      return;
    }
    if (this.id3Track) {
      if (this.removeCues) {
        clearCurrentCues(this.id3Track, this.onEventCueEnter);
      }
      this.id3Track = null;
    }
    this.dateRangeCuesAppended = {};
  }

  private onManifestLoading() {
    this.dateRangeCuesAppended = {};
  }

  private createTrack(media: HTMLMediaElement): TextTrack {
    const track = this.getID3Track(media.textTracks) as TextTrack;
    track.mode = 'hidden';
    return track;
  }

  private getID3Track(textTracks: TextTrackList): TextTrack | void {
    if (!this.media) {
      return;
    }
    for (let i = 0; i < textTracks.length; i++) {
      const textTrack: TextTrack = textTracks[i];
      if (textTrack.kind === 'metadata' && textTrack.label === 'id3') {
        // send 'addtrack' when reusing the textTrack for metadata,
        // same as what we do for captions
        sendAddTrackEvent(textTrack, this.media);

        return textTrack;
      }
    }
    return this.media.addTextTrack('metadata', 'id3');
  }

  private onFragParsingMetadata(
    event: Events.FRAG_PARSING_METADATA,
    data: FragParsingMetadataData,
  ) {
    if (!this.media || !this.hls) {
      return;
    }

    const { enableEmsgMetadataCues, enableID3MetadataCues } = this.hls.config;
    if (!enableEmsgMetadataCues && !enableID3MetadataCues) {
      return;
    }

    const { samples } = data;

    // create track dynamically
    if (!this.id3Track) {
      this.id3Track = this.createTrack(this.media);
    }

    const Cue = getCueClass();
    if (!Cue) {
      return;
    }

    for (let i = 0; i < samples.length; i++) {
      const type = samples[i].type;
      if (
        (type === MetadataSchema.emsg && !enableEmsgMetadataCues) ||
        !enableID3MetadataCues
      ) {
        continue;
      }

      const frames = getId3Frames(samples[i].data);
      const startTime = samples[i].pts;
      let endTime: number = startTime + samples[i].duration;

      if (endTime > MAX_CUE_ENDTIME) {
        endTime = MAX_CUE_ENDTIME;
      }

      const timeDiff = endTime - startTime;
      if (timeDiff <= 0) {
        endTime = startTime + MIN_CUE_DURATION;
      }

      for (let j = 0; j < frames.length; j++) {
        const frame = frames[j];
        // Safari doesn't put the timestamp frame in the TextTrack
        if (!isId3TimestampFrame(frame)) {
          // add a bounds to any unbounded cues
          this.updateId3CueEnds(startTime, type);
          const cue = createCueWithDataFields(
            Cue,
            startTime,
            endTime,
            frame,
            type,
          );
          if (cue) {
            this.id3Track.addCue(cue);
          }
        }
      }
    }
  }

  private updateId3CueEnds(startTime: number, type: MetadataSchema) {
    const cues = this.id3Track?.cues;
    if (cues) {
      for (let i = cues.length; i--; ) {
        const cue = cues[i] as any;
        if (
          cue.type === type &&
          cue.startTime < startTime &&
          cue.endTime === MAX_CUE_ENDTIME
        ) {
          cue.endTime = startTime;
        }
      }
    }
  }

  private onBufferFlushing(
    event: Events.BUFFER_FLUSHING,
    { startOffset, endOffset, type }: BufferFlushingData,
  ) {
    const { id3Track, hls } = this;
    if (!hls) {
      return;
    }

    const {
      config: { enableEmsgMetadataCues, enableID3MetadataCues },
    } = hls;
    if (id3Track && (enableEmsgMetadataCues || enableID3MetadataCues)) {
      let predicate;

      if (type === 'audio') {
        predicate = (cue) =>
          (cue as any).type === MetadataSchema.audioId3 &&
          enableID3MetadataCues;
      } else if (type === 'video') {
        predicate = (cue) =>
          (cue as any).type === MetadataSchema.emsg && enableEmsgMetadataCues;
      } else {
        predicate = (cue) =>
          ((cue as any).type === MetadataSchema.audioId3 &&
            enableID3MetadataCues) ||
          ((cue as any).type === MetadataSchema.emsg && enableEmsgMetadataCues);
      }
      removeCuesInRange(id3Track, startOffset, endOffset, predicate);
    }
  }

  private onLevelUpdated(
    event: Events.LEVEL_UPDATED,
    { details }: LevelUpdatedData,
  ) {
    this.updateDateRangeCues(details, true);
  }

  private onLevelPtsUpdated(
    event: Events.LEVEL_PTS_UPDATED,
    data: LevelPTSUpdatedData,
  ) {
    if (Math.abs(data.drift) > 0.01) {
      this.updateDateRangeCues(data.details);
    }
  }

  private updateDateRangeCues(details: LevelDetails, removeOldCues?: true) {
    if (!this.hls || !this.media) {
      return;
    }
    const {
      assetPlayerId,
      timelineOffset,
      enableDateRangeMetadataCues,
      interstitialsController,
    } = this.hls.config;
    if (!enableDateRangeMetadataCues) {
      return;
    }

    const Cue = getCueClass();
    if (
      __USE_INTERSTITIALS__ &&
      assetPlayerId &&
      timelineOffset &&
      !interstitialsController
    ) {
      const { fragmentStart, fragmentEnd } = details;
      let cue = this.assetCue;
      if (cue) {
        cue.startTime = fragmentStart;
        cue.endTime = fragmentEnd;
      } else if (Cue) {
        cue = this.assetCue = createCueWithDataFields(
          Cue,
          fragmentStart,
          fragmentEnd,
          { assetPlayerId: this.hls.config.assetPlayerId },
          'hlsjs.interstitial.asset',
        );
        if (cue) {
          cue.id = assetPlayerId;
          this.id3Track ||= this.createTrack(this.media);
          this.id3Track.addCue(cue);
          cue.addEventListener('enter', this.onEventCueEnter);
        }
      }
    }

    if (!details.hasProgramDateTime) {
      return;
    }
    const { id3Track } = this;
    const { dateRanges } = details;
    const ids = Object.keys(dateRanges);
    let dateRangeCuesAppended = this.dateRangeCuesAppended;
    // Remove cues from track not found in details.dateRanges
    if (id3Track && removeOldCues) {
      if (id3Track.cues?.length) {
        const idsToRemove = Object.keys(dateRangeCuesAppended).filter(
          (id) => !ids.includes(id),
        );
        for (let i = idsToRemove.length; i--; ) {
          const id = idsToRemove[i];
          const cues = dateRangeCuesAppended[id]?.cues;
          delete dateRangeCuesAppended[id];
          if (cues) {
            Object.keys(cues).forEach((key) => {
              const cue = cues[key];
              if (cue) {
                cue.removeEventListener('enter', this.onEventCueEnter);
                try {
                  id3Track.removeCue(cue);
                } catch (e) {
                  /* no-op */
                }
              }
            });
          }
        }
      } else {
        dateRangeCuesAppended = this.dateRangeCuesAppended = {};
      }
    }
    // Exit if the playlist does not have Date Ranges or does not have Program Date Time
    const lastFragment = details.fragments[details.fragments.length - 1] as
      | MediaFragment
      | undefined;
    if (ids.length === 0 || !Number.isFinite(lastFragment?.programDateTime)) {
      return;
    }

    this.id3Track ||= this.createTrack(this.media);

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const dateRange = dateRanges[id]!;
      const startTime = dateRange.startTime;

      // Process DateRanges to determine end-time (known DURATION, END-DATE, or END-ON-NEXT)
      const appendedDateRangeCues = dateRangeCuesAppended[id];
      const cues = appendedDateRangeCues?.cues || {};
      let durationKnown = appendedDateRangeCues?.durationKnown || false;
      let endTime = MAX_CUE_ENDTIME;
      const { duration, endDate } = dateRange;
      if (endDate && duration !== null) {
        endTime = startTime + duration;
        durationKnown = true;
      } else if (dateRange.endOnNext && !durationKnown) {
        const nextDateRangeWithSameClass = ids.reduce(
          (candidateDateRange: DateRange | null, id) => {
            if (id !== dateRange.id) {
              const otherDateRange = dateRanges[id]!;
              if (
                otherDateRange.class === dateRange.class &&
                otherDateRange.startDate > dateRange.startDate &&
                (!candidateDateRange ||
                  dateRange.startDate < candidateDateRange.startDate)
              ) {
                return otherDateRange;
              }
            }
            return candidateDateRange;
          },
          null,
        );
        if (nextDateRangeWithSameClass) {
          endTime = nextDateRangeWithSameClass.startTime;
          durationKnown = true;
        }
      }

      // Create TextTrack Cues for each MetadataGroup Item (select DateRange attribute)
      // This is to emulate Safari HLS playback handling of DateRange tags
      const attributes = Object.keys(dateRange.attr);
      for (let j = 0; j < attributes.length; j++) {
        const key = attributes[j];
        if (!isDateRangeCueAttribute(key)) {
          continue;
        }
        const cue = cues[key];
        if (cue) {
          if (durationKnown && !appendedDateRangeCues?.durationKnown) {
            cue.endTime = endTime;
          } else if (Math.abs(cue.startTime - startTime) > 0.01) {
            cue.startTime = startTime;
            cue.endTime = endTime;
          }
        } else if (Cue) {
          let data = dateRange.attr[key];
          if (isSCTE35Attribute(key)) {
            data = hexToArrayBuffer(data);
          }
          const payload: any = { key, data };
          const cue = createCueWithDataFields(
            Cue,
            startTime,
            endTime,
            payload,
            MetadataSchema.dateRange,
          );
          if (cue) {
            cue.id = id;
            this.id3Track.addCue(cue);
            cues[key] = cue;
            if (__USE_INTERSTITIALS__ && interstitialsController) {
              if (key === 'X-ASSET-LIST' || key === 'X-ASSET-URL') {
                cue.addEventListener('enter', this.onEventCueEnter);
              }
            }
          }
        }
      }

      // Keep track of processed DateRanges by ID for updating cues with new DateRange tag attributes
      dateRangeCuesAppended[id] = {
        cues,
        dateRange,
        durationKnown,
      };
    }
  }
}

export default ID3TrackController;
