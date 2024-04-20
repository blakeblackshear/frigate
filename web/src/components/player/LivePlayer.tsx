import WebRtcPlayer from "./WebRTCPlayer";
import { CameraConfig } from "@/types/frigateConfig";
import AutoUpdatingCameraImage from "../camera/AutoUpdatingCameraImage";
import ActivityIndicator from "../indicators/activity-indicator";
import { useEffect, useMemo, useState } from "react";
import MSEPlayer from "./MsePlayer";
import JSMpegPlayer from "./JSMpegPlayer";
import { MdCircle } from "react-icons/md";
import { useCameraActivity } from "@/hooks/use-camera-activity";
import { LivePlayerMode } from "@/types/live";
import useCameraLiveMode from "@/hooks/use-camera-live-mode";

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
}: LivePlayerProps) {
  // camera activity

  const { activeMotion, activeTracking } = useCameraActivity(cameraConfig);

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
        className={`rounded-2xl size-full ${liveReady ? "" : "hidden"}`}
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
          className={`rounded-2xl size-full ${liveReady ? "" : "hidden"}`}
          camera={cameraConfig.name}
          playbackEnabled={cameraActive}
          audioEnabled={playAudio}
          onPlaying={() => setLiveReady(true)}
          pip={pip}
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
        className="size-full flex justify-center rounded-2xl overflow-hidden"
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
      ref={cameraRef}
      data-camera={cameraConfig.name}
      className={`relative flex justify-center ${liveMode == "jsmpeg" ? "size-full" : "w-full"} outline cursor-pointer ${
        activeTracking
          ? "outline-severity_alert outline-3 rounded-2xl shadow-severity_alert"
          : "outline-0 outline-background"
      } transition-all duration-500 ${className}`}
      onClick={onClick}
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
