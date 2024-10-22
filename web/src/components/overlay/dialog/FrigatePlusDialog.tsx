import { baseUrl } from "@/api/baseUrl";
import ActivityIndicator from "@/components/indicators/activity-indicator";
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { isDesktop } from "react-device-detect";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import useSWR from "swr";

type SubmissionState = "reviewing" | "uploading" | "submitted";

type FrigatePlusDialogProps = {
  upload?: Event;
  dialog?: boolean;
  onClose: () => void;
  onEventUploaded: () => void;
};
export function FrigatePlusDialog({
  upload,
  dialog = true,
  onClose,
  onEventUploaded,
}: FrigatePlusDialogProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  // layout

  const Title = isDesktop ? DialogTitle : "div";
  const Description = isDesktop ? DialogDescription : "div";

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

  const [state, setState] = useState<SubmissionState>(
    upload?.plus_id ? "submitted" : "reviewing",
  );

  useEffect(
    () => setState(upload?.plus_id ? "submitted" : "reviewing"),
    [upload],
  );

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

      setState("submitted");
      onEventUploaded();
      onClose();
    },
    [upload, onClose, onEventUploaded],
  );

  const content = (
    <TransformWrapper minScale={1.0} wheel={{ smoothStep: 0.005 }}>
      <div className="flex flex-col space-y-3">
        <DialogHeader
          className={state == "submitted" ? "sr-only" : "text-left"}
        >
          <Title
            className={
              !isDesktop
                ? "text-lg font-semibold leading-none tracking-tight"
                : undefined
            }
          >
            Submit To Frigate+
          </Title>
          <Description
            className={!isDesktop ? "text-sm text-muted-foreground" : undefined}
          >
            Objects in locations you want to avoid are not false positives.
            Submitting them as false positives will confuse the model.
          </Description>
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

        <DialogFooter className="flex flex-row justify-end gap-2">
          {state == "reviewing" && (
            <>
              {dialog && (
                <Button aria-label="Cancel" onClick={onClose}>
                  Cancel
                </Button>
              )}
              <Button
                className="bg-success"
                aria-label="Confirm this label for Frigate Plus"
                onClick={() => {
                  setState("uploading");
                  onSubmitToPlus(false);
                }}
              >
                This is a {upload?.label}
              </Button>
              <Button
                className="text-white"
                aria-label="Do not confirm this label for Frigate Plus"
                variant="destructive"
                onClick={() => {
                  setState("uploading");
                  onSubmitToPlus(true);
                }}
              >
                This is not a {upload?.label}
              </Button>
            </>
          )}
          {state == "uploading" && <ActivityIndicator />}
        </DialogFooter>
      </div>
    </TransformWrapper>
  );

  if (dialog) {
    return (
      <Dialog
        open={upload != undefined}
        onOpenChange={(open) => (!open ? onClose() : null)}
      >
        <DialogContent className="md:max-w-3xl lg:max-w-4xl xl:max-w-7xl">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}
