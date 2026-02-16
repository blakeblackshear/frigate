import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { LuRefreshCcw } from "react-icons/lu";
import { Tooltip, TooltipContent } from "../ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";

type RestartRequiredIndicatorProps = {
  className?: string;
  iconClassName?: string;
};

export default function RestartRequiredIndicator({
  className,
  iconClassName,
}: RestartRequiredIndicatorProps) {
  const { t } = useTranslation(["views/settings"]);
  const restartRequiredLabel = t("configForm.restartRequiredField", {
    ns: "views/settings",
    defaultValue: "Restart required",
  });

  return (
    <Tooltip>
      <TooltipTrigger>
        <span
          className={cn(
            "inline-flex cursor-default items-center text-muted-foreground",
            className,
          )}
          aria-label={restartRequiredLabel}
        >
          <LuRefreshCcw className={cn("size-3", iconClassName)} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{restartRequiredLabel}</TooltipContent>
    </Tooltip>
  );
}
