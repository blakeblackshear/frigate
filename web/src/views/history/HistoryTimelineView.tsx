import { useApiHost } from "@/api";
import TimelineEventOverlay from "@/components/overlay/TimelineDataOverlay";
import VideoPlayer from "@/components/player/VideoPlayer";
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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import Player from "video.js/dist/types/player";
import TimelineItemCard from "@/components/card/TimelineItemCard";
import { getTimelineHoursForDay } from "@/utils/historyUtil";

type HistoryTimelineViewProps = {
  timelineData: CardsData;
  allPreviews: Preview[];
  initialPlayback: TimelinePlayback;
  isMobile: boolean;
};

export default function HistoryTimelineView({
  timelineData,
  allPreviews,
  initialPlayback,
  isMobile,
}: HistoryTimelineViewProps) {
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

  const [scrubbing, setScrubbing] = useState(false);
  const [focusedItem, setFocusedItem] = useState<Timeline | undefined>(
    undefined
  );

  const [seeking, setSeeking] = useState(false);
  const [timeToSeek, setTimeToSeek] = useState<number | undefined>(undefined);

  const annotationOffset = useMemo(() => {
    if (!config) {
      return 0;
    }

    return (
      (config.cameras[initialPlayback.camera]?.detect?.annotation_offset || 0) /
      1000
    );
  }, [config]);

  const timelineTime = useMemo(() => {
    if (!selectedPlayback || selectedPlayback.timelineItems.length == 0) {
      return 0;
    }

    return selectedPlayback.timelineItems.at(0)!!.timestamp;
  }, [selectedPlayback]);

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

  const onScrubTime = useCallback(
    (data: { time: Date }) => {
      if (!selectedPlayback.relevantPreview) {
        return;
      }

      if (playerRef.current?.paused() == false) {
        setScrubbing(true);
        playerRef.current?.pause();
      }

      const seekTimestamp = data.time.getTime() / 1000;
      const seekTime = seekTimestamp - selectedPlayback.relevantPreview!!.start;
      setTimeToSeek(Math.round(seekTime));
    },
    [scrubbing, playerRef, selectedPlayback]
  );

  const onStopScrubbing = useCallback(
    (data: { time: Date }) => {
      const playbackTime = data.time.getTime() / 1000;
      playerRef.current?.currentTime(
        playbackTime - selectedPlayback.range.start
      );
      setScrubbing(false);
      playerRef.current?.play();
    },
    [selectedPlayback, playerRef]
  );

  // handle seeking to next frame when seek is finished
  useEffect(() => {
    if (seeking) {
      return;
    }

    if (timeToSeek && timeToSeek != previewRef.current?.currentTime()) {
      setSeeking(true);
      previewRef.current?.currentTime(timeToSeek);
    }
  }, [timeToSeek, seeking]);

  if (!config || !recordings) {
    return <ActivityIndicator />;
  }

  if (isMobile) {
    return (
      <MobileView
        config={config}
        playerRef={playerRef}
        previewRef={previewRef}
        playback={selectedPlayback}
        playbackUri={playbackUri}
        timelineTime={timelineTime}
        scrubbing={scrubbing}
        focusedItem={focusedItem}
        setSeeking={setSeeking}
        onSelectItem={onSelectItem}
        onScrubTime={onScrubTime}
        onStopScrubbing={onStopScrubbing}
      />
    );
  }

  return (
    <DesktopView
      config={config}
      playerRef={playerRef}
      previewRef={previewRef}
      timelineData={timelineData}
      allPreviews={allPreviews}
      selectedPlayback={selectedPlayback}
      setSelectedPlayback={setSelectedPlayback}
      playbackUri={playbackUri}
      timelineTime={timelineTime}
      scrubbing={scrubbing}
      focusedItem={focusedItem}
      setSeeking={setSeeking}
      onSelectItem={onSelectItem}
      onScrubTime={onScrubTime}
      onStopScrubbing={onStopScrubbing}
    />
  );
}

