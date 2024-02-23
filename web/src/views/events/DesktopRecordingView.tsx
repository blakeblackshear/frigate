import DynamicVideoPlayer, {
  DynamicVideoController,
} from "@/components/player/DynamicVideoPlayer";
import EventReviewTimeline from "@/components/timeline/EventReviewTimeline";
import { Button } from "@/components/ui/button";
import { ReviewSegment } from "@/types/review";
import { getChunkedTimeRange } from "@/utils/timelineUtil";
import { useEffect, useMemo, useRef, useState } from "react";
import { IoMdArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";

type DesktopRecordingViewProps = {
  selectedReview: ReviewSegment;
  reviewItems: ReviewSegment[];
  relevantPreviews?: Preview[];
};
export default function DesktopRecordingView({
  selectedReview,
  reviewItems,
  relevantPreviews,
}: DesktopRecordingViewProps) {
  const navigate = useNavigate();
  const controllerRef = useRef<DynamicVideoController | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // timeline time

  const timeRange = useMemo(
    () => getChunkedTimeRange(selectedReview.start_time),
    []
  );
  const [selectedRangeIdx, setSelectedRangeIdx] = useState(
    timeRange.ranges.findIndex((chunk) => {
      return (
        chunk.start <= selectedReview.start_time &&
        chunk.end >= selectedReview.start_time
      );
    })
  );

  // move to next clip
  useEffect(() => {
    if (!controllerRef.current) {
      return;
    }

    if (selectedRangeIdx < timeRange.ranges.length - 1) {
      controllerRef.current.onClipEndedEvent(() => {
        setSelectedRangeIdx(selectedRangeIdx + 1);
      });
    }
  }, [controllerRef, selectedRangeIdx]);

  // scrubbing and timeline state

  const [scrubbing, setScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(
    selectedReview?.start_time || Date.now() / 1000
  );

  useEffect(() => {
    if (scrubbing) {
      controllerRef.current?.scrubToTimestamp(currentTime);
    }
  }, [controllerRef, currentTime, scrubbing]);

  useEffect(() => {
    if (!scrubbing) {
      controllerRef.current?.seekToTimestamp(currentTime, true);
    }
  }, [controllerRef, scrubbing]);

  return (
    <div ref={contentRef} className="relative w-full h-full">
      <Button
        className="absolute left-0 top-0 rounded-lg"
        onClick={() => navigate(-1)}
      >
        <IoMdArrowRoundBack className="w-5 h-5 mr-[10px]" />
        Back
      </Button>

      <div className="absolute left-[20%] top-8 right-[20%]">
        <DynamicVideoPlayer
          camera={selectedReview.camera}
          timeRange={timeRange.ranges[selectedRangeIdx]}
          cameraPreviews={relevantPreviews || []}
          onControllerReady={(controller) => {
            controllerRef.current = controller;
            controllerRef.current.onPlayerTimeUpdate((timestamp: number) => {
              setCurrentTime(timestamp);
            });

            controllerRef.current?.seekToTimestamp(
              selectedReview.start_time,
              true
            );
          }}
        />
      </div>

      <div className="absolute top-0 right-0 bottom-0">
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
