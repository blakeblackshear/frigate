import { useUserPersistence } from "@/hooks/use-user-persistence";
import {
  AllGroupsStreamingSettings,
  BirdseyeConfig,
  CameraConfig,
  FrigateConfig,
} from "@/types/frigateConfig";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ItemCallback,
  Layout,
  Responsive,
  WidthProvider,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  AudioState,
  LivePlayerMode,
  LiveStreamMetadata,
  StatsState,
  VolumeState,
} from "@/types/live";
import { ASPECT_VERTICAL_LAYOUT, ASPECT_WIDE_LAYOUT } from "@/types/record";
import { Skeleton } from "@/components/ui/skeleton";
import { useResizeObserver } from "@/hooks/resize-observer";
import { isEqual } from "lodash";
import useSWR from "swr";
import { isDesktop, isMobile } from "react-device-detect";
import BirdseyeLivePlayer from "@/components/player/BirdseyeLivePlayer";
import LivePlayer from "@/components/player/LivePlayer";
import { IoClose } from "react-icons/io5";
import { LuLayoutDashboard, LuPencil } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { EditGroupDialog } from "@/components/filter/CameraGroupSelector";
import { useUserPersistedOverlayState } from "@/hooks/use-overlay-state";
import { FaCompress, FaExpand } from "react-icons/fa";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import LiveContextMenu from "@/components/menu/LiveContextMenu";
import { useStreamingSettings } from "@/context/streaming-settings-provider";
import { useTranslation } from "react-i18next";

