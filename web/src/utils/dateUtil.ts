export const longToDate = (long: number): Date => new Date(long * 1000);
export const epochToLong = (date: number): number => date / 1000;
export const dateToLong = (date: Date): number => epochToLong(date.getTime());
import { fromUnixTime, intervalToDuration, formatDuration } from 'date-fns';

const getDateTimeYesterday = (dateTime: Date): Date => {
  const twentyFourHoursInMilliseconds = 24 * 60 * 60 * 1000;
  return new Date(dateTime.getTime() - twentyFourHoursInMilliseconds);
};

const getNowYesterday = (): Date => {
  return getDateTimeYesterday(new Date());
};

export const getNowYesterdayInLong = (): number => {
  return dateToLong(getNowYesterday());
};

/**
 * This function takes in a unix timestamp, locale, timezone,
 * and returns a dateTime string.
 * If unixTimestamp is not provided, it returns 'Invalid time'
 * @param unixTimestamp: number
 * @param locale: string
 * @param timezone: string
 * @returns string - dateTime or 'Invalid time' if unixTimestamp is not provided
 */
export const formatUnixTimestampToDateTime = (unixTimestamp: number, locale: string, timezone: string): string => {
  if (isNaN(unixTimestamp)) {
    return 'Invalid time';
  }
  try {
    const date = new Date(unixTimestamp * 1000);
    const formatter = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: timezone,
    });
    return formatter.format(date);
  } catch (error) {
    return 'Invalid time';
  }
};

interface DurationToken {
  xSeconds: string;
  xMinutes: string;
  xHours: string;
}

/**
 * This function takes in start and end time in unix timestamp,
 * and returns the duration between start and end time in hours, minutes and seconds.
 * If end time is not provided, it returns 'In Progress'
 * @param start_time: number - Unix timestamp for start time
 * @param end_time: number|null - Unix timestamp for end time
 * @returns string - duration or 'In Progress' if end time is not provided
 */
export const getDurationFromTimestamps = (start_time: number, end_time: number | null): string => {
  if (isNaN(start_time)) {
    return 'Invalid start time';
  }
  let duration = 'In Progress';
  if (end_time !== null) {
    if (isNaN(end_time)) {
      return 'Invalid end time';
    }
    const start = fromUnixTime(start_time);
    const end = fromUnixTime(end_time);
    const formatDistanceLocale: DurationToken = {
      xSeconds: '{{count}}s',
      xMinutes: '{{count}}m',
      xHours: '{{count}}h',
    };
    const shortEnLocale = {
      formatDistance: (token: keyof DurationToken, count: number) =>
        formatDistanceLocale[token].replace('{{count}}', count.toString()),
    };
    duration = formatDuration(intervalToDuration({ start, end }), {
      format: ['hours', 'minutes', 'seconds'],
      locale: shortEnLocale,
    });
  }
  return duration;
};
