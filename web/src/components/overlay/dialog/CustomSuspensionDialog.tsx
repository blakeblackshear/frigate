import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { isDesktop } from "react-device-detect";
import { FaCalendarAlt } from "react-icons/fa";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { TimezoneAwareCalendar } from "@/components/overlay/ReviewActivityCalendar";
import { FrigateConfig } from "@/types/frigateConfig";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { getUTCOffset } from "@/utils/dateUtil";

type CustomSuspensionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (minutes: number) => void;
};

const ONE_HOUR_MS = 60 * 60 * 1000;

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

// TimezoneAwareCalendar and the time input work with dates whose local clock
// reads the configured ui.timezone, so instants are shifted in and out of it
function wallClockShiftMs(date: Date, timezone?: string): number {
  if (!timezone) return 0;
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    (Math.round(getUTCOffset(date, timezone)) -
      Math.round(getUTCOffset(date, localTimezone))) *
    60_000
  );
}

function toWallClock(instant: Date, timezone?: string): Date {
  return new Date(instant.getTime() + wallClockShiftMs(instant, timezone));
}

function fromWallClock(wallClock: Date, timezone?: string): Date {
  // offsets are measured at an estimate first, since the wall clock itself can
  // sit on the other side of a DST change from the instant it represents
  const estimate = new Date(
    wallClock.getTime() - wallClockShiftMs(wallClock, timezone),
  );
  return new Date(wallClock.getTime() - wallClockShiftMs(estimate, timezone));
}

export default function CustomSuspensionDialog({
  open,
  onOpenChange,
  onConfirm,
}: CustomSuspensionDialogProps) {
  const { t } = useTranslation(["views/settings"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = config?.ui.timezone;

  const [until, setUntil] = useState<Date>(
    () => new Date(Date.now() + ONE_HOUR_MS),
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (open) setUntil(new Date(Date.now() + ONE_HOUR_MS));
  }, [open]);

  const formattedDate = useFormattedTimestamp(
    isValidDate(until) ? Math.floor(until.getTime() / 1000) : 0,
    t("time.formattedTimestampMonthDayYear.24hour", { ns: "common" }),
    timezone,
  );

  const untilWallClock = useMemo(
    () => (isValidDate(until) ? toWallClock(until, timezone) : undefined),
    [until, timezone],
  );

  const startOfTodayWallClock = toWallClock(new Date(), timezone);
  startOfTodayWallClock.setHours(0, 0, 0, 0);

  const isFuture = isValidDate(until) && until.getTime() > Date.now();

  const handleApply = () => {
    const remainingMs = until.getTime() - Date.now();
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
      setUntil(new Date(until));
      return;
    }
    onConfirm(Math.ceil(remainingMs / 60_000));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("notification.customSuspension.title")}</DialogTitle>
          <DialogDescription>
            {t("notification.customSuspension.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label>{t("notification.customSuspension.untilLabel")}</Label>
          <div className="flex items-center gap-2 rounded-lg bg-secondary p-2 text-secondary-foreground">
            <FaCalendarAlt />
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  className={`text-primary ${isDesktop ? "" : "text-xs"}`}
                  variant={calendarOpen ? "select" : "default"}
                  size="sm"
                >
                  {isValidDate(until) ? formattedDate : "—"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="flex flex-col items-center"
                disablePortal
              >
                <TimezoneAwareCalendar
                  timezone={timezone}
                  selectedDay={untilWallClock}
                  disabled={{ before: startOfTodayWallClock }}
                  onSelect={(day) => {
                    if (!day) return;
                    const next = new Date(day);
                    const carry =
                      untilWallClock ?? toWallClock(new Date(), timezone);
                    next.setHours(
                      carry.getHours(),
                      carry.getMinutes(),
                      carry.getSeconds(),
                      0,
                    );
                    setUntil(fromWallClock(next, timezone));
                    setCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            <input
              className="text-md border border-input bg-background p-1 text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
              aria-label={t("notification.customSuspension.untilLabel")}
              type="time"
              value={
                untilWallClock
                  ? `${pad(untilWallClock.getHours())}:${pad(untilWallClock.getMinutes())}`
                  : ""
              }
              step="60"
              onChange={(e) => {
                const [h, m] = e.target.value.split(":");
                const hh = Number.parseInt(h ?? "", 10);
                const mm = Number.parseInt(m ?? "", 10);
                if (Number.isNaN(hh) || Number.isNaN(mm)) return;
                const next = new Date(
                  untilWallClock ?? toWallClock(new Date(), timezone),
                );
                next.setHours(hh, mm, 0, 0);
                setUntil(fromWallClock(next, timezone));
              }}
            />
          </div>
          {!isFuture && (
            <p className="text-sm text-danger">
              {t("notification.customSuspension.invalidTime")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("button.cancel", { ns: "common" })}
          </Button>
          <Button
            variant="select"
            type="button"
            disabled={!isFuture}
            onClick={handleApply}
          >
            {t("button.apply", { ns: "common" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
