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
    selectedCameras === undefined ? [...allCameras] : selectedCameras,
  );
  const [allCamerasSelected, setAllCamerasSelected] = useState(
    selectedCameras === undefined,
  );

  const buttonText = useMemo(() => {
    if (isMobile) {
      return "Cameras";
    }

    if (allCamerasSelected) {
      return "All Cameras";
    }

    if (!currentCameras || currentCameras.length === 0) {
      return "No cameras";
    }

    return `${currentCameras.includes("birdseye") ? currentCameras.length - 1 : currentCameras.length} Camera${
      currentCameras.length !== 1 ? "s" : ""
    }`;
  }, [allCamerasSelected, currentCameras]);

  // ui

  useEffect(() => {
    setCurrentCameras(
      selectedCameras === undefined ? [...allCameras] : selectedCameras,
    );
    setAllCamerasSelected(selectedCameras === undefined);
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
          isChecked={allCamerasSelected}
          label="All Cameras"
          onCheckedChange={(isChecked) => {
            setAllCamerasSelected(isChecked);

            if (isChecked) {
              setCurrentCameras([...allCameras]);
            } else {
              setCurrentCameras([]);
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
                  onClick={() => setCurrentCameras([...conf.cameras])}
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

                  // Check if all cameras are now selected
                  setAllCamerasSelected(
                    updatedCameras.length === allCameras.length,
                  );
                } else {
                  const updatedCameras = currentCameras
                    ? [...currentCameras]
                    : [];
                  const index = updatedCameras.indexOf(item);

                  if (index > -1) {
                    updatedCameras.splice(index, 1);
                    setCurrentCameras(updatedCameras);
                  }

                  // Deselecting one camera should disable the "All Cameras" switch
                  setAllCamerasSelected(false);
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
            updateCameraFilter(allCamerasSelected ? undefined : currentCameras);
            setOpen(false);
          }}
        >
          Apply
        </Button>
        <Button
          onClick={() => {
            setCurrentCameras([...allCameras]);
            setAllCamerasSelected(true);
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
            setCurrentCameras(selectedCameras ?? allCameras);
            setAllCamerasSelected(selectedCameras === undefined);
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
          setCurrentCameras(selectedCameras ?? allCameras);
          setAllCamerasSelected(selectedCameras === undefined);
        }
        setOpen(open);
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent>{content}</DropdownMenuContent>
    </DropdownMenu>
  );
}
