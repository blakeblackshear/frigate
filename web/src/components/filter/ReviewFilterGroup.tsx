import { Button } from "../ui/button";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";
import {
  RecordingsSummary,
  ReviewFilter,
  ReviewSeverity,
  ReviewSummary,
} from "@/types/review";
import { getEndOfDayTimestamp } from "@/utils/dateUtil";
import { FaCheckCircle, FaFilter, FaRunning } from "react-icons/fa";
import { isDesktop, isMobile } from "react-device-detect";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import MobileReviewSettingsDrawer, {
  DrawerFeatures,
} from "../overlay/MobileReviewSettingsDrawer";
import useOptimisticState from "@/hooks/use-optimistic-state";
import FilterSwitch from "./FilterSwitch";
import { FilterList, GeneralFilter } from "@/types/filter";
import CalendarFilterButton from "./CalendarFilterButton";
import { CamerasFilterButton } from "./CamerasFilterButton";
import PlatformAwareDialog from "../overlay/dialog/PlatformAwareDialog";
import { useTranslation } from "react-i18next";
import { getTranslatedLabel } from "@/utils/i18n";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";

const REVIEW_FILTERS = [
  "cameras",
  "reviewed",
  "date",
  "general",
  "motionOnly",
] as const;
type ReviewFilters = (typeof REVIEW_FILTERS)[number];
const DEFAULT_REVIEW_FILTERS: ReviewFilters[] = [
  "cameras",
  "reviewed",
  "date",
  "general",
  "motionOnly",
];

type ReviewFilterGroupProps = {
  filters?: ReviewFilters[];
  currentSeverity?: ReviewSeverity;
  reviewSummary?: ReviewSummary;
  recordingsSummary?: RecordingsSummary;
  filter?: ReviewFilter;
  motionOnly: boolean;
  filterList?: FilterList;
  showReviewed: boolean;
  mainCamera?: string;
  setShowReviewed: (show: boolean) => void;
  onUpdateFilter: (filter: ReviewFilter) => void;
  setMotionOnly: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ReviewFilterGroup({
  filters = DEFAULT_REVIEW_FILTERS,
  currentSeverity,
  reviewSummary,
  recordingsSummary,
  filter,
  motionOnly,
  filterList,
  showReviewed,
  mainCamera,
  setShowReviewed,
  onUpdateFilter,
  setMotionOnly,
}: ReviewFilterGroupProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const allowedCameras = useAllowedCameras();

  const allLabels = useMemo<string[]>(() => {
    if (filterList?.labels) {
      return filterList.labels;
    }

    if (!config) {
      return [];
    }

    const labels = new Set<string>();
    const cameras = (filter?.cameras || allowedCameras).filter((camera) =>
      allowedCameras.includes(camera),
    );

    cameras.forEach((camera) => {
      if (camera == "birdseye") {
        return;
      }
      const cameraConfig = config.cameras[camera];
      cameraConfig.objects.track.forEach((label) => {
        labels.add(label);
      });

      if (cameraConfig.type == "lpr") {
        labels.add("license_plate");
      }

      if (cameraConfig.audio.enabled_in_config) {
        cameraConfig.audio.listen.forEach((label) => {
          labels.add(label);
        });
      }
    });

    return [...labels].sort();
  }, [config, filterList, filter, allowedCameras]);

  const allZones = useMemo<string[]>(() => {
    if (filterList?.zones) {
      return filterList.zones;
    }

    if (!config) {
      return [];
    }

    const zones = new Set<string>();
    const cameras = (filter?.cameras || allowedCameras).filter((camera) =>
      allowedCameras.includes(camera),
    );

    cameras.forEach((camera) => {
      if (camera == "birdseye") {
        return;
      }
      const cameraConfig = config.cameras[camera];
      cameraConfig.review.alerts.required_zones.forEach((zone) => {
        zones.add(zone);
      });
      cameraConfig.review.detections.required_zones.forEach((zone) => {
        zones.add(zone);
      });
    });

    return [...zones].sort();
  }, [config, filterList, filter, allowedCameras]);

  const filterValues = useMemo(
    () => ({
      cameras: allowedCameras.sort(
        (a, b) =>
          (config?.cameras[a]?.ui?.order ?? 0) -
          (config?.cameras[b]?.ui?.order ?? 0),
      ),
      labels: Object.values(allLabels || {}),
      zones: Object.values(allZones || {}),
    }),
    [config, allLabels, allZones, allowedCameras],
  );

  const groups = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.entries(config.camera_groups).sort(
      (a, b) => a[1].order - b[1].order,
    );
  }, [config]);

  const mobileSettingsFeatures = useMemo<DrawerFeatures[]>(() => {
    const features: DrawerFeatures[] = [];

    if (filters.includes("date")) {
      features.push("calendar");
    }

    if (filters.includes("general")) {
      features.push("filter");
    }

    return features;
  }, [filters]);

  // handle updating filters

  const onUpdateSelectedDay = useCallback(
    (day?: Date) => {
      onUpdateFilter({
        ...filter,
        after: day == undefined ? undefined : day.getTime() / 1000,
        before: day == undefined ? undefined : getEndOfDayTimestamp(day),
      });
    },
    [filter, onUpdateFilter],
  );

  return (
    <div className="flex justify-center gap-2">
      {filters.includes("cameras") && (
        <CamerasFilterButton
          allCameras={filterValues.cameras}
          groups={groups}
          selectedCameras={filter?.cameras}
          mainCamera={mainCamera}
          updateCameraFilter={(newCameras) => {
            onUpdateFilter({ ...filter, cameras: newCameras });
          }}
        />
      )}
      {filters.includes("reviewed") && (
        <ShowReviewFilter
          showReviewed={showReviewed}
          setShowReviewed={setShowReviewed}
        />
      )}
      {isDesktop && filters.includes("date") && (
        <CalendarFilterButton
          reviewSummary={reviewSummary}
          recordingsSummary={recordingsSummary}
          day={
            filter?.after == undefined
              ? undefined
              : new Date(filter.after * 1000)
          }
          updateSelectedDay={onUpdateSelectedDay}
        />
      )}
      {filters.includes("motionOnly") && (
        <ShowMotionOnlyButton
          motionOnly={motionOnly}
          setMotionOnly={setMotionOnly}
        />
      )}
      {isDesktop && filters.includes("general") && (
        <GeneralFilterButton
          allLabels={filterValues.labels}
          selectedLabels={filter?.labels}
          currentSeverity={currentSeverity}
          showAll={filter?.showAll == true}
          allZones={filterValues.zones}
          selectedZones={filter?.zones}
          onUpdateFilter={(general) => {
            onUpdateFilter({ ...filter, ...general });
          }}
        />
      )}
      {isMobile && mobileSettingsFeatures.length > 0 && (
        <MobileReviewSettingsDrawer
          features={mobileSettingsFeatures}
          filter={filter}
          currentSeverity={currentSeverity}
          reviewSummary={reviewSummary}
          recordingsSummary={recordingsSummary}
          allLabels={allLabels}
          allZones={allZones}
          onUpdateFilter={onUpdateFilter}
          // not applicable as exports are not used
          camera=""
          latestTime={0}
          currentTime={0}
          mode="none"
          setMode={() => {}}
          setRange={() => {}}
          showExportPreview={false}
          setShowExportPreview={() => {}}
        />
      )}
    </div>
  );
}

