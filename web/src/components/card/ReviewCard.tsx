import { baseUrl } from "@/api/baseUrl";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment } from "@/types/review";
import { getIconForLabel, getIconForSubLabel } from "@/utils/iconUtil";
import { isSafari } from "react-device-detect";
import useSWR from "swr";
import TimeAgo from "../dynamic/TimeAgo";
import { useMemo } from "react";

type ReviewCardProps = {
  event: ReviewSegment;
  currentTime: number;
  onClick?: () => void;
};
export default function ReviewCard({
  event,
  currentTime,
  onClick,
}: ReviewCardProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const formattedDate = useFormattedTimestamp(
    event.start_time,
    config?.ui.time_format == "24hour" ? "%H:%M" : "%I:%M %p",
  );
  const isSelected = useMemo(
    () => event.start_time <= currentTime && event.end_time >= currentTime,
    [event, currentTime],
  );

  return (
    <div
      className="w-full flex flex-col gap-1.5 cursor-pointer"
      onClick={onClick}
    >
      <img
        className={`size-full rounded-lg ${isSelected ? "outline outline-3 outline-offset-1 outline-selected" : ""}`}
        src={`${baseUrl}${event.thumb_path.replace("/media/frigate/", "")}`}
        loading={isSafari ? "eager" : "lazy"}
        onLoad={() => {
          //onImgLoad();
        }}
      />
      <div className="flex justify-between items-center">
        <div className="flex justify-evenly items-center gap-1">
          {event.data.objects.map((object) => {
            return getIconForLabel(object, "size-3 text-white");
          })}
          {event.data.audio.map((audio) => {
            return getIconForLabel(audio, "size-3 text-white");
          })}
          {event.data.sub_labels?.map((sub) => {
            return getIconForSubLabel(sub, "size-3 text-white");
          })}
          <div className="font-extra-light text-xs">{formattedDate}</div>
        </div>
        <TimeAgo
          className="text-xs text-muted-foreground"
          time={event.start_time * 1000}
          dense
        />
      </div>
    </div>
  );
}
