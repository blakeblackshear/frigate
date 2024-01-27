import ActivityScrubber, {
  ScrubberItem,
} from "@/components/scrubber/ActivityScrubber";
import ActivityIndicator from "@/components/ui/activity-indicator";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  getTimelineDetectionIcon,
  getTimelineIcon,
} from "@/utils/timelineUtil";
import { renderToStaticMarkup } from "react-dom/server";
import { useMemo, useRef, useState } from "react";
import useSWR from "swr";
import DynamicVideoPlayer, {
  DynamicVideoController,
} from "@/components/player/DynamicVideoPlayer";

type MobileTimelineViewProps = {
  playback: TimelinePlayback;
};

export default function MobileTimelineView({
  playback,
}: MobileTimelineViewProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const controllerRef = useRef<DynamicVideoController | undefined>(undefined);

  const [timelineTime, setTimelineTime] = useState(
    playback.timelineItems.length > 0
      ? playback.timelineItems[0].timestamp
      : playback.range.start
  );

  const recordingParams = useMemo(() => {
    return {
      before: playback.range.end,
      after: playback.range.start,
    };
  }, [playback]);
  const { data: recordings } = useSWR<Recording[]>(
    playback ? [`${playback.camera}/recordings`, recordingParams] : null,
    { revalidateOnFocus: false }
  );

  if (!config || !recordings) {
    return <ActivityIndicator />;
  }

  return (
    <div className="w-full">
      <DynamicVideoPlayer
        camera={playback.camera}
        timeRange={playback.range}
        cameraPreviews={
          playback.relevantPreview ? [playback.relevantPreview] : []
        }
        onControllerReady={(controller) => {
          controllerRef.current = controller;
          controllerRef.current.onPlayerTimeUpdate((timestamp: number) => {
            setTimelineTime(timestamp);
          });

          if (playback.timelineItems.length > 0) {
            controllerRef.current?.seekToTimestamp(
              playback.timelineItems[0].timestamp,
              true
            );
          }
        }}
      />
      <div className="m-1">
        {playback != undefined && (
          <ActivityScrubber
            items={timelineItemsToScrubber(playback.timelineItems)}
            timeBars={[{ time: new Date(timelineTime * 1000), id: "playback" }]}
            options={{
              start: new Date(playback.range.start * 1000),
              end: new Date(playback.range.end * 1000),
              snap: null,
              min: new Date(playback.range.start * 1000),
              max: new Date(playback.range.end * 1000),
              timeAxis: { scale: "minute", step: 15 },
              zoomable: false,
            }}
            timechangeHandler={(data) => {
              controllerRef.current?.scrubToTimestamp(
                data.time.getTime() / 1000
              );
              setTimelineTime(data.time.getTime() / 1000);
            }}
            timechangedHandler={(data) => {
              controllerRef.current?.seekToTimestamp(
                data.time.getTime() / 1000,
                true
              );
            }}
            selectHandler={(data) => {
              if (data.items.length > 0) {
                const selected = parseFloat(data.items[0].split("-")[0]);

                const timeline = playback.timelineItems.find(
                  (timeline) => timeline.timestamp == selected
                );

                if (timeline) {
                  controllerRef.current?.seekToTimelineItem(timeline);
                }
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function timelineItemsToScrubber(items: Timeline[]): ScrubberItem[] {
  return items.map((item, idx) => {
    return {
      id: `${item.timestamp}-${idx}`,
      content: getTimelineContentElement(item),
      start: new Date(item.timestamp * 1000),
      end: new Date(item.timestamp * 1000),
      type: "box",
    };
  });
}

function getTimelineContentElement(item: Timeline): HTMLElement {
  const output = document.createElement(`div-${item.timestamp}`);
  output.innerHTML = renderToStaticMarkup(
    <div className="flex items-center">
      {getTimelineDetectionIcon(item)} : {getTimelineIcon(item)}
    </div>
  );
  return output;
}
