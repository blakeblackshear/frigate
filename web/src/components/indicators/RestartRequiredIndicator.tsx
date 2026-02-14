import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { LuRefreshCcw } from "react-icons/lu";

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
    <span
      className={cn(
        "inline-flex items-center text-muted-foreground",
        className,
      )}
      title={restartRequiredLabel}
      aria-label={restartRequiredLabel}
    >
      <LuRefreshCcw className={cn("size-3", iconClassName)} />
    </span>
  );
}
