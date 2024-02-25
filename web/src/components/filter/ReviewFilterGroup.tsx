import { LuCalendar, LuCheck, LuFilter, LuVideo } from "react-icons/lu";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Calendar } from "../ui/calendar";
import { ReviewFilter } from "@/types/review";
import { getEndOfDayTimestamp } from "@/utils/dateUtil";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";

const ATTRIBUTES = ["amazon", "face", "fedex", "license_plate", "ups"];

type ReviewFilterGroupProps = {
  filter?: ReviewFilter;
  onUpdateFilter: (filter: ReviewFilter) => void;
};

export default function ReviewFilterGroup({
  filter,
  onUpdateFilter,
}: ReviewFilterGroupProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const allLabels = useMemo<string[]>(() => {
    if (!config) {
      return [];
    }

    const labels = new Set<string>();
    const cameras = filter?.cameras || Object.keys(config.cameras);

    cameras.forEach((camera) => {
      config.cameras[camera].objects.track.forEach((label) => {
        if (!ATTRIBUTES.includes(label)) {
          labels.add(label);
        }
      });
    });

    return [...labels];
  }, [config, filter]);

  const filterValues = useMemo(
    () => ({
      cameras: Object.keys(config?.cameras || {}),
      labels: Object.values(allLabels || {}),
    }),
    [config, allLabels]
  );

  // handle updating filters

  const onUpdateSelectedDay = useCallback(
    (day?: Date) => {
      onUpdateFilter({
        ...filter,
        after: day == undefined ? undefined : day.getTime() / 1000,
        before: day == undefined ? undefined : getEndOfDayTimestamp(day),
      });
    },
    [onUpdateFilter]
  );

  return (
    <div className="mr-2">
      <CamerasFilterButton
        allCameras={filterValues.cameras}
        selectedCameras={filter?.cameras}
        updateCameraFilter={(newCameras) => {
          onUpdateFilter({ ...filter, cameras: newCameras });
        }}
      />
      <CalendarFilterButton
        day={
          filter?.after == undefined ? undefined : new Date(filter.after * 1000)
        }
        updateSelectedDay={onUpdateSelectedDay}
      />
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
    </div>
  );
}

type CameraFilterButtonProps = {
  allCameras: string[];
  selectedCameras: string[] | undefined;
  updateCameraFilter: (cameras: string[] | undefined) => void;
};
function CamerasFilterButton({
  allCameras,
  selectedCameras,
  updateCameraFilter,
}: CameraFilterButtonProps) {
  const [currentCameras, setCurrentCameras] = useState<string[] | undefined>(
    selectedCameras
  );

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) {
          updateCameraFilter(currentCameras);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button className="mx-1 capitalize" variant="secondary">
          <LuVideo className=" mr-[10px]" />
          {selectedCameras == undefined
            ? "All Cameras"
            : `${selectedCameras.length} Cameras`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Filter Cameras</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <FilterCheckBox
          isChecked={currentCameras == undefined}
          label="All Cameras"
          onCheckedChange={(isChecked) => {
            if (isChecked) {
              setCurrentCameras(undefined);
            }
          }}
        />
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
        <DropdownMenuSeparator />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type CalendarFilterButtonProps = {
  day?: Date;
  updateSelectedDay: (day?: Date) => void;
};
function CalendarFilterButton({
  day,
  updateSelectedDay,
}: CalendarFilterButtonProps) {
  const [selectedDay, setSelectedDay] = useState(day);
  const disabledDates = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24, -1, 0, 0);
    const future = new Date();
    future.setFullYear(tomorrow.getFullYear() + 10);
    return { from: tomorrow, to: future };
  }, []);
  const selectedDate = useFormattedTimestamp(
    day == undefined ? 0 : day?.getTime() / 1000,
    "%b %-d"
  );

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) {
          updateSelectedDay(selectedDay);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button className="mx-1" variant="secondary">
          <LuCalendar className=" mr-[10px]" />
          {day == undefined ? "Last 24 Hours" : selectedDate}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="single"
          disabled={disabledDates}
          selected={selectedDay}
          onSelect={(day) => {
            setSelectedDay(day);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

type GeneralFilterButtonProps = {
  allLabels: string[];
  selectedLabels: string[] | undefined;
  updateLabelFilter: (labels: string[] | undefined) => void;
  showReviewed?: 0 | 1;
  setShowReviewed: (reviewed?: 0 | 1) => void;
};
function GeneralFilterButton({
  allLabels,
  selectedLabels,
  updateLabelFilter,
  showReviewed,
  setShowReviewed,
}: GeneralFilterButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="mx-1" variant="secondary">
          <LuFilter className=" mr-[10px]" />
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent side="left" asChild>
        <div className="w-80 flex">
          <LabelsFilterButton
            allLabels={allLabels}
            selectedLabels={selectedLabels}
            updateLabelFilter={updateLabelFilter}
          />
          <Button
            className="capitalize flex justify-between items-center cursor-pointer w-full"
            variant="secondary"
            onClick={(_) => setShowReviewed(showReviewed == 0 ? 1 : 0)}
          >
            {showReviewed ? (
              <LuCheck className="w-6 h-6" />
            ) : (
              <div className="w-6 h-6" />
            )}
            <div className="ml-1 w-full flex justify-start">Show Reviewed</div>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type LabelFilterButtonProps = {
  allLabels: string[];
  selectedLabels: string[] | undefined;
  updateLabelFilter: (labels: string[] | undefined) => void;
};
function LabelsFilterButton({
  allLabels,
  selectedLabels,
  updateLabelFilter,
}: LabelFilterButtonProps) {
  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    selectedLabels
  );

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) {
          updateLabelFilter(currentLabels);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button className="mx-1 capitalize" variant="secondary">
          <LuVideo className=" mr-[10px]" />
          {selectedLabels == undefined
            ? "All Labels"
            : `${selectedLabels.length} Labels`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Filter Labels</DropdownMenuLabel>
        <DropdownMenuSeparator />
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
        <DropdownMenuSeparator />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type FilterCheckBoxProps = {
  label: string;
  isChecked: boolean;
  onCheckedChange: (isChecked: boolean) => void;
};

function FilterCheckBox({
  label,
  isChecked,
  onCheckedChange,
}: FilterCheckBoxProps) {
  return (
    <Button
      className="capitalize flex justify-between items-center cursor-pointer w-full"
      variant="ghost"
      onClick={(_) => onCheckedChange(!isChecked)}
    >
      {isChecked ? (
        <LuCheck className="w-6 h-6" />
      ) : (
        <div className="w-6 h-6" />
      )}
      <div className="ml-1 w-full flex justify-start">{label}</div>
    </Button>
  );
}
