import strftime from 'strftime';
import { fromUnixTime, intervalToDuration, formatDuration } from 'date-fns';
export const longToDate = (long: number): Date => new Date(long * 1000);
export const epochToLong = (date: number): number => date / 1000;
export const dateToLong = (date: Date): number => epochToLong(date.getTime());

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
 * This function takes in a Unix timestamp, configuration options for date/time display, and an optional strftime format string,
 * and returns a formatted date/time string.
 *
 * If the Unix timestamp is not provided, it returns "Invalid time".
 *
 * The configuration options determine how the date and time are formatted.
 * The `timezone` option allows you to specify a specific timezone for the output, otherwise the user's browser timezone will be used.
 * The `use12hour` option allows you to display time in a 12-hour format if true, and 24-hour format if false.
 * The `dateStyle` and `timeStyle` options allow you to specify pre-defined formats for displaying the date and time.
 * The `strftime_fmt` option allows you to specify a custom format using the strftime syntax.
 *
 * If both `strftime_fmt` and `dateStyle`/`timeStyle` are provided, `strftime_fmt` takes precedence.
 *
 * @param unixTimestamp The Unix timestamp to format
 * @param config An object containing the configuration options for date/time display
 * @returns The formatted date/time string, or "Invalid time" if the Unix timestamp is not provided or invalid.
 */
interface DateTimeStyle {
  timezone: string;
  use12hour: boolean | undefined;
  date_style: 'full' | 'long' | 'medium' | 'short';
  time_style: 'full' | 'long' | 'medium' | 'short';
  strftime_fmt: string;
}

export const formatUnixTimestampToDateTime = (unixTimestamp: number, config: DateTimeStyle): string => {
  const { timezone, use12hour, date_style, time_style, strftime_fmt } = config;
  const locale = window.navigator?.language || 'en-US';

  if (isNaN(unixTimestamp)) {
    return 'Invalid time';
  }
  try {
    const date = new Date(unixTimestamp * 1000);

    // use strftime_fmt if defined in config file
    if (strftime_fmt) {
      const strftime_locale = strftime.localizeByIdentifier(locale);
      return strftime_locale(strftime_fmt, date);
    }

    // else use Intl.DateTimeFormat
    const formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: date_style,
      timeStyle: time_style,
      timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      hour12: use12hour !== null ? use12hour : undefined,
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
