import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FaDownload } from "react-icons/fa";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useDateLocale } from "@/hooks/use-date-locale";
import { useMemo } from "react";

type DownloadVideoButtonProps = {
  source: string;
  camera: string;
  startTime: number;
  className?: string;
};

export function DownloadVideoButton({
  source,
  camera,
  startTime,
  className,
}: DownloadVideoButtonProps) {
  const { t } = useTranslation(["components/input"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const locale = useDateLocale();

  const timeFormat = config?.ui.time_format === "24hour" ? "24hour" : "12hour";
  const format = useMemo(() => {
    return t(`time.formattedTimestampFilename.${timeFormat}`, { ns: "common" });
  }, [t, timeFormat]);

  const formattedDate = formatUnixTimestampToDateTime(startTime, {
    date_format: format,
    locale,
  });
  const filename = `${camera}_${formattedDate}.mp4`;

  const handleDownloadStart = () => {
    toast.success(t("button.downloadVideo.toast.success"), {
      position: "top-center",
    });
  };

  return (
    <div className="flex justify-center">
      <Button
        asChild
        className="flex items-center gap-2"
        size="sm"
        aria-label={t("button.downloadVideo.label")}
      >
        <a href={source} download={filename} onClick={handleDownloadStart}>
          <FaDownload
            className={cn("size-4 text-secondary-foreground", className)}
          />
        </a>
      </Button>
    </div>
  );
}
