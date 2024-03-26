import { useCallback, useState } from "react";
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
import { FaArrowDown } from "react-icons/fa";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { TimeRange } from "@/types/timeline";

const EXPORT_OPTIONS = [
  "1",
  "4",
  "8",
  "12",
  "24",
  "custom",
  "timeline",
] as const;
type ExportOption = (typeof EXPORT_OPTIONS)[number];

type ExportDialogProps = {
  camera: string;
  latestTime: number;
  currentTime: number;
  range?: TimeRange;
  mode: ExportMode;
  setRange: (range: TimeRange) => void;
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
  }, [camera, name, range]);

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>
        <RadioGroup
          onValueChange={(value) => onSelectTime(value as ExportOption)}
        >
          {EXPORT_OPTIONS.map((opt) => {
            return (
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  className={
                    opt == selectedOption
                      ? "bg-selected border-selected text-selected"
                      : "bg-muted-foreground border-muted-foreground"
                  }
                  key={opt}
                  id={opt}
                  value={opt}
                />
                <Label className="cursor-pointer capitalize" htmlFor={opt}>
                  {isNaN(parseInt(opt))
                    ? `${opt}`
                    : `Last ${opt > "1" ? `${opt} Hours` : "Hour"}`}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        <Input
          type="search"
          placeholder="Name the Export"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
