import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import useSWR from "swr";
import { CameraGroupConfig, FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ReviewFilter, ReviewSeverity, ReviewSummary } from "@/types/review";
import { getEndOfDayTimestamp } from "@/utils/dateUtil";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaFilter,
  FaRunning,
  FaVideo,
} from "react-icons/fa";
import { isDesktop, isMobile } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import ReviewActivityCalendar from "../overlay/ReviewActivityCalendar";
import MobileReviewSettingsDrawer, {
  DrawerFeatures,
} from "../overlay/MobileReviewSettingsDrawer";
import useOptimisticState from "@/hooks/use-optimistic-state";
import FilterSwitch from "./FilterSwitch";

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
  filterLabels?: string[];
  onUpdateFilter: (filter: ReviewFilter) => void;
  setMotionOnly: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ReviewFilterGroup({
  filters = DEFAULT_REVIEW_FILTERS,
  currentSeverity,
  reviewSummary,
  filter,
  motionOnly,
  filterLabels,
  onUpdateFilter,
  setMotionOnly,
}: ReviewFilterGroupProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const allLabels = useMemo<string[]>(() => {
    if (filterLabels) {
      return filterLabels;
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
  }, [config, filterLabels, filter]);

  const filterValues = useMemo(
    () => ({
      cameras: Object.keys(config?.cameras || {}),
      labels: Object.values(allLabels || {}),
    }),
    [config, allLabels],
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
          showReviewed={filter?.showReviewed || 0}
          setShowReviewed={(reviewed) =>
            onUpdateFilter({ ...filter, showReviewed: reviewed })
          }
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
          setShowAll={(showAll) => {
            onUpdateFilter({ ...filter, showAll });
          }}
          updateLabelFilter={(newLabels) => {
            onUpdateFilter({ ...filter, labels: newLabels });
          }}
        />
      )}
      {isMobile && mobileSettingsFeatures.length > 0 && (
        <MobileReviewSettingsDrawer
          features={mobileSettingsFeatures}
          filter={filter}
          currentSeverity={currentSeverity}
          reviewSummary={reviewSummary}
          allLabels={allLabels}
          onUpdateFilter={onUpdateFilter}
          // not applicable as exports are not used
          camera=""
          latestTime={0}
          currentTime={0}
          mode="none"
          setMode={() => {}}
          setRange={() => {}}
        />
      )}
    </div>
  );
}

type CameraFilterButtonProps = {
  allCameras: string[];
  groups: [string, CameraGroupConfig][];
  selectedCameras: string[] | undefined;
  updateCameraFilter: (cameras: string[] | undefined) => void;
};
export function CamerasFilterButton({
  allCameras,
  groups,
  selectedCameras,
  updateCameraFilter,
}: CameraFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const [currentCameras, setCurrentCameras] = useState<string[] | undefined>(
    selectedCameras,
  );

  const trigger = (
    <Button
      className="flex items-center gap-2 capitalize"
      variant={selectedCameras?.length == undefined ? "default" : "select"}
      size="sm"
    >
      <FaVideo
        className={`${(selectedCameras?.length ?? 0) >= 1 ? "text-selected-foreground" : "text-secondary-foreground"}`}
      />
      <div
        className={`hidden md:block ${selectedCameras?.length ? "text-selected-foreground" : "text-primary"}`}
      >
        {selectedCameras == undefined
          ? "All Cameras"
          : `${selectedCameras.includes("birdseye") ? selectedCameras.length - 1 : selectedCameras.length} Camera${selectedCameras.length !== 1 ? "s" : ""}`}
      </div>
    </Button>
  );
  const content = (
    <>
      {isMobile && (
        <>
          <DropdownMenuLabel className="flex justify-center">
            Cameras
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
        </>
      )}
      <div className="h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden p-4">
        <FilterSwitch
          isChecked={currentCameras == undefined}
          label="All Cameras"
          onCheckedChange={(isChecked) => {
            if (isChecked) {
              setCurrentCameras(undefined);
            }
          }}
        />
        {groups.length > 0 && (
          <>
            <DropdownMenuSeparator className="mt-2" />
            {groups.map(([name, conf]) => {
              return (
                <div
                  key={name}
                  className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-sm capitalize text-primary hover:bg-muted"
                  onClick={() => setCurrentCameras([...conf.cameras])}
                >
                  {name}
                </div>
              );
            })}
          </>
        )}
        <DropdownMenuSeparator className="my-2" />
        <div className="flex flex-col gap-2.5">
          {allCameras.map((item) => (
            <FilterSwitch
              key={item}
              isChecked={currentCameras?.includes(item) ?? false}
              label={item.replaceAll("_", " ")}
              onCheckedChange={(isChecked) => {
                if (isChecked) {
                  const updatedCameras = currentCameras
                    ? [...currentCameras]
                    : [];

                  updatedCameras.push(item);
                  setCurrentCameras(updatedCameras);
                } else {
                  const updatedCameras = currentCameras
                    ? [...currentCameras]
                    : [];

                  // can not deselect the last item
                  if (updatedCameras.length > 1) {
                    updatedCameras.splice(updatedCameras.indexOf(item), 1);
                    setCurrentCameras(updatedCameras);
                  }
                }
              }}
            />
          ))}
        </div>
      </div>
      <DropdownMenuSeparator className="my-2" />
      <div className="flex items-center justify-evenly p-2">
        <Button
          variant="select"
          onClick={() => {
            updateCameraFilter(currentCameras);
            setOpen(false);
          }}
        >
          Apply
        </Button>
        <Button
          onClick={() => {
            setCurrentCameras(undefined);
            updateCameraFilter(undefined);
          }}
        >
          Reset
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(open) => {
          if (!open) {
            setCurrentCameras(selectedCameras);
          }

          setOpen(open);
        }}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[75dvh] overflow-hidden">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setCurrentCameras(selectedCameras);
        }

        setOpen(open);
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent>{content}</DropdownMenuContent>
    </DropdownMenu>
  );
}

