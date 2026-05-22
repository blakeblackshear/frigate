import { useCallback, useEffect, useMemo, useState } from "react";
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

function parsePositive(value: string): number {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, n);
}

type Tabs = "duration" | "untilTime";

export default function CustomSuspensionDialog({
  open,
  onOpenChange,
  onConfirm,
}: CustomSuspensionDialogProps) {
  const { t } = useTranslation(["views/settings"]);

  const [tab, setTab] = useState<Tabs>("duration");
  const [hours, setHours] = useState<number>(1);
  const [minutes, setMinutes] = useState<number>(0);
  const [until, setUntil] = useState<Date>(
    () => new Date(Date.now() + ONE_HOUR_MS),
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Reset to defaults whenever the dialog re-opens.
  useEffect(() => {
    if (!open) return;
    setTab("duration");
    setHours(1);
    setMinutes(0);
    setUntil(new Date(Date.now() + ONE_HOUR_MS));
  }, [open]);

  const totalMinutes = useMemo(() => {
    if (tab === "duration") {
      return Math.max(0, Math.floor(hours) * 60 + Math.floor(minutes));
    }
    if (!isValidDate(until)) return 0;
    return Math.ceil((until.getTime() - Date.now()) / 60_000);
  }, [hours, minutes, tab, until]);

  const canApply = useMemo(() => totalMinutes > 0, [totalMinutes]);

  const handleApply = useCallback(() => {
    if (!canApply) return;
    onConfirm(totalMinutes);
    onOpenChange(false);
  }, [canApply, onConfirm, onOpenChange, totalMinutes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("notification.customSuspension.title")}</DialogTitle>
          <DialogDescription>
            {t("notification.customSuspension.description")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tabs)}>
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
                  max={999}
                  value={hours}
                  onChange={(e) => setHours(parsePositive(e.target.value))}
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
                  onChange={(e) => setMinutes(parsePositive(e.target.value))}
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
                      {isValidDate(until)
                        ? until.toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="flex flex-col items-center"
                    disablePortal
                  >
                    <Calendar
                      mode="single"
                      selected={isValidDate(until) ? until : undefined}
                      disabled={{
                        before: new Date(new Date().setHours(0, 0, 0, 0)),
                      }}
                      onSelect={(day) => {
                        if (!day) return;
                        const next = new Date(day);
                        // If `until` is invalid, don't propagate
                        // NaN hours/minutes into the new date - fall back to now.
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
                    // Ignore anything that doesn't parse to a real HH:MM pair.
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
