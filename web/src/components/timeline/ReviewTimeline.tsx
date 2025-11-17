import useDraggableElement from "@/hooks/use-draggable-element";
import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import { cn } from "@/lib/utils";
import { DraggableElement } from "@/types/draggable-element";
import { TimelineZoomDirection, ZoomLevel } from "@/types/review";
import {
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isIOS, isMobile } from "react-device-detect";
import { Button } from "../ui/button";
import { LuZoomIn, LuZoomOut } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";

export type ReviewTimelineProps = {
  timelineRef: RefObject<HTMLDivElement>;
  contentRef: RefObject<HTMLDivElement>;
  segmentDuration: number;
  timelineDuration: number;
  timelineStartAligned: number;
  showHandlebar: boolean;
  showExportHandles: boolean;
  handlebarTime?: number;
  setHandlebarTime?: React.Dispatch<React.SetStateAction<number>>;
  onHandlebarDraggingChange?: (isDragging: boolean) => void;
  onlyInitialHandlebarScroll?: boolean;
  exportStartTime?: number;
  exportEndTime?: number;
  setExportStartTime?: React.Dispatch<React.SetStateAction<number>>;
  setExportEndTime?: React.Dispatch<React.SetStateAction<number>>;
  timelineCollapsed?: boolean;
  dense: boolean;
  segments: number[];
  scrollToSegment: (segmentTime: number, ifNeeded?: boolean) => void;
  isZooming: boolean;
  zoomDirection: TimelineZoomDirection;
  getRecordingAvailability?: (time: number) => boolean | undefined;
  onZoomChange?: (newZoomLevel: number) => void;
  possibleZoomLevels?: ZoomLevel[];
  currentZoomLevel?: number;
  children: ReactNode;
};

