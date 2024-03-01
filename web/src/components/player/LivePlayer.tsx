import WebRtcPlayer from "./WebRTCPlayer";
import { CameraConfig } from "@/types/frigateConfig";
import AutoUpdatingCameraImage from "../camera/AutoUpdatingCameraImage";
import ActivityIndicator from "../ui/activity-indicator";
import { useEffect, useMemo, useState } from "react";
import MSEPlayer from "./MsePlayer";
import JSMpegPlayer from "./JSMpegPlayer";
import { MdCircle, MdLeakAdd } from "react-icons/md";
import { BsSoundwave } from "react-icons/bs";
import Chip from "../Chip";
import useCameraActivity from "@/hooks/use-camera-activity";
import { useRecordingsState } from "@/api/ws";
import { LivePlayerMode } from "@/types/live";
import useCameraLiveMode from "@/hooks/use-camera-live-mode";
import { isDesktop } from "react-device-detect";

type LivePlayerProps = {
  className?: string;
  cameraConfig: CameraConfig;
  preferredLiveMode?: LivePlayerMode;
  showStillWithoutActivity?: boolean;
  windowVisible?: boolean;
};

export default function LivePlayer({
  className,
  cameraConfig,
  preferredLiveMode,
  showStillWithoutActivity = true,
  windowVisible = true,
}: LivePlayerProps) {
  // camera activity

  const { activeMotion, activeAudio, activeTracking } =
    useCameraActivity(cameraConfig);

  const cameraActive = useMemo(
    () => windowVisible && (activeMotion || activeTracking),
    [activeMotion, activeTracking, windowVisible],
  );

  // camera live state

  const liveMode = useCameraLiveMode(cameraConfig, preferredLiveMode);

  const [liveReady, setLiveReady] = useState(false);
  useEffect(() => {
    if (!liveReady) {
      if (cameraActive && liveMode == "jsmpeg") {
        setLiveReady(true);
      }

      return;
    }

    if (!cameraActive) {
      setLiveReady(false);
    }
    // live mode won't change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, liveReady]);

  const { payload: recording } = useRecordingsState(cameraConfig.name);

  // camera still state

  const stillReloadInterval = useMemo(() => {
    if (!windowVisible) {
      return -1; // no reason to update the image when the window is not visible
    }

    if (liveReady) {
      return 60000;
    }

    if (cameraActive) {
      return 200;
    }

    return 30000;
  }, [liveReady, cameraActive, windowVisible]);

  if (!cameraConfig) {
    return <ActivityIndicator />;
  }

  let player;
  if (liveMode == "webrtc") {
    player = (
      <WebRtcPlayer
        className={`rounded-2xl h-full ${liveReady ? "" : "hidden"}`}
        camera={cameraConfig.live.stream_name}
        playbackEnabled={cameraActive}
        onPlaying={() => setLiveReady(true)}
      />
    );
  } else if (liveMode == "mse") {
    if ("MediaSource" in window || "ManagedMediaSource" in window) {
      player = (
        <MSEPlayer
          className={`rounded-2xl h-full ${liveReady ? "" : "hidden"}`}
          camera={cameraConfig.name}
          playbackEnabled={cameraActive}
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
        className="w-full flex justify-center rounded-2xl overflow-hidden"
        camera={cameraConfig.name}
        width={cameraConfig.detect.width}
        height={cameraConfig.detect.height}
      />
    );
  } else {
    player = <ActivityIndicator />;
  }

  return (
    <div
      className={`relative flex justify-center w-full outline ${
        activeTracking
          ? "outline-severity_alert outline-1 rounded-2xl shadow-[0_0_6px_2px] shadow-severity_alert"
          : "outline-0 outline-background"
      } transition-all duration-500 ${className}`}
    >
      <div className="absolute top-0 inset-x-0 rounded-2xl z-10 w-full h-[30%] bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 inset-x-0 rounded-2xl z-10 w-full h-[10%] bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
      {player}

      <div
        className={`absolute inset-0 w-full ${
          showStillWithoutActivity && !liveReady ? "visible" : "invisible"
        }`}
      >
        <AutoUpdatingCameraImage
          className="size-full"
          camera={cameraConfig.name}
          showFps={false}
          reloadInterval={stillReloadInterval}
        />
      </div>

      <div className="absolute flex left-2 top-2 gap-2">
        <Chip
          in={activeMotion}
          className={`bg-gradient-to-br from-gray-400 to-gray-500 bg-gray-500`}
        >
          <MdLeakAdd className="size-4 text-motion" />
          <div className="hidden md:block ml-1 text-white text-xs">Motion</div>
        </Chip>

        {cameraConfig.audio.enabled_in_config && (
          <Chip
            in={activeAudio}
            className={`bg-gradient-to-br from-gray-400 to-gray-500 bg-gray-500`}
          >
            <BsSoundwave className="size-4 text-audio" />
            <div className="hidden md:block ml-1 text-white text-xs">Sound</div>
          </Chip>
        )}
      </div>

      {isDesktop && (
        <Chip className="absolute right-2 top-2 bg-gradient-to-br from-gray-400 to-gray-500 bg-gray-500">
          {recording == "ON" && (
            <MdCircle className="size-2 drop-shadow-md shadow-danger text-danger" />
          )}
          <div className="ml-1 capitalize text-white text-xs">
            {cameraConfig.name.replaceAll("_", " ")}
          </div>
        </Chip>
      )}
    </div>
  );
}
