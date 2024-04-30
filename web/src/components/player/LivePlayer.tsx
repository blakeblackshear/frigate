import WebRtcPlayer from "./WebRTCPlayer";
import { CameraConfig } from "@/types/frigateConfig";
import AutoUpdatingCameraImage from "../camera/AutoUpdatingCameraImage";
import ActivityIndicator from "../indicators/activity-indicator";
import { useEffect, useMemo, useState } from "react";
import MSEPlayer from "./MsePlayer";
import JSMpegPlayer from "./JSMpegPlayer";
import { MdCircle } from "react-icons/md";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useCameraActivity } from "@/hooks/use-camera-activity";
import { LivePlayerMode, VideoResolutionType } from "@/types/live";
import useCameraLiveMode from "@/hooks/use-camera-live-mode";
import { getIconForLabel } from "@/utils/iconUtil";
import Chip from "../indicators/Chip";
import { isMobile } from "react-device-detect";
import { capitalizeFirstLetter } from "@/utils/stringUtil";

type LivePlayerProps = {
  cameraRef?: (ref: HTMLDivElement | null) => void;
  className?: string;
  cameraConfig: CameraConfig;
  preferredLiveMode?: LivePlayerMode;
  showStillWithoutActivity?: boolean;
  windowVisible?: boolean;
  playAudio?: boolean;
  micEnabled?: boolean; // only webrtc supports mic
  iOSCompatFullScreen?: boolean;
  pip?: boolean;
  onClick?: () => void;
  setFullResolution?: React.Dispatch<React.SetStateAction<VideoResolutionType>>;
};

export default function LivePlayer({
  cameraRef = undefined,
  className,
  cameraConfig,
  preferredLiveMode,
  showStillWithoutActivity = true,
  windowVisible = true,
  playAudio = false,
  micEnabled = false,
  iOSCompatFullScreen = false,
  pip,
  onClick,
  setFullResolution,
}: LivePlayerProps) {
  const [cameraHovered, setCameraHovered] = useState(false);

  // camera activity

  const { activeMotion, activeTracking, activeObjects } =
    useCameraActivity(cameraConfig);

  const cameraActive = useMemo(
    () =>
      !showStillWithoutActivity ||
      (windowVisible && (activeMotion || activeTracking)),
    [activeMotion, activeTracking, showStillWithoutActivity, windowVisible],
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
        className={`rounded-lg md:rounded-2xl size-full ${liveReady ? "" : "hidden"}`}
        camera={cameraConfig.live.stream_name}
        playbackEnabled={cameraActive}
        audioEnabled={playAudio}
        microphoneEnabled={micEnabled}
        iOSCompatFullScreen={iOSCompatFullScreen}
        onPlaying={() => setLiveReady(true)}
        pip={pip}
      />
    );
  } else if (liveMode == "mse") {
    if ("MediaSource" in window || "ManagedMediaSource" in window) {
      player = (
        <MSEPlayer
          className={`rounded-lg md:rounded-2xl size-full ${liveReady ? "" : "hidden"}`}
          camera={cameraConfig.live.stream_name}
          playbackEnabled={cameraActive}
          audioEnabled={playAudio}
          onPlaying={() => setLiveReady(true)}
          pip={pip}
          setFullResolution={setFullResolution}
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
        className="size-full flex justify-center rounded-lg md:rounded-2xl overflow-hidden"
        camera={cameraConfig.live.stream_name}
        width={cameraConfig.detect.width}
        height={cameraConfig.detect.height}
      />
    );
  } else {
    player = <ActivityIndicator />;
  }

  return (
    <div
      ref={cameraRef}
      data-camera={cameraConfig.name}
      className={`relative flex justify-center ${liveMode == "jsmpeg" ? "size-full" : "w-full"} outline cursor-pointer ${
        activeTracking
          ? "outline-severity_alert outline-3 rounded-lg md:rounded-2xl shadow-severity_alert"
          : "outline-0 outline-background"
      } transition-all duration-500 ${className}`}
      onClick={onClick}
      onMouseEnter={() => setCameraHovered(true)}
      onMouseLeave={() => setCameraHovered(false)}
    >
      <div className="absolute top-0 inset-x-0 rounded-lg md:rounded-2xl z-10 w-full h-[30%] bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 inset-x-0 rounded-lg md:rounded-2xl z-10 w-full h-[10%] bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
      {player}

      {activeObjects.length > 0 && (
        <div className="absolute left-0 top-2 z-40">
          <Tooltip>
            <div className="flex">
              <TooltipTrigger asChild>
                <div className="mx-3 pb-1 text-white text-sm">
                  <Chip
                    className={`flex items-start justify-between space-x-1 ${cameraHovered || isMobile ? "" : "hidden"} bg-gradient-to-br from-gray-400 to-gray-500 bg-gray-500 z-0`}
                  >
                    {[
                      ...new Set([
                        ...(activeObjects || []).map(({ label }) => label),
                      ]),
                    ]
                      .map((label) => {
                        return getIconForLabel(label, "size-3 text-white");
                      })
                      .sort()}
                  </Chip>
                </div>
              </TooltipTrigger>
            </div>
            <TooltipContent className="capitalize">
              {[
                ...new Set([
                  ...(activeObjects || []).map(({ label }) => label),
                ]),
              ]
                .filter(
                  (label) =>
                    label !== undefined && !label.includes("-verified"),
                )
                .map((label) => capitalizeFirstLetter(label))
                .sort()
                .join(", ")
                .replaceAll("-verified", "")}
            </TooltipContent>
          </Tooltip>
        </div>
      )}

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
          cameraClasses="relative w-full h-full flex justify-center"
        />
      </div>

      <div className="absolute right-2 top-2 size-4">
        {activeMotion && (
          <MdCircle className="size-2 drop-shadow-md shadow-danger text-danger animate-pulse" />
        )}
      </div>
    </div>
  );
}
