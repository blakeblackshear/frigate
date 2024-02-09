import { getTimelineItemDescription } from "@/utils/timelineUtil";
import { Button } from "../ui/button";
import Logo from "../Logo";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import VideoPlayer from "../player/VideoPlayer";
import { Card } from "../ui/card";
import { useApiHost } from "@/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { useCallback } from "react";
import axios from "axios";

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
  const apiHost = useApiHost();

  const onSubmitToPlus = useCallback(
    async (falsePositive: boolean) => {
      falsePositive
        ? await axios.put(`events/${timeline.source_id}/false_positive`)
        : await axios.post(`events/${timeline.source_id}/plus`, {
            include_annotation: 1,
          });
    },
    [timeline]
  );

  return (
    <Card
      className="relative mx-2 mb-2 flex w-full h-20 xl:h-24 3xl:h-28 4xl:h-36 cursor-pointer"
      onClick={onSelect}
    >
      <div className="w-32 xl:w-40 3xl:w-44 4xl:w-60 p-2">
        <VideoPlayer
          options={{
            preload: "auto",
            autoplay: true,
            controls: false,
            aspectRatio: "16:9",
            muted: true,
            loadingSpinner: false,
            poster: relevantPreview
              ? ""
              : `${apiHost}api/preview/${timeline.camera}/${timeline.timestamp}/thumbnail.jpg`,
            sources: relevantPreview
              ? [
                  {
                    src: `${relevantPreview.src}`,
                    type: "video/mp4",
                  },
                ]
              : [],
          }}
          seekOptions={{}}
          onReady={(player) => {
            if (relevantPreview) {
              player.pause(); // autoplay + pause is required for iOS
              player.currentTime(timeline.timestamp - relevantPreview.start);
            }
          }}
        />
      </div>
      <div className="py-1">
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
        {timeline.source == "tracked_object" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="absolute bottom-1 right-1 hidden xl:flex"
                size="sm"
                variant="secondary"
              >
                <div className="w-8 h-8">
                  <Logo />
                </div>
                +
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit To Frigate+</AlertDialogTitle>
                <AlertDialogDescription>
                  Objects in locations you want to avoid are not false
                  positives. Submitting them as false positives will confuse the
                  model.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <img
                className="flex-grow-0"
                src={`${apiHost}api/events/${timeline.source_id}/snapshot.jpg`}
                alt={`${timeline.data.label}`}
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-success"
                  onClick={() => onSubmitToPlus(false)}
                >
                  This is a {timeline.data.label}
                </AlertDialogAction>
                <AlertDialogAction
                  className="bg-danger"
                  onClick={() => onSubmitToPlus(true)}
                >
                  This is not a {timeline.data.label}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </Card>
  );
}
