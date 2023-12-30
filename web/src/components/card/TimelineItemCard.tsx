import { getTimelineItemDescription } from "@/utils/timelineUtil";
import { Button } from "../ui/button";
import Logo from "../Logo";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";

type TimelineItemCardProps = {
  timeline: Timeline;
  relevantPreview: Preview | undefined;
};
export default function TimelineItemCard({
  timeline,
  relevantPreview,
}: TimelineItemCardProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  return (
    <div className="relative m-2 flex h-24">
      <div className="w-1/2 bg-black"></div>
      <div className="px-1 w-1/2">
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
          className="absolute bottom-0 right-0"
          size="sm"
          variant="secondary"
        >
          <div className="w-8 h-8">
            <Logo />
          </div>
          +
        </Button>
      </div>
    </div>
  );
}
