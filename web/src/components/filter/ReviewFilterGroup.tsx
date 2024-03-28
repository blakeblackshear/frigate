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
import { FaCalendarAlt, FaFilter, FaRunning, FaVideo } from "react-icons/fa";
import { isMobile } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import FilterCheckBox from "./FilterCheckBox";
import ReviewActivityCalendar from "../overlay/ReviewActivityCalendar";

const ATTRIBUTES = ["amazon", "face", "fedex", "license_plate", "ups"];
const REVIEW_FILTERS = ["cameras", "date", "general", "motionOnly"] as const;
type ReviewFilters = (typeof REVIEW_FILTERS)[number];
const DEFAULT_REVIEW_FILTERS: ReviewFilters[] = [
  "cameras",
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
      {filters.includes("date") && (
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
      {filters.includes("general") && (
        <GeneralFilterButton
          allLabels={filterValues.labels}
          selectedLabels={filter?.labels}
          updateLabelFilter={(newLabels) => {
            onUpdateFilter({ ...filter, labels: newLabels });
          }}
          showReviewed={filter?.showReviewed || 0}
          setShowReviewed={(reviewed) =>
            onUpdateFilter({ ...filter, showReviewed: reviewed })
          }
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
  showReviewed?: 0 | 1;
  updateLabelFilter: (labels: string[] | undefined) => void;
  setShowReviewed: (reviewed?: 0 | 1) => void;
};
function GeneralFilterButton({
  allLabels,
  selectedLabels,
  showReviewed,
  updateLabelFilter,
  setShowReviewed,
}: GeneralFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const [reviewed, setReviewed] = useState(showReviewed ?? 0);
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
      showReviewed={showReviewed}
      reviewed={reviewed}
      updateLabelFilter={updateLabelFilter}
      setShowReviewed={setShowReviewed}
      setCurrentLabels={setCurrentLabels}
      setReviewed={setReviewed}
      onClose={() => setOpen(false)}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(open) => {
          if (!open) {
            setReviewed(showReviewed ?? 0);
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
          setReviewed(showReviewed ?? 0);
          setCurrentLabels(selectedLabels);
        }

        setOpen(open);
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side="left">{content}</PopoverContent>
    </Popover>
  );
}

type GeneralFilterContentProps = {
  allLabels: string[];
  selectedLabels: string[] | undefined;
  currentLabels: string[] | undefined;
  showReviewed?: 0 | 1;
  reviewed: 0 | 1;
  updateLabelFilter: (labels: string[] | undefined) => void;
  setCurrentLabels: (labels: string[] | undefined) => void;
  setShowReviewed: (reviewed?: 0 | 1) => void;
  setReviewed: (reviewed: 0 | 1) => void;
  onClose: () => void;
};
export function GeneralFilterContent({
  allLabels,
  selectedLabels,
  currentLabels,
  showReviewed,
  reviewed,
  updateLabelFilter,
  setCurrentLabels,
  setShowReviewed,
  setReviewed,
  onClose,
}: GeneralFilterContentProps) {
  return (
    <>
      <div className="flex p-2 justify-start items-center">
        <Switch
          id="reviewed"
          checked={reviewed == 1}
          onCheckedChange={() => setReviewed(reviewed == 0 ? 1 : 0)}
        />
        <Label className="ml-2" htmlFor="reviewed">
          Show Reviewed
        </Label>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="flex justify-center items-center">
        Filter Labels
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <div className="h-auto overflow-y-auto overflow-x-hidden">
        <FilterCheckBox
          isChecked={currentLabels == undefined}
          label="All Labels"
          onCheckedChange={(isChecked) => {
            if (isChecked) {
              setCurrentLabels(undefined);
            }
          }}
        />
        <DropdownMenuSeparator />
        {allLabels.map((item) => (
          <FilterCheckBox
            key={item}
            isChecked={currentLabels?.includes(item) ?? false}
            label={item.replaceAll("_", " ")}
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
      <DropdownMenuSeparator />
      <div className="p-2 flex justify-evenly items-center">
        <Button
          variant="select"
          onClick={() => {
            if (reviewed != showReviewed) {
              setShowReviewed(reviewed);
            }

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
            setReviewed(0);
            setShowReviewed(undefined);
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
      <div className="hidden md:inline-flex items-center justify-center whitespace-nowrap text-sm bg-secondary text-secondary-foreground h-9 rounded-md md:px-3 md:mx-1">
        <Switch
          className="ml-1"
          id="collapse-motion"
          checked={motionOnly}
          onCheckedChange={() => {
            setMotionOnly(!motionOnly);
          }}
        />
        <Label
          className="mx-2 text-secondary-foreground"
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
