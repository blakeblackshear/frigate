import strftime from "strftime";
import { fromUnixTime, intervalToDuration, formatDuration } from "date-fns";
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

// only used as a fallback if the browser does not support dateStyle/timeStyle in Intl.DateTimeFormat
const formatMap: {
  [k: string]: {
    date: {
      year: "numeric" | "2-digit";
      month: "long" | "short" | "2-digit";
      day: "numeric" | "2-digit";
    };
    time: {
      hour: "numeric";
      minute: "numeric";
      second?: "numeric";
      timeZoneName?: "short" | "long";
    };
  };
} = {
  full: {
    date: { year: "numeric", month: "long", day: "numeric" },
    time: {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZoneName: "long",
    },
  },
  long: {
    date: { year: "numeric", month: "long", day: "numeric" },
    time: {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZoneName: "long",
    },
  },
  medium: {
    date: { year: "numeric", month: "short", day: "numeric" },
    time: { hour: "numeric", minute: "numeric", second: "numeric" },
  },
  short: {
    date: { year: "2-digit", month: "2-digit", day: "2-digit" },
    time: { hour: "numeric", minute: "numeric" },
  },
};

/**
 * Attempts to get the system's time zone using Intl.DateTimeFormat. If that fails (for instance, in environments
 * where Intl is not fully supported), it calculates the UTC offset for the current system time and returns
 * it in a string format.
 *
 * Keeping the Intl.DateTimeFormat for now, as this is the recommended way to get the time zone.
 * https://stackoverflow.com/a/34602679
 *
 * Intl.DateTimeFormat function as of April 2023, works in 95.03% of the browsers used globally
 * https://caniuse.com/mdn-javascript_builtins_intl_datetimeformat_resolvedoptions_computed_timezone
 *
 * @returns {string} The resolved time zone or a calculated UTC offset.
 * The returned string will either be a named time zone (e.g., "America/Los_Angeles"), or it will follow
 * the format "UTC±HH:MM".
 */
const getResolvedTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    const offsetMinutes = new Date().getTimezoneOffset();
    return `UTC${offsetMinutes < 0 ? "+" : "-"}${Math.abs(offsetMinutes / 60)
      .toString()
      .padStart(2, "0")}:${Math.abs(offsetMinutes % 60)
      .toString()
      .padStart(2, "0")}`;
  }
};

/**
 * Formats a Unix timestamp into a human-readable date/time string.
 *
 * The format of the output string is determined by a configuration object passed as an argument, which
 * may specify a time zone, 12- or 24-hour time, and various stylistic options for the date and time.
 * If these options are not specified, the function will use system defaults or sensible fallbacks.
 *
 * The function is robust to environments where the Intl API is not fully supported, and includes a
 * fallback method to create a formatted date/time string in such cases.
 *
 * @param {number} unixTimestamp - The Unix timestamp to be formatted.
 * @param {DateTimeStyle} config - User configuration object.
 * @returns {string} A formatted date/time string.
 *
 * @throws {Error} If the given unixTimestamp is not a valid number, the function will return 'Invalid time'.
 */
