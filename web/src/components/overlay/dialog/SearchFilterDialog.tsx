import { FaCog } from "react-icons/fa";

import { useState } from "react";
import { PlatformAwareSheet } from "./PlatformAwareDialog";
import { Button } from "@/components/ui/button";
import { CamerasFilterContent } from "@/components/filter/CamerasFilterButton";
import useSWR from "swr";
import { SearchFilter, SearchSource } from "@/types/search";
import { CameraGroupConfig } from "@/types/frigateConfig";

type SearchFilterDialogProps = {
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
  filter,
  filterValues,
  groups,
  onUpdateFilter,
}: SearchFilterDialogProps) {
  // data

  const { data: allSubLabels } = useSWR(["sub_labels", { split_joined: 1 }]);
  const [currentCameras, setCurrentCameras] = useState<string[] | undefined>(
    filter?.cameras,
  );

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
      <CamerasFilterContent
        allCameras={filterValues.cameras}
        currentCameras={currentCameras}
        groups={groups}
        setCurrentCameras={setCurrentCameras}
        setOpen={setOpen}
        updateCameraFilter={(newCameras) => {
          onUpdateFilter({ ...filter, cameras: newCameras });
        }}
      />
    </>
  );

  return (
    <PlatformAwareSheet
      trigger={trigger}
      content={content}
      contentClassName="w-auto"
      open={open}
      onOpenChange={setOpen}
    />
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
