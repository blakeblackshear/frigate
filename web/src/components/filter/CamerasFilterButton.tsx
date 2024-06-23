import { Button } from "../ui/button";
import { CameraGroupConfig } from "@/types/frigateConfig";
import { useState } from "react";
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
  updateCameraFilter: (cameras: string[] | undefined) => void;
};
export function CamerasFilterButton({
  allCameras,
  groups,
  selectedCameras,
  updateCameraFilter,
}: CameraFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const [currentCameras, setCurrentCameras] = useState<string[] | undefined>(
    selectedCameras,
  );

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
        className={`hidden md:block ${selectedCameras?.length ? "text-selected-foreground" : "text-primary"}`}
      >
        {selectedCameras == undefined
          ? "All Cameras"
          : `${selectedCameras.includes("birdseye") ? selectedCameras.length - 1 : selectedCameras.length} Camera${selectedCameras.length !== 1 ? "s" : ""}`}
      </div>
    </Button>
  );
  const content = (
    <>
      {isMobile && (
        <>
          <DropdownMenuLabel className="flex justify-center">
            Cameras
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
        </>
      )}
      <div className="scrollbar-container h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden p-4">
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
            <DropdownMenuSeparator className="mt-2" />
            {groups.map(([name, conf]) => {
              return (
                <div
                  key={name}
                  className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-sm capitalize text-primary hover:bg-muted"
                  onClick={() => setCurrentCameras([...conf.cameras])}
                >
                  {name}
                </div>
              );
            })}
          </>
        )}
        <DropdownMenuSeparator className="my-2" />
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
      <DropdownMenuSeparator className="my-2" />
      <div className="flex items-center justify-evenly p-2">
        <Button
          variant="select"
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
