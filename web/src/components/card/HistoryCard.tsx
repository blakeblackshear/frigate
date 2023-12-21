import useSWR from "swr";
import PreviewThumbnailPlayer from "../player/PreviewThumbnailPlayer";
import { Card } from "../ui/card";
import { FrigateConfig } from "@/types/frigateConfig";
import ActivityIndicator from "../ui/activity-indicator";
import { LuClock, LuTrash } from "react-icons/lu";
import { HiOutlineVideoCamera } from "react-icons/hi";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import {
  getTimelineIcon,
  getTimelineItemDescription,
} from "@/utils/timelineUtil";

type HistoryCardProps = {
  timeline: Card;
  relevantPreview?: Preview;
  shouldAutoPlay: boolean;
  onClick?: () => void;
  onDelete?: () => void;
};

export default function HistoryCard({
  relevantPreview,
  timeline,
  shouldAutoPlay,
  onClick,
  onDelete,
}: HistoryCardProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <Card
      className="cursor-pointer my-2 xs:mr-2 w-full xs:w-[48%] sm:w-[284px]"
      onClick={onClick}
    >
      <PreviewThumbnailPlayer
        camera={timeline.camera}
        relevantPreview={relevantPreview}
        startTs={Object.values(timeline.entries)[0].timestamp}
        eventId={Object.values(timeline.entries)[0].source_id}
        shouldAutoPlay={shouldAutoPlay}
      />
      <div className="p-2">
        <div className="text-sm flex justify-between items-center">
          <div>
            <LuClock className="h-5 w-5 mr-2 inline" />
            {formatUnixTimestampToDateTime(timeline.time, {
              strftime_fmt:
                config.ui.time_format == "24hour" ? "%H:%M:%S" : "%I:%M:%S %p",
              time_style: "medium",
              date_style: "medium",
            })}
          </div>
          <LuTrash
            className="w-5 h-5 m-1 cursor-pointer"
            stroke="#f87171"
            onClick={(e: Event) => {
              e.stopPropagation();

              if (onDelete) {
                onDelete();
              }
            }}
          />
        </div>
        <div className="capitalize text-sm flex items-center mt-1">
          <HiOutlineVideoCamera className="h-5 w-5 mr-2 inline" />
          {timeline.camera.replaceAll("_", " ")}
        </div>
        <div className="my-2 text-sm font-medium">Activity:</div>
        {Object.entries(timeline.entries).map(([_, entry]) => {
          return (
            <div
              key={entry.timestamp}
              className="flex text-xs capitalize my-1 items-center"
            >
              {getTimelineIcon(entry)}
              {getTimelineItemDescription(entry)}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
