import { useFrigateReviews } from "@/api/ws";
import Logo from "@/components/Logo";
import { CameraGroupSelector } from "@/components/filter/CameraGroupSelector";
import { LiveGridIcon, LiveListIcon } from "@/components/icons/LiveIcons";
import { AnimatedEventCard } from "@/components/card/AnimatedEventCard";
import BirdseyeLivePlayer from "@/components/player/BirdseyeLivePlayer";
import LivePlayer from "@/components/player/LivePlayer";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import {
  AllGroupsStreamingSettings,
  CameraConfig,
  FrigateConfig,
} from "@/types/frigateConfig";
import { ReviewSegment } from "@/types/review";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  isDesktop,
  isMobile,
  isMobileOnly,
  isTablet,
} from "react-device-detect";
import useSWR from "swr";
import DraggableGridLayout from "./DraggableGridLayout";
import { IoClose } from "react-icons/io5";
import { LuLayoutDashboard } from "react-icons/lu";
import { cn } from "@/lib/utils";
import {
  AudioState,
  LivePlayerError,
  StatsState,
  VolumeState,
} from "@/types/live";
import { FaCompress, FaExpand } from "react-icons/fa";
import useCameraLiveMode from "@/hooks/use-camera-live-mode";
import { useResizeObserver } from "@/hooks/resize-observer";
import LiveContextMenu from "@/components/menu/LiveContextMenu";
import { useStreamingSettings } from "@/context/streaming-settings-provider";
import { useTranslation } from "react-i18next";
import { EmptyCard } from "@/components/card/EmptyCard";
import { BsFillCameraVideoOffFill } from "react-icons/bs";
import { AuthContext } from "@/context/auth-context";
import { useIsAdmin } from "@/hooks/use-is-admin";

