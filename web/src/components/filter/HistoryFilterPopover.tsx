import { LuCheck, LuFilter, LuFocus } from "react-icons/lu";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Calendar } from "../ui/calendar";

type HistoryFilterPopoverProps = {
  filter: HistoryFilter | undefined;
  onUpdateFilter: (filter: HistoryFilter) => void;
};

export default function HistoryFilterPopover({
  filter,
  onUpdateFilter,
}: HistoryFilterPopoverProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { data: allLabels } = useSWR<string[]>(["labels"], {
    revalidateOnFocus: false,
  });
  const { data: allSubLabels } = useSWR<string[]>(
    ["sub_labels", { split_joined: 1 }],
    {
      revalidateOnFocus: false,
    }
  );
  const filterValues = useMemo(
    () => ({
      cameras: Object.keys(config?.cameras || {}),
      labels: Object.values(allLabels || {}),
    }),
    [config, allLabels, allSubLabels]
  );
  const [selectedFilters, setSelectedFilters] = useState({
    cameras: filter == undefined ? [] : filter.cameras,
    labels: filter == undefined ? [] : filter.labels,
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button>
          <LuFilter className="mx-1" />
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-screen md:w-[340px]">
        <div className="flex justify-around">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="capitalize" variant="outline">
                {""?.replaceAll("_", " ") || "All Cameras"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter Cameras</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filterValues.cameras.map((item) => (
                <FilterCheckBox
                  key={item}
                  isChecked={
                    selectedFilters.cameras.length == 0 ||
                    selectedFilters.cameras.includes(item)
                  }
                  label={item.replaceAll("_", " ")}
                  onCheckedChange={(isChecked) => {
                    if (isChecked) {
                      const selectedCameras = [...selectedFilters.cameras];
                      selectedCameras.push(item);
                      setSelectedFilters({
                        ...selectedFilters,
                        cameras: selectedCameras,
                      });
                    } else {
                      const selectedCameraList =
                        selectedFilters.cameras.length == 0
                          ? [...filterValues.cameras]
                          : [...selectedFilters.cameras];
                      selectedCameraList.splice(
                        selectedCameraList.indexOf(item),
                        1
                      );
                      setSelectedFilters({
                        ...selectedFilters,
                        cameras: selectedCameraList,
                      });
                    }
                  }}
                  onSingleSelect={() => {
                    setSelectedFilters({
                      ...selectedFilters,
                      cameras: [item],
                    });
                  }}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="capitalize" variant="outline">
                {""?.replaceAll("_", " ") || "All Labels"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter Labels</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filterValues.labels.map((item) => (
                <FilterCheckBox
                  key={item}
                  isChecked={
                    selectedFilters.labels.length == 0 ||
                    selectedFilters.labels.includes(item)
                  }
                  label={item.replaceAll("_", " ")}
                  onCheckedChange={(isChecked) => {
                    if (isChecked) {
                      const selectedLabels = [...selectedFilters.labels];
                      selectedLabels.push(item);
                      setSelectedFilters({
                        ...selectedFilters,
                        labels: selectedLabels,
                      });
                    } else {
                      const selectedLabelList =
                        selectedFilters.labels.length == 0
                          ? [...filterValues.labels]
                          : selectedFilters.labels;
                      selectedLabelList.splice(
                        selectedLabelList.indexOf(item),
                        1
                      );
                      setSelectedFilters({
                        ...selectedFilters,
                        labels: selectedLabelList,
                      });
                    }
                  }}
                  onSingleSelect={() => {
                    setSelectedFilters({
                      ...selectedFilters,
                      labels: [item],
                    });
                  }}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Calendar mode="range" />
        <Button
          onClick={() => {
            onUpdateFilter(selectedFilters);
          }}
        >
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}

type FilterCheckBoxProps = {
  label: string;
  isChecked: boolean;
  onCheckedChange: (isChecked: boolean) => void;
  onSingleSelect: () => void;
};

function FilterCheckBox({
  label,
  isChecked,
  onCheckedChange,
  onSingleSelect,
}: FilterCheckBoxProps) {
  return (
    <div
      className="capitalize flex justify-between items-center cursor-pointer"
      onClick={(_) => onCheckedChange(!isChecked)}
    >
      {isChecked ? (
        <LuCheck className="w-8 h-8" />
      ) : (
        <div className="w-8 h-8" />
      )}
      <div className="ml-1 w-full flex justify-start">{label}</div>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onSingleSelect();
        }}
      >
        <LuFocus className="text-primary w-6 h-6" />
      </Button>
    </div>
  );
}
