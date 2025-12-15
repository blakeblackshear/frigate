import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ConnectionQualityIndicatorProps = {
  quality: "excellent" | "fair" | "poor" | "unusable";
  expectedFps: number;
  reconnects: number;
  stalls: number;
};

export function ConnectionQualityIndicator({
  quality,
  expectedFps,
  reconnects,
  stalls,
}: ConnectionQualityIndicatorProps) {
  const { t } = useTranslation(["views/system"]);

  const getColorClass = (quality: string): string => {
    switch (quality) {
      case "excellent":
        return "bg-success";
      case "fair":
        return "bg-yellow-500";
      case "poor":
        return "bg-orange-500";
      case "unusable":
        return "bg-destructive";
      default:
        return "bg-gray-500";
    }
  };

  const qualityLabel = t(`cameras.connectionQuality.${quality}`);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-block size-3 cursor-pointer rounded-full",
            getColorClass(quality),
          )}
        />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-2">
          <div className="font-semibold">
            {t("cameras.connectionQuality.title")}
          </div>
          <div className="text-sm">
            <div className="capitalize">{qualityLabel}</div>
            <div className="mt-2 space-y-1 text-xs">
              <div>
                {t("cameras.connectionQuality.expectedFps")}:{" "}
                {expectedFps.toFixed(1)} {t("cameras.connectionQuality.fps")}
              </div>
              <div>
                {t("cameras.connectionQuality.reconnectsLastHour")}:{" "}
                {reconnects}
              </div>
              <div>
                {t("cameras.connectionQuality.stallsLastHour")}: {stalls}
              </div>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
