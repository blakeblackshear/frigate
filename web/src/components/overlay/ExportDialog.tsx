import { useState } from "react";
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

export default function ExportDialog() {
  const [selectedOption, setSelectedOption] = useState<ExportOption>("1");

  return (
    <Dialog open>
      <DialogTrigger>
        <div></div>
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
          <DialogClose>Cancel</DialogClose>
          <Button variant="select" size="sm">
            {selectedOption == "timeline" ? "Select" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
