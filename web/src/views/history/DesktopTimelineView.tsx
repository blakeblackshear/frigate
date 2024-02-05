import ActivityScrubber from "@/components/scrubber/ActivityScrubber";
import ActivityIndicator from "@/components/ui/activity-indicator";
import { FrigateConfig } from "@/types/frigateConfig";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import TimelineItemCard from "@/components/card/TimelineItemCard";
import { getTimelineHoursForDay } from "@/utils/historyUtil";
import { GraphDataPoint } from "@/types/graph";
import TimelineGraph from "@/components/graph/TimelineGraph";
import TimelineBar from "@/components/bar/TimelineBar";
import DynamicVideoPlayer, {
  DynamicVideoController,
} from "@/components/player/DynamicVideoPlayer";

type DesktopTimelineViewProps = {
  timelineData: CardsData;
  allPreviews: Preview[];
  initialPlayback: TimelinePlayback;
};

export default function DesktopTimelineView({
  timelineData,
  allPreviews,
  initialPlayback,
}: DesktopTimelineViewProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = useMemo(
    () =>
      config?.ui?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    [config]
  );

  const controllerRef = useRef<DynamicVideoController | undefined>(undefined);
  const initialScrollRef = useRef<HTMLDivElement | null>(null);

  // handle scrolling to initial timeline item
  useEffect(() => {
    if (initialScrollRef.current != null) {
      initialScrollRef.current.scrollIntoView();
    }
  }, [initialScrollRef]);

  const cameraPreviews = useMemo(() => {
    return allPreviews.filter((preview) => {
      return preview.camera == initialPlayback.camera;
    });
  }, []);

  const [timelineTime, setTimelineTime] = useState(0);
  const timelineStack = useMemo(
    () =>
      getTimelineHoursForDay(
        initialPlayback.camera,
        timelineData,
        cameraPreviews,
        initialPlayback.range.start + 60
      ),
    []
  );

  const [selectedPlaybackIdx, setSelectedPlaybackIdx] = useState(
    timelineStack.playbackItems.findIndex((playback) => {
      return (
        playback.range.start == initialPlayback.range.start &&
        playback.range.end == initialPlayback.range.end
      );
    })
  );
  const selectedPlayback = useMemo(
    () => timelineStack.playbackItems[selectedPlaybackIdx],
    [selectedPlaybackIdx]
  );

  // handle moving to next clip
  useEffect(() => {
    if (!controllerRef.current) {
      return;
    }

    if (selectedPlaybackIdx > 0) {
      controllerRef.current.onClipEndedEvent(() => {
        console.log("setting to " + (selectedPlaybackIdx - 1));
        setSelectedPlaybackIdx(selectedPlaybackIdx - 1);
      });
    }
  }, [controllerRef, selectedPlaybackIdx]);

  const { data: activity } = useSWR<RecordingActivity>(
    [
      `${initialPlayback.camera}/recording/hourly/activity`,
      {
        after: timelineStack.start,
        before: timelineStack.end,
        timezone,
      },
    ],
    { revalidateOnFocus: false }
  );

  const timelineGraphData = useMemo(() => {
    if (!activity) {
      return {};
    }

    const graphData: {
      [hour: string]: { objects: number[]; motion: GraphDataPoint[] };
    } = {};

    Object.entries(activity).forEach(([hour, data]) => {
      const objects: number[] = [];
      const motion: GraphDataPoint[] = [];

      data.forEach((seg, idx) => {
        if (seg.hasObjects) {
          objects.push(idx);
        }

        motion.push({
          x: new Date(seg.date * 1000),
          y: seg.count,
        });
      });

      graphData[hour] = { objects, motion };
    });

    return graphData;
  }, [activity]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="w-full flex flex-col">
      <div className="flex mt-2 max-h-[60%]">
        <DynamicVideoPlayer
          className="w-2/3 bg-black flex justify-center items-center"
          camera={initialPlayback.camera}
          timeRange={selectedPlayback.range}
          cameraPreviews={cameraPreviews}
          onControllerReady={(controller) => {
            controllerRef.current = controller;
            controllerRef.current.onPlayerTimeUpdate((timestamp: number) => {
              setTimelineTime(timestamp);
            });

            if (initialPlayback.timelineItems.length > 0) {
              controllerRef.current?.seekToTimestamp(
                selectedPlayback.timelineItems[0].timestamp,
                true
              );
            }
          }}
        />
        <div className="relative h-full w-1/3">
          <div className="absolute px-2 left-0 top-0 right-0 bottom-0 overflow-y-auto overflow-x-hidden">
            {selectedPlayback.timelineItems.map((timeline) => {
              return (
                <TimelineItemCard
                  key={timeline.timestamp}
                  timeline={timeline}
                  relevantPreview={selectedPlayback.relevantPreview}
                  onSelect={() => {
                    controllerRef.current?.seekToTimelineItem(timeline);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="relative mt-4 w-full h-full">
        <div className="absolute left-0 top-0 right-0 bottom-0 overflow-auto">
          {timelineStack.playbackItems.map((timeline, tIdx) => {
            const isInitiallySelected =
              initialPlayback.range.start == timeline.range.start;
            const isSelected =
              timeline.range.start == selectedPlayback.range.start;
            const graphData = timelineGraphData[timeline.range.start];
            const start = new Date(timeline.range.start * 1000);
            const end = new Date(timeline.range.end * 1000);

            return (
              <div
                ref={isInitiallySelected ? initialScrollRef : null}
                key={timeline.range.start}
              >
                {isSelected ? (
                  <div className="p-2 relative bg-secondary bg-opacity-30 rounded-md">
                    <ActivityScrubber
                      timeBars={
                        isSelected
                          ? [
                              {
                                time: new Date(
                                  Math.max(timeline.range.start, timelineTime) *
                                    1000
                                ),
                                id: "playback",
                              },
                            ]
                          : []
                      }
                      options={{
                        snap: null,
                        min: start,
                        max: end,
                        start: start,
                        end: end,
                        zoomable: false,
                        height: "120px",
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
                    />
                    {isSelected && graphData && (
                      <div className="absolute left-2 right-2 top-0 h-[84px]">
                        <TimelineGraph
                          id={timeline.range.start.toString()}
                          data={[
                            {
                              name: "Motion",
                              data: graphData.motion,
                            },
                          ]}
                          objects={graphData.objects}
                          start={graphData.motion[0].x.getTime()}
                          end={graphData.motion.at(-1)!!.x.getTime()}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <TimelineBar
                    startTime={timeline.range.start}
                    graphData={graphData}
                    onClick={() => {
                      setSelectedPlaybackIdx(tIdx);

                      let startTs;
                      if (timeline.timelineItems.length > 0) {
                        startTs = selectedPlayback.timelineItems[0].timestamp;
                      } else {
                        startTs = timeline.range.start;
                      }

                      controllerRef.current?.seekToTimestamp(startTs, true);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
