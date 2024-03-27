import { DraggableElement } from "@/types/draggable-element";
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

export type ReviewTimelineProps = {
  timelineRef: RefObject<HTMLDivElement>;
  handlebarRef: RefObject<HTMLDivElement>;
  handlebarTimeRef: RefObject<HTMLDivElement>;
  handlebarMouseMove: (e: MouseEvent | TouchEvent) => void;
  handlebarMouseUp: (e: MouseEvent | TouchEvent) => void;
  handlebarMouseDown: (
    e:
      | React.MouseEvent<HTMLDivElement, MouseEvent>
      | React.TouchEvent<HTMLDivElement>,
  ) => void;
  segmentDuration: number;
  timelineDuration: number;
  showHandlebar: boolean;
  showExportHandles: boolean;
  exportStartRef: RefObject<HTMLDivElement>;
  exportStartTimeRef: RefObject<HTMLDivElement>;
  exportEndRef: RefObject<HTMLDivElement>;
  exportEndTimeRef: RefObject<HTMLDivElement>;
  exportStartMouseMove: (e: MouseEvent | TouchEvent) => void;
  exportStartMouseUp: (e: MouseEvent | TouchEvent) => void;
  exportStartMouseDown: (
    e:
      | React.MouseEvent<HTMLDivElement, MouseEvent>
      | React.TouchEvent<HTMLDivElement>,
  ) => void;
  exportEndMouseMove: (e: MouseEvent | TouchEvent) => void;
  exportEndMouseUp: (e: MouseEvent | TouchEvent) => void;
  exportEndMouseDown: (
    e:
      | React.MouseEvent<HTMLDivElement, MouseEvent>
      | React.TouchEvent<HTMLDivElement>,
  ) => void;
  isDragging: boolean;
  exportStartPosition?: number;
  exportEndPosition?: number;
  children: ReactNode;
};