type LiveDashboardViewProps = {
  cameras: CameraConfig[];
  cameraGroup: string;
  includeBirdseye: boolean;
  onSelectCamera: (camera: string) => void;
  fullscreen: boolean;
  toggleFullscreen: () => void;
};
export default function LiveDashboardView({
  cameras,
  cameraGroup,
  includeBirdseye,
  onSelectCamera,
  fullscreen,
  toggleFullscreen,
}: LiveDashboardViewProps) {
  const { t } = useTranslation(["views/live"]);

  const { data: config } = useSWR<FrigateConfig>("config");

  // layout

  const [mobileLayout, setMobileLayout] = useUserPersistence<"grid" | "list">(
    "live-layout",
    isDesktop ? "grid" : "list",
  );

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const birdseyeContainerRef = useRef<HTMLDivElement>(null);

  // recent events

  const eventUpdate = useFrigateReviews();

  const alertCameras = useMemo(() => {
    if (!config || cameraGroup == "default") {
      return null;
    }

    if (includeBirdseye && cameras.length == 0) {
      return Object.values(config.cameras)
        .filter((cam) => cam.birdseye.enabled)
        .map((cam) => cam.name)
        .join(",");
    }

    return cameras
      .map((cam) => cam.name)
      .filter((cam) => config.camera_groups[cameraGroup]?.cameras.includes(cam))
      .join(",");
  }, [cameras, cameraGroup, config, includeBirdseye]);

  const { data: allEvents, mutate: updateEvents } = useSWR<ReviewSegment[]>([
    "review",
    {
      limit: 10,
      severity: "alert",
      reviewed: 0,
      cameras: alertCameras,
    },
  ]);

  useEffect(() => {
    if (!eventUpdate) {
      return;
    }

    // if event is ended and was saved, update events list
    if (eventUpdate.after.severity == "alert") {
      if (
        eventUpdate.type == "end" ||
        eventUpdate.type == "new" ||
        eventUpdate.type == "genai"
      ) {
        setTimeout(
          () => updateEvents(),
          eventUpdate.type == "end" ? 1000 : 6000,
        );
      } else if (
        eventUpdate.before.data.objects.length <
        eventUpdate.after.data.objects.length
      ) {
        setTimeout(() => updateEvents(), 5000);
      }

      return;
    }
  }, [eventUpdate, updateEvents]);

  const events = useMemo(() => {
    if (!allEvents) {
      return [];
    }

    const date = new Date();
    date.setHours(date.getHours() - 1);
    const cutoff = date.getTime() / 1000;
    return allEvents.filter((event) => event.start_time > cutoff);
  }, [allEvents]);

  // camera live views

  const [{ height: containerHeight }] = useResizeObserver(containerRef);

  const hasScrollbar = useMemo(() => {
    if (containerHeight && containerRef.current) {
      return (
        containerRef.current.offsetHeight < containerRef.current.scrollHeight
      );
    }
  }, [containerRef, containerHeight]);

  const [windowVisible, setWindowVisible] = useState(true);
  const visibilityListener = useCallback(() => {
    setWindowVisible(document.visibilityState == "visible");
  }, []);

  useEffect(() => {
    addEventListener("visibilitychange", visibilityListener);

    return () => {
      removeEventListener("visibilitychange", visibilityListener);
    };
  }, [visibilityListener]);

  const [visibleCameras, setVisibleCameras] = useState<string[]>([]);
  const visibleCameraObserver = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    const visibleCameras = new Set<string>();
    visibleCameraObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const camera = (entry.target as HTMLElement).dataset.camera;

          if (!camera) {
            return;
          }

          if (entry.isIntersecting) {
            visibleCameras.add(camera);
          } else {
            visibleCameras.delete(camera);
          }

          setVisibleCameras([...visibleCameras]);
        });
      },
      { threshold: 0.5 },
    );

    return () => {
      visibleCameraObserver.current?.disconnect();
    };
  }, []);

  const [globalAutoLive] = useUserPersistence("autoLiveView", true);
  const [displayCameraNames] = useUserPersistence("displayCameraNames", false);

  const { allGroupsStreamingSettings, setAllGroupsStreamingSettings } =
    useStreamingSettings();

  const currentGroupStreamingSettings = useMemo(() => {
    if (cameraGroup && cameraGroup != "default" && allGroupsStreamingSettings) {
      return allGroupsStreamingSettings[cameraGroup];
    }
  }, [allGroupsStreamingSettings, cameraGroup]);

  const cameraRef = useCallback(
    (node: HTMLElement | null) => {
      if (!visibleCameraObserver.current) {
        return;
      }

      try {
        if (node) visibleCameraObserver.current.observe(node);
      } catch (e) {
        // no op
      }
    },
    // we need to listen on the value of the ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleCameraObserver.current],
  );

  const activeStreams = useMemo(() => {
    const streams: { [cameraName: string]: string } = {};
    cameras.forEach((camera) => {
      const availableStreams = camera.live.streams || {};
      const streamNameFromSettings =
        currentGroupStreamingSettings?.[camera.name]?.streamName || "";
      const streamExists =
        streamNameFromSettings &&
        Object.values(availableStreams).includes(streamNameFromSettings);

      const streamName = streamExists
        ? streamNameFromSettings
        : Object.values(availableStreams)[0] || "";

      streams[camera.name] = streamName;
    });
    return streams;
  }, [cameras, currentGroupStreamingSettings]);

  const {
    preferredLiveModes,
    setPreferredLiveModes,
    resetPreferredLiveMode,
    isRestreamedStates,
    supportsAudioOutputStates,
    streamMetadata,
  } = useCameraLiveMode(cameras, windowVisible, activeStreams);

  const birdseyeConfig = useMemo(() => config?.birdseye, [config]);

  const handleError = useCallback(
    (cameraName: string, error: LivePlayerError) => {
      setPreferredLiveModes((prevModes) => {
        const newModes = { ...prevModes };
        if (error === "mse-decode") {
          newModes[cameraName] = "webrtc";
        } else {
          newModes[cameraName] = "jsmpeg";
        }
        return newModes;
      });
    },
    [setPreferredLiveModes],
  );

  // audio states

  const [audioStates, setAudioStates] = useState<AudioState>({});
  const [volumeStates, setVolumeStates] = useState<VolumeState>({});
  const [statsStates, setStatsStates] = useState<StatsState>({});

  const toggleStats = (cameraName: string): void => {
    setStatsStates((prev) => ({
      ...prev,
      [cameraName]: !prev[cameraName],
    }));
  };

  useEffect(() => {
    if (!allGroupsStreamingSettings) {
      return;
    }

    const initialAudioStates: AudioState = {};
    const initialVolumeStates: VolumeState = {};

    Object.entries(allGroupsStreamingSettings).forEach(([_, groupSettings]) => {
      if (groupSettings) {
        Object.entries(groupSettings).forEach(([camera, cameraSettings]) => {
          initialAudioStates[camera] = cameraSettings.playAudio ?? false;
          initialVolumeStates[camera] = cameraSettings.volume ?? 1;
        });
      }
    });

    setAudioStates(initialAudioStates);
    setVolumeStates(initialVolumeStates);
  }, [allGroupsStreamingSettings]);

  const toggleAudio = (cameraName: string): void => {
    setAudioStates((prev) => ({
      ...prev,
      [cameraName]: !prev[cameraName],
    }));
  };

  const onSaveMuting = useCallback(
    (playAudio: boolean) => {
      if (
        !cameraGroup ||
        !allGroupsStreamingSettings ||
        cameraGroup == "default"
      ) {
        return;
      }

      const existingGroupSettings =
        allGroupsStreamingSettings[cameraGroup] || {};

      const updatedSettings: AllGroupsStreamingSettings = {
        ...Object.fromEntries(
          Object.entries(allGroupsStreamingSettings || {}).filter(
            ([key]) => key !== cameraGroup,
          ),
        ),
        [cameraGroup]: {
          ...existingGroupSettings,
          ...Object.fromEntries(
            Object.entries(existingGroupSettings).map(
              ([cameraName, settings]) => [
                cameraName,
                {
                  ...settings,
                  playAudio: playAudio,
                },
              ],
            ),
          ),
        },
      };

      setAllGroupsStreamingSettings?.(updatedSettings);
    },
    [cameraGroup, allGroupsStreamingSettings, setAllGroupsStreamingSettings],
  );

  const muteAll = (): void => {
    const updatedStates: Record<string, boolean> = {};
    visibleCameras.forEach((cameraName) => {
      updatedStates[cameraName] = false;
    });
    setAudioStates(updatedStates);
    onSaveMuting(false);
  };

  const unmuteAll = (): void => {
    const updatedStates: Record<string, boolean> = {};
    visibleCameras.forEach((cameraName) => {
      updatedStates[cameraName] = true;
    });
    setAudioStates(updatedStates);
    onSaveMuting(true);
  };

  return (
    <div
      className="scrollbar-container size-full select-none overflow-y-auto px-1 pt-2 md:p-2"
      ref={containerRef}
    >
      {isMobile && (
        <div className="relative flex h-11 items-center justify-between">
          <Logo className="absolute inset-x-1/2 h-8 -translate-x-1/2" />
          <div className="max-w-[45%]">
            <CameraGroupSelector />
          </div>
          {(!cameraGroup || cameraGroup == "default" || isMobileOnly) && (
            <div className="flex items-center gap-1">
              <Button
                className={`p-1 ${
                  mobileLayout == "grid"
                    ? "bg-blue-900 bg-opacity-60 focus:bg-blue-900 focus:bg-opacity-60"
                    : "bg-secondary"
                }`}
                aria-label="Use mobile grid layout"
                size="xs"
                onClick={() => setMobileLayout("grid")}
              >
                <LiveGridIcon layout={mobileLayout} />
              </Button>
              <Button
                className={`p-1 ${
                  mobileLayout == "list"
                    ? "bg-blue-900 bg-opacity-60 focus:bg-blue-900 focus:bg-opacity-60"
                    : "bg-secondary"
                }`}
                aria-label="Use mobile list layout"
                size="xs"
                onClick={() => setMobileLayout("list")}
              >
                <LiveListIcon layout={mobileLayout} />
              </Button>
            </div>
          )}
          {cameraGroup && cameraGroup !== "default" && isTablet && (
            <div className="flex items-center gap-1">
              <Button
                className={cn(
                  "p-1",
                  isEditMode
                    ? "bg-selected text-primary"
                    : "bg-secondary text-secondary-foreground",
                )}
                aria-label="Enter layout editing mode"
                size="xs"
                onClick={() =>
                  setIsEditMode((prevIsEditMode) => !prevIsEditMode)
                }
              >
                {isEditMode ? <IoClose /> : <LuLayoutDashboard />}
              </Button>
            </div>
          )}
        </div>
      )}

      {cameras.length == 0 && !includeBirdseye ? (
        <NoCameraView cameraGroup={cameraGroup} />
      ) : (
        <>
          {!fullscreen && events && events.length > 0 && (
            <ScrollArea>
              <TooltipProvider>
                <div className="flex items-center gap-2 px-1">
                  {events.map((event) => {
                    return (
                      <AnimatedEventCard
                        key={event.id}
                        event={event}
                        selectedGroup={cameraGroup}
                        updateEvents={updateEvents}
                      />
                    );
                  })}
                </div>
              </TooltipProvider>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          {!cameraGroup || cameraGroup == "default" || isMobileOnly ? (
            <>
              <div
                className={cn(
                  "mt-2 grid grid-cols-1 gap-2 px-2 md:gap-4",
                  mobileLayout == "grid" &&
                    "grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4",
                  isMobile && "px-0",
                )}
              >
                {includeBirdseye && birdseyeConfig?.enabled && (
                  <div
                    className={(() => {
                      const aspectRatio =
                        birdseyeConfig.width / birdseyeConfig.height;
                      if (aspectRatio > 2) {
                        return `${mobileLayout == "grid" && "col-span-2"} aspect-wide`;
                      } else if (aspectRatio < 1) {
                        return `${mobileLayout == "grid" && "row-span-2 h-full"} aspect-tall`;
                      } else {
                        return "aspect-video";
                      }
                    })()}
                    ref={birdseyeContainerRef}
                  >
                    <BirdseyeLivePlayer
                      birdseyeConfig={birdseyeConfig}
                      liveMode={birdseyeConfig.restream ? "mse" : "jsmpeg"}
                      onClick={() => onSelectCamera("birdseye")}
                      containerRef={birdseyeContainerRef}
                    />
                  </div>
                )}
                {cameras.map((camera) => {
                  let grow;
                  const aspectRatio =
                    camera.detect.width / camera.detect.height;
                  if (aspectRatio > 2) {
                    grow = `${mobileLayout == "grid" && "col-span-2"} aspect-wide`;
                  } else if (aspectRatio < 1) {
                    grow = `${mobileLayout == "grid" && "row-span-2 h-full"} aspect-tall`;
                  } else {
                    grow = "aspect-video";
                  }
                  const availableStreams = camera.live.streams || {};
                  const firstStreamEntry =
                    Object.values(availableStreams)[0] || "";

                  const streamNameFromSettings =
                    currentGroupStreamingSettings?.[camera.name]?.streamName ||
                    "";
                  const streamExists =
                    streamNameFromSettings &&
                    Object.values(availableStreams).includes(
                      streamNameFromSettings,
                    );

                  const streamName = streamExists
                    ? streamNameFromSettings
                    : firstStreamEntry;
                  const streamType =
                    currentGroupStreamingSettings?.[camera.name]?.streamType;
                  const autoLive =
                    streamType !== undefined
                      ? streamType !== "no-streaming"
                      : undefined;
                  const showStillWithoutActivity =
                    currentGroupStreamingSettings?.[camera.name]?.streamType !==
                    "continuous";
                  const useWebGL =
                    currentGroupStreamingSettings?.[camera.name]
                      ?.compatibilityMode || false;
                  return (
                    <LiveContextMenu
                      className={grow}
                      key={camera.name}
                      camera={camera.name}
                      cameraGroup={cameraGroup}
                      streamName={streamName}
                      preferredLiveMode={
                        preferredLiveModes[camera.name] ?? "mse"
                      }
                      isRestreamed={isRestreamedStates[camera.name]}
                      supportsAudio={
                        supportsAudioOutputStates[streamName]?.supportsAudio ??
                        false
                      }
                      audioState={audioStates[camera.name]}
                      toggleAudio={() => toggleAudio(camera.name)}
                      statsState={statsStates[camera.name]}
                      toggleStats={() => toggleStats(camera.name)}
                      volumeState={volumeStates[camera.name] ?? 1}
                      setVolumeState={(value) =>
                        setVolumeStates({
                          [camera.name]: value,
                        })
                      }
                      muteAll={muteAll}
                      unmuteAll={unmuteAll}
                      resetPreferredLiveMode={() =>
                        resetPreferredLiveMode(camera.name)
                      }
                      config={config}
                    >
                      <LivePlayer
                        cameraRef={cameraRef}
                        key={camera.name}
                        className={`${grow} rounded-lg bg-black md:rounded-2xl`}
                        windowVisible={
                          windowVisible && visibleCameras.includes(camera.name)
                        }
                        cameraConfig={camera}
                        preferredLiveMode={
                          preferredLiveModes[camera.name] ?? "mse"
                        }
                        autoLive={autoLive ?? globalAutoLive}
                        showStillWithoutActivity={
                          showStillWithoutActivity ?? true
                        }
                        alwaysShowCameraName={displayCameraNames}
                        useWebGL={useWebGL}
                        playInBackground={false}
                        showStats={statsStates[camera.name]}
                        streamName={streamName}
                        onClick={() => onSelectCamera(camera.name)}
                        onError={(e) => handleError(camera.name, e)}
                        onResetLiveMode={() =>
                          resetPreferredLiveMode(camera.name)
                        }
                        playAudio={audioStates[camera.name] ?? false}
                        volume={volumeStates[camera.name]}
                      />
                    </LiveContextMenu>
                  );
                })}
              </div>
              {isDesktop && (
                <div
                  className={cn(
                    "fixed",
                    isDesktop && "bottom-12 lg:bottom-9",
                    isMobile && "bottom-12 lg:bottom-16",
                    hasScrollbar && isDesktop ? "right-6" : "right-3",
                    "z-50 flex flex-row gap-2",
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="cursor-pointer rounded-lg bg-secondary text-secondary-foreground opacity-60 transition-all duration-300 hover:bg-muted hover:opacity-100"
                        onClick={toggleFullscreen}
                      >
                        {fullscreen ? (
                          <FaCompress className="size-5 md:m-[6px]" />
                        ) : (
                          <FaExpand className="size-5 md:m-[6px]" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {fullscreen
                        ? t("button.exitFullscreen", { ns: "common" })
                        : t("button.fullscreen", { ns: "common" })}
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </>
          ) : (
            <DraggableGridLayout
              cameras={cameras}
              cameraGroup={cameraGroup}
              containerRef={containerRef}
              cameraRef={cameraRef}
              includeBirdseye={includeBirdseye}
              onSelectCamera={onSelectCamera}
              windowVisible={windowVisible}
              visibleCameras={visibleCameras}
              isEditMode={isEditMode}
              setIsEditMode={setIsEditMode}
              fullscreen={fullscreen}
              toggleFullscreen={toggleFullscreen}
              preferredLiveModes={preferredLiveModes}
              setPreferredLiveModes={setPreferredLiveModes}
              resetPreferredLiveMode={resetPreferredLiveMode}
              isRestreamedStates={isRestreamedStates}
              supportsAudioOutputStates={supportsAudioOutputStates}
              streamMetadata={streamMetadata}
            />
          )}
        </>
      )}
    </div>
  );
}

function NoCameraView({ cameraGroup }: { cameraGroup?: string }) {
  const { t } = useTranslation(["views/live"]);
  const { auth } = useContext(AuthContext);
  const isAdmin = useIsAdmin();

  const isDefault = cameraGroup === "default";
  const isRestricted = !isAdmin && auth.isAuthenticated;

  let type: "default" | "group" | "restricted";
  if (isRestricted) {
    type = "restricted";
  } else if (isDefault) {
    type = "default";
  } else {
    type = "group";
  }

  return (
    <div className="flex size-full items-center justify-center">
      <EmptyCard
        icon={<BsFillCameraVideoOffFill className="size-8" />}
        title={t(`noCameras.${type}.title`)}
        description={t(`noCameras.${type}.description`)}
        buttonText={
          type !== "restricted" && isDefault
            ? t(`noCameras.${type}.buttonText`)
            : undefined
        }
        link={
          type !== "restricted" && isDefault
            ? "/settings?page=cameraManagement"
            : undefined
        }
      />
    </div>
  );
}
