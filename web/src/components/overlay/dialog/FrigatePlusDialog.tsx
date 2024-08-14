import { baseUrl } from "@/api/baseUrl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Event } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";
import axios from "axios";
import { useCallback, useMemo } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import useSWR from "swr";

type FrigatePlusDialogProps = {
  upload?: Event;
  onClose: () => void;
  onEventUploaded: () => void;
};
export function FrigatePlusDialog({
  upload,
  onClose,
  onEventUploaded,
}: FrigatePlusDialogProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  // layout

  const grow = useMemo(() => {
    if (!config || !upload) {
      return "";
    }

    const camera = config.cameras[upload.camera];

    if (!camera) {
      return "";
    }

    if (camera.detect.width / camera.detect.height < 16 / 9) {
      return "aspect-video object-contain";
    }

    return "";
  }, [config, upload]);

  // upload

  const onSubmitToPlus = useCallback(
    async (falsePositive: boolean) => {
      if (!upload) {
        return;
      }

      falsePositive
        ? axios.put(`events/${upload.id}/false_positive`)
        : axios.post(`events/${upload.id}/plus`, {
            include_annotation: 1,
          });

      onEventUploaded();
      onClose();
    },
    [upload, onClose, onEventUploaded],
  );

  return (
    <Dialog
      open={upload != undefined}
      onOpenChange={(open) => (!open ? onClose() : null)}
    >
      <DialogContent className="md:max-w-3xl lg:max-w-4xl xl:max-w-7xl">
        <TransformWrapper minScale={1.0} wheel={{ smoothStep: 0.005 }}>
          <DialogHeader>
            <DialogTitle>Submit To Frigate+</DialogTitle>
            <DialogDescription>
              Objects in locations you want to avoid are not false positives.
              Submitting them as false positives will confuse the model.
            </DialogDescription>
          </DialogHeader>
          <TransformComponent
            wrapperStyle={{
              width: "100%",
              height: "100%",
            }}
            contentStyle={{
              position: "relative",
              width: "100%",
              height: "100%",
            }}
          >
            {upload?.id && (
              <img
                className={`w-full ${grow} bg-black`}
                src={`${baseUrl}api/events/${upload?.id}/snapshot.jpg`}
                alt={`${upload?.label}`}
              />
            )}
          </TransformComponent>
          <DialogFooter>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              className="bg-success"
              onClick={() => onSubmitToPlus(false)}
            >
              This is a {upload?.label}
            </Button>
            <Button
              className="text-white"
              variant="destructive"
              onClick={() => onSubmitToPlus(true)}
            >
              This is not a {upload?.label}
            </Button>
          </DialogFooter>
        </TransformWrapper>
      </DialogContent>
    </Dialog>
  );
}
