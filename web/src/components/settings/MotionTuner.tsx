import Heading from "@/components/ui/heading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
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
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

type MotionTunerProps = {
  selectedCamera: string;
};

type MotionSettings = {
  threshold?: number;
  contour_area?: number;
  improve_contrast?: boolean;
};

export default function MotionTuner({ selectedCamera }: MotionTunerProps) {
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const [changedValue, setChangedValue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config]);

  // const [selectedCamera, setSelectedCamera] = useState(cameras[0]?.name);
  const [nextSelectedCamera, setNextSelectedCamera] = useState("");

  const { send: sendMotionThreshold } = useMotionThreshold(selectedCamera);
  const { send: sendMotionContourArea } = useMotionContourArea(selectedCamera);
  const { send: sendImproveContrast } = useImproveContrast(selectedCamera);

  const [motionSettings, setMotionSettings] = useState<MotionSettings>({
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
    }
  }, [cameraConfig]);

  useEffect(() => {
    if (cameraConfig) {
      const { threshold, contour_area, improve_contrast } = motionSettings;

      if (
        threshold !== undefined &&
        cameraConfig.motion.threshold !== threshold
      ) {
        sendMotionThreshold(threshold);
      }

      if (
        contour_area !== undefined &&
        cameraConfig.motion.contour_area !== contour_area
      ) {
        sendMotionContourArea(contour_area);
      }

      if (
        improve_contrast !== undefined &&
        cameraConfig.motion.improve_contrast !== improve_contrast
      ) {
        sendImproveContrast(improve_contrast ? "ON" : "OFF");
      }
    }
  }, [
    cameraConfig,
    motionSettings,
    sendMotionThreshold,
    sendMotionContourArea,
    sendImproveContrast,
  ]);

  const handleMotionConfigChange = (newConfig: Partial<MotionSettings>) => {
    setMotionSettings((prevConfig) => ({ ...prevConfig, ...newConfig }));
    setChangedValue(true);
  };

  const saveToConfig = useCallback(async () => {
    setIsLoading(true);

    axios
      .put(
        `config/set?cameras.${selectedCamera}.motion.threshold=${motionSettings.threshold}&cameras.${selectedCamera}.motion.contour_area=${motionSettings.contour_area}&cameras.${selectedCamera}.motion.improve_contrast=${motionSettings.improve_contrast}`,
        { requires_restart: 0 },
      )
      .then((res) => {
        if (res.status === 200) {
          toast.success("Motion settings saved.", { position: "top-center" });
          setChangedValue(false);
          updateConfig();
        } else {
          toast.error(`Failed to save config changes: ${res.statusText}`, {
            position: "top-center",
          });
        }
      })
      .catch((error) => {
        toast.error(
          `Failed to save config changes: ${error.response.data.message}`,
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
  ]);

  const handleSelectedCameraChange = useCallback(
    (camera: string) => {
      if (changedValue) {
        setNextSelectedCamera(camera);
        setConfirmationDialogOpen(true);
      } else {
        // setSelectedCamera(camera);
        setNextSelectedCamera("");
      }
    },
    [changedValue],
  );

  const handleDialog = useCallback(
    (save: boolean) => {
      if (save) {
        saveToConfig();
      }
      // setSelectedCamera(nextSelectedCamera);
      setNextSelectedCamera("");
      setConfirmationDialogOpen(false);
      setChangedValue(false);
    },
    [saveToConfig],
  );

  if (!cameraConfig && !selectedCamera) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex flex-col md:flex-row size-full">
      <Toaster position="top-center" />
      <div className="flex flex-col w-full overflow-y-auto mt-2 md:mt-0 md:w-3/12 order-last md:order-none md:mr-2 rounded-lg border-secondary-foreground border-[1px] p-2 bg-background_alt">
        <Heading as="h3" className="my-2">
          Motion Detection Tuner
        </Heading>

        <div className="flex flex-col w-full space-y-10">
          <div className="flex flex-row mb-5">
            <Slider
              id="motion-threshold"
              className="w-[300px]"
              disabled={motionSettings.threshold === undefined}
              value={[motionSettings.threshold ?? 0]}
              min={10}
              max={80}
              step={1}
              onValueChange={(value) => {
                handleMotionConfigChange({ threshold: value[0] });
              }}
            />
            <Label htmlFor="motion-threshold" className="px-2">
              Threshold: {motionSettings.threshold}
            </Label>
          </div>
          <div className="flex flex-row">
            <Slider
              id="motion-contour-area"
              className="w-[300px]"
              disabled={motionSettings.contour_area === undefined}
              value={[motionSettings.contour_area ?? 0]}
              min={10}
              max={200}
              step={5}
              onValueChange={(value) => {
                handleMotionConfigChange({ contour_area: value[0] });
              }}
            />
            <Label htmlFor="motion-contour-area" className="px-2">
              Contour Area: {motionSettings.contour_area}
            </Label>
          </div>
          <div className="flex flex-row">
            <Switch
              id="improve-contrast"
              disabled={motionSettings.improve_contrast === undefined}
              checked={motionSettings.improve_contrast === true}
              onCheckedChange={(isChecked) => {
                handleMotionConfigChange({ improve_contrast: isChecked });
              }}
            />
            <Label htmlFor="improve-contrast">Improve Contrast</Label>
          </div>

          <div className="flex">
            <Button
              size="sm"
              variant={isLoading ? "ghost" : "select"}
              disabled={!changedValue || isLoading}
              onClick={saveToConfig}
            >
              {isLoading ? "Saving..." : "Save to Config"}
            </Button>
          </div>
        </div>
        {confirmationDialogOpen && (
          <AlertDialog
            open={confirmationDialogOpen}
            onOpenChange={() => setConfirmationDialogOpen(false)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  You have unsaved changes on this camera.
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Do you want to save your changes before continuing?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => handleDialog(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDialog(true)}>
                  Save
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {cameraConfig ? (
        <div className="flex md:w-7/12 md:grow md:h-dvh md:max-h-full">
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
        <Skeleton className="size-full rounded-2xl" />
      )}
    </div>
  );
}
