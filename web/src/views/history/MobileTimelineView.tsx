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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import Player from "video.js/dist/types/player";

type MobileTimelineViewProps = {
  playback: TimelinePlayback;
};

export default function MobileTimelineView({
  playback,
}: MobileTimelineViewProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = useMemo(
    () =>
      config?.ui?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    [config]
  );

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
      (config.cameras[playback.camera]?.detect?.annotation_offset || 0) / 1000
    );
  }, [config]);

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

  const playbackUri = useMemo(() => {
    if (!playback) {
      return "";
    }

    const date = new Date(playback.range.start * 1000);
    return `${apiHost}vod/${date.getFullYear()}-${
      date.getMonth() + 1
    }/${date.getDate()}/${date.getHours()}/${
      playback.camera
    }/${timezone.replaceAll("/", ",")}/master.m3u8`;
  }, [playback]);

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
      if (!playback.relevantPreview) {
        return;
      }

      if (playerRef.current?.paused() == false) {
        setScrubbing(true);
        playerRef.current?.pause();
      }

      const seekTimestamp = data.time.getTime() / 1000;
      const seekTime = seekTimestamp - playback.relevantPreview.start;
      setTimelineTime(seekTimestamp);
      setTimeToSeek(Math.round(seekTime));
    },
    [scrubbing, playerRef, playback]
  );

  const onStopScrubbing = useCallback(
    (data: { time: Date }) => {
      const playbackTime = data.time.getTime() / 1000;
      playerRef.current?.currentTime(playbackTime - playback.range.start);
      setScrubbing(false);
      playerRef.current?.play();
    },
    [playback, playerRef]
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
                autoplay: true,
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
                player.pause();
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
                const selected = parseFloat(data.items[0].split("-")[0]);

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
