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
import { useResizeObserver } from "@/hooks/resize-observer";
import {
  Layout,
  LayoutItem,
  ResponsiveGridLayout as Responsive,
} from "react-grid-layout";
import { aspectRatio, getCompactor } from "react-grid-layout/core";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  AudioState,
  LivePlayerError,
  LivePlayerMode,
  LiveStreamMetadata,
  StatsState,
  VolumeState,
} from "@/types/live";
import { ASPECT_WIDE_LAYOUT } from "@/types/record";
import { Skeleton } from "@/components/ui/skeleton";
import { isEqual } from "lodash";
import useSWR from "swr";
import { isDesktop, isMobile, isMobileOnly } from "react-device-detect";
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

// rowHeight is 1/VERTICAL_RESOLUTION of a column, so h = round(w *
// VERTICAL_RESOLUTION / aspect) lands a tile on its camera's aspect. GRID_COLS
// also sets resize granularity: the aspect constraint derives height from
// width, making one column the smallest step in both axes.
const GRID_COLS = 96;
const TILE_BASE_W = 32;
const TILE_WIDE_W = 64;
const VERTICAL_RESOLUTION = 4;
const DEFAULT_ASPECT = 16 / 9;
// Bucketed tile shapes, matching the aspect-wide / aspect-tall Tailwind utilities.
const TILE_ASPECT_WIDE = 32 / 9;
const TILE_ASPECT_TALL = 8 / 9;

// Cells quantize to whole rows/columns, so the card takes the camera's exact
// ratio and fits itself inside its cell. --ar and container-type live on the
// cell; min() picks whichever axis binds first.
const CARD_FIT =
  "h-auto w-[min(100%,calc(100cqh*var(--ar)))] aspect-[var(--ar)]";

// Stored coordinates are grid units, so bump this whenever GRID_COLS or
// VERTICAL_RESOLUTION changes in a released version.
const LAYOUT_VERSION = 2;
type PersistedLayout = {
  version: number;
  naturalAspect: boolean;
  layout: Layout;
};

// Without preventCollision, RGL shoves collided tiles down the page and never
// compacts them back.
const FREE_PLACEMENT_COMPACTOR = getCompactor(null, false, true);

