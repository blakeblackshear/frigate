import { useEffect, useState } from "react";
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

export default function CustomSuspensionDialog({
  open,
  onOpenChange,
  onConfirm,
}: CustomSuspensionDialogProps) {
  const { t } = useTranslation(["views/settings"]);
  const { data: config } = useSWR<FrigateConfig>("config");

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
    config?.ui.timezone,
  );

  const isFuture = isValidDate(until) && until.getTime() > Date.now();

  const handleApply = () => {
    if (!isFuture) return;
    onConfirm(Math.ceil((until.getTime() - Date.now()) / 60_000));
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
                  timezone={config?.ui.timezone}
                  selectedDay={isValidDate(until) ? until : undefined}
                  disabled={{
                    before: new Date(new Date().setHours(0, 0, 0, 0)),
                  }}
                  onSelect={(day) => {
                    if (!day) return;
                    const next = new Date(day);
                    const carry = isValidDate(until) ? until : new Date();
                    next.setHours(
                      carry.getHours(),
                      carry.getMinutes(),
                      carry.getSeconds(),
                      0,
                    );
                    setUntil(next);
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
                isValidDate(until)
                  ? `${pad(until.getHours())}:${pad(until.getMinutes())}`
                  : ""
              }
              step="60"
              onChange={(e) => {
                const [h, m] = e.target.value.split(":");
                const hh = Number.parseInt(h ?? "", 10);
                const mm = Number.parseInt(m ?? "", 10);
                if (Number.isNaN(hh) || Number.isNaN(mm)) return;
                const base = isValidDate(until) ? until : new Date();
                const next = new Date(base);
                next.setHours(hh, mm, 0, 0);
                setUntil(next);
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
