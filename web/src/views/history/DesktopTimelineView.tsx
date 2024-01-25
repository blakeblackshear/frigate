import { useApiHost } from "@/api";
import TimelineEventOverlay from "@/components/overlay/TimelineDataOverlay";
import VideoPlayer from "@/components/player/VideoPlayer";
import ActivityScrubber from "@/components/scrubber/ActivityScrubber";
import ActivityIndicator from "@/components/ui/activity-indicator";
import { FrigateConfig } from "@/types/frigateConfig";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import Player from "video.js/dist/types/player";
import TimelineItemCard from "@/components/card/TimelineItemCard";
import { getTimelineHoursForDay } from "@/utils/historyUtil";
import { GraphDataPoint } from "@/types/graph";
import TimelineGraph from "@/components/graph/TimelineGraph";

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
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = useMemo(
    () =>
      config?.ui?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    [config]
  );

  const [selectedPlayback, setSelectedPlayback] = useState(initialPlayback);

  const playerRef = useRef<Player | undefined>(undefined);
  const previewRef = useRef<Player | undefined>(undefined);
  const initialScrollRef = useRef<HTMLDivElement | null>(null);

  const [scrubbing, setScrubbing] = useState(false);
  const [focusedItem, setFocusedItem] = useState<Timeline | undefined>(
    undefined
  );

  const [seeking, setSeeking] = useState(false);
  const [timeToSeek, setTimeToSeek] = useState<number | undefined>(undefined);
  const [timelineTime, setTimelineTime] = useState(
    initialPlayback.timelineItems.length > 0
      ? initialPlayback.timelineItems[0].timestamp - initialPlayback.range.start
      : 0
  );

  const annotationOffset = useMemo(() => {
    if (!config) {
      return 0;
    }

    return (
      (config.cameras[initialPlayback.camera]?.detect?.annotation_offset || 0) /
      1000
    );
  }, [config]);

  const recordingParams = useMemo(() => {
    return {
      before: selectedPlayback.range.end,
      after: selectedPlayback.range.start,
    };
  }, [selectedPlayback]);
  const { data: recordings } = useSWR<Recording[]>(
    selectedPlayback
      ? [`${selectedPlayback.camera}/recordings`, recordingParams]
      : null,
    { revalidateOnFocus: false }
  );

  const playbackUri = useMemo(() => {
    if (!selectedPlayback) {
      return "";
    }

    const date = new Date(selectedPlayback.range.start * 1000);
    return `${apiHost}vod/${date.getFullYear()}-${
      date.getMonth() + 1
    }/${date.getDate()}/${date.getHours()}/${
      selectedPlayback.camera
    }/${timezone.replaceAll("/", ",")}/master.m3u8`;
  }, [selectedPlayback]);

  const onSelectItem = useCallback(
    (timeline: Timeline | undefined) => {
      if (timeline) {
        setFocusedItem(timeline);
        const selected = timeline.timestamp;
        playerRef.current?.pause();

        let seekSeconds = 0;
        (recordings || []).every((segment) => {
          // if the next segment is past the desired time, stop calculating
          if (segment.start_time > selected) {
            return false;
          }

          if (segment.end_time < selected) {
            seekSeconds += segment.end_time - segment.start_time;
            return true;
          }

          seekSeconds +=
            segment.end_time -
            segment.start_time -
            (segment.end_time - selected);
          return true;
        });
        playerRef.current?.currentTime(seekSeconds);
      } else {
        setFocusedItem(undefined);
      }
    },
    [annotationOffset, recordings, playerRef]
  );

  // handle scrolling to initial timeline item
  useEffect(() => {
    if (initialScrollRef.current != null) {
      initialScrollRef.current.scrollIntoView();
    }
  }, [initialScrollRef]);

  // handle seeking to next frame when seek is finished
  useEffect(() => {
    if (seeking) {
      return;
    }

    if (timeToSeek && !scrubbing) {
      setScrubbing(true);
      playerRef.current?.pause();
    }

    if (timeToSeek && timeToSeek != previewRef.current?.currentTime()) {
      setSeeking(true);
      previewRef.current?.currentTime(timeToSeek);
    }
  }, [timeToSeek, seeking]);

  // handle loading main / preview playback when selected hour changes
  useEffect(() => {
    if (!playerRef.current) {
      return;
    }

    setTimelineTime(
      selectedPlayback.timelineItems.length > 0
        ? selectedPlayback.timelineItems[0].timestamp
        : selectedPlayback.range.start
    );

    playerRef.current.src({
      src: playbackUri,
      type: "application/vnd.apple.mpegurl",
    });

    if (selectedPlayback.relevantPreview && previewRef.current) {
      previewRef.current.src({
        src: selectedPlayback.relevantPreview.src,
        type: selectedPlayback.relevantPreview.type,
      });
    }
  }, [playerRef, previewRef, playbackUri]);

  const timelineStack = useMemo(
    () =>
      getTimelineHoursForDay(
        selectedPlayback.camera,
        timelineData,
        allPreviews,
        selectedPlayback.range.start + 60
      ),
    []
  );

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
    <div className="w-full">
      <div className="flex">
        <>
          <div className="w-2/3 bg-black flex justify-center items-center">
            <div
              className={`w-full relative ${
                selectedPlayback.relevantPreview != undefined && scrubbing
                  ? "hidden"
                  : "visible"
              }`}
            >
              <VideoPlayer
                options={{
                  preload: "auto",
                  autoplay: true,
                  sources: [
                    {
                      src: playbackUri,
                      type: "application/vnd.apple.mpegurl",
                    },
                  ],
                  controlBar: {
                    remainingTimeDisplay: false,
                    progressControl: {
                      seekBar: false,
                    },
                  },
                }}
                seekOptions={{ forward: 10, backward: 5 }}
                onReady={(player) => {
                  playerRef.current = player;

                  if (selectedPlayback.timelineItems.length > 0) {
                    player.currentTime(
                      selectedPlayback.timelineItems[0].timestamp -
                        selectedPlayback.range.start
                    );
                  } else {
                    player.currentTime(0);
                  }
                  player.on("playing", () => onSelectItem(undefined));
                  player.on("timeupdate", () => {
                    setTimelineTime(Math.floor(player.currentTime() || 0));
                  });
                }}
                onDispose={() => {
                  playerRef.current = undefined;
                }}
              >
                {focusedItem && (
                  <TimelineEventOverlay
                    timeline={focusedItem}
                    cameraConfig={config.cameras[selectedPlayback.camera]}
                  />
                )}
              </VideoPlayer>
            </div>
            {selectedPlayback.relevantPreview && (
              <div className={`w-full ${scrubbing ? "visible" : "hidden"}`}>
                <VideoPlayer
                  options={{
                    preload: "auto",
                    autoplay: false,
                    controls: false,
                    muted: true,
                    loadingSpinner: false,
                    sources: [
                      {
                        src: `${selectedPlayback.relevantPreview?.src}`,
                        type: "video/mp4",
                      },
                    ],
                  }}
                  seekOptions={{}}
                  onReady={(player) => {
                    previewRef.current = player;
                    player.on("seeked", () => setSeeking(false));
                  }}
                  onDispose={() => {
                    previewRef.current = undefined;
                  }}
                />
              </div>
            )}
          </div>
        </>
        <div className="px-2 h-[608px] w-1/3 overflow-auto">
          {selectedPlayback.timelineItems.map((timeline) => {
            return (
              <TimelineItemCard
                key={timeline.timestamp}
                timeline={timeline}
                relevantPreview={selectedPlayback.relevantPreview}
                onSelect={() => onSelectItem(timeline)}
              />
            );
          })}
        </div>
      </div>
      <div className="m-1 w-full max-h-72 2xl:max-h-80 3xl:max-h-96 overflow-auto">
        {timelineStack.playbackItems.map((timeline) => {
          const isInitiallySelected =
            initialPlayback.range.start == timeline.range.start;
          const isSelected =
            timeline.range.start == selectedPlayback.range.start;
          const graphData = timelineGraphData[timeline.range.start];

          return (
            <div
              ref={isInitiallySelected ? initialScrollRef : null}
              key={timeline.range.start}
              className={`relative p-2 ${
                isSelected ? "bg-secondary bg-opacity-30 rounded-md" : ""
              }`}
            >
              <ActivityScrubber
                items={[]}
                timeBars={
                  isSelected
                    ? [
                        {
                          time: new Date(
                            (timeline.range.start + timelineTime) * 1000
                          ),
                          id: "playback",
                        },
                      ]
                    : []
                }
                options={{
                  snap: null,
                  min: new Date(timeline.range.start * 1000),
                  max: new Date(timeline.range.end * 1000),
                  zoomable: false,
                }}
                timechangeHandler={(data) => {
                  if (!timeline.relevantPreview) {
                    return;
                  }

                  const seekTimestamp = data.time.getTime() / 1000;
                  const seekTime =
                    seekTimestamp - timeline.relevantPreview.start;
                  setTimelineTime(seekTimestamp - timeline.range.start);
                  setTimeToSeek(Math.round(seekTime));
                }}
                timechangedHandler={(data) => {
                  const playbackTime = data.time.getTime() / 1000;
                  playerRef.current?.currentTime(
                    playbackTime - timeline.range.start
                  );
                  setScrubbing(false);
                  playerRef.current?.play();
                }}
                selectHandler={(data) => {
                  if (data.items.length > 0) {
                    const selected = data.items[0];
                    onSelectItem(
                      selectedPlayback.timelineItems.find(
                        (timeline) => timeline.timestamp == selected
                      )
                    );
                  }
                }}
                doubleClickHandler={() => {
                  setScrubbing(false);
                  setSelectedPlayback(timeline);
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
          );
        })}
      </div>
    </div>
  );
}
