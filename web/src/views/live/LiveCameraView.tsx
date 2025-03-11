import {
  useAudioState,
  useAutotrackingState,
  useDetectState,
  useEnabledState,
  usePtzCommand,
  useRecordingsState,
  useSnapshotsState,
} from "@/api/ws";
import CameraFeatureToggle from "@/components/dynamic/CameraFeatureToggle";
import FilterSwitch from "@/components/filter/FilterSwitch";
import LivePlayer from "@/components/player/LivePlayer";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useResizeObserver } from "@/hooks/resize-observer";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import {
  LivePlayerError,
  LiveStreamMetadata,
  VideoResolutionType,
} from "@/types/live";
import { CameraPtzInfo } from "@/types/ptz";
import { RecordingStartingPoint } from "@/types/record";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  isDesktop,
  isFirefox,
  isIOS,
  isMobile,
  isTablet,
  useMobileOrientation,
} from "react-device-detect";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  FaAngleDown,
  FaAngleLeft,
  FaAngleRight,
  FaAngleUp,
  FaCog,
  FaCompress,
  FaExpand,
  FaMicrophone,
  FaMicrophoneSlash,
} from "react-icons/fa";
import { GiSpeaker, GiSpeakerOff } from "react-icons/gi";
import {
  TbRecordMail,
  TbRecordMailOff,
  TbViewfinder,
  TbViewfinderOff,
} from "react-icons/tb";
import { IoIosWarning, IoMdArrowRoundBack } from "react-icons/io";
import {
  LuCheck,
  LuEar,
  LuEarOff,
  LuExternalLink,
  LuHistory,
  LuInfo,
  LuPictureInPicture,
  LuPower,
  LuPowerOff,
  LuVideo,
  LuVideoOff,
  LuX,
} from "react-icons/lu";
import {
  MdNoPhotography,
  MdOutlineRestartAlt,
  MdPersonOff,
  MdPersonSearch,
  MdPhotoCamera,
  MdZoomIn,
  MdZoomOut,
} from "react-icons/md";
import { Link, useNavigate } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { useSessionPersistence } from "@/hooks/use-session-persistence";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { usePersistence } from "@/hooks/use-persistence";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import axios from "axios";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useIsAdmin } from "@/hooks/use-is-admin";

