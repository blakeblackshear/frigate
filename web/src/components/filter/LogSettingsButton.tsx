import { Button } from "../ui/button";
import { FaCog } from "react-icons/fa";
import { isMobile } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { LogSettingsType, LogSeverity } from "@/types/log";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";
import { cn } from "@/lib/utils";
import FilterSwitch from "./FilterSwitch";

type LogSettingsButtonProps = {
  selectedLabels?: LogSeverity[];
  updateLabelFilter: (labels: LogSeverity[] | undefined) => void;
  logSettings?: LogSettingsType;
  setLogSettings: (logSettings: LogSettingsType) => void;
};
export function LogSettingsButton({
  selectedLabels,
  updateLabelFilter,
  logSettings,
  setLogSettings,
}: LogSettingsButtonProps) {
  const trigger = (
    <Button
      size="sm"
      className="flex items-center gap-2"
      aria-label="Filter log level"
    >
      <FaCog className="text-secondary-foreground" />
      <div className="hidden text-primary md:block">Settings</div>
    </Button>
  );
  const content = (
    <div className={cn("my-3 space-y-3 py-3 md:mt-0 md:py-0")}>
      <div className="space-y-4">
        <div className="space-y-0.5">
          <div className="text-md">Filter</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            Filter logs by severity.
          </div>
        </div>
        <GeneralFilterContent
          selectedLabels={selectedLabels}
          updateLabelFilter={updateLabelFilter}
        />
      </div>
      <DropdownMenuSeparator />
      <div className="space-y-4">
        <div className="space-y-0.5">
          <div className="text-md">Loading</div>
          <div className="mt-2.5 flex flex-col gap-2.5">
            <div className="space-y-1 text-xs text-muted-foreground">
              When the log pane is scrolled to the bottom, new logs
              automatically stream as they are added.
            </div>
            <FilterSwitch
              label="Disable log streaming"
              isChecked={logSettings?.disableStreaming ?? false}
              onCheckedChange={(isChecked) => {
                setLogSettings({
                  disableStreaming: isChecked,
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
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
      <div className="scrollbar-container h-auto overflow-y-auto overflow-x-hidden">
        <div className="mb-5 flex items-center justify-between">
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
        <div className="my-2.5 flex flex-col gap-2.5">
          {["debug", "info", "warning", "error"].map((item) => (
            <div className="flex items-center justify-between" key={item}>
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
