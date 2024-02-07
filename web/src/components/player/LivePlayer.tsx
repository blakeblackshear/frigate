import WebRtcPlayer from "./WebRTCPlayer";
import { CameraConfig } from "@/types/frigateConfig";
import AutoUpdatingCameraImage from "../camera/AutoUpdatingCameraImage";
import ActivityIndicator from "../ui/activity-indicator";
import { Button } from "../ui/button";
import { LuSettings } from "react-icons/lu";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { usePersistence } from "@/hooks/use-persistence";
import MSEPlayer from "./MsePlayer";
import JSMpegPlayer from "./JSMpegPlayer";
import { MdCircle, MdLeakAdd, MdSelectAll } from "react-icons/md";
import { BsSoundwave } from "react-icons/bs";
import Chip from "../Chip";
import useCameraActivity from "@/hooks/use-camera-activity";
import CameraImage from "../camera/CameraImage";

const emptyObject = Object.freeze({});

type LivePlayerMode = "webrtc" | "mse" | "jsmpeg" | "debug";

type LivePlayerProps = {
  className?: string;
  cameraConfig: CameraConfig;
  liveMode?: LivePlayerMode;
  liveChips?: boolean;
  showStillWithoutActivity?: boolean;
};

type Options = { [key: string]: boolean };

export default function LivePlayer({
  className,
  cameraConfig,
  liveMode = "mse",
  liveChips = false,
  showStillWithoutActivity = true,
}: LivePlayerProps) {
  // camera activity
  const { activeMotion, activeAudio, activeTracking } =
    useCameraActivity(cameraConfig);

  const [liveReady, setLiveReady] = useState(false);
  useEffect(() => {
    if (!liveReady) {
      return;
    }

    if (!activeMotion && !activeTracking) {
      setLiveReady(false);
    }
  }, [activeMotion, activeTracking, liveReady]);

  // debug view settings

  const [showSettings, setShowSettings] = useState(false);
  const [options, setOptions] = usePersistence(
    `${cameraConfig?.name}-feed`,
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

  if (!cameraConfig) {
    return <ActivityIndicator />;
  }

  let player;
  if (liveMode == "webrtc") {
    player = (
      <WebRtcPlayer
        className="rounded-2xl w-full"
        camera={cameraConfig.live.stream_name}
      />
    );
  } else if (liveMode == "mse") {
    if ("MediaSource" in window || "ManagedMediaSource" in window) {
      player = (
        <MSEPlayer
          className="rounded-2xl"
          camera={cameraConfig.name}
          onPlaying={() => setLiveReady(true)}
        />
      );
    } else {
      player = (
        <div className="w-5xl text-center text-sm">
          MSE is only supported on iOS 17.1+. You'll need to update if available
          or use jsmpeg / webRTC streams. See the docs for more info.
        </div>
      );
    }
  } else if (liveMode == "jsmpeg") {
    player = (
      <JSMpegPlayer
        camera={cameraConfig.name}
        width={cameraConfig.detect.width}
        height={cameraConfig.detect.height}
      />
    );
  } else if (liveMode == "debug") {
    player = (
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
    player = <ActivityIndicator />;
  }

  return (
    <div className={`relative flex justify-center ${className}`}>
      {(showStillWithoutActivity == false || activeMotion || activeTracking) &&
        player}

      {showStillWithoutActivity && !liveReady && (
        <div className="absolute left-0 top-0 right-0 bottom-0">
          <AutoUpdatingCameraImage
            className="w-full h-full"
            camera={cameraConfig.name}
            showFps={false}
            reloadInterval={30000}
            fitAspect={
              cameraConfig.detect.width / cameraConfig.detect.height > 2 ||
              cameraConfig.detect.width / cameraConfig.detect.height < 1
                ? undefined
                : 16 / 9
            }
            searchParams={`cache=${123}`}
          />
        </div>
      )}

      {liveChips && (
        <div className="absolute flex left-2 top-2 gap-2">
          <Chip className="bg-gray-500 bg-gradient-to-br">
            <MdLeakAdd
              className={`w-4 h-4 ${
                activeMotion ? "text-motion" : "text-white"
              }`}
            />
            <div className="ml-1 capitalize text-white text-xs">Motion</div>
          </Chip>
          {cameraConfig.audio.enabled_in_config && (
            <Chip className="bg-gray-500 bg-gradient-to-br">
              <BsSoundwave
                className={`w-4 h-4 ${
                  activeAudio ? "text-audio" : "text-white"
                }`}
              />
              <div className="ml-1 capitalize text-white text-xs">Sound</div>
            </Chip>
          )}
          <Chip className="bg-gray-500 bg-gradient-to-br">
            <MdSelectAll
              className={`w-4 h-4 ${
                activeTracking ? "text-object" : "text-white"
              }`}
            />
            <div className="ml-1 capitalize text-white text-xs">Tracking</div>
          </Chip>
        </div>
      )}
      <Chip className="absolute right-2 top-2 bg-gray-500 bg-gradient-to-br">
        <MdCircle className="w-2 h-2 text-danger" />
        <div className="ml-1 capitalize text-white text-xs">
          {cameraConfig.name.replaceAll("_", " ")}
        </div>
      </Chip>
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