type ShowReviewedFilterProps = {
  showReviewed: boolean;
  setShowReviewed: (reviewed: boolean) => void;
};
function ShowReviewFilter({
  showReviewed,
  setShowReviewed,
}: ShowReviewedFilterProps) {
  const { t } = useTranslation(["components/filter"]);
  const [showReviewedSwitch, setShowReviewedSwitch] = useOptimisticState(
    showReviewed,
    setShowReviewed,
  );
  return (
    <>
      <div className="hidden h-9 cursor-pointer items-center justify-start rounded-md bg-secondary p-2 text-sm hover:bg-secondary/80 md:flex">
        <Switch
          id="reviewed"
          checked={showReviewedSwitch}
          onCheckedChange={() =>
            setShowReviewedSwitch(showReviewedSwitch == false ? true : false)
          }
        />
        <Label className="ml-2 cursor-pointer text-primary" htmlFor="reviewed">
          {t("review.showReviewed")}
        </Label>
      </div>

      <Button
        className="block duration-0 md:hidden"
        aria-label={t("review.showReviewed")}
        variant={showReviewedSwitch ? "select" : "default"}
        size="sm"
        onClick={() =>
          setShowReviewedSwitch(showReviewedSwitch == false ? true : false)
        }
      >
        <FaCheckCircle
          className={`${showReviewedSwitch ? "text-selected-foreground" : "text-secondary-foreground"}`}
        />
      </Button>
    </>
  );
}

type GeneralFilterButtonProps = {
  allLabels: string[];
  selectedLabels: string[] | undefined;
  currentSeverity?: ReviewSeverity;
  showAll: boolean;
  allZones: string[];
  selectedZones?: string[];
  filter?: GeneralFilter;
  onUpdateFilter: (filter: GeneralFilter) => void;
};

