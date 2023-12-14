import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import VideoPlayer from "../player/VideoPlayer";
import { useMemo } from "react";
import { useApiHost } from "@/api";

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

  return (
    <>
      <Dialog open={timeline != null} onOpenChange={onDismiss}>
        <DialogContent className="md:max-w-xl lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
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
          {recordings && recordings.length > 0 && (
            <VideoPlayer
              options={{
                preload: "auto",
                autoplay: true,
                sources: [
                  {
                    src: `${apiHost}vod/${timeline?.camera}/start/${recordings
                      .at(0)
                      ?.start_time.toFixed(2)}/end/${recordings
                      .at(-1)
                      ?.end_time.toFixed(2)}/master.m3u8`,
                    type: "application/vnd.apple.mpegurl",
                  },
                ],
              }}
              seekOptions={{ forward: 10, backward: 5 }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
