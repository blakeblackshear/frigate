import {
  useAudioLiveTranscription,
  useAudioState,
  useAudioTranscriptionState,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useResizeObserver } from "@/hooks/resize-observer";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import {
  LivePlayerError,
  LiveStreamMetadata,
  VideoResolutionType,
} from "@/types/live";
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
import {
  FaCog,
  FaCompress,
  FaExpand,
  FaMicrophone,
  FaMicrophoneSlash,
} from "react-icons/fa";
import { GiSpeaker, GiSpeakerOff } from "react-icons/gi";
import {
  TbCameraDown,
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
  MdClosedCaption,
  MdClosedCaptionDisabled,
  MdNoPhotography,
  MdOutlineRestartAlt,
  MdPersonOff,
  MdPersonSearch,
  MdPhotoCamera,
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
  SelectValue,
} from "@/components/ui/select";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import axios from "axios";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useTranslation } from "react-i18next";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { detectCameraAudioFeatures } from "@/utils/cameraUtil";
import PtzControlPanel from "@/components/overlay/PtzControlPanel";
import ObjectSettingsView from "../settings/ObjectSettingsView";
import { useSearchEffect } from "@/hooks/use-overlay-state";
import {
  downloadSnapshot,
  fetchCameraSnapshot,
  generateSnapshotFilename,
  grabVideoSnapshot,
  SnapshotResult,
} from "@/utils/snapshotUtil";
import ActivityIndicator from "@/components/indicators/activity-indicator";

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
  const { t } = useTranslation(["views/live", "components/dialog"]);
  const navigate = useNavigate();
  const { isPortrait } = useMobileOrientation();
  const mainRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [{ width: windowWidth, height: windowHeight }] =
    useResizeObserver(window);

  // supported features

  const [streamName, setStreamName, streamNameLoaded] =
    useUserPersistence<string>(
      `${camera.name}-stream`,
      Object.values(camera.live.streams)[0],
    );

  const isRestreamed = useMemo(
    () =>
      config &&
      Object.keys(config.go2rtc.streams || {}).includes(streamName ?? ""),
    [config, streamName],
  );

  // validate stored stream name and reset if now invalid

  useEffect(() => {
    if (!streamNameLoaded) return;

    const available = Object.values(camera.live.streams || {});
    if (available.length === 0) return;

    if (streamName != null && !available.includes(streamName)) {
      setStreamName(available[0]);
    }
  }, [streamNameLoaded, camera.live.streams, streamName, setStreamName]);

  const { data: cameraMetadata } = useSWR<LiveStreamMetadata>(
    isRestreamed ? `go2rtc/streams/${streamName}` : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      dedupingInterval: 60000,
    },
  );

  const { twoWayAudio: supports2WayTalk, audioOutput: supportsAudioOutput } =
    useMemo(() => detectCameraAudioFeatures(cameraMetadata), [cameraMetadata]);

  // camera enabled state
  const { payload: enabledState } = useEnabledState(camera.name);
  const cameraEnabled = enabledState === "ON";

  // for audio transcriptions

  const { payload: audioTranscriptionState, send: sendTranscription } =
    useAudioTranscriptionState(camera.name);
  const { payload: transcription } = useAudioLiveTranscription(camera.name);
  const transcriptionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcription) {
      if (transcriptionRef.current) {
        transcriptionRef.current.scrollTop =
          transcriptionRef.current.scrollHeight;
      }
    }
  }, [transcription]);

  useEffect(() => {
    return () => {
      // disable transcriptions when unmounting
      if (audioTranscriptionState == "ON") sendTranscription("OFF");
    };
  }, [audioTranscriptionState, sendTranscription]);

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

  const [playInBackground, setPlayInBackground] = useUserPersistence<boolean>(
    `${camera.name}-background-play`,
    false,
  );

  const [showStats, setShowStats] = useState(false);
  const [debug, setDebug] = useState(false);

  useSearchEffect("debug", (value: string) => {
    if (value === "true") {
      setDebug(true);
    }

    return true;
  });

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
      return true;
    }

    switch (key) {
      case "m":
        if (supportsAudioOutput) {
          setAudio(!audio);
          return true;
        }
        break;
      case "t":
        if (supports2WayTalk) {
          setMic(!mic);
          return true;
        }
        break;
    }

    return false;
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
    if (!screenOrientation?.lock || !screenOrientation?.unlock) {
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
    <TransformWrapper
      minScale={1.0}
      wheel={{ smoothStep: 0.005 }}
      disabled={debug}
    >
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
                aria-label={t("label.back", { ns: "common" })}
                size="sm"
                onClick={() => navigate(-1)}
              >
                <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
                {isDesktop && (
                  <div className="text-primary">
                    {t("button.back", { ns: "common" })}
                  </div>
                )}
              </Button>
              <Button
                className="flex items-center gap-2.5 rounded-lg"
                aria-label={t("history.label")}
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
                {isDesktop && (
                  <div className="text-primary">
                    {t("button.history", { ns: "common" })}
                  </div>
                )}
              </Button>
            </div>
          ) : (
            <div />
          )}
          <div
            className={`flex flex-row items-center gap-2 *:rounded-lg ${isMobile ? "landscape:flex-col" : ""}`}
          >
            {fullscreen && (
              <Button
                className="bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500 text-primary"
                aria-label={t("label.back", { ns: "common" })}
                size="sm"
                onClick={() => navigate(-1)}
              >
                <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
                {isDesktop && (
                  <div className="text-secondary-foreground">
                    {t("button.back", { ns: "common" })}
                  </div>
                )}
              </Button>
            )}
            {supportsFullscreen && (
              <CameraFeatureToggle
                className="p-2 md:p-0"
                variant={fullscreen ? "overlay" : "primary"}
                Icon={fullscreen ? FaCompress : FaExpand}
                isActive={fullscreen}
                disabled={debug}
                title={
                  fullscreen
                    ? t("button.close", { ns: "common" })
                    : t("button.fullscreen", { ns: "common" })
                }
                onClick={toggleFullscreen}
              />
            )}
            {!isIOS && !isFirefox && preferredLiveMode != "jsmpeg" && (
              <CameraFeatureToggle
                className="p-2 md:p-0"
                variant={fullscreen ? "overlay" : "primary"}
                Icon={LuPictureInPicture}
                isActive={pip}
                title={
                  pip
                    ? t("button.close", { ns: "common" })
                    : t("button.pictureInPicture", { ns: "common" })
                }
                onClick={() => {
                  if (!pip) {
                    setPip(true);
                  } else {
                    document.exitPictureInPicture();
                    setPip(false);
                  }
                }}
                disabled={!cameraEnabled || debug}
              />
            )}
            {supports2WayTalk && (
              <CameraFeatureToggle
                className="p-2 md:p-0"
                variant={fullscreen ? "overlay" : "primary"}
                Icon={mic ? FaMicrophone : FaMicrophoneSlash}
                isActive={mic}
                title={
                  mic
                    ? t("twoWayTalk.disable", { ns: "views/live" })
                    : t("twoWayTalk.enable", { ns: "views/live" })
                }
                onClick={() => {
                  setMic(!mic);
                  if (!mic && !audio) {
                    setAudio(true);
                  }
                }}
                disabled={!cameraEnabled || debug}
              />
            )}
            {supportsAudioOutput && preferredLiveMode != "jsmpeg" && (
              <CameraFeatureToggle
                className="p-2 md:p-0"
                variant={fullscreen ? "overlay" : "primary"}
                Icon={audio ? GiSpeaker : GiSpeakerOff}
                isActive={audio ?? false}
                title={
                  audio
                    ? t("cameraAudio.disable", { ns: "views/live" })
                    : t("cameraAudio.enable", { ns: "views/live" })
                }
                onClick={() => setAudio(!audio)}
                disabled={!cameraEnabled || debug}
              />
            )}
            <FrigateCameraFeatures
              camera={camera}
              recordingEnabled={camera.record.enabled_in_config}
              audioDetectEnabled={camera.audio.enabled_in_config}
              autotrackingEnabled={camera.onvif.autotracking.enabled_in_config}
              transcriptionEnabled={
                camera.audio_transcription.enabled_in_config
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
              debug={debug}
              setDebug={setDebug}
            />
          </div>
        </div>
        {!debug ? (
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
                  alwaysShowCameraName={false}
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
            {camera?.audio?.enabled_in_config &&
              audioTranscriptionState == "ON" &&
              transcription != null && (
                <div
                  ref={transcriptionRef}
                  className="text-md scrollbar-container absolute bottom-4 left-1/2 max-h-[15vh] w-[75%] -translate-x-1/2 overflow-y-auto rounded-lg bg-black/70 p-2 text-white md:w-[50%]"
                >
                  {transcription}
                </div>
              )}
          </div>
        ) : (
          <TransformComponent
            wrapperStyle={{
              width: "100%",
              height: "100%",
            }}
            contentStyle={{
              position: "relative",
              width: "100%",
              height: "100%",
            }}
          >
            <ObjectSettingsView selectedCamera={camera.name} />
          </TransformComponent>
        )}
      </div>
      {camera.onvif.host != "" && (
        <div className="flex flex-col items-center justify-center">
          <PtzControlPanel
            className={debug && isMobile ? "bottom-auto top-[25%]" : ""}
            camera={camera.name}
            enabled={cameraEnabled}
            clickOverlay={clickOverlay}
            setClickOverlay={setClickOverlay}
          />
        </div>
      )}
    </TransformWrapper>
  );
}

