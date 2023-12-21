import { useApiHost } from "@/api";
import TimelineEventOverlay from "@/components/overlay/TimelineDataOverlay";
import VideoPlayer from "@/components/player/VideoPlayer";
import ActivityScrubber from "@/components/scrubber/ActivityScrubber";
import ActivityIndicator from "@/components/ui/activity-indicator";
import { FrigateConfig } from "@/types/frigateConfig";
import { getTimelineItemDescription } from "@/utils/timelineUtil";
import { useCallback, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import Player from "video.js/dist/types/player";

type HistoryTimelineViewProps = {
  playback: TimelinePlayback;
  isMobile: boolean;
};

export default function HistoryTimelineView({
  playback,
  isMobile,
}: HistoryTimelineViewProps) {
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

  const annotationOffset = useMemo(() => {
    if (!config) {
      return 0;
    }

    return (
      (config.cameras[playback.camera]?.detect?.annotation_offset || 0) / 1000
    );
  }, [config, playback]);

  const timelineTime = useMemo(() => {
    if (!playback) {
      return 0;
    }

    return playback.timelineItems.at(0)!!.timestamp;
  }, [playback]);
  const playbackTimes = useMemo(() => {
    const date = new Date(timelineTime * 1000);
    date.setMinutes(0, 0, 0);
    const startTime = date.getTime() / 1000;
    date.setHours(date.getHours() + 1);
    const endTime = date.getTime() / 1000;
    return { start: startTime.toFixed(1), end: endTime.toFixed(1) };
  }, [timelineTime]);

  const recordingParams = useMemo(() => {
    return {
      before: playbackTimes.end,
      after: playbackTimes.start,
    };
  }, [playbackTimes]);
  const { data: recordings } = useSWR<Recording[]>(
    playback ? [`${playback.camera}/recordings`, recordingParams] : null,
    { revalidateOnFocus: false }
  );

  const playbackUri = useMemo(() => {
    if (!playback) {
      return "";
    }

    const date = new Date(parseInt(playbackTimes.start) * 1000);
    return `${apiHost}vod/${date.getFullYear()}-${
      date.getMonth() + 1
    }/${date.getDate()}/${date.getHours()}/${
      playback.camera
    }/${timezone.replaceAll("/", ",")}/master.m3u8`;
  }, [playbackTimes]);

  const onSelectItem = useCallback(
    (data: { items: number[] }) => {
      if (data.items.length > 0) {
        const selected = data.items[0];
        setFocusedItem(
          playback.timelineItems.find(
            (timeline) => timeline.timestamp == selected
          )
        );
        playerRef.current?.pause();

        let seekSeconds = 0;
        console.log("recordings are " + recordings?.length);
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
      }
    },
    [annotationOffset, recordings, playerRef]
  );

  if (!config || !recordings) {
    return <ActivityIndicator />;
  }

  return (
    <>
      <div
        className={
          isMobile ? "" : "absolute left-1/2 -translate-x-1/2 -mr-[640px]"
        }
      >
        <div className={`w-screen 2xl:w-[1280px]`}>
          <div className={`relative ${scrubbing ? "hidden" : "visible"}`}>
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
                  timelineTime - parseInt(playbackTimes.start)
                );
                player.on("playing", () => {
                  setFocusedItem(undefined);
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
                    src: `${playback.relevantPreview!!.src}`,
                    type: "video/mp4",
                  },
                ],
              }}
              seekOptions={{}}
              onReady={(player) => {
                previewRef.current = player;
              }}
              onDispose={() => {
                previewRef.current = undefined;
              }}
            />
          </div>
          <ActivityScrubber
            // @ts-ignore
            items={timelineItemsToScrubber(playback.timelineItems)}
            timeBars={[{ time: new Date(timelineTime * 1000), id: "playback" }]}
            options={{
              min: new Date(parseInt(playbackTimes.start) * 1000),
              max: new Date(parseInt(playbackTimes.end) * 1000),
              snap: null,
            }}
            timechangeHandler={(data) => {
              if (!scrubbing) {
                playerRef.current?.pause();
                setScrubbing(true);
              }

              const seekTimestamp = data.time.getTime() / 1000;
              previewRef.current?.currentTime(
                seekTimestamp - playback.relevantPreview!!.start
              );
            }}
            timechangedHandler={(data) => {
              const playbackTime = data.time.getTime() / 1000;
              playerRef.current?.currentTime(
                playbackTime - parseInt(playbackTimes.start)
              );
              setScrubbing(false);
              playerRef.current?.play();
            }}
            selectHandler={onSelectItem}
          />
        </div>
      </div>
    </>
  );
}

function timelineItemsToScrubber(items: Timeline[]) {
  return items.map((item) => {
    return {
      id: item.timestamp,
      content: `<div class="flex"><span>${getTimelineItemDescription(
        item
      )}</span></div>`,
      start: new Date(item.timestamp * 1000),
      end: new Date(item.timestamp * 1000),
      type: "box",
    };
  });
}