export function ReviewTimeline({
  timelineRef,
  contentRef,
  segmentDuration,
  timelineDuration,
  timelineStartAligned,
  showHandlebar = false,
  showExportHandles = false,
  handlebarTime,
  setHandlebarTime,
  onHandlebarDraggingChange,
  onlyInitialHandlebarScroll = false,
  exportStartTime,
  setExportStartTime,
  exportEndTime,
  setExportEndTime,
  timelineCollapsed = false,
  dense,
  segments,
  scrollToSegment,
  isZooming,
  zoomDirection,
  getRecordingAvailability,
  onZoomChange,
  possibleZoomLevels,
  currentZoomLevel,
  children,
}: ReviewTimelineProps) {
  const { t } = useTranslation("views/events");
  const [isDraggingHandlebar, setIsDraggingHandlebar] = useState(false);
  const [isDraggingExportStart, setIsDraggingExportStart] = useState(false);
  const [isDraggingExportEnd, setIsDraggingExportEnd] = useState(false);
  const [exportStartPosition, setExportStartPosition] = useState(0);
  const [exportEndPosition, setExportEndPosition] = useState(0);
  const segmentsRef = useRef<HTMLDivElement>(null);
  const handlebarRef = useRef<HTMLDivElement>(null);
  const handlebarTimeRef = useRef<HTMLDivElement>(null);
  const exportStartRef = useRef<HTMLDivElement>(null);
  const exportStartTimeRef = useRef<HTMLDivElement>(null);
  const exportEndRef = useRef<HTMLDivElement>(null);
  const exportEndTimeRef = useRef<HTMLDivElement>(null);

  // Use provided zoom levels or fallback to empty array
  const zoomLevels = possibleZoomLevels ?? [];

  const currentZoomLevelIndex =
    currentZoomLevel ??
    zoomLevels.findIndex((level) => level.segmentDuration === segmentDuration);

  const isDragging = useMemo(
    () => isDraggingHandlebar || isDraggingExportStart || isDraggingExportEnd,
    [isDraggingHandlebar, isDraggingExportStart, isDraggingExportEnd],
  );
  const exportSectionRef = useRef<HTMLDivElement>(null);

  const [draggableElementType, setDraggableElementType] =
    useState<DraggableElement>();

  const { alignStartDateToTimeline, alignEndDateToTimeline, segmentHeight } =
    useTimelineUtils({
      segmentDuration,
      timelineDuration,
      timelineRef,
    });

  const paddedExportStartTime = useMemo(() => {
    if (exportStartTime) {
      return alignStartDateToTimeline(exportStartTime) + segmentDuration;
    }
  }, [exportStartTime, segmentDuration, alignStartDateToTimeline]);

  const paddedExportEndTime = useMemo(() => {
    if (exportEndTime) {
      return alignEndDateToTimeline(exportEndTime);
    }
  }, [exportEndTime, alignEndDateToTimeline]);

  const {
    handleMouseDown: handlebarMouseDown,
    handleMouseUp: handlebarMouseUp,
    handleMouseMove: handlebarMouseMove,
  } = useDraggableElement({
    contentRef,
    timelineRef,
    segmentsRef,
    draggableElementRef: handlebarRef,
    segmentDuration,
    showDraggableElement: showHandlebar,
    draggableElementTime: handlebarTime,
    setDraggableElementTime: setHandlebarTime,
    alignSetTimeToSegment: true,
    initialScrollIntoViewOnly: onlyInitialHandlebarScroll,
    timelineDuration,
    timelineCollapsed: timelineCollapsed,
    timelineStartAligned,
    isDragging: isDraggingHandlebar,
    setIsDragging: setIsDraggingHandlebar,
    draggableElementTimeRef: handlebarTimeRef,
    dense,
    segments,
    scrollToSegment,
  });

  const {
    handleMouseDown: exportStartMouseDown,
    handleMouseUp: exportStartMouseUp,
    handleMouseMove: exportStartMouseMove,
  } = useDraggableElement({
    contentRef,
    timelineRef,
    segmentsRef,
    draggableElementRef: exportStartRef,
    segmentDuration,
    showDraggableElement: showExportHandles,
    draggableElementTime: exportStartTime,
    draggableElementLatestTime: paddedExportEndTime,
    setDraggableElementTime: setExportStartTime,
    timelineDuration,
    timelineStartAligned,
    isDragging: isDraggingExportStart,
    setIsDragging: setIsDraggingExportStart,
    draggableElementTimeRef: exportStartTimeRef,
    setDraggableElementPosition: setExportStartPosition,
    dense,
    segments,
    scrollToSegment,
  });

  const {
    handleMouseDown: exportEndMouseDown,
    handleMouseUp: exportEndMouseUp,
    handleMouseMove: exportEndMouseMove,
  } = useDraggableElement({
    contentRef,
    timelineRef,
    segmentsRef,
    draggableElementRef: exportEndRef,
    segmentDuration,
    showDraggableElement: showExportHandles,
    draggableElementTime: exportEndTime,
    draggableElementEarliestTime: paddedExportStartTime,
    setDraggableElementTime: setExportEndTime,
    timelineDuration,
    timelineStartAligned,
    isDragging: isDraggingExportEnd,
    setIsDragging: setIsDraggingExportEnd,
    draggableElementTimeRef: exportEndTimeRef,
    setDraggableElementPosition: setExportEndPosition,
    dense,
    segments,
    scrollToSegment,
  });

  const handleHandlebar = useCallback(
    (
      e:
        | React.MouseEvent<HTMLDivElement, MouseEvent>
        | React.TouchEvent<HTMLDivElement>,
    ) => {
      setDraggableElementType("handlebar");
      handlebarMouseDown(e);
    },
    [handlebarMouseDown],
  );

  const handleExportStart = useCallback(
    (
      e:
        | React.MouseEvent<HTMLDivElement, MouseEvent>
        | React.TouchEvent<HTMLDivElement>,
    ) => {
      setDraggableElementType("export_start");
      exportStartMouseDown(e);
    },
    [exportStartMouseDown],
  );

  const handleExportEnd = useCallback(
    (
      e:
        | React.MouseEvent<HTMLDivElement, MouseEvent>
        | React.TouchEvent<HTMLDivElement>,
    ) => {
      setDraggableElementType("export_end");
      exportEndMouseDown(e);
    },
    [exportEndMouseDown],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      switch (draggableElementType) {
        case "export_start":
          exportStartMouseMove(e);
          break;
        case "export_end":
          exportEndMouseMove(e);
          break;
        case "handlebar":
          handlebarMouseMove(e);
          break;

        default:
          break;
      }
    },
    [
      draggableElementType,
      exportStartMouseMove,
      exportEndMouseMove,
      handlebarMouseMove,
    ],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent | TouchEvent) => {
      switch (draggableElementType) {
        case "export_start":
          exportStartMouseUp(e);
          break;
        case "export_end":
          exportEndMouseUp(e);
          break;
        case "handlebar":
          handlebarMouseUp(e);
          break;

        default:
          break;
      }
    },
    [
      draggableElementType,
      exportStartMouseUp,
      exportEndMouseUp,
      handlebarMouseUp,
    ],
  );

  const textSizeClasses = useCallback(
    (draggableElement: DraggableElement) => {
      if (isDragging && isMobile && draggableElementType === draggableElement) {
        return "text-lg";
      } else if (dense) {
        return "text-[8px] md:text-[11px]";
      } else {
        return "text-[11px]";
      }
    },
    [dense, isDragging, draggableElementType],
  );

  useEffect(() => {
    if (
      exportSectionRef.current &&
      segmentHeight &&
      exportStartPosition &&
      exportEndPosition
    ) {
      exportSectionRef.current.style.top = `${exportEndPosition + segmentHeight}px`;
      exportSectionRef.current.style.height = `${exportStartPosition - exportEndPosition + segmentHeight / 2}px`;
    }
  }, [
    showExportHandles,
    segmentHeight,
    timelineRef,
    exportStartPosition,
    exportEndPosition,
  ]);

  const documentRef = useRef<Document | null>(document);
  useEffect(() => {
    const documentInstance = documentRef.current;

    if (isDragging) {
      documentInstance?.addEventListener("mousemove", handleMouseMove);
      documentInstance?.addEventListener("touchmove", handleMouseMove);
      documentInstance?.addEventListener("mouseup", handleMouseUp);
      documentInstance?.addEventListener("touchend", handleMouseUp);
    } else {
      documentInstance?.removeEventListener("mousemove", handleMouseMove);
      documentInstance?.removeEventListener("touchmove", handleMouseMove);
      documentInstance?.removeEventListener("mouseup", handleMouseUp);
      documentInstance?.removeEventListener("touchend", handleMouseUp);
    }
    return () => {
      documentInstance?.removeEventListener("mousemove", handleMouseMove);
      documentInstance?.removeEventListener("touchmove", handleMouseMove);
      documentInstance?.removeEventListener("mouseup", handleMouseUp);
      documentInstance?.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, isDragging]);

  useEffect(() => {
    if (onHandlebarDraggingChange) {
      onHandlebarDraggingChange(isDraggingHandlebar);
    }
  }, [isDraggingHandlebar, onHandlebarDraggingChange]);

  const isHandlebarInNoRecordingPeriod = useMemo(() => {
    if (!getRecordingAvailability || handlebarTime === undefined) return false;

    // Check current segment
    const currentAvailability = getRecordingAvailability(handlebarTime);
    if (currentAvailability !== false) return false;

    // Check if at least one adjacent segment also has no recordings
    const beforeAvailability = getRecordingAvailability(
      handlebarTime - segmentDuration,
    );
    const afterAvailability = getRecordingAvailability(
      handlebarTime + segmentDuration,
    );

    // If current segment has no recordings AND at least one adjacent segment also has no recordings
    return beforeAvailability === false || afterAvailability === false;
  }, [getRecordingAvailability, handlebarTime, segmentDuration]);

  return (
    <>
      <div
        ref={timelineRef}
        className={cn(
          "no-scrollbar relative h-full select-none overflow-y-auto bg-secondary transition-all duration-500 ease-in-out",
          isZooming && zoomDirection === "in" && "animate-timeline-zoom-in",
          isZooming && zoomDirection === "out" && "animate-timeline-zoom-out",
          isDragging && (showHandlebar || showExportHandles)
            ? "cursor-grabbing"
            : "cursor-auto",
        )}
      >
        <div ref={segmentsRef} className="relative flex flex-col">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[30px] w-full bg-gradient-to-b from-secondary to-transparent"></div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[30px] w-full bg-gradient-to-t from-secondary to-transparent"></div>
          {children}
        </div>
        {children && (
          <>
            {showHandlebar && (
              <div
                className={`absolute left-0 top-0 ${isDraggingHandlebar && isIOS ? "" : "z-20"} w-full`}
                role="scrollbar"
                ref={handlebarRef}
              >
                <div
                  className="flex touch-none select-none items-center justify-center"
                  onMouseDown={handleHandlebar}
                  onTouchStart={handleHandlebar}
                >
                  <div
                    className={`relative w-full ${
                      isDraggingHandlebar ? "cursor-grabbing" : "cursor-grab"
                    }`}
                  >
                    <div
                      className={`mx-auto rounded-full bg-destructive ${
                        dense
                          ? "w-12 md:w-20"
                          : segmentDuration < 60
                            ? "w-[80px]"
                            : "w-20"
                      } h-5 ${isDraggingHandlebar && isMobile ? "fixed left-1/2 top-[18px] z-20 h-[30px] w-auto -translate-x-1/2 transform bg-destructive/80 px-3" : "static"} flex items-center justify-center`}
                    >
                      <div
                        ref={handlebarTimeRef}
                        className={`pointer-events-none text-white ${textSizeClasses("handlebar")} z-10`}
                      ></div>
                    </div>
                    <div
                      className={`absolute h-[4px] w-full bg-destructive ${isDraggingHandlebar && isMobile ? "top-1" : "top-1/2 -translate-y-1/2 transform"}`}
                    ></div>
                  </div>
                </div>
                {/* TODO: determine if we should keep this tooltip */}
                {false && isHandlebarInNoRecordingPeriod && (
                  <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-md bg-destructive/80 px-4 py-1 text-center text-xs text-white shadow-lg">
                    No recordings
                  </div>
                )}
              </div>
            )}
            {showExportHandles && (
              <>
                <div
                  className={`export-end absolute left-0 top-0 ${isDraggingExportEnd && isIOS ? "" : "z-20"} w-full`}
                  role="scrollbar"
                  ref={exportEndRef}
                >
                  <div
                    className="flex touch-none select-none items-center justify-center"
                    onMouseDown={handleExportEnd}
                    onTouchStart={handleExportEnd}
                  >
                    <div
                      className={`relative mt-[6.5px] w-full ${
                        isDraggingExportEnd ? "cursor-grabbing" : "cursor-grab"
                      }`}
                    >
                      <div
                        className={`mx-auto -mt-4 bg-selected ${
                          dense
                            ? "w-12 md:w-20"
                            : segmentDuration < 60
                              ? "w-[80px]"
                              : "w-20"
                        } h-5 ${isDraggingExportEnd && isMobile ? "fixed left-1/2 top-[18px] z-20 mt-0 h-[30px] w-auto -translate-x-1/2 transform rounded-full bg-selected/80 px-3" : "static rounded-tl-lg rounded-tr-lg"} flex items-center justify-center`}
                      >
                        <div
                          ref={exportEndTimeRef}
                          className={`pointer-events-none text-white ${isDraggingExportEnd && isMobile ? "mt-0" : ""} ${textSizeClasses("export_end")} z-10`}
                        ></div>
                      </div>
                      <div
                        className={`absolute h-[4px] w-full bg-selected ${isDraggingExportEnd && isMobile ? "top-0" : "top-1/2 -translate-y-1/2 transform"}`}
                      ></div>
                    </div>
                  </div>
                </div>
                <div
                  ref={exportSectionRef}
                  className="absolute w-full bg-selected/50"
                ></div>
                <div
                  className={`export-start absolute left-0 top-0 ${isDraggingExportStart && isIOS ? "" : "z-20"} w-full`}
                  role="scrollbar"
                  ref={exportStartRef}
                >
                  <div
                    className="flex touch-none select-none items-center justify-center"
                    onMouseDown={handleExportStart}
                    onTouchStart={handleExportStart}
                  >
                    <div
                      className={`relative -mt-[6.5px] w-full ${
                        isDragging ? "cursor-grabbing" : "cursor-grab"
                      }`}
                    >
                      <div
                        className={`absolute h-[4px] w-full bg-selected ${isDraggingExportStart && isMobile ? "top-[12px]" : "top-1/2 -translate-y-1/2 transform"}`}
                      ></div>
                      <div
                        className={`mx-auto mt-4 bg-selected ${
                          dense
                            ? "w-12 md:w-20"
                            : segmentDuration < 60
                              ? "w-[80px]"
                              : "w-20"
                        } h-5 ${isDraggingExportStart && isMobile ? "fixed left-1/2 top-[4px] z-20 mt-0 h-[30px] w-auto -translate-x-1/2 transform rounded-full bg-selected/80 px-3" : "static rounded-bl-lg rounded-br-lg"} flex items-center justify-center`}
                      >
                        <div
                          ref={exportStartTimeRef}
                          className={`pointer-events-none text-white ${isDraggingExportStart && isMobile ? "mt-0" : ""} ${textSizeClasses("export_start")} z-10`}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {onZoomChange && currentZoomLevelIndex !== -1 && (
        <div
          className={`absolute z-30 flex gap-2 ${
            isMobile
              ? "bottom-4 right-1 flex-col-reverse gap-3"
              : "bottom-2 left-1/2 -translate-x-1/2"
          }`}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={(e) => {
                  const newLevel = Math.max(0, currentZoomLevelIndex - 1);
                  onZoomChange(newLevel);
                  e.currentTarget.blur();
                }}
                variant="outline"
                disabled={currentZoomLevelIndex === 0}
                className="bg-background_alt p-3 hover:bg-accent hover:text-accent-foreground active:scale-95 [@media(hover:none)]:hover:bg-background_alt"
                type="button"
              >
                <LuZoomOut className={cn("size-5 text-primary-variant")} />
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>{t("zoomIn")}</TooltipContent>
            </TooltipPortal>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={(e) => {
                  const newLevel = Math.min(
                    zoomLevels.length - 1,
                    currentZoomLevelIndex + 1,
                  );
                  onZoomChange(newLevel);
                  e.currentTarget.blur();
                }}
                variant="outline"
                disabled={currentZoomLevelIndex === zoomLevels.length - 1}
                className="bg-background_alt p-3 hover:bg-accent hover:text-accent-foreground active:scale-95 [@media(hover:none)]:hover:bg-background_alt"
                type="button"
              >
                <LuZoomIn className={cn("size-5 text-primary-variant")} />
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>{t("zoomOut")}</TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </div>
      )}
    </>
  );
}

export default ReviewTimeline;