type DraggableGridLayoutProps = {
  cameras: CameraConfig[];
  cameraGroup: string;
  cameraRef: (node: HTMLElement | null) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  includeBirdseye: boolean;
  onSelectCamera: (camera: string) => void;
  windowVisible: boolean;
  visibleCameras: string[];
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  preferredLiveModes: { [key: string]: LivePlayerMode };
  setPreferredLiveModes: React.Dispatch<
    React.SetStateAction<{ [key: string]: LivePlayerMode }>
  >;
  resetPreferredLiveMode: (cameraName: string) => void;
  isRestreamedStates: { [key: string]: boolean };
  supportsAudioOutputStates: {
    [key: string]: { supportsAudio: boolean; cameraName: string };
  };
  streamMetadata: { [key: string]: LiveStreamMetadata };
};
export default function DraggableGridLayout({
  cameras,
  cameraGroup,
  containerRef,
  cameraRef,
  includeBirdseye,
  onSelectCamera,
  windowVisible,
  visibleCameras,
  isEditMode,
  setIsEditMode,
  fullscreen,
  toggleFullscreen,
  preferredLiveModes,
  setPreferredLiveModes,
  resetPreferredLiveMode,
  isRestreamedStates,
  supportsAudioOutputStates,
  streamMetadata,
}: DraggableGridLayoutProps) {
  const { t } = useTranslation(["views/live"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const birdseyeConfig = useMemo(() => config?.birdseye, [config]);

  // preferred live modes per camera

  const [globalAutoLive] = useUserPersistence("autoLiveView", true);
  const [displayCameraNames] = useUserPersistence("displayCameraNames", false);

  const { allGroupsStreamingSettings, setAllGroupsStreamingSettings } =
    useStreamingSettings();

  const currentGroupStreamingSettings = useMemo(() => {
    if (cameraGroup && cameraGroup != "default" && allGroupsStreamingSettings) {
      return allGroupsStreamingSettings[cameraGroup];
    }
  }, [allGroupsStreamingSettings, cameraGroup]);

  // grid layout

  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), []);

  const [gridLayout, setGridLayout, isGridLayoutLoaded] = useUserPersistence<
    Layout[]
  >(`${cameraGroup}-draggable-layout`);

  const [group] = useUserPersistedOverlayState(
    "cameraGroup",
    "default" as string,
  );

  const groups = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.entries(config.camera_groups).sort(
      (a, b) => a[1].order - b[1].order,
    );
  }, [config]);

  // editing

  const [editGroup, setEditGroup] = useState(false);
  const [showCircles, setShowCircles] = useState(true);

  useEffect(() => {
    setIsEditMode(false);
    setEditGroup(false);
    // Reset camera tracking state when group changes to prevent the camera-change
    // effect from incorrectly overwriting the loaded layout
    setCurrentCameras(undefined);
    setCurrentIncludeBirdseye(undefined);
    setCurrentGridLayout(undefined);
  }, [cameraGroup, setIsEditMode]);

  // camera state

  const [currentCameras, setCurrentCameras] = useState<CameraConfig[]>();
  const [currentIncludeBirdseye, setCurrentIncludeBirdseye] =
    useState<boolean>();
  const [currentGridLayout, setCurrentGridLayout] = useState<
    Layout[] | undefined
  >();

  const handleLayoutChange = useCallback(
    (currentLayout: Layout[]) => {
      if (!isGridLayoutLoaded || !isEqual(gridLayout, currentGridLayout)) {
        return;
      }
      // save layout to idb
      setGridLayout(currentLayout);
      setShowCircles(true);
    },
    [setGridLayout, isGridLayoutLoaded, gridLayout, currentGridLayout],
  );

  const generateLayout = useCallback(
    (baseLayout: Layout[] | undefined) => {
      if (!isGridLayoutLoaded) {
        return;
      }

      const cameraNames =
        includeBirdseye && birdseyeConfig?.enabled
          ? ["birdseye", ...cameras.map((camera) => camera?.name || "")]
          : cameras.map((camera) => camera?.name || "");

      const optionsMap: Layout[] = baseLayout
        ? baseLayout.filter((layout) => cameraNames?.includes(layout.i))
        : [];

      cameraNames.forEach((cameraName, index) => {
        const existingLayout = optionsMap.find(
          (layout) => layout.i === cameraName,
        );

        // Skip if the camera already exists in the layout
        if (existingLayout) {
          return;
        }

        let aspectRatio;
        let col;

        // Handle "birdseye" camera as a special case
        if (cameraName === "birdseye") {
          aspectRatio =
            (birdseyeConfig?.width || 1) / (birdseyeConfig?.height || 1);
          col = 0; // Set birdseye camera in the first column
        } else {
          const camera = cameras.find((cam) => cam.name === cameraName);
          aspectRatio =
            (camera && camera?.detect.width / camera?.detect.height) || 16 / 9;
          col = index % 3; // Regular cameras distributed across columns
        }

        // Calculate layout options based on aspect ratio
        const columnsPerPlayer = 4;
        let height;
        let width;

        if (aspectRatio < 1) {
          // Portrait
          height = 2 * columnsPerPlayer;
          width = columnsPerPlayer;
        } else if (aspectRatio > 2) {
          // Wide
          height = 1 * columnsPerPlayer;
          width = 2 * columnsPerPlayer;
        } else {
          // Landscape
          height = 1 * columnsPerPlayer;
          width = columnsPerPlayer;
        }

        const options = {
          i: cameraName,
          x: col * width,
          y: 0, // don't set y, grid does automatically
          w: width,
          h: height,
        };

        optionsMap.push(options);
      });

      return optionsMap;
    },
    [cameras, isGridLayoutLoaded, includeBirdseye, birdseyeConfig],
  );

  useEffect(() => {
    if (isGridLayoutLoaded) {
      if (gridLayout) {
        // set current grid layout from loaded, possibly adding new cameras
        const updatedLayout = generateLayout(gridLayout);
        setCurrentGridLayout(updatedLayout);
        // Only save if cameras were added (layout changed)
        if (!isEqual(updatedLayout, gridLayout)) {
          setGridLayout(updatedLayout);
        }
        // Set camera tracking state so the camera-change effect has a baseline
        setCurrentCameras(cameras);
        setCurrentIncludeBirdseye(includeBirdseye);
      } else {
        // idb is empty, set it with an initial layout
        const newLayout = generateLayout(undefined);
        setCurrentGridLayout(newLayout);
        setGridLayout(newLayout);
        setCurrentCameras(cameras);
        setCurrentIncludeBirdseye(includeBirdseye);
      }
    }
  }, [
    gridLayout,
    setGridLayout,
    isGridLayoutLoaded,
    generateLayout,
    cameras,
    includeBirdseye,
  ]);

  useEffect(() => {
    // Only regenerate layout when cameras change WITHIN an already-loaded group
    // Skip if currentCameras is undefined (means we just switched groups and
    // the first useEffect hasn't run yet to set things up)
    if (!isGridLayoutLoaded || currentCameras === undefined) {
      return;
    }

    if (
      !isEqual(cameras, currentCameras) ||
      includeBirdseye !== currentIncludeBirdseye
    ) {
      setCurrentCameras(cameras);
      setCurrentIncludeBirdseye(includeBirdseye);

      // Regenerate layout based on current layout, adding any new cameras
      const updatedLayout = generateLayout(currentGridLayout);
      setCurrentGridLayout(updatedLayout);
      setGridLayout(updatedLayout);
    }
  }, [
    cameras,
    includeBirdseye,
    currentCameras,
    currentIncludeBirdseye,
    currentGridLayout,
    generateLayout,
    setGridLayout,
    isGridLayoutLoaded,
  ]);

  const [marginValue, setMarginValue] = useState(16);

  // calculate margin value for browsers that don't have default font size of 16px
  useLayoutEffect(() => {
    const calculateRemValue = () => {
      const htmlElement = document.documentElement;
      const fontSize = window.getComputedStyle(htmlElement).fontSize;
      setMarginValue(parseFloat(fontSize));
    };

    calculateRemValue();
  }, []);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(gridContainerRef);

  const scrollBarWidth = useMemo(() => {
    if (containerWidth && containerHeight && containerRef.current) {
      return (
        containerRef.current.offsetWidth - containerRef.current.clientWidth
      );
    }
    return 0;
  }, [containerRef, containerHeight, containerWidth]);

  const availableWidth = useMemo(
    () => (scrollBarWidth ? containerWidth + scrollBarWidth : containerWidth),
    [containerWidth, scrollBarWidth],
  );

  const hasScrollbar = useMemo(() => {
    if (containerHeight && containerRef.current) {
      return (
        containerRef.current.offsetHeight < containerRef.current.scrollHeight
      );
    }
  }, [containerRef, containerHeight]);

  const cellHeight = useMemo(() => {
    const aspectRatio = 16 / 9;
    // subtract container margin, 1 camera takes up at least 4 rows
    // account for additional margin on bottom of each row
    return (
      ((availableWidth ?? window.innerWidth) - 2 * marginValue) /
        12 /
        aspectRatio -
      marginValue +
      marginValue / 4
    );
  }, [availableWidth, marginValue]);

  const handleResize: ItemCallback = (
    _: Layout[],
    oldLayoutItem: Layout,
    layoutItem: Layout,
    placeholder: Layout,
  ) => {
    const heightDiff = layoutItem.h - oldLayoutItem.h;
    const widthDiff = layoutItem.w - oldLayoutItem.w;
    const changeCoef = oldLayoutItem.w / oldLayoutItem.h;

    let newWidth, newHeight;

    if (Math.abs(heightDiff) < Math.abs(widthDiff)) {
      newHeight = Math.round(layoutItem.w / changeCoef);
      newWidth = Math.round(newHeight * changeCoef);
    } else {
      newWidth = Math.round(layoutItem.h * changeCoef);
      newHeight = Math.round(newWidth / changeCoef);
    }

    // Ensure dimensions maintain aspect ratio and fit within the grid
    if (layoutItem.x + newWidth > 12) {
      newWidth = 12 - layoutItem.x;
      newHeight = Math.round(newWidth / changeCoef);
    }

    if (changeCoef == 0.5) {
      // portrait
      newHeight = Math.ceil(newHeight / 2) * 2;
    } else if (changeCoef == 2) {
      // pano/wide
      newHeight = Math.ceil(newHeight * 2) / 2;
    }

    newWidth = Math.round(newHeight * changeCoef);

    layoutItem.w = newWidth;
    layoutItem.h = newHeight;
    placeholder.w = layoutItem.w;
    placeholder.h = layoutItem.h;
  };

  // audio and stats states

  const [audioStates, setAudioStates] = useState<AudioState>({});
  const [volumeStates, setVolumeStates] = useState<VolumeState>({});
  const [statsStates, setStatsStates] = useState<StatsState>(() => {
    const initialStates: StatsState = {};
    cameras.forEach((camera) => {
      initialStates[camera.name] = false;
    });
    return initialStates;
  });

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

  const toggleAudio = (cameraName: string) => {
    setAudioStates((prev) => ({
      ...prev,
      [cameraName]: !prev[cameraName],
    }));
  };

  const onSaveMuting = useCallback(
    (playAudio: boolean) => {
      if (!cameraGroup || !allGroupsStreamingSettings) {
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

  const muteAll = () => {
    const updatedStates: AudioState = {};
    cameras.forEach((camera) => {
      updatedStates[camera.name] = false;
    });
    setAudioStates(updatedStates);
    onSaveMuting(false);
  };

  const unmuteAll = () => {
    const updatedStates: AudioState = {};
    cameras.forEach((camera) => {
      updatedStates[camera.name] = true;
    });
    setAudioStates(updatedStates);
    onSaveMuting(true);
  };

  return (
    <>
      <Toaster position="top-center" closeButton={true} />
      {!isGridLayoutLoaded ||
      !currentGridLayout ||
      !isEqual(cameras, currentCameras) ||
      includeBirdseye !== currentIncludeBirdseye ? (
        <div className="mt-2 grid grid-cols-2 gap-2 px-2 md:gap-4 xl:grid-cols-3 3xl:grid-cols-4">
          {includeBirdseye && birdseyeConfig?.enabled && (
            <Skeleton className="size-full rounded-lg md:rounded-2xl" />
          )}
          {cameras.map((camera) => {
            return (
              <Skeleton
                key={camera.name}
                className="aspect-video size-full rounded-lg md:rounded-2xl"
              />
            );
          })}
        </div>
      ) : (
        <div
          className="no-scrollbar my-2 select-none overflow-x-hidden px-2 pb-8"
          ref={gridContainerRef}
        >
          <EditGroupDialog
            open={editGroup}
            setOpen={setEditGroup}
            currentGroups={groups}
            activeGroup={group}
          />
          <ResponsiveGridLayout
            className="grid-layout"
            layouts={{
              lg: currentGridLayout,
              md: currentGridLayout,
              sm: currentGridLayout,
              xs: currentGridLayout,
              xxs: currentGridLayout,
            }}
            rowHeight={cellHeight}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
            margin={[marginValue, marginValue]}
            containerPadding={[0, isEditMode ? 6 : 3]}
            resizeHandles={isEditMode ? ["sw", "nw", "se", "ne"] : []}
            onDragStop={handleLayoutChange}
            onResize={handleResize}
            onResizeStart={() => setShowCircles(false)}
            onResizeStop={handleLayoutChange}
            isDraggable={isEditMode}
            isResizable={isEditMode}
          >
            {includeBirdseye && birdseyeConfig?.enabled && (
              <BirdseyeLivePlayerGridItem
                key="birdseye"
                className={cn(
                  isEditMode &&
                    showCircles &&
                    "outline outline-2 outline-muted-foreground hover:cursor-grab hover:outline-4 active:cursor-grabbing",
                )}
                birdseyeConfig={birdseyeConfig}
                liveMode={birdseyeConfig.restream ? "mse" : "jsmpeg"}
                onClick={() => onSelectCamera("birdseye")}
              >
                {isEditMode && showCircles && <CornerCircles />}
              </BirdseyeLivePlayerGridItem>
            )}
            {cameras.map((camera) => {
              let grow;
              const aspectRatio = camera.detect.width / camera.detect.height;
              if (aspectRatio > ASPECT_WIDE_LAYOUT) {
                grow = `aspect-wide w-full`;
              } else if (aspectRatio < ASPECT_VERTICAL_LAYOUT) {
                grow = `aspect-tall h-full`;
              } else {
                grow = "aspect-video";
              }
              const availableStreams = camera.live.streams || {};
              const firstStreamEntry = Object.values(availableStreams)[0] || "";

              const streamNameFromSettings =
                currentGroupStreamingSettings?.[camera.name]?.streamName || "";
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
                <GridLiveContextMenu
                  className={grow}
                  key={camera.name}
                  camera={camera.name}
                  streamName={streamName}
                  cameraGroup={cameraGroup}
                  preferredLiveMode={preferredLiveModes[camera.name] ?? "mse"}
                  isRestreamed={isRestreamedStates[camera.name]}
                  supportsAudio={
                    supportsAudioOutputStates[streamName]?.supportsAudio ??
                    false
                  }
                  audioState={audioStates[camera.name]}
                  toggleAudio={() => toggleAudio(camera.name)}
                  statsState={statsStates[camera.name]}
                  toggleStats={() => toggleStats(camera.name)}
                  volumeState={volumeStates[camera.name]}
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
                  streamMetadata={streamMetadata}
                >
                  <LivePlayer
                    key={camera.name}
                    streamName={streamName}
                    autoLive={autoLive ?? globalAutoLive}
                    showStillWithoutActivity={showStillWithoutActivity ?? true}
                    alwaysShowCameraName={displayCameraNames}
                    useWebGL={useWebGL}
                    cameraRef={cameraRef}
                    className={cn(
                      "rounded-lg bg-black md:rounded-2xl",
                      grow,
                      isEditMode &&
                        showCircles &&
                        "outline-2 outline-muted-foreground hover:cursor-grab hover:outline-4 active:cursor-grabbing",
                    )}
                    windowVisible={
                      windowVisible && visibleCameras.includes(camera.name)
                    }
                    cameraConfig={camera}
                    preferredLiveMode={preferredLiveModes[camera.name] ?? "mse"}
                    playInBackground={false}
                    showStats={statsStates[camera.name]}
                    onClick={() => {
                      !isEditMode && onSelectCamera(camera.name);
                    }}
                    onError={(e) => {
                      setPreferredLiveModes((prevModes) => {
                        const newModes = { ...prevModes };
                        if (e === "mse-decode") {
                          newModes[camera.name] = "webrtc";
                        } else {
                          newModes[camera.name] = "jsmpeg";
                        }
                        return newModes;
                      });
                    }}
                    onResetLiveMode={() => resetPreferredLiveMode(camera.name)}
                    playAudio={audioStates[camera.name]}
                    volume={volumeStates[camera.name]}
                  />
                  {isEditMode && showCircles && <CornerCircles />}
                </GridLiveContextMenu>
              );
            })}
          </ResponsiveGridLayout>
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
                    onClick={() =>
                      setIsEditMode((prevIsEditMode) => !prevIsEditMode)
                    }
                  >
                    {isEditMode ? (
                      <IoClose className="size-5 md:m-[6px]" />
                    ) : (
                      <LuLayoutDashboard className="size-5 md:m-[6px]" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isEditMode
                    ? t("editLayout.exitEdit")
                    : t("editLayout.label")}
                </TooltipContent>
              </Tooltip>
              {!isEditMode && (
                <>
                  {!fullscreen && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="cursor-pointer rounded-lg bg-secondary text-secondary-foreground opacity-60 transition-all duration-300 hover:bg-muted hover:opacity-100"
                          onClick={() =>
                            setEditGroup((prevEditGroup) => !prevEditGroup)
                          }
                        >
                          <LuPencil className="size-5 md:m-[6px]" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isEditMode
                          ? t("editLayout.exitEdit")
                          : t("editLayout.group.label")}
                      </TooltipContent>
                    </Tooltip>
                  )}
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
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function CornerCircles() {
  return (
    <>
      <div className="pointer-events-none absolute left-[-4px] top-[-4px] z-50 size-3 rounded-full bg-primary-variant p-2 text-background outline-2 outline-muted" />
      <div className="pointer-events-none absolute right-[-4px] top-[-4px] z-50 size-3 rounded-full bg-primary-variant p-2 text-background outline-2 outline-muted" />
      <div className="pointer-events-none absolute bottom-[-4px] right-[-4px] z-50 size-3 rounded-full bg-primary-variant p-2 text-background outline-2 outline-muted" />
      <div className="pointer-events-none absolute bottom-[-4px] left-[-4px] z-50 size-3 rounded-full bg-primary-variant p-2 text-background outline-2 outline-muted" />
    </>
  );
}

type BirdseyeLivePlayerGridItemProps = {
  style?: React.CSSProperties;
  className?: string;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  onMouseUp?: React.MouseEventHandler<HTMLDivElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
  birdseyeConfig: BirdseyeConfig;
  liveMode: LivePlayerMode;
  onClick: () => void;
};

const BirdseyeLivePlayerGridItem = React.forwardRef<
  HTMLDivElement,
  BirdseyeLivePlayerGridItemProps
>(
  (
    {
      style,
      className,
      onMouseDown,
      onMouseUp,
      onTouchEnd,
      children,
      birdseyeConfig,
      liveMode,
      onClick,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        style={{ ...style }}
        ref={ref}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
        {...props}
      >
        <BirdseyeLivePlayer
          className={className}
          birdseyeConfig={birdseyeConfig}
          liveMode={liveMode}
          onClick={onClick}
          containerRef={ref as React.RefObject<HTMLDivElement>}
        />
        {children}
      </div>
    );
  },
);

type GridLiveContextMenuProps = {
  className?: string;
  style?: React.CSSProperties;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  onMouseUp?: React.MouseEventHandler<HTMLDivElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
  camera: string;
  streamName: string;
  cameraGroup: string;
  preferredLiveMode: string;
  isRestreamed: boolean;
  supportsAudio: boolean;
  audioState: boolean;
  toggleAudio: () => void;
  statsState: boolean;
  toggleStats: () => void;
  volumeState?: number;
  setVolumeState: (volumeState: number) => void;
  muteAll: () => void;
  unmuteAll: () => void;
  resetPreferredLiveMode: () => void;
  config?: FrigateConfig;
  streamMetadata?: { [key: string]: LiveStreamMetadata };
};

const GridLiveContextMenu = React.forwardRef<
  HTMLDivElement,
  GridLiveContextMenuProps
>(
  (
    {
      className,
      style,
      onMouseDown,
      onMouseUp,
      onTouchEnd,
      children,
      camera,
      streamName,
      cameraGroup,
      preferredLiveMode,
      isRestreamed,
      supportsAudio,
      audioState,
      toggleAudio,
      statsState,
      toggleStats,
      volumeState,
      setVolumeState,
      muteAll,
      unmuteAll,
      resetPreferredLiveMode,
      config,
      streamMetadata,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        style={{ ...style }}
        ref={ref}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
        {...props}
      >
        <LiveContextMenu
          className={className}
          camera={camera}
          streamName={streamName}
          cameraGroup={cameraGroup}
          preferredLiveMode={preferredLiveMode}
          isRestreamed={isRestreamed}
          supportsAudio={supportsAudio}
          audioState={audioState}
          toggleAudio={toggleAudio}
          statsState={statsState}
          toggleStats={toggleStats}
          volumeState={volumeState}
          setVolumeState={setVolumeState}
          muteAll={muteAll}
          unmuteAll={unmuteAll}
          resetPreferredLiveMode={resetPreferredLiveMode}
          config={config}
          streamMetadata={streamMetadata}
        >
          {children}
        </LiveContextMenu>
      </div>
    );
  },
);
