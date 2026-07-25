import { RecordingsSummary, ReviewSummary } from "@/types/review";
import { Calendar } from "../ui/calendar";
import { ButtonHTMLAttributes, useEffect, useMemo, useRef } from "react";
import { FaCircle } from "react-icons/fa";
import { getUTCOffset } from "@/utils/dateUtil";
import { type DayButtonProps } from "react-day-picker";
import { LAST_24_HOURS_KEY } from "@/types/filter";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import { cn } from "@/lib/utils";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { useTimezone } from "@/hooks/use-date-utils";

type WeekStartsOnType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function formatCalendarDay(day: Date): string {
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayInTimezone(timezone?: string): {
  year: number;
  month: number;
  day: number;
  offset: number;
} {
  const now = new Date();
  const offset = Math.round(getUTCOffset(now, timezone));

  // shifting by the offset makes the UTC getters read the timezone's wall clock
  const wallClock = new Date(now.getTime() + offset * 60000);

  return {
    year: wallClock.getUTCFullYear(),
    month: wallClock.getUTCMonth(),
    day: wallClock.getUTCDate(),
    offset,
  };
}

type ReviewActivityCalendarProps = {
  reviewSummary?: ReviewSummary;
  recordingsSummary?: RecordingsSummary;
  selectedDay?: Date;
  onSelect: (day?: Date) => void;
};
export default function ReviewActivityCalendar({
  reviewSummary,
  recordingsSummary,
  selectedDay,
  onSelect,
}: ReviewActivityCalendarProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = useTimezone(config);
  const [weekStartsOn] = useUserPersistence("weekStartsOn", 0);

  const disabledDates = useMemo(() => {
    // day cells are TZDate in `timezone`, so the cutoff must be a real instant
    const { year, month, day, offset } = getTodayInTimezone(timezone);
    // midday: ranges match by calendar day, so this dodges DST edges
    const from = new Date(Date.UTC(year, month, day + 1, 12) - offset * 60000);
    const to = new Date(from);
    to.setFullYear(from.getFullYear() + 10);
    return { from, to };
  }, [timezone]);

  const modifiers = useMemo(() => {
    const recordingsSet = new Set<string>();
    const alertsSet = new Set<string>();
    const detectionsSet = new Set<string>();

    if (recordingsSummary) {
      for (const date of Object.keys(recordingsSummary)) {
        if (date !== LAST_24_HOURS_KEY) {
          recordingsSet.add(date);
        }
      }
    }

    if (reviewSummary) {
      for (const [date, data] of Object.entries(reviewSummary)) {
        if (date === LAST_24_HOURS_KEY) continue;

        if (data.total_alert > data.reviewed_alert) {
          alertsSet.add(date);
        } else if (data.total_detection > data.reviewed_detection) {
          detectionsSet.add(date);
        }
      }
    }

    return {
      recordings: (day: Date) => recordingsSet.has(formatCalendarDay(day)),
      alerts: (day: Date) => alertsSet.has(formatCalendarDay(day)),
      detections: (day: Date) => detectionsSet.has(formatCalendarDay(day)),
    };
  }, [reviewSummary, recordingsSummary]);

  return (
    <Calendar
      mode="single"
      disabled={disabledDates}
      showOutsideDays={false}
      selected={selectedDay}
      onSelect={onSelect}
      modifiers={modifiers}
      components={{
        DayButton: ReviewActivityDay,
      }}
      defaultMonth={selectedDay ?? new Date()}
      weekStartsOn={(weekStartsOn ?? 0) as WeekStartsOnType}
      timeZone={timezone}
    />
  );
}

function ReviewActivityDay({
  day,
  modifiers,
  ...buttonProps
}: DayButtonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const dayActivity = useMemo(() => {
    if (modifiers["alerts"]) {
      return "alert";
    } else if (modifiers["detections"]) {
      return "detection";
    } else {
      return "none";
    }
  }, [modifiers]);

  return (
    <button ref={ref} {...buttonProps}>
      <div className={cn("flex flex-col items-center justify-center gap-0.5")}>
        <span
          className={cn(
            modifiers["recordings"] ? "text-primary" : "text-primary/40",
          )}
        >
          {day.date.getDate()}
        </span>
        <div
          className={cn(
            "w-4",
            modifiers["recordings"]
              ? "border-b border-primary/60 text-primary"
              : "text-primary/40",
            modifiers.selected && "border-white text-white",
          )}
        />

        <div className="mt-0.5 flex h-2 flex-row gap-0.5">
          {dayActivity != "none" && (
            <FaCircle
              size={6}
              className={cn(
                dayActivity == "alert"
                  ? "fill-severity_alert"
                  : "fill-severity_detection",
              )}
            />
          )}
        </div>
      </div>
    </button>
  );
}

type TimezoneAwareCalendarProps = {
  timezone?: string;
  selectedDay?: Date;
  onSelect: (day?: Date) => void;
  recordingsSummary?: RecordingsSummary;
};
export function TimezoneAwareCalendar({
  timezone,
  selectedDay,
  onSelect,
  recordingsSummary,
}: TimezoneAwareCalendarProps) {
  const [weekStartsOn] = useUserPersistence("weekStartsOn", 0);

  // When a recordings summary is supplied, underline days that have footage
  const recordingsModifier = useMemo(() => {
    if (!recordingsSummary) {
      return undefined;
    }
    const recordingsSet = new Set<string>();
    for (const date of Object.keys(recordingsSummary)) {
      if (date !== LAST_24_HOURS_KEY) {
        recordingsSet.add(date);
      }
    }
    return {
      recordings: (day: Date) => recordingsSet.has(formatCalendarDay(day)),
    };
  }, [recordingsSummary]);

  // callers pre-shift dates so the local clock reads `timezone`, so boundaries
  // are built in local time rather than as instants
  const { year, month, day } = useMemo(
    () => getTodayInTimezone(timezone),
    [timezone],
  );

  const disabledDates = useMemo(() => {
    // midday: ranges match by calendar day, so this dodges DST edges
    const from = new Date(year, month, day + 1, 12);
    const to = new Date(from);
    to.setFullYear(from.getFullYear() + 10);
    return { from, to };
  }, [year, month, day]);

  const today = useMemo(
    () => new Date(year, month, day, 12),
    [year, month, day],
  );

  return (
    <Calendar
      mode="single"
      disabled={disabledDates}
      showOutsideDays={false}
      today={today}
      selected={selectedDay}
      onSelect={onSelect}
      defaultMonth={selectedDay ?? new Date()}
      weekStartsOn={(weekStartsOn ?? 0) as WeekStartsOnType}
      modifiers={recordingsModifier}
      components={
        recordingsModifier ? { DayButton: ReviewActivityDay } : undefined
      }
    />
  );
}
