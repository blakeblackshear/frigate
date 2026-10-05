import ActivityIndicator from "@/components/indicators/activity-indicator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LivePlayerMode, WebRTCUnavailableReason } from "@/types/live";
import { LuX } from "react-icons/lu";
import { useTranslation } from "react-i18next";

type StreamTechnologySelectProps = {
  value: LivePlayerMode;
  onValueChange: (value: LivePlayerMode) => void;
  isWebRTCAvailable: boolean;
  webRTCUnavailableReason?: WebRTCUnavailableReason;
  disabled: boolean;
};

export default function StreamTechnologySelect({
  value,
  onValueChange,
  isWebRTCAvailable,
  webRTCUnavailableReason,
  disabled,
}: StreamTechnologySelectProps) {
  const { t } = useTranslation(["views/live"]);

  const isChecking = webRTCUnavailableReason === "checking";

  return (
    <Select
      value={value}
      onValueChange={onValueChange as (value: string) => void}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <span>{t(`stream.technology.name.${value}`)}</span>
      </SelectTrigger>
      <SelectContent className="w-[var(--radix-select-trigger-width)]">
        <SelectItem value="mse">
          <span className="flex flex-col gap-0.5 whitespace-normal">
            <span>{t("stream.technology.name.mse")}</span>
            <span className="text-xs text-muted-foreground">
              {t("stream.technology.tips.mse")}
            </span>
          </span>
        </SelectItem>
        <SelectItem
          value="webrtc"
          disabled={!isWebRTCAvailable}
          className="data-[disabled]:opacity-100"
        >
          <span className="flex flex-col gap-0.5 whitespace-normal">
            <span className={cn(!isWebRTCAvailable && "opacity-50")}>
              {t("stream.technology.name.webrtc")}
            </span>
            <span
              className={cn(
                "text-xs text-muted-foreground",
                !isWebRTCAvailable && "opacity-50",
              )}
            >
              {t("stream.technology.tips.webrtc")}
            </span>
            {!isWebRTCAvailable && webRTCUnavailableReason && (
              <span
                className={cn(
                  "mt-1 flex flex-row items-start gap-1.5 rounded-md border p-2",
                  isChecking
                    ? "border-secondary-foreground/20 bg-secondary-foreground/10"
                    : "border-danger/20 bg-danger/10",
                )}
              >
                {isChecking ? (
                  <ActivityIndicator
                    className="mt-0.5 size-3.5 shrink-0"
                    size={14}
                  />
                ) : (
                  <LuX className="mt-0.5 size-3.5 shrink-0 text-danger" />
                )}
                <span className="text-xs text-secondary-foreground">
                  {t(
                    `stream.technology.unavailable.${webRTCUnavailableReason}`,
                  )}
                </span>
              </span>
            )}
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
