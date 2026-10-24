import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { Day } from "date-fns";
import type { ReviewDatePreset } from "@/types/review";

/** Calendar periods use wall-clock dates, not multiples of 24 hours (DST). */
export function getReviewPresetRange(
  preset: ReviewDatePreset | undefined,
  now = new Date(),
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  weekStartsOn: Day = 0,
): { after?: number; before?: number } {
  if (!preset) return { after: undefined, before: undefined };

  const [year, month, day] = formatInTimeZone(now, timezone, "yyyy-MM-dd")
    .split("-")
    .map(Number);
  const weekStart = new Date(Date.UTC(year, month - 1, day));
  weekStart.setUTCDate(
    weekStart.getUTCDate() - ((weekStart.getUTCDay() - weekStartsOn + 7) % 7),
  );
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  let start: Date;
  let end: Date | undefined;

  switch (preset) {
    case "currentWeek":
      start = weekStart;
      break;
    case "lastWeek":
      end = weekStart;
      start = new Date(weekStart);
      start.setUTCDate(start.getUTCDate() - 7);
      break;
    case "currentMonth":
      start = monthStart;
      break;
    case "lastMonth":
      end = monthStart;
      start = new Date(Date.UTC(year, month - 2, 1));
      break;
  }

  const midnight = (date: Date) =>
    fromZonedTime(
      `${date.toISOString().slice(0, 10)}T00:00:00`,
      timezone,
    ).getTime() / 1000;

  return {
    after: midnight(start),
    // The API uses an exclusive upper bound; no next-period events leak in.
    before: end ? midnight(end) : Math.floor(now.getTime() / 1000),
  };
}
