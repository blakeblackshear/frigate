import type { TimelineEvent } from '../../components/Timeline/TimelineEvent';
import type { TimelineEventBlock } from '../../components/Timeline/TimelineEventBlock';
import { epochToLong, longToDate } from '../dateUtil';

export const checkEventForOverlap = (firstEvent: TimelineEvent, secondEvent: TimelineEvent) => {
  if (secondEvent.startTime < firstEvent.endTime && secondEvent.startTime > firstEvent.startTime) {
    return true;
  }
  return false;
};

export const getTimelineEventBlocksFromTimelineEvents = (events: TimelineEvent[], xOffset: number): TimelineEventBlock[] => {
  const firstEvent = events[0];
  const firstEventTime = longToDate(firstEvent.start_time);
  return events
    .map((e, index) => {
      const startTime = longToDate(e.start_time);
      const endTime = e.end_time ? longToDate(e.end_time) : new Date();
      const seconds = Math.round(Math.abs(endTime.getTime() - startTime.getTime()) / 1000);
      const positionX = Math.round(Math.abs(startTime.getTime() - firstEventTime.getTime()) / 1000 + xOffset);
      return {
        ...e,
        startTime,
        endTime,
        width: seconds,
        positionX,
        index,
      } as TimelineEventBlock;
    })
    .reduce((rowMap, current) => {
      for (let i = 0; i < rowMap.length; i++) {
        const row = rowMap[i] ?? [];
        const lastItem = row[row.length - 1];
        if (lastItem) {
          const isOverlap = checkEventForOverlap(lastItem, current);
          if (isOverlap) {
            continue;
          }
        }
        rowMap[i] = [...row, current];
        return rowMap;
      }
      rowMap.push([current]);
      return rowMap;
    }, [] as TimelineEventBlock[][])
    .flatMap((rows, rowPosition) => {
      rows.forEach((eventBlock) => {
        const OFFSET_DISTANCE_IN_PIXELS = 10;
        eventBlock.yOffset = OFFSET_DISTANCE_IN_PIXELS * rowPosition;
      });
      return rows;
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
};

export const findLargestYOffsetInBlocks = (blocks: TimelineEventBlock[]): number => {
  return blocks.reduce((largestYOffset, current) => {
    if (current.yOffset > largestYOffset) {
      return current.yOffset;
    }
    return largestYOffset;
  }, 0);
};

export const getTimelineWidthFromBlocks = (blocks: TimelineEventBlock[], offset: number): number => {
  const firstBlock = blocks[0];
  if (firstBlock) {
    const startTimeEpoch = firstBlock.startTime.getTime();
    const endTimeEpoch = Date.now();
    const timelineDurationLong = epochToLong(endTimeEpoch - startTimeEpoch);
    return timelineDurationLong + offset * 2;
  }
};
