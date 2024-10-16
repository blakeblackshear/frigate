import { Button } from "../ui/button";
import { CameraGroupConfig } from "@/types/frigateConfig";
import { useEffect, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { isMobile } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import FilterSwitch from "./FilterSwitch";
import { FaVideo } from "react-icons/fa";

type CameraFilterButtonProps = {
  allCameras: string[];
  groups: [string, CameraGroupConfig][];
  selectedCameras: string[] | undefined;
  hideText?: boolean;
  updateCameraFilter: (cameras: string[] | undefined) => void;
};
export function CamerasFilterButton({
  allCameras,
  groups,
  selectedCameras,
  hideText = isMobile,
  updateCameraFilter,
}: CameraFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const [currentCameras, setCurrentCameras] = useState<string[] | undefined>(
    selectedCameras,
  );

  const buttonText = useMemo(() => {
    if (isMobile) {
      return "Cameras";
    }

    if (!selectedCameras || selectedCameras.length == 0) {
      return "All Cameras";
    }

    return `${selectedCameras.includes("birdseye") ? selectedCameras.length - 1 : selectedCameras.length} Camera${selectedCameras.length !== 1 ? "s" : ""}`;
  }, [selectedCameras]);

  // ui

  useEffect(() => {
    setCurrentCameras(selectedCameras);
    // only refresh when state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCameras]);

  const trigger = (
    <Button
      className="flex items-center gap-2 capitalize"
      variant={selectedCameras?.length == undefined ? "default" : "select"}
      size="sm"
    >
      <FaVideo
        className={`${(selectedCameras?.length ?? 0) >= 1 ? "text-selected-foreground" : "text-secondary-foreground"}`}
      />
      <div
        className={`${hideText ? "hidden" : ""} ${selectedCameras?.length ? "text-selected-foreground" : "text-primary"}`}
      >
        {buttonText}
      </div>
    </Button>
  );
  const content = (
    <CamerasFilterContent
      allCameras={allCameras}
      groups={groups}
      currentCameras={currentCameras}
      setCurrentCameras={setCurrentCameras}
      setOpen={setOpen}
      updateCameraFilter={updateCameraFilter}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(open) => {
          if (!open) {
            setCurrentCameras(selectedCameras);
          }

          setOpen(open);
        }}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[75dvh] overflow-hidden">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setCurrentCameras(selectedCameras);
        }
        setOpen(open);
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent>{content}</DropdownMenuContent>
    </DropdownMenu>
  );
}

type CamerasFilterContentProps = {
  allCameras: string[];
  currentCameras: string[] | undefined;
  groups: [string, CameraGroupConfig][];
  setCurrentCameras: (cameras: string[] | undefined) => void;
  setOpen: (open: boolean) => void;
  updateCameraFilter: (cameras: string[] | undefined) => void;
};
export function CamerasFilterContent({
  allCameras,
  currentCameras,
  groups,
  setCurrentCameras,
  setOpen,
  updateCameraFilter,
}: CamerasFilterContentProps) {
  return (
    <>
      {isMobile && (
        <>
          <DropdownMenuLabel className="flex justify-center">
            Cameras
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
        </>
      )}
      <div className="scrollbar-container flex h-auto max-h-[80dvh] flex-col gap-2 overflow-y-auto overflow-x-hidden p-4">
        <FilterSwitch
          isChecked={currentCameras == undefined}
          label="All Cameras"
          onCheckedChange={(isChecked) => {
            if (isChecked) {
              setCurrentCameras(undefined);
            }
          }}
        />
        {groups.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {groups.map(([name, conf]) => {
              return (
                <div
                  key={name}
                  className="w-full cursor-pointer rounded-lg px-2 py-0.5 text-sm capitalize text-primary hover:bg-muted"
                  onClick={() => {
                    setCurrentCameras([...conf.cameras]);
                  }}
                >
                  {name}
                </div>
              );
            })}
          </>
        )}
        <DropdownMenuSeparator />
        <div className="flex flex-col gap-2.5">
          {allCameras.map((item) => (
            <FilterSwitch
              key={item}
              isChecked={currentCameras?.includes(item) ?? false}
              label={item.replaceAll("_", " ")}
              onCheckedChange={(isChecked) => {
                if (isChecked) {
                  const updatedCameras = currentCameras
                    ? [...currentCameras]
                    : [];
                  updatedCameras.push(item);
                  setCurrentCameras(updatedCameras);
                } else {
                  const updatedCameras = currentCameras
                    ? [...currentCameras]
                    : [];
                  // can not deselect the last item
                  if (updatedCameras.length > 1) {
                    updatedCameras.splice(updatedCameras.indexOf(item), 1);
                    setCurrentCameras(updatedCameras);
                  }
                }
              }}
            />
          ))}
        </div>
      </div>
      <DropdownMenuSeparator />
      <div className="flex items-center justify-evenly p-2">
        <Button
          variant="select"
          disabled={currentCameras?.length === 0}
          onClick={() => {
            updateCameraFilter(currentCameras);
            setOpen(false);
          }}
        >
          Apply
        </Button>
        <Button
          onClick={() => {
            setCurrentCameras(undefined);
            updateCameraFilter(undefined);
          }}
        >
          Reset
        </Button>
      </div>
    </>
  );
}
