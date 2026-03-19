import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { getUTCOffset } from "@/utils/dateUtil";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { TimezoneAwareCalendar } from "./ReviewActivityCalendar";
import { FaCalendarAlt } from "react-icons/fa";
import { isDesktop, isIOS, isMobile } from "react-device-detect";
import { LuShare2 } from "react-icons/lu";
import { useTranslation } from "react-i18next";

type ShareTimestampDialogProps = {
  currentTime: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShareTimestamp: (timestamp: number) => void;
};

export default function ShareTimestampDialog({
  currentTime,
  open,
  onOpenChange,
  onShareTimestamp,
}: Readonly<ShareTimestampDialogProps>) {
  const { t } = useTranslation(["components/dialog"]);
  const [selectedOption, setSelectedOption] = useState<"current" | "custom">(
    "current",
  );
  const [customTimestamp, setCustomTimestamp] = useState(
    Math.floor(currentTime),
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setSelectedOption("current");
        setCustomTimestamp(Math.floor(currentTime));
      }

      onOpenChange(nextOpen);
    },
    [currentTime, onOpenChange],
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
          <DialogTitle>
            {t("recording.shareTimestamp.title", { ns: "components/dialog" })}
          </DialogTitle>
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
};

function ShareTimestampContent({
  currentTime,
  selectedOption,
  setSelectedOption,
  customTimestamp,
  setCustomTimestamp,
  onShareTimestamp,
}: ShareTimestampContentProps) {
  const { t } = useTranslation(["common"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const currentTimestampLabel = useFormattedTimestamp(
    currentTime,
    config?.ui.time_format == "24hour"
      ? t("time.formattedTimestamp.24hour")
      : t("time.formattedTimestamp.12hour"),
    config?.ui.timezone,
  );
  const selectedTimestamp =
    selectedOption === "current" ? currentTime : customTimestamp;

  return (
    <div className="w-full">
      <div className="space-y-1">
        <div className="text-sm font-medium">Share Review Timestamp</div>
        <div className="text-sm text-muted-foreground">
          Share the current player position or choose a custom timestamp.
        </div>
      </div>

      <RadioGroup
        className="mt-4 flex flex-col gap-4"
        value={selectedOption}
        onValueChange={(value) =>
          setSelectedOption(value as "current" | "custom")
        }
      >
        <div className="space-y-2 rounded-lg border bg-secondary/40 p-3">
          <div className="flex items-start gap-2">
            <RadioGroupItem id="share-current" value="current" />
            <Label className="cursor-pointer space-y-1" htmlFor="share-current">
              <div className="text-sm font-medium">
                Current Player Timestamp
              </div>
              <div className="text-sm text-muted-foreground">
                {currentTimestampLabel}
              </div>
            </Label>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-secondary/40 p-3">
          <div className="flex items-start gap-2">
            <RadioGroupItem id="share-custom" value="custom" />
            <Label className="cursor-pointer space-y-1" htmlFor="share-custom">
              <div className="text-sm font-medium">Custom Timestamp</div>
              <div className="text-sm text-muted-foreground">
                Pick a specific point in time to share.
              </div>
            </Label>
          </div>
          {selectedOption === "custom" && (
            <CustomTimestampSelector
              timestamp={customTimestamp}
              setTimestamp={setCustomTimestamp}
              label="Custom Timestamp"
            />
          )}
        </div>
      </RadioGroup>

      <div className="mt-4">
        <Button
          className="w-full justify-between gap-3"
          variant="select"
          onClick={() => onShareTimestamp(Math.floor(selectedTimestamp))}
        >
          <span>Share Timestamp Link</span>
          <LuShare2 className="size-4" />
        </Button>
      </div>
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
}: CustomTimestampSelectorProps) {
  const { t } = useTranslation(["common"]);
  const { data: config } = useSWR<FrigateConfig>("config");

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

    return (timezoneOffset - localTimeOffset) * 60;
  }, [timezoneOffset, localTimeOffset]);

  const displayTimestamp = useMemo(
    () => timestamp + offsetDeltaSeconds,
    [timestamp, offsetDeltaSeconds],
  );

  const formattedTimestamp = useFormattedTimestamp(
    displayTimestamp,
    config?.ui.time_format == "24hour"
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
      setTimestamp(date.getTime() / 1000 - offsetDeltaSeconds);
    },
    [offsetDeltaSeconds, setTimestamp],
  );

  return (
    <div
      className={`flex items-center rounded-lg bg-secondary text-secondary-foreground ${isDesktop ? "gap-2 px-2" : "pl-2"}`}
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
              className={`text-primary ${isDesktop ? "" : "text-xs"}`}
              aria-label={label}
              variant={selectorOpen ? "select" : "default"}
              size="sm"
              onClick={() => setSelectorOpen(true)}
            >
              {formattedTimestamp}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex flex-col items-center" disablePortal>
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
                  parseInt(hour),
                  parseInt(minute),
                  parseInt(second ?? "0"),
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
