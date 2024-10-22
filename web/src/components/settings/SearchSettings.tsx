import { Button } from "../ui/button";
import { useState } from "react";
import { isDesktop, isMobileOnly } from "react-device-detect";
import { cn } from "@/lib/utils";
import PlatformAwareDialog from "../overlay/dialog/PlatformAwareDialog";
import { FaCog } from "react-icons/fa";
import { Slider } from "../ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";
import FilterSwitch from "../filter/FilterSwitch";
import { SearchFilter, SearchSource } from "@/types/search";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";

type SearchSettingsProps = {
  className?: string;
  columns: number;
  defaultView: string;
  filter?: SearchFilter;
  setColumns: (columns: number) => void;
  setDefaultView: (view: string) => void;
  onUpdateFilter: (filter: SearchFilter) => void;
};
export default function SearchSettings({
  className,
  columns,
  setColumns,
  defaultView,
  filter,
  setDefaultView,
  onUpdateFilter,
}: SearchSettingsProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [open, setOpen] = useState(false);

  const [searchSources, setSearchSources] = useState<SearchSource[]>([
    "thumbnail",
  ]);

  const trigger = (
    <Button
      className="flex items-center gap-2"
      aria-label="Search Settings"
      size="sm"
    >
      <FaCog className="text-secondary-foreground" />
      Settings
    </Button>
  );
  const content = (
    <div className={cn(className, "my-3 space-y-5 py-3 md:mt-0 md:py-0")}>
      <div className="space-y-4">
        <div className="space-y-0.5">
          <div className="text-md">Default View</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            When no filters are selected, display a summary of the most recent
            tracked objects per label, or display an unfiltered grid.
          </div>
        </div>
        <Select
          value={defaultView}
          onValueChange={(value) => setDefaultView(value)}
        >
          <SelectTrigger className="w-full">
            {defaultView == "summary" ? "Summary" : "Unfiltered Grid"}
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {["summary", "grid"].map((value) => (
                <SelectItem
                  key={value}
                  className="cursor-pointer"
                  value={value}
                >
                  {value == "summary" ? "Summary" : "Unfiltered Grid"}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {!isMobileOnly && (
        <>
          <DropdownMenuSeparator />
          <div className="flex w-full flex-col space-y-4">
            <div className="space-y-0.5">
              <div className="text-md">Grid Columns</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                Select the number of columns in the grid view.
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Slider
                value={[columns]}
                onValueChange={([value]) => setColumns(value)}
                max={6}
                min={2}
                step={1}
                className="flex-grow"
              />
              <span className="w-9 text-center text-sm font-medium">
                {columns}
              </span>
            </div>
          </div>
        </>
      )}
      {config?.semantic_search?.enabled && (
        <SearchTypeContent
          searchSources={searchSources}
          setSearchSources={(sources) => {
            setSearchSources(sources as SearchSource[]);
            onUpdateFilter({ ...filter, search_type: sources });
          }}
        />
      )}
    </div>
  );

  return (
    <PlatformAwareDialog
      trigger={trigger}
      content={content}
      contentClassName={
        isDesktop
          ? "scrollbar-container h-auto max-h-[80dvh] overflow-y-auto"
          : "max-h-[75dvh] overflow-hidden p-4"
      }
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
      }}
    />
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
        <div className="space-y-0.5">
          <div className="text-md">Search Source</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            Choose whether to search the thumbnails or descriptions of your
            tracked objects.
          </div>
        </div>
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
