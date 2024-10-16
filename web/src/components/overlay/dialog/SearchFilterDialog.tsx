import { FaArrowRight, FaCog } from "react-icons/fa";

import { useEffect, useMemo, useState } from "react";
import { PlatformAwareSheet } from "./PlatformAwareDialog";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import {
  DEFAULT_TIME_RANGE_AFTER,
  DEFAULT_TIME_RANGE_BEFORE,
  SearchFilter,
  SearchSource,
} from "@/types/search";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { isDesktop, isMobileOnly } from "react-device-detect";
import { useFormattedHour } from "@/hooks/use-date-utils";
import FilterSwitch from "@/components/filter/FilterSwitch";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type SearchFilterDialogProps = {
  config?: FrigateConfig;
  filter?: SearchFilter;
  filterValues: {
    cameras: string[];
    labels: string[];
    zones: string[];
    search_type: SearchSource[];
  };
  onUpdateFilter: (filter: SearchFilter) => void;
};
export default function SearchFilterDialog({
  config,
  filter,
  filterValues,
  onUpdateFilter,
}: SearchFilterDialogProps) {
  // data

  const [currentFilter, setCurrentFilter] = useState(filter ?? {});
  const { data: allSubLabels } = useSWR(["sub_labels", { split_joined: 1 }]);

  // state

  const [open, setOpen] = useState(false);

  const moreFiltersSelected = useMemo(
    () =>
      currentFilter &&
      (currentFilter.time_range ||
        (currentFilter.zones?.length ?? 0) > 0 ||
        (currentFilter.sub_labels?.length ?? 0) > 0 ||
        (currentFilter.search_type?.length ?? 2) !== 2),
    [currentFilter],
  );

  const trigger = (
    <Button
      className="flex items-center gap-2"
      size="sm"
      variant={moreFiltersSelected ? "select" : "default"}
    >
      <FaCog
        className={cn(
          moreFiltersSelected ? "text-white" : "text-secondary-foreground",
        )}
      />
      More Filters
    </Button>
  );
  const content = (
    <div className="space-y-3">
      <TimeRangeFilterContent
        config={config}
        timeRange={currentFilter.time_range}
        updateTimeRange={(newRange) =>
          setCurrentFilter({ ...currentFilter, time_range: newRange })
        }
      />
      <ZoneFilterContent
        allZones={filterValues.zones}
        zones={currentFilter.zones}
        updateZones={(newZones) =>
          setCurrentFilter({ ...currentFilter, zones: newZones })
        }
      />
      <SubFilterContent
        allSubLabels={allSubLabels}
        subLabels={currentFilter.sub_labels}
        setSubLabels={(newSubLabels) =>
          setCurrentFilter({ ...currentFilter, sub_labels: newSubLabels })
        }
      />
      {config?.semantic_search?.enabled &&
        !currentFilter?.search_type?.includes("similarity") && (
          <SearchTypeContent
            searchSources={
              currentFilter?.search_type ?? ["thumbnail", "description"]
            }
            setSearchSources={(newSearchSource) =>
              setCurrentFilter({
                ...currentFilter,
                search_type: newSearchSource,
              })
            }
          />
        )}
      {isDesktop && <DropdownMenuSeparator />}
      <div className="flex items-center justify-evenly p-2">
        <Button
          variant="select"
          onClick={() => {
            if (currentFilter != filter) {
              onUpdateFilter(currentFilter);
            }

            setOpen(false);
          }}
        >
          Apply
        </Button>
        <Button
          onClick={() => {
            setCurrentFilter((prevFilter) => ({
              ...prevFilter,
              time_range: undefined,
              zones: undefined,
              sub_labels: undefined,
              search_type: ["thumbnail", "description"],
            }));
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  return (
    <PlatformAwareSheet
      trigger={trigger}
      content={content}
      contentClassName={cn(
        "w-auto lg:min-w-[275px] scrollbar-container h-full overflow-auto px-4",
        isMobileOnly && "pb-20",
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

type TimeRangeFilterContentProps = {
  config?: FrigateConfig;
  timeRange?: string;
  updateTimeRange: (range: string | undefined) => void;
};
function TimeRangeFilterContent({
  config,
  timeRange,
  updateTimeRange,
}: TimeRangeFilterContentProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const [afterHour, beforeHour] = useMemo(() => {
    if (!timeRange || !timeRange.includes(",")) {
      return [DEFAULT_TIME_RANGE_AFTER, DEFAULT_TIME_RANGE_BEFORE];
    }

    return timeRange.split(",");
  }, [timeRange]);

  const [selectedAfterHour, setSelectedAfterHour] = useState(afterHour);
  const [selectedBeforeHour, setSelectedBeforeHour] = useState(beforeHour);

  // format based on locale

  const formattedSelectedAfter = useFormattedHour(config, selectedAfterHour);
  const formattedSelectedBefore = useFormattedHour(config, selectedBeforeHour);

  useEffect(() => {
    setSelectedAfterHour(afterHour);
    setSelectedBeforeHour(beforeHour);
    // only refresh when state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  useEffect(() => {
    if (
      selectedAfterHour == DEFAULT_TIME_RANGE_AFTER &&
      selectedBeforeHour == DEFAULT_TIME_RANGE_BEFORE
    ) {
      updateTimeRange(undefined);
    } else {
      updateTimeRange(`${selectedAfterHour},${selectedBeforeHour}`);
    }
    // only refresh when state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAfterHour, selectedBeforeHour]);

  return (
    <div className="overflow-x-hidden">
      <div className="text-lg">Time Range</div>
      <div className="mt-3 flex flex-row items-center justify-center gap-2">
        <Popover
          open={startOpen}
          onOpenChange={(open) => {
            if (!open) {
              setStartOpen(false);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              className={`text-primary ${isDesktop ? "" : "text-xs"} `}
              variant={startOpen ? "select" : "default"}
              size="sm"
              onClick={() => {
                setStartOpen(true);
                setEndOpen(false);
              }}
            >
              {formattedSelectedAfter}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex flex-row items-center justify-center">
            <input
              className="text-md mx-4 w-full border border-input bg-background p-1 text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
              id="startTime"
              type="time"
              value={selectedAfterHour}
              step="60"
              onChange={(e) => {
                const clock = e.target.value;
                const [hour, minute, _] = clock.split(":");
                setSelectedAfterHour(`${hour}:${minute}`);
              }}
            />
          </PopoverContent>
        </Popover>
        <FaArrowRight className="size-4 text-primary" />
        <Popover
          open={endOpen}
          onOpenChange={(open) => {
            if (!open) {
              setEndOpen(false);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              className={`text-primary ${isDesktop ? "" : "text-xs"}`}
              variant={endOpen ? "select" : "default"}
              size="sm"
              onClick={() => {
                setEndOpen(true);
                setStartOpen(false);
              }}
            >
              {formattedSelectedBefore}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex flex-col items-center">
            <input
              className="text-md mx-4 w-full border border-input bg-background p-1 text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
              id="startTime"
              type="time"
              value={
                selectedBeforeHour == "24:00" ? "23:59" : selectedBeforeHour
              }
              step="60"
              onChange={(e) => {
                const clock = e.target.value;
                const [hour, minute, _] = clock.split(":");
                setSelectedBeforeHour(`${hour}:${minute}`);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

type ZoneFilterContentProps = {
  allZones?: string[];
  zones?: string[];
  updateZones: (zones: string[] | undefined) => void;
};
export function ZoneFilterContent({
  allZones,
  zones,
  updateZones,
}: ZoneFilterContentProps) {
  return (
    <>
      <div className="overflow-x-hidden">
        <DropdownMenuSeparator className="mb-3" />
        <div className="text-lg">Zones</div>
        {allZones && (
          <>
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
                checked={zones == undefined}
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    updateZones(undefined);
                  }
                }}
              />
            </div>
            <div className="mt-2.5 flex flex-col gap-2.5">
              {allZones.map((item) => (
                <FilterSwitch
                  key={item}
                  label={item.replaceAll("_", " ")}
                  isChecked={zones?.includes(item) ?? false}
                  onCheckedChange={(isChecked) => {
                    if (isChecked) {
                      const updatedZones = zones ? [...zones] : [];

                      updatedZones.push(item);
                      updateZones(updatedZones);
                    } else {
                      const updatedZones = zones ? [...zones] : [];

                      // can not deselect the last item
                      if (updatedZones.length > 1) {
                        updatedZones.splice(updatedZones.indexOf(item), 1);
                        updateZones(updatedZones);
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

type SubFilterContentProps = {
  allSubLabels: string[];
  subLabels: string[] | undefined;
  setSubLabels: (labels: string[] | undefined) => void;
};
export function SubFilterContent({
  allSubLabels,
  subLabels,
  setSubLabels,
}: SubFilterContentProps) {
  return (
    <div className="overflow-x-hidden">
      <DropdownMenuSeparator className="mb-3" />
      <div className="text-lg">Sub Labels</div>
      <div className="mb-5 mt-2.5 flex items-center justify-between">
        <Label className="mx-2 cursor-pointer text-primary" htmlFor="allLabels">
          All Sub Labels
        </Label>
        <Switch
          className="ml-1"
          id="allLabels"
          checked={subLabels == undefined}
          onCheckedChange={(isChecked) => {
            if (isChecked) {
              setSubLabels(undefined);
            }
          }}
        />
      </div>
      <div className="mt-2.5 flex flex-col gap-2.5">
        {allSubLabels.map((item) => (
          <FilterSwitch
            key={item}
            label={item.replaceAll("_", " ")}
            isChecked={subLabels?.includes(item) ?? false}
            onCheckedChange={(isChecked) => {
              if (isChecked) {
                const updatedLabels = subLabels ? [...subLabels] : [];

                updatedLabels.push(item);
                setSubLabels(updatedLabels);
              } else {
                const updatedLabels = subLabels ? [...subLabels] : [];

                // can not deselect the last item
                if (updatedLabels.length > 1) {
                  updatedLabels.splice(updatedLabels.indexOf(item), 1);
                  setSubLabels(updatedLabels);
                }
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

type SearchTypeContentProps = {
  searchSources: SearchSource[] | undefined;
  setSearchSources: (sources: SearchSource[] | undefined) => void;
};
export function SearchTypeContent({
  searchSources,
  setSearchSources,
}: SearchTypeContentProps) {
  return (
    <>
      <div className="overflow-x-hidden">
        <DropdownMenuSeparator className="mb-3" />
        <div className="text-lg">Search Sources</div>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <FilterSwitch
            label="Thumbnail Image"
            isChecked={searchSources?.includes("thumbnail") ?? false}
            onCheckedChange={(isChecked) => {
              const updatedSources = searchSources ? [...searchSources] : [];

              if (isChecked) {
                updatedSources.push("thumbnail");
                setSearchSources(updatedSources);
              } else {
                if (updatedSources.length > 1) {
                  const index = updatedSources.indexOf("thumbnail");
                  if (index !== -1) updatedSources.splice(index, 1);
                  setSearchSources(updatedSources);
                }
              }
            }}
          />
          <FilterSwitch
            label="Description"
            isChecked={searchSources?.includes("description") ?? false}
            onCheckedChange={(isChecked) => {
              const updatedSources = searchSources ? [...searchSources] : [];

              if (isChecked) {
                updatedSources.push("description");
                setSearchSources(updatedSources);
              } else {
                if (updatedSources.length > 1) {
                  const index = updatedSources.indexOf("description");
                  if (index !== -1) updatedSources.splice(index, 1);
                  setSearchSources(updatedSources);
                }
              }
            }}
          />
        </div>
      </div>
    </>
  );
}
