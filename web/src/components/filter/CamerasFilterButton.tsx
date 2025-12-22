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
import { useTranslation } from "react-i18next";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";

type CameraFilterButtonProps = {
  allCameras: string[];
  groups: [string, CameraGroupConfig][];
  selectedCameras: string[] | undefined;
  hideText?: boolean;
  mainCamera?: string;
  updateCameraFilter: (cameras: string[] | undefined) => void;
};
export function CamerasFilterButton({
  allCameras,
  groups,
  selectedCameras,
  hideText = isMobile,
  mainCamera,
  updateCameraFilter,
}: CameraFilterButtonProps) {
  const { t } = useTranslation(["components/filter"]);
  const [open, setOpen] = useState(false);
  const [currentCameras, setCurrentCameras] = useState<string[] | undefined>(
    selectedCameras,
  );
  const allowedCameras = useAllowedCameras();

  // Filter cameras to only include those the user has access to
  const filteredCameras = useMemo(
    () => allCameras.filter((camera) => allowedCameras.includes(camera)),
    [allCameras, allowedCameras],
  );

  // Filter groups to only include those with at least one allowed camera
  const filteredGroups = useMemo(
    () =>
      groups
        .map(([name, config]) => {
          const allowedGroupCameras = config.cameras.filter((camera) =>
            allowedCameras.includes(camera),
          );
          return [name, { ...config, cameras: allowedGroupCameras }] as [
            string,
            CameraGroupConfig,
          ];
        })
        .filter(([, config]) => config.cameras.length > 0),
    [groups, allowedCameras],
  );

  const buttonText = useMemo(() => {
    if (isMobile) {
      return t("menu.live.cameras.title", { ns: "common" });
    }

    if (!selectedCameras || selectedCameras.length == 0) {
      return t("menu.live.allCameras", { ns: "common" });
    }
    return t("menu.live.cameras.count", {
      ns: "common",
      count: selectedCameras.includes("birdseye")
        ? selectedCameras.length - 1
        : selectedCameras.length,
    });
  }, [selectedCameras, t]);

  // ui

  useEffect(() => {
    setCurrentCameras(selectedCameras);
    // only refresh when state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCameras]);

  const trigger = (
    <Button
      className="flex items-center gap-2 smart-capitalize"
      aria-label={t("cameras.label")}
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
      allCameras={filteredCameras}
      groups={filteredGroups}
      currentCameras={currentCameras}
      mainCamera={mainCamera}
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
  mainCamera?: string;
  groups: [string, CameraGroupConfig][];
  setCurrentCameras: (cameras: string[] | undefined) => void;
  setOpen: (open: boolean) => void;
  updateCameraFilter: (cameras: string[] | undefined) => void;
};
export function CamerasFilterContent({
  allCameras,
  currentCameras,
  mainCamera,
  groups,
  setCurrentCameras,
  setOpen,
  updateCameraFilter,
}: CamerasFilterContentProps) {
  const { t } = useTranslation(["components/filter"]);
  return (
    <>
      {isMobile && (
        <>
          <DropdownMenuLabel className="flex justify-center">
            {t("cameras.all.short")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
        </>
      )}
      <div className="scrollbar-container flex h-auto max-h-[80dvh] flex-col gap-2 overflow-y-auto overflow-x-hidden p-4">
        <FilterSwitch
          isChecked={currentCameras == undefined}
          label={t("cameras.all.title")}
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
                  className="w-full cursor-pointer rounded-lg px-2 py-0.5 text-sm text-primary smart-capitalize hover:bg-muted"
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
              label={item}
              type={"camera"}
              disabled={
                mainCamera !== undefined &&
                currentCameras !== undefined &&
                item === mainCamera
              } // Disable only if mainCamera exists and cameras are filtered
              onCheckedChange={(isChecked) => {
                if (
                  mainCamera !== undefined && // Only enforce if mainCamera is defined
                  item === mainCamera &&
                  !isChecked &&
                  currentCameras !== undefined
                ) {
                  return; // Prevent deselecting mainCamera when filtered and mainCamera is defined
                }
                if (isChecked) {
                  const updatedCameras = currentCameras
                    ? [...currentCameras]
                    : mainCamera !== undefined && item !== mainCamera // If mainCamera exists and this isn’t it
                      ? [mainCamera] // Start with mainCamera when transitioning from undefined
                      : []; // Otherwise start empty
                  if (!updatedCameras.includes(item)) {
                    updatedCameras.push(item);
                  }
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
          aria-label={t("button.apply", { ns: "common" })}
          variant="select"
          disabled={currentCameras?.length === 0}
          onClick={() => {
            updateCameraFilter(currentCameras);
            setOpen(false);
          }}
        >
          {t("button.apply", { ns: "common" })}
        </Button>
        <Button
          aria-label={t("button.reset", { ns: "common" })}
          onClick={() => {
            setCurrentCameras(undefined);
            updateCameraFilter(undefined);
          }}
        >
          {t("button.reset", { ns: "common" })}
        </Button>
      </div>
    </>
  );
}