type ShowReviewedFilterProps = {
  showReviewed?: 0 | 1;
  setShowReviewed: (reviewed?: 0 | 1) => void;
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
          checked={showReviewedSwitch == 1}
          onCheckedChange={() =>
            setShowReviewedSwitch(showReviewedSwitch == 0 ? 1 : 0)
          }
        />
        <Label className="ml-2 cursor-pointer text-primary" htmlFor="reviewed">
          Show Reviewed
        </Label>
      </div>

      <Button
        className="block duration-0 md:hidden"
        variant={showReviewedSwitch == 1 ? "select" : "default"}
        size="sm"
        onClick={() => setShowReviewedSwitch(showReviewedSwitch == 0 ? 1 : 0)}
      >
        <FaCheckCircle
          className={`${showReviewedSwitch == 1 ? "text-selected-foreground" : "text-secondary-foreground"}`}
        />
      </Button>
    </>
  );
}

type CalendarFilterButtonProps = {
  reviewSummary?: ReviewSummary;
  day?: Date;
  updateSelectedDay: (day?: Date) => void;
};
function CalendarFilterButton({
  reviewSummary,
  day,
  updateSelectedDay,
}: CalendarFilterButtonProps) {
  const selectedDate = useFormattedTimestamp(
    day == undefined ? 0 : day?.getTime() / 1000 + 1,
    "%b %-d",
  );

  const trigger = (
    <Button
      className="flex items-center gap-2"
      variant={day == undefined ? "default" : "select"}
      size="sm"
    >
      <FaCalendarAlt
        className={`${day == undefined ? "text-secondary-foreground" : "text-selected-foreground"}`}
      />
      <div
        className={`hidden md:block ${day == undefined ? "text-primary" : "text-selected-foreground"}`}
      >
        {day == undefined ? "Last 24 Hours" : selectedDate}
      </div>
    </Button>
  );
  const content = (
    <>
      <ReviewActivityCalendar
        reviewSummary={reviewSummary}
        selectedDay={day}
        onSelect={updateSelectedDay}
      />
      <DropdownMenuSeparator />
      <div className="flex items-center justify-center p-2">
        <Button
          onClick={() => {
            updateSelectedDay(undefined);
          }}
        >
          Reset
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>{content}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent>{content}</PopoverContent>
    </Popover>
  );
}

type GeneralFilterButtonProps = {
  allLabels: string[];
  selectedLabels: string[] | undefined;
  currentSeverity?: ReviewSeverity;
  showAll: boolean;
  setShowAll: (showAll: boolean) => void;
  updateLabelFilter: (labels: string[] | undefined) => void;
};
function GeneralFilterButton({
  allLabels,
  selectedLabels,
  currentSeverity,
  showAll,
  setShowAll,
  updateLabelFilter,
}: GeneralFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    selectedLabels,
  );

  const trigger = (
    <Button
      size="sm"
      variant={selectedLabels?.length ? "select" : "default"}
      className="flex items-center gap-2 capitalize"
    >
      <FaFilter
        className={`${selectedLabels?.length ? "text-selected-foreground" : "text-secondary-foreground"}`}
      />
      <div
        className={`hidden md:block ${selectedLabels?.length ? "text-selected-foreground" : "text-primary"}`}
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
      setShowAll={setShowAll}
      updateLabelFilter={updateLabelFilter}
      setCurrentLabels={setCurrentLabels}
      onClose={() => setOpen(false)}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(open) => {
          if (!open) {
            setCurrentLabels(selectedLabels);
          }

          setOpen(open);
        }}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[75dvh] overflow-hidden">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setCurrentLabels(selectedLabels);
        }

        setOpen(open);
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent>{content}</PopoverContent>
    </Popover>
  );
}

type GeneralFilterContentProps = {
  allLabels: string[];
  selectedLabels: string[] | undefined;
  currentLabels: string[] | undefined;
  currentSeverity?: ReviewSeverity;
  showAll?: boolean;
  setShowAll?: (showAll: boolean) => void;
  updateLabelFilter: (labels: string[] | undefined) => void;
  setCurrentLabels: (labels: string[] | undefined) => void;
  onClose: () => void;
};
export function GeneralFilterContent({
  allLabels,
  selectedLabels,
  currentLabels,
  currentSeverity,
  showAll,
  setShowAll,
  updateLabelFilter,
  setCurrentLabels,
  onClose,
}: GeneralFilterContentProps) {
  return (
    <>
      <div className="h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden">
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
        <div className="my-2.5 flex items-center justify-between">
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
        <DropdownMenuSeparator />
        <div className="my-2.5 flex flex-col gap-2.5">
          {allLabels.map((item) => (
            <FilterSwitch
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
      </div>
      <DropdownMenuSeparator />
      <div className="flex items-center justify-evenly p-2">
        <Button
          variant="select"
          onClick={() => {
            if (selectedLabels != currentLabels) {
              updateLabelFilter(currentLabels);
            }

            onClose();
          }}
        >
          Apply
        </Button>
        <Button
          onClick={() => {
            setCurrentLabels(undefined);
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
