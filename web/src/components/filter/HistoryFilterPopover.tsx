import { LuFilter } from "react-icons/lu";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type HistoryFilterPopoverProps = {
    filter: HistoryFilter;
    onUpdateFilter: (filter: HistoryFilter) => void;
};

export default function HistoryFilterPopover({
    filter,
    onUpdateFilter
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button>
          <LuFilter className="mx-1" />
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
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
                <DropdownMenuCheckboxItem
                  className="capitalize"
                  key={item}
                  checked={
                    filter.cameras.length == 0 || filter.cameras.includes(item)
                  }
                >
                  {item.replaceAll("_", " ")}
                </DropdownMenuCheckboxItem>
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
                <DropdownMenuCheckboxItem
                  className="capitalize"
                  key={item}
                  checked={
                    filter.labels == undefined || filter.labels.includes(item)
                  }
                >
                  {item.replaceAll("_", " ")}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PopoverContent>
    </Popover>
  );
}
