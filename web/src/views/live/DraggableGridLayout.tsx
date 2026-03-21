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
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Layout,
  LayoutItem,
  ResponsiveGridLayout as Responsive,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  AudioState,
  LivePlayerMode,
  LiveStreamMetadata,
  PlayerStatsType,
  StatsState,
  VolumeState,
} from "@/types/live";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { PlayerStats } from "@/components/player/PlayerStats";
import { MdCircle } from "react-icons/md";
import { useCameraActivity } from "@/hooks/use-camera-activity";
import { Skeleton } from "@/components/ui/skeleton";

import { isEqual } from "lodash";
import useSWR from "swr";
import { isDesktop, isMobile } from "react-device-detect";
import BirdseyeLivePlayer from "@/components/player/BirdseyeLivePlayer";
import LivePlayer from "@/components/player/LivePlayer";
import { IoClose, IoStatsChart } from "react-icons/io5";
import { LuLayoutDashboard, LuMaximize, LuPencil } from "react-icons/lu";
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
import {
  CAMERA_ZOOM_MIN_SCALE,
  CameraZoomRuntimeTransform,
  clampScale,
  fromPersistedCameraZoomState,
  getCursorRelativeZoomTransform,
  getNextScaleFromWheelDelta,
  loadPersistedCameraZoomState,
  savePersistedCameraZoomState,
  toPersistedCameraZoomState,
} from "@/utils/cameraZoom";