export const formatUnixTimestampToDateTime = (
  unixTimestamp: number,
  config: {
    timezone?: string;
    time_format?: "browser" | "12hour" | "24hour";
    date_style?: "full" | "long" | "medium" | "short";
    time_style?: "full" | "long" | "medium" | "short";
    strftime_fmt?: string;
  }
): string => {
  const { timezone, time_format, date_style, time_style, strftime_fmt } =
    config;
  const locale = window.navigator?.language || "en-US";
  if (isNaN(unixTimestamp)) {
    return "Invalid time";
  }

  try {
    const date = new Date(unixTimestamp * 1000);
    const resolvedTimeZone = getResolvedTimeZone();

    // use strftime_fmt if defined in config
    if (strftime_fmt) {
      const offset = getUTCOffset(date, timezone || resolvedTimeZone);
      const strftime_locale = strftime.timezone(offset);
      return strftime_locale(strftime_fmt, date);
    }

    // DateTime format options
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: date_style,
      timeStyle: time_style,
      hour12: time_format !== "browser" ? time_format == "12hour" : undefined,
    };

    // Only set timeZone option when resolvedTimeZone does not match UTC±HH:MM format, or when timezone is set in config
    const isUTCOffsetFormat = /^UTC[+-]\d{2}:\d{2}$/.test(resolvedTimeZone);
    if (timezone || !isUTCOffsetFormat) {
      options.timeZone = timezone || resolvedTimeZone;
    }

    const formatter = new Intl.DateTimeFormat(locale, options);
    const formattedDateTime = formatter.format(date);

    // Regex to check for existence of time. This is needed because dateStyle/timeStyle is not always supported.
    const containsTime = /\d{1,2}:\d{1,2}/.test(formattedDateTime);

    // fallback if the browser does not support dateStyle/timeStyle in Intl.DateTimeFormat
    // This works even tough the timezone is undefined, it will use the runtime's default time zone
    if (!containsTime) {
      const dateOptions = {
        ...formatMap[date_style ?? ""]?.date,
        timeZone: options.timeZone,
        hour12: options.hour12,
      };
      const timeOptions = {
        ...formatMap[time_style ?? ""]?.time,
        timeZone: options.timeZone,
        hour12: options.hour12,
      };

      return `${date.toLocaleDateString(
        locale,
        dateOptions
      )} ${date.toLocaleTimeString(locale, timeOptions)}`;
    }

    return formattedDateTime;
  } catch (error) {
    return "Invalid time";
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
export const getDurationFromTimestamps = (
  start_time: number,
  end_time: number | null
): string => {
  if (isNaN(start_time)) {
    return "Invalid start time";
  }
  let duration = "In Progress";
  if (end_time !== null) {
    if (isNaN(end_time)) {
      return "Invalid end time";
    }
    const start = fromUnixTime(start_time);
    const end = fromUnixTime(end_time);
    const formatDistanceLocale: DurationToken = {
      xSeconds: "{{count}}s",
      xMinutes: "{{count}}m",
      xHours: "{{count}}h",
    };
    const shortEnLocale = {
      formatDistance: (token: keyof DurationToken, count: number) =>
        formatDistanceLocale[token].replace("{{count}}", count.toString()),
    };
    duration = formatDuration(intervalToDuration({ start, end }), {
      format: ["hours", "minutes", "seconds"],
      locale: shortEnLocale,
    });
  }
  return duration;
};

/**
 * Adapted from https://stackoverflow.com/a/29268535 this takes a timezone string and
 * returns the offset of that timezone from UTC in minutes.
 * @param timezone string representation of the timezone the user is requesting
 * @returns number of minutes offset from UTC
 */
const getUTCOffset = (date: Date, timezone: string): number => {
  // If timezone is in UTC±HH:MM format, parse it to get offset
  const utcOffsetMatch = timezone.match(/^UTC([+-])(\d{2}):(\d{2})$/);
  if (utcOffsetMatch) {
    const hours = parseInt(utcOffsetMatch[2], 10);
    const minutes = parseInt(utcOffsetMatch[3], 10);
    return (utcOffsetMatch[1] === "+" ? 1 : -1) * (hours * 60 + minutes);
  }

  // Otherwise, calculate offset using provided timezone
  const utcDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60 * 1000
  );
  // locale of en-CA is required for proper locale format
  let iso = utcDate
    .toLocaleString("en-CA", { timeZone: timezone, hour12: false })
    .replace(", ", "T");
  iso += `.${utcDate.getMilliseconds().toString().padStart(3, "0")}`;
  let target = new Date(`${iso}Z`);

  // safari doesn't like the default format
  if (isNaN(target.getTime())) {
    iso = iso.replace("T", " ").split(".")[0];
    target = new Date(`${iso}+000`);
  }

  return (target.getTime() - utcDate.getTime()) / 60 / 1000;
};

export function getRangeForTimestamp(timestamp: number) {
  const date = new Date(timestamp * 1000);
  date.setMinutes(0, 0, 0);
  const start = date.getTime() / 1000;
  date.setHours(date.getHours() + 1);

  // ensure not to go past current time
  const end = Math.min(new Date().getTime() / 1000, date.getTime() / 1000);
  return { start, end };
}

export function isCurrentHour(timestamp: number) {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return timestamp > now.getTime() / 1000;
}
