import { cn } from "@/lib/utils";
import {
  DEFAULT_EXPORT_FILTERS,
  ExportFilter,
  ExportFilters,
} from "@/types/export";
import { CamerasFilterButton } from "./CamerasFilterButton";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";
import { useMemo } from "react";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";

type ExportFilterGroupProps = {
  className: string;
  filters?: ExportFilters[];
  filter?: ExportFilter;
  onUpdateFilter: (filter: ExportFilter) => void;
};
export default function ExportFilterGroup({
  className,
  filter,
  filters = DEFAULT_EXPORT_FILTERS,
  onUpdateFilter,
}: ExportFilterGroupProps) {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const allowedCameras = useAllowedCameras();

  const filterValues = useMemo(
    () => ({
      cameras: allowedCameras,
    }),
    [allowedCameras],
  );

  const groups = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.entries(config.camera_groups).sort(
      (a, b) => a[1].order - b[1].order,
    );
  }, [config]);

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
    </div>
  );
}
