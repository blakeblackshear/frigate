import {
  useAudioState,
  useAutotrackingState,
  useDetectState,
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
import { TooltipProvider } from "@/components/ui/tooltip";
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
import { TbViewfinder, TbViewfinderOff } from "react-icons/tb";
import { IoMdArrowRoundBack } from "react-icons/io";
import {
  LuEar,
  LuEarOff,
  LuHistory,
  LuPictureInPicture,
  LuVideo,
  LuVideoOff,
} from "react-icons/lu";
import {
  MdNoPhotography,
  MdPersonOff,
  MdPersonSearch,
  MdPhotoCamera,
  MdZoomIn,
  MdZoomOut,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { useSessionPersistence } from "@/hooks/use-session-persistence";

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

  const isRestreamed = useMemo(
    () =>
      config &&
      Object.keys(config.go2rtc.streams || {}).includes(
        camera.live.stream_name,
      ),
    [camera, config],
  );

  const { data: cameraMetadata } = useSWR<LiveStreamMetadata>(
    isRestreamed ? `go2rtc/streams/${camera.live.stream_name}` : null,
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
                size="sm"
                onClick={() => navigate(-1)}
              >
                <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
                {isDesktop && <div className="text-primary">Back</div>}
              </Button>
              <Button
                className="flex items-center gap-2.5 rounded-lg"
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
                />
              )}
              {supports2WayTalk && (
                <CameraFeatureToggle
                  className="p-2 md:p-0"
                  variant={fullscreen ? "overlay" : "primary"}
                  Icon={mic ? FaMicrophone : FaMicrophoneSlash}
                  isActive={mic}
                  title={`${mic ? "Disable" : "Enable"} Two Way Talk`}
                  onClick={() => setMic(!mic)}
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
                />
              )}
              <FrigateCameraFeatures
                camera={camera.name}
                recordingEnabled={camera.record.enabled_in_config}
                audioDetectEnabled={camera.audio.enabled_in_config}
                autotrackingEnabled={
                  camera.onvif.autotracking.enabled_in_config
                }
                fullscreen={fullscreen}
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
                micEnabled={mic}
                iOSCompatFullScreen={isIOS}
                preferredLiveMode={preferredLiveMode}
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
          <Button
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
          </Button>
          <Button
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
          </Button>
          <Button
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
          </Button>
          <Button
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
          </Button>
        </>
      )}
      {ptz?.features?.includes("zoom") && (
        <>
          <Button
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
          </Button>
          <Button
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
          </Button>
        </>
      )}
      {ptz?.features?.includes("pt-r-fov") && (
        <>
          <Button
            className={`${clickOverlay ? "text-selected" : "text-primary"}`}
            onClick={() => setClickOverlay(!clickOverlay)}
          >
            <TbViewfinder />
          </Button>
        </>
      )}
      {(ptz?.presets?.length ?? 0) > 0 && (
        <DropdownMenu modal={!isDesktop}>
          <DropdownMenuTrigger asChild>
            <Button>
              <BsThreeDotsVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="scrollbar-container max-h-[40dvh] overflow-y-auto"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {ptz?.presets.map((preset) => {
              return (
                <DropdownMenuItem
                  key={preset}
                  className="cursor-pointer"
                  onSelect={() => sendPtz(`preset_${preset}`)}
                >
                  {preset}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

type FrigateCameraFeaturesProps = {
  camera: string;
  recordingEnabled: boolean;
  audioDetectEnabled: boolean;
  autotrackingEnabled: boolean;
  fullscreen: boolean;
};
function FrigateCameraFeatures({
  camera,
  recordingEnabled,
  audioDetectEnabled,
  autotrackingEnabled,
  fullscreen,
}: FrigateCameraFeaturesProps) {
  const { payload: detectState, send: sendDetect } = useDetectState(camera);
  const { payload: recordState, send: sendRecord } = useRecordingsState(camera);
  const { payload: snapshotState, send: sendSnapshot } =
    useSnapshotsState(camera);
  const { payload: audioState, send: sendAudio } = useAudioState(camera);
  const { payload: autotrackingState, send: sendAutotracking } =
    useAutotrackingState(camera);

  // desktop shows icons part of row
  if (isDesktop || isTablet) {
    return (
      <>
        <CameraFeatureToggle
          className="p-2 md:p-0"
          variant={fullscreen ? "overlay" : "primary"}
          Icon={detectState == "ON" ? MdPersonSearch : MdPersonOff}
          isActive={detectState == "ON"}
          title={`${detectState == "ON" ? "Disable" : "Enable"} Detect`}
          onClick={() => sendDetect(detectState == "ON" ? "OFF" : "ON")}
        />
        <CameraFeatureToggle
          className="p-2 md:p-0"
          variant={fullscreen ? "overlay" : "primary"}
          Icon={recordState == "ON" ? LuVideo : LuVideoOff}
          isActive={recordState == "ON"}
          title={`${recordState == "ON" ? "Disable" : "Enable"} Recording`}
          onClick={() => sendRecord(recordState == "ON" ? "OFF" : "ON")}
        />
        <CameraFeatureToggle
          className="p-2 md:p-0"
          variant={fullscreen ? "overlay" : "primary"}
          Icon={snapshotState == "ON" ? MdPhotoCamera : MdNoPhotography}
          isActive={snapshotState == "ON"}
          title={`${snapshotState == "ON" ? "Disable" : "Enable"} Snapshots`}
          onClick={() => sendSnapshot(snapshotState == "ON" ? "OFF" : "ON")}
        />
        {audioDetectEnabled && (
          <CameraFeatureToggle
            className="p-2 md:p-0"
            variant={fullscreen ? "overlay" : "primary"}
            Icon={audioState == "ON" ? LuEar : LuEarOff}
            isActive={audioState == "ON"}
            title={`${audioState == "ON" ? "Disable" : "Enable"} Audio Detect`}
            onClick={() => sendAudio(audioState == "ON" ? "OFF" : "ON")}
          />
        )}
        {autotrackingEnabled && (
          <CameraFeatureToggle
            className="p-2 md:p-0"
            variant={fullscreen ? "overlay" : "primary"}
            Icon={autotrackingState == "ON" ? TbViewfinder : TbViewfinderOff}
            isActive={autotrackingState == "ON"}
            title={`${autotrackingState == "ON" ? "Disable" : "Enable"} Autotracking`}
            onClick={() =>
              sendAutotracking(autotrackingState == "ON" ? "OFF" : "ON")
            }
          />
        )}
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
      <DrawerContent className="flex flex-col gap-3 rounded-2xl px-2 py-4">
        <FilterSwitch
          label="Object Detection"
          isChecked={detectState == "ON"}
          onCheckedChange={() => sendDetect(detectState == "ON" ? "OFF" : "ON")}
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
            onCheckedChange={() => sendAudio(audioState == "ON" ? "OFF" : "ON")}
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
      </DrawerContent>
    </Drawer>
  );
}
