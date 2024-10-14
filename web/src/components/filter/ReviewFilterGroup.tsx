import { Button } from "../ui/button";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";
import { ReviewFilter, ReviewSeverity, ReviewSummary } from "@/types/review";
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
import { FilterList } from "@/types/filter";
import CalendarFilterButton from "./CalendarFilterButton";
import { CamerasFilterButton } from "./CamerasFilterButton";
import PlatformAwareDialog from "../overlay/dialog/PlatformAwareDialog";

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
  filter?: ReviewFilter;
  motionOnly: boolean;
  filterList?: FilterList;
  showReviewed: boolean;
  setShowReviewed: (show: boolean) => void;
  onUpdateFilter: (filter: ReviewFilter) => void;
  setMotionOnly: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ReviewFilterGroup({
  filters = DEFAULT_REVIEW_FILTERS,
  currentSeverity,
  reviewSummary,
  filter,
  motionOnly,
  filterList,
  showReviewed,
  setShowReviewed,
  onUpdateFilter,
  setMotionOnly,
}: ReviewFilterGroupProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const allLabels = useMemo<string[]>(() => {
    if (filterList?.labels) {
      return filterList.labels;
    }

    if (!config) {
      return [];
    }

    const labels = new Set<string>();
    const cameras = filter?.cameras || Object.keys(config.cameras);

    cameras.forEach((camera) => {
      if (camera == "birdseye") {
        return;
      }
      const cameraConfig = config.cameras[camera];
      cameraConfig.objects.track.forEach((label) => {
        labels.add(label);
      });

      if (cameraConfig.audio.enabled_in_config) {
        cameraConfig.audio.listen.forEach((label) => {
          labels.add(label);
        });
      }
    });

    return [...labels].sort();
  }, [config, filterList, filter]);

  const allZones = useMemo<string[]>(() => {
    if (filterList?.zones) {
      return filterList.zones;
    }

    if (!config) {
      return [];
    }

    const zones = new Set<string>();
    const cameras = filter?.cameras || Object.keys(config.cameras);

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
  }, [config, filterList, filter]);

  const filterValues = useMemo(
    () => ({
      cameras: Object.keys(config?.cameras ?? {}).sort(
        (a, b) =>
          (config?.cameras[a]?.ui?.order ?? 0) -
          (config?.cameras[b]?.ui?.order ?? 0),
      ),
      labels: Object.values(allLabels || {}),
      zones: Object.values(allZones || {}),
    }),
    [config, allLabels, allZones],
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
          setShowAll={(showAll) => {
            onUpdateFilter({ ...filter, showAll });
          }}
          updateLabelFilter={(newLabels) => {
            onUpdateFilter({ ...filter, labels: newLabels });
          }}
          updateZoneFilter={(newZones) =>
            onUpdateFilter({ ...filter, zones: newZones })
          }
        />
      )}
      {isMobile && mobileSettingsFeatures.length > 0 && (
        <MobileReviewSettingsDrawer
          features={mobileSettingsFeatures}
          filter={filter}
          currentSeverity={currentSeverity}
          reviewSummary={reviewSummary}
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
          Show Reviewed
        </Label>
      </div>

      <Button
        className="block duration-0 md:hidden"
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
  setShowAll: (showAll: boolean) => void;
  updateLabelFilter: (labels: string[] | undefined) => void;
  updateZoneFilter: (zones: string[] | undefined) => void;
};
function GeneralFilterButton({
  allLabels,
  selectedLabels,
  currentSeverity,
  showAll,
  allZones,
  selectedZones,
  setShowAll,
  updateLabelFilter,
  updateZoneFilter,
}: GeneralFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    selectedLabels,
  );
  const [currentZones, setCurrentZones] = useState<string[] | undefined>(
    selectedZones,
  );

  // ui

  useEffect(() => {
    setCurrentLabels(selectedLabels);
    setCurrentZones(selectedZones);
    // only refresh when state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabels, selectedZones]);

  const trigger = (
    <Button
      size="sm"
      variant={
        selectedLabels?.length || selectedZones?.length ? "select" : "default"
      }
      className="flex items-center gap-2 capitalize"
    >
      <FaFilter
        className={`${selectedLabels?.length || selectedZones?.length ? "text-selected-foreground" : "text-secondary-foreground"}`}
      />
      <div
        className={`hidden md:block ${selectedLabels?.length || selectedZones?.length ? "text-selected-foreground" : "text-primary"}`}
      >
        Filter
      </div>
    </Button>
  );
  const content = (
    <GeneralFilterContent
      allLabels={allLabels}
      selectedLabels={selectedLabels}
      currentLabels={currentLabels}
      currentSeverity={currentSeverity}
      showAll={showAll}
      allZones={allZones}
      selectedZones={selectedZones}
      currentZones={currentZones}
      setCurrentZones={setCurrentZones}
      updateZoneFilter={updateZoneFilter}
      setShowAll={setShowAll}
      updateLabelFilter={updateLabelFilter}
      setCurrentLabels={setCurrentLabels}
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
          setCurrentLabels(selectedLabels);
        }

        setOpen(open);
      }}
    />
  );
}

