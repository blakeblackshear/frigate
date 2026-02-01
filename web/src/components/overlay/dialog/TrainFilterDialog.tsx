import { FaFilter } from "react-icons/fa";

import { useEffect, useMemo, useState } from "react";
import { PlatformAwareSheet } from "./PlatformAwareDialog";
import { Button } from "@/components/ui/button";
import { isDesktop, isMobile } from "react-device-detect";
import FilterSwitch from "@/components/filter/FilterSwitch";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DualThumbSlider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { TrainFilter } from "@/types/classification";

type TrainFilterDialogProps = {
  filter?: TrainFilter;
  filterValues: {
    classes: string[];
  };
  onUpdateFilter: (filter: TrainFilter) => void;
};
export default function TrainFilterDialog({
  filter,
  filterValues,
  onUpdateFilter,
}: TrainFilterDialogProps) {
  // data
  const { t } = useTranslation(["components/filter"]);
  const [currentFilter, setCurrentFilter] = useState(filter ?? {});

  useEffect(() => {
    if (filter) {
      setCurrentFilter(filter);
    }
  }, [filter]);

  // state

  const [open, setOpen] = useState(false);

  const moreFiltersSelected = useMemo(
    () =>
      currentFilter &&
      (currentFilter.classes ||
        (currentFilter.min_score ?? 0) > 0.5 ||
        (currentFilter.max_score ?? 1) < 1),
    [currentFilter],
  );

  const trigger = (
    <Button
      className="flex items-center gap-2"
      aria-label={t("more")}
      variant={moreFiltersSelected ? "select" : "default"}
    >
      <FaFilter
        className={cn(
          moreFiltersSelected ? "text-white" : "text-secondary-foreground",
        )}
      />
      {isDesktop && t("filter")}
    </Button>
  );
  const content = (
    <div className="space-y-3">
      <ClassFilterContent
        allClasses={filterValues.classes}
        classes={currentFilter.classes}
        updateClasses={(newClasses) =>
          setCurrentFilter({ ...currentFilter, classes: newClasses })
        }
      />
      <ScoreFilterContent
        minScore={currentFilter.min_score}
        maxScore={currentFilter.max_score}
        setScoreRange={(min, max) =>
          setCurrentFilter({ ...currentFilter, min_score: min, max_score: max })
        }
      />
      {isDesktop && <DropdownMenuSeparator />}
      <div className="flex items-center justify-evenly p-2">
        <Button
          variant="select"
          aria-label={t("button.apply", { ns: "common" })}
          onClick={() => {
            if (currentFilter != filter) {
              onUpdateFilter(currentFilter);
            }

            setOpen(false);
          }}
        >
          {t("button.apply", { ns: "common" })}
        </Button>
        <Button
          aria-label={t("reset.label")}
          onClick={() => {
            const resetFilter: TrainFilter = {};
            setCurrentFilter(resetFilter);
            onUpdateFilter(resetFilter);
          }}
        >
          {t("button.reset", { ns: "common" })}
        </Button>
      </div>
    </div>
  );

  return (
    <PlatformAwareSheet
      trigger={trigger}
      title={t("filter")}
      content={content}
      contentClassName={cn(
        "w-auto lg:min-w-[275px] scrollbar-container h-full overflow-auto px-4",
        isMobile && "pb-20",
      )}
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setCurrentFilter(filter ?? {});
        }

        setOpen(open);
      }}
    />
  );
}

type ClassFilterContentProps = {
  allClasses?: string[];
  classes?: string[];
  updateClasses: (classes: string[] | undefined) => void;
};
export function ClassFilterContent({
  allClasses,
  classes,
  updateClasses,
}: ClassFilterContentProps) {
  const { t } = useTranslation(["components/filter"]);
  return (
    <>
      <div className="overflow-x-hidden">
        <DropdownMenuSeparator className="mb-3" />
        <div className="text-lg">{t("classes.label")}</div>
        {allClasses && (
          <>
            <div className="mb-5 mt-2.5 flex items-center justify-between">
              <Label
                className="mx-2 cursor-pointer text-primary"
                htmlFor="allClasses"
              >
                {t("classes.all.title")}
              </Label>
              <Switch
                className="ml-1"
                id="allClasses"
                checked={classes == undefined}
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    updateClasses(undefined);
                  }
                }}
              />
            </div>
            <div className="mt-2.5 flex flex-col gap-2.5">
              {allClasses.map((item) => (
                <FilterSwitch
                  key={item}
                  label={
                    item === "none"
                      ? t("details.none", { ns: "views/classificationModel" })
                      : item.replaceAll("_", " ")
                  }
                  isChecked={classes?.includes(item) ?? false}
                  onCheckedChange={(isChecked) => {
                    if (isChecked) {
                      const updatedClasses = classes ? [...classes] : [];

                      updatedClasses.push(item);
                      updateClasses(updatedClasses);
                    } else {
                      const updatedClasses = classes ? [...classes] : [];

                      // can not deselect the last item
                      if (updatedClasses.length > 1) {
                        updatedClasses.splice(updatedClasses.indexOf(item), 1);
                        updateClasses(updatedClasses);
                      }
                    }
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

type ScoreFilterContentProps = {
  minScore: number | undefined;
  maxScore: number | undefined;
  setScoreRange: (min: number | undefined, max: number | undefined) => void;
};
export function ScoreFilterContent({
  minScore,
  maxScore,
  setScoreRange,
}: ScoreFilterContentProps) {
  const { t } = useTranslation(["components/filter"]);
  return (
    <div className="overflow-x-hidden">
      <DropdownMenuSeparator className="mb-3" />
      <div className="mb-3 text-lg">{t("score")}</div>
      <div className="flex items-center gap-1">
        <Input
          className="w-14 text-center"
          inputMode="numeric"
          value={Math.round((minScore ?? 0.5) * 100)}
          onChange={(e) => {
            const value = e.target.value;

            if (value) {
              setScoreRange(parseInt(value) / 100.0, maxScore ?? 1.0);
            }
          }}
        />
        <DualThumbSlider
          className="mx-2 w-full"
          min={0.5}
          max={1.0}
          step={0.01}
          value={[minScore ?? 0.5, maxScore ?? 1.0]}
          onValueChange={([min, max]) => setScoreRange(min, max)}
        />
        <Input
          className="w-14 text-center"
          inputMode="numeric"
          value={Math.round((maxScore ?? 1.0) * 100)}
          onChange={(e) => {
            const value = e.target.value;

            if (value) {
              setScoreRange(minScore ?? 0.5, parseInt(value) / 100.0);
            }
          }}
        />
      </div>
    </div>
  );
}
