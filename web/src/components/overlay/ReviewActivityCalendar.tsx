import { ReviewSummary } from "@/types/review";
import { Calendar } from "../ui/calendar";
import { useMemo } from "react";
import { FaCircle } from "react-icons/fa";
import { getUTCOffset } from "@/utils/dateUtil";

type ReviewActivityCalendarProps = {
  reviewSummary?: ReviewSummary;
  selectedDay?: Date;
  onSelect: (day?: Date) => void;
};
export default function ReviewActivityCalendar({
  reviewSummary,
  selectedDay,
  onSelect,
}: ReviewActivityCalendarProps) {
  const disabledDates = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24, -1, 0, 0);
    const future = new Date();
    future.setFullYear(tomorrow.getFullYear() + 10);
    return { from: tomorrow, to: future };
  }, []);

  return (
    <Calendar
      mode="single"
      disabled={disabledDates}
      showOutsideDays={false}
      selected={selectedDay}
      onSelect={onSelect}
      components={{
        DayContent: (date) => (
          <ReviewActivityDay reviewSummary={reviewSummary} day={date.date} />
        ),
      }}
    />
  );
}

type ReviewActivityDayProps = {
  reviewSummary?: ReviewSummary;
  day: Date;
};
function ReviewActivityDay({ reviewSummary, day }: ReviewActivityDayProps) {
  const dayActivity = useMemo(() => {
    if (!reviewSummary) {
      return "none";
    }

    const allActivity =
      reviewSummary[
        `${day.getFullYear()}-${("0" + (day.getMonth() + 1)).slice(-2)}-${("0" + day.getDate()).slice(-2)}`
      ];

    if (!allActivity) {
      return "none";
    }

    if (allActivity.total_alert > allActivity.reviewed_alert) {
      return "alert";
    } else if (allActivity.total_detection > allActivity.reviewed_detection) {
      return "detection";
    } else {
      return "none";
    }
  }, [reviewSummary, day]);

  return (
    <div className="flex flex-col items-center justify-center">
      {day.getDate()}
      {dayActivity != "none" && (
        <FaCircle
          className={`size-2 ${dayActivity == "alert" ? "fill-severity_alert" : "fill-severity_detection"}`}
        />
      )}
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
    />
  );
}
