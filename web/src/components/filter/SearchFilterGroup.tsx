import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useMemo, useState } from "react";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";
import { getEndOfDayTimestamp } from "@/utils/dateUtil";
import { FaFilter } from "react-icons/fa";
import { isDesktop, isMobile } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import MobileReviewSettingsDrawer, {
  DrawerFeatures,
} from "../overlay/MobileReviewSettingsDrawer";
import FilterSwitch from "./FilterSwitch";
import { FilterList } from "@/types/filter";
import { CalendarRangeFilterButton } from "./CalendarFilterButton";
import { CamerasFilterButton } from "./CamerasFilterButton";
import { SearchFilter, SearchSource } from "@/types/search";
import { DateRange } from "react-day-picker";

const SEARCH_FILTERS = ["cameras", "date", "general"] as const;
type SearchFilters = (typeof SEARCH_FILTERS)[number];
const DEFAULT_REVIEW_FILTERS: SearchFilters[] = ["cameras", "date", "general"];

type SearchFilterGroupProps = {
  filters?: SearchFilters[];
  filter?: SearchFilter;
  filterList?: FilterList;
  onUpdateFilter: (filter: SearchFilter) => void;
};

export default function SearchFilterGroup({
  filters = DEFAULT_REVIEW_FILTERS,
  filter,
  filterList,
  onUpdateFilter,
}: SearchFilterGroupProps) {
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
      {isDesktop && filters.includes("date") && (
        <CalendarRangeFilterButton
          range={
            filter?.after == undefined || filter?.before == undefined
              ? undefined
              : {
                  from: new Date(filter.after * 1000),
                  to: new Date(filter.before * 1000),
                }
          }
          defaultText="All Dates"
          updateSelectedRange={onUpdateSelectedRange}
        />
      )}
      {isDesktop && filters.includes("general") && (
        <GeneralFilterButton
          allLabels={filterValues.labels}
          selectedLabels={filter?.labels}
          allZones={filterValues.zones}
          selectedZones={filter?.zones}
          selectedSearchSources={
            filter?.search_type ?? ["thumbnail", "description"]
          }
          updateLabelFilter={(newLabels) => {
            onUpdateFilter({ ...filter, labels: newLabels });
          }}
          updateZoneFilter={(newZones) =>
            onUpdateFilter({ ...filter, zones: newZones })
          }
          updateSearchSourceFilter={(newSearchSource) =>
            onUpdateFilter({ ...filter, search_type: newSearchSource })
          }
        />
      )}
      {isMobile && mobileSettingsFeatures.length > 0 && (
        <MobileReviewSettingsDrawer
          features={mobileSettingsFeatures}
          filter={filter}
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
        />
      )}
    </div>
  );
}

type GeneralFilterButtonProps = {
  allLabels: string[];
  selectedLabels: string[] | undefined;
  allZones: string[];
  selectedZones?: string[];
  selectedSearchSources: SearchSource[];
  updateLabelFilter: (labels: string[] | undefined) => void;
  updateZoneFilter: (zones: string[] | undefined) => void;
  updateSearchSourceFilter: (sources: SearchSource[]) => void;
};
function GeneralFilterButton({
  allLabels,
  selectedLabels,
  allZones,
  selectedZones,
  selectedSearchSources,
  updateLabelFilter,
  updateZoneFilter,
  updateSearchSourceFilter,
}: GeneralFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    selectedLabels,
  );
  const [currentZones, setCurrentZones] = useState<string[] | undefined>(
    selectedZones,
  );
  const [currentSearchSources, setCurrentSearchSources] = useState<
    SearchSource[]
  >(selectedSearchSources);

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
      allZones={allZones}
      selectedZones={selectedZones}
      currentZones={currentZones}
      selectedSearchSources={selectedSearchSources}
      currentSearchSources={currentSearchSources}
      setCurrentZones={setCurrentZones}
      updateZoneFilter={updateZoneFilter}
      setCurrentLabels={setCurrentLabels}
      updateLabelFilter={updateLabelFilter}
      setCurrentSearchSources={setCurrentSearchSources}
      updateSearchSourceFilter={updateSearchSourceFilter}
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
  allZones?: string[];
  selectedZones?: string[];
  currentZones?: string[];
  selectedSearchSources: SearchSource[];
  currentSearchSources: SearchSource[];
  updateLabelFilter: (labels: string[] | undefined) => void;
  setCurrentLabels: (labels: string[] | undefined) => void;
  updateZoneFilter?: (zones: string[] | undefined) => void;
  setCurrentZones?: (zones: string[] | undefined) => void;
  setCurrentSearchSources: (sources: SearchSource[]) => void;
  updateSearchSourceFilter: (sources: SearchSource[]) => void;
  onClose: () => void;
};
export function GeneralFilterContent({
  allLabels,
  selectedLabels,
  currentLabels,
  allZones,
  selectedZones,
  currentZones,
  selectedSearchSources,
  currentSearchSources,
  updateLabelFilter,
  setCurrentLabels,
  updateZoneFilter,
  setCurrentZones,
  setCurrentSearchSources,
  updateSearchSourceFilter,
  onClose,
}: GeneralFilterContentProps) {
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
          <DropdownMenuSeparator />
        </div>
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
