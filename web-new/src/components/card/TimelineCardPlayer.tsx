import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import VideoPlayer from "../player/VideoPlayer";
import { useMemo, useRef, useState } from "react";
import { useApiHost } from "@/api";
import TimelineEventOverlay from "../overlay/TimelineDataOverlay";
import ActivityIndicator from "../ui/activity-indicator";
import { Button } from "../ui/button";
import {
  getTimelineIcon,
  getTimelineItemDescription,
} from "@/utils/timelineUtil";
import { LuAlertCircle } from "react-icons/lu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import Player from "video.js/dist/types/player";

type TimelinePlayerCardProps = {
  timeline?: Card;
  onDismiss: () => void;
};

export default function TimelinePlayerCard({
  timeline,
  onDismiss,
}: TimelinePlayerCardProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const apiHost = useApiHost();
  const playerRef = useRef<Player | undefined>();

  const annotationOffset = useMemo(() => {
    if (!config || !timeline) {
      return 0;
    }

    return (
      (config.cameras[timeline.camera]?.detect?.annotation_offset || 0) / 1000
    );
  }, [config, timeline]);
  const [selectedItem, setSelectedItem] = useState<Timeline | undefined>();

  const recordingParams = useMemo(() => {
    if (!timeline) {
      return {};
    }

    return {
      before: timeline.entries.at(-1)!!.timestamp + 30,
      after: timeline.entries.at(0)!!.timestamp,
    };
  }, [timeline]);

  const { data: recordings } = useSWR<Recording[]>(
    timeline ? [`${timeline.camera}/recordings`, recordingParams] : null,
    { revalidateOnFocus: false }
  );

  const playbackUri = useMemo(() => {
    if (!timeline) {
      return "";
    }

    const end = timeline.entries.at(-1)!!.timestamp + 30;
    const start = timeline.entries.at(0)!!.timestamp;
    return `${apiHost}vod/${timeline?.camera}/start/${
      Number.isInteger(start) ? start.toFixed(1) : start
    }/end/${Number.isInteger(end) ? end.toFixed(1) : end}/master.m3u8`;
  }, [timeline]);

  return (
    <>
      <Dialog
        open={timeline != null}
        onOpenChange={(_) => {
          setSelectedItem(undefined);
          onDismiss();
        }}
      >
        <DialogContent
          className="md:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="capitalize">
              {`${timeline?.camera?.replaceAll(
                "_",
                " "
              )} @ ${formatUnixTimestampToDateTime(timeline?.time ?? 0, {
                strftime_fmt:
                  config?.ui?.time_format == "24hour" ? "%H:%M:%S" : "%I:%M:%S",
              })}`}
            </DialogTitle>
          </DialogHeader>
          {config && timeline && recordings && recordings.length > 0 && (
            <>
              <TimelineSummary
                timeline={timeline}
                annotationOffset={annotationOffset}
                recordings={recordings}
                onFrameSelected={(selected, seekTime) => {
                  setSelectedItem(selected);
                  playerRef.current?.pause();
                  playerRef.current?.currentTime(seekTime);
                }}
              />
              <div className="relative">
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
                    player.on("playing", () => {
                      setSelectedItem(undefined);
                    });
                  }}
                  onDispose={() => {
                    playerRef.current = undefined;
                  }}
                >
                  {selectedItem ? (
                    <TimelineEventOverlay
                      timeline={selectedItem}
                      cameraConfig={config.cameras[timeline.camera]}
                    />
                  ) : undefined}
                </VideoPlayer>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

type TimelineSummaryProps = {
  timeline: Card;
  annotationOffset: number;
  recordings: Recording[];
  onFrameSelected: (timeline: Timeline, frameTime: number) => void;
};

function TimelineSummary({
  timeline,
  annotationOffset,
  recordings,
  onFrameSelected,
}: TimelineSummaryProps) {
  const [timeIndex, setTimeIndex] = useState<number>(-1);

  // calculates the seek seconds by adding up all the seconds in the segments prior to the playback time
  const getSeekSeconds = (seekUnix: number) => {
    if (!recordings) {
      return 0;
    }

    let seekSeconds = 0;
    recordings.every((segment) => {
      // if the next segment is past the desired time, stop calculating
      if (segment.start_time > seekUnix) {
        return false;
      }

      if (segment.end_time < seekUnix) {
        seekSeconds += segment.end_time - segment.start_time;
        return true;
      }

      seekSeconds +=
        segment.end_time - segment.start_time - (segment.end_time - seekUnix);
      return true;
    });

    return seekSeconds;
  };

  const onSelectMoment = async (index: number) => {
    setTimeIndex(index);
    onFrameSelected(
      timeline.entries[index],
      getSeekSeconds(timeline.entries[index].timestamp + annotationOffset)
    );
  };

  if (!timeline || !recordings) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex flex-col">
      <div className="h-12 flex justify-center">
        <div className="flex flex-row flex-nowrap justify-between overflow-auto">
          {timeline.entries.map((item, index) => (
            <TooltipProvider key={item.timestamp}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`m-1 blue ${
                      index == timeIndex ? "text-blue-500" : "text-gray-500"
                    }`}
                    variant="secondary"
                    autoFocus={false}
                    onClick={() => onSelectMoment(index)}
                  >
                    {getTimelineIcon(item)}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getTimelineItemDescription(item)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
      {timeIndex >= 0 ? (
        <div className="max-w-md self-center">
          <div className="flex justify-start">
            <div className="text-sm flex justify-between py-1 items-center">
              Bounding boxes may not align
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <LuAlertCircle />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Disclaimer: This data comes from the detect feed but is
                    shown on the recordings.
                  </p>
                  <p>
                    It is unlikely that the streams are perfectly in sync so the
                    bounding box and the footage will not line up perfectly.
                  </p>
                  <p>The annotation_offset field can be used to adjust this.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      ) : null}
    </div>
  );
}