function GeneralFilterButton({
  allLabels,
  selectedLabels,
  filter,
  currentSeverity,
  showAll,
  allZones,
  selectedZones,
  onUpdateFilter,
}: GeneralFilterButtonProps) {
  const { t } = useTranslation(["components/filter"]);
  const [open, setOpen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<GeneralFilter>({
    labels: selectedLabels,
    zones: selectedZones,
    showAll: showAll,
    ...filter,
  });

  // Update local state when props change

  useEffect(() => {
    setCurrentFilter({
      labels: selectedLabels,
      zones: selectedZones,
      showAll: showAll,
      ...filter,
    });
    // only refresh when state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabels, selectedZones, showAll, filter]);

  const trigger = (
    <Button
      size="sm"
      variant={
        selectedLabels?.length || selectedZones?.length ? "select" : "default"
      }
      className="flex items-center gap-2 smart-capitalize"
      aria-label={t("filter")}
    >
      <FaFilter
        className={`${
          selectedLabels?.length || selectedZones?.length
            ? "text-selected-foreground"
            : "text-secondary-foreground"
        }`}
      />
      <div
        className={`hidden md:block ${
          selectedLabels?.length || selectedZones?.length
            ? "text-selected-foreground"
            : "text-primary"
        }`}
      >
        {t("filter")}
      </div>
    </Button>
  );
  const content = (
    <GeneralFilterContent
      allLabels={allLabels}
      selectedLabels={selectedLabels}
      currentSeverity={currentSeverity}
      allZones={allZones}
      filter={currentFilter}
      selectedZones={selectedZones}
      onUpdateFilter={setCurrentFilter}
      onApply={() => {
        if (currentFilter !== filter) {
          onUpdateFilter(currentFilter);
        }
        setOpen(false);
      }}
      onReset={() => {
        const resetFilter: GeneralFilter = {
          labels: undefined,
          zones: undefined,
          showAll: false,
        };
        setCurrentFilter(resetFilter);
        onUpdateFilter(resetFilter);
      }}
      onClose={() => setOpen(false)}
    />
  );

  return (
    <PlatformAwareDialog
      trigger={trigger}
      content={content}
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setCurrentFilter({
            labels: selectedLabels,
            zones: selectedZones,
            showAll: showAll,
            ...filter,
          });
        }

        setOpen(open);
      }}
    />
  );
}

type GeneralFilterContentProps = {
  allLabels: string[];
  allZones: string[];
  currentSeverity?: ReviewSeverity;
  filter: GeneralFilter;
  selectedLabels?: string[];
  selectedZones?: string[];
  onUpdateFilter: (filter: GeneralFilter) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};
