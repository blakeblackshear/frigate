import { baseUrl } from "@/api/baseUrl";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment } from "@/types/review";
import { getIconForLabel } from "@/utils/iconUtil";
import { isSafari } from "react-device-detect";
import useSWR from "swr";
import TimeAgo from "../dynamic/TimeAgo";
import { useMemo } from "react";
import useImageLoaded from "@/hooks/use-image-loaded";
import ImageLoadingIndicator from "../indicators/ImageLoadingIndicator";

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
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();
  const formattedDate = useFormattedTimestamp(
    event.start_time,
    config?.ui.time_format == "24hour" ? "%H:%M" : "%I:%M %p",
  );
  const isSelected = useMemo(
    () =>
      event.start_time <= currentTime &&
      (event.end_time ?? Date.now() / 1000) >= currentTime,
    [event, currentTime],
  );

  return (
    <div
      className="relative flex w-full cursor-pointer flex-col gap-1.5"
      onClick={onClick}
    >
      <ImageLoadingIndicator
        className="absolute inset-0"
        imgLoaded={imgLoaded}
      />
      <img
        ref={imgRef}
        className={`size-full rounded-lg ${isSelected ? "outline outline-[3px] outline-offset-1 outline-selected" : ""} ${imgLoaded ? "visible" : "invisible"}`}
        src={`${baseUrl}${event.thumb_path.replace("/media/frigate/", "")}`}
        loading={isSafari ? "eager" : "lazy"}
        onLoad={() => {
          onImgLoad();
        }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-evenly gap-1">
          {event.data.objects.map((object) => {
            return getIconForLabel(object, "size-3 text-white");
          })}
          {event.data.audio.map((audio) => {
            return getIconForLabel(audio, "size-3 text-white");
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
