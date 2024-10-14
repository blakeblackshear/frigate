import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ActivityIndicator from "../indicators/activity-indicator";
import { FaDownload } from "react-icons/fa";

type DownloadVideoButtonProps = {
  source: string;
};

export function DownloadVideoButton({ source }: DownloadVideoButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(source);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "video.mp4";
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
