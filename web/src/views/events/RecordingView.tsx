import DynamicVideoPlayer, {
  DynamicVideoController,
} from "@/components/player/DynamicVideoPlayer";
import EventReviewTimeline from "@/components/timeline/EventReviewTimeline";
import MotionReviewTimeline from "@/components/timeline/MotionReviewTimeline";
import { Button } from "@/components/ui/button";
import { Preview } from "@/types/preview";
import { MotionData, ReviewSegment, ReviewSeverity } from "@/types/review";
import { getChunkedTimeDay } from "@/utils/timelineUtil";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IoMdArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";

const SEGMENT_DURATION = 30;

type DesktopRecordingViewProps = {
  startCamera: string;
  startTime: number;
  severity: ReviewSeverity;
  reviewItems: ReviewSegment[];
  allCameras: string[];
  allPreviews?: Preview[];
};
export function DesktopRecordingView({
  startCamera,
  startTime,
  severity,
  reviewItems,
  allCameras,
  allPreviews,
}: DesktopRecordingViewProps) {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement | null>(null);

  // controller state

  const [playerReady, setPlayerReady] = useState(false);
  const [mainCamera, setMainCamera] = useState(startCamera);
  const videoPlayersRef = useRef<{ [camera: string]: DynamicVideoController }>(
    {},
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
  useEffect(() => {
    if (
      !videoPlayersRef.current &&
      Object.values(videoPlayersRef.current).length > 0
    ) {
      return;
    }

    const mainController = videoPlayersRef.current[mainCamera];

    if (mainController) {
      mainController.onClipChangedEvent((dir) => {
        if (dir == "forward") {
          if (selectedRangeIdx < timeRange.ranges.length - 1) {
            setSelectedRangeIdx(selectedRangeIdx + 1);
          }
        }
      });
    }
  }, [selectedRangeIdx, timeRange, videoPlayersRef, playerReady, mainCamera]);

  // scrubbing and timeline state

  const [scrubbing, setScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(startTime);

  useEffect(() => {
    if (scrubbing) {
      if (
        currentTime > currentTimeRange.end + 60 ||
        currentTime < currentTimeRange.start - 60
      ) {
        const index = timeRange.ranges.findIndex(
          (seg) => seg.start <= currentTime && seg.end >= currentTime,
        );

        if (index != -1) {
          setSelectedRangeIdx(index);
        }
        return;
      }

      Object.values(videoPlayersRef.current).forEach((controller) => {
        controller.scrubToTimestamp(currentTime);
      });
    }
  }, [currentTime, scrubbing, timeRange, currentTimeRange]);

  useEffect(() => {
    if (!scrubbing) {
      videoPlayersRef.current[mainCamera]?.seekToTimestamp(currentTime, true);
    }

    // we only want to seek when user stops scrubbing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubbing]);

  const onSelectCamera = useCallback(
    (newCam: string) => {
      const lastController = videoPlayersRef.current[mainCamera];
      const newController = videoPlayersRef.current[newCam];
      lastController.onPlayerTimeUpdate(undefined);
      lastController.onClipChangedEvent(undefined);
      lastController.scrubToTimestamp(currentTime);
      newController.onCanPlay(() => {
        newController.seekToTimestamp(currentTime, true);
        newController.onCanPlay(null);
      });
      newController.onPlayerTimeUpdate((timestamp: number) => {
        setCurrentTime(timestamp);

        allCameras.forEach((cam) => {
          if (cam != newCam) {
            videoPlayersRef.current[cam]?.scrubToTimestamp(
              Math.floor(timestamp),
            );
          }
        });
      });
      setMainCamera(newCam);
    },
    [allCameras, currentTime, mainCamera],
  );

  // motion timeline data

  const { data: motionData } = useSWR<MotionData[]>(
    severity == "significant_motion"
      ? [
          "review/activity",
          {
            before: timeRange.end,
            after: timeRange.start,
            scale: SEGMENT_DURATION / 2,
          },
        ]
      : null,
  );

  return (
    <div ref={contentRef} className="relative size-full">
      <Button
        className="absolute top-0 left-0 rounded-lg"
        onClick={() => navigate(-1)}
      >
        <IoMdArrowRoundBack className="size-5 mr-[10px]" />
        Back
      </Button>

      <div className="absolute h-32 left-2 right-28 bottom-4 flex justify-center gap-1">
        {allCameras.map((cam) => {
          if (cam == mainCamera) {
            return (
              <div
                key={cam}
                className="fixed left-96 right-96 top-[40%] -translate-y-[50%]"
              >
                <DynamicVideoPlayer
                  camera={cam}
                  timeRange={currentTimeRange}
                  cameraPreviews={allPreviews ?? []}
                  preloadRecordings
                  onControllerReady={(controller) => {
                    videoPlayersRef.current[cam] = controller;
                    setPlayerReady(true);
                    controller.onPlayerTimeUpdate((timestamp: number) => {
                      setCurrentTime(timestamp);

                      allCameras.forEach((otherCam) => {
                        if (cam != otherCam) {
                          videoPlayersRef.current[otherCam]?.scrubToTimestamp(
                            Math.floor(timestamp),
                          );
                        }
                      });
                    });

                    controller.onCanPlay(() => {
                      controller.seekToTimestamp(startTime, true);
                      controller.onCanPlay(null);
                    });
                  }}
                />
              </div>
            );
          }

          return (
            <div key={cam} className="aspect-video flex items-center">
              <DynamicVideoPlayer
                className="size-full"
                camera={cam}
                timeRange={currentTimeRange}
                cameraPreviews={allPreviews ?? []}
                previewOnly
                preloadRecordings
                onControllerReady={(controller) => {
                  videoPlayersRef.current[cam] = controller;
                  setPlayerReady(true);
                  controller.scrubToTimestamp(startTime);
                }}
                onClick={() => onSelectCamera(cam)}
              />
            </div>
          );
        })}
      </div>

      <div className="absolute overflow-hidden w-56 inset-y-0 right-0">
        {severity != "significant_motion" ? (
          <EventReviewTimeline
            segmentDuration={30}
            timestampSpread={15}
            timelineStart={timeRange.end}
            timelineEnd={timeRange.start}
            showHandlebar
            handlebarTime={currentTime}
            setHandlebarTime={setCurrentTime}
            events={reviewItems}
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
            events={reviewItems}
            motion_events={motionData ?? []}
            severityType={severity}
            contentRef={contentRef}
            onHandlebarDraggingChange={(scrubbing) => setScrubbing(scrubbing)}
          />
        )}
      </div>
    </div>
  );
}

type MobileRecordingViewProps = {
  startCamera: string;
  startTime: number;
  severity: ReviewSeverity;
  reviewItems: ReviewSegment[];
  relevantPreviews?: Preview[];
};
export function MobileRecordingView({
  startCamera,
  startTime,
  severity,
  reviewItems,
  relevantPreviews,
}: MobileRecordingViewProps) {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement | null>(null);

  // controller state

  const [playerReady, setPlayerReady] = useState(false);
  const controllerRef = useRef<DynamicVideoController | undefined>(undefined);

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
  useEffect(() => {
    if (!controllerRef.current) {
      return;
    }

    controllerRef.current.onClipChangedEvent((dir) => {
      if (dir == "forward") {
        if (selectedRangeIdx < timeRange.ranges.length - 1) {
          setSelectedRangeIdx(selectedRangeIdx + 1);
        }
      }
    });
  }, [playerReady, selectedRangeIdx, timeRange]);

  // scrubbing and timeline state

  const [scrubbing, setScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(
    startTime || Date.now() / 1000,
  );

  useEffect(() => {
    if (scrubbing) {
      if (
        currentTime > currentTimeRange.end + 60 ||
        currentTime < currentTimeRange.start - 60
      ) {
        const index = timeRange.ranges.findIndex(
          (seg) => seg.start <= currentTime && seg.end >= currentTime,
        );

        if (index != -1) {
          setSelectedRangeIdx(index);
        }
        return;
      }

      controllerRef.current?.scrubToTimestamp(currentTime);
    }
  }, [currentTime, scrubbing, currentTimeRange, timeRange]);

  useEffect(() => {
    if (!scrubbing) {
      controllerRef.current?.seekToTimestamp(currentTime, true);
    }

    // we only want to seek when user stops scrubbing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubbing]);

  // motion timeline data

  const { data: motionData } = useSWR<MotionData[]>(
    severity == "significant_motion"
      ? [
          "review/activity",
          {
            before: timeRange.end,
            after: timeRange.start,
            scale: SEGMENT_DURATION / 2,
          },
        ]
      : null,
  );

  return (
    <div ref={contentRef} className="flex flex-col relative w-full h-full">
      <Button className="rounded-lg" onClick={() => navigate(-1)}>
        <IoMdArrowRoundBack className="size-5 mr-[10px]" />
        Back
      </Button>

      <div>
        <DynamicVideoPlayer
          camera={startCamera}
          timeRange={currentTimeRange}
          cameraPreviews={relevantPreviews || []}
          preloadRecordings
          onControllerReady={(controller) => {
            controllerRef.current = controller;
            setPlayerReady(true);
            controllerRef.current.onPlayerTimeUpdate((timestamp: number) => {
              setCurrentTime(timestamp);
            });

            controllerRef.current?.seekToTimestamp(startTime, true);
          }}
        />
      </div>

      <div className="flex-grow overflow-hidden">
        {severity != "significant_motion" ? (
          <EventReviewTimeline
            segmentDuration={30}
            timestampSpread={15}
            timelineStart={timeRange.end}
            timelineEnd={timeRange.start}
            showHandlebar
            handlebarTime={currentTime}
            setHandlebarTime={setCurrentTime}
            events={reviewItems}
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
            events={reviewItems}
            motion_events={motionData ?? []}
            severityType={severity}
            contentRef={contentRef}
            onHandlebarDraggingChange={(scrubbing) => setScrubbing(scrubbing)}
          />
        )}
      </div>
    </div>
  );
}
