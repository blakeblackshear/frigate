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
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24, -1, 0, 0);
    const future = new Date();
    future.setFullYear(tomorrow.getFullYear() + 10);
    return { from: tomorrow, to: future };
  }, []);

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

    const formatDay = (day: Date) => {
      const y = day.getFullYear();
      const m = String(day.getMonth() + 1).padStart(2, "0");
      const d = String(day.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    return {
      recordings: (day: Date) => recordingsSet.has(formatDay(day)),
      alerts: (day: Date) => alertsSet.has(formatDay(day)),
      detections: (day: Date) => detectionsSet.has(formatDay(day)),
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
};
export function TimezoneAwareCalendar({
  timezone,
  selectedDay,
  onSelect,
}: TimezoneAwareCalendarProps) {
  const [weekStartsOn] = useUserPersistence("weekStartsOn", 0);

  const timezoneOffset = useMemo(
    () =>
      timezone ? Math.round(getUTCOffset(new Date(), timezone)) : undefined,
    [timezone],
  );
  const disabledDates = useMemo(() => {
    const tomorrow = new Date();

    if (timezoneOffset) {
      tomorrow.setHours(
        tomorrow.getHours() + 24,
        tomorrow.getMinutes() + timezoneOffset,
        0,
        0,
      );
    } else {
      tomorrow.setHours(tomorrow.getHours() + 24, -1, 0, 0);
    }

    const future = new Date();
    future.setFullYear(tomorrow.getFullYear() + 10);
    return { from: tomorrow, to: future };
  }, [timezoneOffset]);

  const today = useMemo(() => {
    if (!timezoneOffset) {
      return undefined;
    }

    const date = new Date();
    const utc = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
    );
    const todayUtc = new Date(utc);
    todayUtc.setMinutes(todayUtc.getMinutes() + timezoneOffset, 0, 0);
    return todayUtc;
  }, [timezoneOffset]);

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
    />
  );
}
