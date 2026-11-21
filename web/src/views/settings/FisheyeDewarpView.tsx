import Heading from "@/components/ui/heading";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import axios from "axios";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import AutoUpdatingCameraImage from "@/components/camera/AutoUpdatingCameraImage";
import Camera360Viewer, {
  Camera360ViewerHandle,
} from "@/components/camera/Camera360Viewer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { isDesktop } from "react-device-detect";
import { DEFAULT_FISHEYE_SETTINGS, FisheyeSettings } from "@/types/fisheye";

type FisheyeDewarpViewProps = {
  selectedCamera: string;
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};

type FisheyeField = {
  key: keyof FisheyeSettings;
  min: number;
  max: number;
  step: number;
  decimals: number;
};

// ranges match the validation on the backend DewarpConfig model
const FISHEYE_FIELDS: FisheyeField[] = [
  { key: "center_x", min: 0, max: 1, step: 0.001, decimals: 3 },
  { key: "center_y", min: 0, max: 1, step: 0.001, decimals: 3 },
  { key: "radius", min: 0.05, max: 1, step: 0.001, decimals: 3 },
  { key: "fov", min: 90, max: 360, step: 1, decimals: 0 },
  { key: "pan", min: -180, max: 180, step: 0.5, decimals: 1 },
  { key: "tilt", min: -90, max: 90, step: 0.5, decimals: 1 },
];

export default function FisheyeDewarpView({
  selectedCamera,
  setUnsavedChanges,
}: FisheyeDewarpViewProps) {
  const { t } = useTranslation(["views/settings"]);
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const [changedValue, setChangedValue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const viewerRef = useRef<Camera360ViewerHandle>(null);

  const [settings, setSettings] = useState<FisheyeSettings>(
    DEFAULT_FISHEYE_SETTINGS,
  );
  const [origSettings, setOrigSettings] = useState<FisheyeSettings>(
    DEFAULT_FISHEYE_SETTINGS,
  );

  const cameraConfig = useMemo(() => {
    if (config && selectedCamera) {
      return config.cameras[selectedCamera];
    }
  }, [config, selectedCamera]);

  useEffect(() => {
    if (cameraConfig) {
      const saved = { ...DEFAULT_FISHEYE_SETTINGS, ...cameraConfig.dewarp };
      setSettings(saved);
      setOrigSettings(saved);
      setChangedValue(false);
    }
    // only reset the form when the camera changes, not on every config refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera]);

  const handleSettingsChange = (newSettings: Partial<FisheyeSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    setUnsavedChanges(true);
    setChangedValue(true);
  };

  const handleFrame = useCallback((image: HTMLImageElement) => {
    viewerRef.current?.updateFrame(image);
  }, []);

  const saveToConfig = useCallback(async () => {
    setIsLoading(true);

    const params = FISHEYE_FIELDS.map(
      ({ key }) => `cameras.${selectedCamera}.dewarp.${key}=${settings[key]}`,
    ).join("&");

    axios
      .put(`config/set?${params}`, { requires_restart: 0 })
      .then((res) => {
        if (res.status === 200) {
          toast.success(t("fisheyeDewarp.toast.success"), {
            position: "top-center",
          });
          setOrigSettings(settings);
          setChangedValue(false);
          setUnsavedChanges(false);
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
            errorMessage: error.response?.data?.message ?? error.message,
            ns: "common",
          }),
          { position: "top-center" },
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [updateConfig, settings, selectedCamera, setUnsavedChanges, t]);

  const onCancel = useCallback(() => {
    setSettings(origSettings);
    setChangedValue(false);
    setUnsavedChanges(false);
  }, [origSettings, setUnsavedChanges]);

  useEffect(() => {
    document.title = t("documentTitle.fisheyeDewarp");
  }, [t]);

  if (!cameraConfig && !selectedCamera) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col md:flex-row">
      <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mr-3 md:mt-0 md:w-3/12">
        <Heading as="h4" className="mb-2">
          {t("fisheyeDewarp.title")}
        </Heading>
        <div className="my-3 space-y-3 text-sm text-muted-foreground">
          <p>{t("fisheyeDewarp.desc")}</p>
          <p>{t("fisheyeDewarp.previewTip")}</p>
        </div>
        <Separator className="my-2 flex bg-secondary" />
        <div className="flex w-full flex-col space-y-6">
          {FISHEYE_FIELDS.map(({ key, min, max, step, decimals }) => (
            <div key={key} className="mt-2 space-y-3">
              <div className="space-y-0.5">
                <Label htmlFor={`fisheye-${key}`}>
                  {t(`fisheyeDewarp.${key}.title`)}
                </Label>
                <div className="my-2 text-sm text-muted-foreground">
                  {t(`fisheyeDewarp.${key}.desc`)}
                </div>
              </div>
              <div className="flex flex-row justify-between">
                <Slider
                  id={`fisheye-${key}`}
                  className="w-full"
                  value={[settings[key]]}
                  min={min}
                  max={max}
                  step={step}
                  onValueChange={(value) => {
                    handleSettingsChange({ [key]: value[0] });
                  }}
                />
                <div className="align-center ml-6 mr-2 flex w-14 justify-end text-lg">
                  {settings[key].toFixed(decimals)}
                </div>
              </div>
            </div>
          ))}
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
                  <ActivityIndicator className="size-4" />
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
          <div className="relative size-full min-h-10">
            {/* keeps fetching frames for the viewer, but is not shown itself */}
            <AutoUpdatingCameraImage
              camera={cameraConfig.name}
              showFps={false}
              className="size-full"
              cameraClasses="invisible relative w-full h-full flex flex-col justify-start"
              onFrame={handleFrame}
            />
            <Camera360Viewer
              ref={viewerRef}
              className="absolute inset-0"
              settings={settings}
            />
          </div>
        </div>
      ) : (
        <Skeleton className="size-full rounded-lg md:rounded-2xl" />
      )}
    </div>
  );
}
