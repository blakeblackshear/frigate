"use strict";

exports.tzScan = tzScan;
var _index = require("../tzOffset/index.cjs");
/**
 * Time interval.
 */

/**
 * Time zone change record.
 */

/**
 * The function scans the time zone for changes in the given interval.
 *
 * @param timeZone - Time zone name (IANA or UTC offset)
 * @param interval - Time interval to scan for changes
 *
 * @returns Array of time zone changes
 */
function tzScan(timeZone, interval) {
  const changes = [];
  const monthDate = new Date(interval.start);
  monthDate.setUTCSeconds(0, 0);
  const endDate = new Date(interval.end);
  endDate.setUTCSeconds(0, 0);
  const endMonthTime = +endDate;
  let lastOffset = (0, _index.tzOffset)(timeZone, monthDate);
  while (+monthDate < endMonthTime) {
    // Month forward
    monthDate.setUTCMonth(monthDate.getUTCMonth() + 1);

    // Find the month where the offset changes
    const offset = (0, _index.tzOffset)(timeZone, monthDate);
    if (offset != lastOffset) {
      // Rewind a month back to find the day where the offset changes
      const dayDate = new Date(monthDate);
      dayDate.setUTCMonth(dayDate.getUTCMonth() - 1);
      const endDayTime = +monthDate;
      lastOffset = (0, _index.tzOffset)(timeZone, dayDate);
      while (+dayDate < endDayTime) {
        // Day forward
        dayDate.setUTCDate(dayDate.getUTCDate() + 1);

        // Find the day where the offset changes
        const offset = (0, _index.tzOffset)(timeZone, dayDate);
        if (offset != lastOffset) {
          // Rewind a day back to find the time where the offset changes
          const hourDate = new Date(dayDate);
          hourDate.setUTCDate(hourDate.getUTCDate() - 1);
          const endHourTime = +dayDate;
          lastOffset = (0, _index.tzOffset)(timeZone, hourDate);
          while (+hourDate < endHourTime) {
            // Hour forward
            hourDate.setUTCHours(hourDate.getUTCHours() + 1);

            // Find the hour where the offset changes
            const hourOffset = (0, _index.tzOffset)(timeZone, hourDate);
            if (hourOffset !== lastOffset) {
              changes.push({
                date: new Date(hourDate),
                change: hourOffset - lastOffset,
                offset: hourOffset
              });
            }
            lastOffset = hourOffset;
          }
        }
        lastOffset = offset;
      }
    }
    lastOffset = offset;
  }
  return changes;
}