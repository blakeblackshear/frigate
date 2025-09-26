import { findFragmentByPTS } from './fragment-finders';
import {
  ALIGNED_END_THRESHOLD_SECONDS,
  type BaseData,
  InterstitialEvent,
  type InterstitialId,
  TimelineOccupancy,
} from '../loader/interstitial-event';
import { Logger } from '../utils/logger';
import type { DateRange } from '../loader/date-range';
import type { MediaSelection } from '../types/media-playlist';
import type { ILogger } from '../utils/logger';

const ABUTTING_THRESHOLD_SECONDS = 0.033;

export type InterstitialScheduleEventItem = {
  event: InterstitialEvent;
  start: number;
  end: number;
  playout: {
    start: number;
    end: number;
  };
  integrated: {
    start: number;
    end: number;
  };
};

export type InterstitialSchedulePrimaryItem = {
  nextEvent: InterstitialEvent | null;
  previousEvent: InterstitialEvent | null;
  event?: undefined;
  start: number;
  end: number;
  playout: {
    start: number;
    end: number;
  };
  integrated: {
    start: number;
    end: number;
  };
};

export type InterstitialScheduleItem =
  | InterstitialScheduleEventItem
  | InterstitialSchedulePrimaryItem;

export type InterstitialScheduleDurations = {
  primary: number;
  playout: number;
  integrated: number;
};

export type TimelineType = 'primary' | 'playout' | 'integrated';

type ScheduleUpdateCallback = (
  removed: InterstitialEvent[],
  previousItems: InterstitialScheduleItem[] | null,
) => void;

export class InterstitialsSchedule extends Logger {
  private onScheduleUpdate: ScheduleUpdateCallback;
  private eventMap: Record<string, InterstitialEvent | undefined> = {};
  public events: InterstitialEvent[] | null = null;
  public items: InterstitialScheduleItem[] | null = null;
  public durations: InterstitialScheduleDurations = {
    primary: 0,
    playout: 0,
    integrated: 0,
  };

  constructor(onScheduleUpdate: ScheduleUpdateCallback, logger: ILogger) {
    super('interstitials-sched', logger);
    this.onScheduleUpdate = onScheduleUpdate;
  }

  public destroy() {
    this.reset();
    // @ts-ignore
    this.onScheduleUpdate = null;
  }

  public reset() {
    this.eventMap = {};
    this.setDurations(0, 0, 0);
    if (this.events) {
      this.events.forEach((interstitial) => interstitial.reset());
    }
    this.events = this.items = null;
  }

  public resetErrorsInRange(start: number, end: number): number {
    if (this.events) {
      return this.events.reduce((count, interstitial) => {
        if (
          start <= interstitial.startOffset &&
          end > interstitial.startOffset
        ) {
          delete interstitial.error;
          return count + 1;
        }
        return count;
      }, 0);
    }
    return 0;
  }

  get duration(): number {
    const items = this.items;
    return items ? items[items.length - 1].end : 0;
  }

  get length(): number {
    return this.items ? this.items.length : 0;
  }

  public getEvent(
    identifier: InterstitialId | undefined,
  ): InterstitialEvent | null {
    return identifier ? this.eventMap[identifier] || null : null;
  }

  public hasEvent(identifier: InterstitialId): boolean {
    return identifier in this.eventMap;
  }

  public findItemIndex(item: InterstitialScheduleItem, time?: number): number {
    if (item.event) {
      // Find Event Item
      return this.findEventIndex(item.event.identifier);
    }
    // Find Primary Item
    let index = -1;
    if (item.nextEvent) {
      index = this.findEventIndex(item.nextEvent.identifier) - 1;
    } else if (item.previousEvent) {
      index = this.findEventIndex(item.previousEvent.identifier) + 1;
    }
    const items = this.items;
    if (items) {
      if (!items[index]) {
        if (time === undefined) {
          time = item.start;
        }
        index = this.findItemIndexAtTime(time);
      }
      // Only return index of a Primary Item
      while (index >= 0 && items[index]?.event) {
        // If index found is an interstitial it is not a valid result as it should have been matched up top
        // decrement until result is negative (not found) or a primary segment
        index--;
      }
    }
    return index;
  }

