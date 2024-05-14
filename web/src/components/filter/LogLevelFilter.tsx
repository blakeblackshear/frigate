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
    <Button size="sm" className="flex items-center gap-2">
      <FaFilter className="text-secondary-foreground" />
      <div className="hidden text-primary md:block">Filter</div>
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
        <div className="my-2.5 flex items-center justify-between">
          <Label
            className="mx-2 cursor-pointer text-primary"
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
            <div className="flex items-center justify-between">
              <Label
                className="mx-2 w-full cursor-pointer capitalize text-primary"
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
    </>
  );
}
