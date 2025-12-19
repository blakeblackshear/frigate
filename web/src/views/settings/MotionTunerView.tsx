import Heading from "@/components/ui/heading";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import axios from "axios";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import AutoUpdatingCameraImage from "@/components/camera/AutoUpdatingCameraImage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  useImproveContrast,
  useMotionContourArea,
  useMotionThreshold,
} from "@/api/ws";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";
import { Trans, useTranslation } from "react-i18next";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { cn } from "@/lib/utils";
import { isDesktop } from "react-device-detect";

type MotionTunerViewProps = {
  selectedCamera: string;
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};

type MotionSettings = {
  threshold?: number;
  contour_area?: number;
  improve_contrast?: boolean;
};

export default function MotionTunerView({
  selectedCamera,
  setUnsavedChanges,
}: MotionTunerViewProps) {
  const { t } = useTranslation(["views/settings"]);
  const { getLocaleDocUrl } = useDocDomain();
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const [changedValue, setChangedValue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { send: sendMotionThreshold } = useMotionThreshold(selectedCamera);
  const { send: sendMotionContourArea } = useMotionContourArea(selectedCamera);
  const { send: sendImproveContrast } = useImproveContrast(selectedCamera);

  const [motionSettings, setMotionSettings] = useState<MotionSettings>({
    threshold: undefined,
    contour_area: undefined,
    improve_contrast: undefined,
  });

  const [origMotionSettings, setOrigMotionSettings] = useState<MotionSettings>({
    threshold: undefined,
    contour_area: undefined,
    improve_contrast: undefined,
  });

  const cameraConfig = useMemo(() => {
    if (config && selectedCamera) {
      return config.cameras[selectedCamera];
    }
  }, [config, selectedCamera]);

  useEffect(() => {
    if (cameraConfig) {
      setMotionSettings({
        threshold: cameraConfig.motion.threshold,
        contour_area: cameraConfig.motion.contour_area,
        improve_contrast: cameraConfig.motion.improve_contrast,
      });
      setOrigMotionSettings({
        threshold: cameraConfig.motion.threshold,
        contour_area: cameraConfig.motion.contour_area,
        improve_contrast: cameraConfig.motion.improve_contrast,
      });
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera]);

  useEffect(() => {
    if (!motionSettings.threshold) return;

    sendMotionThreshold(motionSettings.threshold);
  }, [motionSettings.threshold, sendMotionThreshold]);

  useEffect(() => {
    if (!motionSettings.contour_area) return;

    sendMotionContourArea(motionSettings.contour_area);
  }, [motionSettings.contour_area, sendMotionContourArea]);

  useEffect(() => {
    if (motionSettings.improve_contrast === undefined) return;

    sendImproveContrast(motionSettings.improve_contrast ? "ON" : "OFF");
  }, [motionSettings.improve_contrast, sendImproveContrast]);

  const handleMotionConfigChange = (newConfig: Partial<MotionSettings>) => {
    setMotionSettings((prevConfig) => ({ ...prevConfig, ...newConfig }));
    setUnsavedChanges(true);
    setChangedValue(true);
  };

  const saveToConfig = useCallback(async () => {
    setIsLoading(true);

    axios
      .put(
        `config/set?cameras.${selectedCamera}.motion.threshold=${motionSettings.threshold}&cameras.${selectedCamera}.motion.contour_area=${motionSettings.contour_area}&cameras.${selectedCamera}.motion.improve_contrast=${motionSettings.improve_contrast ? "True" : "False"}`,
        {
          requires_restart: 0,
          update_topic: `config/cameras/${selectedCamera}/motion`,
        },
      )
      .then((res) => {
        if (res.status === 200) {
          toast.success(t("motionDetectionTuner.toast.success"), {
            position: "top-center",
          });
          setChangedValue(false);
          updateConfig();
        } else {
          toast.error(
            t("toast.save.error.title", {
              errorMessage: res.statusText,
              ns: "common",
            }),
            {
              position: "top-center",
            },
          );
        }
      })
      .catch((error) => {
        toast.error(
          t("toast.save.error.title", {
            errorMessage: error.response.data.message,
            ns: "common",
          }),
          { position: "top-center" },
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [
    updateConfig,
    motionSettings.threshold,
    motionSettings.contour_area,
    motionSettings.improve_contrast,
    selectedCamera,
    t,
  ]);

  const onCancel = useCallback(() => {
    setMotionSettings(origMotionSettings);
    setChangedValue(false);
  }, [origMotionSettings]);

  useEffect(() => {
    document.title = t("documentTitle.motionTuner");
  }, [t]);

  if (!cameraConfig && !selectedCamera) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col md:flex-row">
      <Toaster position="top-center" closeButton={true} />
      <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mr-3 md:mt-0 md:w-3/12">
        <Heading as="h4" className="mb-2">
          {t("motionDetectionTuner.title")}
        </Heading>
        <div className="my-3 space-y-3 text-sm text-muted-foreground">
          <p>{t("motionDetectionTuner.desc.title")}</p>

          <div className="flex items-center text-primary">
            <Link
              to={getLocaleDocUrl("configuration/motion_detection")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline"
            >
              {t("readTheDocumentation", { ns: "common" })}
              <LuExternalLink className="ml-2 inline-flex size-3" />
            </Link>
          </div>
        </div>
        <Separator className="my-2 flex bg-secondary" />
        <div className="flex w-full flex-col space-y-6">
          <div className="mt-2 space-y-6">
            <div className="space-y-0.5">
              <Label htmlFor="motion-threshold" className="text-md">
                {t("motionDetectionTuner.Threshold.title")}
              </Label>
              <div className="my-2 text-sm text-muted-foreground">
                <Trans ns="views/settings">
                  motionDetectionTuner.Threshold.desc
                </Trans>
              </div>
            </div>
            <div className="flex flex-row justify-between">
              <Slider
                id="motion-threshold"
                className="w-full"
                disabled={motionSettings.threshold === undefined}
                value={[motionSettings.threshold ?? 0]}
                min={5}
                max={80}
                step={1}
                onValueChange={(value) => {
                  handleMotionConfigChange({ threshold: value[0] });
                }}
              />
              <div className="align-center ml-6 mr-2 flex text-lg">
                {motionSettings.threshold}
              </div>
            </div>
          </div>
          <div className="mt-2 space-y-6">
            <div className="space-y-0.5">
              <Label htmlFor="motion-threshold" className="text-md">
                {t("motionDetectionTuner.contourArea.title")}
              </Label>
              <div className="my-2 text-sm text-muted-foreground">
                <p>
                  <Trans ns="views/settings">
                    motionDetectionTuner.contourArea.desc
                  </Trans>
                </p>
              </div>
            </div>
            <div className="flex flex-row justify-between">
              <Slider
                id="motion-contour-area"
                className="w-full"
                disabled={motionSettings.contour_area === undefined}
                value={[motionSettings.contour_area ?? 0]}
                min={5}
                max={100}
                step={1}
                onValueChange={(value) => {
                  handleMotionConfigChange({ contour_area: value[0] });
                }}
              />
              <div className="align-center ml-6 mr-2 flex text-lg">
                {motionSettings.contour_area}
              </div>
            </div>
          </div>
          <Separator className="my-2 flex bg-secondary" />
          <div className="flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="improve-contrast">
                {t("motionDetectionTuner.improveContrast.title")}
              </Label>
              <div className="text-sm text-muted-foreground">
                <Trans ns="views/settings">
                  motionDetectionTuner.improveContrast.desc
                </Trans>
              </div>
            </div>
            <Switch
              id="improve-contrast"
              className="ml-3"
              disabled={motionSettings.improve_contrast === undefined}
              checked={motionSettings.improve_contrast === true}
              onCheckedChange={(isChecked) => {
                handleMotionConfigChange({ improve_contrast: isChecked });
              }}
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-end">
          <div className="flex flex-row gap-2 pt-5">
            <Button
              className="flex flex-1"
              aria-label={t("button.reset", { ns: "common" })}
              onClick={onCancel}
            >
              {t("button.reset", { ns: "common" })}
            </Button>
            <Button
              variant="select"
              disabled={!changedValue || isLoading}
              className="flex flex-1"
              aria-label={t("button.save", { ns: "common" })}
              onClick={saveToConfig}
            >
              {isLoading ? (
                <div className="flex flex-row items-center gap-2">
                  <ActivityIndicator />
                  <span>{t("button.saving", { ns: "common" })}</span>
                </div>
              ) : (
                t("button.save", { ns: "common" })
              )}
            </Button>
          </div>
        </div>
      </div>

      {cameraConfig ? (
        <div
          className={cn(
            "flex max-h-[70%] md:h-dvh md:max-h-full md:w-7/12 md:grow",
            isDesktop && "md:mr-3",
          )}
        >
          <div className="size-full min-h-10">
            <AutoUpdatingCameraImage
              camera={cameraConfig.name}
              searchParams={new URLSearchParams([["motion", "1"]])}
              showFps={false}
              className="size-full"
              cameraClasses="relative w-full h-full flex flex-col justify-start"
            />
          </div>
        </div>
      ) : (
        <Skeleton className="size-full rounded-lg md:rounded-2xl" />
      )}
    </div>
  );
}
