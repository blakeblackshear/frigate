import { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Button } from "../ui/button";
import { ExportMode } from "@/types/filter";
import { FaArrowDown, FaArrowRight, FaCalendarAlt } from "react-icons/fa";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { TimeRange } from "@/types/timeline";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { TimezoneAwareCalendar } from "./ReviewActivityCalendar";
import { SelectSeparator } from "../ui/select";
import { isDesktop, isIOS, isMobile } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import SaveExportOverlay from "./SaveExportOverlay";
import { getUTCOffset } from "@/utils/dateUtil";
import { baseUrl } from "@/api/baseUrl";
import { cn } from "@/lib/utils";
import { GenericVideoPlayer } from "../player/GenericVideoPlayer";
import { useTranslation } from "react-i18next";

const EXPORT_OPTIONS = [
  "1",
  "4",
  "8",
  "12",
  "24",
  "timeline",
  "custom",
] as const;
type ExportOption = (typeof EXPORT_OPTIONS)[number];

type ExportDialogProps = {
  camera: string;
  latestTime: number;
  currentTime: number;
  range?: TimeRange;
  mode: ExportMode;
  showPreview: boolean;
  setRange: (range: TimeRange | undefined) => void;
  setMode: (mode: ExportMode) => void;
  setShowPreview: (showPreview: boolean) => void;
};
export default function ExportDialog({
  camera,
  latestTime,
  currentTime,
  range,
  mode,
  showPreview,
  setRange,
  setMode,
  setShowPreview,
}: ExportDialogProps) {
  const { t } = useTranslation(["components/dialog"]);
  const [name, setName] = useState("");

  const onStartExport = useCallback(() => {
    if (!range) {
      toast.error(t("export.toast.error.noVaildTimeSelected"), {
        position: "top-center",
      });
      return;
    }

    if (range.before < range.after) {
      toast.error(t("export.toast.error.endTimeMustAfterStartTime"), {
        position: "top-center",
      });
      return;
    }

    axios
      .post(
        `export/${camera}/start/${Math.round(range.after)}/end/${Math.round(range.before)}`,
        {
          playback: "realtime",
          name,
        },
      )
      .then((response) => {
        if (response.status == 200) {
          toast.success(t("export.toast.success"), {
            position: "top-center",
            action: (
              <a href="/export" target="_blank" rel="noopener noreferrer">
                <Button>{t("export.toast.view")}</Button>
              </a>
            ),
          });
          setName("");
          setRange(undefined);
          setMode("none");
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("export.toast.error.failed", {
            error: errorMessage,
          }),
          { position: "top-center" },
        );
      });
  }, [camera, name, range, setRange, setName, setMode, t]);

  const handleCancel = useCallback(() => {
    setName("");
    setMode("none");
    setRange(undefined);
  }, [setMode, setRange]);

  const Overlay = isDesktop ? Dialog : Drawer;
  const Trigger = isDesktop ? DialogTrigger : DrawerTrigger;
  const Content = isDesktop ? DialogContent : DrawerContent;

  return (
    <>
      <ExportPreviewDialog
        camera={camera}
        range={range}
        showPreview={showPreview}
        setShowPreview={setShowPreview}
      />
      <SaveExportOverlay
        className="pointer-events-none absolute left-1/2 top-8 z-50 -translate-x-1/2"
        show={mode == "timeline"}
        onPreview={() => setShowPreview(true)}
        onSave={() => onStartExport()}
        onCancel={handleCancel}
      />
      <Overlay
        open={mode == "select"}
        onOpenChange={(open) => {
          if (!open) {
            setMode("none");
          }
        }}
      >
        <Trigger asChild>
          <Button
            className="flex items-center gap-2"
            aria-label={t("menu.export", { ns: "common" })}
            size="sm"
            onClick={() => {
              const now = new Date(latestTime * 1000);
              let start = 0;
              now.setHours(now.getHours() - 1);
              start = now.getTime() / 1000;
              setRange({
                before: latestTime,
                after: start,
              });
              setMode("select");
            }}
          >
            <FaArrowDown className="rounded-md bg-secondary-foreground fill-secondary p-1" />
            {isDesktop && (
              <div className="text-primary">
                {t("menu.export", { ns: "common" })}
              </div>
            )}
          </Button>
        </Trigger>
        <Content
          className={
            isDesktop
              ? "sm:rounded-lg md:rounded-2xl"
              : "mx-4 rounded-lg px-4 pb-4 md:rounded-2xl"
          }
        >
          <ExportContent
            latestTime={latestTime}
            currentTime={currentTime}
            range={range}
            name={name}
            onStartExport={onStartExport}
            setName={setName}
            setRange={setRange}
            setMode={setMode}
            onCancel={handleCancel}
          />
        </Content>
      </Overlay>
    </>
  );
}

