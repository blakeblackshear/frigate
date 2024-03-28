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
import { ReviewFilter, ReviewSummary } from "@/types/review";
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
import FilterCheckBox from "./FilterCheckBox";
import ReviewActivityCalendar from "../overlay/ReviewActivityCalendar";
import MobileReviewSettingsDrawer, {
  DrawerFeatures,
} from "../overlay/MobileReviewSettingsDrawer";

const ATTRIBUTES = ["amazon", "face", "fedex", "license_plate", "ups"];
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
  reviewSummary?: ReviewSummary;
  filter?: ReviewFilter;
  onUpdateFilter: (filter: ReviewFilter) => void;
  motionOnly: boolean;
  setMotionOnly: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ReviewFilterGroup({
  filters = DEFAULT_REVIEW_FILTERS,
  reviewSummary,
  filter,
  onUpdateFilter,
  motionOnly,
  setMotionOnly,
}: ReviewFilterGroupProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const allLabels = useMemo<string[]>(() => {
    if (!config) {
      return [];
    }

    const labels = new Set<string>();
    const cameras = filter?.cameras || Object.keys(config.cameras);

    cameras.forEach((camera) => {
      const cameraConfig = config.cameras[camera];
      cameraConfig.objects.track.forEach((label) => {
        if (!ATTRIBUTES.includes(label)) {
          labels.add(label);
        }
      });

      if (cameraConfig.audio.enabled_in_config) {
        cameraConfig.audio.listen.forEach((label) => {
          labels.add(label);
        });
      }
    });

    return [...labels].sort();
  }, [config, filter]);

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
          updateLabelFilter={(newLabels) => {
            onUpdateFilter({ ...filter, labels: newLabels });
          }}
        />
      )}
      {isMobile && mobileSettingsFeatures.length > 0 && (
        <MobileReviewSettingsDrawer
          features={mobileSettingsFeatures}
          filter={filter}
          reviewSummary={reviewSummary}
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
function CamerasFilterButton({
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
      variant="secondary"
      size="sm"
    >
      <FaVideo className="text-muted-foreground" />
      <div className="hidden md:block">
        {selectedCameras == undefined
          ? "All Cameras"
          : `${selectedCameras.length} Cameras`}
      </div>
    </Button>
  );
  const content = (
    <>
      <DropdownMenuLabel className="flex justify-center">
        Filter Cameras
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <div className="h-auto overflow-y-auto overflow-x-hidden">
        <FilterCheckBox
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
            <DropdownMenuSeparator />
            {groups.map(([name, conf]) => {
              return (
                <FilterCheckBox
                  key={name}
                  label={name}
                  isChecked={false}
                  onCheckedChange={() => {
                    setCurrentCameras([...conf.cameras]);
                  }}
                />
              );
            })}
          </>
        )}
        <DropdownMenuSeparator />
        {allCameras.map((item) => (
          <FilterCheckBox
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
      <DropdownMenuSeparator />
      <div className="p-2 flex justify-evenly items-center">
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
          variant="secondary"
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
  return (
    <>
      <div className="hidden h-9 md:flex p-2 justify-start items-center text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md cursor-pointer">
        <Switch
          id="reviewed"
          checked={showReviewed == 1}
          onCheckedChange={() => setShowReviewed(showReviewed == 0 ? 1 : 0)}
        />
        <Label className="ml-2 cursor-pointer" htmlFor="reviewed">
          Show Reviewed
        </Label>
      </div>

      <Button
        className="block md:hidden"
        size="sm"
        variant="secondary"
        onClick={() => setShowReviewed(showReviewed == 0 ? 1 : 0)}
      >
        <FaCheckCircle
          className={`${showReviewed == 1 ? "text-selected" : "text-muted-foreground"}`}
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
    <Button size="sm" className="flex items-center gap-2" variant="secondary">
      <FaCalendarAlt className="text-muted-foreground" />
      <div className="hidden md:block">
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
      <div className="p-2 flex justify-center items-center">
        <Button
          variant="secondary"
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
  updateLabelFilter: (labels: string[] | undefined) => void;
};
function GeneralFilterButton({
  allLabels,
  selectedLabels,
  updateLabelFilter,
}: GeneralFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    selectedLabels,
  );

  const trigger = (
    <Button size="sm" className="flex items-center gap-2" variant="secondary">
      <FaFilter className="text-muted-foreground" />
      <div className="hidden md:block">Filter</div>
    </Button>
  );
  const content = (
    <GeneralFilterContent
      allLabels={allLabels}
      selectedLabels={selectedLabels}
      currentLabels={currentLabels}
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
  updateLabelFilter: (labels: string[] | undefined) => void;
  setCurrentLabels: (labels: string[] | undefined) => void;
  onClose: () => void;
};
export function GeneralFilterContent({
  allLabels,
  selectedLabels,
  currentLabels,
  updateLabelFilter,
  setCurrentLabels,
  onClose,
}: GeneralFilterContentProps) {
  return (
    <>
      <div className="h-auto overflow-y-auto overflow-x-hidden">
        <div className="flex justify-between items-center my-2.5">
          <Label
            className="mx-2 text-secondary-foreground cursor-pointer"
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
            <div className="flex justify-between items-center">
              <Label
                className="w-full mx-2 text-secondary-foreground capitalize cursor-pointer"
                htmlFor={item}
              >
                {item.replaceAll("_", " ")}
              </Label>
              <Switch
                key={item}
                className="ml-1"
                id={item}
                checked={currentLabels?.includes(item) ?? false}
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    const updatedLabels = currentLabels
                      ? [...currentLabels]
                      : [];

                    updatedLabels.push(item);
                    setCurrentLabels(updatedLabels);
                  } else {
                    const updatedLabels = currentLabels
                      ? [...currentLabels]
                      : [];

                    // can not deselect the last item
                    if (updatedLabels.length > 1) {
                      updatedLabels.splice(updatedLabels.indexOf(item), 1);
                      setCurrentLabels(updatedLabels);
                    }
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <DropdownMenuSeparator />
      <div className="p-2 flex justify-evenly items-center">
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
          variant="secondary"
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
  return (
    <>
      <div className="hidden md:inline-flex items-center justify-center whitespace-nowrap text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground h-9 rounded-md px-3 mx-1 cursor-pointer">
        <Switch
          className="ml-1"
          id="collapse-motion"
          checked={motionOnly}
          onCheckedChange={() => {
            setMotionOnly(!motionOnly);
          }}
        />
        <Label
          className="mx-2 text-secondary-foreground cursor-pointer"
          htmlFor="collapse-motion"
        >
          Motion only
        </Label>
      </div>

      <div className="block md:hidden">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setMotionOnly(!motionOnly)}
        >
          <FaRunning
            className={`${motionOnly ? "text-selected" : "text-muted-foreground"}`}
          />
        </Button>
      </div>
    </>
  );
}
