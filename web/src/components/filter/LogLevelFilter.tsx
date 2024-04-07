import { Button } from "../ui/button";
import { FaFilter } from "react-icons/fa";
import { isMobile } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { LogSeverity } from "@/types/log";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";

type LogLevelFilterButtonProps = {
  selectedLabels?: LogSeverity[];
  updateLabelFilter: (labels: LogSeverity[] | undefined) => void;
};
export function LogLevelFilterButton({
  selectedLabels,
  updateLabelFilter,
}: LogLevelFilterButtonProps) {
  const trigger = (
    <Button size="sm" className="flex items-center gap-2" variant="secondary">
      <FaFilter className="text-secondary-foreground" />
      <div className="hidden md:block text-primary-foreground">Filter</div>
    </Button>
  );
  const content = (
    <GeneralFilterContent
      selectedLabels={selectedLabels}
      updateLabelFilter={updateLabelFilter}
    />
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[75dvh] p-3 mx-1 overflow-hidden">
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
  selectedLabels: LogSeverity[] | undefined;
  updateLabelFilter: (labels: LogSeverity[] | undefined) => void;
};
export function GeneralFilterContent({
  selectedLabels,
  updateLabelFilter,
}: GeneralFilterContentProps) {
  return (
    <>
      <div className="h-auto overflow-y-auto overflow-x-hidden">
        <div className="flex justify-between items-center my-2.5">
          <Label
            className="mx-2 text-primary-foreground cursor-pointer"
            htmlFor="allLabels"
          >
            All Logs
          </Label>
          <Switch
            className="ml-1"
            id="allLabels"
            checked={selectedLabels == undefined}
            onCheckedChange={(isChecked) => {
              if (isChecked) {
                updateLabelFilter(undefined);
              }
            }}
          />
        </div>
        <DropdownMenuSeparator />
        <div className="my-2.5 flex flex-col gap-2.5">
          {["debug", "info", "warning", "error"].map((item) => (
            <div className="flex justify-between items-center">
              <Label
                className="w-full mx-2 text-primary-foreground capitalize cursor-pointer"
                htmlFor={item}
              >
                {item.replaceAll("_", " ")}
              </Label>
              <Switch
                key={item}
                className="ml-1"
                id={item}
                checked={selectedLabels?.includes(item as LogSeverity) ?? false}
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    const updatedLabels = selectedLabels
                      ? [...selectedLabels]
                      : [];

                    updatedLabels.push(item as LogSeverity);
                    updateLabelFilter(updatedLabels);
                  } else {
                    const updatedLabels = selectedLabels
                      ? [...selectedLabels]
                      : [];

                    // can not deselect the last item
                    if (updatedLabels.length > 1) {
                      updatedLabels.splice(
                        updatedLabels.indexOf(item as LogSeverity),
                        1,
                      );
                      updateLabelFilter(updatedLabels);
                    }
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <DropdownMenuSeparator />
    </>
  );
}
