import DynamicVideoPlayer, {
  DynamicVideoController,
} from "@/components/player/DynamicVideoPlayer";
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

  const [mainCamera, setMainCamera] = useState(startCamera);
  const videoPlayersRef = useRef<{ [camera: string]: DynamicVideoController }>(
    {},
  );

  const [playbackStart, setPlaybackStart] = useState(startTime);

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
    // we only want to fire once when players are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRangeIdx, timeRange, videoPlayersRef.current, mainCamera]);

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
      lastController.onPlayerTimeUpdate(null);
      lastController.onClipChangedEvent(null);
      lastController.scrubToTimestamp(currentTime);
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
      newController.seekToTimestamp(currentTime, true);
      setPlaybackStart(currentTime);
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

      <div className="flex h-full justify-center overflow-hidden">
        <div className="flex flex-1 flex-wrap">
          <div className="flex flex-col h-full px-2 justify-end">
            <div key={mainCamera} className="flex justify-center mb-5">
              <DynamicVideoPlayer
                className="w-[85%]"
                camera={mainCamera}
                timeRange={currentTimeRange}
                cameraPreviews={allPreviews ?? []}
                startTime={playbackStart}
                onControllerReady={(controller) => {
                  videoPlayersRef.current[mainCamera] = controller;
                  controller.onPlayerTimeUpdate((timestamp: number) => {
                    setCurrentTime(timestamp);

                    allCameras.forEach((otherCam) => {
                      if (mainCamera != otherCam) {
                        videoPlayersRef.current[otherCam]?.scrubToTimestamp(
                          Math.floor(timestamp),
                        );
                      }
                    });
                  });
                }}
              />
            </div>
            <div className="flex justify-end gap-2 overflow-x-auto">
              {allCameras.map((cam) => {
                if (cam !== mainCamera) {
                  return (
                    <div
                      key={cam}
                      className="aspect-video flex items-center we-[300px]"
                    >
                      <DynamicVideoPlayer
                        className="size-full"
                        camera={cam}
                        timeRange={currentTimeRange}
                        cameraPreviews={allPreviews ?? []}
                        previewOnly
                        onControllerReady={(controller) => {
                          videoPlayersRef.current[cam] = controller;
                          controller.scrubToTimestamp(startTime, true);
                        }}
                        onClick={() => onSelectCamera(cam)}
                      />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>

        <div className="w-[55px] md:w-[100px] mt-2 overflow-y-auto no-scrollbar">
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
    </div>
  );
}

type MobileRecordingViewProps = {
  startCamera: string;
  startTime: number;
  severity: ReviewSeverity;
  reviewItems: ReviewSegment[];
  relevantPreviews?: Preview[];
  allCameras: string[];
};
export function MobileRecordingView({
  startCamera,
  startTime,
  severity,
  reviewItems,
  relevantPreviews,
  allCameras,
}: MobileRecordingViewProps) {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement | null>(null);

  // controller state

  const [playerReady, setPlayerReady] = useState(false);
  const controllerRef = useRef<DynamicVideoController | undefined>(undefined);
  const [playbackCamera, setPlaybackCamera] = useState(startCamera);
  const [playbackStart, setPlaybackStart] = useState(startTime);

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
      <div className="flex justify-evenly items-center p-2">
        <Button className="rounded-lg" onClick={() => navigate(-1)}>
          <IoMdArrowRoundBack className="size-5 mr-[10px]" />
          Back
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="capitalize">
              {playbackCamera.replaceAll("_", " ")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup
              value={playbackCamera}
              onValueChange={(cam) => {
                setPlaybackStart(currentTime);
                setPlaybackCamera(cam);
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
      </div>

      <div>
        <DynamicVideoPlayer
          camera={playbackCamera}
          timeRange={currentTimeRange}
          cameraPreviews={relevantPreviews || []}
          startTime={playbackStart}
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
