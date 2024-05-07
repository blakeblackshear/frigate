import { usePersistence } from "@/hooks/use-persistence";
import {
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
import { Layout, Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { LivePlayerMode } from "@/types/live";
import { ASPECT_VERTICAL_LAYOUT, ASPECT_WIDE_LAYOUT } from "@/types/record";
import { Skeleton } from "@/components/ui/skeleton";
import { useResizeObserver } from "@/hooks/resize-observer";
import { isEqual } from "lodash";
import useSWR from "swr";
import { isSafari } from "react-device-detect";
import BirdseyeLivePlayer from "@/components/player/BirdseyeLivePlayer";
import LivePlayer from "@/components/player/LivePlayer";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IoClose } from "react-icons/io5";
import { LuMoveDiagonal2 } from "react-icons/lu";

type DraggableGridLayoutProps = {
  cameras: CameraConfig[];
  cameraGroup: string;
  cameraRef: (node: HTMLElement | null) => void;
  includeBirdseye: boolean;
  onSelectCamera: (camera: string) => void;
  windowVisible: boolean;
  visibleCameras: string[];
};
export default function DraggableGridLayout({
  cameras,
  cameraGroup,
  cameraRef,
  includeBirdseye,
  onSelectCamera,
  windowVisible,
  visibleCameras,
}: DraggableGridLayoutProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const birdseyeConfig = useMemo(() => config?.birdseye, [config]);

  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), []);

  const [gridLayout, setGridLayout, isGridLayoutLoaded] = usePersistence<
    Layout[]
  >(`${cameraGroup}-draggable-layout`);

  const [currentCameras, setCurrentCameras] = useState<CameraConfig[]>();
  const [currentIncludeBirdseye, setCurrentIncludeBirdseye] =
    useState<boolean>();
  const [currentGridLayout, setCurrentGridLayout] = useState<
    Layout[] | undefined
  >();

  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const handleLayoutChange = useCallback(
    (currentLayout: Layout[]) => {
      if (!isGridLayoutLoaded || !isEqual(gridLayout, currentGridLayout)) {
        return;
      }
      // save layout to idb
      setGridLayout(currentLayout);
    },
    [setGridLayout, isGridLayoutLoaded, gridLayout, currentGridLayout],
  );

  const generateLayout = useCallback(() => {
    if (!isGridLayoutLoaded) {
      return;
    }

    const cameraNames =
      includeBirdseye && birdseyeConfig?.enabled
        ? ["birdseye", ...cameras.map((camera) => camera?.name || "")]
        : cameras.map((camera) => camera?.name || "");

    const optionsMap: Layout[] = currentGridLayout
      ? currentGridLayout.filter((layout) => cameraNames?.includes(layout.i))
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
        isDraggable: isEditMode,
        isResizable: isEditMode,
      };

      optionsMap.push(options);
    });

    return optionsMap;
  }, [
    cameras,
    isEditMode,
    isGridLayoutLoaded,
    currentGridLayout,
    includeBirdseye,
    birdseyeConfig,
  ]);

  const toggleEditMode = useCallback(() => {
    if (currentGridLayout) {
      const updatedGridLayout = currentGridLayout.map((layout) => ({
        ...layout,
        isDraggable: !isEditMode,
        isResizable: !isEditMode,
      }));
      if (isEditMode) {
        setGridLayout(updatedGridLayout);
        setCurrentGridLayout(updatedGridLayout);
      } else {
        setGridLayout(updatedGridLayout);
      }
      setIsEditMode((prevIsEditMode) => !prevIsEditMode);
    }
  }, [currentGridLayout, isEditMode, setGridLayout]);

  useEffect(() => {
    if (isGridLayoutLoaded) {
      if (gridLayout) {
        // set current grid layout from loaded
        setCurrentGridLayout(gridLayout);
      } else {
        // idb is empty, set it with an initial layout
        setGridLayout(generateLayout());
      }
    }
  }, [
    isEditMode,
    gridLayout,
    currentGridLayout,
    setGridLayout,
    isGridLayoutLoaded,
    generateLayout,
  ]);

  useEffect(() => {
    if (
      !isEqual(cameras, currentCameras) ||
      includeBirdseye !== currentIncludeBirdseye
    ) {
      setCurrentCameras(cameras);
      setCurrentIncludeBirdseye(includeBirdseye);

      // set new grid layout in idb
      setGridLayout(generateLayout());
    }
  }, [
    cameras,
    includeBirdseye,
    currentCameras,
    currentIncludeBirdseye,
    setCurrentGridLayout,
    generateLayout,
    setGridLayout,
    isGridLayoutLoaded,
  ]);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [{ width: containerWidth }] = useResizeObserver(gridContainerRef);

  const cellHeight = useMemo(() => {
    const aspectRatio = 16 / 9;
    const totalMarginWidth = 11 * 13; // 11 margins with 13px each
    const rowHeight =
      ((containerWidth ?? window.innerWidth) - totalMarginWidth) /
      (13 * aspectRatio);
    return rowHeight;
  }, [containerWidth]);

  return (
    <>
      {!isGridLayoutLoaded || !currentGridLayout ? (
        <div className="mt-2 px-2 grid grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-2 md:gap-4">
          {includeBirdseye && birdseyeConfig?.enabled && (
            <Skeleton className="size-full rounded-2xl" />
          )}
          {cameras.map((camera) => {
            return (
              <Skeleton
                key={camera.name}
                className="aspect-video size-full rounded-2xl"
              />
            );
          })}
        </div>
      ) : (
        <div
          className="my-2 px-2 pb-8 no-scrollbar overflow-x-hidden"
          ref={gridContainerRef}
        >
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
            margin={[16, 16]}
            containerPadding={[8, 8]}
            resizeHandles={["sw", "nw", "se", "ne"]}
            onDragStop={handleLayoutChange}
            onResizeStop={handleLayoutChange}
          >
            {includeBirdseye && birdseyeConfig?.enabled && (
              <BirdseyeLivePlayerGridItem
                key="birdseye"
                className={`${isEditMode ? "outline outline-2 hover:outline-4 outline-muted-foreground hover:cursor-grab active:cursor-grabbing" : ""}`}
                birdseyeConfig={birdseyeConfig}
                liveMode={birdseyeConfig.restream ? "mse" : "jsmpeg"}
                onClick={() => onSelectCamera("birdseye")}
              >
                {isEditMode && (
                  <>
                    <div className="absolute top-[-6px] left-[-6px] z-50 size-3 p-2 rounded-full bg-primary-variant outline-2 outline-muted text-background pointer-events-none" />
                    <div className="absolute top-[-6px] right-[-6px] z-50 size-3 p-2 rounded-full bg-primary-variant outline-2 outline-muted text-background pointer-events-none" />
                    <div className="absolute bottom-[-6px] right-[-6px] z-50 size-3 p-2 rounded-full bg-primary-variant outline-2 outline-muted text-background pointer-events-none" />
                    <div className="absolute bottom-[-6px] left-[-6px] z-50 size-3 p-2 rounded-full bg-primary-variant outline-2 outline-muted text-background pointer-events-none" />
                  </>
                )}
              </BirdseyeLivePlayerGridItem>
            )}
            {cameras.map((camera) => {
              let grow;
              const aspectRatio = camera.detect.width / camera.detect.height;
              if (aspectRatio > ASPECT_WIDE_LAYOUT) {
                grow = `aspect-wide`;
              } else if (aspectRatio < ASPECT_VERTICAL_LAYOUT) {
                grow = `aspect-tall`;
              } else {
                grow = "aspect-video";
              }
              return (
                <LivePlayerGridItem
                  key={camera.name}
                  cameraRef={cameraRef}
                  className={`${grow} size-full rounded-lg md:rounded-2xl bg-black ${isEditMode ? "outline-2 hover:outline-4 outline-muted-foreground hover:cursor-grab active:cursor-grabbing" : ""}`}
                  windowVisible={
                    windowVisible && visibleCameras.includes(camera.name)
                  }
                  cameraConfig={camera}
                  preferredLiveMode={isSafari ? "webrtc" : "mse"}
                  onClick={() => {
                    !isEditMode && onSelectCamera(camera.name);
                  }}
                >
                  {isEditMode && (
                    <>
                      <div className="absolute top-[-6px] left-[-6px] z-50 size-3 p-2 rounded-full bg-primary-variant outline-2 outline-muted text-background pointer-events-none" />
                      <div className="absolute top-[-6px] right-[-6px] z-50 size-3 p-2 rounded-full bg-primary-variant outline-2 outline-muted text-background pointer-events-none" />
                      <div className="absolute bottom-[-6px] right-[-6px] z-50 size-3 p-2 rounded-full bg-primary-variant outline-2 outline-muted text-background pointer-events-none" />
                      <div className="absolute bottom-[-6px] left-[-6px] z-50 size-3 p-2 rounded-full bg-primary-variant outline-2 outline-muted text-background pointer-events-none" />
                    </>
                  )}
                </LivePlayerGridItem>
              );
            })}
          </ResponsiveGridLayout>
          <div className="flex flex-row gap-2 items-center text-primary">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  className="fixed bottom-12 lg:bottom-9 right-5 z-50 h-12 w-12 p-0 rounded-full opacity-30 hover:opacity-100 transition-all duration-300"
                  onClick={toggleEditMode}
                >
                  {isEditMode ? (
                    <IoClose className="size-5" />
                  ) : (
                    <LuMoveDiagonal2 className="size-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {isEditMode ? "Exit Editing" : "Edit Layout"}
              </TooltipContent>
            </Tooltip>
          </div>
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
        />
        {children}
      </div>
    );
  },
);

type LivePlayerGridItemProps = {
  style?: React.CSSProperties;
  className: string;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  onMouseUp?: React.MouseEventHandler<HTMLDivElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
  cameraRef: (node: HTMLElement | null) => void;
  windowVisible: boolean;
  cameraConfig: CameraConfig;
  preferredLiveMode: LivePlayerMode;
  onClick: () => void;
};

const LivePlayerGridItem = React.forwardRef<
  HTMLDivElement,
  LivePlayerGridItemProps
>(
  (
    {
      style,
      className,
      onMouseDown,
      onMouseUp,
      onTouchEnd,
      children,
      cameraRef,
      windowVisible,
      cameraConfig,
      preferredLiveMode,
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
        <LivePlayer
          cameraRef={cameraRef}
          className={className}
          windowVisible={windowVisible}
          cameraConfig={cameraConfig}
          preferredLiveMode={preferredLiveMode}
          onClick={onClick}
        />
        {children}
      </div>
    );
  },
);
