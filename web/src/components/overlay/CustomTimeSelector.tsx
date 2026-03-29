import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { SelectSeparator } from "../ui/select";
import { TimeRange } from "@/types/timeline";
import { useFormattedTimestamp, use24HourTime } from "@/hooks/use-date-utils";
import { getUTCOffset } from "@/utils/dateUtil";
import { TimezoneAwareCalendar } from "./ReviewActivityCalendar";
import { FaArrowRight, FaCalendarAlt } from "react-icons/fa";
import { isDesktop, isIOS } from "react-device-detect";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useTranslation } from "react-i18next";

type CustomTimeSelectorProps = {
  latestTime: number;
  range?: TimeRange;
  setRange: (range: TimeRange | undefined) => void;
  startLabel: string;
  endLabel: string;
};

export function CustomTimeSelector({
  latestTime,
  range,
  setRange,
  startLabel,
  endLabel,
}: CustomTimeSelectorProps) {
  const { t } = useTranslation(["common"]);
  const { data: config } = useSWR<FrigateConfig>("config");

  // times
  const timezoneOffset = useMemo(
    () =>
      config?.ui.timezone
        ? Math.round(getUTCOffset(new Date(), config.ui.timezone))
        : undefined,
    [config?.ui.timezone],
  );
  const localTimeOffset = useMemo(
    () =>
      Math.round(
        getUTCOffset(
          new Date(),
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        ),
      ),
    [],
  );

  const startTime = useMemo(() => {
    let time = range?.after || latestTime - 3600;

    if (timezoneOffset) {
      time = time + (timezoneOffset - localTimeOffset) * 60;
    }

    return time;
  }, [range, latestTime, timezoneOffset, localTimeOffset]);

  const endTime = useMemo(() => {
    let time = range?.before || latestTime;

    if (timezoneOffset) {
      time = time + (timezoneOffset - localTimeOffset) * 60;
    }

    return time;
  }, [range, latestTime, timezoneOffset, localTimeOffset]);

  const is24Hour = use24HourTime(config);

  const formattedStart = useFormattedTimestamp(
    startTime,
    is24Hour
      ? t("time.formattedTimestamp.24hour")
      : t("time.formattedTimestamp.12hour"),
  );

  const formattedEnd = useFormattedTimestamp(
    endTime,
    is24Hour
      ? t("time.formattedTimestamp.24hour")
      : t("time.formattedTimestamp.12hour"),
  );

  const startClock = useMemo(() => {
    const date = new Date(startTime * 1000);
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  }, [startTime]);

  const endClock = useMemo(() => {
    const date = new Date(endTime * 1000);
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  }, [endTime]);

  // calendars
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  return (
    <div
      className={`mt-3 flex items-center rounded-lg bg-secondary text-secondary-foreground ${isDesktop ? "mx-8 gap-2 px-2" : "pl-2"}`}
    >
      <FaCalendarAlt />
      <div className="flex flex-wrap items-center">
        <Popover
          open={startOpen}
          onOpenChange={(open) => {
            if (!open) {
              setStartOpen(false);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              className={`text-primary ${isDesktop ? "" : "text-xs"}`}
              aria-label={startLabel}
              variant={startOpen ? "select" : "default"}
              size="sm"
              onClick={() => {
                setStartOpen(true);
                setEndOpen(false);
              }}
            >
              {formattedStart}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex flex-col items-center" disablePortal>
            <TimezoneAwareCalendar
              timezone={config?.ui.timezone}
              selectedDay={new Date(startTime * 1000)}
              onSelect={(day) => {
                if (!day) {
                  return;
                }

                setRange({
                  before: endTime,
                  after: day.getTime() / 1000 + 1,
                });
              }}
            />
            <SelectSeparator className="bg-secondary" />
            <input
              className="text-md mx-4 w-full border border-input bg-background p-1 text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
              id="startTime"
              type="time"
              value={startClock}
              step={isIOS ? "60" : "1"}
              onChange={(e) => {
                const clock = e.target.value;
                const [hour, minute, second] = isIOS
                  ? [...clock.split(":"), "00"]
                  : clock.split(":");

                const start = new Date(startTime * 1000);
                start.setHours(
                  parseInt(hour),
                  parseInt(minute),
                  parseInt(second ?? 0),
                  0,
                );
                setRange({
                  before: endTime,
                  after: start.getTime() / 1000,
                });
              }}
            />
          </PopoverContent>
        </Popover>
        <FaArrowRight className="size-4 text-primary" />
        <Popover
          open={endOpen}
          onOpenChange={(open) => {
            if (!open) {
              setEndOpen(false);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              className={`text-primary ${isDesktop ? "" : "text-xs"}`}
              aria-label={endLabel}
              variant={endOpen ? "select" : "default"}
              size="sm"
              onClick={() => {
                setEndOpen(true);
                setStartOpen(false);
              }}
            >
              {formattedEnd}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex flex-col items-center" disablePortal>
            <TimezoneAwareCalendar
              timezone={config?.ui.timezone}
              selectedDay={new Date(endTime * 1000)}
              onSelect={(day) => {
                if (!day) {
                  return;
                }

                setRange({
                  after: startTime,
                  before: day.getTime() / 1000,
                });
              }}
            />
            <SelectSeparator className="bg-secondary" />
            <input
              className="text-md mx-4 w-full border border-input bg-background p-1 text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
              id="endTime"
              type="time"
              value={endClock}
              step={isIOS ? "60" : "1"}
              onChange={(e) => {
                const clock = e.target.value;
                const [hour, minute, second] = isIOS
                  ? [...clock.split(":"), "00"]
                  : clock.split(":");

                const end = new Date(endTime * 1000);
                end.setHours(
                  parseInt(hour),
                  parseInt(minute),
                  parseInt(second ?? 0),
                  0,
                );
                setRange({
                  before: end.getTime() / 1000,
                  after: startTime,
                });
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
