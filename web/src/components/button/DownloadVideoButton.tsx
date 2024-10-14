import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ActivityIndicator from "../indicators/activity-indicator";
import { FaDownload } from "react-icons/fa";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";

type DownloadVideoButtonProps = {
  source: string;
  camera: string;
  startTime: number;
};

export function DownloadVideoButton({
  source,
  camera,
  startTime,
}: DownloadVideoButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const formattedDate = formatUnixTimestampToDateTime(startTime, {
    strftime_fmt: "%D-%T",
    time_style: "medium",
    date_style: "medium",
  });
  const filename = `${camera}_${formattedDate}.mp4`;

  const handleDownloadStart = () => {
    setIsDownloading(true);
    toast.success("Your review item video has started downloading.", {
      position: "top-center",
    });
  };

  const handleDownloadEnd = () => {
    setIsDownloading(false);
    toast.success("Download completed successfully.", {
      position: "top-center",
    });
  };

  return (
    <div className="flex justify-center">
      <Button
        asChild
        disabled={isDownloading}
        className="flex items-center gap-2"
        size="sm"
      >
        <a
          href={source}
          download={filename}
          onClick={handleDownloadStart}
          onBlur={handleDownloadEnd}
        >
          {isDownloading ? (
            <ActivityIndicator className="size-4" />
          ) : (
            <FaDownload className="size-4 text-secondary-foreground" />
          )}
        </a>
      </Button>
    </div>
  );
}
