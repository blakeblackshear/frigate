import { constructFromSymbol } from "../constants/index.cts";

/**
 * Time zone date class. It overrides original Date functions making them
 * to perform all the calculations in the given time zone.
 *
 * It also provides new functions useful when working with time zones.
 *
 * Combined with date-fns, it allows using the class the same way as
 * the original date class.
 *
 * This complete version provides formatter functions, mirroring all original
 * methods of the `Date` class. It's build-size-heavier than `TZDateMini` and
 * should be used when you need to format a string or in an environment you
 * don't fully control (a library).
 *
 * For the minimal version, see `TZDateMini`.
 */
export class TZDate extends Date {
  /**
   * Constructs a new `TZDate` instance in the system time zone.
   */
  constructor();

  /**
   * Constructs a new `TZDate` instance from the date time string and time zone.
   *
   * @param dateStr - Date time string to create a new instance from
   * @param timeZone - Time zone name (IANA or UTC offset)
   */
  constructor(dateStr: string, timeZone?: string);

  /**
   * Constructs a new `TZDate` instance from the date object and time zone.
   *
   * @param date - Date object to create a new instance from
   * @param timeZone - Time zone name (IANA or UTC offset)
   */
  constructor(date: Date, timeZone?: string);

  /**
   * Constructs a new `TZDate` instance from the Unix timestamp in milliseconds
   * and time zone.
   *
   * @param timestamp - Unix timestamp in milliseconds to create a new instance from
   * @param timeZone - Time zone name (IANA or UTC offset)
   */
  constructor(timestamp: number, timeZone?: string);

  /**
   * Constructs a new `TZDate` instance from the year, month, and time zone.
   *
   * @param year - Year
   * @param month - Month (0-11)
   * @param timeZone - Time zone name (IANA or UTC offset)
   */
  constructor(year: number, month: number, timeZone?: string);

  /**
   * Constructs a new `TZDate` instance from the year, month, date and time zone.
   *
   * @param year - Year
   * @param month - Month (0-11)
   * @param date - Date
   * @param timeZone - Time zone name (IANA or UTC offset)
   */
  constructor(year: number, month: number, date: number, timeZone?: string);

  /**
   * Constructs a new `TZDate` instance from the year, month, date, hours
   * and time zone.
   *
   * @param year - Year
   * @param month - Month (0-11)
   * @param date - Date
   * @param hours - Hours
   * @param timeZone - Time zone name (IANA or UTC offset)
   */
  constructor(
    year: number,
    month: number,
    date: number,
    hours: number,
    timeZone?: string,
  );

  /**
   * Constructs a new `TZDate` instance from the year, month, date, hours,
   * minutes and time zone.
   *
   * @param year - Year
   * @param month - Month (0-11)
   * @param date - Date
   * @param hours - Hours
   * @param minutes - Minutes
   * @param timeZone - Time zone name (IANA or UTC offset)
   */
  constructor(
    year: number,
    month: number,
    date: number,
    hours: number,
    minutes: number,
    timeZone?: string,
  );

  /**
   * Constructs a new `TZDate` instance from the year, month, date, hours,
   * minutes, seconds and time zone.
   *
   * @param year - Year
   * @param month - Month (0-11)
   * @param date - Date
   * @param hours - Hours
   * @param minutes - Minutes
   * @param seconds - Seconds
   * @param timeZone - Time zone name (IANA or UTC offset)
   */
  constructor(
    year: number,
    month: number,
    date: number,
    hours: number,
    minutes: number,
    seconds: number,
    timeZone?: string,
  );

  /**
   * Constructs a new `TZDate` instance from the year, month, date, hours,
   * minutes, seconds, milliseconds and time zone.
   *
   * @param year - Year
   * @param month - Month (0-11)
   * @param date - Date
   * @param hours - Hours
   * @param minutes - Minutes
   * @param seconds - Seconds
   * @param milliseconds - Milliseconds
   * @param timeZone - Time zone name (IANA or UTC offset)
   */
  constructor(
    year: number,
    month: number,
    date: number,
    hours: number,
    minutes: number,
    seconds: number,
    milliseconds: number,
    timeZone?: string,
  );

