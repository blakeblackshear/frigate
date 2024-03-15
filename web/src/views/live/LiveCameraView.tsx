import {
  useAudioState,
  useDetectState,
  usePtzCommand,
  useRecordingsState,
  useSnapshotsState,
} from "@/api/ws";
import CameraFeatureToggle from "@/components/dynamic/CameraFeatureToggle";
import LivePlayer from "@/components/player/LivePlayer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useResizeObserver } from "@/hooks/resize-observer";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { CameraConfig } from "@/types/frigateConfig";
import { CameraPtzInfo } from "@/types/ptz";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  isDesktop,
  isMobile,
  isSafari,
  useMobileOrientation,
} from "react-device-detect";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  FaAngleDown,
  FaAngleLeft,
  FaAngleRight,
  FaAngleUp,
  FaCompress,
  FaExpand,
  FaMicrophone,
  FaMicrophoneSlash,
} from "react-icons/fa";
import { GiSpeaker, GiSpeakerOff } from "react-icons/gi";
import { IoMdArrowBack } from "react-icons/io";
import { LuEar, LuEarOff, LuVideo, LuVideoOff } from "react-icons/lu";
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

type LiveCameraViewProps = {
  camera: CameraConfig;
};
export default function LiveCameraView({ camera }: LiveCameraViewProps) {
  const navigate = useNavigate();
  const { isPortrait } = useMobileOrientation();
  const mainRef = useRef<HTMLDivElement | null>(null);
  const [{ width: windowWidth, height: windowHeight }] =
    useResizeObserver(window);

  // camera features

  const { payload: detectState, send: sendDetect } = useDetectState(
    camera.name,
  );
  const { payload: recordState, send: sendRecord } = useRecordingsState(
    camera.name,
  );
  const { payload: snapshotState, send: sendSnapshot } = useSnapshotsState(
    camera.name,
  );
  const { payload: audioState, send: sendAudio } = useAudioState(camera.name);

  // fullscreen state

  useEffect(() => {
    if (mainRef.current == null) {
      return;
    }

    const listener = () => {
      setFullscreen(document.fullscreenElement != null);
    };
    document.addEventListener("fullscreenchange", listener);

    return () => {
      document.removeEventListener("fullscreenchange", listener);
    };
  }, [mainRef]);

  // playback state

  const [audio, setAudio] = useState(false);
  const [mic, setMic] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const growClassName = useMemo(() => {
    const aspect = camera.detect.width / camera.detect.height;

    if (isMobile) {
      if (isPortrait) {
        return "absolute left-2 right-2 top-[50%] -translate-y-[50%]";
      } else {
        if (aspect > 16 / 9) {
          return "absolute left-0 top-[50%] -translate-y-[50%]";
        } else {
          return "absolute top-2 bottom-2 left-[50%] -translate-x-[50%]";
        }
      }
    }

    if (fullscreen) {
      if (aspect > 16 / 9) {
        return "absolute inset-x-2 top-[50%] -translate-y-[50%]";
      } else {
        return "absolute inset-y-2 left-[50%] -translate-x-[50%]";
      }
    } else {
      return "absolute top-2 bottom-2 left-[50%] -translate-x-[50%]";
    }
  }, [camera, fullscreen, isPortrait]);

  const preferredLiveMode = useMemo(() => {
    if (isSafari || mic) {
      return "webrtc";
    }

    return "mse";
  }, [mic]);

  const windowAspectRatio = useMemo(() => {
    return windowWidth / windowHeight;
  }, [windowWidth, windowHeight]);

  const cameraAspectRatio = useMemo(() => {
    return camera.detect.width / camera.detect.height;
  }, [camera]);

  const aspectRatio = useMemo<number>(() => {
    if (isMobile || fullscreen) {
      return cameraAspectRatio;
    } else {
      return windowAspectRatio < cameraAspectRatio
        ? windowAspectRatio - 0.05
        : cameraAspectRatio - 0.03;
    }
  }, [cameraAspectRatio, windowAspectRatio, fullscreen]);

  return (
    <TransformWrapper minScale={1.0}>
      <div
        ref={mainRef}
        className={
          fullscreen
            ? `fixed inset-0 bg-black z-30`
            : `size-full flex flex-col ${isMobile ? "landscape:flex-row" : ""}`
        }
      >
        <div
          className={
            fullscreen
              ? `absolute right-32 top-1 z-40 ${isMobile ? "landscape:left-2 landscape:right-auto landscape:bottom-1 landscape:top-auto" : ""}`
              : `w-full h-12 flex flex-row items-center justify-between ${isMobile ? "landscape:w-min landscape:h-full landscape:flex-col" : ""}`
          }
        >
          {!fullscreen ? (
            <Button
              className={`rounded-lg ${isMobile ? "ml-2" : "ml-0"}`}
              size={isMobile ? "icon" : "default"}
              onClick={() => navigate(-1)}
            >
              <IoMdArrowBack className="size-5 lg:mr-[10px]" />
              {isDesktop && "Back"}
            </Button>
          ) : (
            <div />
          )}
          <TooltipProvider>
            <div
              className={`flex flex-row items-center gap-2 mr-1 *:rounded-lg ${isMobile ? "landscape:flex-col" : ""}`}
            >
              <CameraFeatureToggle
                className="p-2 md:p-0"
                variant={fullscreen ? "overlay" : "primary"}
                Icon={fullscreen ? FaCompress : FaExpand}
                isActive={fullscreen}
                title={fullscreen ? "Close" : "Fullscreen"}
                onClick={() => {
                  if (fullscreen) {
                    document.exitFullscreen();
                  } else {
                    mainRef.current?.requestFullscreen();
                  }
                }}
              />
              {window.isSecureContext && (
                <CameraFeatureToggle
                  className="p-2 md:p-0"
                  variant={fullscreen ? "overlay" : "primary"}
                  Icon={mic ? FaMicrophone : FaMicrophoneSlash}
                  isActive={mic}
                  title={`${mic ? "Disable" : "Enable"} Two Way Talk`}
                  onClick={() => setMic(!mic)}
                />
              )}
              <CameraFeatureToggle
                className="p-2 md:p-0"
                variant={fullscreen ? "overlay" : "primary"}
                Icon={audio ? GiSpeaker : GiSpeakerOff}
                isActive={audio}
                title={`${audio ? "Disable" : "Enable"} Camera Audio`}
                onClick={() => setAudio(!audio)}
              />
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
                onClick={() =>
                  sendSnapshot(snapshotState == "ON" ? "OFF" : "ON")
                }
              />
              {camera.audio.enabled_in_config && (
                <CameraFeatureToggle
                  className="p-2 md:p-0"
                  variant={fullscreen ? "overlay" : "primary"}
                  Icon={audioState == "ON" ? LuEar : LuEarOff}
                  isActive={audioState == "ON"}
                  title={`${audioState == "ON" ? "Disable" : "Enable"} Audio Detect`}
                  onClick={() => sendAudio(audioState == "ON" ? "OFF" : "ON")}
                />
              )}
            </div>
          </TooltipProvider>
        </div>
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
            className={`flex flex-col justify-center items-center ${growClassName}`}
            style={{
              aspectRatio: aspectRatio,
            }}
          >
            <LivePlayer
              key={camera.name}
              className={`m-1 ${fullscreen ? "*:rounded-none" : ""}`}
              windowVisible
              showStillWithoutActivity={false}
              cameraConfig={camera}
              playAudio={audio}
              micEnabled={mic}
              preferredLiveMode={preferredLiveMode}
            />
          </div>
          {camera.onvif.host != "" && <PtzControlPanel camera={camera.name} />}
        </TransformComponent>
      </div>
    </TransformWrapper>
  );
}

function PtzControlPanel({ camera }: { camera: string }) {
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
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-"],
    (key, down, repeat) => {
      if (repeat) {
        return;
      }

      if (!down) {
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
    <div className="absolute left-[50%] -translate-x-[50%] bottom-[10%] flex items-center gap-1">
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
      {(ptz?.presets?.length ?? 0) > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <BsThreeDotsVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {ptz?.presets.map((preset) => {
              return (
                <DropdownMenuItem
                  key={preset}
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
