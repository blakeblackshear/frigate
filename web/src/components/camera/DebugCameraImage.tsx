import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { CameraConfig } from "@/types/frigateConfig";
import { Button } from "../ui/button";
import { LuSettings } from "react-icons/lu";
import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { usePersistence } from "@/hooks/use-persistence";
import AutoUpdatingCameraImage from "./AutoUpdatingCameraImage";

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
  const [showSettings, setShowSettings] = useState(false);
  const [options, setOptions] = usePersistence<Options>(
    `${cameraConfig?.name}-feed`,
    emptyObject
  );
  const handleSetOption = useCallback(
    (id: string, value: boolean) => {
      const newOptions = { ...options, [id]: value };
      setOptions(newOptions);
    },
    [options]
  );
  const searchParams = useMemo(
    () =>
      new URLSearchParams(
        Object.keys(options || {}).reduce((memo, key) => {
          //@ts-ignore we know this is correct
          memo.push([key, options[key] === true ? "1" : "0"]);
          return memo;
        }, [])
      ),
    [options]
  );
  const handleToggleSettings = useCallback(() => {
    setShowSettings(!showSettings);
  }, [showSettings]);

  return (
    <div className={className}>
      <AutoUpdatingCameraImage
        camera={cameraConfig.name}
        searchParams={searchParams}
      />
      <Button onClick={handleToggleSettings} variant="link" size="sm">
        <span className="w-5 h-5">
          <LuSettings />
        </span>{" "}
        <span>{showSettings ? "Hide" : "Show"} Options</span>
      </Button>
      {showSettings ? (
        <Card>
          <CardHeader>
            <CardTitle>Options</CardTitle>
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
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div className="flex items-center space-x-2">
        <Switch
          id="bbox"
          checked={options["bbox"]}
          onCheckedChange={(isChecked) => {
            handleSetOption("bbox", isChecked);
          }}
        />
        <Label htmlFor="bbox">Bounding Box</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="timestamp"
          checked={options["timestamp"]}
          onCheckedChange={(isChecked) => {
            handleSetOption("timestamp", isChecked);
          }}
        />
        <Label htmlFor="timestamp">Timestamp</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="zones"
          checked={options["zones"]}
          onCheckedChange={(isChecked) => {
            handleSetOption("zones", isChecked);
          }}
        />
        <Label htmlFor="zones">Zones</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="mask"
          checked={options["mask"]}
          onCheckedChange={(isChecked) => {
            handleSetOption("mask", isChecked);
          }}
        />
        <Label htmlFor="mask">Mask</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="motion"
          checked={options["motion"]}
          onCheckedChange={(isChecked) => {
            handleSetOption("motion", isChecked);
          }}
        />
        <Label htmlFor="motion">Motion</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="regions"
          checked={options["regions"]}
          onCheckedChange={(isChecked) => {
            handleSetOption("regions", isChecked);
          }}
        />
        <Label htmlFor="regions">Regions</Label>
      </div>
    </div>
  );
}
