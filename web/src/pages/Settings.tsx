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
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useState } from "react";
import useOptimisticState from "@/hooks/use-optimistic-state";
import { isMobile } from "react-device-detect";
import { FaVideo } from "react-icons/fa";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import FilterSwitch from "@/components/filter/FilterSwitch";
import { ZoneMaskFilterButton } from "@/components/filter/ZoneMaskFilter";
import { PolygonType } from "@/types/canvas";
import CameraReviewSettingsView from "@/views/settings/CameraReviewSettingsView";
import CameraManagementView from "@/views/settings/CameraManagementView";
import MotionTunerView from "@/views/settings/MotionTunerView";
import MasksAndZonesView from "@/views/settings/MasksAndZonesView";
import UsersView from "@/views/settings/UsersView";
import RolesView from "@/views/settings/RolesView";
import NotificationView from "@/views/settings/NotificationsSettingsView";
import EnrichmentsSettingsView from "@/views/settings/EnrichmentsSettingsView";
import UiSettingsView from "@/views/settings/UiSettingsView";
import FrigatePlusSettingsView from "@/views/settings/FrigatePlusSettingsView";
import { useSearchEffect } from "@/hooks/use-overlay-state";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useInitialCameraState } from "@/api/ws";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useTranslation } from "react-i18next";
import TriggerView from "@/views/settings/TriggerView";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Heading from "@/components/ui/heading";
import { LuChevronRight } from "react-icons/lu";
import Logo from "@/components/Logo";
import {
  MobilePage,
  MobilePageContent,
  MobilePageHeader,
  MobilePageTitle,
} from "@/components/mobile/MobilePage";

const allSettingsViews = [
  "ui",
  "enrichments",
  "cameraManagement",
  "cameraReview",
  "masksAndZones",
  "motionTuner",
  "triggers",
  "debug",
  "users",
  "roles",
  "notifications",
  "frigateplus",
] as const;
type SettingsType = (typeof allSettingsViews)[number];

const settingsGroups = [
  {
    label: "general",
    items: [{ key: "ui", component: UiSettingsView }],
  },
  {
    label: "cameras",
    items: [
      { key: "cameraManagement", component: CameraManagementView },
      { key: "cameraReview", component: CameraReviewSettingsView },
      { key: "masksAndZones", component: MasksAndZonesView },
      { key: "motionTuner", component: MotionTunerView },
    ],
  },
  {
    label: "enrichments",
    items: [{ key: "enrichments", component: EnrichmentsSettingsView }],
  },
  {
    label: "users",
    items: [
      { key: "users", component: UsersView },
      { key: "roles", component: RolesView },
    ],
  },
  {
    label: "notifications",
    items: [
      { key: "notifications", component: NotificationView },
      { key: "triggers", component: TriggerView },
    ],
  },
  {
    label: "frigateplus",
    items: [{ key: "frigateplus", component: FrigatePlusSettingsView }],
  },
];

const CAMERA_SELECT_BUTTON_PAGES = [
  "debug",
  "cameraReview",
  "masksAndZones",
  "motionTuner",
  "triggers",
];

const ALLOWED_VIEWS_FOR_VIEWER = ["ui", "debug", "notifications"];

const getCurrentComponent = (page: SettingsType) => {
  for (const group of settingsGroups) {
    for (const item of group.items) {
      if (item.key === page) {
        return item.component;
      }
    }
  }
  return null;
};

