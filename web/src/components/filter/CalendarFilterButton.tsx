import {
  useFormattedRange,
  useFormattedTimestamp,
  useTimezone,
} from "@/hooks/use-date-utils";
import { RecordingsSummary, ReviewSummary } from "@/types/review";
import { Button } from "../ui/button";
import { FaCalendarAlt } from "react-icons/fa";
import ReviewActivityCalendar from "../overlay/ReviewActivityCalendar";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { isMobile } from "react-device-detect";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { DateRangePicker } from "../ui/calendar-range";
import { DateRange } from "react-day-picker";
import { useState } from "react";
import PlatformAwareDialog from "../overlay/dialog/PlatformAwareDialog";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useUserPersistence } from "@/hooks/use-user-persistence";

type CalendarFilterButtonProps = {
  reviewSummary?: ReviewSummary;
  recordingsSummary?: RecordingsSummary;
  day?: Date;
  updateSelectedDay: (day?: Date) => void;
};
export default function CalendarFilterButton({
  reviewSummary,
  recordingsSummary,
  day,
  updateSelectedDay,
}: CalendarFilterButtonProps) {
  const { t } = useTranslation(["components/filter", "views/events"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const [open, setOpen] = useState(false);
  const selectedDate = useFormattedTimestamp(
    day == undefined ? 0 : day?.getTime() / 1000 + 1,
    t("time.formattedTimestampMonthDay", { ns: "common" }),
    config?.ui.timezone,
  );

  const trigger = (
    <Button
      className="flex items-center gap-2"
      aria-label={t("explore.date.selectDateBy.label")}
      variant={day == undefined ? "default" : "select"}
      size="sm"
    >
      <FaCalendarAlt
        className={`${day == undefined ? "text-secondary-foreground" : "text-selected-foreground"}`}
      />
      <div
        className={`hidden md:block ${day == undefined ? "text-primary" : "text-selected-foreground"}`}
      >
        {day == undefined
          ? t("calendarFilter.last24Hours", { ns: "views/events" })
          : selectedDate}
      </div>
    </Button>
  );
  const content = (
    <>
      <ReviewActivityCalendar
        reviewSummary={reviewSummary}
        recordingsSummary={recordingsSummary}
        selectedDay={day}
        onSelect={updateSelectedDay}
      />
      <DropdownMenuSeparator />
      <div className="flex items-center justify-center p-2">
        <Button
          aria-label={t("button.reset", { ns: "common" })}
          onClick={() => {
            updateSelectedDay(undefined);
          }}
        >
          {t("button.reset", { ns: "common" })}
        </Button>
      </div>
    </>
  );

  return (
    <PlatformAwareDialog
      trigger={trigger}
      content={content}
      contentClassName="w-auto"
      open={open}
      onOpenChange={setOpen}
    />
  );
}

type CalendarRangeFilterButtonProps = {
  range?: DateRange;
  defaultText: string;
  updateSelectedRange: (range?: DateRange) => void;
};
export function CalendarRangeFilterButton({
  range,
  defaultText,
  updateSelectedRange,
}: CalendarRangeFilterButtonProps) {
  const { t } = useTranslation(["components/filter"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = useTimezone(config);
  const [weekStartsOn] = useUserPersistence("weekStartsOn", 0);
  const [open, setOpen] = useState(false);

  const selectedDate = useFormattedRange(
    range?.from == undefined ? 0 : range.from.getTime() / 1000 + 1,
    range?.to == undefined ? 0 : range.to.getTime() / 1000 - 1,
    t("time.formattedTimestampMonthDay", { ns: "common" }),
    config?.ui.timezone,
  );

  const trigger = (
    <Button
      className="flex items-center gap-2"
      aria-label={t("explore.date.selectDateBy.label")}
      variant={range == undefined ? "default" : "select"}
      size="sm"
    >
      <FaCalendarAlt
        className={`${range == undefined ? "text-secondary-foreground" : "text-selected-foreground"}`}
      />
      <div
        className={`${range == undefined ? "text-primary" : "text-selected-foreground"}`}
      >
        {range == undefined ? defaultText : selectedDate}
      </div>
    </Button>
  );
  const content = (
    <>
      <DateRangePicker
        initialDateFrom={range?.from}
        initialDateTo={range?.to}
        timezone={timezone}
        showCompare={false}
        weekStartsOn={weekStartsOn}
        onUpdate={(range) => {
          updateSelectedRange(range.range);
          setOpen(false);
        }}
        onReset={() => updateSelectedRange(undefined)}
      />
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>{content}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-auto">{content}</PopoverContent>
    </Popover>
  );
}