  /**
   * Creates a new `TZDate` instance in the given time zone.
   *
   * @param tz - Time zone name (IANA or UTC offset)
   */
  static tz(tz: string): TZDate;

  /**
   * Creates a new `TZDate` instance in the given time zone from the Unix
   * timestamp in milliseconds.
   *
   * @param tz - Time zone name (IANA or UTC offset)
   * @param timestamp - Unix timestamp in milliseconds
   */
  static tz(tz: string, timestamp: number): TZDate;

  /**
   * Creates a new `TZDate` instance in the given time zone from the date time
   * string.
   *
   * @param tz - Time zone name (IANA or UTC offset)
   * @param dateStr - Date time string
   */
  static tz(tz: string, dateStr: string): TZDate;

  /**
   * Creates a new `TZDate` instance in the given time zone from the date object.
   *
   * @param tz - Time zone name (IANA or UTC offset)
   * @param date - Date object
   */
  static tz(tz: string, date: Date): TZDate;

  /**
   * Creates a new `TZDate` instance in the given time zone from the year
   * and month.
   *
   * @param tz - Time zone name (IANA or UTC offset)
   * @param year - Year
   * @param month - Month (0-11)
   */
  static tz(tz: string, year: number, month: number): TZDate;

  /**
   * Creates a new `TZDate` instance in the given time zone from the year,
   * month and date.
   *
   * @param tz - Time zone name (IANA or UTC offset)
   * @param year - Year
   * @param month - Month (0-11)
   * @param date - Date
   */
  static tz(tz: string, year: number, month: number, date: number): TZDate;

  /**
   * Creates a new `TZDate` instance in the given time zone from the year,
   * month, date and hours.
   *
   * @param tz - Time zone name (IANA or UTC offset)
   * @param year - Year
   * @param month - Month (0-11)
   * @param date - Date
   * @param hours - Hours
   */
  static tz(
    tz: string,
    year: number,
    month: number,
    date: number,
    hours: number,
  ): TZDate;

  /**
   * Creates a new `TZDate` instance in the given time zone from the year,
   * month, date, hours and minutes.
   *
   * @param tz - Time zone name (IANA or UTC offset)
   * @param year - Year
   * @param month - Month (0-11)
   * @param date - Date
   * @param hours - Hours
   * @param minutes - Minutes
   */
  static tz(
    tz: string,
    year: number,
    month: number,
    date: number,
    hours: number,
    minutes: number,
  ): TZDate;

  /**
   * Creates a new `TZDate` instance in the given time zone from the year,
   * month, date, hours, minutes and seconds.
   *
   * @param tz - Time zone name (IANA or UTC offset)
   * @param year - Year
   * @param month - Month (0-11)
   * @param date - Date
   * @param hours - Hours
   * @param minutes - Minutes
   * @param seconds - Seconds
   */
  static tz(
    tz: string,
    year: number,
    month: number,
    date: number,
    hours: number,
    minutes: number,
    seconds: number,
  ): TZDate;

  /**
   * Creates a new `TZDate` instance in the given time zone from the year,
   * month, date, hours, minutes, seconds and milliseconds.
   *
   * @param tz - Time zone name (IANA or UTC offset)
   * @param year - Year
   * @param month - Month (0-11)
   * @param date - Date
   * @param hours - Hours
   * @param minutes - Minutes
   * @param seconds - Seconds
   * @param milliseconds - Milliseconds
   */
  static tz(
    tz: string,
    year: number,
    month: number,
    date: number,
    hours: number,
    minutes: number,
    seconds: number,
    milliseconds: number,
  ): TZDate;

  /**
   * The current time zone of the date.
   */
  readonly timeZone: string | undefined;

  /**
   * Creates a new `TZDate` instance in the given time zone.
   */
  withTimeZone(timeZone: string): TZDate;

  /**
   * Creates a new `TZDate` instance in the current instance time zone and
   * the specified date time value.
   *
   * @param date - Date value to create a new instance from
   */
  [constructFromSymbol](date: Date | number | string): TZDate;
}