type GeneralFilterContentProps = {
  allLabels: string[];
  selectedLabels: string[] | undefined;
  currentLabels: string[] | undefined;
  currentSeverity?: ReviewSeverity;
  showAll?: boolean;
  allZones?: string[];
  selectedZones?: string[];
  currentZones?: string[];
  setShowAll?: (showAll: boolean) => void;
  updateLabelFilter: (labels: string[] | undefined) => void;
  setCurrentLabels: (labels: string[] | undefined) => void;
  updateZoneFilter?: (zones: string[] | undefined) => void;
  setCurrentZones?: (zones: string[] | undefined) => void;
  onClose: () => void;
};
export function GeneralFilterContent({
  allLabels,
  selectedLabels,
  currentLabels,
  currentSeverity,
  showAll,
  allZones,
  selectedZones,
  currentZones,
  setShowAll,
  updateLabelFilter,
  setCurrentLabels,
  updateZoneFilter,
  setCurrentZones,
  onClose,
}: GeneralFilterContentProps) {
  return (
    <>
      <div className="scrollbar-container h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden">
        {currentSeverity && setShowAll && (
          <div className="my-2.5 flex flex-col gap-2.5">
            <FilterSwitch
              label="Alerts"
              disabled={currentSeverity == "alert"}
              isChecked={currentSeverity == "alert" ? true : showAll == true}
              onCheckedChange={setShowAll}
            />
            <FilterSwitch
              label="Detections"
              disabled={currentSeverity == "detection"}
              isChecked={
                currentSeverity == "detection" ? true : showAll == true
              }
              onCheckedChange={setShowAll}
            />
            <DropdownMenuSeparator />
          </div>
        )}
        <div className="mb-5 mt-2.5 flex items-center justify-between">
          <Label
            className="mx-2 cursor-pointer text-primary"
            htmlFor="allLabels"
          >
            All Labels
          </Label>
          <Switch
            className="ml-1"
            id="allLabels"
            checked={currentLabels == undefined}
            onCheckedChange={(isChecked) => {
              if (isChecked) {
                setCurrentLabels(undefined);
              }
            }}
          />
        </div>
        <div className="my-2.5 flex flex-col gap-2.5">
          {allLabels.map((item) => (
            <FilterSwitch
              key={item}
              label={item.replaceAll("_", " ")}
              isChecked={currentLabels?.includes(item) ?? false}
              onCheckedChange={(isChecked) => {
                if (isChecked) {
                  const updatedLabels = currentLabels ? [...currentLabels] : [];

                  updatedLabels.push(item);
                  setCurrentLabels(updatedLabels);
                } else {
                  const updatedLabels = currentLabels ? [...currentLabels] : [];

                  // can not deselect the last item
                  if (updatedLabels.length > 1) {
                    updatedLabels.splice(updatedLabels.indexOf(item), 1);
                    setCurrentLabels(updatedLabels);
                  }
                }
              }}
            />
          ))}
        </div>

        {allZones && setCurrentZones && (
          <>
            <DropdownMenuSeparator />
            <div className="mb-5 mt-2.5 flex items-center justify-between">
              <Label
                className="mx-2 cursor-pointer text-primary"
                htmlFor="allZones"
              >
                All Zones
              </Label>
              <Switch
                className="ml-1"
                id="allZones"
                checked={currentZones == undefined}
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    setCurrentZones(undefined);
                  }
                }}
              />
            </div>
            <div className="my-2.5 flex flex-col gap-2.5">
              {allZones.map((item) => (
                <FilterSwitch
                  key={item}
                  label={item.replaceAll("_", " ")}
                  isChecked={currentZones?.includes(item) ?? false}
                  onCheckedChange={(isChecked) => {
                    if (isChecked) {
                      const updatedZones = currentZones
                        ? [...currentZones]
                        : [];

                      updatedZones.push(item);
                      setCurrentZones(updatedZones);
                    } else {
                      const updatedZones = currentZones
                        ? [...currentZones]
                        : [];

                      // can not deselect the last item
                      if (updatedZones.length > 1) {
                        updatedZones.splice(updatedZones.indexOf(item), 1);
                        setCurrentZones(updatedZones);
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
          variant="select"
          onClick={() => {
            if (selectedLabels != currentLabels) {
              updateLabelFilter(currentLabels);
            }

            if (updateZoneFilter && selectedZones != currentZones) {
              updateZoneFilter(currentZones);
            }

            onClose();
          }}
        >
          Apply
        </Button>
        <Button
          onClick={() => {
            setCurrentLabels(undefined);
            setCurrentZones?.(undefined);
            updateLabelFilter(undefined);
          }}
        >
          Reset
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
          Motion only
        </Label>
      </div>

      <div className="block md:hidden">
        <Button
          size="sm"
          className="duration-0"
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
