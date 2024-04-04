import { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
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
import { isDesktop } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import SaveExportOverlay from "./SaveExportOverlay";
import { getUTCOffset } from "@/utils/dateUtil";

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
  setRange: (range: TimeRange | undefined) => void;
  setMode: (mode: ExportMode) => void;
};
export default function ExportDialog({
  camera,
  latestTime,
  currentTime,
  range,
  mode,
  setRange,
  setMode,
}: ExportDialogProps) {
  const [name, setName] = useState("");
  const onStartExport = useCallback(() => {
    if (!range) {
      toast.error("No valid time range selected", { position: "top-center" });
      return;
    }

    axios
      .post(`export/${camera}/start/${range.after}/end/${range.before}`, {
        playback: "realtime",
        name,
      })
      .then((response) => {
        if (response.status == 200) {
          toast.success(
            "Successfully started export. View the file in the /exports folder.",
            { position: "top-center" },
          );
          setName("");
          setRange(undefined);
          setMode("none");
        }
      })
      .catch((error) => {
        if (error.response?.data?.message) {
          toast.error(
            `Failed to start export: ${error.response.data.message}`,
            { position: "top-center" },
          );
        } else {
          toast.error(`Failed to start export: ${error.message}`, {
            position: "top-center",
          });
        }
      });
  }, [camera, name, range, setRange, setName, setMode]);

  const Overlay = isDesktop ? Dialog : Drawer;
  const Trigger = isDesktop ? DialogTrigger : DrawerTrigger;
  const Content = isDesktop ? DialogContent : DrawerContent;

  return (
    <>
      <SaveExportOverlay
        className="absolute top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        show={mode == "timeline"}
        onSave={() => onStartExport()}
        onCancel={() => setMode("none")}
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
            variant="secondary"
            size="sm"
            onClick={() => {
              setMode("select");
            }}
          >
            <FaArrowDown className="p-1 fill-secondary bg-secondary-foreground rounded-md" />
            {isDesktop && <div className="text-primary-foreground">Export</div>}
          </Button>
        </Trigger>
        <Content
          className={
            isDesktop ? "sm:rounded-2xl" : "px-4 pb-4 mx-4 rounded-2xl"
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
            onCancel={() => setMode("none")}
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
            <DialogTitle>Export</DialogTitle>
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
                    ? "from-selected/50 to-selected/90 text-selected bg-selected"
                    : "from-secondary/50 to-secondary/90 text-secondary bg-secondary"
                }
                id={opt}
                value={opt}
              />
              <Label className="cursor-pointer capitalize" htmlFor={opt}>
                {isNaN(parseInt(opt))
                  ? opt == "timeline"
                    ? "Select from Timeline"
                    : `${opt}`
                  : `Last ${opt > "1" ? `${opt} Hours` : "Hour"}`}
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
        className="my-6"
        type="search"
        placeholder="Name the Export"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {isDesktop && <SelectSeparator className="my-4 bg-secondary" />}
      <DialogFooter
        className={isDesktop ? "" : "mt-3 flex flex-col-reverse gap-4"}
      >
        <div
          className={`p-2 cursor-pointer text-center ${isDesktop ? "" : "w-full"}`}
          onClick={onCancel}
        >
          Cancel
        </div>
        <Button
          className={isDesktop ? "" : "w-full"}
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
          {selectedOption == "timeline" ? "Select" : "Export"}
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
      ? "%b %-d, %H:%M:%S"
      : "%b %-d, %I:%M:%S %p",
  );
  const formattedEnd = useFormattedTimestamp(
    endTime,
    config?.ui.time_format == "24hour"
      ? "%b %-d, %H:%M:%S"
      : "%b %-d, %I:%M:%S %p",
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
      className={`mt-3 flex items-center bg-secondary rounded-lg ${isDesktop ? "mx-8 px-2 gap-2" : "pl-2"}`}
    >
      <FaCalendarAlt />
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
            className={isDesktop ? "" : "text-xs"}
            variant={startOpen ? "select" : "secondary"}
            size="sm"
            onClick={() => {
              setStartOpen(true);
              setEndOpen(false);
            }}
          >
            {formattedStart}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="flex flex-col items-center">
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
            className="w-full mx-4 p-1 border border-input bg-background text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
            id="startTime"
            type="time"
            value={startClock}
            step="1"
            onChange={(e) => {
              const clock = e.target.value;
              const [hour, minute, second] = clock.split(":");
              const start = new Date(startTime * 1000);
              start.setHours(
                parseInt(hour),
                parseInt(minute),
                parseInt(second),
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
      <FaArrowRight className="size-4" />
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
            className={isDesktop ? "" : "text-xs"}
            variant={endOpen ? "select" : "secondary"}
            size="sm"
            onClick={() => {
              setEndOpen(true);
              setStartOpen(false);
            }}
          >
            {formattedEnd}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="flex flex-col items-center">
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
            className="w-full mx-4 p-1 border border-input bg-background text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
            id="startTime"
            type="time"
            value={endClock}
            step="1"
            onChange={(e) => {
              const clock = e.target.value;
              const [hour, minute, second] = clock.split(":");
              const end = new Date(endTime * 1000);
              end.setHours(
                parseInt(hour),
                parseInt(minute),
                parseInt(second),
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
  );
}
