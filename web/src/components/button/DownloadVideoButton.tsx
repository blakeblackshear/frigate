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

  const handleDownload = async () => {
    setIsDownloading(true);
    const formattedDate = formatUnixTimestampToDateTime(startTime, {
      strftime_fmt: "%D-%T",
      time_style: "medium",
      date_style: "medium",
    });
    const filename = `${camera}_${formattedDate}.mp4`;

    try {
      const response = await fetch(source);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(
        "Your review item video has been downloaded successfully.",
        {
          position: "top-center",
        },
      );
    } catch (error) {
      toast.error(
        "There was an error downloading the review item video. Please try again.",
        {
          position: "top-center",
        },
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex justify-center">
      <Button
        onClick={handleDownload}
        disabled={isDownloading}
        className="flex items-center gap-2"
        size="sm"
      >
        {isDownloading ? (
          <ActivityIndicator className="h-4 w-4" />
        ) : (
          <FaDownload className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
