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
import { CameraGroupConfig, FrigateConfig } from "@/types/frigateConfig";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { isDesktop } from "react-device-detect";
import { useFormattedHour } from "@/hooks/use-date-utils";
import Heading from "@/components/ui/heading";
import FilterSwitch from "@/components/filter/FilterSwitch";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

type SearchFilterDialogProps = {
  config?: FrigateConfig;
  filter?: SearchFilter;
  filterValues: {
    cameras: string[];
    labels: string[];
    zones: string[];
    search_type: SearchSource[];
  };
  groups: [string, CameraGroupConfig][];
  onUpdateFilter: (filter: SearchFilter) => void;
};
export default function SearchFilterDialog({
  config,
  filter,
  filterValues,
  groups,
  onUpdateFilter,
}: SearchFilterDialogProps) {
  // data

  const [currentFilter, setCurrentFilter] = useState(filter ?? {});
  const { data: allSubLabels } = useSWR(["sub_labels", { split_joined: 1 }]);

  // state

  const [open, setOpen] = useState(false);

  const trigger = (
    <Button className="flex items-center gap-2" size="sm">
      <FaCog className={"text-secondary-foreground"} />
      More Filters
    </Button>
  );
  const content = (
    <>
      <TimeRangeFilterContent
        config={config}
        timeRange={currentFilter.time_range}
        updateTimeRange={(newRange) =>
          setCurrentFilter({ time_range: newRange, ...currentFilter })
        }
      />
      <ZoneFilterContent
        allZones={filterValues.zones}
        zones={currentFilter.zones}
        updateZones={(newZones) =>
          setCurrentFilter({ zones: newZones, ...currentFilter })
        }
      />
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
            setCurrentFilter(filter ?? {});
          }}
        >
          Reset
        </Button>
      </div>
    </>
  );

  return (
    <PlatformAwareSheet
      trigger={trigger}
      content={content}
      contentClassName="w-auto lg:w-[300px]"
      open={open}
      onOpenChange={setOpen}
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
    <div className="scrollbar-container h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden">
      <Heading as="h4">Time Range</Heading>
      <div className="my-5 flex flex-row items-center justify-center gap-2">
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
      <div className="scrollbar-container h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden">
        {allZones && (
          <>
            {isDesktop && <DropdownMenuSeparator />}
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
            <div className="my-2.5 flex flex-col gap-2.5">
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

/**
 * {filters.includes("date") && (
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
      {filters.includes("time") && (
        <TimeRangeFilterButton
          config={config}
          timeRange={filter?.time_range}
          updateTimeRange={(time_range) =>
            onUpdateFilter({ ...filter, time_range })
          }
        />
      )}
      {filters.includes("zone") && allZones.length > 0 && (
        <ZoneFilterButton
          allZones={filterValues.zones}
          selectedZones={filter?.zones}
          updateZoneFilter={(newZones) =>
            onUpdateFilter({ ...filter, zones: newZones })
          }
        />
      )}
      {filters.includes("sub") && (
        <SubFilterButton
          allSubLabels={allSubLabels}
          selectedSubLabels={filter?.sub_labels}
          updateSubLabelFilter={(newSubLabels) =>
            onUpdateFilter({ ...filter, sub_labels: newSubLabels })
          }
        />
      )}
      {config?.semantic_search?.enabled &&
        filters.includes("source") &&
        !filter?.search_type?.includes("similarity") && (
          <SearchTypeButton
            selectedSearchSources={
              filter?.search_type ?? ["thumbnail", "description"]
            }
            updateSearchSourceFilter={(newSearchSource) =>
              onUpdateFilter({ ...filter, search_type: newSearchSource })
            }
          />
        )}
 */
