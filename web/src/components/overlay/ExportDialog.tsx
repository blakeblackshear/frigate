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
  mode: ExportMode;
  setMode: (mode: ExportMode) => void;
};
export default function ExportDialog({
  camera,
  mode,
  setMode,
}: ExportDialogProps) {
  const [selectedOption, setSelectedOption] = useState<ExportOption>("1");

  const onStartExport = useCallback(() => {
    const now = new Date();
    let end = now.getTime() / 1000;

    let start;
    switch (selectedOption) {
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
        end = 0;
        break;
    }

    axios
      .post(`export/${camera}/start/${start}/end/${end}`, {
        playback: "realtime",
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
  }, [camera, selectedOption]);

  return (
    <Dialog open={mode == "select"}>
      <DialogTrigger asChild>
        <Button
          className="flex items-center gap-2"
          variant="secondary"
          size="sm"
          onClick={() => setMode("select")}
        >
          <FaArrowDown className="p-1 fill-secondary bg-muted-foreground rounded-md" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>
        <RadioGroup
          onValueChange={(value) => setSelectedOption(value as ExportOption)}
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
        <DialogFooter>
          <DialogClose onClick={() => setMode("none")}>Cancel</DialogClose>
          <Button
            variant="select"
            size="sm"
            onClick={() => {
              if (selectedOption == "timeline") {
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