type LiveCameraViewProps = {
  config?: FrigateConfig;
  camera: CameraConfig;
  supportsFullscreen: boolean;
  fullscreen: boolean;
  toggleFullscreen: () => void;
};
export default function LiveCameraView({
  config,
  camera,
  supportsFullscreen,
  fullscreen,
  toggleFullscreen,
}: LiveCameraViewProps) {
  const navigate = useNavigate();
  const { isPortrait } = useMobileOrientation();
  const mainRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [{ width: windowWidth, height: windowHeight }] =
    useResizeObserver(window);

  // supported features

  const [streamName, setStreamName] = usePersistence<string>(
    `${camera.name}-stream`,
    Object.values(camera.live.streams)[0],
  );

  const isRestreamed = useMemo(
    () =>
      config &&
      Object.keys(config.go2rtc.streams || {}).includes(streamName ?? ""),
    [config, streamName],
  );

  const { data: cameraMetadata } = useSWR<LiveStreamMetadata>(
    isRestreamed ? `go2rtc/streams/${streamName}` : null,
    {
      revalidateOnFocus: false,
    },
  );

  const supports2WayTalk = useMemo(() => {
    if (!window.isSecureContext || !cameraMetadata) {
      return false;
    }

    return (
      cameraMetadata.producers.find(
        (prod) =>
          prod.medias &&
          prod.medias.find((media) => media.includes("audio, sendonly")) !=
            undefined,
      ) != undefined
    );
  }, [cameraMetadata]);
  const supportsAudioOutput = useMemo(() => {
    if (!cameraMetadata) {
      return false;
    }

    return (
      cameraMetadata.producers.find(
        (prod) =>
          prod.medias &&
          prod.medias.find((media) => media.includes("audio, recvonly")) !=
            undefined,
      ) != undefined
    );
  }, [cameraMetadata]);

  // camera enabled state
  const { payload: enabledState } = useEnabledState(camera.name);
  const cameraEnabled = enabledState === "ON";

  // click overlay for ptzs

  const [clickOverlay, setClickOverlay] = useState(false);
  const clickOverlayRef = useRef<HTMLDivElement>(null);
  const { send: sendPtz } = usePtzCommand(camera.name);

  const handleOverlayClick = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    ) => {
      if (!clickOverlay) {
        return;
      }

      let clientX;
      let clientY;
      if ("TouchEvent" in window && e.nativeEvent instanceof TouchEvent) {
        clientX = e.nativeEvent.touches[0].clientX;
        clientY = e.nativeEvent.touches[0].clientY;
      } else if (e.nativeEvent instanceof MouseEvent) {
        clientX = e.nativeEvent.clientX;
        clientY = e.nativeEvent.clientY;
      }

      if (clickOverlayRef.current && clientX && clientY) {
        const rect = clickOverlayRef.current.getBoundingClientRect();

        const normalizedX = (clientX - rect.left) / rect.width;
        const normalizedY = (clientY - rect.top) / rect.height;

        const pan = (normalizedX - 0.5) * 2;
        const tilt = (0.5 - normalizedY) * 2;

        sendPtz(`move_relative_${pan}_${tilt}`);
      }
    },
    [clickOverlayRef, clickOverlay, sendPtz],
  );

  // pip state

  useEffect(() => {
    setPip(document.pictureInPictureElement != null);
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.pictureInPictureElement]);

  // playback state

  const [audio, setAudio] = useSessionPersistence("liveAudio", false);
  const [mic, setMic] = useState(false);
  const [webRTC, setWebRTC] = useState(false);
  const [pip, setPip] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(false);

  const [playInBackground, setPlayInBackground] = usePersistence<boolean>(
    `${camera.name}-background-play`,
    false,
  );

  const [showStats, setShowStats] = useState(false);

  const [fullResolution, setFullResolution] = useState<VideoResolutionType>({
    width: 0,
    height: 0,
  });

  const preferredLiveMode = useMemo(() => {
    if (mic) {
      return "webrtc";
    }

    if (webRTC && isRestreamed) {
      return "webrtc";
    }

    if (webRTC && !isRestreamed) {
      return "jsmpeg";
    }

    if (lowBandwidth) {
      return "jsmpeg";
    }

    if (!("MediaSource" in window || "ManagedMediaSource" in window)) {
      return "webrtc";
    }

    if (!isRestreamed) {
      return "jsmpeg";
    }

    return "mse";
  }, [lowBandwidth, mic, webRTC, isRestreamed]);

  useKeyboardListener(["m"], (key, modifiers) => {
    if (!modifiers.down) {
      return;
    }

    switch (key) {
      case "m":
        if (supportsAudioOutput) {
          setAudio(!audio);
        }
        break;
      case "t":
        if (supports2WayTalk) {
          setMic(!mic);
        }
        break;
    }
  });

  // layout state

  const windowAspectRatio = useMemo(() => {
    return windowWidth / windowHeight;
  }, [windowWidth, windowHeight]);

  const containerAspectRatio = useMemo(() => {
    if (!containerRef.current) {
      return windowAspectRatio;
    }

    return containerRef.current.clientWidth / containerRef.current.clientHeight;
  }, [windowAspectRatio, containerRef]);

  const cameraAspectRatio = useMemo(() => {
    if (fullResolution.width && fullResolution.height) {
      return fullResolution.width / fullResolution.height;
    } else {
      return camera.detect.width / camera.detect.height;
    }
  }, [camera, fullResolution]);

  const constrainedAspectRatio = useMemo<number>(() => {
    if (isMobile || fullscreen) {
      return cameraAspectRatio;
    } else {
      return containerAspectRatio < cameraAspectRatio
        ? containerAspectRatio
        : cameraAspectRatio;
    }
  }, [cameraAspectRatio, containerAspectRatio, fullscreen]);

  const growClassName = useMemo(() => {
    if (isMobile) {
      if (isPortrait) {
        return "absolute left-0.5 right-0.5 top-[50%] -translate-y-[50%]";
      } else {
        if (cameraAspectRatio > containerAspectRatio) {
          return "p-2 absolute left-0 top-[50%] -translate-y-[50%]";
        } else {
          return "p-2 absolute top-0.5 bottom-0.5 left-[50%] -translate-x-[50%]";
        }
      }
    }

    if (fullscreen) {
      if (cameraAspectRatio > containerAspectRatio) {
        return "absolute inset-x-2 top-[50%] -translate-y-[50%]";
      } else {
        return "absolute inset-y-2 left-[50%] -translate-x-[50%]";
      }
    } else {
      return "absolute top-0.5 bottom-0.5 left-[50%] -translate-x-[50%]";
    }
  }, [fullscreen, isPortrait, cameraAspectRatio, containerAspectRatio]);

  // On mobile devices that support it, try to orient screen
  // to best fit the camera feed in fullscreen mode
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const screenOrientation = screen.orientation as any;
    if (!screenOrientation.lock || !screenOrientation.unlock) {
      // Browser does not support ScreenOrientation APIs that we need
      return;
    }

    if (fullscreen) {
      const orientationForBestFit =
        cameraAspectRatio > 1 ? "landscape" : "portrait";

      // If the current device doesn't support locking orientation,
      // this promise will reject with an error that we can ignore
      screenOrientation.lock(orientationForBestFit).catch(() => {});
    }

    return () => screenOrientation.unlock();
  }, [fullscreen, cameraAspectRatio]);

  const handleError = useCallback(
    (e: LivePlayerError) => {
      if (e) {
        if (
          !webRTC &&
          config &&
          config.go2rtc?.webrtc?.candidates?.length > 0
        ) {
          setWebRTC(true);
        } else {
          setWebRTC(false);
          setLowBandwidth(true);
        }
      }
    },
    [config, webRTC],
  );

  return (
    <TransformWrapper minScale={1.0} wheel={{ smoothStep: 0.005 }}>
      <Toaster position="top-center" closeButton={true} />
      <div
        ref={mainRef}
        className={
          fullscreen
            ? `fixed inset-0 z-30 bg-black`
            : `flex size-full flex-col p-2 ${isMobile ? "landscape:flex-row landscape:gap-1" : ""}`
        }
      >
        <div
          className={
            fullscreen
              ? `absolute right-32 top-1 z-40 ${isMobile ? "landscape:bottom-1 landscape:left-2 landscape:right-auto landscape:top-auto" : ""}`
              : `flex h-12 w-full flex-row items-center justify-between ${isMobile ? "landscape:h-full landscape:w-12 landscape:flex-col" : ""}`
          }
        >
          {!fullscreen ? (
            <div
              className={`flex items-center gap-2 ${isMobile ? "landscape:flex-col" : ""}`}
            >
              <Button
                className={`flex items-center gap-2.5 rounded-lg`}
                aria-label="Go back"
                size="sm"
                onClick={() => navigate(-1)}
              >
                <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
                {isDesktop && <div className="text-primary">Back</div>}
              </Button>
              <Button
                className="flex items-center gap-2.5 rounded-lg"
                aria-label="Show historical footage"
                size="sm"
                onClick={() => {
                  navigate("review", {
                    state: {
                      severity: "alert",
                      recording: {
                        camera: camera.name,
                        startTime: Date.now() / 1000 - 30,
                        severity: "alert",
                      } as RecordingStartingPoint,
                    },
                  });
                }}
              >
                <LuHistory className="size-5 text-secondary-foreground" />
                {isDesktop && <div className="text-primary">History</div>}
              </Button>
            </div>
          ) : (
            <div />
          )}
          <TooltipProvider>
            <div
              className={`flex flex-row items-center gap-2 *:rounded-lg ${isMobile ? "landscape:flex-col" : ""}`}
            >
              {fullscreen && (
                <Button
                  className="bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500 text-primary"
                  aria-label="Go back"
                  size="sm"
                  onClick={() => navigate(-1)}
                >
                  <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
                  {isDesktop && (
                    <div className="text-secondary-foreground">Back</div>
                  )}
                </Button>
              )}
              {supportsFullscreen && (
                <CameraFeatureToggle
                  className="p-2 md:p-0"
                  variant={fullscreen ? "overlay" : "primary"}
                  Icon={fullscreen ? FaCompress : FaExpand}
                  isActive={fullscreen}
                  title={fullscreen ? "Close" : "Fullscreen"}
                  onClick={toggleFullscreen}
                />
              )}
              {!isIOS && !isFirefox && preferredLiveMode != "jsmpeg" && (
                <CameraFeatureToggle
                  className="p-2 md:p-0"
                  variant={fullscreen ? "overlay" : "primary"}
                  Icon={LuPictureInPicture}
                  isActive={pip}
                  title={pip ? "Close" : "Picture in Picture"}
                  onClick={() => {
                    if (!pip) {
                      setPip(true);
                    } else {
                      document.exitPictureInPicture();
                      setPip(false);
                    }
                  }}
                  disabled={!cameraEnabled}
                />
              )}
              {supports2WayTalk && (
                <CameraFeatureToggle
                  className="p-2 md:p-0"
                  variant={fullscreen ? "overlay" : "primary"}
                  Icon={mic ? FaMicrophone : FaMicrophoneSlash}
                  isActive={mic}
                  title={`${mic ? "Disable" : "Enable"} Two Way Talk`}
                  onClick={() => {
                    setMic(!mic);
                    if (!mic && !audio) {
                      setAudio(true);
                    }
                  }}
                  disabled={!cameraEnabled}
                />
              )}
              {supportsAudioOutput && preferredLiveMode != "jsmpeg" && (
                <CameraFeatureToggle
                  className="p-2 md:p-0"
                  variant={fullscreen ? "overlay" : "primary"}
                  Icon={audio ? GiSpeaker : GiSpeakerOff}
                  isActive={audio ?? false}
                  title={`${audio ? "Disable" : "Enable"} Camera Audio`}
                  onClick={() => setAudio(!audio)}
                  disabled={!cameraEnabled}
                />
              )}
              <FrigateCameraFeatures
                camera={camera}
                recordingEnabled={camera.record.enabled_in_config}
                audioDetectEnabled={camera.audio.enabled_in_config}
                autotrackingEnabled={
                  camera.onvif.autotracking.enabled_in_config
                }
                fullscreen={fullscreen}
                streamName={streamName ?? ""}
                setStreamName={setStreamName}
                preferredLiveMode={preferredLiveMode}
                playInBackground={playInBackground ?? false}
                setPlayInBackground={setPlayInBackground}
                showStats={showStats}
                setShowStats={setShowStats}
                isRestreamed={isRestreamed ?? false}
                setLowBandwidth={setLowBandwidth}
                supportsAudioOutput={supportsAudioOutput}
                supports2WayTalk={supports2WayTalk}
                cameraEnabled={cameraEnabled}
              />
            </div>
          </TooltipProvider>
        </div>
        <div id="player-container" className="size-full" ref={containerRef}>
          <TransformComponent
            wrapperStyle={{
              width: "100%",
              height: "100%",
            }}
            contentStyle={{
              position: "relative",
              width: "100%",
              height: "100%",
              padding: "8px",
            }}
          >
            <div
              className={`flex flex-col items-center justify-center ${growClassName}`}
              ref={clickOverlayRef}
              onClick={handleOverlayClick}
              style={{
                aspectRatio: constrainedAspectRatio,
              }}
            >
              <LivePlayer
                key={camera.name}
                className={`${fullscreen ? "*:rounded-none" : ""}`}
                windowVisible
                showStillWithoutActivity={false}
                cameraConfig={camera}
                playAudio={audio}
                playInBackground={playInBackground ?? false}
                showStats={showStats}
                micEnabled={mic}
                iOSCompatFullScreen={isIOS}
                preferredLiveMode={preferredLiveMode}
                useWebGL={true}
                streamName={streamName ?? ""}
                pip={pip}
                containerRef={containerRef}
                setFullResolution={setFullResolution}
                onError={handleError}
              />
            </div>
          </TransformComponent>
        </div>
      </div>
      {camera.onvif.host != "" && (
        <div className="flex flex-col items-center justify-center">
          <PtzControlPanel
            camera={camera.name}
            clickOverlay={clickOverlay}
            setClickOverlay={setClickOverlay}
          />
        </div>
      )}
    </TransformWrapper>
  );
}

