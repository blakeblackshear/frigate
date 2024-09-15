import WebRtcPlayer from "./WebRTCPlayer";
import { CameraConfig } from "@/types/frigateConfig";
import AutoUpdatingCameraImage from "../camera/AutoUpdatingCameraImage";
import ActivityIndicator from "../indicators/activity-indicator";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MSEPlayer from "./MsePlayer";
import JSMpegPlayer from "./JSMpegPlayer";
import { MdCircle } from "react-icons/md";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useCameraActivity } from "@/hooks/use-camera-activity";
import {
  LivePlayerError,
  LivePlayerMode,
  VideoResolutionType,
} from "@/types/live";
import { getIconForLabel } from "@/utils/iconUtil";
import Chip from "../indicators/Chip";
import { capitalizeFirstLetter } from "@/utils/stringUtil";
import { cn } from "@/lib/utils";
import { TbExclamationCircle } from "react-icons/tb";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { baseUrl } from "@/api/baseUrl";

type LivePlayerProps = {
  cameraRef?: (ref: HTMLDivElement | null) => void;
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
  className?: string;
  cameraConfig: CameraConfig;
  preferredLiveMode: LivePlayerMode;
  showStillWithoutActivity?: boolean;
  windowVisible?: boolean;
  playAudio?: boolean;
  micEnabled?: boolean; // only webrtc supports mic
  iOSCompatFullScreen?: boolean;
  pip?: boolean;
  autoLive?: boolean;
  onClick?: () => void;
  setFullResolution?: React.Dispatch<React.SetStateAction<VideoResolutionType>>;
  onError?: (error: LivePlayerError) => void;
  onResetLiveMode?: () => void;
};

