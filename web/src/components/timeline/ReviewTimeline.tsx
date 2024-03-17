import { ReactNode, RefObject } from "react";
import { isIOS, isMobile } from "react-device-detect";

export type ReviewTimelineProps = {
  timelineRef: RefObject<HTMLDivElement>;
  handlebarRef: RefObject<HTMLDivElement>;
  handlebarTimeRef: RefObject<HTMLDivElement>;
  handleMouseMove: (
    e:
      | React.MouseEvent<HTMLDivElement, MouseEvent>
      | React.TouchEvent<HTMLDivElement>,
  ) => void;
  handleMouseUp: (
    e:
      | React.MouseEvent<HTMLDivElement, MouseEvent>
      | React.TouchEvent<HTMLDivElement>,
  ) => void;
  handleMouseDown: (
    e:
      | React.MouseEvent<HTMLDivElement, MouseEvent>
      | React.TouchEvent<HTMLDivElement>,
  ) => void;
  segmentDuration: number;
  showHandlebar: boolean;
  isDragging: boolean;
  children: ReactNode;
};

export function ReviewTimeline({
  timelineRef,
  handlebarRef,
  handlebarTimeRef,
  handleMouseMove,
  handleMouseUp,
  handleMouseDown,
  segmentDuration,
  showHandlebar = false,
  isDragging,
  children,
}: ReviewTimelineProps) {
  return (
    <div
      ref={timelineRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      className={`relative h-full overflow-y-auto no-scrollbar bg-secondary ${
        isDragging && showHandlebar ? "cursor-grabbing" : "cursor-auto"
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
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            <div
              className={`relative w-full ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
            >
              <div
                className={`bg-destructive rounded-full mx-auto ${
                  segmentDuration < 60 ? "w-12 md:w-20" : "w-12 md:w-16"
                } h-5 ${isDragging && isMobile ? "fixed top-[18px] left-1/2 transform -translate-x-1/2 z-20 w-[30%] h-[30px] bg-destructive/80" : "static"} flex items-center justify-center`}
              >
                <div
                  ref={handlebarTimeRef}
                  className={`text-white ${isDragging && isMobile ? "text-lg" : "text-[8px] md:text-xs"} z-10`}
                ></div>
              </div>
              <div
                className={`absolute h-1 w-full bg-destructive ${isDragging && isMobile ? "top-1" : "top-1/2 transform -translate-y-1/2"}`}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewTimeline;
