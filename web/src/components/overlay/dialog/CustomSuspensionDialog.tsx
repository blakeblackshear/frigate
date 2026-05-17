import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { isDesktop } from "react-device-detect";
import { FaCalendarAlt } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { FrigateConfig } from "@/types/frigateConfig";
import { getUTCOffset } from "@/utils/dateUtil";

type CustomSuspensionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (minutes: number) => void;
  config?: FrigateConfig;
};

export default function CustomSuspensionDialog({
  open,
  onOpenChange,
  onConfirm,
  config,
}: CustomSuspensionDialogProps) {
  const { t } = useTranslation(["views/settings"]);

  const [tab, setTab] = useState<"duration" | "untilTime">("duration");

  // duration tab state
  const [hours, setHours] = useState<number>(1);
  const [minutes, setMinutes] = useState<number>(0);

  // until-time tab state — epoch seconds in UI-timezone-adjusted frame,
  // matching the pattern used by CustomTimeSelector.
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

  const initialUntilEpoch = () => {
    let epoch = Math.floor(Date.now() / 1000) + 3600;
    if (timezoneOffset !== undefined) {
      epoch = epoch + (timezoneOffset - localTimeOffset) * 60;
    }
    return epoch;
  };

  const [untilEpoch, setUntilEpoch] = useState<number>(initialUntilEpoch);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTab("duration");
      setHours(1);
      setMinutes(0);
      setUntilEpoch(initialUntilEpoch());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const clockText = useMemo(() => {
    const date = new Date(untilEpoch * 1000);
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }, [untilEpoch]);

  const dateText = useMemo(() => {
    const date = new Date(untilEpoch * 1000);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [untilEpoch]);

  const totalMinutes = useMemo(() => {
    if (tab === "duration") {
      return Math.max(0, Math.floor(hours) * 60 + Math.floor(minutes));
    }
    // until-time: undo the TZ shift to get the real target epoch, then diff now.
    let realEpoch = untilEpoch;
    if (timezoneOffset !== undefined) {
      realEpoch = untilEpoch - (timezoneOffset - localTimeOffset) * 60;
    }
    const nowEpoch = Math.floor(Date.now() / 1000);
    return Math.ceil((realEpoch - nowEpoch) / 60);
  }, [tab, hours, minutes, untilEpoch, timezoneOffset, localTimeOffset]);

  const canApply = totalMinutes > 0;

  const handleApply = () => {
    if (!canApply) return;
    onConfirm(totalMinutes);
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

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "duration" | "untilTime")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="duration">
              {t("notification.customSuspension.tabDuration")}
            </TabsTrigger>
            <TabsTrigger value="untilTime">
              {t("notification.customSuspension.tabUntilTime")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="duration" className="pt-4">
            <div className="flex gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="suspend-hours">
                  {t("notification.customSuspension.hours")}
                </Label>
                <Input
                  id="suspend-hours"
                  type="number"
                  min={0}
                  max={168}
                  value={hours}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10);
                    setHours(Number.isNaN(n) ? 0 : Math.max(0, n));
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="suspend-minutes">
                  {t("notification.customSuspension.minutes")}
                </Label>
                <Input
                  id="suspend-minutes"
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10);
                    setMinutes(
                      Number.isNaN(n) ? 0 : Math.min(59, Math.max(0, n)),
                    );
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="untilTime" className="pt-4">
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
                      {dateText}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="flex flex-col items-center"
                    disablePortal
                  >
                    <Calendar
                      mode="single"
                      selected={new Date(untilEpoch * 1000)}
                      disabled={{
                        before: new Date(new Date().setHours(0, 0, 0, 0)),
                      }}
                      onSelect={(day) => {
                        if (!day) return;
                        const current = new Date(untilEpoch * 1000);
                        const next = new Date(day);
                        next.setHours(
                          current.getHours(),
                          current.getMinutes(),
                          current.getSeconds(),
                          0,
                        );
                        setUntilEpoch(Math.floor(next.getTime() / 1000));
                        setCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <input
                  className="text-md border border-input bg-background p-1 text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                  aria-label={t("notification.customSuspension.untilLabel")}
                  type="time"
                  value={clockText}
                  step="60"
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":");
                    const next = new Date(untilEpoch * 1000);
                    next.setHours(
                      Number.parseInt(h ?? "0", 10),
                      Number.parseInt(m ?? "0", 10),
                      0,
                      0,
                    );
                    setUntilEpoch(Math.floor(next.getTime() / 1000));
                  }}
                />
              </div>
              {!canApply && (
                <p className="text-sm text-danger">
                  {t("notification.customSuspension.invalidTime")}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("notification.customSuspension.cancel")}
          </Button>
          <Button
            variant="select"
            type="button"
            disabled={!canApply}
            onClick={handleApply}
          >
            {t("notification.customSuspension.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