type TooltipButtonProps = {
  label: string;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  children: ReactNode;
  className?: string;
};

function TooltipButton({
  label,
  onClick,
  onMouseDown,
  onMouseUp,
  onTouchStart,
  onTouchEnd,
  children,
  className,
  ...props
}: TooltipButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={label}
            onClick={onClick}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className={className}
            {...props}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PtzControlPanel({
  camera,
  clickOverlay,
  setClickOverlay,
}: {
  camera: string;
  clickOverlay: boolean;
  setClickOverlay: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { data: ptz } = useSWR<CameraPtzInfo>(`${camera}/ptz/info`);

  const { send: sendPtz } = usePtzCommand(camera);

  const onStop = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      sendPtz("STOP");
    },
    [sendPtz],
  );

  useKeyboardListener(
    [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "+",
      "-",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ],
    (key, modifiers) => {
      if (modifiers.repeat || !key) {
        return;
      }

      if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(key)) {
        const presetNumber = parseInt(key);
        if (
          ptz &&
          (ptz.presets?.length ?? 0) > 0 &&
          presetNumber <= ptz.presets.length
        ) {
          sendPtz(`preset_${ptz.presets[presetNumber - 1]}`);
        }
        return;
      }

      if (!modifiers.down) {
        sendPtz("STOP");
        return;
      }

      switch (key) {
        case "ArrowLeft":
          sendPtz("MOVE_LEFT");
          break;
        case "ArrowRight":
          sendPtz("MOVE_RIGHT");
          break;
        case "ArrowUp":
          sendPtz("MOVE_UP");
          break;
        case "ArrowDown":
          sendPtz("MOVE_DOWN");
          break;
        case "+":
          sendPtz("ZOOM_IN");
          break;
        case "-":
          sendPtz("ZOOM_OUT");
          break;
      }
    },
  );

  return (
    <div
      className={cn(
        "absolute inset-x-2 bottom-[10%] flex select-none flex-wrap items-center justify-center gap-1 md:left-[50%] md:-translate-x-[50%] md:flex-nowrap",
        isMobile && "landscape:ml-12",
      )}
    >
      {ptz?.features?.includes("pt") && (
        <>
          <TooltipButton
            label="Move camera left"
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("MOVE_LEFT");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("MOVE_LEFT");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <FaAngleLeft />
          </TooltipButton>
          <TooltipButton
            label="Move camera up"
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("MOVE_UP");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("MOVE_UP");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <FaAngleUp />
          </TooltipButton>
          <TooltipButton
            label="Move camera down"
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("MOVE_DOWN");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("MOVE_DOWN");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <FaAngleDown />
          </TooltipButton>
          <TooltipButton
            label="Move camera right"
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("MOVE_RIGHT");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("MOVE_RIGHT");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <FaAngleRight />
          </TooltipButton>
        </>
      )}
      {ptz?.features?.includes("zoom") && (
        <>
          <TooltipButton
            label="Zoom in"
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("ZOOM_IN");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("ZOOM_IN");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <MdZoomIn />
          </TooltipButton>
          <TooltipButton
            label="Zoom out"
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("ZOOM_OUT");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("ZOOM_OUT");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <MdZoomOut />
          </TooltipButton>
        </>
      )}

      {ptz?.features?.includes("pt-r-fov") && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={`${clickOverlay ? "text-selected" : "text-primary"}`}
                aria-label="Click in the frame to center the camera"
                onClick={() => setClickOverlay(!clickOverlay)}
              >
                <TbViewfinder />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{clickOverlay ? "Disable" : "Enable"} click to move</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {(ptz?.presets?.length ?? 0) > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu modal={!isDesktop}>
                <DropdownMenuTrigger asChild>
                  <Button aria-label="PTZ camera presets">
                    <BsThreeDotsVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="scrollbar-container max-h-[40dvh] overflow-y-auto"
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  {ptz?.presets.map((preset) => (
                    <DropdownMenuItem
                      key={preset}
                      aria-label={preset}
                      className="cursor-pointer"
                      onSelect={() => sendPtz(`preset_${preset}`)}
                    >
                      {preset}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent>
              <p>PTZ camera presets</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

function OnDemandRetentionMessage({ camera }: { camera: CameraConfig }) {
  const rankMap = { all: 0, motion: 1, active_objects: 2 };
  const getValidMode = (retain?: { mode?: string }): keyof typeof rankMap => {
    const mode = retain?.mode;
    return mode && mode in rankMap ? (mode as keyof typeof rankMap) : "all";
  };

  const recordRetainMode = getValidMode(camera.record.retain);
  const alertsRetainMode = getValidMode(camera.review.alerts.retain);

  const effectiveRetainMode =
    rankMap[alertsRetainMode] < rankMap[recordRetainMode]
      ? recordRetainMode
      : alertsRetainMode;

  const source = effectiveRetainMode === recordRetainMode ? "camera" : "alerts";

  return effectiveRetainMode !== "all" ? (
    <div>
      Your {source} recording retention configuration is set to{" "}
      <code>mode: {effectiveRetainMode}</code>, so this on-demand recording will
      only keep segments with {effectiveRetainMode.replaceAll("_", " ")}.
    </div>
  ) : null;
}

type FrigateCameraFeaturesProps = {
  camera: CameraConfig;
  recordingEnabled: boolean;
  audioDetectEnabled: boolean;
  autotrackingEnabled: boolean;
  fullscreen: boolean;
  streamName: string;
  setStreamName?: (value: string | undefined) => void;
  preferredLiveMode: string;
  playInBackground: boolean;
  setPlayInBackground: (value: boolean | undefined) => void;
  showStats: boolean;
  setShowStats: (value: boolean) => void;
  isRestreamed: boolean;
  setLowBandwidth: React.Dispatch<React.SetStateAction<boolean>>;
  supportsAudioOutput: boolean;
  supports2WayTalk: boolean;
  cameraEnabled: boolean;
};
function FrigateCameraFeatures({
  camera,
  recordingEnabled,
  audioDetectEnabled,
  autotrackingEnabled,
  fullscreen,
  streamName,
  setStreamName,
  preferredLiveMode,
  playInBackground,
  setPlayInBackground,
  showStats,
  setShowStats,
  isRestreamed,
  setLowBandwidth,
  supportsAudioOutput,
  supports2WayTalk,
  cameraEnabled,
}: FrigateCameraFeaturesProps) {
  const { payload: detectState, send: sendDetect } = useDetectState(
    camera.name,
  );
  const { payload: enabledState, send: sendEnabled } = useEnabledState(
    camera.name,
  );
  const { payload: recordState, send: sendRecord } = useRecordingsState(
    camera.name,
  );
  const { payload: snapshotState, send: sendSnapshot } = useSnapshotsState(
    camera.name,
  );
  const { payload: audioState, send: sendAudio } = useAudioState(camera.name);
  const { payload: autotrackingState, send: sendAutotracking } =
    useAutotrackingState(camera.name);

  // roles

  const isAdmin = useIsAdmin();

  // manual event

  const recordingEventIdRef = useRef<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeToastId, setActiveToastId] = useState<string | number | null>(
    null,
  );

  const createEvent = useCallback(async () => {
    try {
      const response = await axios.post(
        `events/${camera.name}/on_demand/create`,
        {
          include_recording: true,
          duration: null,
        },
      );

      if (response.data.success) {
        recordingEventIdRef.current = response.data.event_id;
        setIsRecording(true);
        const toastId = toast.success(
          <div className="flex flex-col space-y-3">
            <div className="font-semibold">
              Started manual on-demand recording.
            </div>
            {!camera.record.enabled || camera.record.retain.days == 0 ? (
              <div>
                Since recording is disabled or restricted in the config for this
                camera, only a snapshot will be saved.
              </div>
            ) : (
              <OnDemandRetentionMessage camera={camera} />
            )}
          </div>,
          {
            position: "top-center",
            duration: 10000,
          },
        );
        setActiveToastId(toastId);
      }
    } catch (error) {
      toast.error("Failed to start manual on-demand recording.", {
        position: "top-center",
      });
    }
  }, [camera]);

  const endEvent = useCallback(() => {
    if (activeToastId) {
      toast.dismiss(activeToastId);
    }
    try {
      if (recordingEventIdRef.current) {
        axios.put(`events/${recordingEventIdRef.current}/end`, {
          end_time: Math.ceil(Date.now() / 1000),
        });
        recordingEventIdRef.current = null;
        setIsRecording(false);
        toast.success("Ended manual on-demand recording.", {
          position: "top-center",
        });
      }
    } catch (error) {
      toast.error("Failed to end manual on-demand recording.", {
        position: "top-center",
      });
    }
  }, [activeToastId]);

  const handleEventButtonClick = useCallback(() => {
    if (isRecording) {
      endEvent();
    } else {
      createEvent();
    }
  }, [createEvent, endEvent, isRecording]);

  useEffect(() => {
    // ensure manual event is stopped when component unmounts
    return () => {
      if (recordingEventIdRef.current) {
        endEvent();
      }
    };
    // mount/unmount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // navigate for debug view

  const navigate = useNavigate();

  // desktop shows icons part of row
  if (isDesktop || isTablet) {
    return (
      <>
        {isAdmin && (
          <>
            <CameraFeatureToggle
              className="p-2 md:p-0"
              variant={fullscreen ? "overlay" : "primary"}
              Icon={enabledState == "ON" ? LuPower : LuPowerOff}
              isActive={enabledState == "ON"}
              title={`${enabledState == "ON" ? "Disable" : "Enable"} Camera`}
              onClick={() => sendEnabled(enabledState == "ON" ? "OFF" : "ON")}
              disabled={false}
            />
            <CameraFeatureToggle
              className="p-2 md:p-0"
              variant={fullscreen ? "overlay" : "primary"}
              Icon={detectState == "ON" ? MdPersonSearch : MdPersonOff}
              isActive={detectState == "ON"}
              title={`${detectState == "ON" ? "Disable" : "Enable"} Detect`}
              onClick={() => sendDetect(detectState == "ON" ? "OFF" : "ON")}
              disabled={!cameraEnabled}
            />
            <CameraFeatureToggle
              className="p-2 md:p-0"
              variant={fullscreen ? "overlay" : "primary"}
              Icon={recordState == "ON" ? LuVideo : LuVideoOff}
              isActive={recordState == "ON"}
              title={`${recordState == "ON" ? "Disable" : "Enable"} Recording`}
              onClick={() => sendRecord(recordState == "ON" ? "OFF" : "ON")}
              disabled={!cameraEnabled}
            />
            <CameraFeatureToggle
              className="p-2 md:p-0"
              variant={fullscreen ? "overlay" : "primary"}
              Icon={snapshotState == "ON" ? MdPhotoCamera : MdNoPhotography}
              isActive={snapshotState == "ON"}
              title={`${snapshotState == "ON" ? "Disable" : "Enable"} Snapshots`}
              onClick={() => sendSnapshot(snapshotState == "ON" ? "OFF" : "ON")}
              disabled={!cameraEnabled}
            />
            {audioDetectEnabled && (
              <CameraFeatureToggle
                className="p-2 md:p-0"
                variant={fullscreen ? "overlay" : "primary"}
                Icon={audioState == "ON" ? LuEar : LuEarOff}
                isActive={audioState == "ON"}
                title={`${audioState == "ON" ? "Disable" : "Enable"} Audio Detect`}
                onClick={() => sendAudio(audioState == "ON" ? "OFF" : "ON")}
                disabled={!cameraEnabled}
              />
            )}
            {autotrackingEnabled && (
              <CameraFeatureToggle
                className="p-2 md:p-0"
                variant={fullscreen ? "overlay" : "primary"}
                Icon={
                  autotrackingState == "ON" ? TbViewfinder : TbViewfinderOff
                }
                isActive={autotrackingState == "ON"}
                title={`${autotrackingState == "ON" ? "Disable" : "Enable"} Autotracking`}
                onClick={() =>
                  sendAutotracking(autotrackingState == "ON" ? "OFF" : "ON")
                }
                disabled={!cameraEnabled}
              />
            )}
          </>
        )}
        <CameraFeatureToggle
          className={cn(
            "p-2 md:p-0",
            isRecording && "animate-pulse bg-red-500 hover:bg-red-600",
          )}
          variant={fullscreen ? "overlay" : "primary"}
          Icon={isRecording ? TbRecordMail : TbRecordMailOff}
          isActive={isRecording}
          title={`${isRecording ? "Stop" : "Start"} on-demand recording`}
          onClick={handleEventButtonClick}
          disabled={!cameraEnabled}
        />

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger>
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-lg bg-secondary p-2 text-secondary-foreground md:p-0",
              )}
            >
              <FaCog
                className={`text-secondary-foreground" size-5 md:m-[6px]`}
              />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-w-96">
            <div className="flex flex-col gap-5 p-4">
              {!isRestreamed && (
                <div className="flex flex-col gap-2">
                  <Label>Stream</Label>
                  <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
                    <LuX className="size-4 text-danger" />
                    <div>Restreaming is not enabled for this camera.</div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="cursor-pointer p-0">
                          <LuInfo className="size-4" />
                          <span className="sr-only">Info</span>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 text-xs">
                        Set up go2rtc for additional live view options and audio
                        for this camera.
                        <div className="mt-2 flex items-center text-primary">
                          <Link
                            to="https://docs.frigate.video/configuration/live"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline"
                          >
                            Read the documentation{" "}
                            <LuExternalLink className="ml-2 inline-flex size-3" />
                          </Link>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
              {isRestreamed &&
                Object.values(camera.live.streams).length > 0 && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="streaming-method">Stream</Label>
                    <Select
                      value={streamName}
                      onValueChange={(value) => {
                        setStreamName?.(value);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        {Object.keys(camera.live.streams).find(
                          (key) => camera.live.streams[key] === streamName,
                        )}
                      </SelectTrigger>

                      <SelectContent>
                        <SelectGroup>
                          {Object.entries(camera.live.streams).map(
                            ([stream, name]) => (
                              <SelectItem
                                key={stream}
                                className="cursor-pointer"
                                value={name}
                              >
                                {stream}
                              </SelectItem>
                            ),
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    {preferredLiveMode != "jsmpeg" && isRestreamed && (
                      <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
                        {supportsAudioOutput ? (
                          <>
                            <LuCheck className="size-4 text-success" />
                            <div>Audio is available for this stream</div>
                          </>
                        ) : (
                          <>
                            <LuX className="size-4 text-danger" />
                            <div>Audio is unavailable for this stream</div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer p-0">
                                  <LuInfo className="size-4" />
                                  <span className="sr-only">Info</span>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 text-xs">
                                Audio must be output from your camera and
                                configured in go2rtc for this stream.
                                <div className="mt-2 flex items-center text-primary">
                                  <Link
                                    to="https://docs.frigate.video/configuration/live"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline"
                                  >
                                    Read the documentation{" "}
                                    <LuExternalLink className="ml-2 inline-flex size-3" />
                                  </Link>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </>
                        )}
                      </div>
                    )}
                    {preferredLiveMode != "jsmpeg" &&
                      isRestreamed &&
                      supportsAudioOutput && (
                        <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
                          {supports2WayTalk ? (
                            <>
                              <LuCheck className="size-4 text-success" />
                              <div>
                                Two-way talk is available for this stream
                              </div>
                            </>
                          ) : (
                            <>
                              <LuX className="size-4 text-danger" />
                              <div>
                                Two-way talk is unavailable for this stream
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer p-0">
                                    <LuInfo className="size-4" />
                                    <span className="sr-only">Info</span>
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 text-xs">
                                  Your device must suppport the feature and
                                  WebRTC must be configured for two-way talk.
                                  <div className="mt-2 flex items-center text-primary">
                                    <Link
                                      to="https://docs.frigate.video/configuration/live/#webrtc-extra-configuration"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline"
                                    >
                                      Read the documentation{" "}
                                      <LuExternalLink className="ml-2 inline-flex size-3" />
                                    </Link>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </>
                          )}
                        </div>
                      )}

                    {preferredLiveMode == "jsmpeg" && isRestreamed && (
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex flex-row items-center gap-2">
                          <IoIosWarning className="mr-1 size-8 text-danger" />

                          <p className="text-sm">
                            Live view is in low-bandwidth mode due to buffering
                            or stream errors.
                          </p>
                        </div>
                        <Button
                          className={`flex items-center gap-2.5 rounded-lg`}
                          aria-label="Reset the stream"
                          variant="outline"
                          size="sm"
                          onClick={() => setLowBandwidth(false)}
                        >
                          <MdOutlineRestartAlt className="size-5 text-primary-variant" />
                          <div className="text-primary-variant">
                            Reset stream
                          </div>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              {isRestreamed && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Label
                      className="mx-0 cursor-pointer text-primary"
                      htmlFor="backgroundplay"
                    >
                      Play in background
                    </Label>
                    <Switch
                      className="ml-1"
                      id="backgroundplay"
                      checked={playInBackground}
                      onCheckedChange={(checked) =>
                        setPlayInBackground(checked)
                      }
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enable this option to continue streaming when the player is
                    hidden.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label
                    className="mx-0 cursor-pointer text-primary"
                    htmlFor="showstats"
                  >
                    Show stream stats
                  </Label>
                  <Switch
                    className="ml-1"
                    id="showstats"
                    checked={showStats}
                    onCheckedChange={(checked) => setShowStats(checked)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enable this option to show stream statistics as an overlay on
                  the camera feed.
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm font-medium leading-none">
                  Debug View
                  <LuExternalLink
                    onClick={() =>
                      navigate(`/settings?page=debug&camera=${camera.name}`)
                    }
                    className="ml-2 inline-flex size-5 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    );
  }

  // mobile doesn't show settings in fullscreen view
  if (fullscreen) {
    return;
  }

  return (
    <Drawer>
      <DrawerTrigger>
        <CameraFeatureToggle
          className="p-2 landscape:size-9"
          variant="primary"
          Icon={FaCog}
          isActive={false}
          title={`${camera} Settings`}
        />
      </DrawerTrigger>
      <DrawerContent className="rounded-2xl px-2 py-4">
        <div className="mt-2 flex flex-col gap-2">
          {isAdmin && (
            <>
              <FilterSwitch
                label="Camera Enabled"
                isChecked={enabledState == "ON"}
                onCheckedChange={() =>
                  sendEnabled(enabledState == "ON" ? "OFF" : "ON")
                }
              />
              <FilterSwitch
                label="Object Detection"
                isChecked={detectState == "ON"}
                onCheckedChange={() =>
                  sendDetect(detectState == "ON" ? "OFF" : "ON")
                }
              />
              {recordingEnabled && (
                <FilterSwitch
                  label="Recording"
                  isChecked={recordState == "ON"}
                  onCheckedChange={() =>
                    sendRecord(recordState == "ON" ? "OFF" : "ON")
                  }
                />
              )}
              <FilterSwitch
                label="Snapshots"
                isChecked={snapshotState == "ON"}
                onCheckedChange={() =>
                  sendSnapshot(snapshotState == "ON" ? "OFF" : "ON")
                }
              />
              {audioDetectEnabled && (
                <FilterSwitch
                  label="Audio Detection"
                  isChecked={audioState == "ON"}
                  onCheckedChange={() =>
                    sendAudio(audioState == "ON" ? "OFF" : "ON")
                  }
                />
              )}
              {autotrackingEnabled && (
                <FilterSwitch
                  label="Autotracking"
                  isChecked={autotrackingState == "ON"}
                  onCheckedChange={() =>
                    sendAutotracking(autotrackingState == "ON" ? "OFF" : "ON")
                  }
                />
              )}
            </>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-5">
          {!isRestreamed && (
            <div className="flex flex-col gap-2 p-2">
              <Label>Stream</Label>
              <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
                <LuX className="size-4 text-danger" />
                <div>Restreaming is not enabled for this camera.</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="cursor-pointer p-0">
                      <LuInfo className="size-4" />
                      <span className="sr-only">Info</span>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-xs">
                    Set up go2rtc for additional live view options and audio for
                    this camera.
                    <div className="mt-2 flex items-center text-primary">
                      <Link
                        to="https://docs.frigate.video/configuration/live"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline"
                      >
                        Read the documentation{" "}
                        <LuExternalLink className="ml-2 inline-flex size-3" />
                      </Link>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
          {isRestreamed && Object.values(camera.live.streams).length > 0 && (
            <div className="mt-1 p-2">
              <div className="mb-1 text-sm">Stream</div>
              <Select
                value={streamName}
                onValueChange={(value) => {
                  setStreamName?.(value);
                }}
              >
                <SelectTrigger className="w-full">
                  {Object.keys(camera.live.streams).find(
                    (key) => camera.live.streams[key] === streamName,
                  )}
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    {Object.entries(camera.live.streams).map(
                      ([stream, name]) => (
                        <SelectItem
                          key={stream}
                          className="cursor-pointer"
                          value={name}
                        >
                          {stream}
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {preferredLiveMode != "jsmpeg" && isRestreamed && (
                <div className="mt-1 flex flex-row items-center gap-1 text-sm text-muted-foreground">
                  {supportsAudioOutput ? (
                    <>
                      <LuCheck className="size-4 text-success" />
                      <div>Audio is available for this stream</div>
                    </>
                  ) : (
                    <>
                      <LuX className="size-4 text-danger" />
                      <div>Audio is unavailable for this stream</div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="cursor-pointer p-0">
                            <LuInfo className="size-4" />
                            <span className="sr-only">Info</span>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-52 text-xs">
                          Audio must be output from your camera and configured
                          in go2rtc for this stream.
                          <div className="mt-2 flex items-center text-primary">
                            <Link
                              to="https://docs.frigate.video/configuration/live"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline"
                            >
                              Read the documentation{" "}
                              <LuExternalLink className="ml-2 inline-flex size-3" />
                            </Link>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </div>
              )}
              {preferredLiveMode != "jsmpeg" &&
                isRestreamed &&
                supportsAudioOutput && (
                  <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
                    {supports2WayTalk ? (
                      <>
                        <LuCheck className="size-4 text-success" />
                        <div>Two-way talk is available for this stream</div>
                      </>
                    ) : (
                      <>
                        <LuX className="size-4 text-danger" />
                        <div>Two-way talk is unavailable for this stream</div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="cursor-pointer p-0">
                              <LuInfo className="size-4" />
                              <span className="sr-only">Info</span>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-52 text-xs">
                            Your device must suppport the feature and WebRTC
                            must be configured for two-way talk.
                            <div className="mt-2 flex items-center text-primary">
                              <Link
                                to="https://docs.frigate.video/configuration/live/#webrtc-extra-configuration"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline"
                              >
                                Read the documentation{" "}
                                <LuExternalLink className="ml-2 inline-flex size-3" />
                              </Link>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </>
                    )}
                  </div>
                )}
              {preferredLiveMode == "jsmpeg" && isRestreamed && (
                <div className="mt-2 flex flex-col items-center gap-3">
                  <div className="flex flex-row items-center gap-2">
                    <IoIosWarning className="mr-1 size-8 text-danger" />

                    <p className="text-sm">
                      Live view is in low-bandwidth mode due to buffering or
                      stream errors.
                    </p>
                  </div>
                  <Button
                    className={`flex items-center gap-2.5 rounded-lg`}
                    aria-label="Reset the stream"
                    variant="outline"
                    size="sm"
                    onClick={() => setLowBandwidth(false)}
                  >
                    <MdOutlineRestartAlt className="size-5 text-primary-variant" />
                    <div className="text-primary-variant">Reset stream</div>
                  </Button>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col gap-1 px-2">
            <div className="mb-1 text-sm font-medium leading-none">
              On-Demand Recording
            </div>
            <Button
              onClick={handleEventButtonClick}
              className={cn(
                "w-full",
                isRecording && "animate-pulse bg-red-500 hover:bg-red-600",
              )}
            >
              {isRecording ? "End" : "Start"} on-demand recording
            </Button>
            <p className="text-sm text-muted-foreground">
              Start a manual event based on this camera's recording retention
              settings.
            </p>
          </div>
          {isRestreamed && (
            <>
              <div className="flex flex-col gap-2">
                <FilterSwitch
                  label="Play in Background"
                  isChecked={playInBackground}
                  onCheckedChange={(checked) => {
                    setPlayInBackground(checked);
                  }}
                />
                <p className="mx-2 -mt-2 text-sm text-muted-foreground">
                  Enable this option to continue streaming when the player is
                  hidden.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <FilterSwitch
                  label="Show Stats"
                  isChecked={showStats}
                  onCheckedChange={(checked) => {
                    setShowStats(checked);
                  }}
                />
                <p className="mx-2 -mt-2 text-sm text-muted-foreground">
                  Enable this option to show stream statistics as an overlay on
                  the camera feed.
                </p>
              </div>
            </>
          )}
          <div className="mb-3 flex flex-col gap-1 px-2">
            <div className="flex items-center justify-between text-sm font-medium leading-none">
              Debug View
              <LuExternalLink
                onClick={() =>
                  navigate(`/settings?page=debug&camera=${camera.name}`)
                }
                className="ml-2 inline-flex size-5 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
