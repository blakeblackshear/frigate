import { Button } from "../ui/button";
import { useState } from "react";
import { isDesktop } from "react-device-detect";
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

type SearchSettingsProps = {
  className?: string;
  columns: number;
  defaultView: string;
  setColumns: (columns: number) => void;
  setDefaultView: (view: string) => void;
};
export default function SearchSettings({
  className,
  columns,
  setColumns,
  defaultView,
  setDefaultView,
}: SearchSettingsProps) {
  const [open, setOpen] = useState(false);

  const trigger = (
    <Button className="flex items-center gap-2" size="sm">
      <FaCog className="text-secondary-foreground" />
      Settings
    </Button>
  );
  const content = (
    <div className={cn(className, "space-y-3")}>
      <div className="flex w-full flex-col space-y-4">
        <div className="text-md leading-none">Grid Columns</div>
        <div className="flex items-center space-x-4">
          <Slider
            value={[columns]}
            onValueChange={([value]) => setColumns(value)}
            max={6}
            min={2}
            step={1}
            className="flex-grow"
          />
          <span className="w-9 text-center text-sm font-medium">{columns}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-md">Default View</div>
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
