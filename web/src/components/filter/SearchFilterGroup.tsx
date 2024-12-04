import { Button } from "../ui/button";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";
import { getEndOfDayTimestamp } from "@/utils/dateUtil";
import { isDesktop, isMobile } from "react-device-detect";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import FilterSwitch from "./FilterSwitch";
import { FilterList } from "@/types/filter";
import { CamerasFilterButton } from "./CamerasFilterButton";
import {
  DEFAULT_SEARCH_FILTERS,
  SearchFilter,
  SearchFilters,
  SearchSource,
  SearchSortType,
} from "@/types/search";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { MdLabel, MdSort } from "react-icons/md";
import PlatformAwareDialog from "../overlay/dialog/PlatformAwareDialog";
import SearchFilterDialog from "../overlay/dialog/SearchFilterDialog";
import { CalendarRangeFilterButton } from "./CalendarFilterButton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type SearchFilterGroupProps = {
  className: string;
  filters?: SearchFilters[];
  filter?: SearchFilter;
  filterList?: FilterList;
  onUpdateFilter: (filter: SearchFilter) => void;
};
export default function SearchFilterGroup({
  className,
  filters = DEFAULT_SEARCH_FILTERS,
  filter,
  filterList,
  onUpdateFilter,
}: SearchFilterGroupProps) {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

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
      Object.entries(cameraConfig.zones).map(([name, _]) => {
        zones.add(name);
      });
    });

    return [...zones].sort();
  }, [config, filterList, filter]);

  const filterValues = useMemo(
    () => ({
      cameras: Object.keys(config?.cameras || {}),
      labels: Object.values(allLabels || {}),
      zones: Object.values(allZones || {}),
      search_type: ["thumbnail", "description"] as SearchSource[],
    }),
    [config, allLabels, allZones],
  );

  const availableSortTypes = useMemo(() => {
    const sortTypes = ["date_asc", "date_desc"];
    if (filter?.min_score || filter?.max_score) {
      sortTypes.push("score_desc", "score_asc");
    }
    if (filter?.event_id || filter?.query) {
      sortTypes.push("relevance");
    }
    return sortTypes as SearchSortType[];
  }, [filter]);

  const defaultSortType = useMemo<SearchSortType>(() => {
    if (filter?.query || filter?.event_id) {
      return "relevance";
    } else {
      return "date_desc";
    }
  }, [filter]);

  const groups = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.entries(config.camera_groups).sort(
      (a, b) => a[1].order - b[1].order,
    );
  }, [config]);

  // handle updating filters

  const onUpdateSelectedRange = useCallback(
    (range?: DateRange) => {
      onUpdateFilter({
        ...filter,
        after:
          range?.from == undefined ? undefined : range.from.getTime() / 1000,
        before:
          range?.to == undefined ? undefined : getEndOfDayTimestamp(range.to),
      });
    },
    [filter, onUpdateFilter],
  );

  return (
    <div
      className={cn(
        "scrollbar-container flex justify-center gap-2 overflow-x-auto",
        className,
      )}
    >
      {filters.includes("cameras") && (
        <CamerasFilterButton
          allCameras={filterValues.cameras}
          groups={groups}
          selectedCameras={filter?.cameras}
          hideText={false}
          updateCameraFilter={(newCameras) => {
            onUpdateFilter({ ...filter, cameras: newCameras });
          }}
        />
      )}
      {filters.includes("general") && (
        <GeneralFilterButton
          allLabels={filterValues.labels}
          selectedLabels={filter?.labels}
          updateLabelFilter={(newLabels) => {
            onUpdateFilter({ ...filter, labels: newLabels });
          }}
        />
      )}
      {filters.includes("date") && (
        <CalendarRangeFilterButton
          range={
            filter?.after == undefined || filter?.before == undefined
              ? undefined
              : {
                  from: new Date(filter.after * 1000),
                  to: new Date(filter.before * 1000),
                }
          }
          defaultText={isMobile ? "Dates" : "All Dates"}
          updateSelectedRange={onUpdateSelectedRange}
        />
      )}
      <SearchFilterDialog
        config={config}
        filter={filter}
        filterValues={filterValues}
        onUpdateFilter={onUpdateFilter}
      />
      {filters.includes("sort") && Object.keys(filter ?? {}).length > 0 && (
        <SortTypeButton
          availableSortTypes={availableSortTypes ?? []}
          defaultSortType={defaultSortType}
          selectedSortType={filter?.sort}
          updateSortType={(newSort) => {
            onUpdateFilter({ ...filter, sort: newSort });
          }}
        />
      )}
    </div>
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

  const buttonText = useMemo(() => {
    if (isMobile) {
      return "Labels";
    }

    if (!selectedLabels || selectedLabels.length == 0) {
      return "All Labels";
    }

    if (selectedLabels.length == 1) {
      return selectedLabels[0];
    }

    return `${selectedLabels.length} Labels`;
  }, [selectedLabels]);

  // ui

  useEffect(() => {
    setCurrentLabels(selectedLabels);
    // only refresh when state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabels]);

  const trigger = (
    <Button
      size="sm"
      variant={selectedLabels?.length ? "select" : "default"}
      className="flex items-center gap-2 capitalize"
      aria-label="Labels"
    >
      <MdLabel
        className={`${selectedLabels?.length ? "text-selected-foreground" : "text-secondary-foreground"}`}
      />
      <div
        className={`${selectedLabels?.length ? "text-selected-foreground" : "text-primary"}`}
      >
        {buttonText}
      </div>
    </Button>
  );
  const content = (
    <GeneralFilterContent
      allLabels={allLabels}
      selectedLabels={selectedLabels}
      currentLabels={currentLabels}
      setCurrentLabels={setCurrentLabels}
      updateLabelFilter={updateLabelFilter}
      onClose={() => setOpen(false)}
    />
  );

  return (
    <PlatformAwareDialog
      trigger={trigger}
      content={content}
      contentClassName={
        isDesktop
          ? "scrollbar-container h-auto max-h-[80dvh] overflow-y-auto"
          : "max-h-[75dvh] overflow-hidden p-4"
      }
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
      <div className="overflow-x-hidden">
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
      </div>
      <DropdownMenuSeparator />
      <div className="flex items-center justify-evenly p-2">
        <Button
          aria-label="Apply"
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
          aria-label="Reset"
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

type SortTypeButtonProps = {
  availableSortTypes: SearchSortType[];
  defaultSortType: SearchSortType;
  selectedSortType: SearchSortType | undefined;
  updateSortType: (sortType: SearchSortType | undefined) => void;
};
function SortTypeButton({
  availableSortTypes,
  defaultSortType,
  selectedSortType,
  updateSortType,
}: SortTypeButtonProps) {
  const [open, setOpen] = useState(false);
  const [currentSortType, setCurrentSortType] = useState<
    SearchSortType | undefined
  >(selectedSortType as SearchSortType);

  // ui

  useEffect(() => {
    setCurrentSortType(selectedSortType);
    // only refresh when state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSortType]);

  const trigger = (
    <Button
      size="sm"
      variant={
        selectedSortType != defaultSortType && selectedSortType != undefined
          ? "select"
          : "default"
      }
      className="flex items-center gap-2 capitalize"
      aria-label="Labels"
    >
      <MdSort
        className={`${selectedSortType != defaultSortType && selectedSortType != undefined ? "text-selected-foreground" : "text-secondary-foreground"}`}
      />
      <div
        className={`${selectedSortType != defaultSortType && selectedSortType != undefined ? "text-selected-foreground" : "text-primary"}`}
      >
        Sort
      </div>
    </Button>
  );
  const content = (
    <SortTypeContent
      availableSortTypes={availableSortTypes ?? []}
      defaultSortType={defaultSortType}
      selectedSortType={selectedSortType}
      currentSortType={currentSortType}
      setCurrentSortType={setCurrentSortType}
      updateSortType={updateSortType}
      onClose={() => setOpen(false)}
    />
  );

  return (
    <PlatformAwareDialog
      trigger={trigger}
      content={content}
      contentClassName={
        isDesktop
          ? "scrollbar-container h-auto max-h-[80dvh] overflow-y-auto"
          : "max-h-[75dvh] overflow-hidden p-4"
      }
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setCurrentSortType(selectedSortType);
        }

        setOpen(open);
      }}
    />
  );
}

type SortTypeContentProps = {
  availableSortTypes: SearchSortType[];
  defaultSortType: SearchSortType;
  selectedSortType: SearchSortType | undefined;
  currentSortType: SearchSortType | undefined;
  updateSortType: (sort_type: SearchSortType | undefined) => void;
  setCurrentSortType: (sort_type: SearchSortType | undefined) => void;
  onClose: () => void;
};
export function SortTypeContent({
  availableSortTypes,
  defaultSortType,
  selectedSortType,
  currentSortType,
  updateSortType,
  setCurrentSortType,
  onClose,
}: SortTypeContentProps) {
  const sortLabels = {
    date_asc: "Date (Ascending)",
    date_desc: "Date (Descending)",
    score_asc: "Object Score (Ascending)",
    score_desc: "Object Score (Descending)",
    relevance: "Relevance",
  };

  return (
    <>
      <div className="overflow-x-hidden">
        <div className="my-2.5 flex flex-col gap-2.5">
          <RadioGroup
            value={
              Array.isArray(currentSortType)
                ? currentSortType?.[0]
                : (currentSortType ?? defaultSortType)
            }
            defaultValue={defaultSortType}
            onValueChange={(value) =>
              setCurrentSortType(value as SearchSortType)
            }
            className="w-full space-y-1"
          >
            {availableSortTypes.map((value) => (
              <div className="flex flex-row gap-2">
                <RadioGroupItem
                  key={value}
                  value={value}
                  id={`sort-${value}`}
                  className={
                    value == (currentSortType ?? defaultSortType)
                      ? "bg-selected from-selected/50 to-selected/90 text-selected"
                      : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                  }
                />
                <Label
                  htmlFor={`sort-${value}`}
                  className="flex cursor-pointer items-center space-x-2"
                >
                  <span>{sortLabels[value]}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>
      <DropdownMenuSeparator />
      <div className="flex items-center justify-evenly p-2">
        <Button
          aria-label="Apply"
          variant="select"
          onClick={() => {
            if (selectedSortType != currentSortType) {
              updateSortType(currentSortType);
            }

            onClose();
          }}
        >
          Apply
        </Button>
        <Button
          aria-label="Reset"
          onClick={() => {
            setCurrentSortType(undefined);
            updateSortType(undefined);
          }}
        >
          Reset
        </Button>
      </div>
    </>
  );
}
