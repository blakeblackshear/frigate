import { useMemo } from "react";
import useSWR from "swr";
import { Trans } from "react-i18next";
import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  useAlertsState,
  useDetectionsState,
  useObjectDescriptionState,
  useReviewDescriptionState,
} from "@/api/ws";
import type { SectionRendererProps } from "./registry";
import CameraReviewClassification from "./CameraReviewClassification";

export default function CameraReviewStatusToggles({
  selectedCamera,
  formContext,
}: SectionRendererProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const cameraId = selectedCamera ?? "";

  const cameraConfig = useMemo(() => {
    if (config && selectedCamera) {
      return config.cameras[selectedCamera];
    }
  }, [config, selectedCamera]);

  const { payload: alertsState, send: sendAlerts } = useAlertsState(cameraId);
  const { payload: detectionsState, send: sendDetections } =
    useDetectionsState(cameraId);

  const { payload: objDescState, send: sendObjDesc } =
    useObjectDescriptionState(cameraId);
  const { payload: revDescState, send: sendRevDesc } =
    useReviewDescriptionState(cameraId);

  if (!selectedCamera || !cameraConfig) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <Heading as="h4" className="my-2">
        <Trans ns="views/settings">cameraReview.title</Trans>
      </Heading>

      <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 space-y-3 text-sm text-primary-variant">
        <div className="flex flex-row items-center">
          <Switch
            id="alerts-enabled"
            className="mr-3"
            checked={alertsState == "ON"}
            onCheckedChange={(isChecked) => {
              sendAlerts(isChecked ? "ON" : "OFF");
            }}
          />
          <div className="space-y-0.5">
            <Label htmlFor="alerts-enabled">
              <Trans ns="views/settings">cameraReview.review.alerts</Trans>
            </Label>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex flex-row items-center">
            <Switch
              id="detections-enabled"
              className="mr-3"
              checked={detectionsState == "ON"}
              onCheckedChange={(isChecked) => {
                sendDetections(isChecked ? "ON" : "OFF");
              }}
            />
            <div className="space-y-0.5">
              <Label htmlFor="detections-enabled">
                <Trans ns="views/settings">camera.review.detections</Trans>
              </Label>
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            <Trans ns="views/settings">cameraReview.review.desc</Trans>
          </div>
        </div>
      </div>

      {cameraConfig?.objects?.genai?.enabled_in_config && (
        <>
          <Separator className="my-2 flex bg-secondary" />

          <Heading as="h4" className="my-2">
            <Trans ns="views/settings">
              cameraReview.object_descriptions.title
            </Trans>
          </Heading>

          <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 space-y-3 text-sm text-primary-variant">
            <div className="flex flex-row items-center">
              <Switch
                id="object-descriptions-enabled"
                className="mr-3"
                checked={objDescState == "ON"}
                onCheckedChange={(isChecked) => {
                  sendObjDesc(isChecked ? "ON" : "OFF");
                }}
              />
              <div className="space-y-0.5">
                <Label htmlFor="object-descriptions-enabled">
                  <Trans>button.enabled</Trans>
                </Label>
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              <Trans ns="views/settings">
                cameraReview.object_descriptions.desc
              </Trans>
            </div>
          </div>
        </>
      )}

      {cameraConfig?.review?.genai?.enabled_in_config && (
        <>
          <Separator className="my-2 flex bg-secondary" />

          <Heading as="h4" className="my-2">
            <Trans ns="views/settings">
              cameraReview.review_descriptions.title
            </Trans>
          </Heading>

          <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 space-y-3 text-sm text-primary-variant">
            <div className="flex flex-row items-center">
              <Switch
                id="review-descriptions-enabled"
                className="mr-3"
                checked={revDescState == "ON"}
                onCheckedChange={(isChecked) => {
                  sendRevDesc(isChecked ? "ON" : "OFF");
                }}
              />
              <div className="space-y-0.5">
                <Label htmlFor="review-descriptions-enabled">
                  <Trans>button.enabled</Trans>
                </Label>
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              <Trans ns="views/settings">
                cameraReview.review_descriptions.desc
              </Trans>
            </div>
          </div>
        </>
      )}

      <CameraReviewClassification
        selectedCamera={selectedCamera}
        formContext={formContext}
      />
    </div>
  );
}
