import TimeAgo from "@/components/dynamic/TimeAgo";
import PreviewThumbnailPlayer from "@/components/player/PreviewThumbnailPlayer";
import ActivityIndicator from "@/components/ui/activity-indicator";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment, ReviewSeverity } from "@/types/review";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { useMemo, useState } from "react";
import { LuCalendar, LuFilter, LuVideo } from "react-icons/lu";
import { MdCircle } from "react-icons/md";
import useSWR from "swr";

export default function Events() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [severity, setSeverity] = useState<ReviewSeverity>("alert");

  const { data: reviewSegments } = useSWR<ReviewSegment[]>([
    "review",
    { limit: 500 },
  ]);

  const previewTimes = useMemo(() => {
    if (!reviewSegments) {
      return undefined;
    }

    const startDate = new Date();
    startDate.setMinutes(0, 0, 0);

    const endDate = new Date(reviewSegments.at(-1)!!.end_time);
    endDate.setHours(0, 0, 0, 0);
    return {
      start: startDate.getTime() / 1000,
      end: endDate.getTime() / 1000,
    };
  }, [reviewSegments]);
  const { data: allPreviews } = useSWR<Preview[]>(
    previewTimes
      ? `preview/all/start/${previewTimes.start}/end/${previewTimes.end}`
      : null,
    { revalidateOnFocus: false }
  );

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <>
      <div className="w-full flex justify-between">
        <ToggleGroup
          type="single"
          defaultValue="alert"
          size="sm"
          onValueChange={(value: ReviewSeverity) => setSeverity(value)}
        >
          <ToggleGroupItem
            className={`px-3 py-4 rounded-2xl ${
              severity == "alert" ? "" : "text-gray-500"
            }`}
            value="alert"
            aria-label="Select alerts"
          >
            <MdCircle className="w-2 h-2 mr-[10px] text-danger" />
            Alerts
          </ToggleGroupItem>
          <ToggleGroupItem
            className={`px-3 py-4 rounded-2xl ${
              severity == "detection" ? "" : "text-gray-500"
            }`}
            value="detection"
            aria-label="Select detections"
          >
            <MdCircle className="w-2 h-2 mr-[10px] text-orange-400" />
            Detections
          </ToggleGroupItem>
          <ToggleGroupItem
            className={`px-3 py-4 rounded-2xl ${
              severity == "significant_motion" ? "" : "text-gray-500"
            }`}
            value="significant_motion"
            aria-label="Select motion"
          >
            <MdCircle className="w-2 h-2 mr-[10px] text-yellow-400" />
            Motion
          </ToggleGroupItem>
        </ToggleGroup>
        <div>
          <Button className="mx-1" variant="secondary">
            <LuVideo className=" mr-[10px]" />
            All Cameras
          </Button>
          <Button className="mx-1" variant="secondary">
            <LuCalendar className=" mr-[10px]" />
            Fab 17
          </Button>
          <Button className="mx-1" variant="secondary">
            <LuFilter className=" mr-[10px]" />
            Filter
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {reviewSegments?.map((value) => {
          if (value.severity == severity) {
            const detectConfig = config.cameras[value.camera].detect;
            const relevantPreview = Object.values(allPreviews || []).find(
              (preview) =>
                preview.camera == value.camera &&
                preview.start < value.start_time &&
                preview.end > value.end_time
            );

            return (
              <div
                className="relative h-[234px] rounded-2xl overflow-hidden"
                style={{
                  aspectRatio: detectConfig.width / detectConfig.height,
                }}
              >
                {relevantPreview ? (
                  <PreviewThumbnailPlayer
                    relevantPreview={relevantPreview}
                    camera={value.camera}
                    startTs={value.start_time}
                    isMobile={false}
                    eventId=""
                  />
                ) : (
                  <div>
                    {value.camera} {value.data.objects}
                  </div>
                )}
                <div className="absolute left-1 right-1 bottom-1 flex justify-between">
                  <TimeAgo time={value.start_time * 1000} />
                  {formatUnixTimestampToDateTime(value.start_time, {
                    strftime_fmt:
                      config.ui.time_format == "24hour"
                        ? "%b %-d, %H:%M"
                        : "%b %-d, %I:%M %p",
                  })}
                </div>
              </div>
            );
          }
        })}
      </div>
    </>
  );
}
