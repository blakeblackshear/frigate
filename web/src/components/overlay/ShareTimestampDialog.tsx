import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useFormattedTimestamp, useTimeFormat } from "@/hooks/use-date-utils";
import { cn } from "@/lib/utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { getUTCOffset } from "@/utils/dateUtil";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { TimezoneAwareCalendar } from "./ReviewActivityCalendar";
import { FaCalendarAlt } from "react-icons/fa";
import { isDesktop, isIOS, isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";

type ShareTimestampDialogProps = {
  currentTime: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOption: "current" | "custom";
  setSelectedOption: (option: "current" | "custom") => void;
  customTimestamp: number;
  setCustomTimestamp: (timestamp: number) => void;
  onShareTimestamp: (timestamp: number) => void;
};

export default function ShareTimestampDialog({
  currentTime,
  open,
  onOpenChange,
  selectedOption,
  setSelectedOption,
  customTimestamp,
  setCustomTimestamp,
  onShareTimestamp,
}: Readonly<ShareTimestampDialogProps>) {
  const { t } = useTranslation(["components/dialog"]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => onOpenChange(nextOpen),
    [onOpenChange],
  );

  const content = (
    <ShareTimestampContent
      currentTime={currentTime}
      selectedOption={selectedOption}
      setSelectedOption={setSelectedOption}
      customTimestamp={customTimestamp}
      setCustomTimestamp={setCustomTimestamp}
      onShareTimestamp={(timestamp) => {
        onShareTimestamp(timestamp);
        onOpenChange(false);
      }}
      onCancel={() => onOpenChange(false)}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="mx-4 rounded-lg px-4 pb-4 md:rounded-2xl">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:rounded-lg md:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="whitespace-nowrap">
            {t("recording.shareTimestamp.title", { ns: "components/dialog" })}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("recording.shareTimestamp.description", {
              ns: "components/dialog",
            })}
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

type ShareTimestampContentProps = {
  currentTime: number;
  selectedOption: "current" | "custom";
  setSelectedOption: (option: "current" | "custom") => void;
  customTimestamp: number;
  setCustomTimestamp: (timestamp: number) => void;
  onShareTimestamp: (timestamp: number) => void;
  onCancel?: () => void;
};

export function ShareTimestampContent({
  currentTime,
  selectedOption,
  setSelectedOption,
  customTimestamp,
  setCustomTimestamp,
  onShareTimestamp,
  onCancel,
}: Readonly<ShareTimestampContentProps>) {
  const { t } = useTranslation(["common", "components/dialog"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const timeFormat = useTimeFormat(config);
  const currentTimestampLabel = useFormattedTimestamp(
    currentTime,
    timeFormat == "24hour"
      ? t("time.formattedTimestamp.24hour")
      : t("time.formattedTimestamp.12hour"),
    config?.ui.timezone,
  );
  const selectedTimestamp =
    selectedOption === "current" ? currentTime : customTimestamp;

  return (
    <div className="w-full">
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">
          {t("recording.shareTimestamp.description", {
            ns: "components/dialog",
          })}
        </div>
      </div>

      {isDesktop && <Separator className="my-4 bg-secondary" />}

      <RadioGroup
        className="mt-4 flex flex-col gap-4"
        value={selectedOption}
        onValueChange={(value) =>
          setSelectedOption(value as "current" | "custom")
        }
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem
            className={
              selectedOption == "current"
                ? "bg-selected from-selected/50 to-selected/90 text-selected"
                : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
            }
            id="share-current"
            value="current"
          />
          <Label className="cursor-pointer text-sm" htmlFor="share-current">
            {currentTimestampLabel}
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <RadioGroupItem
            className={
              selectedOption == "custom"
                ? "bg-selected from-selected/50 to-selected/90 text-selected"
                : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
            }
            id="share-custom"
            value="custom"
          />
          <div className="space-y-3">
            <Label className="cursor-pointer text-sm" htmlFor="share-custom">
              {t("recording.shareTimestamp.custom", {
                ns: "components/dialog",
              })}
            </Label>
            {selectedOption === "custom" && (
              <CustomTimestampSelector
                timestamp={customTimestamp}
                setTimestamp={setCustomTimestamp}
                label={t("recording.shareTimestamp.custom", {
                  ns: "components/dialog",
                })}
              />
            )}
          </div>
        </div>
      </RadioGroup>

      {isDesktop && <Separator className="my-4 bg-secondary" />}

      <DialogFooter
        className={cn("mt-4", !isDesktop && "flex flex-col-reverse gap-4")}
      >
        {onCancel && (
          <button
            type="button"
            className={cn(
              "cursor-pointer p-2 text-center",
              !isDesktop && "w-full",
            )}
            onClick={onCancel}
          >
            {t("button.cancel", { ns: "common" })}
          </button>
        )}
        <Button
          className={cn(!isDesktop && "w-full")}
          variant="select"
          size="sm"
          onClick={() => onShareTimestamp(Math.floor(selectedTimestamp))}
        >
          {t("recording.shareTimestamp.button", { ns: "components/dialog" })}
        </Button>
      </DialogFooter>
    </div>
  );
}

type CustomTimestampSelectorProps = {
  timestamp: number;
  setTimestamp: (timestamp: number) => void;
  label: string;
};

function CustomTimestampSelector({
  timestamp,
  setTimestamp,
  label,
}: Readonly<CustomTimestampSelectorProps>) {
  const { t } = useTranslation(["common"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const timeFormat = useTimeFormat(config);

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
  const offsetDeltaSeconds = useMemo(() => {
    if (timezoneOffset === undefined) {
      return 0;
    }

    // the picker edits a timestamp in the configured UI timezone,
    // but the stored value remains a unix timestamp
    return (timezoneOffset - localTimeOffset) * 60;
  }, [timezoneOffset, localTimeOffset]);

  const displayTimestamp = useMemo(
    () => timestamp + offsetDeltaSeconds,
    [timestamp, offsetDeltaSeconds],
  );

  const formattedTimestamp = useFormattedTimestamp(
    displayTimestamp,
    timeFormat == "24hour"
      ? t("time.formattedTimestamp.24hour")
      : t("time.formattedTimestamp.12hour"),
  );

  const clock = useMemo(() => {
    const date = new Date(displayTimestamp * 1000);
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  }, [displayTimestamp]);

  const [selectorOpen, setSelectorOpen] = useState(false);

  const setFromDisplayDate = useCallback(
    (date: Date) => {
      // convert the edited display time back into the underlying Unix timestamp
      setTimestamp(date.getTime() / 1000 - offsetDeltaSeconds);
    },
    [offsetDeltaSeconds, setTimestamp],
  );

  return (
    <div
      className={cn(
        "flex items-center rounded-lg bg-secondary text-secondary-foreground",
        isDesktop ? "gap-2 px-2" : "pl-2",
      )}
    >
      <FaCalendarAlt />
      <div className="flex flex-wrap items-center">
        <Popover
          open={selectorOpen}
          onOpenChange={(open) => {
            if (!open) {
              setSelectorOpen(false);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              className={cn("text-primary", !isDesktop && "text-xs")}
              aria-label={label}
              variant={selectorOpen ? "select" : "default"}
              size="sm"
              onClick={() => setSelectorOpen(true)}
            >
              {formattedTimestamp}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex flex-col items-center">
            <TimezoneAwareCalendar
              timezone={config?.ui.timezone}
              selectedDay={new Date(displayTimestamp * 1000)}
              onSelect={(day) => {
                if (!day) {
                  return;
                }

                const nextTimestamp = new Date(displayTimestamp * 1000);
                nextTimestamp.setFullYear(
                  day.getFullYear(),
                  day.getMonth(),
                  day.getDate(),
                );
                setFromDisplayDate(nextTimestamp);
              }}
            />
            <div className="my-3 h-px w-full bg-secondary" />
            <input
              className="text-md mx-4 w-full border border-input bg-background p-1 text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
              id="shareTimestamp"
              type="time"
              value={clock}
              step={isIOS ? "60" : "1"}
              onChange={(e) => {
                const nextClock = e.target.value;
                const [hour, minute, second] = isIOS
                  ? [...nextClock.split(":"), "00"]
                  : nextClock.split(":");
                const nextTimestamp = new Date(displayTimestamp * 1000);
                nextTimestamp.setHours(
                  Number.parseInt(hour),
                  Number.parseInt(minute),
                  Number.parseInt(second ?? "0"),
                  0,
                );
                setFromDisplayDate(nextTimestamp);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