// 0.17/0.18 stored a bare array on a 12-column grid whose standard tile was
// 4x4. Bucketed mode reproduces that geometry, so those layouts convert exactly.
const LEGACY_GRID_COLS = 12;
const LEGACY_TILE_ROWS = 4;

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
  handleError: (cameraName: string, error: LivePlayerError) => void;
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
  handleError,
  resetPreferredLiveMode,
  isRestreamedStates,
  supportsAudioOutputStates,
  streamMetadata,
}: DraggableGridLayoutProps) {
  const { t } = useTranslation(["views/live"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const birdseyeConfig = useMemo(() => config?.birdseye, [config]);

  const aspectRatios = useMemo(() => {
    const map: { [key: string]: number } = {};
    if (birdseyeConfig) {
      map["birdseye"] =
        (birdseyeConfig.width || 1) / (birdseyeConfig.height || 1);
    }
    cameras.forEach((camera) => {
      map[camera.name] =
        camera.detect.width / camera.detect.height || DEFAULT_ASPECT;
    });
    return map;
  }, [cameras, birdseyeConfig]);

  const [naturalAspectSetting, , isNaturalAspectLoaded] = useUserPersistence(
    "naturalAspectLayout",
    false,
  );
  // phones never reach this grid, and the setting is hidden there, so an
  // imported or stale value must not take effect
  const naturalAspectLayout = !isMobileOnly && (naturalAspectSetting ?? false);

  // Bucketed mode snaps every camera to one of three tile shapes, matching the
  // pre-masonry layout; the picture letterboxes inside its bucket.
  const layoutAspects = useMemo(() => {
    if (naturalAspectLayout) {
      return aspectRatios;
    }
    const map: { [key: string]: number } = {};
    Object.entries(aspectRatios).forEach(([name, ratio]) => {
      map[name] =
        ratio > ASPECT_WIDE_LAYOUT
          ? TILE_ASPECT_WIDE
          : ratio < 1
            ? TILE_ASPECT_TALL
            : DEFAULT_ASPECT;
    });
    return map;
  }, [aspectRatios, naturalAspectLayout]);

  // A live stream can be shaped differently than detect, so the card follows
  // whatever is on screen and falls back to detect. Cells stay detect-sized, so
  // only the card resizes.
  const [liveAspects, setLiveAspects] = useState<{
    [key: string]: number | undefined;
  }>({});

  const liveAspectHandlers = useMemo(() => {
    const map: { [key: string]: (aspectRatio: number | undefined) => void } =
      {};
    cameras.forEach((camera) => {
      map[camera.name] = (aspectRatio) =>
        setLiveAspects((prev) =>
          prev[camera.name] === aspectRatio
            ? prev
            : { ...prev, [camera.name]: aspectRatio },
        );
    });
    return map;
  }, [cameras]);

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
    useUserPersistence<PersistedLayout>(`${cameraGroup}-draggable-layout`);

  const readPersistedLayout = useCallback(
    (stored: PersistedLayout | undefined): Layout | undefined => {
      if (
        !stored ||
        stored.version !== LAYOUT_VERSION ||
        !Array.isArray(stored.layout)
      ) {
        return undefined;
      }
      return stored.layout;
    },
    [],
  );

  // Strips per-item `constraints`, which are functions.
  const toPersisted = useCallback(
    (layout: Layout): PersistedLayout => ({
      version: LAYOUT_VERSION,
      naturalAspect: naturalAspectLayout,
      layout: layout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })),
    }),
    [naturalAspectLayout],
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
    // Keeps the camera-change effect from overwriting the layout we load next.
    setCurrentCameras(undefined);
    setCurrentIncludeBirdseye(undefined);
    setCurrentGridLayout(undefined);
    setCurrentNaturalAspect(undefined);
  }, [cameraGroup, setIsEditMode]);

  // camera state

  const [currentCameras, setCurrentCameras] = useState<CameraConfig[]>();
  const [currentIncludeBirdseye, setCurrentIncludeBirdseye] =
    useState<boolean>();
  const [currentGridLayout, setCurrentGridLayout] = useState<
    Layout | undefined
  >();
  const [currentNaturalAspect, setCurrentNaturalAspect] = useState<boolean>();

  const handleLayoutChange = useCallback(
    (currentLayout: Layout) => {
      if (
        !isGridLayoutLoaded ||
        !isEqual(readPersistedLayout(gridLayout), currentGridLayout)
      ) {
        return;
      }
      setGridLayout(toPersisted(currentLayout));
      setShowCircles(true);
    },
    [
      setGridLayout,
      isGridLayoutLoaded,
      gridLayout,
      currentGridLayout,
      readPersistedLayout,
      toPersisted,
    ],
  );

  const dimsFor = useCallback(
    (name: string) => {
      const ratio = layoutAspects[name] ?? DEFAULT_ASPECT;
      const w = ratio >= ASPECT_WIDE_LAYOUT ? TILE_WIDE_W : TILE_BASE_W;
      const h = Math.max(1, Math.round((w * VERTICAL_RESOLUTION) / ratio));
      return { w, h };
    },
    [layoutAspects],
  );

  // Rescale a pre-masonry layout onto the current grid. Both axes scale by a
  // constant, so tiles the user resized keep their size and their arrangement
  // stays intact. Only meaningful in bucketed mode, where a tile still has the
  // shape those coordinates assumed.
  const convertLegacyLayout = useCallback(
    (stored: unknown): Layout | undefined => {
      if (naturalAspectLayout || !Array.isArray(stored) || !stored.length) {
        return undefined;
      }

      const xScale = GRID_COLS / LEGACY_GRID_COLS;
      const yScale =
        Math.round((TILE_BASE_W * VERTICAL_RESOLUTION) / DEFAULT_ASPECT) /
        LEGACY_TILE_ROWS;
      const converted: LayoutItem[] = [];

      for (const item of stored) {
        if (
          !item ||
          typeof item.i !== "string" ||
          typeof item.x !== "number" ||
          typeof item.y !== "number" ||
          typeof item.w !== "number" ||
          typeof item.h !== "number"
        ) {
          return undefined;
        }

        const w = Math.min(Math.max(1, Math.round(item.w * xScale)), GRID_COLS);
        converted.push({
          i: item.i,
          x: Math.min(Math.max(0, Math.round(item.x * xScale)), GRID_COLS - w),
          y: Math.max(0, Math.round(item.y * yScale)),
          w,
          h: Math.max(1, Math.round(item.h * yScale)),
        });
      }

      return converted;
    },
    [naturalAspectLayout],
  );

  const generateLayout = useCallback(
    (baseLayout: Layout | undefined): Layout | undefined => {
      if (!isGridLayoutLoaded) {
        return;
      }

      const cameraNames =
        includeBirdseye && birdseyeConfig?.enabled
          ? ["birdseye", ...cameras.map((camera) => camera?.name || "")]
          : cameras.map((camera) => camera?.name || "");

      const existing: LayoutItem[] = baseLayout
        ? baseLayout.filter((layout) => cameraNames.includes(layout.i))
        : [];
      const placed = new Set(existing.map((layout) => layout.i));

      const tileColumns = GRID_COLS / TILE_BASE_W; // 3 standard columns
      // Start below existing items so new cameras never overlap the user's.
      const maxBottom = existing.reduce(
        (max, layout) => Math.max(max, layout.y + layout.h),
        0,
      );
      const colBottoms = new Array(tileColumns).fill(maxBottom);

      const result: LayoutItem[] = [...existing];

      cameraNames.forEach((name) => {
        if (placed.has(name)) {
          return;
        }
        const { w, h } = dimsFor(name);

        if (w === TILE_BASE_W) {
          let col = 0;
          for (let c = 1; c < tileColumns; c++) {
            if (colBottoms[c] < colBottoms[col]) {
              col = c;
            }
          }
          result.push({
            i: name,
            x: col * TILE_BASE_W,
            y: colBottoms[col],
            w,
            h,
          });
          colBottoms[col] += h;
        } else {
          let pair = 0;
          for (let c = 1; c + 1 < tileColumns; c++) {
            if (
              Math.max(colBottoms[c], colBottoms[c + 1]) <
              Math.max(colBottoms[pair], colBottoms[pair + 1])
            ) {
              pair = c;
            }
          }
          const y = Math.max(colBottoms[pair], colBottoms[pair + 1]);
          result.push({ i: name, x: pair * TILE_BASE_W, y, w, h });
          colBottoms[pair] = y + h;
          colBottoms[pair + 1] = y + h;
        }
      });

      return result;
    },
    [cameras, isGridLayoutLoaded, includeBirdseye, birdseyeConfig, dimsFor],
  );

  useEffect(() => {
    if (!isGridLayoutLoaded) {
      return;
    }

    const saved = readPersistedLayout(gridLayout);
    const converted = saved ? undefined : convertLegacyLayout(gridLayout);
    const base = saved ?? converted;

    if (base) {
      const updatedLayout = generateLayout(base) ?? base;
      setCurrentGridLayout(updatedLayout);
      if (converted || !isEqual(updatedLayout, base)) {
        setGridLayout(toPersisted(updatedLayout));
      }
      setCurrentCameras(cameras);
      setCurrentIncludeBirdseye(includeBirdseye);
      setCurrentNaturalAspect(
        converted ? naturalAspectLayout : gridLayout?.naturalAspect,
      );
    } else {
      // empty or incompatible (pre-masonry) data
      const newLayout = generateLayout(undefined) ?? [];
      setCurrentGridLayout(newLayout);
      setGridLayout(toPersisted(newLayout));
      setCurrentCameras(cameras);
      setCurrentIncludeBirdseye(includeBirdseye);
      setCurrentNaturalAspect(naturalAspectLayout);
    }
  }, [
    gridLayout,
    setGridLayout,
    isGridLayoutLoaded,
    generateLayout,
    cameras,
    includeBirdseye,
    naturalAspectLayout,
    readPersistedLayout,
    convertLegacyLayout,
    toPersisted,
  ]);

  useEffect(() => {
    // Only for camera changes within a loaded group; undefined currentCameras
    // means the load effect above has not run yet.
    if (!isGridLayoutLoaded || currentCameras === undefined) {
      return;
    }

    if (
      !isEqual(cameras, currentCameras) ||
      includeBirdseye !== currentIncludeBirdseye
    ) {
      setCurrentCameras(cameras);
      setCurrentIncludeBirdseye(includeBirdseye);

      const updatedLayout =
        generateLayout(currentGridLayout) ?? currentGridLayout ?? [];
      setCurrentGridLayout(updatedLayout);
      setGridLayout(toPersisted(updatedLayout));
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
    toPersisted,
  ]);

  useEffect(() => {
    if (
      !isNaturalAspectLoaded ||
      currentNaturalAspect === undefined ||
      currentNaturalAspect === naturalAspectLayout
    ) {
      return;
    }

    setCurrentNaturalAspect(naturalAspectLayout);
    const regenerated = generateLayout(undefined) ?? [];
    setCurrentGridLayout(regenerated);
    setGridLayout(toPersisted(regenerated));
  }, [
    naturalAspectLayout,
    isNaturalAspectLoaded,
    currentNaturalAspect,
    generateLayout,
    setGridLayout,
    toPersisted,
  ]);

  const gridContainerRef = useRef<HTMLDivElement | null>(null);

  // Commit-time measure: paints the first frame at the real width (no
  // innerWidth flash), and the setState re-render is what lets
  // useResizeObserver see a node mounted after the skeleton swap.
  const [mountWidth, setMountWidth] = useState<number | null>(null);

  const attachGridContainer = useCallback((node: HTMLDivElement | null) => {
    gridContainerRef.current = node;
    setMountWidth(node ? node.getBoundingClientRect().width : null);
  }, []);

  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(gridContainerRef);

  const availableWidth = containerWidth || mountWidth || 0;

  const hasScrollbar = useMemo(() => {
    if (containerHeight && containerRef.current) {
      return (
        containerRef.current.offsetHeight < containerRef.current.scrollHeight
      );
    }
  }, [containerRef, containerHeight]);

  const cellHeight = useMemo(() => {
    const width = availableWidth || window.innerWidth;
    const columnWidth = width / GRID_COLS;
    return columnWidth / VERTICAL_RESOLUTION;
  }, [availableWidth]);

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

  // RGL's per-item constraint derives height from width, holding each tile at
  // its camera's aspect while resizing. Constraints are functions, so they live
  // only on this render copy; toPersisted strips them.
  const layoutWithConstraints = useMemo(() => {
    if (!currentGridLayout) {
      return [] as Layout;
    }
    return currentGridLayout.map((item) => ({
      ...item,
      constraints: [aspectRatio(layoutAspects[item.i] ?? DEFAULT_ASPECT)],
    }));
  }, [currentGridLayout, layoutAspects]);

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
          className="no-scrollbar my-2 select-none overflow-x-hidden pb-8"
          ref={attachGridContainer}
        >
          <EditGroupDialog
            open={editGroup}
            setOpen={setEditGroup}
            currentGroups={groups}
            activeGroup={group}
          />
          <Responsive
            className="grid-layout"
            width={availableWidth || window.innerWidth}
            layouts={{
              lg: layoutWithConstraints,
              md: layoutWithConstraints,
              sm: layoutWithConstraints,
              xs: layoutWithConstraints,
              xxs: layoutWithConstraints,
            }}
            rowHeight={cellHeight}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{
              lg: GRID_COLS,
              md: GRID_COLS,
              sm: GRID_COLS,
              xs: GRID_COLS,
              xxs: GRID_COLS,
            }}
            margin={[0, 0]}
            compactor={FREE_PLACEMENT_COMPACTOR}
            containerPadding={[0, isEditMode ? 6 : 3]}
            resizeConfig={{
              enabled: isEditMode,
              // se only: top/left handles fight the aspect constraint at a grid
              // boundary (RGL re-clamps the opposite edge) and distort the tile.
              handles: isEditMode ? ["se"] : [],
            }}
            dragConfig={{
              enabled: isEditMode,
            }}
            onDragStop={handleLayoutChange}
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
                aspectRatio={layoutAspects["birdseye"] ?? DEFAULT_ASPECT}
                liveMode={birdseyeConfig.restream ? "mse" : "jsmpeg"}
                onClick={() => onSelectCamera("birdseye")}
              ></BirdseyeLivePlayerGridItem>
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
              return (
                <GridLiveContextMenu
                  className={CARD_FIT}
                  aspectRatio={
                    (naturalAspectLayout
                      ? liveAspects[camera.name]
                      : undefined) ??
                    layoutAspects[camera.name] ??
                    DEFAULT_ASPECT
                  }
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
                  <LivePlayer
                    key={camera.name}
                    streamName={streamName}
                    autoLive={autoLive ?? globalAutoLive}
                    showStillWithoutActivity={showStillWithoutActivity ?? true}
                    alwaysShowCameraName={displayCameraNames}
                    useWebGL={useWebGL}
                    cameraRef={cameraRef}
                    className={cn(
                      "size-full",
                      naturalAspectLayout ? "bg-background" : "bg-black",
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
                      if (!isEditMode) {
                        onSelectCamera(camera.name);
                      }
                    }}
                    onError={(e) => handleError(camera.name, e)}
                    onResetLiveMode={() => resetPreferredLiveMode(camera.name)}
                    playAudio={audioStates[camera.name]}
                    volume={volumeStates[camera.name]}
                    onLiveAspectChange={liveAspectHandlers[camera.name]}
                  />
                </GridLiveContextMenu>
              );
            })}
          </Responsive>
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
                    data-testid="toggle-edit-layout"
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

type BirdseyeLivePlayerGridItemProps = {
  style?: React.CSSProperties;
  className?: string;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  onMouseUp?: React.MouseEventHandler<HTMLDivElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
  birdseyeConfig: BirdseyeConfig;
  aspectRatio: number;
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
      aspectRatio: cellAspect,
      liveMode,
      onClick,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        className="flex items-center justify-center p-1 [container-type:size]"
        style={{ ...style, "--ar": cellAspect } as React.CSSProperties}
        ref={ref}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
        {...props}
      >
        <BirdseyeLivePlayer
          className={cn(CARD_FIT, className)}
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
  aspectRatio?: number;
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
      aspectRatio: cameraAspect,
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
        className="flex items-center justify-center p-1 [container-type:size]"
        style={{ ...style, "--ar": cameraAspect } as React.CSSProperties}
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
