import PreviewPlayer, {
  PreviewController,
} from "@/components/player/PreviewPlayer";
import { DynamicVideoController } from "@/components/player/dynamic/DynamicVideoController";
import DynamicVideoPlayer from "@/components/player/dynamic/DynamicVideoPlayer";
import EventReviewTimeline from "@/components/timeline/EventReviewTimeline";
import MotionReviewTimeline from "@/components/timeline/MotionReviewTimeline";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FrigateConfig } from "@/types/frigateConfig";
import { Preview } from "@/types/preview";
import { MotionData, ReviewSegment, ReviewSeverity } from "@/types/review";
import { getChunkedTimeDay } from "@/utils/timelineUtil";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDesktop, isMobile } from "react-device-detect";
import { IoMdArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";

const SEGMENT_DURATION = 30;

type RecordingViewProps = {
  startCamera: string;
  startTime: number;
  severity: ReviewSeverity;
  reviewItems: ReviewSegment[];
  allCameras: string[];
  allPreviews?: Preview[];
};
export function RecordingView({
  startCamera,
  startTime,
  severity,
  reviewItems,
  allCameras,
  allPreviews,
}: RecordingViewProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement | null>(null);

  // controller state

  const [mainCamera, setMainCamera] = useState(startCamera);
  const mainControllerRef = useRef<DynamicVideoController | null>(null);
  const previewRefs = useRef<{ [camera: string]: PreviewController }>({});

  const [playbackStart, setPlaybackStart] = useState(startTime);

  const mainCameraReviewItems = useMemo(
    () => reviewItems.filter((cam) => cam.camera == mainCamera),
    [reviewItems, mainCamera],
  );

  // timeline time

  const timeRange = useMemo(() => getChunkedTimeDay(startTime), [startTime]);
  const [selectedRangeIdx, setSelectedRangeIdx] = useState(
    timeRange.ranges.findIndex((chunk) => {
      return chunk.start <= startTime && chunk.end >= startTime;
    }),
  );
  const currentTimeRange = useMemo(
    () => timeRange.ranges[selectedRangeIdx],
    [selectedRangeIdx, timeRange],
  );

  // move to next clip

  const onClipEnded = useCallback(() => {
    if (!mainControllerRef.current) {
      return;
    }

    if (selectedRangeIdx < timeRange.ranges.length - 1) {
      setSelectedRangeIdx(selectedRangeIdx + 1);
    }
  }, [selectedRangeIdx, timeRange]);

  // scrubbing and timeline state

  const [scrubbing, setScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(startTime);
  const [playerTime, setPlayerTime] = useState(startTime);

  const updateSelectedSegment = useCallback(
    (currentTime: number, updateStartTime: boolean) => {
      const index = timeRange.ranges.findIndex(
        (seg) => seg.start <= currentTime && seg.end >= currentTime,
      );

      if (index != -1) {
        if (updateStartTime) {
          setPlaybackStart(currentTime);
        }

        setSelectedRangeIdx(index);
      }
    },
    [timeRange],
  );

  useEffect(() => {
    if (scrubbing) {
      if (
        currentTime > currentTimeRange.end + 60 ||
        currentTime < currentTimeRange.start - 60
      ) {
        updateSelectedSegment(currentTime, false);
        return;
      }

      mainControllerRef.current?.scrubToTimestamp(currentTime);

      Object.values(previewRefs.current).forEach((controller) => {
        controller.scrubToTimestamp(currentTime);
      });
    }
  }, [
    currentTime,
    scrubbing,
    timeRange,
    currentTimeRange,
    updateSelectedSegment,
  ]);

  useEffect(() => {
    if (!scrubbing) {
      if (Math.abs(currentTime - playerTime) > 10) {
        if (
          currentTimeRange.start <= currentTime &&
          currentTimeRange.end >= currentTime
        ) {
          mainControllerRef.current?.seekToTimestamp(currentTime, true);
        } else {
          updateSelectedSegment(currentTime, true);
        }
      }
    }
    // we only want to seek when current time doesn't match the player update time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, scrubbing]);

  const onSelectCamera = useCallback(
    (newCam: string) => {
      setMainCamera(newCam);
      setPlaybackStart(currentTime);
    },
    [currentTime],
  );

  // motion timeline data

  const { data: motionData } = useSWR<MotionData[]>(
    severity == "significant_motion"
      ? [
          "review/activity/motion",
          {
            before: timeRange.end,
            after: timeRange.start,
            scale: SEGMENT_DURATION / 2,
            cameras: mainCamera,
          },
        ]
      : null,
  );

  const mainCameraAspect = useMemo(() => {
    if (!config) {
      return "normal";
    }

    const aspectRatio =
      config.cameras[mainCamera].detect.width /
      config.cameras[mainCamera].detect.height;

    if (aspectRatio > 2) {
      return "wide";
    } else if (aspectRatio < 16 / 9) {
      return "tall";
    } else {
      return "normal";
    }
  }, [config, mainCamera]);

  const grow = useMemo(() => {
    if (mainCameraAspect == "wide") {
      return "w-full aspect-wide";
    } else if (isDesktop && mainCameraAspect == "tall") {
      return "h-full aspect-tall";
    } else {
      return "w-full aspect-video";
    }
  }, [mainCameraAspect]);

  return (
    <div ref={contentRef} className="relative size-full">
      <Button
        className="absolute top-0 left-0 rounded-lg"
        onClick={() => navigate(-1)}
      >
        <IoMdArrowRoundBack className="size-5 mr-[10px]" />
        Back
      </Button>
      {isMobile && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="absolute top-0 right-0 rounded-lg capitalize">
              {mainCamera.replaceAll("_", " ")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup
              value={mainCamera}
              onValueChange={(cam) => {
                setPlaybackStart(currentTime);
                setMainCamera(cam);
              }}
            >
              {allCameras.map((cam) => (
                <DropdownMenuRadioItem
                  key={cam}
                  className="capitalize"
                  value={cam}
                >
                  {cam.replaceAll("_", " ")}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div
        className={`flex h-full justify-center overflow-hidden ${isDesktop ? "" : "flex-col pt-12"}`}
      >
        <div className="flex flex-1 flex-wrap">
          <div
            className={`size-full flex px-2 items-center ${mainCameraAspect == "tall" ? "flex-row justify-evenly" : "flex-col justify-center"}`}
          >
            <div
              key={mainCamera}
              className={
                isDesktop
                  ? `flex justify-center items mb-5 ${mainCameraAspect == "tall" ? "h-[96%]" : "w-[82%]"}`
                  : `w-full ${mainCameraAspect == "wide" ? "" : "aspect-video"}`
              }
            >
              <DynamicVideoPlayer
                className={grow}
                camera={mainCamera}
                timeRange={currentTimeRange}
                cameraPreviews={allPreviews ?? []}
                startTimestamp={playbackStart}
                onTimestampUpdate={(timestamp) => {
                  setPlayerTime(timestamp);
                  setCurrentTime(timestamp);
                  Object.values(previewRefs.current ?? {}).forEach((prev) =>
                    prev.scrubToTimestamp(Math.floor(timestamp)),
                  );
                }}
                onClipEnded={onClipEnded}
                onControllerReady={(controller) => {
                  mainControllerRef.current = controller;
                }}
                isScrubbing={scrubbing}
              />
            </div>
            {isDesktop && (
              <div
                className={`flex justify-center gap-2 ${mainCameraAspect == "tall" ? "h-full flex-col overflow-y-auto items-center" : "w-full overflow-x-auto"}`}
              >
                {allCameras.map((cam) => {
                  if (cam !== mainCamera) {
                    return (
                      <div key={cam}>
                        <PreviewPlayer
                          className={
                            mainCameraAspect == "tall" ? "" : "size-full"
                          }
                          camera={cam}
                          timeRange={currentTimeRange}
                          cameraPreviews={allPreviews ?? []}
                          startTime={startTime}
                          isScrubbing={scrubbing}
                          onControllerReady={(controller) => {
                            previewRefs.current[cam] = controller;
                            controller.scrubToTimestamp(startTime);
                          }}
                          onClick={() => onSelectCamera(cam)}
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>

        <div
          className={
            isDesktop
              ? "w-[100px] mt-2 overflow-y-auto no-scrollbar"
              : "flex-grow overflow-hidden"
          }
        >
          {severity != "significant_motion" ? (
            <EventReviewTimeline
              segmentDuration={30}
              timestampSpread={15}
              timelineStart={timeRange.end}
              timelineEnd={timeRange.start}
              showHandlebar
              handlebarTime={currentTime}
              setHandlebarTime={setCurrentTime}
              events={mainCameraReviewItems}
              severityType={severity}
              contentRef={contentRef}
              onHandlebarDraggingChange={(scrubbing) => setScrubbing(scrubbing)}
            />
          ) : (
            <MotionReviewTimeline
              segmentDuration={30}
              timestampSpread={15}
              timelineStart={timeRange.end}
              timelineEnd={timeRange.start}
              showHandlebar
              handlebarTime={currentTime}
              setHandlebarTime={setCurrentTime}
              events={mainCameraReviewItems}
              motion_events={motionData ?? []}
              severityType={severity}
              contentRef={contentRef}
              onHandlebarDraggingChange={(scrubbing) => setScrubbing(scrubbing)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