export default function LivePlayer({
  cameraRef = undefined,
  containerRef,
  className,
  cameraConfig,
  preferredLiveMode,
  showStillWithoutActivity = true,
  windowVisible = true,
  playAudio = false,
  micEnabled = false,
  iOSCompatFullScreen = false,
  pip,
  autoLive = true,
  onClick,
  setFullResolution,
  onError,
  onResetLiveMode,
}: LivePlayerProps) {
  const internalContainerRef = useRef<HTMLDivElement | null>(null);

  // camera activity

  const { activeMotion, activeTracking, objects, offline } =
    useCameraActivity(cameraConfig);

  const cameraActive = useMemo(
    () =>
      !showStillWithoutActivity ||
      (windowVisible && (activeMotion || activeTracking)),
    [activeMotion, activeTracking, showStillWithoutActivity, windowVisible],
  );

  // camera live state

  const [liveReady, setLiveReady] = useState(false);

  const liveReadyRef = useRef(liveReady);
  const cameraActiveRef = useRef(cameraActive);

  useEffect(() => {
    liveReadyRef.current = liveReady;
    cameraActiveRef.current = cameraActive;
  }, [liveReady, cameraActive]);

  useEffect(() => {
    if (!autoLive || !liveReady) {
      return;
    }

    if (!cameraActive) {
      const timer = setTimeout(() => {
        if (liveReadyRef.current && !cameraActiveRef.current) {
          setLiveReady(false);
          onResetLiveMode?.();
        }
      }, 500);

      return () => {
        clearTimeout(timer);
      };
    }
    // live mode won't change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLive, cameraActive, liveReady]);

  // camera still state

  const stillReloadInterval = useMemo(() => {
    if (!windowVisible || offline || !showStillWithoutActivity) {
      return -1; // no reason to update the image when the window is not visible
    }

    if (liveReady && !cameraActive) {
      return 300;
    }

    if (liveReady) {
      return 60000;
    }

    if (activeMotion || activeTracking) {
      if (autoLive) {
        return 200;
      } else {
        return 59000;
      }
    }

    return 30000;
  }, [
    autoLive,
    showStillWithoutActivity,
    liveReady,
    activeMotion,
    activeTracking,
    offline,
    windowVisible,
    cameraActive,
  ]);

  useEffect(() => {
    setLiveReady(false);
  }, [preferredLiveMode]);

  const playerIsPlaying = useCallback(() => {
    setLiveReady(true);
  }, []);

  if (!cameraConfig) {
    return <ActivityIndicator />;
  }

  let player;
  if (!autoLive) {
    player = null;
  } else if (preferredLiveMode == "webrtc") {
    player = (
      <WebRtcPlayer
        className={`size-full rounded-lg md:rounded-2xl ${liveReady ? "" : "hidden"}`}
        camera={cameraConfig.live.stream_name}
        playbackEnabled={cameraActive || liveReady}
        audioEnabled={playAudio}
        microphoneEnabled={micEnabled}
        iOSCompatFullScreen={iOSCompatFullScreen}
        onPlaying={playerIsPlaying}
        pip={pip}
        onError={onError}
      />
    );
  } else if (preferredLiveMode == "mse") {
    if ("MediaSource" in window || "ManagedMediaSource" in window) {
      player = (
        <MSEPlayer
          className={`size-full rounded-lg md:rounded-2xl ${liveReady ? "" : "hidden"}`}
          camera={cameraConfig.live.stream_name}
          playbackEnabled={cameraActive || liveReady}
          audioEnabled={playAudio}
          onPlaying={playerIsPlaying}
          pip={pip}
          setFullResolution={setFullResolution}
          onError={onError}
        />
      );
    } else {
      player = (
        <div className="w-5xl text-center text-sm">
          iOS 17.1 or greater is required for this live stream type.
        </div>
      );
    }
  } else if (preferredLiveMode == "jsmpeg") {
    if (cameraActive || !showStillWithoutActivity || liveReady) {
      player = (
        <JSMpegPlayer
          className="flex justify-center overflow-hidden rounded-lg md:rounded-2xl"
          camera={cameraConfig.name}
          width={cameraConfig.detect.width}
          height={cameraConfig.detect.height}
          playbackEnabled={
            cameraActive || !showStillWithoutActivity || liveReady
          }
          containerRef={containerRef ?? internalContainerRef}
          onPlaying={playerIsPlaying}
        />
      );
    } else {
      player = null;
    }
  } else {
    player = <ActivityIndicator />;
  }

  return (
    <div
      ref={cameraRef ?? internalContainerRef}
      data-camera={cameraConfig.name}
      className={cn(
        "relative flex w-full cursor-pointer justify-center outline",
        activeTracking &&
          ((showStillWithoutActivity && !liveReady) || liveReady)
          ? "outline-3 rounded-lg shadow-severity_alert outline-severity_alert md:rounded-2xl"
          : "outline-0 outline-background",
        "transition-all duration-500",
        className,
      )}
      onClick={onClick}
      onAuxClick={(e) => {
        if (e.button === 1) {
          window.open(`${baseUrl}#${cameraConfig.name}`, "_blank")?.focus();
        }
      }}
    >
      {((showStillWithoutActivity && !liveReady) || liveReady) && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[30%] w-full rounded-lg bg-gradient-to-b from-black/20 to-transparent md:rounded-2xl"></div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[10%] w-full rounded-lg bg-gradient-to-t from-black/20 to-transparent md:rounded-2xl"></div>
        </>
      )}
      {player}
      {!offline && !showStillWithoutActivity && !liveReady && (
        <ActivityIndicator />
      )}

      {((showStillWithoutActivity && !liveReady) || liveReady) &&
        objects.length > 0 && (
          <div className="absolute left-0 top-2 z-40">
            <Tooltip>
              <div className="flex">
                <TooltipTrigger asChild>
                  <div className="mx-3 pb-1 text-sm text-white">
                    <Chip
                      className={`z-0 flex items-start justify-between space-x-1 bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500`}
                    >
                      {[
                        ...new Set([
                          ...(objects || []).map(({ label }) => label),
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
              <TooltipPortal>
                <TooltipContent className="capitalize">
                  {[
                    ...new Set([
                      ...(objects || []).map(({ label, sub_label }) =>
                        label.endsWith("verified") ? sub_label : label,
                      ),
                    ]),
                  ]
                    .filter((label) => label?.includes("-verified") == false)
                    .map((label) => capitalizeFirstLetter(label))
                    .sort()
                    .join(", ")
                    .replaceAll("-verified", "")}
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          </div>
        )}

      <div
        className={cn(
          "absolute inset-0 w-full",
          showStillWithoutActivity && !liveReady ? "visible" : "invisible",
        )}
      >
        <AutoUpdatingCameraImage
          className="size-full"
          camera={cameraConfig.name}
          showFps={false}
          reloadInterval={stillReloadInterval}
          cameraClasses="relative size-full flex justify-center"
        />
      </div>

      {offline && !showStillWithoutActivity && (
        <div className="absolute inset-0 left-1/2 top-1/2 flex h-96 w-96 -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center justify-center rounded-lg bg-background/50 p-5">
            <p className="my-5 text-lg">Stream offline</p>
            <TbExclamationCircle className="mb-3 size-10" />
            <p className="max-w-96 text-center">
              No frames have been received on the{" "}
              {capitalizeFirstLetter(cameraConfig.name)} <code>detect</code>{" "}
              stream, check error logs
            </p>
          </div>
        </div>
      )}

      <div className="absolute right-2 top-2">
        {autoLive &&
          !offline &&
          activeMotion &&
          ((showStillWithoutActivity && !liveReady) || liveReady) && (
            <MdCircle className="mr-2 size-2 animate-pulse text-danger shadow-danger drop-shadow-md" />
          )}
        {offline && showStillWithoutActivity && (
          <Chip
            className={`z-0 flex items-start justify-between space-x-1 bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500 text-xs capitalize`}
          >
            {cameraConfig.name.replaceAll("_", " ")}
          </Chip>
        )}
      </div>
    </div>
  );
}
