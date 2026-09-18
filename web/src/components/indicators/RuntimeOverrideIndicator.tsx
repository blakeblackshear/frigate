import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent } from "../ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";

type RuntimeOverrideIndicatorProps = {
  /** The value the camera is running with, which differs from the saved config. */
  runtimeValue: unknown;
  className?: string;
};

/**
 * Field-level companion to the section override badges. Marks a field the
 * running camera has drifted from, so the saved value on screen never reads as
 * the live one.
 */
export default function RuntimeOverrideIndicator({
  runtimeValue,
  className,
}: RuntimeOverrideIndicatorProps) {
  const { t } = useTranslation(["views/settings", "common"]);

  const displayValue =
    typeof runtimeValue === "boolean"
      ? t(runtimeValue ? "button.on" : "button.off", { ns: "common" })
      : Array.isArray(runtimeValue)
        ? runtimeValue.join(", ")
        : String(runtimeValue);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className={cn(
            "cursor-default border-2 border-selected text-center align-middle text-xs font-normal text-primary-variant",
            className,
          )}
        >
          {t("button.overriddenLive", { ns: "views/settings" })}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        <p>{t("button.overriddenLiveTooltip", { ns: "views/settings" })}</p>
        <p className="mt-1">
          {t("button.overriddenLiveValue", {
            ns: "views/settings",
            value: displayValue,
          })}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
