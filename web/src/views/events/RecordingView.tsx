import DynamicVideoPlayer, {
  DynamicVideoController,
} from "@/components/player/DynamicVideoPlayer";
import EventReviewTimeline from "@/components/timeline/EventReviewTimeline";
import { Button } from "@/components/ui/button";
import { Preview } from "@/types/preview";
import { ReviewSegment } from "@/types/review";
import { getChunkedTimeDay } from "@/utils/timelineUtil";
import { useEffect, useMemo, useRef, useState } from "react";
import { IoMdArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";

type RecordingViewProps = {
  selectedReview: ReviewSegment;
  reviewItems: ReviewSegment[];
  relevantPreviews?: Preview[];
};
export default function RecordingView({
  selectedReview,
  reviewItems,
  relevantPreviews,
}: RecordingViewProps) {
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
      <Button
        className="md:absolute md:top-0 md:left-0 rounded-lg"
        onClick={() => navigate(-1)}
      >
        <IoMdArrowRoundBack className="size-5 mr-[10px]" />
        Back
      </Button>

      <div className="md:absolute md:top-8 md:inset-x-[20%]">
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

      <div className="flex-grow overflow-hidden md:absolute md:w-[100px] md:inset-y-0 md:right-0">
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
