import { LuCheck, LuFilter } from "react-icons/lu";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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

  const [open, setOpen] = useState(false);
  const disabledDates = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24, -1, 0, 0);
    const future = new Date();
    future.setFullYear(2032);
    return { from: tomorrow, to: future };
  }, []);

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
    cameras: filter == undefined ? ["all"] : filter.cameras,
    labels: filter == undefined ? ["all"] : filter.labels,
    before: filter?.before,
    after: filter?.after,
    detailLevel: filter?.detailLevel ?? "normal",
  });
  const dateRange = useMemo(() => {
    return selectedFilters?.before == undefined ||
      selectedFilters?.after == undefined
      ? undefined
      : {
          from: new Date(selectedFilters.after * 1000),
          to: new Date(selectedFilters.before * 1000),
        };
  }, [selectedFilters]);

  const allItems = useMemo(() => {
    return {
      cameras:
        JSON.stringify(selectedFilters.cameras) == JSON.stringify(["all"]),
      labels: JSON.stringify(selectedFilters.labels) == JSON.stringify(["all"]),
    };
  }, [selectedFilters]);

  return (
    <Popover open={open} onOpenChange={(open) => setOpen(open)}>
      <PopoverTrigger asChild>
        <Button>
          <LuFilter className="mx-1" />
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-screen sm:w-[340px]">
        <div className="flex justify-around">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="capitalize" variant="outline">
                {allItems.cameras
                  ? "All Cameras"
                  : `${selectedFilters.cameras.length} Cameras`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter Cameras</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <FilterCheckBox
                isChecked={allItems.cameras}
                label="All Cameras"
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    setSelectedFilters({
                      ...selectedFilters,
                      cameras: ["all"],
                    });
                  }
                }}
              />
              <DropdownMenuSeparator />
              {filterValues.cameras.map((item) => (
                <FilterCheckBox
                  key={item}
                  isChecked={selectedFilters.cameras.includes(item)}
                  label={item.replaceAll("_", " ")}
                  onCheckedChange={(isChecked) => {
                    if (isChecked) {
                      const selectedCameras = allItems.cameras
                        ? []
                        : [...selectedFilters.cameras];
                      selectedCameras.push(item);
                      setSelectedFilters({
                        ...selectedFilters,
                        cameras: selectedCameras,
                      });
                    } else {
                      const selectedCameraList = [...selectedFilters.cameras];

                      // can not deselect the last item
                      if (selectedCameraList.length > 1) {
                        selectedCameraList.splice(
                          selectedCameraList.indexOf(item),
                          1
                        );
                        setSelectedFilters({
                          ...selectedFilters,
                          cameras: selectedCameraList,
                        });
                      }
                    }
                  }}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="capitalize" variant="outline">
                {allItems.labels
                  ? "All Labels"
                  : `${selectedFilters.labels.length} Labels`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter Labels</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <FilterCheckBox
                isChecked={allItems.labels}
                label="All Labels"
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    setSelectedFilters({
                      ...selectedFilters,
                      labels: ["all"],
                    });
                  }
                }}
              />
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
                      const selectedLabels = allItems.labels
                        ? []
                        : [...selectedFilters.labels];
                      selectedLabels.push(item);
                      setSelectedFilters({
                        ...selectedFilters,
                        labels: selectedLabels,
                      });
                    } else {
                      const selectedLabelList = [...selectedFilters.labels];

                      // can not deselect the last item
                      if (selectedLabelList.length > 1) {
                        selectedLabelList.splice(
                          selectedLabelList.indexOf(item),
                          1
                        );
                        setSelectedFilters({
                          ...selectedFilters,
                          labels: selectedLabelList,
                        });
                      }
                    }
                  }}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="capitalize" variant="outline">
                {selectedFilters.detailLevel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>
                Detail Level
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={selectedFilters.detailLevel}
                onValueChange={(value) => {
                  setSelectedFilters({
                    ...selectedFilters,
                    // @ts-ignore we know that value is one of the detailLevel
                    detailLevel: value,
                  });
                }}
              >
                <DropdownMenuRadioItem value="normal">
                  Normal
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="extra">
                  Extra
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="full">Full</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Calendar
          mode="range"
          disabled={disabledDates}
          selected={dateRange}
          onSelect={(range) => {
            let afterTime = undefined;
            if (range?.from != undefined) {
              afterTime = range.from.getTime() / 1000;
            }

            // need to make sure the day selected for before covers the entire day
            let beforeTime = undefined;
            if (range?.from != undefined) {
              const beforeDate = range.to ?? range.from;
              beforeDate.setHours(beforeDate.getHours() + 24, -1, 0, 0);
              beforeTime = beforeDate.getTime() / 1000;
            }

            setSelectedFilters({
              ...selectedFilters,
              after: afterTime,
              before: beforeTime,
            });
          }}
        />
        <Button
          onClick={() => {
            onUpdateFilter(selectedFilters);
            setOpen(false);
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
