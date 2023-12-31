import WebRtcPlayer from "./WebRTCPlayer";
import { CameraConfig } from "@/types/frigateConfig";
import AutoUpdatingCameraImage from "../camera/AutoUpdatingCameraImage";
import ActivityIndicator from "../ui/activity-indicator";
import { Button } from "../ui/button";
import { LuSettings } from "react-icons/lu";
import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { usePersistence } from "@/hooks/use-persistence";
// @ts-expect-error we know this does not have types
import MSEPlayer from "@/lib/MsePlayer";
import JSMpegPlayer from "./JSMpegPlayer";
import { baseUrl } from "@/api/baseUrl";

const emptyObject = Object.freeze({});

type LivePlayerProps = {
  cameraConfig: CameraConfig;
  liveMode: string;
};

type Options = { [key: string]: boolean };

export default function LivePlayer({
  cameraConfig,
  liveMode,
}: LivePlayerProps) {
  const [showSettings, setShowSettings] = useState(false);

  const [options, setOptions] = usePersistence(
    `${cameraConfig.name}-feed`,
    emptyObject
  );

  const handleSetOption = useCallback(
    (id: string, value: boolean) => {
      const newOptions = { ...options, [id]: value };
      setOptions(newOptions);
    },
    [options, setOptions]
  );

  const searchParams = useMemo(
    () =>
      new URLSearchParams(
        Object.keys(options).reduce((memo, key) => {
          //@ts-ignore we know this is correct
          memo.push([key, options[key] === true ? "1" : "0"]);
          return memo;
        }, [])
      ),
    [options]
  );

  const handleToggleSettings = useCallback(() => {
    setShowSettings(!showSettings);
  }, [showSettings, setShowSettings]);

  if (liveMode == "webrtc") {
    return (
      <div className="max-w-5xl">
        <WebRtcPlayer camera={cameraConfig.live.stream_name} />
      </div>
    );
  } else if (liveMode == "mse") {
    if ("MediaSource" in window || "ManagedMediaSource" in window) {
      return (
        <div className="max-w-5xl">
          <MSEPlayer
            mode="mse"
            src={
              new URL(
                `${baseUrl.replace(/^http/, "ws")}live/webrtc/api/ws?src=${
                  cameraConfig.live.stream_name
                }`
              )
            }
          />
        </div>
      );
    } else {
      return (
        <div className="w-5xl text-center text-sm">
          MSE is only supported on iOS 17.1+. You'll need to update if available
          or use jsmpeg / webRTC streams. See the docs for more info.
        </div>
      );
    }
  } else if (liveMode == "jsmpeg") {
    return (
      <div className={`max-w-[${cameraConfig.detect.width}px]`}>
        <JSMpegPlayer
          camera={cameraConfig.name}
          width={cameraConfig.detect.width}
          height={cameraConfig.detect.height}
        />
      </div>
    );
  } else if (liveMode == "debug") {
    return (
      <>
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
                options={options}
              />
            </CardContent>
          </Card>
        ) : null}
      </>
    );
  } else {
    <ActivityIndicator />;
  }
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
