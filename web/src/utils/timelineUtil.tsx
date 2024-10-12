import { endOfHourOrCurrentTime } from "./dateUtil";
import { TimeRange } from "@/types/timeline";

/**
 *
 * @param timeRange
 * @returns timeRange chunked into individual hours
 */
export function getChunkedTimeDay(timeRange: TimeRange): TimeRange[] {
  const endOfThisHour = new Date(timeRange.before * 1000);
  endOfThisHour.setSeconds(0, 0);
  const data: TimeRange[] = [];
  const startDay = new Date(timeRange.after * 1000);
  startDay.setUTCMinutes(0, 0, 0);
  let start = startDay.getTime() / 1000;
  let end = 0;

  for (let i = 0; i < 24; i++) {
    startDay.setHours(startDay.getHours() + 1);

    if (startDay > endOfThisHour) {
      break;
    }

    end = endOfHourOrCurrentTime(startDay.getTime() / 1000);
    data.push({
      after: start,
      before: end,
    });
    start = startDay.getTime() / 1000;
  }

  data.push({
    after: start,
    before: Math.floor(timeRange.before),
  });

  return data;
}

export function getChunkedTimeRange(
  startTimestamp: number,
  endTimestamp: number,
) {
  const endOfThisHour = new Date();
  endOfThisHour.setHours(endOfThisHour.getHours() + 1, 0, 0, 0);
  const data: TimeRange[] = [];
  const startDay = new Date(startTimestamp * 1000);
  startDay.setMinutes(0, 0, 0);
  let start = startDay.getTime() / 1000;
  let end = 0;

  while (end < endTimestamp) {
    startDay.setHours(startDay.getHours() + 1);

    if (startDay > endOfThisHour) {
      break;
    }

    end = endOfHourOrCurrentTime(startDay.getTime() / 1000);
    data.push({
      after: start,
      before: end,
    });
    start = startDay.getTime() / 1000;
  }

  return { start: startTimestamp, end: endTimestamp, ranges: data };
}
