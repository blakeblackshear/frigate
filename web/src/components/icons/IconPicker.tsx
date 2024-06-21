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
            <Button className="mt-2 w-full text-muted-foreground">
              Select an icon
            </Button>
          ) : (
            <div className="hover:cursor-pointer">
              <div className="my-3 flex w-full flex-row items-center justify-between gap-2">
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
          className="flex max-h-[50dvh] flex-col overflow-y-hidden md:max-h-[30dvh]"
        >
          <div className="mb-3 flex flex-row items-center justify-between">
            <Heading as="h4">Select an icon</Heading>
            <span tabIndex={0} className="sr-only" />
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
            className="text-md mb-3 md:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="scrollbar-container flex h-full flex-col overflow-y-auto">
            <div className="grid grid-cols-6 gap-2 pr-1">
              {icons.map(([name, Icon]) => (
                <div
                  key={name}
                  className={cn(
                    "flex flex-row items-center justify-center rounded-lg p-1 hover:cursor-pointer",
                    selectedIcon?.name === name
                      ? "bg-selected text-white"
                      : "hover:bg-secondary-foreground",
                  )}
                >
                  <Icon
                    className="size-6"
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