type DraggableGridLayoutProps = {
  cameras: CameraConfig[];
  cameraGroup: string;
  cameraRef: (node: HTMLElement | null) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
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

  const [gridLayout, setGridLayout, isGridLayoutLoaded] =
    useUserPersistence<Layout>(`${cameraGroup}-draggable-layout`);

  const [fitToScreen, setFitToScreen] = useUserPersistence(
    "liveFitToScreen",
    false,
  );

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
    Layout | undefined
  >();

  const handleLayoutChange = useCallback(
    (currentLayout: Layout) => {
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
    (baseLayout: Layout | undefined) => {
      if (!isGridLayoutLoaded) {
        return;
      }

      const cameraNames =
        includeBirdseye && birdseyeConfig?.enabled
          ? ["birdseye", ...cameras.map((camera) => camera?.name || "")]
          : cameras.map((camera) => camera?.name || "");

      const optionsMap: LayoutItem[] = baseLayout
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
          aspectRatio = 16 / 9;
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

  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const roRef = useRef<ResizeObserver | null>(null);

  // Callback ref fires whenever the element mounts/unmounts, so containerWidth
  // is always set immediately when the grid div first appears (after skeleton).
  const gridContainerRef = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    setContainerHeight(el.clientHeight);
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
      setContainerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    roRef.current = ro;
  }, []);

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

  const [viewportHeight, setViewportHeight] = useState(0);
  const viewportRoRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    viewportRoRef.current?.disconnect();
    viewportRoRef.current = null;
    const el = containerRef.current;
    if (!el) return;
    setViewportHeight(el.clientHeight);
    const ro = new ResizeObserver(([entry]) => {
      setViewportHeight(entry.contentRect.height);
    });
    ro.observe(el);
    viewportRoRef.current = ro;
    return () => ro.disconnect();
  }, [containerRef]);

  const totalCameras = useMemo(() => {
    let count = cameras.length;
    if (includeBirdseye && birdseyeConfig?.enabled) count += 1;
    return count;
  }, [cameras, includeBirdseye, birdseyeConfig]);

  const fitGridParams = useMemo(() => {
    if (!fitToScreen || !availableWidth || !viewportHeight || totalCameras === 0) {
      return null;
    }

    const aspectRatio = 16 / 9;
    let bestCols = 1;
    let bestScore = 0;

    for (let cols = 1; cols <= Math.min(totalCameras, 12); cols++) {
      const w = Math.floor(12 / cols);
      if (w < 1) continue;
      const rows = Math.ceil(totalCameras / cols);
      const camWidth = (w / 12) * availableWidth;
      const camHeight = camWidth / aspectRatio;
      const totalHeight = camHeight * rows;

      if (totalHeight <= viewportHeight) {
        const score = camWidth * camHeight;
        if (score > bestScore) {
          bestScore = score;
          bestCols = cols;
        }
      }
    }

    if (bestScore === 0) {
      let minOvershoot = Infinity;
      for (let cols = 1; cols <= Math.min(totalCameras, 12); cols++) {
        const w = Math.floor(12 / cols);
        if (w < 1) continue;
        const rows = Math.ceil(totalCameras / cols);
        const camWidth = (w / 12) * availableWidth;
        const camHeight = camWidth / aspectRatio;
        const totalHeight = camHeight * rows;
        if (totalHeight - viewportHeight < minOvershoot) {
          minOvershoot = totalHeight - viewportHeight;
          bestCols = cols;
        }
      }
    }

    const gridUnitsPerCam = Math.floor(12 / bestCols);
    const rows = Math.ceil(totalCameras / bestCols);
    const fittedCellH = viewportHeight / (rows * gridUnitsPerCam);

    return { gridUnitsPerCam, colsPerRow: bestCols, cellHeight: fittedCellH };
  }, [fitToScreen, availableWidth, viewportHeight, totalCameras]);

  const cellHeight = useMemo(() => {
    if (fitGridParams) {
      return fitGridParams.cellHeight;
    }
    const aspectRatio = 16 / 9;
    return availableWidth / 12 / aspectRatio;
  }, [availableWidth, fitGridParams]);

  const fitLayout = useMemo(() => {
    if (!fitToScreen || !fitGridParams) return null;

    const cameraNames =
      includeBirdseye && birdseyeConfig?.enabled
        ? ["birdseye", ...cameras.map((camera) => camera?.name || "")]
        : cameras.map((camera) => camera?.name || "");

    const w = fitGridParams.gridUnitsPerCam;
    const h = w;
    const colsPerRow = fitGridParams.colsPerRow;

    return cameraNames.map((name, index) => ({
      i: name,
      x: (index % colsPerRow) * w,
      y: Math.floor(index / colsPerRow) * h,
      w,
      h,
    }));
  }, [fitToScreen, fitGridParams, cameras, includeBirdseye, birdseyeConfig]);

  const [fitLayoutOverride, setFitLayoutOverride] = useState<Layout | undefined>();

  useEffect(() => {
    setFitLayoutOverride(undefined);
  }, [fitGridParams, cameras, includeBirdseye]);

  const handleFitDragStop = useCallback(
    (newLayout: Layout) => {
      if (!fitToScreen || !fitGridParams) return;
      const w = fitGridParams.gridUnitsPerCam;
      const normalized = newLayout.map((item) => ({
        ...item,
        w,
        h: w,
      }));
      setFitLayoutOverride(normalized);
    },
    [fitToScreen, fitGridParams],
  );

  const activeGridLayout = useMemo(() => {
    if (fitToScreen) {
      return fitLayoutOverride ?? fitLayout ?? currentGridLayout;
    }
    return currentGridLayout;
  }, [fitToScreen, fitLayoutOverride, fitLayout, currentGridLayout]);

  const handleResize = (
    _layout: Layout,
    oldLayoutItem: LayoutItem | null,
    layoutItem: LayoutItem | null,
    placeholder: LayoutItem | null,
  ) => {
    if (!oldLayoutItem || !layoutItem || !placeholder) return;

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
  const [globalStreamStatsEnabled, setGlobalStreamStatsEnabled] =
    useState(false);

  const getStreamStatsFromStorage = (): boolean => {
    const storedValue = localStorage.getItem("globalStreamStatsEnabled");
    return storedValue === "true";
  };

  const setStreamStatsToStorage = (value: boolean): void => {
    localStorage.setItem("globalStreamStatsEnabled", value.toString());
  };

  const toggleGlobalStreamStats = () => {
    setGlobalStreamStatsEnabled((prevState) => {
      const newState = !prevState;
      setStreamStatsToStorage(newState);
      return newState;
    });
  };

  const [audioStates, setAudioStates] = useState<AudioState>({});
  const [volumeStates, setVolumeStates] = useState<VolumeState>({});
  const [statsStates, setStatsStates] = useState<StatsState>({});
  const [cameraZoomStates, setCameraZoomStates] = useState<
    Record<string, CameraZoomRuntimeTransform>
  >({});
  const [cameraStatsData, setCameraStatsData] = useState<
    Record<string, PlayerStatsType>
  >({});
  const [cameraLoadingStates, setCameraLoadingStates] = useState<
    Record<string, boolean>
  >({});
  const cameraZoomViewportRefs = useRef<Record<string, HTMLDivElement | null>>(
    {},
  );
  const cameraZoomWheelCleanupRefs = useRef<Record<string, () => void>>({});

  const getCardZoomDimensions = useCallback((cameraName: string) => {
    const viewport = cameraZoomViewportRefs.current[cameraName];
    const content = viewport?.firstElementChild as HTMLElement | null;
    const viewportWidth = viewport?.clientWidth ?? 0;
    const viewportHeight = viewport?.clientHeight ?? 0;

    return {
      viewportWidth,
      viewportHeight,
      contentWidth: content?.clientWidth ?? viewportWidth,
      contentHeight: content?.clientHeight ?? viewportHeight,
    };
  }, []);

  const hydrateCameraZoomFromStorage = useCallback(
    (cameraName: string) => {
      setCameraZoomStates((prev) => {
        if (prev[cameraName]) {
          return prev;
        }

        const persisted = loadPersistedCameraZoomState(cameraName);
        if (!persisted) {
          return prev;
        }

        const dimensions = getCardZoomDimensions(cameraName);
        if (!dimensions.viewportWidth || !dimensions.viewportHeight) {
          return prev;
        }

        return {
          ...prev,
          [cameraName]: fromPersistedCameraZoomState(persisted, dimensions),
        };
      });
    },
    [getCardZoomDimensions],
  );

  const getDefaultZoomTransform = useCallback(
    (): CameraZoomRuntimeTransform => ({
      scale: CAMERA_ZOOM_MIN_SCALE,
      positionX: 0,
      positionY: 0,
    }),
    [],
  );

  const handleCardWheelZoom = useCallback(
    (
      cameraName: string,
      event: WheelEvent,
      viewportElement: HTMLDivElement,
    ) => {
      if (!event.shiftKey) {
        return;
      }

      event.preventDefault();

      const bounds = viewportElement.getBoundingClientRect();
      const cursorX = event.clientX - bounds.left;
      const cursorY = event.clientY - bounds.top;

      setCameraZoomStates((prev) => {
        const current = prev[cameraName] ?? getDefaultZoomTransform();
        const nextScale = clampScale(
          getNextScaleFromWheelDelta(current.scale, event.deltaY),
        );
        const next = getCursorRelativeZoomTransform(
          current,
          nextScale,
          cursorX,
          cursorY,
        );
        const content = viewportElement.firstElementChild as HTMLElement | null;
        const persisted = toPersistedCameraZoomState(next, {
          viewportWidth: bounds.width,
          viewportHeight: bounds.height,
          contentWidth: content?.clientWidth ?? bounds.width,
          contentHeight: content?.clientHeight ?? bounds.height,
        });

        savePersistedCameraZoomState(cameraName, persisted);

        return {
          ...prev,
          [cameraName]: next,
        };
      });
    },
    [getDefaultZoomTransform],
  );

  const detachCardZoomWheelListener = useCallback((cameraName: string) => {
    cameraZoomWheelCleanupRefs.current[cameraName]?.();
    delete cameraZoomWheelCleanupRefs.current[cameraName];
  }, []);

  const attachCardZoomWheelListener = useCallback(
    (cameraName: string, viewportElement: HTMLDivElement) => {
      detachCardZoomWheelListener(cameraName);

      const listener = (event: WheelEvent) => {
        handleCardWheelZoom(cameraName, event, viewportElement);
      };

      viewportElement.addEventListener("wheel", listener, { passive: false });

      cameraZoomWheelCleanupRefs.current[cameraName] = () => {
        viewportElement.removeEventListener("wheel", listener);
      };
    },
    [detachCardZoomWheelListener, handleCardWheelZoom],
  );

  useEffect(() => {
    return () => {
      Object.values(cameraZoomWheelCleanupRefs.current).forEach((cleanup) =>
        cleanup(),
      );
      cameraZoomWheelCleanupRefs.current = {};
    };
  }, []);

  useEffect(() => {
    cameras.forEach((camera) => {
      hydrateCameraZoomFromStorage(camera.name);
    });
  }, [cameras, hydrateCameraZoomFromStorage]);

  useEffect(() => {
    const initialStreamStatsState = getStreamStatsFromStorage();
    setGlobalStreamStatsEnabled(initialStreamStatsState);
  }, []);

  useEffect(() => {
    const updatedStatsState: StatsState = {};

    cameras.forEach((camera) => {
      updatedStatsState[camera.name] = globalStreamStatsEnabled;
    });

    setStatsStates(updatedStatsState);
  }, [globalStreamStatsEnabled, cameras]);

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
          className="no-scrollbar select-none overflow-x-hidden"
          ref={gridContainerRef}
        >
          <EditGroupDialog
            open={editGroup}
            setOpen={setEditGroup}
            currentGroups={groups}
            activeGroup={group}
          />
          {containerWidth > 0 && <Responsive
            className="grid-layout"
            width={availableWidth}
            layouts={{
              lg: activeGridLayout,
              md: activeGridLayout,
              sm: activeGridLayout,
              xs: activeGridLayout,
              xxs: activeGridLayout,
            }}
            rowHeight={cellHeight}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
            margin={[0, 0]}
            containerPadding={[0, 0]}
            resizeConfig={{
              enabled: isEditMode && !fitToScreen,
              handles: isEditMode && !fitToScreen ? ["sw", "nw", "se", "ne"] : [],
            }}
            dragConfig={{
              enabled: isEditMode,
            }}
            onDragStop={fitToScreen ? handleFitDragStop : handleLayoutChange}
            onResize={handleResize}
            onResizeStart={() => setShowCircles(false)}
            onResizeStop={handleLayoutChange}
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
              const cameraZoomTransform =
                cameraZoomStates[camera.name] ?? getDefaultZoomTransform();

              return (
                <GridLiveContextMenu
                  className="size-full"
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
                  statsState={statsStates[camera.name] ?? true}
                  toggleStats={() => toggleStats(camera.name)}
                  volumeState={volumeStates[camera.name]}
                  setVolumeState={(value) =>
                    setVolumeStates((prev) => ({
                      ...prev,
                      [camera.name]: value,
                    }))
                  }
                  muteAll={muteAll}
                  unmuteAll={unmuteAll}
                  resetPreferredLiveMode={() =>
                    resetPreferredLiveMode(camera.name)
                  }
                  config={config}
                  streamMetadata={streamMetadata}
                >
                  <div
                    className="relative size-full overflow-hidden"
                    ref={(node) => {
                      cameraZoomViewportRefs.current[camera.name] = node;

                      if (!node) {
                        detachCardZoomWheelListener(camera.name);
                        return;
                      }

                      attachCardZoomWheelListener(camera.name, node);

                      hydrateCameraZoomFromStorage(camera.name);
                    }}
                  >
                    <div
                      className="size-full"
                      style={{
                        transform: `translate3d(${cameraZoomTransform.positionX}px, ${cameraZoomTransform.positionY}px, 0) scale(${cameraZoomTransform.scale})`,
                        transformOrigin: "top left",
                      }}
                    >
                      <LivePlayer
                        key={camera.name}
                        streamName={streamName}
                        autoLive={autoLive ?? globalAutoLive}
                        showStillWithoutActivity={
                          showStillWithoutActivity ?? true
                        }
                        alwaysShowCameraName={displayCameraNames}
                        useWebGL={useWebGL}
                        cameraRef={cameraRef}
                        className={cn(
                          "draggable-live-grid-mse-cover size-full bg-black",
                          camera.ui?.rotate &&
                            "draggable-live-grid-rotated [--frigate-mse-grid-rotated:1] [--frigate-mse-grid-rotation:rotate(90deg)]",
                          isEditMode &&
                            showCircles &&
                            "outline-2 outline-muted-foreground hover:cursor-grab hover:outline-4 active:cursor-grabbing",
                        )}
                        windowVisible={
                          windowVisible && visibleCameras.includes(camera.name)
                        }
                        cameraConfig={camera}
                        preferredLiveMode={
                          preferredLiveModes[camera.name] ?? "mse"
                        }
                        playInBackground={false}
                        showStats={false}
                        onStatsUpdate={(stats) =>
                          setCameraStatsData((prev) => ({
                            ...prev,
                            [camera.name]: stats,
                          }))
                        }
                        onLoadingChange={(loading) =>
                          setCameraLoadingStates((prev) => ({
                            ...prev,
                            [camera.name]: loading,
                          }))
                        }
                        showMotionDot={false}
                        onClick={() => {
                          !isEditMode && onSelectCamera(camera.name);
                        }}
                        onError={(e) => {
                          setPreferredLiveModes((prevModes) => {
                            const newModes = { ...prevModes };
                            if (e === "mse-decode") {
                              delete newModes[camera.name];
                            }
                            return newModes;
                          });
                        }}
                        onResetLiveMode={() =>
                          resetPreferredLiveMode(camera.name)
                        }
                        playAudio={audioStates[camera.name]}
                        volume={volumeStates[camera.name]}
                      />
                    </div>
                    {cameraLoadingStates[camera.name] && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ActivityIndicator />
                      </div>
                    )}
                    {statsStates[camera.name] &&
                      cameraStatsData[camera.name] && (
                        <PlayerStats
                          stats={cameraStatsData[camera.name]}
                          minimal={true}
                        />
                      )}
                    <CameraMotionDot
                      camera={camera}
                      autoLive={autoLive ?? globalAutoLive}
                    />
                  </div>
                  {isEditMode && showCircles && <CornerCircles />}
                </GridLiveContextMenu>
              );
            })}
          </Responsive>}
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
                    onClick={toggleGlobalStreamStats}
                  >
                    <IoStatsChart className="size-5 md:m-[6px]" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {globalStreamStatsEnabled
                    ? t("streamStats.disable")
                    : t("streamStats.enable")}
                </TooltipContent>
              </Tooltip>
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
                        className={cn(
                          "cursor-pointer rounded-lg bg-secondary text-secondary-foreground transition-all duration-300 hover:bg-muted hover:opacity-100",
                          fitToScreen ? "opacity-100" : "opacity-60",
                        )}
                        onClick={() => setFitToScreen(!fitToScreen)}
                      >
                        <LuMaximize className="size-5 md:m-[6px]" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {fitToScreen
                        ? t("fitToScreen.disable")
                        : t("fitToScreen.enable")}
                    </TooltipContent>
                  </Tooltip>
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

// Separate component so it can call useCameraActivity as a hook (no hooks in loops).
// Direct WS subscription guarantees the dot reacts to motion changes in real-time
// without relying on an intermediate callback → parent-state chain.
function CameraMotionDot({
  camera,
  autoLive,
}: {
  camera: CameraConfig;
  autoLive?: boolean;
}) {
  const { activeMotion, offline } = useCameraActivity(camera);
  if (autoLive === false || offline || !activeMotion) return null;
  return (
    <div className="absolute right-2 top-2 z-40">
      <MdCircle className="mr-2 size-2 animate-pulse text-danger shadow-danger drop-shadow-md" />
    </div>
  );
}

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
