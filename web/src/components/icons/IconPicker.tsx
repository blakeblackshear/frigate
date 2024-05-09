import React, { useCallback, useMemo, useRef, useState } from "react";
import { IconType } from "react-icons";
import * as LuIcons from "react-icons/lu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IoClose } from "react-icons/io5";
import Heading from "../ui/heading";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

export type IconName = keyof typeof LuIcons;

export type IconElement = {
  name?: string;
  Icon?: IconType;
};

type IconPickerProps = {
  selectedIcon?: IconElement;
  setSelectedIcon?: React.Dispatch<
    React.SetStateAction<IconElement | undefined>
  >;
};

export default function IconPicker({
  selectedIcon,
  setSelectedIcon,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const iconSets = useMemo(() => [...Object.entries(LuIcons)], []);

  const icons = useMemo(
    () =>
      iconSets.filter(
        ([name]) =>
          name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          searchTerm === "",
      ),
    [iconSets, searchTerm],
  );

  const handleIconSelect = useCallback(
    ({ name, Icon }: IconElement) => {
      if (setSelectedIcon) {
        setSelectedIcon({ name, Icon });
      }
      setSearchTerm("");
    },
    [setSelectedIcon],
  );

  return (
    <div ref={containerRef}>
      <Popover
        open={open}
        onOpenChange={(open) => {
          setOpen(open);
        }}
      >
        <PopoverTrigger asChild>
          {!selectedIcon?.name || !selectedIcon?.Icon ? (
            <Button className="text-muted-foreground w-full mt-2">
              Select an icon
            </Button>
          ) : (
            <div className="hover:cursor-pointer">
              <div className="flex flex-row w-full justify-between items-center gap-2 my-3">
                <div className="flex flex-row items-center gap-2">
                  <selectedIcon.Icon size={15} />
                  <div className="text-sm">
                    {selectedIcon.name
                      .replace(/^Lu/, "")
                      .replace(/([A-Z])/g, " $1")}
                  </div>
                </div>

                <IoClose
                  className="mx-2 hover:cursor-pointer"
                  onClick={() => {
                    handleIconSelect({ name: undefined, Icon: undefined });
                  }}
                />
              </div>
            </div>
          )}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          container={containerRef.current}
          className="max-h-[50dvh]"
        >
          <div className="flex flex-row justify-between items-center mb-3">
            <Heading as="h4">Select an icon</Heading>
            <IoClose
              size={15}
              className="hover:cursor-pointer"
              onClick={() => {
                setOpen(false);
              }}
            />
          </div>
          <Input
            type="text"
            placeholder="Search for an icon..."
            className="mb-3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex flex-col flex-1 h-[20dvh]">
            <div className="grid grid-cols-6 my-2 gap-2 max-h-[20dvh] overflow-y-auto pr-1">
              {icons.map(([name, Icon]) => (
                <div
                  key={name}
                  className={cn(
                    "flex flex-row justify-center items-start hover:cursor-pointer p-1 rounded-lg",
                    selectedIcon?.name === name
                      ? "bg-selected text-white"
                      : "hover:bg-secondary-foreground",
                  )}
                >
                  <Icon
                    size={20}
                    onClick={() => {
                      handleIconSelect({ name, Icon });
                      setOpen(false);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type IconRendererProps = {
  icon: IconType;
  size?: number;
  className?: string;
};

export function IconRenderer({ icon, size, className }: IconRendererProps) {
  return <>{React.createElement(icon, { size, className })}</>;
}
