import { tzOffset } from "../tzOffset/index.js";
export class TZDateMini extends Date {
  //#region static

  constructor(...args) {
    super();
    if (args.length > 1 && typeof args[args.length - 1] === "string") {
      this.timeZone = args.pop();
    }
    this.internal = new Date();
    if (isNaN(tzOffset(this.timeZone, this))) {
      this.setTime(NaN);
    } else {
      if (!args.length) {
        this.setTime(Date.now());
      } else if (typeof args[0] === "number" && (args.length === 1 || args.length === 2 && typeof args[1] !== "number")) {
        this.setTime(args[0]);
      } else if (typeof args[0] === "string") {
        this.setTime(+new Date(args[0]));
      } else if (args[0] instanceof Date) {
        this.setTime(+args[0]);
      } else {
        this.setTime(+new Date(...args));
        adjustToSystemTZ(this, NaN);
        syncToInternal(this);
      }
    }
  }
  static tz(tz, ...args) {
    return args.length ? new TZDateMini(...args, tz) : new TZDateMini(Date.now(), tz);
  }

  //#endregion

  //#region time zone

  withTimeZone(timeZone) {
    return new TZDateMini(+this, timeZone);
  }
  getTimezoneOffset() {
    const offset = -tzOffset(this.timeZone, this);
    // Remove the seconds offset
    // use Math.floor for negative GMT timezones and Math.ceil for positive GMT timezones.
    return offset > 0 ? Math.floor(offset) : Math.ceil(offset);
  }

  //#endregion

  //#region time

  setTime(time) {
    Date.prototype.setTime.apply(this, arguments);
    syncToInternal(this);
    return +this;
  }

  //#endregion

  //#region date-fns integration

  [Symbol.for("constructDateFrom")](date) {
    return new TZDateMini(+new Date(date), this.timeZone);
  }

  //#endregion
}

// Assign getters and setters
const re = /^(get|set)(?!UTC)/;
Object.getOwnPropertyNames(Date.prototype).forEach(method => {
  if (!re.test(method)) return;
  const utcMethod = method.replace(re, "$1UTC");
  // Filter out methods without UTC counterparts
  if (!TZDateMini.prototype[utcMethod]) return;
  if (method.startsWith("get")) {
    // Delegate to internal date's UTC method
    TZDateMini.prototype[method] = function () {
      return this.internal[utcMethod]();
    };
  } else {
    // Assign regular setter
    TZDateMini.prototype[method] = function () {
      Date.prototype[utcMethod].apply(this.internal, arguments);
      syncFromInternal(this);
      return +this;
    };

    // Assign UTC setter
    TZDateMini.prototype[utcMethod] = function () {
      Date.prototype[utcMethod].apply(this, arguments);
      syncToInternal(this);
      return +this;
    };
  }
});

/**
 * Function syncs time to internal date, applying the time zone offset.
 *
 * @param {Date} date - Date to sync
 */
function syncToInternal(date) {
  date.internal.setTime(+date);
  date.internal.setUTCSeconds(date.internal.getUTCSeconds() - Math.round(-tzOffset(date.timeZone, date) * 60));
}

/**
 * Function syncs the internal date UTC values to the date. It allows to get
 * accurate timestamp value.
 *
 * @param {Date} date - The date to sync
 */
function syncFromInternal(date) {
  // First we transpose the internal values
  Date.prototype.setFullYear.call(date, date.internal.getUTCFullYear(), date.internal.getUTCMonth(), date.internal.getUTCDate());
  Date.prototype.setHours.call(date, date.internal.getUTCHours(), date.internal.getUTCMinutes(), date.internal.getUTCSeconds(), date.internal.getUTCMilliseconds());

  // Now we have to adjust the date to the system time zone
  adjustToSystemTZ(date);
}

/**
 * Function adjusts the date to the system time zone. It uses the time zone
 * differences to calculate the offset and adjust the date.
 *
 * @param {Date} date - Date to adjust
 */
