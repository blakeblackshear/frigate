import { Button } from "../ui/button";
import { FaFilter } from "react-icons/fa";
import { isMobile } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { PolygonType } from "@/types/canvas";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";

type ZoneMaskFilterButtonProps = {
  selectedZoneMask?: PolygonType[];
  updateZoneMaskFilter: (labels: PolygonType[] | undefined) => void;
};
export function ZoneMaskFilterButton({
  selectedZoneMask,
  updateZoneMaskFilter,
}: ZoneMaskFilterButtonProps) {
  const trigger = (
    <Button
      size="sm"
      variant={selectedZoneMask?.length ? "select" : "default"}
      className="flex items-center gap-2 capitalize"
      aria-label="Filter by zone mask"
    >
      <FaFilter
        className={`${selectedZoneMask?.length ? "text-selected-foreground" : "text-secondary-foreground"}`}
      />
      <div
        className={`hidden md:block ${selectedZoneMask?.length ? "text-selected-foreground" : "text-primary"}`}
      >
        Filter
      </div>
    </Button>
  );
  const content = (
    <GeneralFilterContent
      selectedZoneMask={selectedZoneMask}
      updateZoneMaskFilter={updateZoneMaskFilter}
    />
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="mx-1 max-h-[75dvh] overflow-hidden p-3">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent>{content}</PopoverContent>
    </Popover>
  );
}

type GeneralFilterContentProps = {
  selectedZoneMask: PolygonType[] | undefined;
  updateZoneMaskFilter: (labels: PolygonType[] | undefined) => void;
};
export function GeneralFilterContent({
  selectedZoneMask,
  updateZoneMaskFilter,
}: GeneralFilterContentProps) {
  return (
    <>
      <div className="h-auto overflow-y-auto overflow-x-hidden">
        <div className="my-2.5 flex items-center justify-between">
          <Label
            className="mx-2 cursor-pointer text-primary"
            htmlFor="allLabels"
          >
            All Masks and Zones
          </Label>
          <Switch
            className="ml-1"
            id="allLabels"
            checked={selectedZoneMask == undefined}
            onCheckedChange={(isChecked) => {
              if (isChecked) {
                updateZoneMaskFilter(undefined);
              }
            }}
          />
        </div>
        <DropdownMenuSeparator />
        <div className="my-2.5 flex flex-col gap-2.5">
          {["zone", "motion_mask", "object_mask"].map((item) => (
            <div key={item} className="flex items-center justify-between">
              <Label
                className="mx-2 w-full cursor-pointer capitalize text-primary"
                htmlFor={item}
              >
                {item
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (char) => char.toUpperCase()) + "s"}
              </Label>
              <Switch
                key={item}
                className="ml-1"
                id={item}
                checked={
                  selectedZoneMask?.includes(item as PolygonType) ?? false
                }
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    const updatedLabels = selectedZoneMask
                      ? [...selectedZoneMask]
                      : [];

                    updatedLabels.push(item as PolygonType);
                    updateZoneMaskFilter(updatedLabels);
                  } else {
                    const updatedLabels = selectedZoneMask
                      ? [...selectedZoneMask]
                      : [];

                    // can not deselect the last item
                    if (updatedLabels.length > 1) {
                      updatedLabels.splice(
                        updatedLabels.indexOf(item as PolygonType),
                        1,
                      );
                      updateZoneMaskFilter(updatedLabels);
                    }
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