type DesktopViewProps = {
  config: FrigateConfig;
  playerRef: React.MutableRefObject<Player | undefined>;
  previewRef: React.MutableRefObject<Player | undefined>;
  timelineData: CardsData;
  allPreviews: Preview[];
  selectedPlayback: TimelinePlayback;
  setSelectedPlayback: (timeline: TimelinePlayback) => void;
  playbackUri: string;
  timelineTime: number;
  scrubbing: boolean;
  focusedItem: Timeline | undefined;
  setSeeking: (seeking: boolean) => void;
  onSelectItem: (timeline: Timeline | undefined) => void;
  onScrubTime: ({ time }: { time: Date }) => void;
  onStopScrubbing: ({ time }: { time: Date }) => void;
};
function DesktopView({
  config,
  playerRef,
  previewRef,
  timelineData,
  allPreviews,
  selectedPlayback,
  setSelectedPlayback,
  playbackUri,
  timelineTime,
  scrubbing,
  focusedItem,
  setSeeking,
  onSelectItem,
  onScrubTime,
  onStopScrubbing,
}: DesktopViewProps) {
  const timelineStack = useMemo(
    () =>
      getTimelineHoursForDay(
        selectedPlayback.camera,
        timelineData,
        allPreviews,
        timelineTime
      ),
    []
  );

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
                }}
                seekOptions={{ forward: 10, backward: 5 }}
                onReady={(player) => {
                  playerRef.current = player;
                  player.currentTime(
                    timelineTime - selectedPlayback.range.start
                  );
                  player.on("playing", () => {
                    onSelectItem(undefined);
                  });
                }}
                onDispose={() => {
                  playerRef.current = undefined;
                }}
              >
                {config && focusedItem ? (
                  <TimelineEventOverlay
                    timeline={focusedItem}
                    cameraConfig={config.cameras[selectedPlayback.camera]}
                  />
                ) : undefined}
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
        <div className="px-2 h-[608px] overflow-auto">
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
      <div className="m-1 max-h-72 2xl:max-h-80 3xl:max-h-96 overflow-auto">
        {timelineStack.map((timeline) => {
          const isSelected =
            timeline.range.start == selectedPlayback.range.start;

          return (
            <div className={`${isSelected ? "border border-primary" : ""}`}>
              <ActivityScrubber
                key={timeline.range.start}
                items={[]}
                timeBars={
                  isSelected && selectedPlayback.relevantPreview
                    ? [{ time: new Date(timelineTime * 1000), id: "playback" }]
                    : []
                }
                options={{
                  snap: null,
                  min: new Date(timeline.range.start * 1000),
                  max: new Date(timeline.range.end * 1000),
                  zoomable: false,
                }}
                timechangeHandler={onScrubTime}
                timechangedHandler={onStopScrubbing}
                doubleClickHandler={() => {
                  setSelectedPlayback(timeline);
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
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

type MobileViewProps = {
  config: FrigateConfig;
  playerRef: React.MutableRefObject<Player | undefined>;
  previewRef: React.MutableRefObject<Player | undefined>;
  playback: TimelinePlayback;
  playbackUri: string;
  timelineTime: number;
  scrubbing: boolean;
  focusedItem: Timeline | undefined;
  setSeeking: (seeking: boolean) => void;
  onSelectItem: (timeline: Timeline | undefined) => void;
  onScrubTime: ({ time }: { time: Date }) => void;
  onStopScrubbing: ({ time }: { time: Date }) => void;
};
function MobileView({
  config,
  playerRef,
  previewRef,
  playback,
  playbackUri,
  timelineTime,
  scrubbing,
  focusedItem,
  setSeeking,
  onSelectItem,
  onScrubTime,
  onStopScrubbing,
}: MobileViewProps) {
  return (
    <div className="w-full">
      <>
        <div
          className={`relative ${
            playback.relevantPreview && scrubbing ? "hidden" : "visible"
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
            }}
            seekOptions={{ forward: 10, backward: 5 }}
            onReady={(player) => {
              playerRef.current = player;
              player.currentTime(timelineTime - playback.range.start);
              player.on("playing", () => {
                onSelectItem(undefined);
              });
            }}
            onDispose={() => {
              playerRef.current = undefined;
            }}
          >
            {config && focusedItem ? (
              <TimelineEventOverlay
                timeline={focusedItem}
                cameraConfig={config.cameras[playback.camera]}
              />
            ) : undefined}
          </VideoPlayer>
        </div>
        {playback.relevantPreview && (
          <div className={`${scrubbing ? "visible" : "hidden"}`}>
            <VideoPlayer
              options={{
                preload: "auto",
                autoplay: false,
                controls: false,
                muted: true,
                loadingSpinner: false,
                sources: [
                  {
                    src: `${playback.relevantPreview?.src}`,
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
      </>
      <div className="m-1">
        {playback != undefined && (
          <ActivityScrubber
            items={timelineItemsToScrubber(playback.timelineItems)}
            timeBars={
              playback.relevantPreview
                ? [{ time: new Date(timelineTime * 1000), id: "playback" }]
                : []
            }
            options={{
              start: new Date(
                Math.max(playback.range.start, timelineTime - 300) * 1000
              ),
              end: new Date(
                Math.min(playback.range.end, timelineTime + 300) * 1000
              ),
              snap: null,
              min: new Date(playback.range.start * 1000),
              max: new Date(playback.range.end * 1000),
              timeAxis: { scale: "minute", step: 5 },
            }}
            timechangeHandler={onScrubTime}
            timechangedHandler={onStopScrubbing}
            selectHandler={(data) => {
              if (data.items.length > 0) {
                const selected = data.items[0];
                onSelectItem(
                  playback.timelineItems.find(
                    (timeline) => timeline.timestamp == selected
                  )
                );
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function timelineItemsToScrubber(items: Timeline[]): ScrubberItem[] {
  return items.map((item) => {
    return {
      id: item.timestamp,
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
