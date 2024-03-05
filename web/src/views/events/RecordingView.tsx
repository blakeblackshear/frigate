import DynamicVideoPlayer, {
  DynamicVideoController,
} from "@/components/player/DynamicVideoPlayer";
import EventReviewTimeline from "@/components/timeline/EventReviewTimeline";
import { Button } from "@/components/ui/button";
import { Preview } from "@/types/preview";
import { ReviewSegment, ReviewSeverity } from "@/types/review";
import { getChunkedTimeDay } from "@/utils/timelineUtil";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IoMdArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";

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

  // move to next clip
  useEffect(() => {
    if (
      !videoPlayersRef.current &&
      Object.values(videoPlayersRef.current).length > 0
    ) {
      return;
    }

    const firstController = Object.values(videoPlayersRef.current)[0];

    if (firstController) {
      firstController.onClipChangedEvent((dir) => {
        if (
          dir == "forward" &&
          selectedRangeIdx < timeRange.ranges.length - 1
        ) {
          setSelectedRangeIdx(selectedRangeIdx + 1);
        } else if (selectedRangeIdx > 0) {
          setSelectedRangeIdx(selectedRangeIdx - 1);
        }
      });
    }
  }, [selectedRangeIdx, timeRange, videoPlayersRef, playerReady]);

  // scrubbing and timeline state

  const [scrubbing, setScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(startTime);

  useEffect(() => {
    if (scrubbing) {
      Object.values(videoPlayersRef.current).forEach((controller) => {
        controller.scrubToTimestamp(currentTime);
      });
    }
  }, [currentTime, scrubbing]);

  useEffect(() => {
    if (!scrubbing) {
      videoPlayersRef.current[mainCamera]?.seekToTimestamp(currentTime, true);
    }

    // we only want to seek when user stops scrubbing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubbing]);

  const onSelectCamera = useCallback(
    (newCam: string) => {
      videoPlayersRef.current[mainCamera].onPlayerTimeUpdate(undefined);
      videoPlayersRef.current[mainCamera].scrubToTimestamp(currentTime);
      videoPlayersRef.current[newCam].seekToTimestamp(currentTime, true);
      videoPlayersRef.current[newCam].onPlayerTimeUpdate(
        (timestamp: number) => {
          setCurrentTime(timestamp);

          allCameras.forEach((cam) => {
            if (cam != newCam) {
              videoPlayersRef.current[cam]?.scrubToTimestamp(
                Math.floor(timestamp),
              );
            }
          });
        },
      );
      setMainCamera(newCam);
    },
    [allCameras, currentTime, mainCamera],
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
                  timeRange={timeRange.ranges[selectedRangeIdx]}
                  cameraPreviews={allPreviews ?? []}
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

                    controller.seekToTimestamp(startTime, true);
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
                timeRange={timeRange.ranges[selectedRangeIdx]}
                cameraPreviews={allPreviews ?? []}
                previewOnly
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
      </div>
    </div>
  );
}

type MobileRecordingViewProps = {
  selectedReview: ReviewSegment;
  reviewItems: ReviewSegment[];
  relevantPreviews?: Preview[];
};
export function MobileRecordingView({
  selectedReview,
  reviewItems,
  relevantPreviews,
}: MobileRecordingViewProps) {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement | null>(null);

  // controller state

  const [playerReady, setPlayerReady] = useState(false);
  const controllerRef = useRef<DynamicVideoController | undefined>(undefined);

  // timeline time

  const timeRange = useMemo(
    () => getChunkedTimeDay(selectedReview.start_time),
    [selectedReview],
  );
  const [selectedRangeIdx, setSelectedRangeIdx] = useState(
    timeRange.ranges.findIndex((chunk) => {
      return (
        chunk.start <= selectedReview.start_time &&
        chunk.end >= selectedReview.start_time
      );
    }),
  );

  // move to next clip
  useEffect(() => {
    if (!controllerRef.current) {
      return;
    }

    controllerRef.current.onClipChangedEvent((dir) => {
      if (dir == "forward" && selectedRangeIdx < timeRange.ranges.length - 1) {
        setSelectedRangeIdx(selectedRangeIdx + 1);
      } else if (selectedRangeIdx > 0) {
        setSelectedRangeIdx(selectedRangeIdx - 1);
      }
    });
  }, [playerReady, selectedRangeIdx, timeRange]);

  // scrubbing and timeline state

  const [scrubbing, setScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(
    selectedReview?.start_time || Date.now() / 1000,
  );

  useEffect(() => {
    if (scrubbing) {
      controllerRef.current?.scrubToTimestamp(currentTime);
    }
  }, [currentTime, scrubbing]);

  useEffect(() => {
    if (!scrubbing) {
      controllerRef.current?.seekToTimestamp(currentTime, true);
    }

    // we only want to seek when user stops scrubbing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubbing]);

  return (
    <div ref={contentRef} className="flex flex-col relative w-full h-full">
      <Button className="rounded-lg" onClick={() => navigate(-1)}>
        <IoMdArrowRoundBack className="size-5 mr-[10px]" />
        Back
      </Button>

      <div>
        <DynamicVideoPlayer
          camera={selectedReview.camera}
          timeRange={timeRange.ranges[selectedRangeIdx]}
          cameraPreviews={relevantPreviews || []}
          onControllerReady={(controller) => {
            controllerRef.current = controller;
            setPlayerReady(true);
            controllerRef.current.onPlayerTimeUpdate((timestamp: number) => {
              setCurrentTime(timestamp);
            });

            controllerRef.current?.seekToTimestamp(
              selectedReview.start_time,
              true,
            );
          }}
        />
      </div>

      <div className="flex-grow overflow-hidden">
        <EventReviewTimeline
          segmentDuration={30}
          timestampSpread={15}
          timelineStart={timeRange.end}
          timelineEnd={timeRange.start}
          showHandlebar
          handlebarTime={currentTime}
          setHandlebarTime={setCurrentTime}
          events={reviewItems}
          severityType={selectedReview.severity}
          contentRef={contentRef}
          onHandlebarDraggingChange={(scrubbing) => setScrubbing(scrubbing)}
        />
      </div>
    </div>
  );
}
