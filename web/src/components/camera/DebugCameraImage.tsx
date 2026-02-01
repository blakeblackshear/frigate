import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { CameraConfig } from "@/types/frigateConfig";
import { Button } from "../ui/button";
import { LuSettings } from "react-icons/lu";
import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import AutoUpdatingCameraImage from "./AutoUpdatingCameraImage";
import { useTranslation } from "react-i18next";

type Options = { [key: string]: boolean };

const emptyObject = Object.freeze({});

type DebugCameraImageProps = {
  className?: string;
  cameraConfig: CameraConfig;
};

export default function DebugCameraImage({
  className,
  cameraConfig,
}: DebugCameraImageProps) {
  const { t } = useTranslation(["components/camera"]);
  const [showSettings, setShowSettings] = useState(false);
  const [options, setOptions] = useUserPersistence<Options>(
    `${cameraConfig?.name}-feed`,
    emptyObject,
  );
  const handleSetOption = useCallback(
    (id: string, value: boolean) => {
      const newOptions = { ...options, [id]: value };
      setOptions(newOptions);
    },
    [options, setOptions],
  );
  const searchParams = useMemo(
    () =>
      new URLSearchParams(
        Object.keys(options || {}).reduce((memo, key) => {
          //@ts-expect-error we know this is correct
          memo.push([key, options[key] === true ? "1" : "0"]);
          return memo;
        }, []),
      ),
    [options],
  );
  const handleToggleSettings = useCallback(() => {
    setShowSettings(!showSettings);
  }, [showSettings]);

  return (
    <div className={className}>
      <AutoUpdatingCameraImage
        camera={cameraConfig.name}
        searchParams={searchParams}
        cameraClasses="relative w-full h-full flex justify-center"
      />
      <Button
        onClick={handleToggleSettings}
        variant="link"
        size="sm"
        aria-label={t("debug.options.label")}
      >
        <span className="h-5 w-5">
          <LuSettings />
        </span>{" "}
        <span>
          {showSettings
            ? t("debug.options.hideOptions")
            : t("debug.options.showOptions")}
        </span>
      </Button>
      {showSettings ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("debug.options.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DebugSettings
              handleSetOption={handleSetOption}
              options={options || {}}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

type DebugSettingsProps = {
  handleSetOption: (id: string, value: boolean) => void;
  options: Options;
};

function DebugSettings({ handleSetOption, options }: DebugSettingsProps) {
  const { t } = useTranslation(["components/camera"]);
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      <div className="flex items-center space-x-2">
        <Switch
          id="bbox"
          checked={options["bbox"]}
          onCheckedChange={(isChecked) => {
            handleSetOption("bbox", isChecked);
          }}
        />
        <Label htmlFor="bbox">{t("debug.boundingBox")}</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="timestamp"
          checked={options["timestamp"]}
          onCheckedChange={(isChecked) => {
            handleSetOption("timestamp", isChecked);
          }}
        />
        <Label htmlFor="timestamp">{t("debug.timestamp")}</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="zones"
          checked={options["zones"]}
          onCheckedChange={(isChecked) => {
            handleSetOption("zones", isChecked);
          }}
        />
        <Label htmlFor="zones">{t("debug.zones")}</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="mask"
          checked={options["mask"]}
          onCheckedChange={(isChecked) => {
            handleSetOption("mask", isChecked);
          }}
        />
        <Label htmlFor="mask">{t("debug.mask")}</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="motion"
          checked={options["motion"]}
          onCheckedChange={(isChecked) => {
            handleSetOption("motion", isChecked);
          }}
        />
        <Label htmlFor="motion">{t("debug.motion")}</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="regions"
          checked={options["regions"]}
          onCheckedChange={(isChecked) => {
            handleSetOption("regions", isChecked);
          }}
        />
        <Label htmlFor="regions">{t("debug.regions")}</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="paths"
          checked={options["paths"]}
          onCheckedChange={(isChecked) => {
            handleSetOption("paths", isChecked);
          }}
        />
        <Label htmlFor="paths">{t("debug.paths")}</Label>
      </div>
    </div>
  );
}