function adjustToSystemTZ(date) {
  // Save the time zone offset before all the adjustments
  const baseOffset = tzOffset(date.timeZone, date);
  // Remove the seconds offset
  // use Math.floor for negative GMT timezones and Math.ceil for positive GMT timezones.
  const offset = baseOffset > 0 ? Math.floor(baseOffset) : Math.ceil(baseOffset);
  //#region System DST adjustment

  // The biggest problem with using the system time zone is that when we create
  // a date from internal values stored in UTC, the system time zone might end
  // up on the DST hour:
  //
  //   $ TZ=America/New_York node
  //   > new Date(2020, 2, 8, 1).toString()
  //   'Sun Mar 08 2020 01:00:00 GMT-0500 (Eastern Standard Time)'
  //   > new Date(2020, 2, 8, 2).toString()
  //   'Sun Mar 08 2020 03:00:00 GMT-0400 (Eastern Daylight Time)'
  //   > new Date(2020, 2, 8, 3).toString()
  //   'Sun Mar 08 2020 03:00:00 GMT-0400 (Eastern Daylight Time)'
  //   > new Date(2020, 2, 8, 4).toString()
  //   'Sun Mar 08 2020 04:00:00 GMT-0400 (Eastern Daylight Time)'
  //
  // Here we get the same hour for both 2 and 3, because the system time zone
  // has DST beginning at 8 March 2020, 2 a.m. and jumps to 3 a.m. So we have
  // to adjust the internal date to reflect that.
  //
  // However we want to adjust only if that's the DST hour the change happenes,
  // not the hour where DST moves to.

  // We calculate the previous hour to see if the time zone offset has changed
  // and we have landed on the DST hour.
  const prevHour = new Date(+date);
  // We use UTC methods here as we don't want to land on the same hour again
  // in case of DST.
  prevHour.setUTCHours(prevHour.getUTCHours() - 1);

  // Calculate if we are on the system DST hour.
  const systemOffset = -new Date(+date).getTimezoneOffset();
  const prevHourSystemOffset = -new Date(+prevHour).getTimezoneOffset();
  const systemDSTChange = systemOffset - prevHourSystemOffset;
  // Detect the DST shift. System DST change will occur both on
  const dstShift = Date.prototype.getHours.apply(date) !== date.internal.getUTCHours();

  // Move the internal date when we are on the system DST hour.
  if (systemDSTChange && dstShift) date.internal.setUTCMinutes(date.internal.getUTCMinutes() + systemDSTChange);

  //#endregion

  //#region System diff adjustment

  // Now we need to adjust the date, since we just applied internal values.
  // We need to calculate the difference between the system and date time zones
  // and apply it to the date.

  const offsetDiff = systemOffset - offset;
  if (offsetDiff) Date.prototype.setUTCMinutes.call(date, Date.prototype.getUTCMinutes.call(date) + offsetDiff);

  //#endregion

  //#region Seconds System diff adjustment

  const systemDate = new Date(+date);
  // Set the UTC seconds to 0 to isolate the timezone offset in seconds.
  systemDate.setUTCSeconds(0);
  // For negative systemOffset, invert the seconds.
  const systemSecondsOffset = systemOffset > 0 ? systemDate.getSeconds() : (systemDate.getSeconds() - 60) % 60;

  // Calculate the seconds offset based on the timezone offset.
  const secondsOffset = Math.round(-(tzOffset(date.timeZone, date) * 60)) % 60;
  if (secondsOffset || systemSecondsOffset) {
    date.internal.setUTCSeconds(date.internal.getUTCSeconds() + secondsOffset);
    Date.prototype.setUTCSeconds.call(date, Date.prototype.getUTCSeconds.call(date) + secondsOffset + systemSecondsOffset);
  }

  //#endregion

  //#region Post-adjustment DST fix

  const postBaseOffset = tzOffset(date.timeZone, date);
  // Remove the seconds offset
  // use Math.floor for negative GMT timezones and Math.ceil for positive GMT timezones.
  const postOffset = postBaseOffset > 0 ? Math.floor(postBaseOffset) : Math.ceil(postBaseOffset);
  const postSystemOffset = -new Date(+date).getTimezoneOffset();
  const postOffsetDiff = postSystemOffset - postOffset;
  const offsetChanged = postOffset !== offset;
  const postDiff = postOffsetDiff - offsetDiff;
  if (offsetChanged && postDiff) {
    Date.prototype.setUTCMinutes.call(date, Date.prototype.getUTCMinutes.call(date) + postDiff);

    // Now we need to check if got offset change during the post-adjustment.
    // If so, we also need both dates to reflect that.

    const newBaseOffset = tzOffset(date.timeZone, date);
    // Remove the seconds offset
    // use Math.floor for negative GMT timezones and Math.ceil for positive GMT timezones.
    const newOffset = newBaseOffset > 0 ? Math.floor(newBaseOffset) : Math.ceil(newBaseOffset);
    const offsetChange = postOffset - newOffset;
    if (offsetChange) {
      date.internal.setUTCMinutes(date.internal.getUTCMinutes() + offsetChange);
      Date.prototype.setUTCMinutes.call(date, Date.prototype.getUTCMinutes.call(date) + offsetChange);
    }
  }

  //#endregion
}