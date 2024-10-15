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
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useOptimisticState from "@/hooks/use-optimistic-state";
import { isMobile } from "react-device-detect";
import { FaVideo } from "react-icons/fa";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import FilterSwitch from "@/components/filter/FilterSwitch";
import { ZoneMaskFilterButton } from "@/components/filter/ZoneMaskFilter";
import { PolygonType } from "@/types/canvas";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import scrollIntoView from "scroll-into-view-if-needed";
import CameraSettingsView from "@/views/settings/CameraSettingsView";
import ObjectSettingsView from "@/views/settings/ObjectSettingsView";
import MotionTunerView from "@/views/settings/MotionTunerView";
import MasksAndZonesView from "@/views/settings/MasksAndZonesView";
import AuthenticationView from "@/views/settings/AuthenticationView";
import NotificationView from "@/views/settings/NotificationsSettingsView";
import SearchSettingsView from "@/views/settings/SearchSettingsView";
import UiSettingsView from "@/views/settings/UiSettingsView";

const allSettingsViews = [
  "UI settings",
  "search settings",
  "camera settings",
  "masks / zones",
  "motion tuner",
  "debug",
  "users",
  "notifications",
] as const;
type SettingsType = (typeof allSettingsViews)[number];

export default function Settings() {
  const [page, setPage] = useState<SettingsType>("UI settings");
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);
  const tabsRef = useRef<HTMLDivElement | null>(null);

  const { data: config } = useSWR<FrigateConfig>("config");

  // available settings views

  const settingsViews = useMemo(() => {
    const views = [...allSettingsViews];

    if (!("Notification" in window) || !window.isSecureContext) {
      const index = views.indexOf("notifications");
      views.splice(index, 1);
    }

    return views;
  }, []);

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
    if (cameras.length > 0 && selectedCamera === "") {
      setSelectedCamera(cameras[0].name);
    }
  }, [cameras, selectedCamera]);

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

  useEffect(() => {
    document.title = "Settings - Frigate";
  }, []);

  return (
    <div className="flex size-full flex-col p-2">
      <div className="relative flex h-11 w-full items-center justify-between">
        <ScrollArea className="w-full whitespace-nowrap">
          <div ref={tabsRef} className="flex flex-row">
            <ToggleGroup
              className="*:rounded-md *:px-3 *:py-4"
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
                  className={`flex scroll-mx-10 items-center justify-between gap-2 ${page == "UI settings" ? "last:mr-20" : ""} ${pageToggle == item ? "" : "*:text-muted-foreground"}`}
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
        {(page == "debug" ||
          page == "camera settings" ||
          page == "masks / zones" ||
          page == "motion tuner") && (
          <div className="ml-2 flex flex-shrink-0 items-center gap-2">
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
      <div className="mt-2 flex h-full w-full flex-col items-start md:h-dvh md:pb-24">
        {page == "UI settings" && <UiSettingsView />}
        {page == "search settings" && (
          <SearchSettingsView setUnsavedChanges={setUnsavedChanges} />
        )}
        {page == "debug" && (
          <ObjectSettingsView selectedCamera={selectedCamera} />
        )}
        {page == "camera settings" && (
          <CameraSettingsView
            selectedCamera={selectedCamera}
            setUnsavedChanges={setUnsavedChanges}
          />
        )}
        {page == "masks / zones" && (
          <MasksAndZonesView
            selectedCamera={selectedCamera}
            selectedZoneMask={filterZoneMask}
            setUnsavedChanges={setUnsavedChanges}
          />
        )}
        {page == "motion tuner" && (
          <MotionTunerView
            selectedCamera={selectedCamera}
            setUnsavedChanges={setUnsavedChanges}
          />
        )}
        {page == "users" && <AuthenticationView />}
        {page == "notifications" && (
          <NotificationView setUnsavedChanges={setUnsavedChanges} />
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
      className="flex items-center gap-2 bg-selected capitalize hover:bg-selected"
      size="sm"
    >
      <FaVideo className="text-background dark:text-primary" />
      <div className="hidden text-background dark:text-primary md:block">
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
      <div className="scrollbar-container mb-5 h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden p-4 md:mb-1">
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
      modal={false}
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
