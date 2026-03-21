import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Input } from "../ui/input";
import { SelectSeparator } from "../ui/select";
import axios from "axios";
import { toast } from "sonner";
import { isDesktop } from "react-device-detect";
import { Drawer, DrawerContent } from "../ui/drawer";
import ActivityIndicator from "../indicators/activity-indicator";

const RECAP_PERIODS = ["24", "12", "8", "4", "1"] as const;
type RecapPeriod = (typeof RECAP_PERIODS)[number];

type RecapDialogProps = {
  camera: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function RecapDialog({
  camera,
  open,
  onOpenChange,
}: RecapDialogProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<RecapPeriod>("24");
  const [label, setLabel] = useState("person");
  const [isGenerating, setIsGenerating] = useState(false);

  const onGenerate = useCallback(() => {
    const now = Date.now() / 1000;
    const hours = parseInt(selectedPeriod);
    const startTime = now - hours * 3600;

    setIsGenerating(true);

    axios
      .post(`recap/${camera}`, null, {
        params: {
          start_time: startTime,
          end_time: now,
          label,
        },
      })
      .then((response) => {
        if (response.status === 200 && response.data.success) {
          toast.success("Recap generation started", {
            position: "top-center",
            description: "Check Exports when it's done.",
          });
          onOpenChange(false);
        }
      })
      .catch((error) => {
        const msg =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(`Recap failed: ${msg}`, { position: "top-center" });
      })
      .finally(() => {
        setIsGenerating(false);
      });
  }, [camera, selectedPeriod, label, onOpenChange]);

  const Overlay = isDesktop ? Dialog : Drawer;
  const Content = isDesktop ? DialogContent : DrawerContent;

  return (
    <Overlay open={open} onOpenChange={onOpenChange}>
      <Content
        className={
          isDesktop
            ? "sm:rounded-lg md:rounded-2xl"
            : "mx-4 rounded-lg px-4 pb-4 md:rounded-2xl"
        }
      >
        <div className="w-full">
          {isDesktop && (
            <>
              <DialogHeader>
                <DialogTitle>Generate Recap</DialogTitle>
              </DialogHeader>
              <SelectSeparator className="my-4 bg-secondary" />
            </>
          )}

          <div className={`flex flex-col gap-4 ${isDesktop ? "" : "mt-4"}`}>
            <Label className="text-sm font-medium">Time period</Label>
            <RadioGroup
              className="flex flex-col gap-3"
              defaultValue="24"
              onValueChange={(v) => setSelectedPeriod(v as RecapPeriod)}
            >
              {RECAP_PERIODS.map((period) => (
                <div key={period} className="flex items-center gap-2">
                  <RadioGroupItem
                    className={
                      period === selectedPeriod
                        ? "bg-selected from-selected/50 to-selected/90 text-selected"
                        : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                    }
                    id={`recap-${period}`}
                    value={period}
                  />
                  <Label
                    className="cursor-pointer"
                    htmlFor={`recap-${period}`}
                  >
                    Last {period} {parseInt(period) === 1 ? "hour" : "hours"}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="mt-2">
              <Label className="text-sm text-secondary-foreground">
                Object type
              </Label>
              <Input
                className="text-md mt-2"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="person"
              />
            </div>
          </div>

          {isDesktop && <SelectSeparator className="my-4 bg-secondary" />}

          <DialogFooter
            className={isDesktop ? "" : "mt-6 flex flex-col-reverse gap-4"}
          >
            <div
              className={`cursor-pointer p-2 text-center ${isDesktop ? "" : "w-full"}`}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </div>
            <Button
              className={isDesktop ? "" : "w-full"}
              variant="select"
              size="sm"
              disabled={isGenerating}
              onClick={onGenerate}
            >
              {isGenerating && (
                <ActivityIndicator className="mr-2 h-4 w-4" />
              )}
              Generate Recap
            </Button>
          </DialogFooter>
        </div>
      </Content>
    </Overlay>
  );
}
