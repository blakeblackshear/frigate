import { getTimelineItemDescription } from "@/utils/timelineUtil";
import { Button } from "../ui/button";
import Logo from "../Logo";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import VideoPlayer from "../player/VideoPlayer";
import { Card } from "../ui/card";

type TimelineItemCardProps = {
  timeline: Timeline;
  relevantPreview: Preview | undefined;
  onSelect: () => void;
};
export default function TimelineItemCard({
  timeline,
  relevantPreview,
  onSelect,
}: TimelineItemCardProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  return (
    <Card className="relative m-2 flex w-full h-32 cursor-pointer" onClick={onSelect}>
      <div className="w-1/2 p-2">
        {relevantPreview && (
          <VideoPlayer
            options={{
              preload: "auto",
              height: "114",
              width: "202",
              autoplay: true,
              controls: false,
              fluid: false,
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
              player.pause(); // autoplay + pause is required for iOS
              player.currentTime(timeline.timestamp - relevantPreview.start);
            }}
          />
        )}
      </div>
      <div className="px-2 py-1 w-1/2">
        <div className="capitalize font-semibold text-sm">
          {getTimelineItemDescription(timeline)}
        </div>
        <div className="text-sm">
          {formatUnixTimestampToDateTime(timeline.timestamp, {
            strftime_fmt:
              config?.ui.time_format == "24hour" ? "%H:%M:%S" : "%I:%M:%S %p",
            time_style: "medium",
            date_style: "medium",
          })}
        </div>
        <Button
          className="absolute bottom-1 right-1"
          size="sm"
          variant="secondary"
        >
          <div className="w-8 h-8">
            <Logo />
          </div>
          +
        </Button>
      </div>
    </Card>
  );
}
