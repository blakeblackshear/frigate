import { useApiHost } from "@/api";
import VideoPlayer from "@/components/player/VideoPlayer";
import ActivityScrubber from "@/components/scrubber/ActivityScrubber";
import { Button } from "@/components/ui/button";
import { getTimelineItemDescription } from "@/utils/timelineUtil";
import { useMemo, useRef, useState } from "react";
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
  const playerRef = useRef<Player | undefined>(undefined);
  const previewRef = useRef<Player | undefined>(undefined);

  const [scrubbing, setScrubbing] = useState(false);

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

  const playbackUri = useMemo(() => {
    if (!playback) {
      return "";
    }

    return `${apiHost}vod/${playback.camera}/start/${playbackTimes.start}/end/${playbackTimes.end}/master.m3u8`;
  }, [playback, playbackTimes]);

  return (
    <>
      <div
        className={
          isMobile ? "" : "absolute left-1/2 -translate-x-1/2 -mr-[640px]"
        }
      >
        <div className={`w-screen 2xl:w-[1280px]`}>
          <div className={`${scrubbing ? "hidden" : "visible"}`}>
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
                  //setSelectedItem(undefined);
                });
              }}
              onDispose={() => {
                playerRef.current = undefined;
              }}
            />
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
