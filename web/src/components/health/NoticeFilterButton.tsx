import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaFilter } from "react-icons/fa";
import FilterSwitch from "@/components/filter/FilterSwitch";
import PlatformAwareDialog from "@/components/overlay/dialog/PlatformAwareDialog";
import { Button } from "@/components/ui/button";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  DEFAULT_NOTICE_FILTER,
  type HealthSeverity,
  type NoticeFilter,
} from "@/types/health";

type NoticeFilterButtonProps = {
  filter: NoticeFilter;
  onFilterChange: (filter: NoticeFilter) => void;
};

export default function NoticeFilterButton({
  filter,
  onFilterChange,
}: NoticeFilterButtonProps) {
  const { t } = useTranslation(["views/system", "components/filter"]);
  const [open, setOpen] = useState(false);
  const active =
    filter.showDismissed ||
    filter.severities.length < DEFAULT_NOTICE_FILTER.severities.length;

  const severityLabels: Record<HealthSeverity, string> = {
    error: t("health.notices.filter.error"),
    warning: t("health.notices.filter.warning"),
    info: t("health.notices.filter.info"),
  };

  const trigger = (
    <Button
      size="sm"
      variant={active ? "select" : "default"}
      className="flex items-center gap-2 smart-capitalize"
      aria-label={t("filter", { ns: "components/filter" })}
    >
      <FaFilter
        className={
          active ? "text-selected-foreground" : "text-secondary-foreground"
        }
      />
      <div
        className={cn(
          "hidden md:block",
          active ? "text-selected-foreground" : "text-primary",
        )}
      >
        {t("filter", { ns: "components/filter" })}
      </div>
    </Button>
  );

  const content = (
    <div className="space-y-3 p-4">
      <FilterSwitch
        label={t("health.notices.filter.showDismissed")}
        isChecked={filter.showDismissed}
        onCheckedChange={(showDismissed) =>
          onFilterChange({ ...filter, showDismissed })
        }
      />
      <DropdownMenuSeparator />
      <div className="space-y-2.5">
        <div className="mx-2 text-sm text-muted-foreground">
          {t("health.notices.filter.severity")}
        </div>
        {DEFAULT_NOTICE_FILTER.severities.map((severity) => (
          <FilterSwitch
            key={severity}
            label={severityLabels[severity]}
            isChecked={filter.severities.includes(severity)}
            onCheckedChange={(checked) =>
              onFilterChange({
                ...filter,
                severities: checked
                  ? [...filter.severities, severity]
                  : filter.severities.filter((s) => s !== severity),
              })
            }
          />
        ))}
      </div>
    </div>
  );

  return (
    <PlatformAwareDialog
      trigger={trigger}
      content={content}
      contentClassName="p-1"
      open={open}
      onOpenChange={setOpen}
    />
  );
}
