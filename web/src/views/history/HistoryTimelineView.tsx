import { useApiHost } from "@/api";
import VideoPlayer from "@/components/player/VideoPlayer";
import ActivityScrubber from "@/components/scrubber/ActivityScrubber";
import {
  getTimelineIcon,
  getTimelineItemDescription,
} from "@/utils/timelineUtil";
import { useMemo, useRef, useState } from "react";
import { LuDog } from "react-icons/lu";
import Player from "video.js/dist/types/player";

type HistoryTimelineViewProps = {
  card: Card;
  isMobile: boolean;
};

export default function HistoryTimelineView({
  card,
  isMobile,
}: HistoryTimelineViewProps) {
  const apiHost = useApiHost();
  const playerRef = useRef<Player | undefined>(undefined);
  const previewRef = useRef<Player | undefined>(undefined);

  const [scrubbing, setScrubbing] = useState(false);
  const relevantPreview = {
    src: "http://localhost:5173/clips/previews/side_cam/1703174400.071426-1703178000.011979.mp4",
    start: 1703174400.071426,
    end: 1703178000.011979,
  };

  const timelineTime = useMemo(() => card.entries.at(0)!!.timestamp, [card]);
  const playbackTimes = useMemo(() => {
    const date = new Date(timelineTime * 1000);
    date.setMinutes(0, 0, 0);
    const startTime = date.getTime() / 1000;
    date.setHours(date.getHours() + 1);
    const endTime = date.getTime() / 1000;
    return { start: startTime.toFixed(1), end: endTime.toFixed(1) };
  }, [timelineTime]);

  const playbackUri = useMemo(() => {
    if (!card) {
      return "";
    }

    return `${apiHost}vod/${card?.camera}/start/${playbackTimes.start}/end/${playbackTimes.end}/master.m3u8`;
  }, [card, playbackTimes]);

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
                    src: `${relevantPreview.src}`,
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
            items={timelineItemsToScrubber(card.entries)}
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
                seekTimestamp - relevantPreview.start
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
