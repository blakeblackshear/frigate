import { RecordingsSummary, ReviewSummary } from "@/types/review";
import { Calendar } from "../ui/calendar";
import { useMemo } from "react";
import { FaCircle } from "react-icons/fa";
import { getUTCOffset } from "@/utils/dateUtil";
import { type DayContentProps } from "react-day-picker";
import { LAST_24_HOURS_KEY } from "@/types/filter";
import { usePersistence } from "@/hooks/use-persistence";
import { cn } from "@/lib/utils";

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
  const [weekStartsOn] = usePersistence("weekStartsOn", 0);

  const disabledDates = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24, -1, 0, 0);
    const future = new Date();
    future.setFullYear(tomorrow.getFullYear() + 10);
    return { from: tomorrow, to: future };
  }, []);

  const modifiers = useMemo(() => {
    const recordings: Date[] = [];
    const alerts: Date[] = [];
    const detections: Date[] = [];

    // Handle recordings
    if (recordingsSummary) {
      Object.keys(recordingsSummary).forEach((date) => {
        if (date === LAST_24_HOURS_KEY) {
          return;
        }

        const parts = date.split("-");
        const cal = new Date(date);

        cal.setFullYear(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
        );

        recordings.push(cal);
      });
    }

    // Handle reviews if present
    if (reviewSummary) {
      Object.entries(reviewSummary).forEach(([date, data]) => {
        if (date === LAST_24_HOURS_KEY) {
          return;
        }

        const parts = date.split("-");
        const cal = new Date(date);

        cal.setFullYear(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
        );

        if (data.total_alert > data.reviewed_alert) {
          alerts.push(cal);
        } else if (data.total_detection > data.reviewed_detection) {
          detections.push(cal);
        }
      });
    }

    return { alerts, detections, recordings };
  }, [reviewSummary, recordingsSummary]);

  return (
    <Calendar
      key={selectedDay ? selectedDay.toISOString() : "reset"}
      mode="single"
      disabled={disabledDates}
      showOutsideDays={false}
      selected={selectedDay}
      onSelect={onSelect}
      modifiers={modifiers}
      components={{
        DayContent: ReviewActivityDay,
      }}
      defaultMonth={selectedDay ?? new Date()}
      weekStartsOn={(weekStartsOn ?? 0) as WeekStartsOnType}
    />
  );
}

function ReviewActivityDay({ date, activeModifiers }: DayContentProps) {
  const dayActivity = useMemo(() => {
    if (activeModifiers["alerts"]) {
      return "alert";
    } else if (activeModifiers["detections"]) {
      return "detection";
    } else {
      return "none";
    }
  }, [activeModifiers]);

  return (
    <div className={cn("flex flex-col items-center justify-center gap-0.5")}>
      <span
        className={cn(
          "w-4",
          activeModifiers["recordings"]
            ? "border-b border-primary/60 text-primary"
            : "text-primary/40",
          activeModifiers.selected && "border-white text-white",
        )}
      >
        {date.getDate()}
      </span>
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
  const [weekStartsOn] = usePersistence("weekStartsOn", 0);

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
      key={selectedDay ? selectedDay.toISOString() : "reset"}
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
