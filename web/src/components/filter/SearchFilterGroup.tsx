import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
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
import { CalendarRangeFilterButton } from "./CalendarFilterButton";
import { CamerasFilterButton } from "./CamerasFilterButton";
import {
  DEFAULT_SEARCH_FILTERS,
  SearchFilter,
  SearchFilters,
  SearchSource,
  DEFAULT_TIME_RANGE_AFTER,
  DEFAULT_TIME_RANGE_BEFORE,
} from "@/types/search";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import SubFilterIcon from "../icons/SubFilterIcon";
import { FaLocationDot } from "react-icons/fa6";
import { MdLabel } from "react-icons/md";
import SearchSourceIcon from "../icons/SearchSourceIcon";
import PlatformAwareDialog from "../overlay/dialog/PlatformAwareDialog";
import { FaArrowRight, FaClock } from "react-icons/fa";
import { useFormattedHour } from "@/hooks/use-date-utils";

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

  const { data: allSubLabels } = useSWR(["sub_labels", { split_joined: 1 }]);

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
      {filters.includes("general") && (
        <GeneralFilterButton
          allLabels={filterValues.labels}
          selectedLabels={filter?.labels}
          updateLabelFilter={(newLabels) => {
            onUpdateFilter({ ...filter, labels: newLabels });
          }}
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
      contentClassName={isDesktop ? "" : "max-h-[75dvh] overflow-hidden p-4"}
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
      <div className="scrollbar-container h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden">
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

type TimeRangeFilterButtonProps = {
  config?: FrigateConfig;
  timeRange?: string;
  updateTimeRange: (range: string | undefined) => void;
};
function TimeRangeFilterButton({
  config,
  timeRange,
  updateTimeRange,
}: TimeRangeFilterButtonProps) {
  const [open, setOpen] = useState(false);
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

  const formattedAfter = useFormattedHour(config, afterHour);
  const formattedBefore = useFormattedHour(config, beforeHour);
  const formattedSelectedAfter = useFormattedHour(config, selectedAfterHour);
  const formattedSelectedBefore = useFormattedHour(config, selectedBeforeHour);

  useEffect(() => {
    setSelectedAfterHour(afterHour);
    setSelectedBeforeHour(beforeHour);
    // only refresh when state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const trigger = (
    <Button
      size="sm"
      variant={timeRange ? "select" : "default"}
      className="flex items-center gap-2 capitalize"
    >
      <FaClock
        className={`${timeRange ? "text-selected-foreground" : "text-secondary-foreground"}`}
      />
      <div
        className={`${timeRange ? "text-selected-foreground" : "text-primary"}`}
      >
        {timeRange ? `${formattedAfter} - ${formattedBefore}` : "All Times"}
      </div>
    </Button>
  );
  const content = (
    <div className="scrollbar-container h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden">
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
      <DropdownMenuSeparator />
      <div className="flex items-center justify-evenly p-2">
        <Button
          variant="select"
          onClick={() => {
            if (
              selectedAfterHour == DEFAULT_TIME_RANGE_AFTER &&
              selectedBeforeHour == DEFAULT_TIME_RANGE_BEFORE
            ) {
              updateTimeRange(undefined);
            } else {
              updateTimeRange(`${selectedAfterHour},${selectedBeforeHour}`);
            }

            setOpen(false);
          }}
        >
          Apply
        </Button>
        <Button
          onClick={() => {
            setSelectedAfterHour(DEFAULT_TIME_RANGE_AFTER);
            setSelectedBeforeHour(DEFAULT_TIME_RANGE_BEFORE);
            updateTimeRange(undefined);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  return (
    <PlatformAwareDialog
      trigger={trigger}
      content={content}
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
      }}
    />
  );
}

type ZoneFilterButtonProps = {
  allZones: string[];
  selectedZones?: string[];
  updateZoneFilter: (zones: string[] | undefined) => void;
};
function ZoneFilterButton({
  allZones,
  selectedZones,
  updateZoneFilter,
}: ZoneFilterButtonProps) {
  const [open, setOpen] = useState(false);

  const [currentZones, setCurrentZones] = useState<string[] | undefined>(
    selectedZones,
  );

  const buttonText = useMemo(() => {
    if (isMobile) {
      return "Zones";
    }

    if (!selectedZones || selectedZones.length == 0) {
      return "All Zones";
    }

    if (selectedZones.length == 1) {
      return selectedZones[0];
    }

    return `${selectedZones.length} Zones`;
  }, [selectedZones]);

  // ui

  useEffect(() => {
    setCurrentZones(selectedZones);
    // only refresh when state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZones]);

  const trigger = (
    <Button
      size="sm"
      variant={selectedZones?.length ? "select" : "default"}
      className="flex items-center gap-2 capitalize"
    >
      <FaLocationDot
        className={`${selectedZones?.length ? "text-selected-foreground" : "text-secondary-foreground"}`}
      />
      <div
        className={`${selectedZones?.length ? "text-selected-foreground" : "text-primary"}`}
      >
        {buttonText}
      </div>
    </Button>
  );
  const content = (
    <ZoneFilterContent
      allZones={allZones}
      selectedZones={selectedZones}
      currentZones={currentZones}
      setCurrentZones={setCurrentZones}
      updateZoneFilter={updateZoneFilter}
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
          setCurrentZones(selectedZones);
        }

        setOpen(open);
      }}
    />
  );
}

type ZoneFilterContentProps = {
  allZones?: string[];
  selectedZones?: string[];
  currentZones?: string[];
  updateZoneFilter?: (zones: string[] | undefined) => void;
  setCurrentZones?: (zones: string[] | undefined) => void;
  onClose: () => void;
};
export function ZoneFilterContent({
  allZones,
  selectedZones,
  currentZones,
  updateZoneFilter,
  setCurrentZones,
  onClose,
}: ZoneFilterContentProps) {
  return (
    <>
      <div className="scrollbar-container h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden">
        {allZones && setCurrentZones && (
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
      {isDesktop && <DropdownMenuSeparator />}
      <div className="flex items-center justify-evenly p-2">
        <Button
          variant="select"
          onClick={() => {
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
            setCurrentZones?.(undefined);
            updateZoneFilter?.(undefined);
          }}
        >
          Reset
        </Button>
      </div>
    </>
  );
}

type SubFilterButtonProps = {
  allSubLabels: string[];
  selectedSubLabels: string[] | undefined;
  updateSubLabelFilter: (labels: string[] | undefined) => void;
};
function SubFilterButton({
  allSubLabels,
  selectedSubLabels,
  updateSubLabelFilter,
}: SubFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const [currentSubLabels, setCurrentSubLabels] = useState<
    string[] | undefined
  >(selectedSubLabels);

  const buttonText = useMemo(() => {
    if (isMobile) {
      return "Sub Labels";
    }

    if (!selectedSubLabels || selectedSubLabels.length == 0) {
      return "All Sub Labels";
    }

    if (selectedSubLabels.length == 1) {
      return selectedSubLabels[0];
    }

    return `${selectedSubLabels.length} Sub Labels`;
  }, [selectedSubLabels]);

  const trigger = (
    <Button
      size="sm"
      variant={selectedSubLabels?.length ? "select" : "default"}
      className="flex items-center gap-2 capitalize"
    >
      <SubFilterIcon
        className={`${selectedSubLabels?.length || selectedSubLabels?.length ? "text-selected-foreground" : "text-secondary-foreground"}`}
      />
      <div
        className={`${selectedSubLabels?.length ? "text-selected-foreground" : "text-primary"}`}
      >
        {buttonText}
      </div>
    </Button>
  );
  const content = (
    <SubFilterContent
      allSubLabels={allSubLabels}
      selectedSubLabels={selectedSubLabels}
      currentSubLabels={currentSubLabels}
      setCurrentSubLabels={setCurrentSubLabels}
      updateSubLabelFilter={updateSubLabelFilter}
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
          setCurrentSubLabels(selectedSubLabels);
        }

        setOpen(open);
      }}
    />
  );
}

type SubFilterContentProps = {
  allSubLabels: string[];
  selectedSubLabels: string[] | undefined;
  currentSubLabels: string[] | undefined;
  updateSubLabelFilter: (labels: string[] | undefined) => void;
  setCurrentSubLabels: (labels: string[] | undefined) => void;
  onClose: () => void;
};
export function SubFilterContent({
  allSubLabels,
  selectedSubLabels,
  currentSubLabels,
  updateSubLabelFilter,
  setCurrentSubLabels,
  onClose,
}: SubFilterContentProps) {
  return (
    <>
      <div className="scrollbar-container h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden">
        <div className="mb-5 mt-2.5 flex items-center justify-between">
          <Label
            className="mx-2 cursor-pointer text-primary"
            htmlFor="allLabels"
          >
            All Sub Labels
          </Label>
          <Switch
            className="ml-1"
            id="allLabels"
            checked={currentSubLabels == undefined}
            onCheckedChange={(isChecked) => {
              if (isChecked) {
                setCurrentSubLabels(undefined);
              }
            }}
          />
        </div>
        <div className="my-2.5 flex flex-col gap-2.5">
          {allSubLabels.map((item) => (
            <FilterSwitch
              key={item}
              label={item.replaceAll("_", " ")}
              isChecked={currentSubLabels?.includes(item) ?? false}
              onCheckedChange={(isChecked) => {
                if (isChecked) {
                  const updatedLabels = currentSubLabels
                    ? [...currentSubLabels]
                    : [];

                  updatedLabels.push(item);
                  setCurrentSubLabels(updatedLabels);
                } else {
                  const updatedLabels = currentSubLabels
                    ? [...currentSubLabels]
                    : [];

                  // can not deselect the last item
                  if (updatedLabels.length > 1) {
                    updatedLabels.splice(updatedLabels.indexOf(item), 1);
                    setCurrentSubLabels(updatedLabels);
                  }
                }
              }}
            />
          ))}
        </div>
      </div>
      {isDesktop && <DropdownMenuSeparator />}
      <div className="flex items-center justify-evenly p-2">
        <Button
          variant="select"
          onClick={() => {
            if (selectedSubLabels != currentSubLabels) {
              updateSubLabelFilter(currentSubLabels);
            }

            onClose();
          }}
        >
          Apply
        </Button>
        <Button
          onClick={() => {
            updateSubLabelFilter(undefined);
          }}
        >
          Reset
        </Button>
      </div>
    </>
  );
}

type SearchTypeButtonProps = {
  selectedSearchSources: SearchSource[] | undefined;
  updateSearchSourceFilter: (sources: SearchSource[] | undefined) => void;
};
function SearchTypeButton({
  selectedSearchSources,
  updateSearchSourceFilter,
}: SearchTypeButtonProps) {
  const [open, setOpen] = useState(false);

  const buttonText = useMemo(() => {
    if (isMobile) {
      return "Sources";
    }

    if (
      !selectedSearchSources ||
      selectedSearchSources.length == 0 ||
      selectedSearchSources.length == 2
    ) {
      return "All Search Sources";
    }

    if (selectedSearchSources.length == 1) {
      return selectedSearchSources[0];
    }

    return `${selectedSearchSources.length} Search Sources`;
  }, [selectedSearchSources]);

  const trigger = (
    <Button
      size="sm"
      variant={selectedSearchSources?.length != 2 ? "select" : "default"}
      className="flex items-center gap-2 capitalize"
    >
      <SearchSourceIcon
        className={`${selectedSearchSources?.length != 2 ? "text-selected-foreground" : "text-secondary-foreground"}`}
      />
      <div
        className={`${selectedSearchSources?.length != 2 ? "text-selected-foreground" : "text-primary"}`}
      >
        {buttonText}
      </div>
    </Button>
  );
  const content = (
    <SearchTypeContent
      selectedSearchSources={selectedSearchSources}
      updateSearchSourceFilter={updateSearchSourceFilter}
      onClose={() => setOpen(false)}
    />
  );

  return (
    <PlatformAwareDialog
      trigger={trigger}
      content={content}
      open={open}
      onOpenChange={setOpen}
    />
  );
}

type SearchTypeContentProps = {
  selectedSearchSources: SearchSource[] | undefined;
  updateSearchSourceFilter: (sources: SearchSource[] | undefined) => void;
  onClose: () => void;
};
export function SearchTypeContent({
  selectedSearchSources,
  updateSearchSourceFilter,
  onClose,
}: SearchTypeContentProps) {
  const [currentSearchSources, setCurrentSearchSources] = useState<
    SearchSource[] | undefined
  >(selectedSearchSources);

  return (
    <>
      <div className="scrollbar-container h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden">
        <div className="my-2.5 flex flex-col gap-2.5">
          <FilterSwitch
            label="Thumbnail Image"
            isChecked={currentSearchSources?.includes("thumbnail") ?? false}
            onCheckedChange={(isChecked) => {
              const updatedSources = currentSearchSources
                ? [...currentSearchSources]
                : [];

              if (isChecked) {
                updatedSources.push("thumbnail");
                setCurrentSearchSources(updatedSources);
              } else {
                if (updatedSources.length > 1) {
                  const index = updatedSources.indexOf("thumbnail");
                  if (index !== -1) updatedSources.splice(index, 1);
                  setCurrentSearchSources(updatedSources);
                }
              }
            }}
          />
          <FilterSwitch
            label="Description"
            isChecked={currentSearchSources?.includes("description") ?? false}
            onCheckedChange={(isChecked) => {
              const updatedSources = currentSearchSources
                ? [...currentSearchSources]
                : [];

              if (isChecked) {
                updatedSources.push("description");
                setCurrentSearchSources(updatedSources);
              } else {
                if (updatedSources.length > 1) {
                  const index = updatedSources.indexOf("description");
                  if (index !== -1) updatedSources.splice(index, 1);
                  setCurrentSearchSources(updatedSources);
                }
              }
            }}
          />
        </div>
        {isDesktop && <DropdownMenuSeparator />}
        <div className="flex items-center justify-evenly p-2">
          <Button
            variant="select"
            onClick={() => {
              if (selectedSearchSources != currentSearchSources) {
                updateSearchSourceFilter(currentSearchSources);
              }

              onClose();
            }}
          >
            Apply
          </Button>
          <Button
            onClick={() => {
              updateSearchSourceFilter(undefined);
              setCurrentSearchSources(["thumbnail", "description"]);
            }}
          >
            Reset
          </Button>
        </div>
      </div>
    </>
  );
}