  public findItemIndexAtTime(
    timelinePos: number,
    timelineType?: TimelineType,
  ): number {
    const items = this.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        let timeRange: { start: number; end: number } = items[i];
        if (timelineType && timelineType !== 'primary') {
          timeRange = timeRange[timelineType];
        }
        if (
          timelinePos === timeRange.start ||
          (timelinePos > timeRange.start && timelinePos < timeRange.end)
        ) {
          return i;
        }
      }
    }
    return -1;
  }

  public findJumpRestrictedIndex(startIndex: number, endIndex: number): number {
    const items = this.items;
    if (items) {
      for (let i = startIndex; i <= endIndex; i++) {
        if (!items[i]) {
          break;
        }
        const event = items[i].event;
        if (event?.restrictions.jump && !event.appendInPlace) {
          return i;
        }
      }
    }
    return -1;
  }

  public findEventIndex(identifier: InterstitialId): number {
    const items = this.items;
    if (items) {
      for (let i = items.length; i--; ) {
        if (items[i].event?.identifier === identifier) {
          return i;
        }
      }
    }
    return -1;
  }

  public findAssetIndex(event: InterstitialEvent, timelinePos: number): number {
    const assetList = event.assetList;
    const length = assetList.length;
    if (length > 1) {
      for (let i = 0; i < length; i++) {
        const asset = assetList[i];
        if (!asset.error) {
          const timelineStart = asset.timelineStart;
          if (
            timelinePos === timelineStart ||
            (timelinePos > timelineStart &&
              (timelinePos < timelineStart + (asset.duration || 0) ||
                i === length - 1))
          ) {
            return i;
          }
        }
      }
    }
    return 0;
  }

  public get assetIdAtEnd(): string | null {
    const interstitialAtEnd = this.items?.[this.length - 1]?.event;
    if (interstitialAtEnd) {
      const assetList = interstitialAtEnd.assetList;
      const assetAtEnd = assetList[assetList.length - 1];
      if (assetAtEnd) {
        return assetAtEnd.identifier;
      }
    }
    return null;
  }

  public parseInterstitialDateRanges(
    mediaSelection: MediaSelection,
    enableAppendInPlace: boolean,
  ) {
    const details = mediaSelection.main.details!;
    const { dateRanges } = details;
    const previousInterstitialEvents = this.events;
    const interstitialEvents = this.parseDateRanges(
      dateRanges,
      {
        url: details.url,
      },
      enableAppendInPlace,
    );
    const ids = Object.keys(dateRanges);
    const removedInterstitials = previousInterstitialEvents
      ? previousInterstitialEvents.filter(
          (event) => !ids.includes(event.identifier),
        )
      : [];
    if (interstitialEvents.length) {
      // pre-rolls, post-rolls, and events with the same start time are played in playlist tag order
      // all other events are ordered by start time
      interstitialEvents.sort((a, b) => {
        const aPre = a.cue.pre;
        const aPost = a.cue.post;
        const bPre = b.cue.pre;
        const bPost = b.cue.post;
        if (aPre && !bPre) {
          return -1;
        }
        if (bPre && !aPre) {
          return 1;
        }
        if (aPost && !bPost) {
          return 1;
        }
        if (bPost && !aPost) {
          return -1;
        }
        if (!aPre && !bPre && !aPost && !bPost) {
          const startA = a.startTime;
          const startB = b.startTime;
          if (startA !== startB) {
            return startA - startB;
          }
        }
        return a.dateRange.tagOrder - b.dateRange.tagOrder;
      });
    }
    this.events = interstitialEvents;

    // Clear removed DateRanges from buffered list (kills playback of active Interstitials)
    removedInterstitials.forEach((interstitial) => {
      this.removeEvent(interstitial);
    });

    this.updateSchedule(mediaSelection, removedInterstitials);
  }

  public updateSchedule(
    mediaSelection: MediaSelection,
    removedInterstitials: InterstitialEvent[] = [],
    forceUpdate: boolean = false,
  ) {
    const events = this.events || [];
    if (events.length || removedInterstitials.length || this.length < 2) {
      const currentItems = this.items;
      const updatedItems = this.parseSchedule(events, mediaSelection);
      const updated =
        forceUpdate ||
        removedInterstitials.length ||
        currentItems?.length !== updatedItems.length ||
        updatedItems.some((item, i) => {
          return (
            Math.abs(item.playout.start - currentItems[i].playout.start) >
              0.005 ||
            Math.abs(item.playout.end - currentItems[i].playout.end) > 0.005
          );
        });
      if (updated) {
        this.items = updatedItems;
        // call interstitials-controller onScheduleUpdated()
        this.onScheduleUpdate(removedInterstitials, currentItems);
      }
    }
  }

  private parseDateRanges(
    dateRanges: Record<string, DateRange | undefined>,
    baseData: BaseData,
    enableAppendInPlace: boolean,
  ): InterstitialEvent[] {
    const interstitialEvents: InterstitialEvent[] = [];
    const ids = Object.keys(dateRanges);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const dateRange = dateRanges[id]!;
      if (dateRange.isInterstitial) {
        let interstitial = this.eventMap[id];
        if (interstitial) {
          // Update InterstitialEvent already parsed and mapped
          // This retains already loaded duration and loaded asset list info
          interstitial.setDateRange(dateRange);
        } else {
          interstitial = new InterstitialEvent(dateRange, baseData);
          this.eventMap[id] = interstitial;
          if (enableAppendInPlace === false) {
            interstitial.appendInPlace = enableAppendInPlace;
          }
        }
        interstitialEvents.push(interstitial);
      }
    }
    return interstitialEvents;
  }

  private parseSchedule(
    interstitialEvents: InterstitialEvent[],
    mediaSelection: MediaSelection,
  ): InterstitialScheduleItem[] {
    const schedule: InterstitialScheduleItem[] = [];
    const details = mediaSelection.main.details!;
    const primaryDuration = details.live ? Infinity : details.edge;
    let playoutDuration = 0;

    // Filter events that have errored from the schedule (Primary fallback)
    interstitialEvents = interstitialEvents.filter(
      (event) => !event.error && !(event.cue.once && event.hasPlayed),
    );
    if (interstitialEvents.length) {
      // Update Schedule
      this.resolveOffsets(interstitialEvents, mediaSelection);

      // Populate Schedule with Interstitial Event and Primary Segment Items
      let primaryPosition = 0;
      let integratedTime = 0;
      interstitialEvents.forEach((interstitial, i) => {
        const preroll = interstitial.cue.pre;
        const postroll = interstitial.cue.post;
        const previousEvent =
          (interstitialEvents[i - 1] as InterstitialEvent | undefined) || null;
        const appendInPlace = interstitial.appendInPlace;
        const eventStart = postroll
          ? primaryDuration
          : interstitial.startOffset;
        const interstitialDuration = interstitial.duration;
        const timelineDuration =
          interstitial.timelineOccupancy === TimelineOccupancy.Range
            ? interstitialDuration
            : 0;
        const resumptionOffset = interstitial.resumptionOffset;
        const inSameStartTimeSequence = previousEvent?.startTime === eventStart;
        const start = eventStart + interstitial.cumulativeDuration;
        let end = appendInPlace
          ? start + interstitialDuration
          : eventStart + resumptionOffset;
        if (preroll || (!postroll && eventStart <= 0)) {
          // preroll or in-progress midroll
          const integratedStart = integratedTime;
          integratedTime += timelineDuration;
          interstitial.timelineStart = start;
          const playoutStart = playoutDuration;
          playoutDuration += interstitialDuration;
          schedule.push({
            event: interstitial,
            start,
            end,
            playout: {
              start: playoutStart,
              end: playoutDuration,
            },
            integrated: {
              start: integratedStart,
              end: integratedTime,
            },
          });
        } else if (eventStart <= primaryDuration) {
          if (!inSameStartTimeSequence) {
            const segmentDuration = eventStart - primaryPosition;
            // Do not schedule a primary segment if interstitials are abutting by less than ABUTTING_THRESHOLD_SECONDS
            if (segmentDuration > ABUTTING_THRESHOLD_SECONDS) {
              // primary segment
              const timelineStart = primaryPosition;
              const integratedStart = integratedTime;
              integratedTime += segmentDuration;
              const playoutStart = playoutDuration;
              playoutDuration += segmentDuration;
              const primarySegment = {
                previousEvent: interstitialEvents[i - 1] || null,
                nextEvent: interstitial,
                start: timelineStart,
                end: timelineStart + segmentDuration,
                playout: {
                  start: playoutStart,
                  end: playoutDuration,
                },
                integrated: {
                  start: integratedStart,
                  end: integratedTime,
                },
              };
              schedule.push(primarySegment);
            } else if (segmentDuration > 0 && previousEvent) {
              // Add previous event `resumeTime` (based on duration or resumeOffset) so that it ends aligned with this one
              previousEvent.cumulativeDuration += segmentDuration;
              schedule[schedule.length - 1].end = eventStart;
            }
          }
          // midroll / postroll
          if (postroll) {
            end = start;
          }
          interstitial.timelineStart = start;
          const integratedStart = integratedTime;
          integratedTime += timelineDuration;
          const playoutStart = playoutDuration;
          playoutDuration += interstitialDuration;
          schedule.push({
            event: interstitial,
            start,
            end,
            playout: {
              start: playoutStart,
              end: playoutDuration,
            },
            integrated: {
              start: integratedStart,
              end: integratedTime,
            },
          });
        } else {
          // Interstitial starts after end of primary VOD - not included in schedule
          return;
        }
        const resumeTime = interstitial.resumeTime;
        if (postroll || resumeTime > primaryDuration) {
          primaryPosition = primaryDuration;
        } else {
          primaryPosition = resumeTime;
        }
      });
      if (primaryPosition < primaryDuration) {
        // last primary segment
        const timelineStart = primaryPosition;
        const integratedStart = integratedTime;
        const segmentDuration = primaryDuration - primaryPosition;
        integratedTime += segmentDuration;
        const playoutStart = playoutDuration;
        playoutDuration += segmentDuration;
        schedule.push({
          previousEvent: schedule[schedule.length - 1]?.event || null,
          nextEvent: null,
          start: primaryPosition,
          end: timelineStart + segmentDuration,
          playout: {
            start: playoutStart,
            end: playoutDuration,
          },
          integrated: {
            start: integratedStart,
            end: integratedTime,
          },
        });
      }
      this.setDurations(primaryDuration, playoutDuration, integratedTime);
    } else {
      // no interstials - schedule is one primary segment
      const start = 0;
      schedule.push({
        previousEvent: null,
        nextEvent: null,
        start,
        end: primaryDuration,
        playout: {
          start,
          end: primaryDuration,
        },
        integrated: {
          start,
          end: primaryDuration,
        },
      });
      this.setDurations(primaryDuration, primaryDuration, primaryDuration);
    }
    return schedule;
  }

  private setDurations(primary: number, playout: number, integrated: number) {
    this.durations = {
      primary,
      playout,
      integrated,
    };
  }

  private resolveOffsets(
    interstitialEvents: InterstitialEvent[],
    mediaSelection: MediaSelection,
  ) {
    const details = mediaSelection.main.details!;
    const primaryDuration = details.live ? Infinity : details.edge;

    // First resolve cumulative resumption offsets for Interstitials that start at the same DateTime
    let cumulativeDuration = 0;
    let lastScheduledStart = -1;
    interstitialEvents.forEach((interstitial, i) => {
      const preroll = interstitial.cue.pre;
      const postroll = interstitial.cue.post;
      const eventStart = preroll
        ? 0
        : postroll
          ? primaryDuration
          : interstitial.startTime;
      this.updateAssetDurations(interstitial);

      // X-RESUME-OFFSET values of interstitials scheduled at the same time are cumulative
      const inSameStartTimeSequence = lastScheduledStart === eventStart;
      if (inSameStartTimeSequence) {
        interstitial.cumulativeDuration = cumulativeDuration;
      } else {
        cumulativeDuration = 0;
        lastScheduledStart = eventStart;
      }
      if (!postroll && interstitial.snapOptions.in) {
        // FIXME: Include audio playlist in snapping
        interstitial.resumeAnchor =
          findFragmentByPTS(
            null,
            details.fragments,
            interstitial.startOffset + interstitial.resumptionOffset,
            0,
            0,
          ) || undefined;
      }
      // Check if primary fragments align with resumption offset and disable appendInPlace if they do not
      if (interstitial.appendInPlace && !interstitial.appendInPlaceStarted) {
        const alignedSegmentStart = this.primaryCanResumeInPlaceAt(
          interstitial,
          mediaSelection,
        );
        if (!alignedSegmentStart) {
          interstitial.appendInPlace = false;
        }
      }
      if (!interstitial.appendInPlace && i + 1 < interstitialEvents.length) {
        // abutting Interstitials must use the same MediaSource strategy, this applies to all whether or not they are back to back:
        const timeBetween =
          interstitialEvents[i + 1].startTime -
          interstitialEvents[i].resumeTime;
        if (timeBetween < ABUTTING_THRESHOLD_SECONDS) {
          interstitialEvents[i + 1].appendInPlace = false;
          if (interstitialEvents[i + 1].appendInPlace) {
            this.warn(
              `Could not change append strategy for abutting event ${interstitial}`,
            );
          }
        }
      }
      // Update cumulativeDuration for next abutting interstitial with the same start date
      const resumeOffset = Number.isFinite(interstitial.resumeOffset)
        ? interstitial.resumeOffset
        : interstitial.duration;
      cumulativeDuration += resumeOffset;
    });
  }

  private primaryCanResumeInPlaceAt(
    interstitial: InterstitialEvent,
    mediaSelection: MediaSelection,
  ): boolean {
    const resumeTime = interstitial.resumeTime;
    const resumesInPlaceAt =
      interstitial.startTime + interstitial.resumptionOffset;
    if (
      Math.abs(resumeTime - resumesInPlaceAt) > ALIGNED_END_THRESHOLD_SECONDS
    ) {
      this.log(
        `"${interstitial.identifier}" resumption ${resumeTime} not aligned with estimated timeline end ${resumesInPlaceAt}`,
      );
      return false;
    }
    const playlists = Object.keys(mediaSelection);
    return !playlists.some((playlistType) => {
      const details = mediaSelection[playlistType].details;
      const playlistEnd = details.edge;
      if (resumeTime >= playlistEnd) {
        // Live playback - resumption segments are not yet available
        this.log(
          `"${interstitial.identifier}" resumption ${resumeTime} past ${playlistType} playlist end ${playlistEnd}`,
        );
        // Assume alignment is possible (or reset can take place)
        return false;
      }
      const startFragment = findFragmentByPTS(
        null,
        details.fragments,
        resumeTime,
      );
      if (!startFragment) {
        this.log(
          `"${interstitial.identifier}" resumption ${resumeTime} does not align with any fragments in ${playlistType} playlist (${details.fragStart}-${details.fragmentEnd})`,
        );
        return true;
      }
      const allowance = playlistType === 'audio' ? 0.175 : 0;
      const alignedWithSegment =
        Math.abs(startFragment.start - resumeTime) <
          ALIGNED_END_THRESHOLD_SECONDS + allowance ||
        Math.abs(startFragment.end - resumeTime) <
          ALIGNED_END_THRESHOLD_SECONDS + allowance;
      if (!alignedWithSegment) {
        this.log(
          `"${interstitial.identifier}" resumption ${resumeTime} not aligned with ${playlistType} fragment bounds (${startFragment.start}-${startFragment.end} sn: ${startFragment.sn} cc: ${startFragment.cc})`,
        );
        return true;
      }
      return false;
    });
  }

  private updateAssetDurations(interstitial: InterstitialEvent) {
    if (!interstitial.assetListLoaded) {
      return;
    }
    const eventStart = interstitial.timelineStart;
    let sumDuration = 0;
    let hasUnknownDuration = false;
    let hasErrors = false;
    for (let i = 0; i < interstitial.assetList.length; i++) {
      const asset = interstitial.assetList[i];
      const timelineStart = eventStart + sumDuration;
      asset.startOffset = sumDuration;
      asset.timelineStart = timelineStart;
      hasUnknownDuration ||= asset.duration === null;
      hasErrors ||= !!asset.error;
      const duration = asset.error ? 0 : (asset.duration as number) || 0;
      sumDuration += duration;
    }
    // Use the sum of known durations when it is greater than the stated duration
    if (hasUnknownDuration && !hasErrors) {
      interstitial.duration = Math.max(sumDuration, interstitial.duration);
    } else {
      interstitial.duration = sumDuration;
    }
  }

  private removeEvent(interstitial: InterstitialEvent) {
    interstitial.reset();
    delete this.eventMap[interstitial.identifier];
  }
}

export function segmentToString(segment: InterstitialScheduleItem): string {
  return `[${segment.event ? '"' + segment.event.identifier + '"' : 'primary'}: ${segment.start.toFixed(2)}-${segment.end.toFixed(2)}]`;
}
