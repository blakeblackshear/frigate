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
import { isIOS, isMobile } from "react-device-detect";
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
import ClassificationSettingsView from "@/views/settings/ClassificationSettingsView";
import UiSettingsView from "@/views/settings/UiSettingsView";
import FrigatePlusSettingsView from "@/views/settings/FrigatePlusSettingsView";
import { useSearchEffect } from "@/hooks/use-overlay-state";
import { useSearchParams } from "react-router-dom";
import { useInitialCameraState } from "@/api/ws";
import { isInIframe } from "@/utils/isIFrame";
import { isPWA } from "@/utils/isPWA";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useTranslation } from "react-i18next";

const allSettingsViews = [
  "ui",
  "classification",
  "cameras",
  "masksAndZones",
  "motionTuner",
  "debug",
  "users",
  "notifications",
  "frigateplus",
] as const;
type SettingsType = (typeof allSettingsViews)[number];

export default function Settings() {
  const { t } = useTranslation(["views/settings"]);
  const [page, setPage] = useState<SettingsType>("ui");
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);
  const tabsRef = useRef<HTMLDivElement | null>(null);

  const { data: config } = useSWR<FrigateConfig>("config");

  const [searchParams] = useSearchParams();

  // auth and roles

  const isAdmin = useIsAdmin();

  const allowedViewsForViewer: SettingsType[] = ["ui", "debug"];
  const visibleSettingsViews = !isAdmin
    ? allowedViewsForViewer
    : allSettingsViews;

  // TODO: confirm leave page
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled_in_config)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config]);

  const [selectedCamera, setSelectedCamera] = useState<string>("");

  const { payload: allCameraStates } = useInitialCameraState(
    cameras.length > 0 ? cameras[0].name : "",
    true,
  );

  const cameraEnabledStates = useMemo(() => {
    const states: Record<string, boolean> = {};
    if (allCameraStates) {
      Object.entries(allCameraStates).forEach(([camName, state]) => {
        states[camName] = state.config?.enabled ?? false;
      });
    }
    // fallback to config if ws data isn’t available yet
    cameras.forEach((cam) => {
      if (!(cam.name in states)) {
        states[cam.name] = cam.enabled;
      }
    });
    return states;
  }, [allCameraStates, cameras]);

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
    if (cameras.length > 0) {
      if (!selectedCamera) {
        // Set to first enabled camera initially if no selection
        const firstEnabledCamera =
          cameras.find((cam) => cameraEnabledStates[cam.name]) || cameras[0];
        setSelectedCamera(firstEnabledCamera.name);
      } else if (!cameraEnabledStates[selectedCamera] && page !== "cameras") {
        // Switch to first enabled camera if current one is disabled, unless on "camera settings" page
        const firstEnabledCamera =
          cameras.find((cam) => cameraEnabledStates[cam.name]) || cameras[0];
        if (firstEnabledCamera.name !== selectedCamera) {
          setSelectedCamera(firstEnabledCamera.name);
        }
      }
    }
  }, [cameras, selectedCamera, cameraEnabledStates, page]);

  useEffect(() => {
    if (tabsRef.current) {
      const element = tabsRef.current.querySelector(
        `[data-nav-item="${pageToggle}"]`,
      );
      if (element instanceof HTMLElement) {
        scrollIntoView(element, {
          behavior:
            isMobile && isIOS && !isPWA && isInIframe ? "auto" : "smooth",
          inline: "start",
        });
      }
    }
  }, [tabsRef, pageToggle]);

  useSearchEffect("page", (page: string) => {
    if (allSettingsViews.includes(page as SettingsType)) {
      // Restrict viewer to UI settings
      if (!isAdmin && !["ui", "debug"].includes(page)) {
        setPage("ui");
      } else {
        setPage(page as SettingsType);
      }
    }
    // don't clear url params if we're creating a new object mask
    return !searchParams.has("object_mask");
  });

  useSearchEffect("camera", (camera: string) => {
    const cameraNames = cameras.map((c) => c.name);
    if (cameraNames.includes(camera)) {
      setSelectedCamera(camera);
    }
    // don't clear url params if we're creating a new object mask
    return !searchParams.has("object_mask");
  });

  useEffect(() => {
    document.title = t("documentTitle.default");
  }, [t]);

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
                  // Restrict viewer navigation
                  if (!isAdmin && !["ui", "debug"].includes(value)) {
                    setPageToggle("ui");
                  } else {
                    setPageToggle(value);
                  }
                }
              }}
            >
              {visibleSettingsViews.map((item) => (
                <ToggleGroupItem
                  key={item}
                  className={`flex scroll-mx-10 items-center justify-between gap-2 ${page == "ui" ? "last:mr-20" : ""} ${pageToggle == item ? "" : "*:text-muted-foreground"}`}
                  value={item}
                  data-nav-item={item}
                  aria-label={t("selectItem", {
                    ns: "common",
                    item: t("menu." + item),
                  })}
                >
                  <div className="capitalize">{t("menu." + item)}</div>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ScrollBar orientation="horizontal" className="h-0" />
          </div>
        </ScrollArea>
        {(page == "debug" ||
          page == "cameras" ||
          page == "masksAndZones" ||
          page == "motionTuner") && (
          <div className="ml-2 flex flex-shrink-0 items-center gap-2">
            {page == "masksAndZones" && (
              <ZoneMaskFilterButton
                selectedZoneMask={filterZoneMask}
                updateZoneMaskFilter={setFilterZoneMask}
              />
            )}
            <CameraSelectButton
              allCameras={cameras}
              selectedCamera={selectedCamera}
              setSelectedCamera={setSelectedCamera}
              cameraEnabledStates={cameraEnabledStates}
              currentPage={page}
            />
          </div>
        )}
      </div>
      <div className="mt-2 flex h-full w-full flex-col items-start md:h-dvh md:pb-24">
        {page == "ui" && <UiSettingsView />}
        {page == "classification" && (
          <ClassificationSettingsView setUnsavedChanges={setUnsavedChanges} />
        )}
        {page == "debug" && (
          <ObjectSettingsView selectedCamera={selectedCamera} />
        )}
        {page == "cameras" && (
          <CameraSettingsView
            selectedCamera={selectedCamera}
            setUnsavedChanges={setUnsavedChanges}
          />
        )}
        {page == "masksAndZones" && (
          <MasksAndZonesView
            selectedCamera={selectedCamera}
            selectedZoneMask={filterZoneMask}
            setUnsavedChanges={setUnsavedChanges}
          />
        )}
        {page == "motionTuner" && (
          <MotionTunerView
            selectedCamera={selectedCamera}
            setUnsavedChanges={setUnsavedChanges}
          />
        )}
        {page == "users" && <AuthenticationView />}
        {page == "notifications" && (
          <NotificationView setUnsavedChanges={setUnsavedChanges} />
        )}
        {page == "frigateplus" && (
          <FrigatePlusSettingsView setUnsavedChanges={setUnsavedChanges} />
        )}
      </div>
      {confirmationDialogOpen && (
        <AlertDialog
          open={confirmationDialogOpen}
          onOpenChange={() => setConfirmationDialogOpen(false)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("dialog.unsavedChanges.title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("dialog.unsavedChanges.desc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => handleDialog(false)}>
                {t("button.cancel", { ns: "common" })}
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDialog(true)}>
                {t("button.save", { ns: "common" })}
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
  cameraEnabledStates: Record<string, boolean>;
  currentPage: SettingsType;
};

function CameraSelectButton({
  allCameras,
  selectedCamera,
  setSelectedCamera,
  cameraEnabledStates,
  currentPage,
}: CameraSelectButtonProps) {
  const { t } = useTranslation(["views/settings"]);

  const [open, setOpen] = useState(false);

  if (!allCameras.length) {
    return null;
  }

  const trigger = (
    <Button
      className="flex items-center gap-2 bg-selected capitalize hover:bg-selected"
      aria-label="Select a camera"
      size="sm"
    >
      <FaVideo className="text-background dark:text-primary" />
      <div className="hidden text-background dark:text-primary md:block">
        {selectedCamera == undefined
          ? t("cameraSetting.noCamera")
          : selectedCamera.replaceAll("_", " ")}
      </div>
    </Button>
  );
  const content = (
    <>
      {isMobile && (
        <>
          <DropdownMenuLabel className="flex justify-center">
            {t("cameraSetting.camera")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
        </>
      )}
      <div className="scrollbar-container mb-5 h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden p-4 md:mb-1">
        <div className="flex flex-col gap-2.5">
          {allCameras.map((item) => {
            const isEnabled = cameraEnabledStates[item.name];
            const isCameraSettingsPage = currentPage === "cameras";
            return (
              <FilterSwitch
                key={item.name}
                isChecked={item.name === selectedCamera}
                label={item.name.replaceAll("_", " ")}
                onCheckedChange={(isChecked) => {
                  if (isChecked && (isEnabled || isCameraSettingsPage)) {
                    setSelectedCamera(item.name);
                    setOpen(false);
                  }
                }}
                disabled={!isEnabled && !isCameraSettingsPage}
              />
            );
          })}
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