export function GeneralFilterContent({
  allLabels,
  allZones,
  currentSeverity,
  filter,
  onUpdateFilter,
  onApply,
  onReset,
  onClose,
}: GeneralFilterContentProps) {
  const { t } = useTranslation(["components/filter", "views/events"]);
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const allAudioListenLabels = useMemo<string[]>(() => {
    if (!config) {
      return [];
    }

    const labels = new Set<string>();
    Object.values(config.cameras).forEach((camera) => {
      if (camera?.audio?.enabled) {
        camera.audio.listen.forEach((label) => {
          labels.add(label);
        });
      }
    });
    return [...labels].sort();
  }, [config]);
  return (
    <>
      <div className="scrollbar-container h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden">
        {currentSeverity && (
          <div className="my-2.5 flex flex-col gap-2.5">
            <FilterSwitch
              label={t("alerts", { ns: "views/events" })}
              disabled={currentSeverity == "alert"}
              isChecked={
                currentSeverity == "alert" ? true : filter.showAll === true
              }
              onCheckedChange={(checked) =>
                onUpdateFilter({ ...filter, showAll: checked })
              }
            />
            <FilterSwitch
              label={t("detections", { ns: "views/events" })}
              disabled={currentSeverity == "detection"}
              isChecked={
                currentSeverity == "detection" ? true : filter.showAll === true
              }
              onCheckedChange={(checked) =>
                onUpdateFilter({ ...filter, showAll: checked })
              }
            />
            <DropdownMenuSeparator />
          </div>
        )}
        <div className="mb-5 mt-2.5 flex items-center justify-between">
          <Label
            className="mx-2 cursor-pointer text-primary"
            htmlFor="allLabels"
          >
            {t("labels.all.title")}
          </Label>
          <Switch
            className="ml-1"
            id="allLabels"
            checked={filter.labels === undefined}
            onCheckedChange={(isChecked) => {
              if (isChecked) {
                onUpdateFilter({ ...filter, labels: undefined });
              }
            }}
          />
        </div>
        <div className="my-2.5 flex flex-col gap-2.5">
          {allLabels.map((item) => (
            <FilterSwitch
              key={item}
              label={getTranslatedLabel(
                item,
                allAudioListenLabels.includes(item) ? "audio" : "object",
              )}
              isChecked={filter.labels?.includes(item) ?? false}
              onCheckedChange={(isChecked) => {
                if (isChecked) {
                  const updatedLabels = filter.labels ? [...filter.labels] : [];
                  updatedLabels.push(item);
                  onUpdateFilter({ ...filter, labels: updatedLabels });
                } else {
                  const updatedLabels = filter.labels ? [...filter.labels] : [];

                  // can not deselect the last item
                  if (updatedLabels.length > 1) {
                    updatedLabels.splice(updatedLabels.indexOf(item), 1);
                    onUpdateFilter({ ...filter, labels: updatedLabels });
                  }
                }
              }}
            />
          ))}
        </div>

        {allZones && (
          <>
            <DropdownMenuSeparator />
            <div className="mb-5 mt-2.5 flex items-center justify-between">
              <Label
                className="mx-2 cursor-pointer text-primary"
                htmlFor="allZones"
              >
                {t("zones.all.title")}
              </Label>
              <Switch
                className="ml-1"
                id="allZones"
                checked={filter.zones === undefined}
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    onUpdateFilter({ ...filter, zones: undefined });
                  }
                }}
              />
            </div>
            <div className="my-2.5 flex flex-col gap-2.5">
              {allZones.map((item) => (
                <FilterSwitch
                  key={item}
                  label={item}
                  type={"zone"}
                  isChecked={filter.zones?.includes(item) ?? false}
                  onCheckedChange={(isChecked) => {
                    if (isChecked) {
                      const updatedZones = filter.zones
                        ? [...filter.zones]
                        : [];

                      updatedZones.push(item);
                      onUpdateFilter({ ...filter, zones: updatedZones });
                    } else {
                      const updatedZones = filter.zones
                        ? [...filter.zones]
                        : [];

                      // can not deselect the last item
                      if (updatedZones.length > 1) {
                        updatedZones.splice(updatedZones.indexOf(item), 1);
                        onUpdateFilter({ ...filter, zones: updatedZones });
                      }
                    }
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <DropdownMenuSeparator />
      <div className="flex items-center justify-evenly p-2">
        <Button
          aria-label={t("button.apply", { ns: "common" })}
          variant="select"
          onClick={() => {
            onApply();
            onClose();
          }}
        >
          {t("button.apply", { ns: "common" })}
        </Button>
        <Button
          aria-label={t("button.reset", { ns: "common" })}
          onClick={onReset}
        >
          {t("button.reset", { ns: "common" })}
        </Button>
      </div>
    </>
  );
}

type ShowMotionOnlyButtonProps = {
  motionOnly: boolean;
  setMotionOnly: React.Dispatch<React.SetStateAction<boolean>>;
};
function ShowMotionOnlyButton({
  motionOnly,
  setMotionOnly,
}: ShowMotionOnlyButtonProps) {
  const { t } = useTranslation(["views/events", "components/filter"]);
  const [motionOnlyButton, setMotionOnlyButton] = useOptimisticState(
    motionOnly,
    setMotionOnly,
  );

  return (
    <>
      <div className="mx-1 hidden h-9 cursor-pointer items-center justify-center whitespace-nowrap rounded-md bg-secondary px-3 text-sm text-primary hover:bg-secondary/80 md:inline-flex">
        <Switch
          className="ml-1"
          id="collapse-motion"
          checked={motionOnlyButton}
          onCheckedChange={setMotionOnlyButton}
        />
        <Label
          className="mx-2 cursor-pointer text-primary"
          htmlFor="collapse-motion"
        >
          {t("motion.only")}
        </Label>
      </div>

      <div className="block md:hidden">
        <Button
          size="sm"
          className="duration-0"
          aria-label={t("motion.only")}
          variant={motionOnlyButton ? "select" : "default"}
          onClick={() => setMotionOnlyButton(!motionOnlyButton)}
        >
          <FaRunning
            className={`${motionOnlyButton ? "text-selected-foreground" : "text-secondary-foreground"}`}
          />
        </Button>
      </div>
    </>
  );
}
