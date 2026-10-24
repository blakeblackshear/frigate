import { useTranslation } from "react-i18next";
import useSWR from "swr";
import type { Day } from "date-fns";
import { useTimezone } from "@/hooks/use-date-utils";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import type { FrigateConfig } from "@/types/frigateConfig";
import type { ReviewDatePreset, ReviewFilter } from "@/types/review";
import { getReviewPresetRange } from "@/utils/reviewDatePreset";
import { Button } from "../ui/button";

type ReviewDatePresetsProps = {
  filter?: ReviewFilter;
  onUpdateFilter: (filter: ReviewFilter) => void;
  onSelect?: () => void;
};

export default function ReviewDatePresets({
  filter,
  onUpdateFilter,
  onSelect,
}: ReviewDatePresetsProps) {
  const { t } = useTranslation("views/events");
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = useTimezone(config);
  const [weekStartsOn] = useUserPersistence<Day>("weekStartsOn", 0);
  const presets = [
    { value: "currentWeek", label: t("time.thisWeek", { ns: "common" }) },
    { value: "lastWeek", label: t("time.lastWeek", { ns: "common" }) },
    { value: "currentMonth", label: t("time.thisMonth", { ns: "common" }) },
    { value: "lastMonth", label: t("time.lastMonth", { ns: "common" }) },
  ] satisfies { value: ReviewDatePreset; label: string }[];

  const select = (datePreset?: ReviewDatePreset) => {
    onUpdateFilter({
      ...filter,
      ...getReviewPresetRange(
        datePreset,
        new Date(),
        timezone,
        weekStartsOn ?? 0,
      ),
      datePreset,
    });
    onSelect?.();
  };

  return (
    <div
      className="grid grid-cols-1 gap-1 p-2"
      role="group"
      aria-label={t("calendarFilter.period")}
    >
      <Button
        size="sm"
        variant={filter?.after == undefined ? "select" : "default"}
        className="justify-start"
        aria-pressed={filter?.after == undefined}
        onClick={() => select()}
      >
        {t("calendarFilter.last24Hours")}
      </Button>
      {presets.map(({ value, label }) => (
        <Button
          key={value}
          size="sm"
          className="justify-start"
          variant={filter?.datePreset === value ? "select" : "default"}
          aria-pressed={filter?.datePreset === value}
          onClick={() => select(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