export function ReviewTimeline({
  timelineRef,
  handlebarRef,
  handlebarTimeRef,
  handlebarMouseMove,
  handlebarMouseUp,
  handlebarMouseDown,
  segmentDuration,
  timelineDuration,
  showHandlebar = false,
  showExportHandles = false,
  exportStartRef,
  exportStartTimeRef,
  exportEndRef,
  exportEndTimeRef,
  exportStartMouseMove,
  exportStartMouseUp,
  exportStartMouseDown,
  exportEndMouseMove,
  exportEndMouseUp,
  exportEndMouseDown,
  isDragging,
  exportStartPosition,
  exportEndPosition,
  children,
}: ReviewTimelineProps) {
  const exportSectionRef = useRef<HTMLDivElement>(null);

  const segmentHeight = useMemo(() => {
    if (timelineRef.current) {
      const { scrollHeight: timelineHeight } =
        timelineRef.current as HTMLDivElement;

      return timelineHeight / (timelineDuration / segmentDuration);
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentDuration, timelineDuration, timelineRef, showExportHandles]);

  const [draggableElementType, setDraggableElementType] =
    useState<DraggableElement>();

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

  return (
    <div
      ref={timelineRef}
      className={`relative h-full overflow-y-auto no-scrollbar select-none bg-secondary ${
        isDragging && (showHandlebar || showExportHandles)
          ? "cursor-grabbing"
          : "cursor-auto"
      }`}
    >
      <div className="flex flex-col relative">
        <div className="absolute top-0 inset-x-0 z-20 w-full h-[30px] bg-gradient-to-b from-secondary to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 inset-x-0 z-20 w-full h-[30px] bg-gradient-to-t from-secondary to-transparent pointer-events-none"></div>
        {children}
      </div>
      {showHandlebar && (
        <div
          className={`absolute left-0 top-0 ${isDragging && isIOS ? "" : "z-20"} w-full`}
          role="scrollbar"
          ref={handlebarRef}
        >
          <div
            className="flex items-center justify-center touch-none select-none"
            onMouseDown={handleHandlebar}
            onTouchStart={handleHandlebar}
          >
            <div
              className={`relative w-full ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
            >
              <div
                className={`bg-destructive rounded-full mx-auto ${
                  segmentDuration < 60 ? "w-12 md:w-20" : "w-12 md:w-16"
                } h-5 ${isDragging && isMobile && draggableElementType == "handlebar" ? "fixed top-[18px] left-1/2 transform -translate-x-1/2 z-20 w-[30%] h-[30px] bg-destructive/80" : "static"} flex items-center justify-center`}
              >
                <div
                  ref={handlebarTimeRef}
                  className={`text-white pointer-events-none ${isDragging && isMobile && draggableElementType == "handlebar" ? "text-lg" : "text-[8px] md:text-xs"} z-10`}
                ></div>
              </div>
              <div
                className={`absolute h-[4px] w-full bg-destructive ${isDragging && isMobile && draggableElementType == "handlebar" ? "top-1" : "top-1/2 transform -translate-y-1/2"}`}
              ></div>
            </div>
          </div>
        </div>
      )}
      {showExportHandles && (
        <>
          <div
            className={`absolute left-0 top-0 ${isDragging && isIOS ? "" : "z-20"} w-full`}
            role="scrollbar"
            ref={exportEndRef}
          >
            <div
              className="flex items-center justify-center touch-none select-none"
              onMouseDown={handleExportEnd}
              onTouchStart={handleExportEnd}
            >
              <div
                className={`relative mt-[6.5px] w-full ${
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                }`}
              >
                <div
                  className={`bg-selected -mt-4 mx-auto ${
                    segmentDuration < 60 ? "w-12 md:w-20" : "w-12 md:w-16"
                  } h-5 ${isDragging && isMobile && draggableElementType == "export_end" ? "fixed mt-0 rounded-full top-[18px] left-1/2 transform -translate-x-1/2 z-20 w-[30%] h-[30px] bg-selected/80" : "rounded-tr-lg rounded-tl-lg static"} flex items-center justify-center`}
                >
                  <div
                    ref={exportEndTimeRef}
                    className={`text-white pointer-events-none ${isDragging && isMobile && draggableElementType == "export_end" ? "text-lg mt-0" : "text-[8px] md:text-xs"} z-10`}
                  ></div>
                </div>
                <div
                  className={`absolute h-[4px] w-full bg-selected ${isDragging && isMobile && draggableElementType == "export_end" ? "top-0" : "top-1/2 transform -translate-y-1/2"}`}
                ></div>
              </div>
            </div>
          </div>
          <div
            ref={exportSectionRef}
            className="bg-selected/50 absolute w-full"
          ></div>
          <div
            className={`absolute left-0 top-0 ${isDragging && isIOS ? "" : "z-20"} w-full`}
            role="scrollbar"
            ref={exportStartRef}
          >
            <div
              className="flex items-center justify-center touch-none select-none"
              onMouseDown={handleExportStart}
              onTouchStart={handleExportStart}
            >
              <div
                className={`relative -mt-[6.5px] w-full ${
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                }`}
              >
                <div
                  className={`absolute h-[4px] w-full bg-selected ${isDragging && isMobile && draggableElementType == "export_start" ? "top-[12px]" : "top-1/2 transform -translate-y-1/2"}`}
                ></div>
                <div
                  className={`bg-selected mt-4 mx-auto ${
                    segmentDuration < 60 ? "w-12 md:w-20" : "w-12 md:w-16"
                  } h-5 ${isDragging && isMobile && draggableElementType == "export_start" ? "fixed mt-0 rounded-full top-[4px] left-1/2 transform -translate-x-1/2 z-20 w-[30%] h-[30px] bg-selected/80" : "rounded-br-lg rounded-bl-lg static"} flex items-center justify-center`}
                >
                  <div
                    ref={exportStartTimeRef}
                    className={`text-white pointer-events-none ${isDragging && isMobile && draggableElementType == "export_start" ? "text-lg mt-0" : "text-[8px] md:text-xs"} z-10`}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ReviewTimeline;
