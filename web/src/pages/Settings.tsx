import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import MotionTuner from "@/components/settings/MotionTuner";
import MasksAndZones from "@/components/settings/MasksAndZones";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useOptimisticState from "@/hooks/use-optimistic-state";
import { isMobile } from "react-device-detect";
import { FaVideo } from "react-icons/fa";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import General from "@/components/settings/General";
import FilterSwitch from "@/components/filter/FilterSwitch";
import { ZoneMaskFilterButton } from "@/components/filter/ZoneMaskFilter";
import { PolygonType } from "@/types/canvas";
import ObjectSettings from "@/components/settings/ObjectSettings";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import scrollIntoView from "scroll-into-view-if-needed";

export default function Settings() {
  const settingsViews = [
    "general",
    "objects",
    "masks / zones",
    "motion tuner",
  ] as const;

  type SettingsType = (typeof settingsViews)[number];
  const [page, setPage] = useState<SettingsType>("general");
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);
  const tabsRef = useRef<HTMLDivElement | null>(null);

  const { data: config } = useSWR<FrigateConfig>("config");

  // TODO: confirm leave page
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config]);

  const [selectedCamera, setSelectedCamera] = useState<string>("");

  const [filterZoneMask, setFilterZoneMask] = useState<PolygonType[]>();

  const handleDialog = useCallback(
    (save: boolean) => {
      if (unsavedChanges && save) {
        // TODO
      }
      setConfirmationDialogOpen(false);
      setUnsavedChanges(false);
    },
    [unsavedChanges],
  );

  useEffect(() => {
    if (cameras.length) {
      setSelectedCamera(cameras[0].name);
    }
    // only run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tabsRef.current) {
      const element = tabsRef.current.querySelector(
        `[data-nav-item="${pageToggle}"]`,
      );
      if (element instanceof HTMLElement) {
        scrollIntoView(element, {
          behavior: "smooth",
          inline: "start",
        });
      }
    }
  }, [tabsRef, pageToggle]);

  return (
    <div className="size-full p-2 flex flex-col">
      <div className="w-full h-11 relative flex justify-between items-center">
        <ScrollArea className="w-full whitespace-nowrap">
          <div ref={tabsRef} className="flex flex-row">
            <ToggleGroup
              className="*:px-3 *:py-4 *:rounded-md"
              type="single"
              size="sm"
              value={pageToggle}
              onValueChange={(value: SettingsType) => {
                if (value) {
                  setPageToggle(value);
                }
              }}
            >
              {Object.values(settingsViews).map((item) => (
                <ToggleGroupItem
                  key={item}
                  className={`flex items-center justify-between gap-2 scroll-mx-10 ${page == "general" ? "last:mr-20" : ""} ${pageToggle == item ? "" : "*:text-muted-foreground"}`}
                  value={item}
                  data-nav-item={item}
                  aria-label={`Select ${item}`}
                >
                  <div className="capitalize">{item}</div>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ScrollBar orientation="horizontal" className="h-0" />
          </div>
        </ScrollArea>
        {(page == "objects" ||
          page == "masks / zones" ||
          page == "motion tuner") && (
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {page == "masks / zones" && (
              <ZoneMaskFilterButton
                selectedZoneMask={filterZoneMask}
                updateZoneMaskFilter={setFilterZoneMask}
              />
            )}
            <CameraSelectButton
              allCameras={cameras}
              selectedCamera={selectedCamera}
              setSelectedCamera={setSelectedCamera}
            />
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-col items-start w-full h-full md:h-dvh md:pb-24">
        {page == "general" && <General />}
        {page == "objects" && (
          <ObjectSettings selectedCamera={selectedCamera} />
        )}
        {page == "masks / zones" && (
          <MasksAndZones
            selectedCamera={selectedCamera}
            selectedZoneMask={filterZoneMask}
            setUnsavedChanges={setUnsavedChanges}
          />
        )}
        {page == "motion tuner" && (
          <MotionTuner
            selectedCamera={selectedCamera}
            setUnsavedChanges={setUnsavedChanges}
          />
        )}
      </div>
      {confirmationDialogOpen && (
        <AlertDialog
          open={confirmationDialogOpen}
          onOpenChange={() => setConfirmationDialogOpen(false)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>You have unsaved changes.</AlertDialogTitle>
              <AlertDialogDescription>
                Do you want to save your changes before continuing?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => handleDialog(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDialog(true)}>
                Save
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

type CameraSelectButtonProps = {
  allCameras: CameraConfig[];
  selectedCamera: string;
  setSelectedCamera: React.Dispatch<React.SetStateAction<string>>;
};

function CameraSelectButton({
  allCameras,
  selectedCamera,
  setSelectedCamera,
}: CameraSelectButtonProps) {
  const [open, setOpen] = useState(false);

  if (!allCameras.length) {
    return;
  }

  const trigger = (
    <Button
      className="flex items-center gap-2 capitalize bg-selected hover:bg-selected"
      size="sm"
    >
      <FaVideo className="text-background dark:text-primary" />
      <div className="hidden md:block text-background dark:text-primary">
        {selectedCamera == undefined
          ? "No Camera"
          : selectedCamera.replaceAll("_", " ")}
      </div>
    </Button>
  );
  const content = (
    <>
      {isMobile && (
        <>
          <DropdownMenuLabel className="flex justify-center">
            Camera
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
        </>
      )}
      <div className="h-auto p-4 mb-5 md:mb-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-2.5">
          {allCameras.map((item) => (
            <FilterSwitch
              key={item.name}
              isChecked={item.name === selectedCamera}
              label={item.name.replaceAll("_", " ")}
              onCheckedChange={(isChecked) => {
                if (isChecked) {
                  setSelectedCamera(item.name);
                  setOpen(false);
                }
              }}
            />
          ))}
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setSelectedCamera(selectedCamera);
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
      open={open}
      onOpenChange={(open: boolean) => {
        if (!open) {
          setSelectedCamera(selectedCamera);
        }

        setOpen(open);
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent>{content}</DropdownMenuContent>
    </DropdownMenu>
  );
}