type FrigateCameraFeaturesProps = {
  camera: CameraConfig;
  recordingEnabled: boolean;
  audioDetectEnabled: boolean;
  autotrackingEnabled: boolean;
  transcriptionEnabled: boolean;
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
  debug: boolean;
  setDebug: (debug: boolean) => void;
};
function FrigateCameraFeatures({
  camera,
  recordingEnabled,
  audioDetectEnabled,
  autotrackingEnabled,
  transcriptionEnabled,
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
  debug,
  setDebug,
}: FrigateCameraFeaturesProps) {
  const { t } = useTranslation(["views/live", "components/dialog"]);
  const { getLocaleDocUrl } = useDocDomain();

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
  const { payload: transcriptionState, send: sendTranscription } =
    useAudioTranscriptionState(camera.name);

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
            <div className="font-semibold">{t("manualRecording.started")}</div>
            {!camera.record.enabled ||
              (camera.record.alerts.retain.days == 0 && (
                <div>{t("manualRecording.recordDisabledTips")}</div>
              ))}
          </div>,
          {
            position: "top-center",
            duration: 10000,
          },
        );
        setActiveToastId(toastId);
      }
    } catch (error) {
      toast.error(t("manualRecording.failedToStart"), {
        position: "top-center",
      });
    }
  }, [camera, t]);

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
        toast.success(t("manualRecording.ended"), {
          position: "top-center",
        });
      }
    } catch (error) {
      toast.error(t("manualRecording.failedToEnd"), {
        position: "top-center",
      });
    }
  }, [activeToastId, t]);

  const endEventViaBeacon = useCallback(() => {
    if (!recordingEventIdRef.current) return;

    const url = `${window.location.origin}/api/events/${recordingEventIdRef.current}/end`;
    const payload = JSON.stringify({
      end_time: Math.ceil(Date.now() / 1000),
    });

    // this needs to be a synchronous XMLHttpRequest to guarantee the PUT
    // reaches the server before the browser kills the page
    const xhr = new XMLHttpRequest();
    try {
      xhr.open("PUT", url, false);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("X-CSRF-TOKEN", "1");
      xhr.setRequestHeader("X-CACHE-BYPASS", "1");
      xhr.withCredentials = true;
      xhr.send(payload);
    } catch (e) {
      // Silently ignore errors during unload
    }
  }, []);

  const handleEventButtonClick = useCallback(() => {
    if (isRecording) {
      endEvent();
    } else {
      createEvent();
    }
  }, [createEvent, endEvent, isRecording]);

  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);

  const handleSnapshotClick = useCallback(async () => {
    setIsSnapshotLoading(true);
    try {
      let result: SnapshotResult;

      if (isRestreamed && preferredLiveMode !== "jsmpeg") {
        // For restreamed streams with video elements (MSE/WebRTC), grab directly from video element
        result = await grabVideoSnapshot();
      } else {
        // For detect stream or JSMpeg players, use the API endpoint
        result = await fetchCameraSnapshot(camera.name);
      }

      if (result.success) {
        const { dataUrl } = result.data;
        const filename = generateSnapshotFilename(camera.name);
        downloadSnapshot(dataUrl, filename);
        toast.success(t("snapshot.downloadStarted"));
      } else {
        toast.error(t("snapshot.captureFailed"));
      }
    } finally {
      setIsSnapshotLoading(false);
    }
  }, [camera.name, isRestreamed, preferredLiveMode, t]);

  useEffect(() => {
    // Handle page unload/close (browser close, tab close, refresh, navigation to external site)
    const handleBeforeUnload = () => {
      if (recordingEventIdRef.current) {
        endEventViaBeacon();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // ensure manual event is stopped when component unmounts
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      if (recordingEventIdRef.current) {
        endEvent();
      }
    };
    // mount/unmount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              title={
                enabledState == "ON" ? t("camera.disable") : t("camera.enable")
              }
              onClick={() => sendEnabled(enabledState == "ON" ? "OFF" : "ON")}
              disabled={debug}
            />
            <CameraFeatureToggle
              className="p-2 md:p-0"
              variant={fullscreen ? "overlay" : "primary"}
              Icon={detectState == "ON" ? MdPersonSearch : MdPersonOff}
              isActive={detectState == "ON"}
              title={
                detectState == "ON" ? t("detect.disable") : t("detect.enable")
              }
              onClick={() => sendDetect(detectState == "ON" ? "OFF" : "ON")}
              disabled={!cameraEnabled}
            />
            <CameraFeatureToggle
              className="p-2 md:p-0"
              variant={fullscreen ? "overlay" : "primary"}
              Icon={recordState == "ON" ? LuVideo : LuVideoOff}
              isActive={recordState == "ON"}
              title={
                recordState == "ON"
                  ? t("recording.disable")
                  : t("recording.enable")
              }
              onClick={() => sendRecord(recordState == "ON" ? "OFF" : "ON")}
              disabled={!cameraEnabled}
            />
            <CameraFeatureToggle
              className="p-2 md:p-0"
              variant={fullscreen ? "overlay" : "primary"}
              Icon={snapshotState == "ON" ? MdPhotoCamera : MdNoPhotography}
              isActive={snapshotState == "ON"}
              title={
                snapshotState == "ON"
                  ? t("snapshots.disable")
                  : t("snapshots.enable")
              }
              onClick={() => sendSnapshot(snapshotState == "ON" ? "OFF" : "ON")}
              disabled={!cameraEnabled}
            />
            {audioDetectEnabled && (
              <CameraFeatureToggle
                className="p-2 md:p-0"
                variant={fullscreen ? "overlay" : "primary"}
                Icon={audioState == "ON" ? LuEar : LuEarOff}
                isActive={audioState == "ON"}
                title={
                  audioState == "ON"
                    ? t("audioDetect.disable")
                    : t("audioDetect.enable")
                }
                onClick={() => sendAudio(audioState == "ON" ? "OFF" : "ON")}
                disabled={!cameraEnabled}
              />
            )}
            {audioDetectEnabled && transcriptionEnabled && (
              <CameraFeatureToggle
                className="p-2 md:p-0"
                variant={fullscreen ? "overlay" : "primary"}
                Icon={
                  transcriptionState == "ON"
                    ? MdClosedCaption
                    : MdClosedCaptionDisabled
                }
                isActive={transcriptionState == "ON"}
                title={
                  transcriptionState == "ON"
                    ? t("transcription.disable")
                    : t("transcription.enable")
                }
                onClick={() =>
                  sendTranscription(transcriptionState == "ON" ? "OFF" : "ON")
                }
                disabled={!cameraEnabled || audioState == "OFF"}
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
                title={
                  autotrackingState == "ON"
                    ? t("autotracking.disable")
                    : t("autotracking.enable")
                }
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
          title={t("manualRecording." + (isRecording ? "stop" : "start"))}
          onClick={handleEventButtonClick}
          disabled={!cameraEnabled || debug}
        />
        <CameraFeatureToggle
          className="p-2 md:p-0"
          variant={fullscreen ? "overlay" : "primary"}
          Icon={TbCameraDown}
          isActive={false}
          title={t("snapshot.takeSnapshot")}
          onClick={handleSnapshotClick}
          disabled={!cameraEnabled || debug || isSnapshotLoading}
          loading={isSnapshotLoading}
        />
        {!fullscreen && (
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
                    <Label>
                      {t("streaming.label", { ns: "components/dialog" })}
                    </Label>
                    <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
                      <LuX className="size-4 text-danger" />
                      <div>
                        {t("streaming.restreaming.disabled", {
                          ns: "components/dialog",
                        })}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="cursor-pointer p-0">
                            <LuInfo className="size-4" />
                            <span className="sr-only">
                              {t("button.info", { ns: "common" })}
                            </span>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 text-xs">
                          {t("streaming.restreaming.desc.title", {
                            ns: "components/dialog",
                          })}
                          <div className="mt-2 flex items-center text-primary">
                            <Link
                              to={getLocaleDocUrl("configuration/live")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline"
                            >
                              {t("readTheDocumentation", { ns: "common" })}
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
                      <Label htmlFor="streaming-method">
                        {t("stream.title")}
                      </Label>
                      <Select
                        value={streamName}
                        disabled={debug}
                        onValueChange={(value) => {
                          setStreamName?.(value);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {Object.keys(camera.live.streams).find(
                              (key) => camera.live.streams[key] === streamName,
                            )}
                          </SelectValue>
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

                      {debug && (
                        <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
                          <>
                            <LuX className="size-8 text-danger" />
                            <div>{t("stream.debug.picker")}</div>
                          </>
                        </div>
                      )}

                      {preferredLiveMode != "jsmpeg" &&
                        !debug &&
                        isRestreamed && (
                          <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
                            {supportsAudioOutput ? (
                              <>
                                <LuCheck className="size-4 text-success" />
                                <div>{t("stream.audio.available")}</div>
                              </>
                            ) : (
                              <>
                                <LuX className="size-4 text-danger" />
                                <div>{t("stream.audio.unavailable")}</div>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <div className="cursor-pointer p-0">
                                      <LuInfo className="size-4" />
                                      <span className="sr-only">
                                        {t("button.info", { ns: "common" })}
                                      </span>
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 text-xs">
                                    {t("stream.audio.tips.title")}
                                    <div className="mt-2 flex items-center text-primary">
                                      <Link
                                        to={getLocaleDocUrl(
                                          "configuration/live",
                                        )}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline"
                                      >
                                        {t("readTheDocumentation", {
                                          ns: "common",
                                        })}
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
                        !debug &&
                        isRestreamed &&
                        supportsAudioOutput && (
                          <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
                            {supports2WayTalk ? (
                              <>
                                <LuCheck className="size-4 text-success" />
                                <div>{t("stream.twoWayTalk.available")}</div>
                              </>
                            ) : (
                              <>
                                <LuX className="size-4 text-danger" />
                                <div>{t("stream.twoWayTalk.unavailable")}</div>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <div className="cursor-pointer p-0">
                                      <LuInfo className="size-4" />
                                      <span className="sr-only">
                                        {t("button.info", { ns: "common" })}
                                      </span>
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 text-xs">
                                    {t("stream.twoWayTalk.tips")}
                                    <div className="mt-2 flex items-center text-primary">
                                      <Link
                                        to={getLocaleDocUrl(
                                          "configuration/live/#webrtc-extra-configuration",
                                        )}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline"
                                      >
                                        {t("readTheDocumentation", {
                                          ns: "common",
                                        })}
                                        <LuExternalLink className="ml-2 inline-flex size-3" />
                                      </Link>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </>
                            )}
                          </div>
                        )}

                      {preferredLiveMode == "jsmpeg" &&
                        !debug &&
                        isRestreamed && (
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex flex-row items-center gap-2">
                              <IoIosWarning className="mr-1 size-8 text-danger" />

                              <p className="text-sm">
                                {t("stream.lowBandwidth.tips")}
                              </p>
                            </div>
                            <Button
                              className={`flex items-center gap-2.5 rounded-lg`}
                              aria-label={t("stream.lowBandwidth.resetStream")}
                              variant="outline"
                              size="sm"
                              onClick={() => setLowBandwidth(false)}
                            >
                              <MdOutlineRestartAlt className="size-5 text-primary-variant" />
                              <div className="text-primary-variant">
                                {t("stream.lowBandwidth.resetStream")}
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
                        {t("stream.playInBackground.label")}
                      </Label>
                      <Switch
                        className="ml-1"
                        id="backgroundplay"
                        disabled={debug}
                        checked={playInBackground}
                        onCheckedChange={(checked) =>
                          setPlayInBackground(checked)
                        }
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("stream.playInBackground.tips")}
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Label
                      className="mx-0 cursor-pointer text-primary"
                      htmlFor="showstats"
                    >
                      {t("streaming.showStats.label", {
                        ns: "components/dialog",
                      })}
                    </Label>
                    <Switch
                      className="ml-1"
                      id="showstats"
                      disabled={debug}
                      checked={showStats}
                      onCheckedChange={(checked) => setShowStats(checked)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("streaming.showStats.desc", {
                      ns: "components/dialog",
                    })}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Label
                      className="mx-0 cursor-pointer text-primary"
                      htmlFor="debug"
                    >
                      {t("streaming.debugView", {
                        ns: "components/dialog",
                      })}
                    </Label>
                    <Switch
                      className="ml-1"
                      id="debug"
                      checked={debug}
                      onCheckedChange={(checked) => setDebug(checked)}
                    />
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
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
          title={t("cameraSettings.title", { camera })}
        />
      </DrawerTrigger>
      <DrawerContent className="max-h-[75dvh] overflow-hidden rounded-2xl">
        <div className="scrollbar-container mt-2 flex h-auto flex-col gap-2 overflow-y-auto px-2 py-4">
          <>
            {isAdmin && (
              <>
                <FilterSwitch
                  label={t("cameraSettings.cameraEnabled")}
                  isChecked={enabledState == "ON"}
                  onCheckedChange={() =>
                    sendEnabled(enabledState == "ON" ? "OFF" : "ON")
                  }
                />
                <FilterSwitch
                  label={t("cameraSettings.objectDetection")}
                  isChecked={detectState == "ON"}
                  onCheckedChange={() =>
                    sendDetect(detectState == "ON" ? "OFF" : "ON")
                  }
                />
                {recordingEnabled && (
                  <FilterSwitch
                    label={t("cameraSettings.recording")}
                    isChecked={recordState == "ON"}
                    onCheckedChange={() =>
                      sendRecord(recordState == "ON" ? "OFF" : "ON")
                    }
                  />
                )}
                <FilterSwitch
                  label={t("cameraSettings.snapshots")}
                  isChecked={snapshotState == "ON"}
                  onCheckedChange={() =>
                    sendSnapshot(snapshotState == "ON" ? "OFF" : "ON")
                  }
                />
                {audioDetectEnabled && (
                  <FilterSwitch
                    label={t("cameraSettings.audioDetection")}
                    isChecked={audioState == "ON"}
                    onCheckedChange={() =>
                      sendAudio(audioState == "ON" ? "OFF" : "ON")
                    }
                  />
                )}
                {audioDetectEnabled && transcriptionEnabled && (
                  <FilterSwitch
                    label={t("cameraSettings.transcription")}
                    disabled={audioState == "OFF"}
                    isChecked={transcriptionState == "ON"}
                    onCheckedChange={() =>
                      sendTranscription(
                        transcriptionState == "ON" ? "OFF" : "ON",
                      )
                    }
                  />
                )}
                {autotrackingEnabled && (
                  <FilterSwitch
                    label={t("cameraSettings.autotracking")}
                    isChecked={autotrackingState == "ON"}
                    onCheckedChange={() =>
                      sendAutotracking(autotrackingState == "ON" ? "OFF" : "ON")
                    }
                  />
                )}
              </>
            )}

            <div className="mt-3 flex flex-col gap-5">
              {!isRestreamed && (
                <div className="flex flex-col gap-2 p-2">
                  <Label>{t("stream.title")}</Label>
                  <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
                    <LuX className="size-4 text-danger" />
                    <div>
                      {t("streaming.restreaming.disabled", {
                        ns: "components/dialog",
                      })}
                    </div>
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <div className="cursor-pointer p-0">
                          <LuInfo className="size-4" />
                          <span className="sr-only">
                            {t("button.info", { ns: "common" })}
                          </span>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 text-xs">
                        {t("streaming.restreaming.desc.title", {
                          ns: "components/dialog",
                        })}
                        <div className="mt-2 flex items-center text-primary">
                          <Link
                            to={getLocaleDocUrl("configuration/live")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline"
                          >
                            {t("readTheDocumentation", { ns: "common" })}
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
                  <div className="mt-1 p-2">
                    <div className="mb-1 text-sm">{t("stream.title")}</div>
                    <Select
                      value={streamName}
                      onValueChange={(value) => {
                        setStreamName?.(value);
                      }}
                      disabled={debug}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {Object.keys(camera.live.streams).find(
                            (key) => camera.live.streams[key] === streamName,
                          )}
                        </SelectValue>
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

                    {debug && (
                      <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
                        <>
                          <LuX className="size-8 text-danger" />
                          <div>{t("stream.debug.picker")}</div>
                        </>
                      </div>
                    )}

                    {preferredLiveMode != "jsmpeg" &&
                      !debug &&
                      isRestreamed && (
                        <div className="mt-1 flex flex-row items-center gap-1 text-sm text-muted-foreground">
                          {supportsAudioOutput ? (
                            <>
                              <LuCheck className="size-4 text-success" />
                              <div>{t("stream.audio.available")}</div>
                            </>
                          ) : (
                            <>
                              <LuX className="size-4 text-danger" />
                              <div>{t("stream.audio.unavailable")}</div>
                              <Popover modal={true}>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer p-0">
                                    <LuInfo className="size-4" />
                                    <span className="sr-only">
                                      {t("button.info", { ns: "common" })}
                                    </span>
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-52 text-xs">
                                  {t("stream.audio.tips.title")}
                                  <div className="mt-2 flex items-center text-primary">
                                    <Link
                                      to={getLocaleDocUrl("configuration/live")}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline"
                                    >
                                      {t("readTheDocumentation", {
                                        ns: "common",
                                      })}
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
                      !debug &&
                      isRestreamed &&
                      supportsAudioOutput && (
                        <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
                          {supports2WayTalk ? (
                            <>
                              <LuCheck className="size-4 text-success" />
                              <div>{t("stream.twoWayTalk.available")}</div>
                            </>
                          ) : (
                            <>
                              <LuX className="size-4 text-danger" />
                              <div>{t("stream.twoWayTalk.unavailable")}</div>
                              <Popover modal={true}>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer p-0">
                                    <LuInfo className="size-4" />
                                    <span className="sr-only">
                                      {t("button.info", { ns: "common" })}
                                    </span>
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-52 text-xs">
                                  {t("stream.twoWayTalk.tips")}
                                  <div className="mt-2 flex items-center text-primary">
                                    <Link
                                      to={getLocaleDocUrl(
                                        "configuration/live/#webrtc-extra-configuration",
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline"
                                    >
                                      {t("readTheDocumentation", {
                                        ns: "common",
                                      })}
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
                            {t("stream.lowBandwidth.tips")}
                          </p>
                        </div>
                        <Button
                          className={`flex items-center gap-2.5 rounded-lg`}
                          aria-label={t("stream.lowBandwidth.resetStream")}
                          variant="outline"
                          size="sm"
                          disabled={debug}
                          onClick={() => setLowBandwidth(false)}
                        >
                          <MdOutlineRestartAlt className="size-5 text-primary-variant" />
                          <div className="text-primary-variant">
                            {t("stream.lowBandwidth.resetStream")}
                          </div>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              <div className="flex flex-col gap-1 px-2">
                <div className="mb-1 text-sm font-medium leading-none">
                  {t("manualRecording.title")}
                </div>
                <div className="flex flex-row items-stretch gap-2">
                  <Button
                    onClick={handleSnapshotClick}
                    disabled={!cameraEnabled || debug || isSnapshotLoading}
                    className="h-auto w-full whitespace-normal"
                  >
                    {isSnapshotLoading && (
                      <ActivityIndicator className="mr-2 size-4" />
                    )}
                    {t("snapshot.takeSnapshot")}
                  </Button>
                  <Button
                    onClick={handleEventButtonClick}
                    className={cn(
                      "h-auto w-full whitespace-normal",
                      isRecording &&
                        "animate-pulse bg-red-500 hover:bg-red-600",
                    )}
                    disabled={debug}
                  >
                    {t("manualRecording." + (isRecording ? "end" : "start"))}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("manualRecording.tips")}
                </p>
              </div>
              {isRestreamed && (
                <>
                  <div className="flex flex-col gap-2">
                    <FilterSwitch
                      label={t("manualRecording.playInBackground.label")}
                      isChecked={playInBackground}
                      onCheckedChange={(checked) => {
                        setPlayInBackground(checked);
                      }}
                      disabled={debug}
                    />
                    <p className="mx-2 -mt-2 text-sm text-muted-foreground">
                      {t("manualRecording.playInBackground.desc")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <FilterSwitch
                      label={t("manualRecording.showStats.label")}
                      isChecked={showStats}
                      onCheckedChange={(checked) => {
                        setShowStats(checked);
                      }}
                      disabled={debug}
                    />
                    <p className="mx-2 -mt-2 text-sm text-muted-foreground">
                      {t("manualRecording.showStats.desc")}
                    </p>
                  </div>
                </>
              )}
              <div className="mb-3 flex flex-col">
                <FilterSwitch
                  label={t("streaming.debugView", { ns: "components/dialog" })}
                  isChecked={debug}
                  onCheckedChange={(checked) => setDebug(checked)}
                />
              </div>
            </div>
          </>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
