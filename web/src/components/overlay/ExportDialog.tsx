import { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogClose,
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
import ReviewActivityCalendar from "./ReviewActivityCalendar";
import { SelectSeparator } from "../ui/select";

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
  const [selectedOption, setSelectedOption] = useState<ExportOption>("1");
  const [name, setName] = useState("");

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
          setSelectedOption("1");
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
  }, [camera, name, range, setRange]);

  return (
    <Dialog
      open={mode == "select"}
      onOpenChange={(open) => {
        if (!open) {
          setMode("none");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="flex items-center gap-2"
          variant="secondary"
          size="sm"
          onClick={() => {
            if (mode == "none") {
              setMode("select");
            } else if (mode == "timeline") {
              onStartExport();
              setMode("none");
            }
          }}
        >
          <FaArrowDown className="p-1 fill-secondary bg-muted-foreground rounded-md" />
          {mode != "timeline" ? "Export" : "Save"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>
        <SelectSeparator className="bg-secondary" />
        <RadioGroup
          className="flex flex-col gap-3"
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
          className="mt-2"
          type="search"
          placeholder="Name the Export"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <SelectSeparator className="bg-secondary" />
        <DialogFooter>
          <DialogClose onClick={() => setMode("none")}>Cancel</DialogClose>
          <Button
            variant="select"
            size="sm"
            onClick={() => {
              if (selectedOption == "timeline") {
                setRange({ before: currentTime + 30, after: currentTime - 30 });
                setMode("timeline");
              } else {
                onStartExport();
                setMode("none");
              }
            }}
          >
            {selectedOption == "timeline" ? "Select" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

  const startTime = useMemo(
    () => range?.after || latestTime - 3600,
    [range, latestTime],
  );
  const endTime = useMemo(
    () => range?.before || latestTime,
    [range, latestTime],
  );
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
    <div className="mx-8 px-2 flex items-center gap-2 bg-secondary rounded-lg">
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
            variant={startOpen ? "select" : "secondary"}
            onClick={() => {
              setStartOpen(true);
              setEndOpen(false);
            }}
          >
            {formattedStart}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="flex flex-col items-center">
          <ReviewActivityCalendar
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
            variant={endOpen ? "select" : "secondary"}
            onClick={() => {
              setEndOpen(true);
              setStartOpen(false);
            }}
          >
            {formattedEnd}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="flex flex-col items-center">
          <ReviewActivityCalendar
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