function MobileMenuItem({
  item,
  onSelect,
  onClose,
  className,
}: {
  item: { key: string };
  onSelect: (key: string) => void;
  onClose?: () => void;
  className?: string;
}) {
  const { t } = useTranslation(["views/settings"]);

  return (
    <div
      className={cn(
        "inline-flex h-10 w-full cursor-pointer items-center justify-between whitespace-nowrap rounded-md px-4 py-2 pr-2 text-sm font-medium text-primary-variant disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      onClick={() => {
        onSelect(item.key);
        onClose?.();
      }}
    >
      <div className="smart-capitalize">{t("menu." + item.key)}</div>
      <LuChevronRight className="size-4" />
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation(["views/settings"]);
  const [page, setPage] = useState<SettingsType>("ui");
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);
  const [contentMobileOpen, setContentMobileOpen] = useState(false);

  const { data: config } = useSWR<FrigateConfig>("config");

  const [searchParams] = useSearchParams();

  // auth and roles

  const isAdmin = useIsAdmin();

  const visibleSettingsViews = !isAdmin
    ? ALLOWED_VIEWS_FOR_VIEWER
    : allSettingsViews;

  // TODO: confirm leave page
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

  const navigate = useNavigate();

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
      } else if (
        !cameraEnabledStates[selectedCamera] &&
        pageToggle !== "cameraReview"
      ) {
        // Switch to first enabled camera if current one is disabled, unless on "camera settings" page
        const firstEnabledCamera =
          cameras.find((cam) => cameraEnabledStates[cam.name]) || cameras[0];
        if (firstEnabledCamera.name !== selectedCamera) {
          setSelectedCamera(firstEnabledCamera.name);
        }
      }
    }
  }, [cameras, selectedCamera, cameraEnabledStates, pageToggle]);

  useSearchEffect("page", (page: string) => {
    if (allSettingsViews.includes(page as SettingsType)) {
      // Restrict viewer to UI settings
      if (
        !isAdmin &&
        !ALLOWED_VIEWS_FOR_VIEWER.includes(page as SettingsType)
      ) {
        setPageToggle("ui");
      } else {
        setPageToggle(page as SettingsType);
      }
      if (isMobile) {
        setContentMobileOpen(true);
      }
    }
    // don't clear url params if we're creating a new object mask
    return !(searchParams.has("object_mask") || searchParams.has("event_id"));
  });

  useSearchEffect("camera", (camera: string) => {
    const cameraNames = cameras.map((c) => c.name);
    if (cameraNames.includes(camera)) {
      setSelectedCamera(camera);
      if (isMobile) {
        setContentMobileOpen(true);
      }
    }
    // don't clear url params if we're creating a new object mask or trigger
    return !(searchParams.has("object_mask") || searchParams.has("event_id"));
  });

  useEffect(() => {
    if (!contentMobileOpen) {
      document.title = t("documentTitle.default");
    }
  }, [t, contentMobileOpen]);

  if (isMobile) {
    return (
      <>
        {!contentMobileOpen && (
          <div className="flex size-full flex-col">
            <div className="sticky -top-2 z-50 mb-2 bg-background p-4">
              <div className="flex items-center justify-center">
                <Logo className="h-8" />
              </div>
              <div className="flex flex-row text-center">
                <h2 className="ml-2 text-lg">
                  {t("menu.settings", { ns: "common" })}
                </h2>
              </div>
            </div>

            <div className="scrollbar-container overflow-y-auto px-4">
              {settingsGroups.map((group) => {
                const filteredItems = group.items.filter((item) =>
                  visibleSettingsViews.includes(item.key as SettingsType),
                );
                if (filteredItems.length === 0) return null;
                return (
                  <div key={group.label} className="mb-3">
                    {filteredItems.length > 1 && (
                      <h3 className="mb-2 ml-2 text-sm font-medium text-secondary-foreground">
                        <div className="smart-capitalize">
                          {t("menu." + group.label)}
                        </div>
                      </h3>
                    )}
                    {filteredItems.map((item) => (
                      <MobileMenuItem
                        key={item.key}
                        item={item}
                        className={cn(filteredItems.length == 1 && "pl-2")}
                        onSelect={(key) => {
                          if (
                            !isAdmin &&
                            !ALLOWED_VIEWS_FOR_VIEWER.includes(
                              key as SettingsType,
                            )
                          ) {
                            setPageToggle("ui");
                          } else {
                            setPageToggle(key as SettingsType);
                          }
                          setContentMobileOpen(true);
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <MobilePage
          open={contentMobileOpen}
          onOpenChange={setContentMobileOpen}
        >
          <MobilePageContent
            className={cn("px-2", "scrollbar-container overflow-y-auto")}
          >
            <MobilePageHeader
              className="top-0 mb-0"
              onClose={() => navigate(-1)}
              actions={
                CAMERA_SELECT_BUTTON_PAGES.includes(pageToggle) ? (
                  <div className="flex items-center gap-2">
                    {pageToggle == "masksAndZones" && (
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
                ) : undefined
              }
            >
              <MobilePageTitle>{t("menu." + page)}</MobilePageTitle>
            </MobilePageHeader>

            <div className="p-2">
              {(() => {
                const CurrentComponent = getCurrentComponent(page);
                if (!CurrentComponent) return null;
                return (
                  <CurrentComponent
                    selectedCamera={selectedCamera}
                    setUnsavedChanges={setUnsavedChanges}
                    selectedZoneMask={filterZoneMask}
                  />
                );
              })()}
            </div>
          </MobilePageContent>
        </MobilePage>
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
      </>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-16 items-center justify-between border-b border-secondary p-3">
        <Heading as="h3" className="mb-0">
          {t("menu.settings", { ns: "common" })}
        </Heading>
        {CAMERA_SELECT_BUTTON_PAGES.includes(page) && (
          <div className="flex items-center gap-2">
            {pageToggle == "masksAndZones" && (
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
      <SidebarProvider>
        <Sidebar variant="inset" className="relative mb-8 pl-0 pt-0">
          <SidebarContent className="scrollbar-container mb-24 overflow-y-auto border-r-[1px] border-secondary bg-background py-2">
            <SidebarMenu>
              {settingsGroups.map((group) => {
                const filteredItems = group.items.filter((item) =>
                  visibleSettingsViews.includes(item.key as SettingsType),
                );
                if (filteredItems.length === 0) return null;
                return (
                  <SidebarGroup key={group.label} className="py-1">
                    {filteredItems.length === 1 ? (
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            className="ml-0"
                            isActive={pageToggle === filteredItems[0].key}
                            onClick={() => {
                              if (
                                !isAdmin &&
                                !ALLOWED_VIEWS_FOR_VIEWER.includes(
                                  filteredItems[0].key as SettingsType,
                                )
                              ) {
                                setPageToggle("ui");
                              } else {
                                setPageToggle(
                                  filteredItems[0].key as SettingsType,
                                );
                              }
                            }}
                          >
                            <div className="smart-capitalize">
                              {t("menu." + filteredItems[0].key)}
                            </div>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    ) : (
                      <>
                        <SidebarGroupLabel
                          className={cn(
                            "ml-2 cursor-default pl-0 text-sm",
                            filteredItems.some(
                              (item) => pageToggle === item.key,
                            )
                              ? "text-primary"
                              : "text-sidebar-foreground/80",
                          )}
                        >
                          <div className="smart-capitalize">
                            {t("menu." + group.label)}
                          </div>
                        </SidebarGroupLabel>
                        <SidebarMenuSub className="mx-2 border-0">
                          {filteredItems.map((item) => (
                            <SidebarMenuSubItem key={item.key}>
                              <SidebarMenuSubButton
                                isActive={pageToggle === item.key}
                                onClick={() => {
                                  if (
                                    !isAdmin &&
                                    !ALLOWED_VIEWS_FOR_VIEWER.includes(
                                      item.key as SettingsType,
                                    )
                                  ) {
                                    setPageToggle("ui");
                                  } else {
                                    setPageToggle(item.key as SettingsType);
                                  }
                                }}
                              >
                                <div className="w-full cursor-pointer smart-capitalize">
                                  {t("menu." + item.key)}
                                </div>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </>
                    )}
                  </SidebarGroup>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <div className="scrollbar-container mb-24 flex-1 overflow-y-auto p-2 pr-0">
            {(() => {
              const CurrentComponent = getCurrentComponent(page);
              if (!CurrentComponent) return null;
              return (
                <CurrentComponent
                  selectedCamera={selectedCamera}
                  setUnsavedChanges={setUnsavedChanges}
                  selectedZoneMask={filterZoneMask}
                />
              );
            })()}
          </div>
        </SidebarInset>
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
      </SidebarProvider>
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
      className="flex items-center gap-2 bg-selected smart-capitalize hover:bg-selected"
      aria-label="Select a camera"
      size="sm"
    >
      <FaVideo className="text-background dark:text-primary" />
      <div className="hidden text-background dark:text-primary md:block">
        {selectedCamera == undefined ? (
          t("cameraSetting.noCamera")
        ) : (
          <CameraNameLabel camera={selectedCamera} />
        )}
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
            const isCameraSettingsPage = currentPage === "cameraReview";
            return (
              <FilterSwitch
                key={item.name}
                isChecked={item.name === selectedCamera}
                label={item.name}
                type={"camera"}
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