type ExportContentProps = {
  latestTime: number;
  currentTime: number;
  range?: TimeRange;
  name: string;
  onStartExport: () => void;
  setName: (name: string) => void;
  setRange: (range: TimeRange | undefined) => void;
  setMode: (mode: ExportMode) => void;
  onCancel: () => void;
};
export function ExportContent({
  latestTime,
  currentTime,
  range,
  name,
  onStartExport,
  setName,
  setRange,
  setMode,
  onCancel,
}: ExportContentProps) {
  const { t } = useTranslation(["components/dialog"]);
  const [selectedOption, setSelectedOption] = useState<ExportOption>("1");

  const onSelectTime = useCallback(
    (option: ExportOption) => {
      setSelectedOption(option);

      const now = new Date(latestTime * 1000);
      let start = 0;
      switch (option) {
        case "1":
          now.setHours(now.getHours() - 1);
          start = now.getTime() / 1000;
          break;
        case "4":
          now.setHours(now.getHours() - 4);
          start = now.getTime() / 1000;
          break;
        case "8":
          now.setHours(now.getHours() - 8);
          start = now.getTime() / 1000;
          break;
        case "12":
          now.setHours(now.getHours() - 12);
          start = now.getTime() / 1000;
          break;
        case "24":
          now.setHours(now.getHours() - 24);
          start = now.getTime() / 1000;
          break;
        case "custom":
          start = latestTime - 3600;
          break;
      }

      setRange({
        before: latestTime,
        after: start,
      });
    },
    [latestTime, setRange],
  );

  return (
    <div className="w-full">
      {isDesktop && (
        <>
          <DialogHeader>
            <DialogTitle>{t("menu.export", { ns: "common" })}</DialogTitle>
          </DialogHeader>
          <SelectSeparator className="my-4 bg-secondary" />
        </>
      )}
      <RadioGroup
        className={`flex flex-col gap-4 ${isDesktop ? "" : "mt-4"}`}
        onValueChange={(value) => onSelectTime(value as ExportOption)}
      >
        {EXPORT_OPTIONS.map((opt) => {
          return (
            <div key={opt} className="flex items-center gap-2">
              <RadioGroupItem
                className={
                  opt == selectedOption
                    ? "bg-selected from-selected/50 to-selected/90 text-selected"
                    : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                }
                id={opt}
                value={opt}
              />
              <Label className="cursor-pointer smart-capitalize" htmlFor={opt}>
                {isNaN(parseInt(opt))
                  ? opt == "timeline"
                    ? t("export.time.fromTimeline")
                    : t("export.time." + opt)
                  : t("export.time.lastHour", {
                      count: parseInt(opt),
                    })}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
      {selectedOption == "custom" && (
        <CustomTimeSelector
          latestTime={latestTime}
          range={range}
          setRange={setRange}
        />
      )}
      <Input
        className="text-md my-6"
        type="search"
        placeholder={t("export.name.placeholder")}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {isDesktop && <SelectSeparator className="my-4 bg-secondary" />}
      <DialogFooter
        className={isDesktop ? "" : "mt-3 flex flex-col-reverse gap-4"}
      >
        <div
          className={`cursor-pointer p-2 text-center ${isDesktop ? "" : "w-full"}`}
          onClick={onCancel}
        >
          {t("button.cancel", { ns: "common" })}
        </div>
        <Button
          className={isDesktop ? "" : "w-full"}
          aria-label={t("export.selectOrExport")}
          variant="select"
          size="sm"
          onClick={() => {
            if (selectedOption == "timeline") {
              setRange({ before: currentTime + 30, after: currentTime - 30 });
              setMode("timeline");
            } else {
              onStartExport();
              setSelectedOption("1");
              setMode("none");
            }
          }}
        >
          {selectedOption == "timeline"
            ? t("export.select")
            : t("export.export")}
        </Button>
      </DialogFooter>
    </div>
  );
}

type CustomTimeSelectorProps = {
  latestTime: number;
  range?: TimeRange;
  setRange: (range: TimeRange | undefined) => void;
};
function CustomTimeSelector({
  latestTime,
  range,
  setRange,
}: CustomTimeSelectorProps) {
  const { t } = useTranslation(["components/dialog"]);
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
  const formattedStart = useFormattedTimestamp(
    startTime,
    config?.ui.time_format == "24hour"
      ? t("time.formattedTimestamp.24hour", { ns: "common" })
      : t("time.formattedTimestamp.12hour", { ns: "common" }),
  );
  const formattedEnd = useFormattedTimestamp(
    endTime,
    config?.ui.time_format == "24hour"
      ? t("time.formattedTimestamp.24hour", { ns: "common" })
      : t("time.formattedTimestamp.12hour", { ns: "common" }),
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
          modal={false}
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
              aria-label={t("export.time.start.title")}
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
          <PopoverContent
            disablePortal={isDesktop}
            className="flex flex-col items-center"
          >
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
          modal={false}
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
              aria-label={t("export.time.end.title")}
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
          <PopoverContent
            disablePortal={isDesktop}
            className="flex flex-col items-center"
          >
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

type ExportPreviewDialogProps = {
  camera: string;
  range?: TimeRange;
  showPreview: boolean;
  setShowPreview: (showPreview: boolean) => void;
};

export function ExportPreviewDialog({
  camera,
  range,
  showPreview,
  setShowPreview,
}: ExportPreviewDialogProps) {
  const { t } = useTranslation(["components/dialog"]);
  if (!range) {
    return null;
  }

  const source = `${baseUrl}vod/${camera}/start/${range.after}/end/${range.before}/index.m3u8`;

  return (
    <Dialog open={showPreview} onOpenChange={setShowPreview}>
      <DialogContent
        className={cn(
          "scrollbar-container overflow-y-auto",
          isDesktop &&
            "max-h-[95dvh] sm:max-w-xl md:max-w-4xl lg:max-w-4xl xl:max-w-7xl",
          isMobile && "px-4",
        )}
      >
        <DialogHeader>
          <DialogTitle>{t("export.fromTimeline.previewExport")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("export.fromTimeline.previewExport")}
          </DialogDescription>
        </DialogHeader>
        <GenericVideoPlayer source={source} />
      </DialogContent>
    </Dialog>
  );
}
