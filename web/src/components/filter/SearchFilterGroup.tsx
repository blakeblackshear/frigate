import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";
import { getEndOfDayTimestamp } from "@/utils/dateUtil";
import { isDesktop, isMobile } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import FilterSwitch from "./FilterSwitch";
import { FilterList } from "@/types/filter";
import { CalendarRangeFilterButton } from "./CalendarFilterButton";
import { CamerasFilterButton } from "./CamerasFilterButton";
import { SearchFilter, SearchSource } from "@/types/search";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import SubFilterIcon from "../icons/SubFilterIcon";
import { FaLocationDot } from "react-icons/fa6";
import { MdLabel } from "react-icons/md";
import SearchSourceIcon from "../icons/SearchSourceIcon";

const SEARCH_FILTERS = [
  "cameras",
  "date",
  "general",
  "zone",
  "sub",
  "source",
] as const;
type SearchFilters = (typeof SEARCH_FILTERS)[number];
const DEFAULT_REVIEW_FILTERS: SearchFilters[] = [
  "cameras",
  "date",
  "general",
  "zone",
  "sub",
  "source",
];

type SearchFilterGroupProps = {
  className: string;
  filters?: SearchFilters[];
  filter?: SearchFilter;
  filterList?: FilterList;
  onUpdateFilter: (filter: SearchFilter) => void;
};
export default function SearchFilterGroup({
  className,
  filters = DEFAULT_REVIEW_FILTERS,
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

  const { data: allSubLabels } = useSWR("sub_labels");

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
          selectedSubLabels={filter?.subLabels}
          updateSubLabelFilter={(newSubLabels) =>
            onUpdateFilter({ ...filter, subLabels: newSubLabels })
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
        <DrawerContent className="max-h-[75dvh] overflow-hidden p-4">
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

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(open) => {
          if (!open) {
            setCurrentZones(selectedZones);
          }

          setOpen(open);
        }}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[75dvh] overflow-hidden p-4">
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
          setCurrentZones(selectedZones);
        }

        setOpen(open);
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent>{content}</PopoverContent>
    </Popover>
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

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(open) => {
          if (!open) {
            setCurrentSubLabels(selectedSubLabels);
          }

          setOpen(open);
        }}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[75dvh] overflow-hidden p-4">
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
          setCurrentSubLabels(selectedSubLabels);
        }

        setOpen(open);
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent>{content}</PopoverContent>
    </Popover>
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

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(open) => {
          setOpen(open);
        }}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[75dvh] overflow-hidden p-4">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent>{content}</PopoverContent>
    </Popover>
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
